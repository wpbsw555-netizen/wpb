from __future__ import annotations

import argparse
import json
import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin

import pytesseract
import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageEnhance, ImageFile, ImageOps
from pytesseract import Output

ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path("qiqishoes-com/assets/tennis-shoes")
CATEGORY_ROOT = ROOT / "categories"
IMAGE_ROOT = ROOT / "images"
MANIFEST_FILE = ROOT / "catalog.json"
STATUS_FILE = ROOT / "clean-original-reimport-status.json"
SOURCE_ROOT = "https://yunnan0594.x.yupoo.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}
ASCII_RE = re.compile(r"[A-Za-z0-9]")
THREAD_LOCAL = threading.local()


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def session() -> requests.Session:
    value = getattr(THREAD_LOCAL, "session", None)
    if value is None:
        value = requests.Session()
        value.headers.update(HEADERS)
        THREAD_LOCAL.session = value
    return value


def absolute(base: str, value: str | None) -> str | None:
    if not value:
        return None
    value = str(value).strip().replace("\\/", "/")
    if not value or value.startswith("data:"):
        return None
    if value.startswith("//"):
        return "https:" + value
    return urljoin(base, value)


def album_url(product_id: str) -> str:
    return f"{SOURCE_ROOT}/albums/{product_id}?uid=1"


def original_candidates(product_id: str) -> list[str]:
    url = album_url(product_id)
    response = session().get(url, timeout=60, allow_redirects=True)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    originals: list[str] = []

    # Yupoo exposes the unmodified upload through data-origin-src.
    for image in soup.select("img[data-origin-src]"):
        candidate = absolute(response.url, image.get("data-origin-src"))
        if not candidate or "photo.yupoo.com" not in candidate.lower():
            continue
        if candidate not in originals:
            originals.append(candidate)

    # Fallback to the large derivative only when the original attribute is absent.
    if not originals:
        for image in soup.select("img[data-src]"):
            candidate = absolute(response.url, image.get("data-src"))
            if not candidate or "photo.yupoo.com" not in candidate.lower():
                continue
            if candidate not in originals:
                originals.append(candidate)

    # The first album image is commonly a captioned cover. Try subsequent photos first.
    if len(originals) > 1:
        originals = originals[1:] + originals[:1]
    return originals[: max(1, int(os.getenv("CLEAN_MAX_CANDIDATES", "7")))]


def fetch_image(url: str, referer: str) -> bytes | None:
    try:
        response = session().get(
            url,
            headers={**HEADERS, "Referer": referer},
            timeout=60,
            allow_redirects=True,
        )
        if not response.ok or len(response.content) < 1000:
            return None
        with Image.open(BytesIO(response.content)) as image:
            image.verify()
        return response.content
    except Exception:
        return None


def clean_token(value: str) -> str:
    return "".join(ch for ch in str(value or "").strip() if ch.isalnum())


