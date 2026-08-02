from __future__ import annotations

import argparse
import json
import os
import shutil
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageFile

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


def second_original(product_id: str) -> str | None:
    response = session().get(album_url(product_id), timeout=35, allow_redirects=True)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")
    originals: list[str] = []
    for image in soup.select("img[data-origin-src]"):
        candidate = absolute(response.url, image.get("data-origin-src"))
        if not candidate or "photo.yupoo.com" not in candidate.lower():
            continue
        if candidate not in originals:
            originals.append(candidate)
    # The first photo is the captioned cover. A product with no second photo is removed.
    return originals[1] if len(originals) >= 2 else None


def download_original(url: str, product_id: str, destination: Path) -> bool:
    try:
        response = session().get(
            url,
            headers={**HEADERS, "Referer": album_url(product_id)},
            timeout=45,
            allow_redirects=True,
        )
        if not response.ok or len(response.content) < 1500:
            return False
        with Image.open(BytesIO(response.content)) as image:
            image.verify()
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(response.content)
        return True
    except Exception:
        return False


def catalog_items() -> list[dict]:
    manifest = read_json(MANIFEST_FILE, {})
    items: list[dict] = []
    for category in manifest.get("categories") or []:
        category_id = str(category.get("id") or "").strip()
        if not category_id:
            continue
        payload = read_json(CATEGORY_ROOT / f"{category_id}.json", {})
        for product in payload.get("products") or []:
            product_id = str(product.get("id") or "").strip()
            if product_id:
                items.append({"categoryId": category_id, "product": product})
    return items


def process_one(item: dict, image_dir: Path) -> dict:
    category_id = str(item["categoryId"])
    product = dict(item["product"])
    product_id = str(product.get("id") or "")
    try:
        source = second_original(product_id)
    except Exception as exc:
        return {
            "kept": False,
            "categoryId": category_id,
            "product": product,
            "reason": f"album-error:{type(exc).__name__}",
        }
    if not source:
        return {
            "kept": False,
            "categoryId": category_id,
            "product": product,
            "reason": "no-second-original",
        }
    target = image_dir / f"{product_id}.jpg"
    if not download_original(source, product_id, target):
        return {
            "kept": False,
            "categoryId": category_id,
            "product": product,
            "reason": "download-error",
        }
    product["image"] = f"images/{product_id}.jpg"
    product["cleanOriginalSource"] = source
    product["cleanOriginalSelection"] = "second album data-origin-src"
    return {
        "kept": True,
        "categoryId": category_id,
        "product": product,
        "source": source,
        "imageFile": f"images/{product_id}.jpg",
    }


def run_shard(shard_index: int, shard_count: int, output_dir: Path) -> None:
    all_items = catalog_items()
    selected = [item for index, item in enumerate(all_items) if index % shard_count == shard_index]
    image_dir = output_dir / "images"
    image_dir.mkdir(parents=True, exist_ok=True)
    workers = max(1, min(16, int(os.getenv("FAST_IMAGE_WORKERS", "12"))))
    results: list[dict] = []
    kept = 0
    removed = 0
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(process_one, item, image_dir) for item in selected]
        for index, future in enumerate(as_completed(futures), start=1):
            try:
                result = future.result()
            except Exception as exc:
                result = {"kept": False, "reason": f"worker-error:{type(exc).__name__}"}
            results.append(result)
            if result.get("kept"):
                kept += 1
            else:
                removed += 1
            if index % 50 == 0 or index == len(selected):
                print(
                    f"shard={shard_index}/{shard_count} progress={index}/{len(selected)} kept={kept} removed={removed}",
                    flush=True,
                )
    write_json(
        output_dir / "results.json",
        {
            "shardIndex": shard_index,
            "shardCount": shard_count,
            "processed": len(selected),
            "kept": kept,
            "removed": removed,
            "selection": "second album data-origin-src",
            "results": results,
        },
    )


