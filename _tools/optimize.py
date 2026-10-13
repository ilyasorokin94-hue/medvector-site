# Оригиналы из ChatGPT лежат в assets/img/source/, на сайт идут сжатые JPG в assets/img/
import sys
from pathlib import Path
from PIL import Image

root = Path(sys.argv[1])
src, out = root / "assets/img/source", root / "assets/img"
crops = {"gen-system-3d": (0.37, 0, 1, 1)}  # слева у картинки пустое поле, на сайте оно не нужно
for p in sorted(src.glob("gen-*.png")):
    im = Image.open(p).convert("RGB")
    if p.stem in crops:
        l, t, r, b = crops[p.stem]
        w, h = im.size
        im = im.crop((int(l * w), int(t * h), int(r * w), int(b * h)))
    im.thumbnail((1400, 1400))
    dst = out / f"{p.stem}.jpg"
    im.save(dst, quality=84, optimize=True, progressive=True)
    print(dst.name, im.size, dst.stat().st_size // 1024, "KB")