def overlay_analysis(raw: bytes) -> dict:
    with Image.open(BytesIO(raw)) as source:
        image = source.convert("RGB")
        max_side = max(image.size)
        if max_side > 1100:
            scale = 1100 / max_side
            image = image.resize(
                (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
                Image.Resampling.LANCZOS,
            )
        elif max_side < 800:
            scale = 800 / max_side
            image = image.resize(
                (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
                Image.Resampling.LANCZOS,
            )

        gray = ImageOps.grayscale(image)
        gray = ImageEnhance.Contrast(ImageOps.autocontrast(gray)).enhance(1.7)
        data = pytesseract.image_to_data(
            gray,
            lang="eng",
            config="--oem 1 --psm 11",
            output_type=Output.DICT,
        )

    width, height = gray.size
    strong = 0
    medium = 0
    total_area = 0.0
    hits: list[dict] = []
    for index, text in enumerate(data.get("text", [])):
        token = clean_token(text)
        if not token or not ASCII_RE.search(token):
            continue
        try:
            confidence = float(data["conf"][index])
            box_width = int(data["width"][index])
            box_height = int(data["height"][index])
            left = int(data["left"][index])
            top = int(data["top"][index])
        except Exception:
            continue
        if confidence < 12 or box_width <= 0 or box_height <= 0:
            continue

        width_ratio = box_width / max(1, width)
        height_ratio = box_height / max(1, height)
        area_ratio = (box_width * box_height) / max(1, width * height)
        total_area += area_ratio

        is_strong = (
            height_ratio >= 0.026
            or width_ratio >= 0.12
            or area_ratio >= 0.003
            or (len(token) >= 5 and height_ratio >= 0.021)
        )
        is_medium = (
            height_ratio >= 0.016
            and width_ratio >= 0.035
            and len(token) >= 2
        )
        if is_strong:
            strong += 1
        elif is_medium:
            medium += 1

        if is_strong or is_medium:
            hits.append(
                {
                    "text": str(text)[:80],
                    "confidence": round(confidence, 1),
                    "left": left,
                    "top": top,
                    "widthRatio": round(width_ratio, 4),
                    "heightRatio": round(height_ratio, 4),
                    "areaRatio": round(area_ratio, 6),
                }
            )

    # Small physical shoe logos are tolerated; large semi-transparent captions are not.
    clean = strong == 0 and medium <= 2 and total_area < 0.009
    score = strong * 1000 + medium * 100 + round(total_area * 10000)
    return {
        "clean": clean,
        "score": score,
        "strong": strong,
        "medium": medium,
        "textArea": round(total_area, 6),
        "hits": hits[:12],
    }


def save_clean_image(raw: bytes, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(BytesIO(raw)) as image:
        image.load()
        image = image.convert("RGB")
        image.thumbnail((720, 720), Image.Resampling.LANCZOS)
        image.save(destination, "JPEG", quality=80, optimize=True, progressive=True)


def process_product(product: dict) -> dict:
    product_id = str(product.get("id") or "").strip()
    destination = IMAGE_ROOT / f"{product_id}.jpg"
    referer = album_url(product_id)
    if not product_id:
        return {"kept": False, "reason": "missing-id", "product": product}

    try:
        candidates = original_candidates(product_id)
    except Exception as exc:
        return {
            "kept": False,
            "reason": f"album-error:{type(exc).__name__}",
            "product": product,
        }

    best: tuple[int, bytes, str, dict] | None = None
    for candidate in candidates:
        raw = fetch_image(candidate, referer)
        if raw is None:
            continue
        try:
            analysis = overlay_analysis(raw)
        except Exception:
            continue
        item = (int(analysis["score"]), raw, candidate, analysis)
        if best is None or item[0] < best[0]:
            best = item
        if analysis["clean"]:
            save_clean_image(raw, destination)
            cleaned = dict(product)
            cleaned["image"] = f"images/{product_id}.jpg"
            cleaned["cleanOriginalSource"] = candidate
            return {
                "kept": True,
                "product": cleaned,
                "source": candidate,
                "analysis": analysis,
            }

    destination.unlink(missing_ok=True)
    return {
        "kept": False,
        "reason": "no-clean-original",
        "product": product,
        "bestAnalysis": best[3] if best else None,
    }


def update_manifest_category(category_id: str, products: list[dict]) -> None:
    manifest = read_json(MANIFEST_FILE, {})
    categories = manifest.get("categories") if isinstance(manifest.get("categories"), list) else []
    updated: list[dict] = []
    for category in categories:
        if str(category.get("id")) != category_id:
            updated.append(category)
            continue
        if products:
            item = dict(category)
            item["count"] = len(products)
            item["cover"] = products[0].get("image")
            item["missingImages"] = 0
            item["cleanOriginals"] = True
            updated.append(item)
    manifest["categories"] = updated
    manifest["categoryCount"] = len(updated)
    manifest["importedCategoryCount"] = len(updated)
    manifest["totalProducts"] = sum(int(item.get("count") or 0) for item in updated)
    if updated and not any(str(item.get("id")) == str(manifest.get("defaultCategory")) for item in updated):
        manifest["defaultCategory"] = updated[0].get("id")
    if not updated:
        manifest["defaultCategory"] = None
    manifest["cleanOriginalReimportUpdatedAt"] = now()
    write_json(MANIFEST_FILE, manifest)


def process_category(category_id: str) -> None:
    path = CATEGORY_ROOT / f"{category_id}.json"
    payload = read_json(path, {})
    products = payload.get("products") if isinstance(payload.get("products"), list) else []
    workers = max(1, min(6, int(os.getenv("CLEAN_IMAGE_WORKERS", "4"))))

    results: dict[str, dict] = {}
    kept_count = 0
    removed_count = 0
    errors = 0
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(process_product, product): product for product in products}
        for index, future in enumerate(as_completed(futures), start=1):
            original = futures[future]
            product_id = str(original.get("id") or "")
            try:
                result = future.result()
            except Exception as exc:
                result = {"kept": False, "reason": f"worker-error:{type(exc).__name__}", "product": original}
                errors += 1
            results[product_id] = result
            if result.get("kept"):
                kept_count += 1
            else:
                removed_count += 1
            if index % 25 == 0 or index == len(products):
                print(
                    f"category={category_id} progress={index}/{len(products)} "
                    f"kept={kept_count} removed={removed_count} errors={errors}",
                    flush=True,
                )

    kept_products = [
        results[str(product.get("id") or "")]["product"]
        for product in products
        if results.get(str(product.get("id") or ""), {}).get("kept")
    ]

    if kept_products:
        payload["products"] = kept_products
        payload["total"] = len(kept_products)
        payload["cleanOriginalsUpdatedAt"] = now()
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    else:
        path.unlink(missing_ok=True)

    update_manifest_category(category_id, kept_products)

    status = read_json(STATUS_FILE, {})
    completed = status.get("completedCategories") if isinstance(status.get("completedCategories"), list) else []
    if category_id not in completed:
        completed.append(category_id)
    status.update(
        {
            "status": "running",
            "updatedAt": now(),
            "completedCategories": completed,
            "completedCategoryCount": len(completed),
            "lastCategory": category_id,
            "lastCategoryBefore": len(products),
            "lastCategoryKept": len(kept_products),
            "lastCategoryRemoved": len(products) - len(kept_products),
        }
    )
    write_json(STATUS_FILE, status)


def finalize() -> None:
    manifest = read_json(MANIFEST_FILE, {})
    categories = manifest.get("categories") if isinstance(manifest.get("categories"), list) else []
    total = sum(int(item.get("count") or 0) for item in categories)
    status = read_json(STATUS_FILE, {})
    status.update(
        {
            "status": "completed",
            "completedAt": now(),
            "categoryCount": len(categories),
            "totalProducts": total,
            "defaultCategory": manifest.get("defaultCategory"),
            "policy": "album data-origin-src originals only; large English/digit overlays rejected",
        }
    )
    write_json(STATUS_FILE, status)
    manifest["cleanOriginalReimportCompletedAt"] = status["completedAt"]
    manifest["sourceImagePolicy"] = "Yupoo album data-origin-src; no large English/digit overlay"
    write_json(MANIFEST_FILE, manifest)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--category")
    parser.add_argument("--finalize", action="store_true")
    args = parser.parse_args()
    if args.finalize:
        finalize()
        return
    if not args.category:
        raise SystemExit("--category is required")
    process_category(str(args.category))


if __name__ == "__main__":
    main()
