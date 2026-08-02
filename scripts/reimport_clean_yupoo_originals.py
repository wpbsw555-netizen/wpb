from __future__ import annotations

import argparse
import json
import os
import re
import shutil
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
    response = session().get(url, timeout=45, allow_redirects=True)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    originals: list[str] = []

    for image in soup.select("img[data-origin-src]"):
        candidate = absolute(response.url, image.get("data-origin-src"))
        if candidate and "photo.yupoo.com" in candidate.lower() and candidate not in originals:
            originals.append(candidate)

    if not originals:
        for image in soup.select("img[data-src]"):
            candidate = absolute(response.url, image.get("data-src"))
            if candidate and "photo.yupoo.com" in candidate.lower() and candidate not in originals:
                originals.append(candidate)

    # The first image is usually the captioned cover. Test later album photos first.
    if len(originals) > 1:
        originals = originals[1:] + originals[:1]
    limit = max(1, int(os.getenv("CLEAN_MAX_CANDIDATES", "3")))
    return originals[:limit]


def fetch_image(url: str, referer: str) -> bytes | None:
    try:
        response = session().get(
            url,
            headers={**HEADERS, "Referer": referer},
            timeout=45,
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
        if max_side > 820:
            scale = 820 / max_side
            image = image.resize(
                (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
                Image.Resampling.LANCZOS,
            )
        elif max_side < 620:
            scale = 620 / max_side
            image = image.resize(
                (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
                Image.Resampling.LANCZOS,
            )

        gray = ImageOps.grayscale(image)
        gray = ImageEnhance.Contrast(ImageOps.autocontrast(gray)).enhance(1.55)
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
        except Exception:
            continue
        if confidence < 14 or box_width <= 0 or box_height <= 0:
            continue

        width_ratio = box_width / max(1, width)
        height_ratio = box_height / max(1, height)
        area_ratio = (box_width * box_height) / max(1, width * height)
        total_area += area_ratio
        is_strong = (
            height_ratio >= 0.027
            or width_ratio >= 0.13
            or area_ratio >= 0.0032
            or (len(token) >= 5 and height_ratio >= 0.022)
        )
        is_medium = height_ratio >= 0.017 and width_ratio >= 0.038 and len(token) >= 2
        if is_strong:
            strong += 1
        elif is_medium:
            medium += 1
        if is_strong or is_medium:
            hits.append({
                "text": str(text)[:60],
                "confidence": round(confidence, 1),
                "widthRatio": round(width_ratio, 4),
                "heightRatio": round(height_ratio, 4),
                "areaRatio": round(area_ratio, 6),
            })

    clean = strong == 0 and medium <= 2 and total_area < 0.009
    score = strong * 1000 + medium * 100 + round(total_area * 10000)
    return {
        "clean": clean,
        "score": score,
        "strong": strong,
        "medium": medium,
        "textArea": round(total_area, 6),
        "hits": hits[:10],
    }


def save_clean_image(raw: bytes, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(BytesIO(raw)) as image:
        image.load()
        image = image.convert("RGB")
        image.thumbnail((900, 900), Image.Resampling.LANCZOS)
        image.save(destination, "JPEG", quality=86, optimize=True, progressive=True)


def process_product(product: dict, output_image_root: Path) -> dict:
    product_id = str(product.get("id") or "").strip()
    referer = album_url(product_id)
    if not product_id:
        return {"kept": False, "reason": "missing-id", "product": product}

    try:
        candidates = original_candidates(product_id)
    except Exception as exc:
        return {"kept": False, "reason": f"album-error:{type(exc).__name__}", "product": product}

    best: tuple[int, dict] | None = None
    for candidate in candidates:
        raw = fetch_image(candidate, referer)
        if raw is None:
            continue
        try:
            analysis = overlay_analysis(raw)
        except Exception:
            continue
        if best is None or int(analysis["score"]) < best[0]:
            best = (int(analysis["score"]), analysis)
        if analysis["clean"]:
            destination = output_image_root / f"{product_id}.jpg"
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

    return {
        "kept": False,
        "reason": "no-clean-original",
        "product": product,
        "bestAnalysis": best[1] if best else None,
    }


def catalog_tasks() -> list[dict]:
    manifest = read_json(MANIFEST_FILE, {})
    categories = manifest.get("categories") if isinstance(manifest.get("categories"), list) else []
    tasks: list[dict] = []
    for category in categories:
        category_id = str(category.get("id") or "").strip()
        if not category_id:
            continue
        payload = read_json(CATEGORY_ROOT / f"{category_id}.json", {})
        products = payload.get("products") if isinstance(payload.get("products"), list) else []
        for order, product in enumerate(products):
            tasks.append({"categoryId": category_id, "order": order, "product": product})
    return tasks


def process_shard(shard_index: int, shard_count: int, output_dir: Path) -> None:
    all_tasks = catalog_tasks()
    tasks = [task for index, task in enumerate(all_tasks) if index % shard_count == shard_index]
    output_dir.mkdir(parents=True, exist_ok=True)
    output_images = output_dir / "images"
    workers = max(1, min(6, int(os.getenv("CLEAN_IMAGE_WORKERS", "4"))))
    results: list[dict] = []
    kept = 0
    removed = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(process_product, task["product"], output_images): task
            for task in tasks
        }
        for completed, future in enumerate(as_completed(futures), start=1):
            task = futures[future]
            try:
                result = future.result()
            except Exception as exc:
                result = {
                    "kept": False,
                    "reason": f"worker-error:{type(exc).__name__}",
                    "product": task["product"],
                }
            record = {
                "categoryId": task["categoryId"],
                "order": task["order"],
                "productId": str(task["product"].get("id") or ""),
                **result,
            }
            results.append(record)
            if result.get("kept"):
                kept += 1
            else:
                removed += 1
            if completed % 25 == 0 or completed == len(tasks):
                print(
                    f"shard={shard_index}/{shard_count} progress={completed}/{len(tasks)} "
                    f"kept={kept} removed={removed}",
                    flush=True,
                )

    write_json(output_dir / "result.json", {
        "generatedAt": now(),
        "shardIndex": shard_index,
        "shardCount": shard_count,
        "totalCatalogTasks": len(all_tasks),
        "taskCount": len(tasks),
        "kept": kept,
        "removed": removed,
        "results": results,
    })


def merge_parts(parts_root: Path) -> None:
    all_tasks = catalog_tasks()
    expected = {(task["categoryId"], str(task["product"].get("id") or "")) for task in all_tasks}
    result_map: dict[tuple[str, str], dict] = {}
    for result_file in parts_root.rglob("result.json"):
        payload = read_json(result_file, {})
        for record in payload.get("results") or []:
            key = (str(record.get("categoryId") or ""), str(record.get("productId") or ""))
            if key[0] and key[1]:
                result_map[key] = record

    missing = expected - set(result_map)
    if missing:
        sample = sorted(missing)[:10]
        raise RuntimeError(f"Missing {len(missing)} shard results; sample={sample}")

    image_sources: dict[str, Path] = {}
    for image_path in parts_root.rglob("*.jpg"):
        image_sources[image_path.stem] = image_path

    manifest = read_json(MANIFEST_FILE, {})
    categories = manifest.get("categories") if isinstance(manifest.get("categories"), list) else []
    updated_categories: list[dict] = []
    updated_payloads: dict[str, dict] = {}
    kept_ids: set[str] = set()
    removed_total = 0

    stage = ROOT / ".clean-original-merge-images"
    shutil.rmtree(stage, ignore_errors=True)
    stage.mkdir(parents=True, exist_ok=True)

    for category in categories:
        category_id = str(category.get("id") or "")
        path = CATEGORY_ROOT / f"{category_id}.json"
        payload = read_json(path, {})
        products = payload.get("products") if isinstance(payload.get("products"), list) else []
        kept_products: list[dict] = []
        for product in products:
            product_id = str(product.get("id") or "")
            record = result_map[(category_id, product_id)]
            if not record.get("kept"):
                removed_total += 1
                continue
            source_image = image_sources.get(product_id)
            if source_image is None:
                raise RuntimeError(f"Missing clean image artifact for product {product_id}")
            shutil.copy2(source_image, stage / f"{product_id}.jpg")
            kept_ids.add(product_id)
            kept_products.append(record["product"])

        if not kept_products:
            continue
        payload["products"] = kept_products
        payload["total"] = len(kept_products)
        payload["cleanOriginalsUpdatedAt"] = now()
        updated_payloads[category_id] = payload
        item = dict(category)
        item["count"] = len(kept_products)
        item["cover"] = kept_products[0].get("image")
        item["missingImages"] = 0
        item["cleanOriginals"] = True
        updated_categories.append(item)

    shutil.rmtree(IMAGE_ROOT, ignore_errors=True)
    stage.rename(IMAGE_ROOT)

    existing_category_files = list(CATEGORY_ROOT.glob("*.json"))
    for path in existing_category_files:
        if path.stem not in updated_payloads:
            path.unlink(missing_ok=True)
    for category_id, payload in updated_payloads.items():
        write_json(CATEGORY_ROOT / f"{category_id}.json", payload)

    manifest["categories"] = updated_categories
    manifest["categoryCount"] = len(updated_categories)
    manifest["importedCategoryCount"] = len(updated_categories)
    manifest["totalProducts"] = sum(int(item.get("count") or 0) for item in updated_categories)
    if updated_categories and not any(str(item.get("id")) == str(manifest.get("defaultCategory")) for item in updated_categories):
        manifest["defaultCategory"] = updated_categories[0].get("id")
    if not updated_categories:
        manifest["defaultCategory"] = None
    manifest["cleanOriginalReimportCompletedAt"] = now()
    manifest["sourceImagePolicy"] = "Yupoo album data-origin-src; large English/digit overlays rejected"
    write_json(MANIFEST_FILE, manifest)

    status = read_json(STATUS_FILE, {})
    status.update({
        "status": "completed",
        "completedAt": now(),
        "categoryCount": len(updated_categories),
        "totalProducts": manifest["totalProducts"],
        "removedProducts": removed_total,
        "defaultCategory": manifest.get("defaultCategory"),
        "policy": "12-way sharded album data-origin-src import; large English/digit overlays rejected",
    })
    write_json(STATUS_FILE, status)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shard-index", type=int)
    parser.add_argument("--shard-count", type=int)
    parser.add_argument("--output-dir")
    parser.add_argument("--merge-parts")
    args = parser.parse_args()

    if args.merge_parts:
        merge_parts(Path(args.merge_parts))
        return
    if args.shard_index is None or args.shard_count is None or not args.output_dir:
        raise SystemExit("Use --shard-index N --shard-count N --output-dir PATH, or --merge-parts PATH")
    if not 0 <= args.shard_index < args.shard_count:
        raise SystemExit("Invalid shard index")
    process_shard(args.shard_index, args.shard_count, Path(args.output_dir))


if __name__ == "__main__":
    main()
