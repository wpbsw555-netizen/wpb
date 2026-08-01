from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path("qiqishoes-com/assets/tennis-shoes")
MANIFEST = ROOT / "catalog.json"


def read_json(path: Path) -> dict | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else None
    except Exception:
        return None


def valid_image(relative_path: str | None) -> bool:
    if not relative_path:
        return False
    path = ROOT / relative_path
    if not path.exists() or path.stat().st_size < 500:
        return False
    try:
        with Image.open(path) as image:
            image.verify()
        return True
    except Exception:
        return False


def first_valid_cover(products: list[dict]) -> str | None:
    for product in products:
        image = product.get("image")
        if valid_image(image):
            return str(image)
    return None


def clean_legacy(data: dict) -> dict:
    products = data.get("products")
    if not isinstance(products, list):
        return data
    cover = first_valid_cover(products)
    if not products or not cover:
        data["categories"] = []
        data["importedCategoryCount"] = 0
        data["totalProducts"] = 0
        return data
    data["categories"] = [
        {
            "id": "3551883",
            "name": "AIR JORDAN3 乔丹3代",
            "imported": True,
            "count": len(products),
            "cover": cover,
            "data": None,
        }
    ]
    data["importedCategoryCount"] = 1
    data["totalProducts"] = len(products)
    return data


def clean_manifest(data: dict) -> dict:
    categories = data.get("categories")
    if not isinstance(categories, list):
        data["categories"] = []
        data["categoryCount"] = 0
        data["importedCategoryCount"] = 0
        data["totalProducts"] = 0
        return data

    kept: list[dict] = []
    total_products = 0
    for category in categories:
        if not isinstance(category, dict) or not category.get("imported"):
            continue
        category_data = category.get("data")
        if not category_data:
            continue
        payload_path = ROOT / str(category_data)
        payload = read_json(payload_path)
        products = payload.get("products") if payload else None
        if not isinstance(products, list) or not products:
            payload_path.unlink(missing_ok=True)
            continue
        cover = first_valid_cover(products)
        if not cover:
            payload_path.unlink(missing_ok=True)
            continue
        cleaned = dict(category)
        cleaned["count"] = len(products)
        cleaned["cover"] = cover
        cleaned["imported"] = True
        kept.append(cleaned)
        total_products += len(products)

    data["categories"] = kept
    data["categoryCount"] = len(kept)
    data["importedCategoryCount"] = len(kept)
    data["totalProducts"] = total_products
    if kept and not any(str(item.get("id")) == str(data.get("defaultCategory")) for item in kept):
        data["defaultCategory"] = kept[0].get("id")
    return data


def main() -> None:
    data = read_json(MANIFEST)
    if data is None:
        print("catalog manifest not found")
        return
    cleaned = clean_legacy(data) if isinstance(data.get("products"), list) else clean_manifest(data)
    MANIFEST.write_text(json.dumps(cleaned, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"cleaned categories={len(cleaned.get('categories') or [])}, "
        f"products={int(cleaned.get('totalProducts') or len(cleaned.get('products') or []))}"
    )


if __name__ == "__main__":
    main()
