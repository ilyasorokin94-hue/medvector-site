// Полный прогон тестов всего сайта. node _tools/test-suite.js <адрес сайта> <папка отчёта>
// Сайт поднимать через python3 _tools/serve.py <порт>: он сжимает текст так же, как хостинг и GitHub Pages.
// Браузеры: Chromium, Firefox, WebKit (движок Safari). Движок, которого нет на машине, попадает в отчёт как «ПРОПУСК».
// CHROME_PATH — путь к установленному Chrome; без него берётся Chromium из Playwright.
const pw = require('playwright');
const { devices } = pw;
const fs = require('fs');
const path = require('path');
const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const [base, out] = process.argv.slice(2);
const root = base.replace(/\/$/, '');
fs.mkdirSync(out, { recursive: true });
const CHROME = process.env.CHROME_PATH || '';
const chromeOpts = CHROME ? { executablePath: CHROME } : {};

// страницы сайта: адрес, есть ли форма заявки, ожидаемые интерактивные блоки
const PAGES = [
  { url: '/', form: true },
  { url: '/yandex-direkt/', form: true, tabs: true },
  { url: '/kompleksnyj-marketing/', form: true },
  { url: '/kejsy/', form: true },
  { url: '/kontakty/', form: true },
  { url: '/politika/' },
  { url: '/soglasie/' },
  { url: '/spasibo/', service: true },
  { url: '/404.html', service: true },
];
const WIDTHS = [320, 375, 390, 768, 1024, 1280, 1440, 1920];

