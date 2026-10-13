# Уменьшенные логотипы (исходники 2106x747 с medvectoragency.ru)
from pathlib import Path
from PIL import Image

img = Path(__file__).parent.parent / "assets/img"
for name in ("medvector-logo-transparent", "medvector-logo-inverse"):
    im = Image.open(img / f"orig-{name}.png")
    im.thumbnail((720, 720))
    im.save(img / f"{name}.webp", "WEBP", quality=90, method=6)
    im.save(img / f"{name}.png", optimize=True)
    print(name, im.size)