def merge_parts(parts_root: Path) -> None:
    manifest = read_json(MANIFEST_FILE, {})
    original_categories = manifest.get("categories") or []
    original_payloads = {
        str(category.get("id")): read_json(CATEGORY_ROOT / f"{category.get('id')}.json", {})
        for category in original_categories
        if category.get("id")
    }

    by_category: dict[str, list[tuple[dict, Path]]] = {}
    processed = kept_total = removed_total = 0
    result_files = list(parts_root.rglob("results.json"))
    if not result_files:
        raise RuntimeError("No shard results were downloaded")

    for result_file in result_files:
        payload = read_json(result_file, {})
        processed += int(payload.get("processed") or 0)
        kept_total += int(payload.get("kept") or 0)
        removed_total += int(payload.get("removed") or 0)
        for result in payload.get("results") or []:
            if not result.get("kept"):
                continue
            category_id = str(result.get("categoryId") or "")
            image_file = str(result.get("imageFile") or "")
            source_path = result_file.parent / image_file
            if category_id and source_path.exists():
                by_category.setdefault(category_id, []).append((result["product"], source_path))

    temp_root = ROOT / ".clean-original-fast-build"
    shutil.rmtree(temp_root, ignore_errors=True)
    new_categories_root = temp_root / "categories"
    new_images_root = temp_root / "images"
    new_categories_root.mkdir(parents=True, exist_ok=True)
    new_images_root.mkdir(parents=True, exist_ok=True)

    new_manifest_categories: list[dict] = []
    for category in original_categories:
        category_id = str(category.get("id") or "")
        entries = by_category.get(category_id, [])
        if not entries:
            continue
        # Restore the source ordering used by the existing category JSON.
        order = {
            str(product.get("id")): index
            for index, product in enumerate(original_payloads.get(category_id, {}).get("products") or [])
        }
        entries.sort(key=lambda item: order.get(str(item[0].get("id")), 10**9))
        products: list[dict] = []
        for product, source_path in entries:
            product_id = str(product.get("id") or "")
            target = new_images_root / f"{product_id}.jpg"
            shutil.copy2(source_path, target)
            products.append(product)

        old_payload = original_payloads.get(category_id, {})
        category_payload = {
            **old_payload,
            "total": len(products),
            "products": products,
            "cleanOriginalsUpdatedAt": now(),
            "cleanOriginalSelection": "second album data-origin-src",
        }
        write_json(new_categories_root / f"{category_id}.json", category_payload)

        item = dict(category)
        item.update(
            {
                "count": len(products),
                "cover": products[0]["image"],
                "missingImages": 0,
                "cleanOriginals": True,
                "cleanOriginalSelection": "second album data-origin-src",
            }
        )
        new_manifest_categories.append(item)

    if not new_manifest_categories:
        raise RuntimeError("No products with a second original photo were found")

    shutil.rmtree(CATEGORY_ROOT, ignore_errors=True)
    shutil.rmtree(IMAGE_ROOT, ignore_errors=True)
    shutil.move(str(new_categories_root), str(CATEGORY_ROOT))
    shutil.move(str(new_images_root), str(IMAGE_ROOT))
    shutil.rmtree(temp_root, ignore_errors=True)

    manifest["categories"] = new_manifest_categories
    manifest["categoryCount"] = len(new_manifest_categories)
    manifest["importedCategoryCount"] = len(new_manifest_categories)
    manifest["totalProducts"] = sum(int(item.get("count") or 0) for item in new_manifest_categories)
    if not any(str(item.get("id")) == "3551885" for item in new_manifest_categories):
        manifest["defaultCategory"] = new_manifest_categories[0].get("id")
    else:
        manifest["defaultCategory"] = "3551885"
    manifest["cleanOriginalReimportCompletedAt"] = now()
    manifest["sourceImagePolicy"] = "second Yupoo album data-origin-src; captioned cover skipped"
    write_json(MANIFEST_FILE, manifest)

    status = {
        "status": "completed",
        "completedAt": now(),
        "source": "https://yunnan0594.x.yupoo.com/categories/3551885",
        "mode": "12-way fast second-photo original reimport",
        "categoryCount": len(new_manifest_categories),
        "totalProductsBefore": int(read_json(STATUS_FILE, {}).get("totalProductsBefore") or processed),
        "processed": processed,
        "totalProducts": int(manifest["totalProducts"]),
        "removedProducts": removed_total,
        "policy": "Skip captioned first album image; use second data-origin-src; remove products without one",
        "scope": "sneaker catalog only",
    }
    write_json(STATUS_FILE, status)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shard-index", type=int)
    parser.add_argument("--shard-count", type=int)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--merge-parts", type=Path)
    args = parser.parse_args()
    if args.merge_parts:
        merge_parts(args.merge_parts)
        return
    if args.shard_index is None or args.shard_count is None or args.output_dir is None:
        raise SystemExit("Shard mode requires --shard-index, --shard-count and --output-dir")
    run_shard(args.shard_index, args.shard_count, args.output_dir)


if __name__ == "__main__":
    main()
