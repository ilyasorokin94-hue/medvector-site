# Картинка для превью ссылки (1200x630), apple-touch-icon и favicon
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).parent.parent
img = root / "assets/img"
NAVY, CYAN, CORAL, CREAM = (6, 27, 79), (8, 174, 234), (228, 95, 69), (247, 242, 233)
F = Path("C:/Windows/Fonts")

def font(names, size):
    for n in names:
        if (F / n).exists():
            return ImageFont.truetype(str(F / n), size)
    return ImageFont.load_default()

# --- OG ---
bg = Image.open(img / "source/gen-og.png").convert("RGB")
bg = bg.resize((1200, round(bg.height * 1200 / bg.width)))
top = (bg.height - 630) // 2
og = bg.crop((0, top, 1200, top + 630))
d = ImageDraw.Draw(og)
logo = Image.open(img / "source/orig-medvector-logo-transparent.png").convert("RGBA")
logo.thumbnail((260, 260))
og.paste(logo, (64, 52), logo)
sans = font(["arialnb.ttf", "ARIALNB.TTF", "arialbd.ttf"], 66)
serif = font(["georgia.ttf", "times.ttf"], 52)
small = font(["arialbd.ttf"], 20)
d.text((66, 176), "МАРКЕТИНГ ДЛЯ СТОМАТОЛОГИЙ", fill=CYAN, font=small)
d.text((64, 214), "Чтобы пациенты", fill=NAVY, font=sans)
d.text((64, 290), "находили", fill=NAVY, font=sans)
d.text((64, 378), "и выбирали вашу", fill=NAVY, font=serif)
d.text((64, 440), "стоматологию.", fill=NAVY, font=serif)
d.rectangle((64, 530, 470, 580), fill=CYAN)
d.text((84, 542), "Сайт · SEO · Карты · 2ГИС · Отзывы", fill=NAVY, font=font(["arial.ttf"], 22))
og.save(img / "og-cover.jpg", quality=86, optimize=True, progressive=True)

# --- apple-touch-icon 180x180: стрелка-вектор на синем ---
ic = Image.new("RGB", (180, 180), NAVY)
d = ImageDraw.Draw(ic)
d.polygon([(46, 40), (146, 90), (46, 140), (62, 90)], fill=CYAN)
d.line([(30, 152), (150, 152)], fill=CORAL, width=6)
ic.save(img / "apple-touch-icon.png", optimize=True)
print("ok", og.size)
