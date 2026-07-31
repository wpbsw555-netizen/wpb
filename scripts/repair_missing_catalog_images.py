from __future__ import annotations

import json
import re
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path("qiqishoes-com/assets/catalog")
DATA_FILE = ROOT / "catalog-data.json"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}
CSS_URL_RE = re.compile(r"url\(['\"]?([^)'\"]+)", re.I)
BAD_WORDS = {
    "logo", "icon", "loading", "noimage", "no-image", "placeholder", "banner", "flag",
    "whatsapp", "wechat", "qrcode", "qr-code", "contact", "language", "favicon",
}


def valid_local(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 500:
        return False
    try:
        with Image.open(path) as image:
            image.verify()
        return True
    except Exception:
        return False


def image_url(tag, base: str) -> str | None:
    for key in ("data-original", "data-src", "data-lazy-src", "data-url", "src"):
        value = tag.get(key)
        if value and not str(value).lower().startswith("data:"):
            return urljoin(base, str(value).strip())
    srcset = tag.get("srcset") or tag.get("data-srcset")
    if srcset:
        value = str(srcset).split(",")[0].strip().split()[0]
        if value and not value.lower().startswith("data:"):
            return urljoin(base, value)
    match = CSS_URL_RE.search(tag.get("style") or "")
    return urljoin(base, match.group(1)) if match else None


def candidate_urls(session: requests.Session, landing: str) -> list[str]:
    response = session.get(landing, headers=HEADERS, timeout=45)
    response.raise_for_status()
    response.encoding = response.apparent_encoding or response.encoding
    soup = BeautifulSoup(response.text, "html.parser")
    scored: list[tuple[int, str]] = []
    seen: set[str] = set()
    for tag in soup.find_all("img"):
        url = image_url(tag, landing)
        if not url or url in seen:
            continue
        seen.add(url)
        haystack = " ".join([
            url.lower(), str(tag.get("alt") or "").lower(), str(tag.get("title") or "").lower(),
            str(tag.get("class") or "").lower(), str(tag.get("id") or "").lower(),
        ])
        if any(word in haystack for word in BAD_WORDS):
            continue
        score = 0
        if "upfile" in haystack:
            score += 8
        if any(word in haystack for word in ("product", "goods", "photo", "pic")):
            score += 4
        try:
            width = int(re.sub(r"\D", "", str(tag.get("width") or "0")) or 0)
            height = int(re.sub(r"\D", "", str(tag.get("height") or "0")) or 0)
        except ValueError:
            width = height = 0
        if width >= 150 or height >= 150:
            score += 4
        if tag.find_parent("a"):
            score += 1
        scored.append((score, url))
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [url for _, url in scored]


def download_valid(session: requests.Session, urls: list[str], referer: str) -> bytes | None:
    for url in urls[:40]:
        try:
            response = session.get(
                url,
                headers={**HEADERS, "Referer": referer},
                timeout=45,
                allow_redirects=True,
            )
        except requests.RequestException:
            continue
        if not response.ok or len(response.content) < 1000:
            continue
        try:
            with Image.open(BytesIO(response.content)) as image:
                image.load()
                width, height = image.size
                if width < 100 or height < 70 or width * height < 20000:
                    continue
            return response.content
        except Exception:
            continue
    return None


def save_jpeg(raw: bytes, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(BytesIO(raw)) as image:
        image.load()
        image = image.convert("RGB")
        image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
        image.save(path, "JPEG", quality=90, optimize=True)


def main() -> None:
    payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    session = requests.Session()
    repaired = 0
    missing = 0
    for department, catalog in payload["departments"].items():
        for item in catalog["items"]:
            path = Path("qiqishoes-com") / item["image"]
            if valid_local(path):
                continue
            try:
                urls = candidate_urls(session, item["landing"])
            except Exception as exc:  # noqa: BLE001
                print(f"{department}/{item['id']}: landing fetch failed: {exc}")
                missing += 1
                continue
            raw = download_valid(session, urls, item["landing"])
            if raw is None:
                print(f"{department}/{item['id']}: no product-image fallback")
                missing += 1
                continue
            try:
                save_jpeg(raw, path)
            except Exception as exc:  # noqa: BLE001
                print(f"{department}/{item['id']}: fallback invalid: {exc}")
                missing += 1
                continue
            print(f"{department}/{item['id']}: repaired from landing page")
            repaired += 1
    print(f"repair complete: repaired={repaired}, still_missing={missing}")


if __name__ == "__main__":
    main()
