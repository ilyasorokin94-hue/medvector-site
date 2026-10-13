# Листы-превью из скриншотов: python sheet.py <dir> <prefix> <cols> <scale>
import sys, glob
from pathlib import Path
from PIL import Image

d, prefix, cols, scale = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
fs = sorted(f for f in glob.glob(f"{d}/{prefix}-[0-9]*.png"))
ims = [Image.open(f) for f in fs]
w, h = int(ims[0].width * scale), int(ims[0].height * scale)
per = cols * 2
for k in range(0, len(ims), per):
    part = ims[k:k + per]
    rows = (len(part) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 8), rows * (h + 8)), "white")
    for i, im in enumerate(part):
        sheet.paste(im.resize((w, h)), ((i % cols) * (w + 8), (i // cols) * (h + 8)))
    out = Path(d) / f"sheet-{prefix}-{k // per}.png"
    sheet.save(out)
    print(out)
