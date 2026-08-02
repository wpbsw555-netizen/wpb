from __future__ import annotations

import argparse
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from scan_text_overlay_chunk_strict import ROOT, analyse

CATEGORY_ROOT = ROOT / "categories"


def load_tasks(shard: int, shard_count: int) -> list[dict]:
    tasks: list[dict] = []
    global_index = 0
    for category_path in sorted(CATEGORY_ROOT.glob("*.json"), key=lambda p: p.stem):
        try:
            payload = json.loads(category_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        products = payload.get("products")
        if not isinstance(products, list):
            continue
        category_id = str((payload.get("category") or {}).get("id") or category_path.stem)
        for product in products:
            if global_index % shard_count == shard:
                product_id = str(product.get("id") or "")
                relative = str(product.get("image") or f"images/{product_id}.jpg")
                tasks.append(
                    {
                        "category": category_id,
                        "id": product_id,
                        "title": product.get("title") or "",
                        "image": relative,
                    }
                )
            global_index += 1
    return tasks


def scan_one(task: dict) -> dict:
    decision = analyse(ROOT / str(task["image"]))
    return {**task, **decision}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--shard", type=int, required=True)
    parser.add_argument("--shard-count", type=int, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    if args.shard < 0 or args.shard >= args.shard_count:
        raise SystemExit("invalid shard")

    tasks = load_tasks(args.shard, args.shard_count)
    workers = max(1, min(8, int(os.getenv("OCR_WORKERS", "4"))))
    results: list[dict] = []
    removed = 0
    errors = 0

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(scan_one, task): task for task in tasks}
        for completed, future in enumerate(as_completed(futures), start=1):
            task = futures[future]
            try:
                result = future.result()
            except Exception as exc:
                result = {
                    **task,
                    "remove": False,
                    "error": f"{type(exc).__name__}: {exc}",
                    "hits": [],
                }
            results.append(result)
            removed += int(bool(result.get("remove")))
            errors += int(bool(result.get("error")))
            if completed % 100 == 0:
                print(
                    f"shard={args.shard}/{args.shard_count} "
                    f"progress={completed}/{len(tasks)} removed={removed} errors={errors}",
                    flush=True,
                )

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps(
            {
                "shard": args.shard,
                "shardCount": args.shard_count,
                "mode": "strict-fast-sharded",
                "scanned": len(results),
                "removed": removed,
                "errors": errors,
                "results": results,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    print(
        f"SHARD COMPLETE {args.shard}/{args.shard_count}: "
        f"scanned={len(results)} removed={removed} errors={errors}"
    )


if __name__ == "__main__":
    main()
