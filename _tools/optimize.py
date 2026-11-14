# Оригиналы из ChatGPT лежат в assets/img/source/.
# На сайт идут адаптивные WebP (640/1000/1400 px) и один JPG-запасной вариант.
import sys
from pathlib import Path
from PIL import Image, ImageStat

root = Path(sys.argv[1])
only = set(sys.argv[2:])  # можно назвать картинки, чтобы не пересобирать остальные: optimize.py .. gen-direct gen-price
src, out = root / "assets/img/source", root / "assets/img"
crops = {  # пустые поля по краям на сайте не нужны
    "gen-system-3d": (0.37, 0, 1, 1),
}
# gen-og собирается отдельно (og.js); остальные были в прототипе и на новой главной не используются
skip = {"gen-og", "gen-hero-collage", "gen-journey"}
# Фон картинки подгоняем под фон блока, где она стоит: иначе вокруг коллажа виден прямоугольник.
bg_to = {
    "gen-hero-fork": (247, 242, 233),  # --cream, первый экран
    "gen-price": (239, 230, 216),      # --cream-2, блок цен
}
WIDTHS = (640, 1000, 1400)


def match_bg(im, target):
    """Умножаем каналы так, чтобы медианный цвет полей совпал с цветом фона блока."""
    w, h = im.size
    m = int(min(w, h) * 0.03)
    frame = Image.new("RGB", (w, 2 * m))
    frame.paste(im.crop((0, 0, w, m)), (0, 0))
    frame.paste(im.crop((0, h - m, w, h)), (0, m))
    med = ImageStat.Stat(frame).median
    chans = [ch.point(lambda v, k=t / b: min(255, round(v * k))) for ch, t, b in zip(im.split(), target, med)]
    return Image.merge("RGB", chans)


for p in sorted(src.glob("gen-*.png")):
    if p.stem in skip or (only and p.stem not in only):
        continue
    im = Image.open(p).convert("RGB")
    if p.stem in bg_to:
        im = match_bg(im, bg_to[p.stem])
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
