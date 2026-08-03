from pathlib import Path

INDEX = Path("qiqishoes-com/index.html")
OLD_DESKTOP = 'background:linear-gradient(90deg,rgba(0,0,0,.95) 0%,rgba(0,0,0,.72) 48%,rgba(0,0,0,.12) 100%),url("./assets/tennis-shoes/images/248246283.jpg") center right/cover no-repeat;'
NEW_DESKTOP = 'background:linear-gradient(90deg,rgba(0,0,0,.30) 0%,rgba(0,0,0,.12) 48%,rgba(0,0,0,0) 100%),url("./assets/home-hero-user.svg?v=202608032240") center/cover no-repeat;'
OLD_MOBILE = 'background:linear-gradient(90deg,rgba(0,0,0,.94),rgba(0,0,0,.55)),url("./assets/tennis-shoes/images/248246283.jpg") center/cover no-repeat'
NEW_MOBILE = 'background:linear-gradient(90deg,rgba(0,0,0,.30),rgba(0,0,0,.08)),url("./assets/home-hero-user.svg?v=202608032240") center/cover no-repeat'

text = INDEX.read_text(encoding="utf-8")
updated = text.replace(OLD_DESKTOP, NEW_DESKTOP).replace(OLD_MOBILE, NEW_MOBILE)
if updated == text:
    raise SystemExit("Homepage hero targets were not found or were already replaced")
INDEX.write_text(updated, encoding="utf-8")
print("Homepage hero banner references replaced")
