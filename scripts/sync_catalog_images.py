from __future__ import annotations

import json
import re
import shutil
from collections import OrderedDict
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

ROOT = Path("qiqishoes-com/assets/catalog")
DATA_FILE = ROOT / "catalog-data.json"
REPORT_FILE = ROOT / "sync-report.txt"

SOURCES = {
    "fashion": {
        "en": "https://www.tangma2088.com/defaulten.html",
        "zh": "https://www.tangma2088.com/default.html",
        "brand_cn": "服饰",
        "brand_en": "FASHION",
        "title_zh": "服饰目录",
        "title_en": "Fashion Catalog",
        "category_count": 12,
        "allowed_hosts": {"tangma2088.com", "www.tangma2088.com", "qiqiyg.com", "www.qiqiyg.com"},
    },
    "accessories": {
        "en": "https://acc.tangma2088.com/defaulten.html",
        "zh": "https://acc.tangma2088.com/default.html",
        "brand_cn": "附件",
        "brand_en": "ACCESSORIES",
        "title_zh": "附件目录",
        "title_en": "Accessories Catalog",
        "category_count": 9999,
        "allowed_hosts": {"acc.tangma2088.com", "acc.qiqiyg.com"},
    },
    "bags": {
        "en": "https://bags.tangma2088.com/defaulten.html",
        "zh": "https://bags.tangma2088.com/default.html",
        "brand_cn": "包包",
        "brand_en": "BAGS",
        "title_zh": "包包目录",
        "title_en": "Bags Catalog",
        "category_count": 2,
        "allowed_hosts": {"bags.tangma2088.com", "bags.qiqiyg.com"},
    },
    "shoes": {
        "en": "https://shoes.tangma2088.com/defaulten.html",
        "zh": "https://shoes.tangma2088.com/default.html",
        "brand_cn": "鞋子",
        "brand_en": "SHOES",
        "title_zh": "鞋子目录",
        "title_en": "Shoes Catalog",
        "category_count": 4,
        "allowed_hosts": {"shoes.tangma2088.com", "shoes.qiqiyg.com"},
    },
}

CATEGORY_RE = re.compile(r"category(?:en)?_(\d+)\.html", re.I)
COUNT_RE = re.compile(r"\(([\d,]+)\)")
SKIP_NAMES = {
    "fashion", "fashion link", "accessory", "accessory link", "acces", "bags", "bags link",
    "shoes", "shoes link", "more fashion", "glasses", "belt", "jewerly", "jewelry",
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
}


def fetch_soup(session: requests.Session, url: str) -> BeautifulSoup:
    response = session.get(url, headers=HEADERS, timeout=45)
    response.raise_for_status()
    response.encoding = response.apparent_encoding or response.encoding
    return BeautifulSoup(response.text, "html.parser")


def nearest_container(anchor):
    node = anchor
    for _ in range(6):
        node = node.parent
        if node is None:
            break
        text = node.get_text(" ", strip=True)
        if COUNT_RE.search(text):
            return node
    return anchor.parent


def find_count(anchor) -> str | None:
    container = nearest_container(anchor)
    if container is not None:
        match = COUNT_RE.search(container.get_text(" ", strip=True))
        if match:
            return match.group(1).replace(",", "")
    for sibling in anchor.next_siblings:
        text = sibling.get_text(" ", strip=True) if hasattr(sibling, "get_text") else str(sibling)
        match = COUNT_RE.search(text)
        if match:
            return match.group(1).replace(",", "")
        if len(text) > 120:
            break
    return None


def find_image(anchor, base_url: str) -> str | None:
    container = nearest_container(anchor)
    candidates = []
    if container is not None:
        candidates.extend(container.find_all("img"))
    candidates.extend(anchor.find_all("img"))
    for image in candidates:
        src = image.get("data-original") or image.get("data-src") or image.get("src")
        if src and not src.lower().startswith("data:"):
            return urljoin(base_url, src)
    return None


