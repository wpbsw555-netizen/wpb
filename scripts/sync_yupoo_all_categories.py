from __future__ import annotations

import json
import os
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image, ImageFile

import sync_yupoo_tennis as base

ImageFile.LOAD_TRUNCATED_IMAGES = True

SOURCE = base.SOURCE
ASSET_ROOT = base.ASSET_ROOT
IMAGE_ROOT = base.IMAGE_ROOT
CATEGORY_ROOT = ASSET_ROOT / "categories"
MANIFEST_FILE = ASSET_ROOT / "catalog.json"
REPORT_FILE = ASSET_ROOT / "sync-report.txt"
NAME_OVERRIDES = {"3551883": "AIR JORDAN3 乔丹3代", "0": "未分类相册"}
GENERIC_NAMES = {"english", "all categories", "category", "categories"}


def log(report: list[str], message: str) -> None:
    print(message, flush=True)
    report.append(message)


def read_json(path: Path) -> dict | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
        return value if isinstance(value, dict) else None
    except Exception:
        return None


def valid_image(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 500:
        return False
    try:
        with Image.open(path) as image:
            image.verify()
        return True
    except Exception:
        return False


def save_thumbnail(raw: bytes, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(BytesIO(raw)) as image:
        image.load()
        image = image.convert("RGB")
        image.thumbnail((560, 560), Image.Resampling.LANCZOS)
        image.save(destination, "JPEG", quality=76, optimize=True, progressive=True)


def category_file(category_id: str) -> Path:
    return CATEGORY_ROOT / f"{category_id}.json"


def move_legacy_category(report: list[str]) -> None:
    destination = category_file("3551883")
    if destination.exists() or not MANIFEST_FILE.exists():
        return
    old = read_json(MANIFEST_FILE)
    products = old.get("products") if old else None
    if not isinstance(products, list) or not products:
        return
    payload = {
        "generatedAt": old.get("generatedAt") or datetime.now(timezone.utc).isoformat(),
        "category": {"id": "3551883", "name": NAME_OVERRIDES["3551883"], "source": SOURCE},
        "total": len(products),
        "products": products,
    }
    destination.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    log(report, f"legacy: preserved {len(products)} AIR JORDAN 3 products")


def normalize_categories(raw_categories: list[dict]) -> list[dict]:
    result: OrderedDict[str, dict] = OrderedDict()
    for item in raw_categories:
        category_id = str(item.get("id") or "").strip()
        source = item.get("source")
        if not category_id or not source:
            continue
        name = str(item.get("name") or "").strip()
        if name.lower() in GENERIC_NAMES or not name:
            name = NAME_OVERRIDES.get(category_id, f"Category {category_id}")
        if category_id in NAME_OVERRIDES:
            name = NAME_OVERRIDES[category_id]
        current = result.get(category_id)
        candidate = {"id": category_id, "name": name, "source": source}
        if current is None or len(name) > len(current["name"]):
            result[category_id] = candidate
    return list(result.values())


def scrape_products(session: requests.Session, category: dict, report: list[str]) -> list[dict]:
    products: OrderedDict[str, dict] = OrderedDict()
    max_pages = int(os.getenv("MAX_PAGES_PER_CATEGORY", "100"))
    for page in range(1, max_pages + 1):
        page_url = category["source"] if page == 1 else base.with_page(category["source"], page)
        soup = base.fetch_soup(session, page_url)
        found = base.parse_albums(soup, page_url)
        new_count = 0
        for record in found:
            product_id = str(record["id"])
            if product_id not in products:
                products[product_id] = record
                new_count += 1
            else:
                current = products[product_id]
                if not current.get("cover_source") and record.get("cover_source"):
                    current["cover_source"] = record["cover_source"]
                if current["title"].startswith("Product ") and not record["title"].startswith("Product "):
                    current["title"] = record["title"]
        log(report, f"category {category['id']} page {page}: parsed={len(found)}, new={new_count}, total={len(products)}")
        if page >= 2 and new_count == 0:
            break
        if page > 1 and len(found) < 120:
            break
    return list(products.values())


def download_one(record: dict) -> tuple[str, str]:
    product_id = str(record["id"])
    destination = IMAGE_ROOT / f"{product_id}.jpg"
    if valid_image(destination):
        return product_id, "existing"
    session = requests.Session()
    urls = [record.get("cover_source")] if record.get("cover_source") else []
    if not urls and record.get("source"):
        fallback = base.album_fallback_cover(session, record["source"])
        if fallback:
            urls.append(fallback)
    raw = base.fetch_image(session, [url for url in urls if url], record.get("source") or SOURCE)
    if raw is None:
        return product_id, "missing"
    try:
        save_thumbnail(raw, destination)
        return product_id, "saved"
    except Exception:
        return product_id, "invalid"


def download_images(records: list[dict], category_id: str, report: list[str]) -> dict[str, int]:
    totals = {"saved": 0, "existing": 0, "missing": 0, "invalid": 0}
    if not records:
        return totals
    workers = max(1, min(10, int(os.getenv("IMAGE_WORKERS", "8"))))
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(download_one, record) for record in records]
        for index, future in enumerate(as_completed(futures), start=1):
            _, status = future.result()
            totals[status] += 1
            if index % 100 == 0 or index == len(records):
                log(report, f"category {category_id} images {index}/{len(records)}: {totals}")
    return totals


def existing_manifest_entry(category: dict) -> dict | None:
    data = read_json(category_file(category["id"]))
    products = data.get("products") if data else None
    if not isinstance(products, list):
        return None
    meta = data.get("category") if isinstance(data.get("category"), dict) else {}
    return {
        **category,
        "name": meta.get("name") or category["name"],
        "imported": True,
        "count": len(products),
        "data": f"categories/{category['id']}.json",
        "cover": products[0].get("image") if products else None,
        "missingImages": 0,
    }


def sync_category(session: requests.Session, category: dict, report: list[str]) -> dict:
    records = scrape_products(session, category, report)
    image_totals = download_images(records, category["id"], report)
    products = [
        {"id": str(record["id"]), "title": record["title"], "image": f"images/{record['id']}.jpg"}
        for record in records
    ]
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "category": category,
        "total": len(products),
        "products": products,
    }
    category_file(category["id"]).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        **category,
        "imported": True,
        "count": len(products),
        "data": f"categories/{category['id']}.json",
        "cover": products[0].get("image") if products else None,
        "missingImages": image_totals["missing"] + image_totals["invalid"],
    }


