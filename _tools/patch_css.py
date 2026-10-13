from pathlib import Path

p = Path(__file__).parent.parent / "assets/css/style.css"
s = p.read_text(encoding="utf-8")
rep = [
    (".hero__collage { width: 100%;",
     ".hero__collage { -webkit-mask-image: linear-gradient(to right, transparent, #000 2%, #000 94%, transparent), linear-gradient(to bottom, transparent, #000 6%, #000 94%, transparent); }\n.hero__collage { width: 100%;"),
    ("font-size: clamp(17px, 2.05vw, 30px);", "font-size: clamp(16px, 1.85vw, 27px);"),
    ("  .chart { width: 92%; }",
     "  .chart { width: 92%; }\n  .cube-scene { width: 70px; height: 70px; left: -4px; bottom: -10px; }\n  .cube__face { font-size: 13px; }\n"
     "  .cube__face--1 { transform: rotateY(0deg) translateZ(35px); } .cube__face--2 { transform: rotateY(90deg) translateZ(35px); }\n"
     "  .cube__face--3 { transform: rotateY(180deg) translateZ(35px); } .cube__face--4 { transform: rotateY(-90deg) translateZ(35px); }\n"
     "  .cube__face--5 { transform: rotateX(90deg) translateZ(35px); } .cube__face--6 { transform: rotateX(-90deg) translateZ(35px); }"),
]
for a, b in rep:
    assert a in s, a[:50]
    s = s.replace(a, b, 1)
p.write_text(s, encoding="utf-8", newline="")
print("ok")
