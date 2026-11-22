// Проверка готовой сборки без браузера: node _tools/check-build.js [папка сборки]
// Запускать после каждой сборки (npm run check). По умолчанию проверяет корень репозитория.
// Ошибки (код выхода 1):
//   ссылка, src, srcset, preload или url() в стилях ведёт на файл, которого нет;
//   в обычной сборке остались переключатель вариантов или панель выбора;
//   у страницы нет title, description, canonical, lang="ru" или не ровно один h1;
//   у картинки нет alt, width или height;
//   в sitemap.xml нет страницы сайта или есть адрес, которого нет.
// Замечания (не ломают проверку): стрелка «→» и длинное тире в тексте страниц.
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const SKIP = new Set(['preview', 'node_modules', 'src', '_tools', '.git']);
const errors = [], notes = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);

const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (dir === root && SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(root);

// адрес внутри сайта → файл; внешние адреса, якоря, почта и телефон не проверяем
const exists = (ref, fromFile) => {
  let u = ref.trim().split('#')[0].split('?')[0];
  if (!u || /^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(u)) return true;
  try { u = decodeURIComponent(u); } catch (e) { /* оставляем как есть */ }
  const abs = u.startsWith('/') ? path.join(root, u) : path.join(path.dirname(fromFile), u);
  if (u.endsWith('/')) return fs.existsSync(path.join(abs, 'index.html'));
  return fs.existsSync(abs) || fs.existsSync(path.join(abs, 'index.html'));
};
const attrs = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return m ? (m[2] ?? m[3]) : null; };

const pages = [];
for (const f of htmlFiles) {
  const rel = '/' + path.relative(root, f).split(path.sep).join('/');
  const html = fs.readFileSync(f, 'utf8');
  const is404 = rel === '/404.html';

  // ссылки и файлы
  for (const m of html.matchAll(/<(a|link|script|img|source|video)\b[^>]*>/gi)) {
    const tag = m[0];
    for (const a of ['href', 'src', 'poster']) {
      const v = attrs(tag, a);
      if (v && !exists(v, f)) err(rel, `нет файла для ${a}="${v}"`);
    }
    for (const a of ['srcset', 'imagesrcset']) {
      const v = attrs(tag, a);
      if (v) for (const part of v.split(',')) { const u = part.trim().split(/\s+/)[0]; if (u && !exists(u, f)) err(rel, `нет файла в ${a}: ${u}`); }
    }
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) if (!exists(m[1], f)) err(rel, `нет файла для url(${m[1]})`);

  // остатки сборки выбора
  if (/data-vset|class="[^"]*\bvbar\b|is-pick/.test(html)) err(rel, 'в странице остался переключатель вариантов (собрано с MV_PICK?)');

  // основа SEO
  if (!/<html[^>]*\blang="ru"/.test(html)) err(rel, 'нет lang="ru"');
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  if (!title || !title.trim()) err(rel, 'пустой title');
  if (!is404) {
    if (!/<meta name="description" content="[^"]+"/.test(html)) err(rel, 'нет description');
    const h1 = (html.match(/<h1[\s>]/g) || []).length;
    if (h1 !== 1) err(rel, `h1 на странице: ${h1}`);
    const canon = (html.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
    if (!canon && rel !== '/spasibo/index.html') err(rel, 'нет canonical');
  }

  // картинки
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0], src = attrs(tag, 'src') || '?';
    if (attrs(tag, 'alt') === null) err(rel, `у картинки нет alt: ${src}`);
    if (!attrs(tag, 'width') || !attrs(tag, 'height')) err(rel, `у картинки нет width или height: ${src}`);
  }

  // запрещённые знаки в тексте (без стилей, скриптов и атрибутов)
  const text = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  if (text.includes('→')) notes.push(`${rel}: в тексте есть «→»`);
  const dashes = (text.match(/\s—\s|\s–\s/g) || []).length;
  if (dashes) notes.push(`${rel}: тире в тексте: ${dashes}`);

  if (rel.endsWith('/index.html')) pages.push(rel.replace(/index\.html$/, ''));
}

// стили: url() внутри css
for (const dir of ['assets/css']) {
  const d = path.join(root, dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter(f => f.endsWith('.css'))) {
    const css = fs.readFileSync(path.join(d, f), 'utf8');
    for (const m of css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) if (!exists(m[1], path.join(d, f))) err(`/${dir}/${f}`, `нет файла для url(${m[1]})`);
  }
}

// карта сайта
const smPath = path.join(root, 'sitemap.xml');
if (fs.existsSync(smPath)) {
  const locs = [...fs.readFileSync(smPath, 'utf8').matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map(m => m[1]);
  const service = new Set(['/spasibo/', '/politika/', '/soglasie/']);
  for (const p of pages) if (!service.has(p) && !locs.includes(p)) err('/sitemap.xml', `нет страницы ${p}`);
  for (const l of locs) if (!pages.includes(l)) err('/sitemap.xml', `адрес без страницы: ${l}`);
} else err('/sitemap.xml', 'нет файла');

console.log(`Проверено страниц: ${htmlFiles.length}. Ошибок: ${errors.length}. Замечаний: ${notes.length}.`);
if (errors.length) console.log('\nОшибки:\n' + errors.join('\n'));
if (notes.length) console.log('\nЗамечания:\n' + notes.join('\n'));
process.exit(errors.length ? 1 : 0);