def main() -> None:
    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    IMAGE_ROOT.mkdir(parents=True, exist_ok=True)
    CATEGORY_ROOT.mkdir(parents=True, exist_ok=True)
    report: list[str] = []
    move_legacy_category(report)

    session = requests.Session()
    discovery = base.fetch_soup(session, SOURCE)
    categories = normalize_categories(base.parse_categories(discovery, SOURCE))
    log(report, f"discovery: {len(categories)} categories")

    refresh = os.getenv("REFRESH_COMPLETE", "0") == "1"
    max_new = int(os.getenv("MAX_CATEGORIES_PER_RUN", "0"))
    new_count = 0
    manifest_categories: list[dict] = []

    for position, category in enumerate(categories, start=1):
        existing = existing_manifest_entry(category)
        if existing and not refresh:
            manifest_categories.append(existing)
            log(report, f"category {position}/{len(categories)} {category['id']}: existing {existing['count']}")
            continue
        if max_new and new_count >= max_new:
            manifest_categories.append(existing or {**category, "imported": False, "count": 0, "data": None, "cover": None})
            continue
        try:
            log(report, f"category {position}/{len(categories)} {category['id']} {category['name']}: start")
            entry = sync_category(session, category, report)
            manifest_categories.append(entry)
            new_count += 1
            log(report, f"category {category['id']}: complete {entry['count']}")
        except Exception as exc:
            log(report, f"category {category['id']}: ERROR {type(exc).__name__}: {exc}")
            manifest_categories.append(existing or {**category, "imported": False, "count": 0, "data": None, "cover": None, "error": str(exc)})

    total_products = sum(int(item.get("count") or 0) for item in manifest_categories if item.get("imported"))
    imported_categories = sum(1 for item in manifest_categories if item.get("imported"))
    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "https://yunnan0594.x.yupoo.com/",
        "defaultCategory": "3551883",
        "categoryCount": len(manifest_categories),
        "importedCategoryCount": imported_categories,
        "totalProducts": total_products,
        "categories": manifest_categories,
    }
    MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    REPORT_FILE.write_text("\n".join(report) + "\n", encoding="utf-8")
    print(f"manifest: categories={len(manifest_categories)}, imported={imported_categories}, products={total_products}")


if __name__ == "__main__":
    main()
