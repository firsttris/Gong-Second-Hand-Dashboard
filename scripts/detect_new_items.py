#!/usr/bin/env python3
import argparse
import json
import os
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Detect new items from dashboard payload")
    parser.add_argument("--items-json", required=True, help="Path to items JSON payload")
    parser.add_argument(
        "--github-output",
        default=os.getenv("GITHUB_OUTPUT", ""),
        help="Path to GitHub Actions output file (defaults to GITHUB_OUTPUT env var)",
    )
    return parser.parse_args()


def detect_new_items(items_path: Path) -> int:
    payload = json.loads(items_path.read_text(encoding="utf-8"))
    raw = payload.get("new_items", 0)
    try:
        return max(0, int(raw))
    except (TypeError, ValueError):
        return 0


def write_outputs(output_path: Path, new_items: int) -> None:
    has_new = "true" if new_items > 0 else "false"
    with output_path.open("a", encoding="utf-8") as file_handle:
        file_handle.write(f"new_items={new_items}\n")
        file_handle.write(f"has_new={has_new}\n")


def main() -> None:
    args = parse_args()
    new_items = detect_new_items(Path(args.items_json))

    github_output = args.github_output.strip()
    if github_output:
        write_outputs(Path(github_output), new_items)

    print(new_items)


if __name__ == "__main__":
    main()
