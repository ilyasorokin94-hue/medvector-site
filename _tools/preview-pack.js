// Папка для открытой ссылки на GitHub Pages: страницы сборки и только те файлы, на которые они ссылаются.
// node _tools/preview-pack.js <папка сборки> <папка превью>
// Папка превью очищается и собирается заново. Картинки, которых страницы не касаются (исходники, главная), не копируются.
const fs = require('fs');
const path = require('path');

const [src, dest] = process.argv.slice(2).map(p => p && path.resolve(p));
if (!src || !dest) { console.error('node _tools/preview-pack.js <папка сборки> <папка превью>'); process.exit(1); }
const SKIP = new Set(['preview', 'node_modules', 'src', '_tools', '.git']);
const need = new Set(), missing = new Set();

const add = (ref, fromFile) => {
  let u = ref.trim().split('#')[0].split('?')[0];
  if (!u || /^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(u)) return;
  try { u = decodeURIComponent(u); } catch (e) { /* как есть */ }
  let abs = u.startsWith('/') ? path.join(src, u) : path.join(path.dirname(fromFile), u);
  if (u.endsWith('/') || (fs.existsSync(abs) && fs.statSync(abs).isDirectory())) abs = path.join(abs, 'index.html');
  if (!abs.startsWith(src)) return;
  if (fs.existsSync(abs)) need.add(abs); else missing.add(path.relative(src, abs));
};
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'i')); return m ? m[1] : null; };

const html = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (dir === src && SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) html.push(p);
  }
})(src);

for (const f of html) {
  need.add(f);
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/<(a|link|script|img|source|video)\b[^>]*>/gi)) {
    for (const a of ['href', 'src', 'poster']) { const v = attr(m[0], a); if (v && !/^#/.test(v)) add(v, f); }
    for (const a of ['srcset', 'imagesrcset']) { const v = attr(m[0], a); if (v) v.split(',').forEach(c => { const u = c.trim().split(/\s+/)[0]; if (u) add(u, f); }); }
  }
}
// стили тянут шрифты и картинки через url()
for (const f of [...need].filter(f => f.endsWith('.css'))) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) add(m[1], f);
}

fs.rmSync(dest, { recursive: true, force: true });
let bytes = 0;
for (const f of need) {
  const to = path.join(dest, path.relative(src, f));
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(fs.realpathSync(f), to);
  bytes += fs.statSync(to).size;
}
console.log(`В превью: ${need.size} файлов, ${(bytes / 1048576).toFixed(1)} МБ → ${dest}`);
if (missing.size) { console.log('Нет файлов:\n' + [...missing].join('\n')); process.exit(1); }
