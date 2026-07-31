from __future__ import annotations

import re
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from PIL import Image

CATALOG_IDS = {
    "fashion": [
        "3", "1580", "11", "139496", "10", "394", "87630", "58658", "155306", "41628",
        "1595", "1602", "65045", "1618", "1619", "61968", "1616", "1615", "1614", "1611",
        "1610", "1609", "1607", "1606", "1605", "19629", "1604", "40865", "1603", "1600",
        "67580", "68696", "1593", "1592", "1591", "1590", "1589", "1587", "40773", "49906",
        "1586", "1585", "1584", "45005", "1583", "1582", "1581", "1612", "1608", "1601", "1599", "9879",
    ],
    "accessories": [
        "16511", "43569", "392", "391", "28251", "393", "383", "385", "384", "168165",
        "386", "263724", "380", "70206", "390",
    ],
    "bags": [
        "29314", "38931", "6279", "41554", "31206", "42002", "11064", "11053", "11082",
        "2412", "43139", "23237", "2408", "11074", "102526", "39326",
    ],
    "shoes": [
        "355", "65136", "336", "327", "347", "350", "234", "224", "229", "151", "104", "140",
        "52", "132", "367", "142649",
    ],
}

SOURCE_PAGES = {
    "fashion": ["https://qiqiygsheet.com/?department=fashion&lang=en", "https://qiqiyg.com/defaulten.html"],
    "accessories": ["https://qiqiygsheet.com/?department=accessories&lang=en", "https://acc.qiqiyg.com/defaulten.html"],
    "bags": ["https://qiqiygsheet.com/?department=bags&lang=en", "https://bags.qiqiyg.com/defaulten.html"],
    "shoes": ["https://qiqiygsheet.com/?department=shoes&lang=en", "https://shoes.qiqiyg.com/defaulten.html"],
}

EXTENSIONS = ("jpg", "png", "jpeg", "webp", "JPG", "PNG")
BASES = ("https://qiqiygsheet.com", "https://www.qiqiygsheet.com")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36",
    "Referer": "https://qiqiygsheet.com/",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
}


def valid_image_response(response: requests.Response) -> bool:
    content_type = response.headers.get("content-type", "").lower()
    return response.ok and len(response.content) > 500 and (
        "image" in content_type
        or response.content[:4] in {b"\x89PNG", b"\xff\xd8\xff\xe0", b"\xff\xd8\xff\xe1", b"RIFF"}
    )


def get_bytes(session: requests.Session, url: str, referer: str | None = None) -> bytes | None:
    headers = dict(HEADERS)
    if referer:
        headers["Referer"] = referer
    try:
        response = session.get(url, headers=headers, timeout=35, allow_redirects=True)
    except requests.RequestException:
        return None
    return response.content if valid_image_response(response) else None


def direct_catalog_image(session: requests.Session, department: str, category_id: str) -> bytes | None:
    for base in BASES:
        for ext in EXTENSIONS:
            url = f"{base}/catalog/{department}/{category_id}.{ext}"
            raw = get_bytes(session, url)
            if raw:
                print(f"downloaded {department}/{category_id} from {url}")
                return raw
    return None


def image_urls_near_link(link, page_url: str) -> list[str]:
    urls: list[str] = []
    nodes = [link]
    parent = link.parent
    for _ in range(5):
        if parent is None:
            break
        nodes.append(parent)
        parent = parent.parent
    for node in nodes:
        for image in node.find_all("img"):
            for attr in ("src", "data-src", "data-original", "data-lazy-src"):
                value = image.get(attr)
                if value:
                    urls.append(urljoin(page_url, value))
        style = node.get("style", "") if hasattr(node, "get") else ""
        match = re.search(r"background(?:-image)?\s*:\s*url\(['\"]?([^'\")]+)", style, re.I)
        if match:
            urls.append(urljoin(page_url, match.group(1)))
    for image in (link.find_previous("img"), link.find_next("img")):
        if image:
            value = image.get("src") or image.get("data-src") or image.get("data-original")
            if value:
                urls.append(urljoin(page_url, value))
    return list(dict.fromkeys(urls))


def build_page_thumbnail_map(session: requests.Session, department: str) -> dict[str, list[str]]:
    mapping: dict[str, list[str]] = {}
    for requested_url in SOURCE_PAGES[department]:
        try:
            response = session.get(requested_url, headers=HEADERS, timeout=45, allow_redirects=True)
        except requests.RequestException as exc:
            print(f"page fetch failed {requested_url}: {exc}")
            continue
        if not response.ok:
            continue
        page_url = response.url
        soup = BeautifulSoup(response.content, "html.parser")
        for link in soup.find_all("a", href=True):
            match = re.search(r"category(?:en)?_(\d+)\.html", link.get("href", ""), re.I)
            if not match:
                continue
            category_id = match.group(1)
            mapping.setdefault(category_id, []).extend(image_urls_near_link(link, page_url))
        if mapping:
            print(f"parsed {len(mapping)} thumbnail mappings from {page_url}")
    return {key: list(dict.fromkeys(value)) for key, value in mapping.items()}


def source_page_image(
    session: requests.Session,
    category_id: str,
    mapping: dict[str, list[str]],
) -> bytes | None:
    for url in mapping.get(category_id, []):
        raw = get_bytes(session, url, referer=url)
        if raw:
            print(f"downloaded {category_id} from source thumbnail {url}")
            return raw
    return None


def save_jpeg(raw: bytes, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(BytesIO(raw)) as image:
        image = image.convert("RGB")
        image.thumbnail((900, 900), Image.Resampling.LANCZOS)
        image.save(destination, format="JPEG", quality=90, optimize=True)


def main() -> None:
    root = Path("qiqishoes-com/assets/catalog")
    session = requests.Session()
    total = 0
    for department, ids in CATALOG_IDS.items():
        page_mapping = build_page_thumbnail_map(session, department)
        for category_id in ids:
            destination = root / department / f"{category_id}.jpg"
            raw = direct_catalog_image(session, department, category_id)
            if raw is None:
                raw = source_page_image(session, category_id, page_mapping)
            if raw is None:
                print(f"missing {department}/{category_id}")
                continue
            try:
                save_jpeg(raw, destination)
            except Exception as exc:  # noqa: BLE001
                print(f"invalid image {department}/{category_id}: {exc}")
                continue
            total += 1
    print(f"saved {total} catalog images")


if __name__ == "__main__":
    main()
