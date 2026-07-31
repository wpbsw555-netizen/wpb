from __future__ import annotations

from io import BytesIO
from pathlib import Path

import requests
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

EXTENSIONS = ("jpg", "png", "jpeg", "webp", "JPG", "PNG")
BASES = ("https://qiqiygsheet.com", "https://www.qiqiygsheet.com")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36",
    "Referer": "https://qiqiygsheet.com/",
    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
}


def download_image(session: requests.Session, department: str, category_id: str) -> bytes | None:
    for base in BASES:
        for ext in EXTENSIONS:
            url = f"{base}/catalog/{department}/{category_id}.{ext}"
            try:
                response = session.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
            except requests.RequestException:
                continue
            content_type = response.headers.get("content-type", "").lower()
            if response.ok and len(response.content) > 500 and ("image" in content_type or response.content[:4] in {b"\x89PNG", b"\xff\xd8\xff\xe0", b"\xff\xd8\xff\xe1"}):
                print(f"downloaded {department}/{category_id} from {url}")
                return response.content
    print(f"missing {department}/{category_id}")
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
        for category_id in ids:
            destination = root / department / f"{category_id}.jpg"
            raw = download_image(session, department, category_id)
            if raw is None:
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
