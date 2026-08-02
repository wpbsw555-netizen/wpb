from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

CATEGORY_URL = "https://yunnan0594.x.yupoo.com/categories/3551885"
OUTPUT = Path("qiqishoes-com/assets/tennis-shoes/original-image-diagnostic.json")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}
ALBUM_RE = re.compile(r"/albums/(\d+)", re.I)
IMAGE_URL_RE = re.compile(r"https?:\\?/\\?/[^\"'<>\\s]+?\\.(?:jpe?g|png|webp)(?:\\?[^\"'<>\\s]*)?", re.I)


def absolute(base: str, value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip().replace("\\/", "/")
    if not value or value.startswith("data:"):
        return None
    if value.startswith("//"):
        return "https:" + value
    return urljoin(base, value)


def fetch(session: requests.Session, url: str) -> requests.Response:
    response = session.get(url, headers=HEADERS, timeout=60, allow_redirects=True)
    response.raise_for_status()
    return response


def collect_album_urls(soup: BeautifulSoup, base: str, limit: int = 3) -> list[str]:
    result: list[str] = []
    for anchor in soup.find_all("a", href=True):
        if not ALBUM_RE.search(anchor["href"]):
            continue
        url = absolute(base, anchor["href"])
        if url and url not in result:
            result.append(url)
        if len(result) >= limit:
            break
    return result


def inspect_album(session: requests.Session, url: str) -> dict:
    response = fetch(session, url)
    soup = BeautifulSoup(response.text, "html.parser")
    candidates: list[dict] = []
    seen: set[str] = set()

    def add(source: str, raw_url: str | None, extra: dict | None = None) -> None:
        image_url = absolute(response.url, raw_url)
        if not image_url or image_url in seen:
            return
        lower = image_url.lower()
        if not any(ext in lower for ext in (".jpg", ".jpeg", ".png", ".webp")):
            return
        seen.add(image_url)
        item = {"source": source, "url": image_url}
        if extra:
            item.update(extra)
        candidates.append(item)

    for selector, attr in (
        ('meta[property="og:image"]', "content"),
        ('meta[name="twitter:image"]', "content"),
        ('meta[itemprop="image"]', "content"),
    ):
        for node in soup.select(selector):
            add(f"meta:{selector}", node.get(attr))

    image_attrs = (
        "data-origin-src",
        "data-origin",
        "data-original",
        "data-src",
        "data-lazy-src",
        "data-big-src",
        "data-photo-url",
        "src",
    )
    for index, image in enumerate(soup.find_all("img")):
        extra = {
            "tagIndex": index,
            "width": image.get("width"),
            "height": image.get("height"),
            "class": " ".join(image.get("class", [])),
        }
        for attr in image_attrs:
            add(f"img:{attr}", image.get(attr), extra)
        srcset = image.get("srcset") or image.get("data-srcset")
        if srcset:
            for part in srcset.split(","):
                add("img:srcset", part.strip().split(" ")[0], extra)

    for index, anchor in enumerate(soup.find_all("a", href=True)):
        add("a:href", anchor.get("href"), {"tagIndex": index})

    raw = response.text.replace("\\/", "/")
    for match in IMAGE_URL_RE.findall(raw):
        add("html-regex", match)

    # Probe dimensions/content type for the first distinct candidates.
    probed: list[dict] = []
    for item in candidates[:30]:
        enriched = dict(item)
        try:
            image_response = session.get(
                item["url"],
                headers={**HEADERS, "Referer": response.url},
                timeout=30,
                stream=True,
                allow_redirects=True,
            )
            enriched["status"] = image_response.status_code
            enriched["contentType"] = image_response.headers.get("content-type")
            enriched["contentLength"] = image_response.headers.get("content-length")
            enriched["finalUrl"] = image_response.url
            image_response.close()
        except Exception as exc:
            enriched["probeError"] = f"{type(exc).__name__}: {exc}"
        probed.append(enriched)

    return {
        "albumUrl": url,
        "finalUrl": response.url,
        "title": soup.title.get_text(" ", strip=True) if soup.title else "",
        "candidateCount": len(candidates),
        "candidates": probed,
        "htmlSignals": {
            "hasDataOriginSrc": "data-origin-src" in response.text,
            "hasPhotoYupoo": "photo.yupoo.com" in response.text,
            "hasShowalbum": "showalbum" in response.text.lower(),
        },
    }


def main() -> None:
    session = requests.Session()
    category_response = fetch(session, CATEGORY_URL)
    category_soup = BeautifulSoup(category_response.text, "html.parser")
    albums = collect_album_urls(category_soup, category_response.url, limit=3)
    result = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "categoryUrl": CATEGORY_URL,
        "albumCountInspected": len(albums),
        "albums": [],
    }
    for album in albums:
        try:
            result["albums"].append(inspect_album(session, album))
        except Exception as exc:
            result["albums"].append({"albumUrl": album, "error": f"{type(exc).__name__}: {exc}"})
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