const results = [], skipped = [];
const log = (group, name, ok, detail = '') => { results.push({ group, name, ok, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} [${group}] ${name}${detail ? ' — ' + detail : ''}`); };
const settle = async page => {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = page.viewportSize().height;
  for (let y = 0; y < h; y += vh / 2) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(40); }
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
};
const open = async (page, url) => {
  await page.goto(root + url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
};
const plain = s => s.replace(/\s+/g, ' ').replace(/ /g, ' ').trim();

(async () => {
  const chromium = await pw.chromium.launch(chromeOpts);

  /* ---------- 1. Каждая страница: ошибки, файлы, SEO, разметка ---------- */
  for (const p of PAGES) {
    const ctx = await chromium.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [], failed = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/404.html')) failed.push(`${r.status()} ${r.url()}`); });
    await open(page, p.url);
    await settle(page);
    const g = `Страница ${p.url}`;
    log(g, 'без ошибок JS', errors.length === 0, errors.slice(0, 3).join(' | '));
    log(g, 'все файлы загрузились', failed.length === 0, failed.slice(0, 3).join(' | '));
    const seo = await page.evaluate(() => ({
      h1: document.querySelectorAll('h1').length,
      title: document.title,
      desc: (document.querySelector('meta[name=description]') || {}).content || '',
      canonical: (document.querySelector('link[rel=canonical]') || {}).href || '',
      robots: (document.querySelector('meta[name=robots]') || {}).content || '',
      lang: document.documentElement.lang,
      jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent),
      imgsNoAlt: [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length,
      brokenImgs: [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src),
      ids: [...document.querySelectorAll('[id]')].map(e => e.id),
      hashLinks: [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1),
      links: [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => h.startsWith(location.origin)),
      faqVisible: [...document.querySelectorAll('.qa__item summary .qa__q, .qa__item summary:not(:has(.qa__q)), .faq__list dt')].map(e => e.textContent),
    }));
    log(g, 'ровно один H1', seo.h1 === 1, `H1: ${seo.h1}`);
    log(g, 'title 20–80 знаков', seo.title.length >= 20 && seo.title.length <= 80, `${seo.title.length}: ${seo.title}`);
    log(g, 'description 70–170 знаков', seo.desc.length >= 70 && seo.desc.length <= 170, `${seo.desc.length}`);
    log(g, 'язык ru', seo.lang === 'ru');
    log(g, 'закрыта от индексации до запуска', /noindex/.test(seo.robots));
    if (!p.service) log(g, 'canonical на medvector.pro', seo.canonical.startsWith('https://medvector.pro' + p.url), seo.canonical);
    log(g, 'у картинок есть alt', seo.imgsNoAlt === 0, `без alt: ${seo.imgsNoAlt}`);
    log(g, 'картинки не битые', seo.brokenImgs.length === 0, seo.brokenImgs.slice(0, 2).join(' | '));
    const dupIds = seo.ids.filter((id, i) => seo.ids.indexOf(id) !== i);
    log(g, 'id не повторяются', dupIds.length === 0, dupIds.join(', '));
    const missing = seo.hashLinks.filter(h => !seo.ids.includes(decodeURIComponent(h.slice(1))));
    if (p.url !== '/404.html') log(g, 'якорные ссылки ведут на блоки страницы', missing.length === 0, missing.join(', '));
    let ld = null;
    try { ld = seo.jsonld.map(t => JSON.parse(t)); } catch (e) { /* ниже FAIL */ }
    log(g, 'JSON-LD читается', !!ld, ld ? '' : 'ошибка разбора');
    if (ld) {
      const graph = ld.flatMap(x => x['@graph'] || [x]);
      const faq = graph.find(x => x['@type'] === 'FAQPage');
      if (faq) {
        const qs = faq.mainEntity.map(q => plain(q.name));
        const vis = seo.faqVisible.map(plain);
        log(g, 'вопросы в JSON-LD совпадают с видимыми', qs.length === vis.length && qs.every(q => vis.includes(q)), `${qs.length} в разметке, ${vis.length} на странице`);
      }
      if (p.url !== '/' && !p.service && !['/politika/', '/soglasie/'].includes(p.url)) log(g, 'есть хлебные крошки в JSON-LD', graph.some(x => x['@type'] === 'BreadcrumbList'));
    }
    // внутренние ссылки отвечают 200
    const uniq = [...new Set(seo.links.map(h => h.split('#')[0]))];
    const bad = [];
    for (const h of uniq) { const r = await page.request.get(h); if (r.status() !== 200) bad.push(`${r.status()} ${h}`); }
    log(g, 'внутренние ссылки открываются', bad.length === 0, bad.slice(0, 3).join(' | '));
    // доступность
    await page.addScriptTag({ content: axe });
    const ax = await page.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })).violations.map(v => `${v.id} (${v.nodes.length})`));
    log(g, 'доступность WCAG 2.1 AA (axe)', ax.length === 0, ax.join(', '));
    await ctx.close();
  }

  /* ---------- 2. Ширины экрана: нет горизонтальной прокрутки, блоки видны ---------- */
  for (const p of PAGES) {
    const bad = [], hidden = [];
    for (const w of WIDTHS) {
      const ctx = await chromium.newContext({ viewport: { width: w, height: 860 } });
      const page = await ctx.newPage();
      await open(page, p.url); await settle(page);
      const r = await page.evaluate(() => ({ d: document.documentElement.scrollWidth, w: document.documentElement.clientWidth, hid: [...document.querySelectorAll('.reveal, .reveal-l')].filter(e => !e.classList.contains('is-in') && e.offsetParent).length }));
      if (r.d > r.w + 1) bad.push(`${w}: ${r.d}`);
      if (r.hid) hidden.push(`${w}: ${r.hid}`);
      await ctx.close();
    }
    log('Экраны 320–1920', `${p.url}: нет горизонтальной прокрутки`, bad.length === 0, bad.join(', '));
    log('Экраны 320–1920', `${p.url}: все блоки появились после прокрутки`, hidden.length === 0, hidden.join(', '));
  }

  /* ---------- 3. Без JavaScript всё содержимое видно ---------- */
  {
    const ctx = await chromium.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    for (const p of PAGES) {
      await page.goto(root + p.url);
      const r = await page.evaluate(() => ({
        hidden: [...document.querySelectorAll('main h2, main h3, main p, main li')].filter(e => { const s = getComputedStyle(e); return s.opacity === '0' || s.visibility === 'hidden'; }).length,
        panels: [...document.querySelectorAll('.tabs__panel')].filter(e => getComputedStyle(e).display === 'none').length,
      }));
      log('Без JavaScript', `${p.url}: текст и вкладки видны`, r.hidden === 0 && r.panels === 0, `скрыто: ${r.hidden}, вкладок скрыто: ${r.panels}`);
    }
    await ctx.close();
  }

  /* ---------- 4. Интерактив ---------- */
  {
    const ctx = await chromium.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    for (const u of ['/', '/yandex-direkt/']) {
      await open(page, u);
      await page.click('.burger');
      await page.waitForTimeout(400);
      const menuOpen = await page.evaluate(() => document.querySelector('#mnav').classList.contains('is-open') && !document.querySelector('#mnav').inert);
      log('Интерактив', `${u}: мобильное меню открывается`, menuOpen);
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      log('Интерактив', `${u}: меню закрывается по Escape`, await page.evaluate(() => !document.querySelector('#mnav').classList.contains('is-open') && document.querySelector('#mnav').inert));
    }
    await ctx.close();
  }
  {
    const ctx = await chromium.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    // вкладки
    await open(page, '/yandex-direkt/');
    log('Интерактив', 'на Директе сначала открыта «Имплантация»', await page.evaluate(() => !document.getElementById('implant').hidden && document.getElementById('all-on-4').hidden));
    await page.click('#tab-all-on-4');
    log('Интерактив', 'вкладка «All-on-4» открывается', await page.evaluate(() => !document.getElementById('all-on-4').hidden && document.getElementById('implant').hidden));
    await page.focus('#tab-all-on-4'); await page.keyboard.press('ArrowLeft');
    log('Интерактив', 'вкладки листаются стрелками', await page.evaluate(() => !document.getElementById('implant').hidden && document.activeElement.id === 'tab-implant'));
    await page.goto(root + '/yandex-direkt/#all-on-4', { waitUntil: 'networkidle' });
    log('Интерактив', 'ссылка #all-on-4 открывает нужную вкладку', await page.evaluate(() => !document.getElementById('all-on-4').hidden));
    // кнопка с data-pick выбирает услугу и направление в форме
    await open(page, '/yandex-direkt/');
    await page.click('.phero a[data-dir="running"]');
    await page.waitForTimeout(300);
    log('Интерактив', '«Разобрать текущую рекламу» выбирает «Реклама уже идёт» в форме', await page.evaluate(() => document.querySelector('#start select[name=direction]').value === 'running'));
    // форма: пустая не отправляется, заполненная показывает «Спасибо»
    await page.click('#start button[type=submit]');
    log('Интерактив', 'пустая форма подсвечивает поля', await page.evaluate(() => document.querySelectorAll('#start [aria-invalid="true"]').length >= 3));
    await page.fill('#start input[name=name]', 'Тест');
    await page.fill('#start input[name=contact]', '+7 900 000-00-00');
    await page.fill('#start input[name=city]', 'Казань');
    await page.check('#start input[name=consent]');
    await page.click('#start button[type=submit]');
    log('Интерактив', 'заполненная форма показывает «Спасибо»', await page.evaluate(() => document.querySelector('#start .form').classList.contains('is-sent') || !!document.querySelector('#start .is-sent')));
    // форма на «Сайт и Карты»: выбран сайт, направление спрятано
    await open(page, '/kompleksnyj-marketing/');
    log('Интерактив', 'на «Сайт и Карты» в форме выбран сайт', await page.evaluate(() => document.querySelector('#start input[value=site]').checked));
    // вопросы на странице услуги раскрываются
    await open(page, '/yandex-direkt/');
    await page.click('#faq .qa__item:nth-child(2) summary');
    log('Интерактив', 'вопрос на Директе раскрывается', await page.evaluate(() => document.querySelector('#faq .qa__item:nth-child(2)').open));
    // главная: калькулятор пересчитывает, колесо вопросов переключается, линия-вектор дорисовывается до кнопки формы
    await open(page, '/');
    await page.evaluate(() => { const r = document.querySelector('[data-calc] input[name=budget]'); r.value = 300000; r.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForTimeout(700);
    log('Интерактив', 'калькулятор пересчитывает переходы, заявки и цену', await page.evaluate(() => { const t = k => document.querySelector(`[data-res=${k}]`).textContent.replace(/\s/g, ''); return t('clicks') === '1364' && t('leads') === '68' && t('books') === '27' && t('cpl') === '4400' && document.querySelector('[data-out=budget]').textContent.replace(/\s/g, '') === '300000₽'; }), await page.evaluate(() => [...document.querySelectorAll('[data-res]')].map(e => e.textContent).join(' / ')));
    log('Интерактив', 'на широком экране вопросы собраны в колесо', await page.evaluate(() => !!document.querySelector('#faq .has-wheel .wheel') && getComputedStyle(document.querySelector('#faq .qa')).display === 'none'));
    await page.evaluate(() => document.getElementById('faq').scrollIntoView()); await page.waitForTimeout(500);
    await page.click('.wheel__q:nth-child(3)');
    await page.waitForTimeout(500);
    log('Интерактив', 'колесо показывает выбранный вопрос и ответ', await page.evaluate(() => { const t = document.querySelector('.wheel__q:nth-child(3)'); return t.getAttribute('aria-selected') === 'true' && document.querySelector('.wheel__title').textContent === t.textContent && document.querySelector('.wheel__a').textContent.length > 40; }));
    await page.focus('.wheel__q[aria-selected="true"]'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(500);
    log('Интерактив', 'колесо листается стрелками', await page.evaluate(() => document.querySelector('.wheel__q:nth-child(4)').getAttribute('aria-selected') === 'true' && document.activeElement === document.querySelector('.wheel__q:nth-child(4)')));
    await page.evaluate(() => document.getElementById('start').scrollIntoView()); await page.waitForTimeout(2500);
    log('Интерактив', 'линия-вектор доходит до кнопки формы', await page.evaluate(() => !!document.querySelector('.vline.is-done')));
    log('Интерактив', 'точки на пути пациента загорелись', await page.evaluate(() => document.querySelectorAll('#how .jr__st.is-on').length === 5));
    await ctx.close();
  }
  {
    // телефон: вместо колеса раскрывающийся список
    const ctx = await chromium.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    await open(page, '/');
    log('Интерактив', 'на телефоне вопросы идут списком', await page.evaluate(() => !document.querySelector('#faq .has-wheel') && getComputedStyle(document.querySelector('#faq .qa')).display !== 'none'));
    await page.click('#faq .qa__item:nth-child(2) summary');
    log('Интерактив', 'вопрос на телефоне раскрывается', await page.evaluate(() => document.querySelector('#faq .qa__item:nth-child(2)').open));
    await ctx.close();
  }
  await chromium.close();

  /* ---------- 5. Другие движки: главная и Директ без ошибок и прокрутки ---------- */
  for (const [label, engine, opts] of [['Firefox · десктоп', 'firefox', { viewport: { width: 1440, height: 900 } }], ['Safari · iPhone 13 (WebKit)', 'webkit', devices['iPhone 13']]]) {
    let b;
    try { b = await pw[engine].launch(); } catch (e) { skipped.push(label); console.log(`ПРОПУСК [Браузеры] ${label}: движок не установлен`); continue; }
    for (const u of ['/', '/yandex-direkt/', '/kompleksnyj-marketing/']) {
      const ctx = await b.newContext(opts); const page = await ctx.newPage(); const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await open(page, u); await settle(page);
      const r = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      log('Браузеры', `${label} ${u}: без ошибок и прокрутки`, errors.length === 0 && r <= 1, errors.join(' | '));
      await ctx.close();
    }
    await b.close();
  }

  const fails = results.filter(r => !r.ok);
  const report = [`Прогон ${new Date().toISOString()}: ${results.length - fails.length}/${results.length} OK${skipped.length ? `, пропущено: ${skipped.join(', ')}` : ''}`, '', ...results.map(r => `${r.ok ? 'OK  ' : 'FAIL'} [${r.group}] ${r.name}${r.detail ? ' — ' + r.detail : ''}`)].join('\n');
  fs.writeFileSync(path.join(out, 'report.txt'), report);
  console.log(`\nИтого: ${results.length - fails.length}/${results.length} OK, FAIL: ${fails.length}${skipped.length ? `, ПРОПУСК: ${skipped.length}` : ''}`);
  process.exit(fails.length ? 1 : 0);
})();
