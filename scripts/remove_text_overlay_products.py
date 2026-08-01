from __future__ import annotations

import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageFile
import pytesseract
from pytesseract import Output

ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path("qiqishoes-com/assets/tennis-shoes")
CATEGORY_ROOT = ROOT / "categories"
IMAGE_ROOT = ROOT / "images"
MANIFEST_FILE = ROOT / "catalog.json"
CACHE_FILE = ROOT / "text-overlay-scan-cache.json"
REPORT_FILE = ROOT / "text-overlay-cleanup-report.json"
QUARANTINE_FILE = ROOT / "text-overlay-removed-products.json"

SCAN_VERSION = 1
ASCII_RE = re.compile(r"[A-Za-z0-9]")
TOKEN_RE = re.compile(r"[A-Za-z0-9]+")


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def valid_image(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 500:
        return False
    try:
        with Image.open(path) as image:
            image.verify()
        return True
    except Exception:
        return False


def text_overlay_score(image_path: Path) -> dict:
    """Detect prominent Latin-letter / number overlays, not tiny shoe logos.

    A product is removed only when OCR finds either multiple reasonably large
    ASCII tokens or one very large/long token. This targets captions, prices,
    style codes and watermarks drawn over the photo while avoiding most small
    brand marks stitched onto the shoe.
    """
    if not valid_image(image_path):
        return {"remove": False, "reason": "invalid-image", "hits": []}

    try:
        with Image.open(image_path) as original:
            image = original.convert("RGB")
            max_side = max(image.size)
            if max_side > 1100:
                scale = 1100 / max_side
                image = image.resize(
                    (max(1, int(image.width * scale)), max(1, int(image.height * scale))),
                    Image.Resampling.LANCZOS,
                )
            width, height = image.size
            data = pytesseract.image_to_data(
                image,
                lang=os.getenv("OCR_LANG", "eng+chi_sim"),
                config="--oem 1 --psm 11",
                output_type=Output.DICT,
            )
    except Exception as exc:
        return {"remove": False, "reason": f"ocr-error:{type(exc).__name__}", "hits": []}

    hits: list[dict] = []
    for index, raw_text in enumerate(data.get("text", [])):
        text = str(raw_text or "").strip()
        if not text or not ASCII_RE.search(text):
            continue
        try:
            confidence = float(data["conf"][index])
        except Exception:
            confidence = -1
        if confidence < 42:
            continue

        tokens = TOKEN_RE.findall(text)
        ascii_text = "".join(tokens)
        if len(ascii_text) < 2:
            continue

        box_width = int(data["width"][index])
        box_height = int(data["height"][index])
        left = int(data["left"][index])
        top = int(data["top"][index])
        height_ratio = box_height / max(1, height)
        area_ratio = (box_width * box_height) / max(1, width * height)

        # Ignore tiny embroidered logos and small product-box marks.
        prominent = height_ratio >= 0.032 or area_ratio >= 0.0015
        if not prominent:
            continue

        hits.append(
            {
                "text": text[:120],
                "asciiChars": len(ascii_text),
                "confidence": round(confidence, 1),
                "heightRatio": round(height_ratio, 4),
                "areaRatio": round(area_ratio, 5),
                "box": [left, top, box_width, box_height],
            }
        )

    total_chars = sum(hit["asciiChars"] for hit in hits)
    long_hits = [hit for hit in hits if hit["asciiChars"] >= 7]
    very_large_hits = [hit for hit in hits if hit["heightRatio"] >= 0.055]
    digit_hits = [hit for hit in hits if re.search(r"\d{3,}", hit["text"])]

    remove = (
        (len(hits) >= 2 and total_chars >= 6)
        or bool(long_hits and very_large_hits)
        or bool(digit_hits and total_chars >= 7)
    )
    return {
        "remove": remove,
        "reason": "prominent-ascii-overlay" if remove else "clean",
        "hits": hits[:12],
        "totalAsciiChars": total_chars,
    }


def scan_one(product: dict, cache: dict) -> tuple[str, dict]:
    product_id = str(product.get("id") or "")
    image_rel = str(product.get("image") or f"images/{product_id}.jpg")
    image_path = ROOT / image_rel
    cached = cache.get(product_id)
    if isinstance(cached, dict) and cached.get("scanVersion") == SCAN_VERSION:
        return product_id, cached
    result = text_overlay_score(image_path)
    result.update(
        {
            "scanVersion": SCAN_VERSION,
            "image": image_rel,
            "scannedAt": datetime.now(timezone.utc).isoformat(),
        }
    )
    return product_id, result


def main() -> None:
    category_files = sorted(CATEGORY_ROOT.glob("*.json"))
    cache_payload = read_json(CACHE_FILE, {"scanVersion": SCAN_VERSION, "items": {}})
    cache = cache_payload.get("items") if isinstance(cache_payload, dict) else {}
    if not isinstance(cache, dict):
        cache = {}

    categories: list[tuple[Path, dict]] = []
    unique_products: dict[str, dict] = {}
    for category_path in category_files:
        data = read_json(category_path, {})
        products = data.get("products") if isinstance(data, dict) else None
        if not isinstance(products, list):
            continue
        categories.append((category_path, data))
        for product in products:
            product_id = str(product.get("id") or "")
            if product_id:
                unique_products.setdefault(product_id, product)

    workers = max(1, min(6, int(os.getenv("TEXT_SCAN_WORKERS", "4"))))
    results: dict[str, dict] = {}
    products = list(unique_products.values())
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(scan_one, product, cache) for product in products]
        for index, future in enumerate(as_completed(futures), start=1):
            product_id, result = future.result()
            results[product_id] = result
            cache[product_id] = result
            if index % 100 == 0 or index == len(futures):
                print(f"OCR scan {index}/{len(futures)}", flush=True)

    removed_records: list[dict] = []
    category_summaries: list[dict] = []
    for category_path, data in categories:
        original = data.get("products", [])
        kept: list[dict] = []
        removed: list[dict] = []
        for product in original:
            product_id = str(product.get("id") or "")
            scan = results.get(product_id) or cache.get(product_id) or {}
            if scan.get("remove"):
                removed.append(product)
                removed_records.append(
                    {
                        "categoryId": str(data.get("category", {}).get("id") or category_path.stem),
                        "categoryName": data.get("category", {}).get("name"),
                        "product": product,
                        "detection": scan,
                    }
                )
            else:
                kept.append(product)

        data["products"] = kept
        data["total"] = len(kept)
        data["textOverlayCleanupAt"] = datetime.now(timezone.utc).isoformat()
        data["textOverlayRemoved"] = len(removed)
        write_json(category_path, data)
        category_summaries.append(
            {
                "categoryId": str(data.get("category", {}).get("id") or category_path.stem),
                "categoryName": data.get("category", {}).get("name"),
                "before": len(original),
                "removed": len(removed),
                "after": len(kept),
            }
        )
        print(f"category {category_path.stem}: {len(original)} -> {len(kept)}", flush=True)

    manifest = read_json(MANIFEST_FILE, {})
    if isinstance(manifest, dict) and isinstance(manifest.get("categories"), list):
        by_id = {summary["categoryId"]: summary for summary in category_summaries}
        cleaned_categories = []
        for category in manifest["categories"]:
            category_id = str(category.get("id") or "")
            summary = by_id.get(category_id)
            if summary:
                category["count"] = summary["after"]
                category_data = read_json(CATEGORY_ROOT / f"{category_id}.json", {})
                remaining = category_data.get("products") if isinstance(category_data, dict) else []
                category["cover"] = remaining[0].get("image") if remaining else None
            if int(category.get("count") or 0) > 0 and category.get("cover"):
                cleaned_categories.append(category)
        manifest["categories"] = cleaned_categories
        manifest["categoryCount"] = len(cleaned_categories)
        manifest["importedCategoryCount"] = sum(1 for item in cleaned_categories if item.get("imported"))
        manifest["totalProducts"] = sum(int(item.get("count") or 0) for item in cleaned_categories)
        manifest["textOverlayCleanupAt"] = datetime.now(timezone.utc).isoformat()
        write_json(MANIFEST_FILE, manifest)

    write_json(CACHE_FILE, {"scanVersion": SCAN_VERSION, "items": cache})
    write_json(
        QUARANTINE_FILE,
        {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "description": "Products removed from visible sneaker catalogs because their images contain prominent Latin-letter or numeric overlays.",
            "removedCount": len(removed_records),
            "items": removed_records,
        },
    )
    write_json(
        REPORT_FILE,
        {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "scanVersion": SCAN_VERSION,
            "scannedUniqueImages": len(products),
            "removedProductEntries": len(removed_records),
            "categories": category_summaries,
        },
    )
    print(f"cleanup complete: scanned={len(products)}, removed entries={len(removed_records)}", flush=True)


if __name__ == "__main__":
    main()
