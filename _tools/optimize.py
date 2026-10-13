# Оригиналы из ChatGPT лежат в assets/img/source/.
# На сайт идут адаптивные WebP (640/1000/1400 px) и один JPG-запасной вариант.
import sys
from pathlib import Path
from PIL import Image

root = Path(sys.argv[1])
src, out = root / "assets/img/source", root / "assets/img"
crops = {  # пустые поля по краям на сайте не нужны
    "gen-system-3d": (0.37, 0, 1, 1),
    "gen-journey": (0, 0.04, 0.97, 0.96),
}
WIDTHS = (640, 1000, 1400)
for p in sorted(src.glob("gen-*.png")):
    if p.stem == "gen-og":
        continue
    im = Image.open(p).convert("RGB")
    if p.stem in crops:
        l, t, r, b = crops[p.stem]
        w, h = im.size
        im = im.crop((int(l * w), int(t * h), int(r * w), int(b * h)))
    for w in WIDTHS:
        if w > im.width and w != WIDTHS[0]:
            continue
        v = im.copy()
        v.thumbnail((w, 10_000))
        dst = out / f"{p.stem}-{w}.webp"
        v.save(dst, "WEBP", quality=78, method=6)
        print(dst.name, v.size, dst.stat().st_size // 1024, "KB")
    v = im.copy()
    v.thumbnail((1000, 10_000))
    dst = out / f"{p.stem}.jpg"
    v.save(dst, quality=80, optimize=True, progressive=True)
    print(dst.name, v.size, dst.stat().st_size // 1024, "KB")
