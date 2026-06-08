#!/usr/bin/env python3
import argparse
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


def _default_headers() -> dict[str, str]:
    return {
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9,de;q=0.8",
        "Referer": "https://www.gong-galaxy.com/en/",
        "Connection": "keep-alive",
    }


def _fetch_via_curl(json_url: str, headers: dict[str, str], timeout_seconds: int = 20) -> dict[str, Any]:
    cmd = [
        "curl",
        "--silent",
        "--show-error",
        "--fail",
        "--location",
        "--compressed",
        "--max-time",
        str(timeout_seconds),
    ]
    for key, value in headers.items():
        cmd.extend(["-H", f"{key}: {value}"])
    cmd.append(json_url)

    result = subprocess.run(cmd, check=True, capture_output=True, text=True)
    return json.loads(result.stdout)


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
    headers = _default_headers()
    try:
        response = requests.get(json_url, headers=headers, timeout=20)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.HTTPError as err:
        if err.response is None or err.response.status_code != 403:
            raise
        print(f"HTTP 403 for {json_url}. Retrying via curl fallback...")
        data = _fetch_via_curl(json_url, headers=headers, timeout_seconds=25)
    return data.get("products", [])


def _summarize_variant_titles(variant_titles: list[str], max_titles: int = 3) -> str:
    cleaned = [title.strip() for title in variant_titles if title and title.strip()]
    unique_titles = list(dict.fromkeys(cleaned))
    if not unique_titles:
        return ""
    if len(unique_titles) <= max_titles:
        return " / ".join(unique_titles)
    preview = " / ".join(unique_titles[:max_titles])
    remaining = len(unique_titles) - max_titles
    suffix = "variant" if remaining == 1 else "variants"
    return f"{preview} (+{remaining} more {suffix})"


def build_items(config: dict[str, Any], seen_ids: set[str]) -> list[dict[str, Any]]:
    site_base = config.get("site_base_url", "https://www.gong-galaxy.com").rstrip("/")
    collections = config.get("collections", [])

    items: list[dict[str, Any]] = []
    dedupe: set[str] = set()
    successful_collections = 0

    for collection in collections:
        collection_name = collection.get("name", "Unknown")
        collection_type = collection.get("type", "other")
        json_url = collection.get("json_url")
        if not json_url:
            continue

        try:
            products = fetch_collection_products(json_url)
            successful_collections += 1
        except (requests.RequestException, subprocess.SubprocessError, json.JSONDecodeError) as err:
            print(f"Warning: failed to fetch collection '{collection_name}' ({json_url}): {err}")
            continue

        for product in products:
            handle = product.get("handle", "")
            if not handle:
                continue

            product_id = str(product.get("id") or handle)
            if product_id in dedupe:
                continue
            dedupe.add(product_id)

            product_url = f"{site_base}/en/products/{handle}"
            image_url = None
            if product.get("images"):
                image_url = product["images"][0].get("src")

            available_variants = [v for v in product.get("variants", []) if v.get("available", False)]
            if not available_variants:
                continue

            variant_ids = [str(v.get("id")) for v in available_variants if v.get("id") is not None]
            price_candidates = [
                (v, money_to_eur(v.get("price")))
                for v in available_variants
            ]
            priced_variants = [(v, p) for v, p in price_candidates if p is not None]

            if priced_variants:
                reference_variant, price_eur = min(priced_variants, key=lambda vp: vp[1])
            else:
                reference_variant = available_variants[0]
                price_eur = None

            compare_eur = money_to_eur(reference_variant.get("compare_at_price"))
            discount = discount_percent(price_eur, compare_eur)

            title = product.get("title", "Untitled")
            variant_title = _summarize_variant_titles([str(v.get("title", "")) for v in available_variants])
            tags = product.get("tags", [])
            item_id = f"product-{product_id}"

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
                "item_type": collection_type,
                "product_type": product.get("product_type", ""),
                "tags": tags if isinstance(tags, list) else [],
                "updated_at": product.get("updated_at"),
                "variant_count": len(available_variants),
                "variant_ids": variant_ids,
                "is_new": (item_id not in seen_ids) or any((f"variant-{variant_id}" not in seen_ids) for variant_id in variant_ids),
            }
            items.append(item)

    if successful_collections == 0:
        raise RuntimeError("All collection requests failed. Source may be temporarily blocking CI traffic.")

    items.sort(key=lambda x: (not x["is_new"], x["price_eur"] is None, x["price_eur"] or 0))
    return items


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch Gong second-hand items")
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
        "interests": config.get("interests", []),
        "new_items": sum(1 for i in items if i["is_new"]),
        "items": items,
    }

    save_json(output_path, payload)

    current_item_ids = {item["id"] for item in items}
    current_variant_ids = {
        f"variant-{variant_id}"
        for item in items
        for variant_id in item.get("variant_ids", [])
    }
    updated_seen = sorted(set(seen_ids).union(current_item_ids).union(current_variant_ids))
    save_json(history_path, {"seen_ids": updated_seen, "updated_at": now})

    print(f"Wrote {len(items)} items to {output_path}")
    print(f"New items: {payload['new_items']}")


if __name__ == "__main__":
    main()
