from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import apply_text_overlay_results as base

ROOT = Path("qiqishoes-com/assets/tennis-shoes")
REPORT_FILE = ROOT / "text-overlay-cleanup-report.json"
QUARANTINE_FILE = ROOT / "text-overlay-removed-products.json"
STATUS_FILE = ROOT / "text-overlay-cleanup-status.json"


def read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    base.main()

    quarantine = read_json(QUARANTINE_FILE, {})
    deleted_files = 0
    missing_files = 0
    for product in quarantine.get("products") or []:
        relative = str(product.get("image") or "").strip()
        if not relative:
            continue
        path = ROOT / relative
        if path.exists() and path.is_file():
            try:
                path.unlink()
                deleted_files += 1
            except OSError:
                pass
        else:
            missing_files += 1

    report = read_json(REPORT_FILE, {})
    report["mode"] = "strict-any-visible-latin-or-digit"
    report["deletedImageFiles"] = deleted_files
    report["missingImageFiles"] = missing_files
    report["completedAt"] = datetime.now(timezone.utc).isoformat()
    write_json(REPORT_FILE, report)

    write_json(
        STATUS_FILE,
        {
            "status": "completed",
            "completedAt": report["completedAt"],
            "scope": "all sneaker categories only",
            "mode": report["mode"],
            "scanned": int(report.get("scanned") or 0),
            "removed": int(report.get("removed") or 0),
            "categoriesChanged": int(report.get("categoriesChanged") or 0),
            "deletedImageFiles": deleted_files,
        },
    )
    print(
        f"Strict cleanup applied: scanned={report.get('scanned', 0)}, "
        f"removed={report.get('removed', 0)}, deletedImageFiles={deleted_files}"
    )


if __name__ == "__main__":
    main()
