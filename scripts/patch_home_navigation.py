from __future__ import annotations

import re
from pathlib import Path

ROOT = Path("qiqishoes-com")
VERSION = "202608030335"


def write_if_changed(path: Path, content: str) -> bool:
    old = path.read_text(encoding="utf-8")
    if old == content:
        return False
    path.write_text(content, encoding="utf-8")
    print(f"updated {path}")
    return True


def patch_portal_page(relative: str, home_href: str) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    if 'data-portal-home="1"' not in text:
        text, count = re.subn(
            r'(<nav class="portal-tabs"[^>]*>)',
            rf'\1<a class="portal-tab" data-portal-home="1" href="{home_href}">首页</a>',
            text,
            count=1,
        )
        if count != 1:
            raise RuntimeError(f"portal nav not found in {path}")
    text = re.sub(
        r'images-fix\.js\?v=[0-9]+',
        f'images-fix.js?v={VERSION}',
        text,
    )
    write_if_changed(path, text)


def patch_tennis_page() -> None:
    path = ROOT / "tennis-shoes/index.html"
    text = path.read_text(encoding="utf-8")
    if 'data-home-tab="1"' not in text:
        text, count = re.subn(
            r'(<nav class="sneaker-tabs"[^>]*>)',
            r'\1<a class="sneaker-tab" data-home-tab="1" href="../">首页</a>',
            text,
            count=1,
        )
        if count != 1:
            raise RuntimeError("sneaker nav not found")
    text = re.sub(
        r'tennis-shoes-cleanup\.js\?v=[0-9]+',
        f'tennis-shoes-cleanup.js?v={VERSION}',
        text,
    )
    write_if_changed(path, text)


def patch_order_guide() -> None:
    path = ROOT / "order-guide/index.html"
    text = path.read_text(encoding="utf-8")
    if 'data-portal-home="1"' not in text:
        text, count = re.subn(
            r'(<nav class="guide-tabs"[^>]*>)',
            r'\1<a class="guide-tab" data-portal-home="1" href="../">首页</a>',
            text,
            count=1,
        )
        if count != 1:
            raise RuntimeError("guide nav not found")
    text = text.replace(
        '.guide-tabs{display:grid;grid-template-columns:repeat(5,1fr)',
        '.guide-tabs{display:grid;grid-template-columns:repeat(6,1fr)',
    )
    text = text.replace(
        "portals:['网球鞋链接','时尚链接','附件链接','包包链接','鞋子链接']",
        "portals:['首页','网球鞋链接','时尚链接','附件链接','包包链接','鞋子链接']",
    )
    text = text.replace(
        "portals:['Tennis Shoes','Fashion','Accessories','Bags','Shoes']",
        "portals:['Home','Tennis Shoes','Fashion','Accessories','Bags','Shoes']",
    )
    text = text.replace(
        "portals:['Tenis','Moda','Accesorios','Bolsos','Zapatos']",
        "portals:['Inicio','Tenis','Moda','Accesorios','Bolsos','Zapatos']",
    )
    write_if_changed(path, text)


def patch_styles() -> None:
    path = ROOT / "assets/styles.css"
    text = path.read_text(encoding="utf-8")
    text = text.replace(
        '.portal-tabs{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}',
        '.portal-tabs{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}',
        1,
    )
    write_if_changed(path, text)


def main() -> None:
    patch_portal_page("index.html", "./")
    for page in ("fashion/index.html", "accessories/index.html", "bags/index.html", "shoes/index.html"):
        patch_portal_page(page, "../")
    patch_tennis_page()
    patch_order_guide()
    patch_styles()


if __name__ == "__main__":
    main()
