from __future__ import annotations

import json
import os
from pathlib import Path

CATEGORY_ROOT = Path("qiqishoes-com/assets/tennis-shoes/categories")
CHUNK_SIZE = max(50, int(os.getenv("OCR_CHUNK_SIZE", "180")))


def main() -> None:
    include: list[dict[str, int | str]] = []
    product_total = 0

    for path in sorted(CATEGORY_ROOT.glob("*.json"), key=lambda item: item.stem):
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        products = payload.get("products")
        if not isinstance(products, list) or not products:
            continue
        category_id = str((payload.get("category") or {}).get("id") or path.stem)
        product_total += len(products)
        for start in range(0, len(products), CHUNK_SIZE):
            include.append(
                {
                    "category": category_id,
                    "start": start,
                    "end": min(start + CHUNK_SIZE, len(products)),
                }
            )

    matrix = {"include": include}
    compact = json.dumps(matrix, separators=(",", ":"))
    output = os.getenv("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(f"matrix={compact}\n")
            handle.write(f"batch_count={len(include)}\n")
            handle.write(f"product_total={product_total}\n")
    print(f"Prepared {len(include)} OCR batches for {product_total} products")


if __name__ == "__main__":
    main()
