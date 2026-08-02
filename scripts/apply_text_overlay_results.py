from __future__ import annotations

import json
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path("qiqishoes-com/assets/tennis-shoes")
CATEGORY_ROOT = ROOT / "categories"
MANIFEST_FILE = ROOT / "catalog.json"
RESULT_ROOT = Path("scan-results")
REPORT_FILE = ROOT / "text-overlay-cleanup-report.json"
QUARANTINE_FILE = ROOT / "text-overlay-removed-products.json"


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    removal_ids: dict[str, set[str]] = defaultdict(set)
    decisions: list[dict] = []
    scanned = 0
    scan_errors = 0

    for path in sorted(RESULT_ROOT.rglob("*.json")):
        payload = read_json(path, {})
        scanned += int(payload.get("scanned") or 0)
        scan_errors += int(payload.get("errors") or 0)
        for result in payload.get("results") or []:
            if not result.get("remove"):
                continue
            category = str(result.get("category") or "")
            product_id = str(result.get("id") or "")
            if not category or not product_id:
                continue
            removal_ids[category].add(product_id)
            decisions.append(result)

    existing_quarantine = read_json(QUARANTINE_FILE, {})
    previous = existing_quarantine.get("products") if isinstance(existing_quarantine, dict) else []
    by_key = {
        (str(item.get("category") or ""), str(item.get("id") or "")): item
        for item in (previous or [])
        if isinstance(item, dict)
    }

    category_stats: list[dict] = []
    removed_total = 0
    for category_id, ids in sorted(removal_ids.items()):
        path = CATEGORY_ROOT / f"{category_id}.json"
        payload = read_json(path, {})
        products = payload.get("products")
        if not isinstance(products, list):
            continue
        kept: list[dict] = []
        removed: list[dict] = []
        for product in products:
            product_id = str(product.get("id") or "")
            if product_id in ids:
                removed.append(product)
            else:
                kept.append(product)
        if not removed:
            continue
        payload["products"] = kept
        payload["total"] = len(kept)
        payload["textOverlayCleanedAt"] = datetime.now(timezone.utc).isoformat()
        write_json(path, payload)
        removed_total += len(removed)
        category_stats.append(
            {
                "category": category_id,
                "before": len(products),
                "removed": len(removed),
                "after": len(kept),
            }
        )
        decision_by_id = {
            str(item.get("id") or ""): item
            for item in decisions
            if str(item.get("category") or "") == category_id
        }
        for product in removed:
            product_id = str(product.get("id") or "")
            key = (category_id, product_id)
            by_key[key] = {
                "category": category_id,
                **product,
                "ocr": decision_by_id.get(product_id, {}),
                "removedAt": datetime.now(timezone.utc).isoformat(),
            }

    manifest = read_json(MANIFEST_FILE, {})
    categories = manifest.get("categories") if isinstance(manifest, dict) else []
    if isinstance(categories, list):
        filtered: list[dict] = []
        for category in categories:
            category_id = str(category.get("id") or "")
            data_path = CATEGORY_ROOT / f"{category_id}.json"
            data = read_json(data_path, {})
            products = data.get("products") if isinstance(data, dict) else None
            if isinstance(products, list):
                category["count"] = len(products)
                category["cover"] = products[0].get("image") if products else None
                category["imported"] = bool(products)
            if int(category.get("count") or 0) > 0 and category.get("cover"):
                filtered.append(category)
        manifest["categories"] = filtered
        manifest["categoryCount"] = len(filtered)
        manifest["importedCategoryCount"] = sum(1 for item in filtered if item.get("imported"))
        manifest["totalProducts"] = sum(int(item.get("count") or 0) for item in filtered)
        manifest["textOverlayCleanedAt"] = datetime.now(timezone.utc).isoformat()
        write_json(MANIFEST_FILE, manifest)

    write_json(
        QUARANTINE_FILE,
        {
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "count": len(by_key),
            "products": list(by_key.values()),
        },
    )
    write_json(
        REPORT_FILE,
        {
            "completedAt": datetime.now(timezone.utc).isoformat(),
            "scanned": scanned,
            "scanErrors": scan_errors,
            "removed": removed_total,
            "categoriesChanged": len(category_stats),
            "categoryStats": category_stats,
        },
    )
    print(
        f"OCR cleanup complete: scanned={scanned}, removed={removed_total}, "
        f"categoriesChanged={len(category_stats)}, errors={scan_errors}"
    )


if __name__ == "__main__":
    main()