def extract_records(soup: BeautifulSoup, base_url: str, allowed_hosts: set[str]) -> list[dict]:
    records: OrderedDict[str, dict] = OrderedDict()
    for anchor in soup.find_all("a", href=True):
        match = CATEGORY_RE.search(anchor.get("href", ""))
        if not match:
            continue
        category_id = match.group(1)
        name = " ".join(anchor.get_text(" ", strip=True).split())
        if not name or name.lower() in SKIP_NAMES:
            continue
        landing = urljoin(base_url, anchor["href"])
        if urlparse(landing).hostname not in allowed_hosts:
            continue
        count = find_count(anchor)
        if count is None:
            continue
        image_url = find_image(anchor, base_url)
        candidate = {
            "id": category_id,
            "name": name,
            "count": count,
            "landing": landing,
            "source_image": image_url,
        }
        current = records.get(category_id)
        if current is None or (not current.get("source_image") and image_url):
            records[category_id] = candidate
    return list(records.values())


def parse_names_by_id(soup: BeautifulSoup, base_url: str, allowed_hosts: set[str]) -> dict[str, str]:
    return {record["id"]: record["name"] for record in extract_records(soup, base_url, allowed_hosts)}


def image_is_valid(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 500:
        return False
    try:
        with Image.open(path) as image:
            image.verify()
        return True
    except Exception:
        return False


def fetch_image(session: requests.Session, urls: list[str]) -> bytes | None:
    for url in urls:
        if not url:
            continue
        try:
            response = session.get(url, headers={**HEADERS, "Referer": url}, timeout=45, allow_redirects=True)
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


def direct_image_candidates(department: str, category_id: str) -> list[str]:
    extensions = ("jpg", "png", "jpeg", "webp", "JPG", "PNG")
    bases = ("https://qiqiygsheet.com", "https://www.qiqiygsheet.com")
    return [f"{base}/catalog/{department}/{category_id}.{ext}" for base in bases for ext in extensions]


def save_jpeg(raw: bytes, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(BytesIO(raw)) as image:
        image = image.convert("RGB")
        image.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
        image.save(destination, format="JPEG", quality=90, optimize=True)


def sync_department(session: requests.Session, department: str, config: dict, report: list[str]) -> dict:
    en_soup = fetch_soup(session, config["en"])
    try:
        zh_soup = fetch_soup(session, config["zh"])
        zh_names = parse_names_by_id(zh_soup, config["zh"], config["allowed_hosts"])
    except Exception as exc:
        report.append(f"{department}: Chinese page unavailable: {exc}")
        zh_names = {}

    records = extract_records(en_soup, config["en"], config["allowed_hosts"])
    report.append(f"{department}: parsed {len(records)} complete catalog entries")
    output_items = []

    for index, record in enumerate(records):
        category_id = record["id"]
        destination = ROOT / department / f"{category_id}.jpg"
        if not image_is_valid(destination):
            urls = [record.get("source_image"), *direct_image_candidates(department, category_id)]
            raw = fetch_image(session, [url for url in urls if url])
            if raw is not None:
                try:
                    save_jpeg(raw, destination)
                    report.append(f"{department}/{category_id}: image saved")
                except Exception as exc:
                    report.append(f"{department}/{category_id}: invalid image: {exc}")
            else:
                report.append(f"{department}/{category_id}: image missing")

        group = "category" if index < config["category_count"] else "brand"
        output_items.append({
            "id": category_id,
            "zh": zh_names.get(category_id, record["name"]),
            "en": record["name"],
            "es": record["name"],
            "count": record["count"],
            "group": group,
            "landing": record["landing"],
            "image": f"assets/catalog/{department}/{category_id}.jpg",
        })

    if department == "accessories":
        damaged = ROOT / department / "70206.jpg"
        fallback = ROOT / department / "380.jpg"
        if not image_is_valid(damaged) and image_is_valid(fallback):
            shutil.copyfile(fallback, damaged)
            report.append("accessories/70206: used original Sock 0725 thumbnail as fallback")

    return {
        "brandCn": config["brand_cn"],
        "brandEn": config["brand_en"],
        "title": {"zh": config["title_zh"], "en": config["title_en"], "es": config["title_en"]},
        "source": config["en"],
        "items": output_items,
    }


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    report: list[str] = []
    departments = {}
    for department, config in SOURCES.items():
        try:
            departments[department] = sync_department(session, department, config, report)
        except Exception as exc:
            report.append(f"{department}: fatal error: {exc}")
            raise

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "departments": departments,
    }
    DATA_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    REPORT_FILE.write_text("\n".join(report) + "\n", encoding="utf-8")
    print("\n".join(report))
    print(f"wrote {DATA_FILE}")


if __name__ == "__main__":
    main()
