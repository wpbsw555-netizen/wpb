from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

import sync_yupoo_all_categories as catalog
import sync_yupoo_tennis as source

ROOT = source.ASSET_ROOT
MANIFEST = ROOT / "catalog.json"
CATEGORY_ROOT = ROOT / "categories"
REQUESTED_DEFAULT = "3551885"


def read_json(path: Path) -> dict | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else None
    except Exception:
        return None


def valid_image(relative: str | None) -> bool:
    if not relative:
        return False
    path = ROOT / relative
    if not path.exists() or path.stat().st_size < 500:
        return False
    try:
        with Image.open(path) as image:
            image.verify()
        return True
    except Exception:
        return False


def save_source_image(raw: bytes, destination: Path) -> None:
    # Keep the source image appearance. No text, number, watermark or label is added.
    source.save_jpeg(raw, destination)


def remove_products_and_categories_without_images() -> None:
    manifest = read_json(MANIFEST) or {}
    categories = manifest.get("categories")
    if not isinstance(categories, list):
        categories = []

    kept_categories: list[dict] = []
    total_products = 0

    for category in categories:
        if not isinstance(category, dict) or not category.get("imported"):
            continue
        data_relative = category.get("data")
        if not data_relative:
            continue
        data_path = ROOT / str(data_relative)
        payload = read_json(data_path)
        products = payload.get("products") if payload else None
        if not isinstance(products, list):
            data_path.unlink(missing_ok=True)
            continue

        kept_products = [item for item in products if valid_image(item.get("image"))]
        if not kept_products:
            data_path.unlink(missing_ok=True)
            continue

        payload["products"] = kept_products
        payload["total"] = len(kept_products)
        payload["filteredAt"] = datetime.now(timezone.utc).isoformat()
        data_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

        cleaned = dict(category)
        cleaned["imported"] = True
        cleaned["count"] = len(kept_products)
        cleaned["cover"] = kept_products[0]["image"]
        cleaned["missingImages"] = 0
        kept_categories.append(cleaned)
        total_products += len(kept_products)

    manifest["source"] = source.SOURCE
    manifest["generatedAt"] = datetime.now(timezone.utc).isoformat()
    manifest["categories"] = kept_categories
    manifest["categoryCount"] = len(kept_categories)
    manifest["importedCategoryCount"] = len(kept_categories)
    manifest["totalProducts"] = total_products
    manifest["defaultCategory"] = (
        REQUESTED_DEFAULT
        if any(str(item.get("id")) == REQUESTED_DEFAULT for item in kept_categories)
        else (kept_categories[0].get("id") if kept_categories else None)
    )
    manifest["sourceImagesUnmodifiedBySite"] = True
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    catalog.SOURCE = source.SOURCE
    catalog.NAME_OVERRIDES[REQUESTED_DEFAULT] = "AIR JORDAN4 乔丹4代"
    catalog.save_thumbnail = save_source_image
    catalog.main()
    remove_products_and_categories_without_images()

    result = read_json(MANIFEST) or {}
    print(
        "requested catalog complete: "
        f"categories={result.get('categoryCount', 0)}, "
        f"products={result.get('totalProducts', 0)}, "
        f"default={result.get('defaultCategory')}"
    )


if __name__ == "__main__":
    main()
