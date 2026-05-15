#!/usr/bin/env python3
import argparse
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


def normalize_text(value: str) -> str:
    lowered = value.lower()
    normalized = unicodedata.normalize("NFKD", lowered)
    ascii_only = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", ascii_only).strip()


def money_to_eur(value: Any) -> float | None:
    if value in (None, "", "null"):
        return None
    try:
        raw = str(value).strip()
        normalized = raw.replace(",", ".")
        parsed = float(normalized)

        # Shopify feeds may return either major units ("419.00") or minor units ("41900").
        if re.fullmatch(r"\d+", raw):
            return round(parsed / 100.0, 2) if parsed >= 10000 else round(parsed, 2)

        return round(parsed, 2)
    except (TypeError, ValueError):
        return None


def discount_percent(price_eur: float | None, compare_eur: float | None) -> float | None:
    if not price_eur or not compare_eur or compare_eur <= 0:
        return None
    if compare_eur <= price_eur:
        return None
    return round((1 - (price_eur / compare_eur)) * 100, 1)


def load_json(path: Path, default_value: Any) -> Any:
    if not path.exists():
        return default_value
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=True), encoding="utf-8")


def fetch_collection_products(json_url: str) -> list[dict[str, Any]]:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json,text/plain,*/*",
    }
    response = requests.get(json_url, headers=headers, timeout=20)
    response.raise_for_status()
    data = response.json()
    return data.get("products", [])


def interest_matches(item_text: str, item_price_eur: float | None, interest: dict[str, Any]) -> bool:
    includes = [normalize_text(k) for k in interest.get("include_keywords", [])]
    excludes = [normalize_text(k) for k in interest.get("exclude_keywords", [])]
    max_price = interest.get("max_price_eur")

    if includes and not any(keyword in item_text for keyword in includes):
        return False

    if excludes and any(keyword in item_text for keyword in excludes):
        return False

    if max_price is not None and item_price_eur is not None and item_price_eur > float(max_price):
        return False

    return True


def build_items(config: dict[str, Any], seen_ids: set[str]) -> list[dict[str, Any]]:
    site_base = config.get("site_base_url", "https://www.gong-galaxy.com").rstrip("/")
    interests = config.get("interests", [])
    collections = config.get("collections", [])

    items: list[dict[str, Any]] = []
    dedupe: set[str] = set()

    for collection in collections:
        collection_name = collection.get("name", "Unknown")
        json_url = collection.get("json_url")
        if not json_url:
            continue

        products = fetch_collection_products(json_url)
        for product in products:
            handle = product.get("handle", "")
            if not handle:
                continue

            product_url = f"{site_base}/en/products/{handle}"
            image_url = None
            if product.get("images"):
                image_url = product["images"][0].get("src")

            for variant in product.get("variants", []):
                if not variant.get("available", False):
                    continue

                item_id = f"{product.get('id')}-{variant.get('id')}"
                if item_id in dedupe:
                    continue
                dedupe.add(item_id)

                title = product.get("title", "Untitled")
                variant_title = variant.get("title", "")
                tags = product.get("tags", [])
                tags_text = " ".join(tags) if isinstance(tags, list) else str(tags)
                searchable = normalize_text(f"{title} {variant_title} {tags_text}")

                price_eur = money_to_eur(variant.get("price"))
                compare_eur = money_to_eur(variant.get("compare_at_price"))
                discount = discount_percent(price_eur, compare_eur)

                matched_labels: list[str] = []
                for interest in interests:
                    if interest_matches(searchable, price_eur, interest):
                        matched_labels.append(interest.get("label", interest.get("id", "match")))

                item = {
                    "id": item_id,
                    "title": title,
                    "variant_title": variant_title,
                    "price_eur": price_eur,
                    "compare_at_price_eur": compare_eur,
                    "discount_percent": discount,
                    "available": True,
                    "url": product_url,
                    "image_url": image_url,
                    "collection": collection_name,
                    "product_type": product.get("product_type", ""),
                    "tags": tags if isinstance(tags, list) else [],
                    "updated_at": product.get("updated_at"),
                    "matched_interests": matched_labels,
                    "is_relevant": len(matched_labels) > 0,
                    "is_new": item_id not in seen_ids,
                }
                items.append(item)

    items.sort(key=lambda x: (not x["is_relevant"], x["price_eur"] is None, x["price_eur"] or 0))
    return items


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch and filter Gong second-hand items")
    parser.add_argument("--config", required=True, help="Path to preferences JSON")
    parser.add_argument("--output", required=True, help="Output items JSON file")
    parser.add_argument("--history", required=True, help="History JSON file to track new items")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config_path = Path(args.config)
    output_path = Path(args.output)
    history_path = Path(args.history)

    config = load_json(config_path, default_value={})
    history = load_json(history_path, default_value={"seen_ids": []})
    seen_ids = set(history.get("seen_ids", []))

    items = build_items(config, seen_ids)
    now = datetime.now(timezone.utc).isoformat()

    payload = {
        "generated_at": now,
        "source": "gong-galaxy",
        "total_items": len(items),
        "relevant_items": sum(1 for i in items if i["is_relevant"]),
        "new_items": sum(1 for i in items if i["is_new"]),
        "items": items,
    }

    save_json(output_path, payload)

    updated_seen = sorted(set(seen_ids).union({item["id"] for item in items}))
    save_json(history_path, {"seen_ids": updated_seen, "updated_at": now})

    print(f"Wrote {len(items)} items to {output_path}")
    print(f"Relevant items: {payload['relevant_items']} | New items: {payload['new_items']}")


if __name__ == "__main__":
    main()
