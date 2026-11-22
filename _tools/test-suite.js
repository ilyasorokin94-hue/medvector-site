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
// зуб на главной рисует WebGL: без видеокарты включаем программную отрисовку
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const chromeOpts = CHROME ? { executablePath: CHROME, args: GL } : { args: GL };

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
    // доступность: ждём, пока доиграют появления блоков, иначе контраст считается по полупрозрачному тексту
    await page.waitForTimeout(3500);
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
      const r = await page.evaluate(() => ({ d: document.documentElement.scrollWidth, w: document.documentElement.clientWidth, hid: [...document.querySelectorAll('.reveal, .reveal-l, [data-rv], .rvh')].filter(e => !e.classList.contains('is-in') && e.offsetParent).length }));
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
        panels: [...document.querySelectorAll('.tabs__panel, [data-pane]')].filter(e => getComputedStyle(e).display === 'none').length,
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
    // главная: первый экран, карта, указатель кейсов, колесо вопросов, линия-вектор до кнопки формы, форма
    await open(page, '/');
    await page.waitForTimeout(800);
    log('Интерактив', 'на первом экране нет зуба, только надпись', await page.evaluate(() => !document.querySelector('#hero canvas') && !!document.querySelector('#hero [data-fit]')));
    log('Интерактив', 'надпись первого экрана растянута на всю ширину', await page.evaluate(() => { const e = document.querySelector('#hero [data-fit]'), s = e.firstElementChild.getBoundingClientRect(); return s.width > e.clientWidth * 0.9 || s.height > innerHeight * 0.2; }));
    await page.evaluate(() => document.querySelector('#geo .g2__map').scrollIntoView({ block: 'center' })); await page.waitForTimeout(3600);
    log('Интерактив', 'карта России: контур, точки, 20 городов, радар из Петербурга с кругами по 1000 км крутится, города вспыхивают', await page.evaluate(() => { const m = document.querySelector('#geo .g2__map'), mr = matchMedia('(prefers-reduced-motion: reduce)').matches; return m.classList.contains('is-in') && (document.querySelector('.g2__land').getAttribute('d').match(/M/g) || []).length > 1500 && document.querySelector('.g2__edge').getAttribute('d').length > 5000 && document.querySelectorAll('.g2__rings path').length === 4 && document.querySelectorAll('.g2__spokes line').length === 19 && document.querySelectorAll('.g2__pt').length === 19 && document.querySelectorAll('.g2__kms li').length === 4 && (mr || (getComputedStyle(document.querySelector('.g2__sweep')).animationName === 'g2spin' && getComputedStyle(document.querySelector('.g2__fx i'), '::after').animationName === 'g2hit')); }));
    log('Интерактив', 'на странице нет тире и точек между словами', await page.evaluate(() => { const dash = e => ['::before', '::after'].some(w => { const b = getComputedStyle(e, w); return b.content === '""' && parseFloat(b.width) >= 4 && parseFloat(b.height) <= 4 && b.position !== 'absolute'; }) || (() => { const b = getComputedStyle(e, '::before'); return b.content === '""' && b.position === 'absolute' && parseFloat(b.width) < 40 && parseFloat(b.height) <= 3; })(); return !/[\u2014\u2013\u2022\u00b7]/.test(document.querySelector('main').innerText) && ![...document.querySelectorAll('main .label, main li, .ctag span, .c3__row')].some(dash); }));
    await page.evaluate(() => document.getElementById('cases').scrollIntoView()); await page.waitForTimeout(500);
    await page.click('#cases [data-tab="d"]'); await page.waitForTimeout(300);
    log('Интерактив', 'указатель кейсов переключается', await page.evaluate(() => !document.querySelector('#cases [data-pane="d"]').hidden && document.querySelector('#cases [data-pane="a"]').hidden && document.querySelector('#cases [data-tab="d"]').getAttribute('aria-selected') === 'true'));
    await page.waitForTimeout(1600);
    log('Интерактив', 'кейсы: подсветка стоит на выбранном городе, цифры набежали до своих значений', await page.evaluate(() => { const m = document.querySelector('#cases .c3__mark'), r = document.querySelector('#cases .c3__row.is-on'); if (!m || !r) return false; const a = m.getBoundingClientRect(), b = r.getBoundingClientRect(); return Math.abs(a.top - b.top) < 3 && Math.abs(a.height - b.height) < 3 && /в\s2,7\sраза/.test(document.querySelector('#cases [data-pane="d"] .c3__big').textContent) && document.querySelector('#cases [data-pane="d"] .ba__r--now b').textContent === '131'; }));
    await page.evaluate(() => { const p = document.querySelectorAll('#services .s1__p')[1]; scrollTo(0, p.getBoundingClientRect().top + scrollY - 300); }); await page.waitForTimeout(500);
    log('Интерактив', 'услуги: вторая панель наезжает на первую', await page.evaluate(() => { const [a, b] = document.querySelectorAll('#services .s1__p'), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return rb.top < ra.bottom - 40 && +a.style.getPropertyValue('--q') > 0.1; }));
    await page.evaluate(() => document.querySelector('#sites .w5__wall').scrollIntoView({ block: 'center' })); await page.waitForTimeout(2600);
    log('Интерактив', 'сайты: стена макетов стоит под наклоном', await page.evaluate(() => document.getElementById('sites').classList.contains('v-go') && getComputedStyle(document.querySelector('#sites .w5__wall')).transform.startsWith('matrix3d')));
    await page.evaluate(() => { const e = document.querySelector('#team .t5__sheet'); scrollTo(0, e.getBoundingClientRect().top + scrollY - innerHeight * .9); }); await page.waitForTimeout(400);
    const dim = await page.evaluate(() => document.querySelectorAll('#team .t5__w:not(.on)').length);
    await page.evaluate(() => { const e = document.querySelector('#team .t5__sheet'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 90); }); await page.waitForTimeout(500);
    log('Интерактив', 'письмо: текст проявляется по мере прокрутки, в конце подпись', dim > 40 && await page.evaluate(() => { const w = [...document.querySelectorAll('#team .t5__w')], e = document.querySelector('#team .t5__sheet'); return w.length > 60 && w.every(x => x.classList.contains('on')) && e.classList.contains('is-signed') && e.textContent.includes('Мне важна репутация'); }), 'бледных слов до прокрутки: ' + dim);
    log('Интерактив', 'макеты сайтов нарисованы', await page.evaluate(() => document.querySelectorAll('#sites .mock .mk').length >= 6));
    log('Интерактив', 'в кнопках и ссылках нет стрелок', await page.evaluate(() => ![...document.querySelectorAll('a, button')].some(e => /[→←]/.test(e.textContent))));
    log('Интерактив', 'на широком экране вопросы собраны в колесо', await page.evaluate(() => getComputedStyle(document.querySelector('#faq .wheel')).display === 'grid' && getComputedStyle(document.querySelector('#faq .qa')).display === 'none'));
    await page.evaluate(() => { const e = document.querySelector('#faq .wheel'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 80); }); await page.waitForTimeout(500);
    await page.click('#wq-2');
    await page.waitForTimeout(500);
    log('Интерактив', 'колесо показывает выбранный вопрос и ответ', await page.evaluate(() => { const t = document.getElementById('wq-2'), item = document.querySelector('#faq .qa__item:nth-child(3)'); return t.getAttribute('aria-selected') === 'true' && document.querySelector('.wheel__title').textContent === item.querySelector('.qa__q').textContent && document.querySelector('.wheel__a').textContent.trim() === item.querySelector('.qa__a').textContent.trim() && document.querySelector('.wheel__count b').textContent === '3'; }));
    await page.focus('.wheel__q[aria-selected="true"]'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(500);
    log('Интерактив', 'колесо листается стрелками', await page.evaluate(() => document.getElementById('wq-3').getAttribute('aria-selected') === 'true' && document.activeElement === document.getElementById('wq-3')));
    for (let i = 0; i < 5; i++) { await page.click('.wheel__btn--next'); await page.waitForTimeout(250); }
    log('Интерактив', 'колесо замкнуто: после последнего вопроса идёт первый', await page.evaluate(() => document.getElementById('wq-0').getAttribute('aria-selected') === 'true' && document.querySelector('.wheel__ring').style.getPropertyValue('--rot') === '-208deg'));
    log('Интерактив', 'шар из точек в середине колеса нарисован', await page.evaluate(() => { const c = document.querySelector('.wheel__orb'); if (!c || !c.width) return false; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n > 2000; }));
    await page.evaluate(() => { const b = document.querySelector('#faq .sec__body'), r = b.getBoundingClientRect(); scrollTo(0, r.top + scrollY + (r.height - innerHeight) * 4.5 / 8); }); await page.waitForTimeout(700);
    log('Интерактив', 'вопросы: секция стоит на месте, колесо поворачивается прокруткой', await page.evaluate(() => document.getElementById('wq-4').getAttribute('aria-selected') === 'true' && Math.abs(document.querySelector('#faq .wrap').getBoundingClientRect().top) < 2));
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(2500);
    log('Интерактив', 'линия-вектор доходит до кнопки формы', await page.evaluate(() => { const l = MV.line.state(); return l.total > 3000 && l.cur >= l.total - 1; }));
    log('Интерактив', 'заявка: надпись залита целиком к концу страницы', await page.evaluate(() => document.querySelector('#start .f2__big').style.getPropertyValue('--f') === '100.0' && document.getElementById('start').classList.contains('v-full')));
    const f = '#start form';
    await page.evaluate(() => document.getElementById('start').scrollIntoView()); await page.waitForTimeout(400);
    await page.fill(f + ' [name="phone"]', '+7 900 000-00-00');
    await page.click(f + ' button[type="submit"]'); await page.waitForTimeout(200);
    const blocked = await page.evaluate(s => document.querySelector(s + ' [data-form-ok]').hidden, f);
    await page.check(f + ' [name="agree"]');
    await page.click(f + ' button[type="submit"]'); await page.waitForTimeout(200);
    log('Интерактив', 'заявка: без согласия не уходит, с согласием показывает ответ', blocked && await page.evaluate(s => !document.querySelector(s + ' [data-form-ok]').hidden, f));
    await ctx.close();
  }
  {
    // телефон: вместо колеса раскрывающийся список
    const ctx = await chromium.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    await open(page, '/');
    log('Интерактив', 'на телефоне вопросы идут списком', await page.evaluate(() => getComputedStyle(document.querySelector('#faq .wheel')).display === 'none' && getComputedStyle(document.querySelector('#faq .qa')).display !== 'none'));
    await page.click('#faq .qa__item:nth-child(2) summary');
    log('Интерактив', 'вопрос на телефоне раскрывается', await page.evaluate(() => document.querySelector('#faq .qa__item:nth-child(2)').open));
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(1800);
    log('Интерактив', 'первый экран на телефоне: стоит вертикальный ролик с заставкой и играет', await page.evaluate(() => { const f = document.querySelector('[data-hero-film]'), v = f.querySelector('video'); return f.classList.contains('is-on') && /hero-m\.webp$/.test(v.poster) && /hero-m\.(webm|mp4)$/.test(v.currentSrc) && !v.paused && v.videoWidth < v.videoHeight && f.getBoundingClientRect().height < document.querySelector('.hv2').getBoundingClientRect().height; }));
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
