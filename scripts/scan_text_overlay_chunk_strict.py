from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFile, ImageOps
import pytesseract
from pytesseract import Output

ImageFile.LOAD_TRUNCATED_IMAGES = True
ROOT = Path("qiqishoes-com/assets/tennis-shoes")
CATEGORY_ROOT = ROOT / "categories"
ASCII_RE = re.compile(r"[A-Za-z0-9]")
DIGIT_RE = re.compile(r"\d")


def clean_token(value: str) -> str:
    return "".join(ch for ch in str(value or "").strip() if ch.isalnum())


def prepare_images(source: Image.Image) -> tuple[Image.Image, Image.Image]:
    """Prepare a fast grayscale pass and an RGB fallback pass."""
    image = source.convert("RGB")
    max_side = max(image.size)
    target = 900
    if max_side != target:
        scale = target / max_side
        image = image.resize(
            (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
            Image.Resampling.LANCZOS,
        )

    gray = ImageOps.grayscale(image)
    gray = ImageEnhance.Contrast(ImageOps.autocontrast(gray)).enhance(1.65)
    rgb = ImageEnhance.Contrast(ImageOps.autocontrast(image)).enhance(1.25)
    return gray, rgb


def scan_variant(image: Image.Image, variant: int) -> list[dict]:
    width, height = image.size
    data = pytesseract.image_to_data(
        image,
        lang="eng",
        config="--oem 1 --psm 11",
        output_type=Output.DICT,
        timeout=25,
    )
    hits: list[dict] = []
    count = len(data.get("text", []))
    for index in range(count):
        raw = str(data["text"][index] or "").strip()
        token = clean_token(raw)
        if not token or not ASCII_RE.search(token):
            continue
        try:
            confidence = float(data["conf"][index])
            left = int(data["left"][index])
            top = int(data["top"][index])
            box_width = int(data["width"][index])
            box_height = int(data["height"][index])
        except Exception:
            continue
        if box_width <= 0 or box_height <= 0 or confidence < 16:
            continue

        width_ratio = box_width / max(1, width)
        height_ratio = box_height / max(1, height)
        area_ratio = (box_width * box_height) / max(1, width * height)
        digits = len(DIGIT_RE.findall(token))
        visible = (
            height_ratio >= 0.015
            or width_ratio >= 0.034
            or area_ratio >= 0.0006
            or (digits >= 1 and height_ratio >= 0.011)
            or (len(token) >= 3 and confidence >= 25 and height_ratio >= 0.010)
        )
        if not visible:
            continue

        hits.append(
            {
                "text": raw[:100],
                "token": token[:100],
                "confidence": round(confidence, 1),
                "left": left,
                "top": top,
                "width": box_width,
                "height": box_height,
                "widthRatio": round(width_ratio, 4),
                "heightRatio": round(height_ratio, 4),
                "areaRatio": round(area_ratio, 6),
                "digits": digits,
                "variant": variant,
            }
        )
    return hits


def strong_enough(hits: list[dict]) -> bool:
    strong = [
        hit for hit in hits
        if hit["confidence"] >= 22
        or hit["heightRatio"] >= 0.019
        or hit["widthRatio"] >= 0.052
        or hit["digits"] >= 1
    ]
    return bool(strong or len(hits) >= 2)


def deduplicate(all_hits: list[dict]) -> list[dict]:
    unique: dict[tuple[str, int, int], dict] = {}
    for hit in all_hits:
        key = (
            str(hit.get("token", "")).lower(),
            int(hit.get("left", 0) / 20),
            int(hit.get("top", 0) / 20),
        )
        previous = unique.get(key)
        if previous is None or float(hit.get("confidence", 0)) > float(previous.get("confidence", 0)):
            unique[key] = hit
    return list(unique.values())


def analyse(image_path: Path) -> dict:
    try:
        with Image.open(image_path) as source:
            gray, rgb = prepare_images(source)
            gray_hits = scan_variant(gray, 0)
            # Most captioned images are detected here, so skip the second OCR pass.
            if strong_enough(gray_hits):
                hits = deduplicate(gray_hits)
            else:
                hits = deduplicate(gray_hits + scan_variant(rgb, 1))
    except Exception as exc:
        return {"remove": False, "error": f"{type(exc).__name__}: {exc}", "hits": []}

    remove = strong_enough(hits)
    return {
        "remove": remove,
        "mode": "strict-fast-any-visible-latin-or-digit",
        "hits": sorted(hits, key=lambda item: (-item["heightRatio"], -item["confidence"]))[:30],
        "reason": "visible-latin-or-digit-overlay" if remove else "none-detected",
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
        decision = analyse(ROOT / relative)
        removed += int(bool(decision.get("remove")))
        errors += int(bool(decision.get("error")))
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
                "mode": "strict-fast",
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
        f"STRICT-FAST category={args.category} range={args.start}:{args.end} "
        f"scanned={len(results)} removed={removed} errors={errors}"
    )


if __name__ == "__main__":
    main()
