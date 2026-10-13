// Шрифты на своём хостинге: Google Fonts из России иногда грузятся медленно,
// а свои файлы можно предзагрузить. Берём только кириллицу и латиницу в woff2.
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'assets', 'fonts');
fs.mkdirSync(dir, { recursive: true });
const api = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Oswald:wght@500;600;700&display=swap';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

(async () => {
  const css = await (await fetch(api, { headers: { 'User-Agent': UA } })).text();
  const blocks = css.split('/* ').slice(1);
  let out = '/* Шрифты Oswald и Cormorant Garamond (SIL Open Font License), кириллица и латиница */\n';
  for (const b of blocks) {
    const subset = b.slice(0, b.indexOf(' */'));
    if (!['cyrillic', 'latin'].includes(subset)) continue;
    const fam = b.match(/font-family: '([^']+)'/)[1];
    const weight = b.match(/font-weight: (\d+)/)[1];
    const src = b.match(/url\((https:[^)]+\.woff2)\)/)[1];
    const range = b.match(/unicode-range: ([^;]+);/)[1];
    const file = `${fam.toLowerCase().replace(/\s+/g, '-')}-${weight}-${subset}.woff2`;
    const buf = Buffer.from(await (await fetch(src)).arrayBuffer());
    fs.writeFileSync(path.join(dir, file), buf);
    out += `@font-face { font-family: '${fam}'; font-style: normal; font-weight: ${weight}; font-display: swap; src: url(../fonts/${file}) format('woff2'); unicode-range: ${range}; }\n`;
    console.log(file, Math.round(buf.length / 1024) + ' KB');
  }
  fs.writeFileSync(path.join(__dirname, '..', 'assets', 'css', 'fonts.css'), out);
})();
