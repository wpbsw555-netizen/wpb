from __future__ import annotations

import json
import re
from collections import OrderedDict
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

SOURCE = "https://yunnan0594.x.yupoo.com/categories/3551883"
SITE_ROOT = Path("qiqishoes-com")
ASSET_ROOT = SITE_ROOT / "assets" / "tennis-shoes"
IMAGE_ROOT = ASSET_ROOT / "images"
DATA_FILE = ASSET_ROOT / "catalog.json"
REPORT_FILE = ASSET_ROOT / "sync-report.txt"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}
ALBUM_RE = re.compile(r"/albums/(\d+)", re.I)
CATEGORY_RE = re.compile(r"/categories/(\d+)", re.I)
CSS_URL_RE = re.compile(r"url\((['\"]?)(.*?)\1\)", re.I)


def with_page(url: str, page: int) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["page"] = str(page)
    return urlunparse(parsed._replace(query=urlencode(query)))


def absolute(base: str, value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    if not value or value.startswith("data:"):
        return None
    if value.startswith("//"):
        return "https:" + value
    return urljoin(base, value)


def fetch_soup(session: requests.Session, url: str) -> BeautifulSoup:
    response = session.get(url, headers=HEADERS, timeout=60)
    response.raise_for_status()
    response.encoding = response.apparent_encoding or response.encoding
    return BeautifulSoup(response.text, "html.parser")


def node_images(node, base_url: str) -> list[str]:
    urls: list[str] = []
    if node is None:
        return urls
    for image in node.find_all("img"):
        for key in ("data-origin-src", "data-src", "data-lazy-src", "data-original", "src"):
            url = absolute(base_url, image.get(key))
            if url and url not in urls:
                urls.append(url)
    for styled in node.find_all(style=True):
        match = CSS_URL_RE.search(styled.get("style", ""))
        if match:
            url = absolute(base_url, match.group(2))
            if url and url not in urls:
                urls.append(url)
    return urls


def album_container(anchor):
    node = anchor
    for _ in range(7):
        node = node.parent
        if node is None:
            break
        classes = " ".join(node.get("class", []))
        if re.search(r"album|gallery|showalbum|image", classes, re.I):
            return node
        if len(node.find_all("a", href=ALBUM_RE)) <= 3 and node.find("img"):
            return node
    return anchor.parent


def clean_title(value: str) -> str:
    value = " ".join(value.split())
    value = re.sub(r"^\d+\s+", "", value)
    return value.strip(" -|\n\t")


def title_candidates(anchor, container) -> list[str]:
    values: list[str] = []
    for value in (anchor.get("title"), anchor.get("aria-label"), anchor.get_text(" ", strip=True)):
        if value:
            values.append(clean_title(value))
    if container is not None:
        for selector in (
            ".showalbumheader__gallerytitle",
            ".album__title",
            ".album-title",
            ".title",
            "h3",
            "h4",
        ):
            for node in container.select(selector):
                values.append(clean_title(node.get_text(" ", strip=True)))
        for link in container.find_all("a", href=True):
            if ALBUM_RE.search(link.get("href", "")):
                values.append(clean_title(link.get_text(" ", strip=True)))
        text = clean_title(container.get_text(" ", strip=True))
        if text:
            values.append(text)
    good = []
    for value in values:
        if not value or value.isdigit() or len(value) < 4:
            continue
        if value.lower() in {"details", "album", "image"}:
            continue
        if value not in good:
            good.append(value)
    return good


def parse_categories(soup: BeautifulSoup, base_url: str) -> list[dict]:
    categories: OrderedDict[str, dict] = OrderedDict()
    for anchor in soup.find_all("a", href=True):
        match = CATEGORY_RE.search(anchor.get("href", ""))
        if not match:
            continue
        category_id = match.group(1)
        name = clean_title(anchor.get_text(" ", strip=True))
        if not name or len(name) < 2:
            continue
        categories.setdefault(
            category_id,
            {
                "id": category_id,
                "name": name,
                "source": absolute(base_url, anchor["href"]),
                "imported": category_id == "3551883",
            },
        )
    return list(categories.values())


def parse_albums(soup: BeautifulSoup, page_url: str) -> list[dict]:
    records: OrderedDict[str, dict] = OrderedDict()
    for anchor in soup.find_all("a", href=True):
        match = ALBUM_RE.search(anchor.get("href", ""))
        if not match:
            continue
        album_id = match.group(1)
        source = absolute(page_url, anchor["href"])
        container = album_container(anchor)
        images = node_images(anchor, page_url)
        if not images:
            images = node_images(container, page_url)
        titles = title_candidates(anchor, container)
        candidate = {
            "id": album_id,
            "title": max(titles, key=len) if titles else f"Product {album_id}",
            "source": source,
            "cover_source": images[0] if images else None,
        }
        current = records.get(album_id)
        if current is None:
            records[album_id] = candidate
        else:
            if current["title"].startswith("Product ") and not candidate["title"].startswith("Product "):
                current["title"] = candidate["title"]
            if not current.get("cover_source") and candidate.get("cover_source"):
                current["cover_source"] = candidate["cover_source"]
    return list(records.values())


def album_fallback_cover(session: requests.Session, source: str) -> str | None:
    try:
        soup = fetch_soup(session, source)
    except Exception:
        return None
    for selector, attr in (
        ('meta[property="og:image"]', "content"),
        ('meta[name="twitter:image"]', "content"),
    ):
        node = soup.select_one(selector)
        if node:
            url = absolute(source, node.get(attr))
            if url:
                return url
    images = node_images(soup, source)
    for url in images:
        lower = url.lower()
        if any(token in lower for token in ("logo", "avatar", "qrcode", "icon")):
            continue
        return url
    return None


def fetch_image(session: requests.Session, urls: list[str], referer: str) -> bytes | None:
    for url in urls:
        if not url:
            continue
        try:
            response = session.get(
                url,
                headers={**HEADERS, "Referer": referer},
                timeout=60,
                allow_redirects=True,
            )
        except requests.RequestException:
            continue
        if not response.ok or len(response.content) < 500:
            continue
        try:
            with Image.open(BytesIO(response.content)) as image:
                image.verify()
            return response.content
        except Exception:
            continue
    return None


def save_jpeg(raw: bytes, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(BytesIO(raw)) as image:
        image.load()
        image = image.convert("RGB")
        image.thumbnail((900, 900), Image.Resampling.LANCZOS)
        image.save(destination, "JPEG", quality=88, optimize=True)


def patch_navigation_links(report: list[str]) -> None:
    replacements = {
        SITE_ROOT / "index.html": "./tennis-shoes/",
        SITE_ROOT / "fashion" / "index.html": "../tennis-shoes/",
        SITE_ROOT / "accessories" / "index.html": "../tennis-shoes/",
        SITE_ROOT / "bags" / "index.html": "../tennis-shoes/",
        SITE_ROOT / "shoes" / "index.html": "../tennis-shoes/",
        SITE_ROOT / "order-guide" / "index.html": "../tennis-shoes/",
    }
    old = SOURCE
    for path, new in replacements.items():
        if not path.exists():
            report.append(f"navigation: missing {path}")
            continue
        text = path.read_text(encoding="utf-8")
        updated = text.replace(old, new)
        if updated != text:
            path.write_text(updated, encoding="utf-8")
            report.append(f"navigation: patched {path}")


def main() -> None:
    ASSET_ROOT.mkdir(parents=True, exist_ok=True)
    IMAGE_ROOT.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    report: list[str] = []

    first_soup = fetch_soup(session, SOURCE)
    categories = parse_categories(first_soup, SOURCE)
    products: OrderedDict[str, dict] = OrderedDict()

    for page in range(1, 11):
        page_url = SOURCE if page == 1 else with_page(SOURCE, page)
        soup = first_soup if page == 1 else fetch_soup(session, page_url)
        found = parse_albums(soup, page_url)
        new_count = 0
        for record in found:
            if record["id"] not in products:
                products[record["id"]] = record
                new_count += 1
            else:
                current = products[record["id"]]
                if not current.get("cover_source") and record.get("cover_source"):
                    current["cover_source"] = record["cover_source"]
                if current["title"].startswith("Product ") and not record["title"].startswith("Product "):
                    current["title"] = record["title"]
        report.append(f"page {page}: parsed={len(found)}, new={new_count}, total={len(products)}")
        if page > 1 and new_count == 0:
            break
        if len(products) >= 258:
            break

    output_products = []
    for index, record in enumerate(products.values(), start=1):
        destination = IMAGE_ROOT / f"{record['id']}.jpg"
        cover = record.get("cover_source")
        urls = [cover] if cover else []
        if not cover and record.get("source"):
            fallback = album_fallback_cover(session, record["source"])
            if fallback:
                urls.append(fallback)
        raw = fetch_image(session, urls, record.get("source") or SOURCE)
        if raw is not None:
            try:
                save_jpeg(raw, destination)
                report.append(f"image {index}/{len(products)}: saved {record['id']}")
            except Exception as exc:
                report.append(f"image {record['id']}: invalid {exc}")
        elif not destination.exists():
            report.append(f"image {record['id']}: missing")

        output_products.append(
            {
                "id": record["id"],
                "title": record["title"],
                "image": f"images/{record['id']}.jpg",
                "source": record["source"],
            }
        )

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceCategory": "3551883",
        "title": {
            "zh": "AIR JORDAN 3 乔丹3代",
            "en": "AIR JORDAN 3",
            "es": "AIR JORDAN 3",
        },
        "total": len(output_products),
        "categories": categories,
        "products": output_products,
    }
    DATA_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    patch_navigation_links(report)
    REPORT_FILE.write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))
    print(f"wrote {DATA_FILE} with {len(output_products)} products")


if __name__ == "__main__":
    main()
