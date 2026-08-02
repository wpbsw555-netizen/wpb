from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFile, ImageOps
import pytesseract
from pytesseract import Output

ImageFile.LOAD_TRUNCATED_IMAGES = True
ROOT = Path("qiqishoes-com/assets/tennis-shoes")
CATEGORY_ROOT = ROOT / "categories"
IMAGE_ROOT = ROOT / "images"
ASCII_RE = re.compile(r"[A-Za-z0-9]")
DIGIT_RE = re.compile(r"\d")


def clean_token(value: str) -> str:
    return "".join(ch for ch in str(value or "").strip() if ch.isalnum())


def analyse(image_path: Path) -> dict:
    try:
        with Image.open(image_path) as source:
            image = source.convert("RGB")
            max_side = max(image.size)
            if max_side > 900:
                ratio = 900 / max_side
                image = image.resize(
                    (max(1, round(image.width * ratio)), max(1, round(image.height * ratio))),
                    Image.Resampling.LANCZOS,
                )
            # Mild contrast enhancement improves caption/watermark recognition without
            # turning shoe stitching and texture into false OCR characters.
            image = ImageEnhance.Contrast(ImageOps.autocontrast(image)).enhance(1.15)
            width, height = image.size
            data = pytesseract.image_to_data(
                image,
                lang="eng",
                config="--oem 1 --psm 11",
                output_type=Output.DICT,
            )
    except Exception as exc:
        return {"remove": False, "error": f"{type(exc).__name__}: {exc}", "hits": []}

    hits: list[dict] = []
    lines: dict[tuple[int, int, int], list[dict]] = defaultdict(list)
    count = len(data.get("text", []))
    for index in range(count):
        raw = str(data["text"][index] or "").strip()
        token = clean_token(raw)
        if len(token) < 2 or not ASCII_RE.search(token):
            continue
        try:
            confidence = float(data["conf"][index])
            left = int(data["left"][index])
            top = int(data["top"][index])
            box_width = int(data["width"][index])
            box_height = int(data["height"][index])
        except Exception:
            continue
        if confidence < 38 or box_width <= 0 or box_height <= 0:
            continue

        width_ratio = box_width / max(1, width)
        height_ratio = box_height / max(1, height)
        char_count = len(token)
        digit_count = len(DIGIT_RE.findall(token))
        prominent = (
            height_ratio >= 0.038
            or width_ratio >= 0.105
            or (char_count >= 5 and height_ratio >= 0.026)
            or (digit_count >= 3 and height_ratio >= 0.024)
        )
        if not prominent:
            continue

        hit = {
            "text": raw[:80],
            "confidence": round(confidence, 1),
            "left": left,
            "top": top,
            "width": box_width,
            "height": box_height,
            "widthRatio": round(width_ratio, 4),
            "heightRatio": round(height_ratio, 4),
            "chars": char_count,
            "digits": digit_count,
        }
        hits.append(hit)
        key = (
            int(data.get("block_num", [0] * count)[index]),
            int(data.get("par_num", [0] * count)[index]),
            int(data.get("line_num", [0] * count)[index]),
        )
        lines[key].append(hit)

    very_large = any(
        hit["heightRatio"] >= 0.072
        or hit["widthRatio"] >= 0.24
        or (hit["chars"] >= 8 and hit["heightRatio"] >= 0.032)
        for hit in hits
    )
    multiple_prominent = len(hits) >= 2 and sum(hit["chars"] for hit in hits) >= 7
    digit_caption = any(hit["digits"] >= 4 and hit["heightRatio"] >= 0.026 for hit in hits)
    wide_line = False
    for line_hits in lines.values():
        if not line_hits:
            continue
        left = min(hit["left"] for hit in line_hits)
        right = max(hit["left"] + hit["width"] for hit in line_hits)
        line_width_ratio = (right - left) / max(1, width)
        chars = sum(hit["chars"] for hit in line_hits)
        max_height_ratio = max(hit["heightRatio"] for hit in line_hits)
        if chars >= 7 and line_width_ratio >= 0.22 and max_height_ratio >= 0.028:
            wide_line = True
            break

    remove = bool(very_large or multiple_prominent or digit_caption or wide_line)
    return {
        "remove": remove,
        "hits": hits[:20],
        "reason": {
            "veryLarge": very_large,
            "multipleProminent": multiple_prominent,
            "digitCaption": digit_caption,
            "wideLine": wide_line,
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--category", required=True)
    parser.add_argument("--start", type=int, required=True)
    parser.add_argument("--end", type=int, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    category_path = CATEGORY_ROOT / f"{args.category}.json"
    payload = json.loads(category_path.read_text(encoding="utf-8"))
    products = payload.get("products") or []
    selected = products[args.start : args.end]

    results: list[dict] = []
    removed = 0
    errors = 0
    for offset, product in enumerate(selected, start=args.start):
        product_id = str(product.get("id") or "")
        relative = str(product.get("image") or f"images/{product_id}.jpg")
        image_path = ROOT / relative
        decision = analyse(image_path)
        if decision.get("remove"):
            removed += 1
        if decision.get("error"):
            errors += 1
        results.append(
            {
                "category": str(args.category),
                "index": offset,
                "id": product_id,
                "title": product.get("title") or "",
                "image": relative,
                **decision,
            }
        )

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(
            {
                "category": str(args.category),
                "start": args.start,
                "end": args.end,
                "scanned": len(results),
                "removed": removed,
                "errors": errors,
                "results": results,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(
        f"category={args.category} range={args.start}:{args.end} "
        f"scanned={len(results)} removed={removed} errors={errors}"
    )


if __name__ == "__main__":
    main()
