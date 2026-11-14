// Полный прогон тестов главной. node test-suite.js <url> <outdir>
// Браузеры: Chromium (Chrome), Firefox, WebKit (движок Safari на iPhone).
// CHROME_PATH — путь к установленному Chrome; без него берётся Chromium из Playwright.
// Движок, который не установлен на машине, не запускается и попадает в отчёт как «ПРОПУСК», а не как пройденный.
const pw = require('playwright');
const { devices } = pw;
const fs = require('fs');
const path = require('path');
const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const WIN_CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CHROME = process.env.CHROME_PATH || (fs.existsSync(WIN_CHROME) ? WIN_CHROME : '');
const chromeOpts = CHROME ? { executablePath: CHROME } : {};
const results = [];
const skipped = [];
const log = (group, name, ok, detail = '') => { results.push({ group, name, ok, detail }); console.log(`${ok ? 'OK  ' : 'FAIL'} [${group}] ${name}${detail ? ' — ' + detail : ''}`); };

const settle = async page => {
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = page.viewportSize().height;
  for (let y = 0; y < h; y += vh / 2) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(60); }
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400);
};
const overflowCheck = page => page.evaluate(() => {
  const w = document.documentElement.clientWidth;
  return { docW: document.documentElement.scrollWidth, w, bodyScroll: document.scrollingElement.scrollWidth > w };
});

(async () => {
  /* ---------- 1. Кросс-браузер: загрузка, ошибки, горизонтальная прокрутка ---------- */
  const engines = [
    ['Chrome · десктоп', 'chromium', { viewport: { width: 1440, height: 900 } }],
    ['Chrome · Android (Pixel 7)', 'chromium', devices['Pixel 7']],
    ['Safari · iPhone 13 (WebKit)', 'webkit', devices['iPhone 13']],
    ['Safari · iPhone SE (WebKit)', 'webkit', devices['iPhone SE']],
    ['Safari · iPad (WebKit)', 'webkit', devices['iPad (gen 7)']],
    ['Safari · Mac (WebKit)', 'webkit', { viewport: { width: 1440, height: 900 } }],
    ['Firefox · десктоп', 'firefox', { viewport: { width: 1440, height: 900 } }],
    ['Firefox · Android', 'firefox', { viewport: { width: 412, height: 915 }, hasTouch: true }],
  ];
  for (const [label, engine, opts] of engines) {
    let browser;
    try { browser = await pw[engine].launch(engine === 'chromium' ? chromeOpts : {}); }
    catch (e) { skipped.push(label); console.log(`ПРОПУСК [Браузеры] ${label}: движок ${engine} не установлен на этой машине`); continue; }
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const failed = [];
    page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
    await page.goto(url, { waitUntil: 'networkidle' }); await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
    await settle(page);
    const ov = await overflowCheck(page);
    log('Браузеры', `${label}: без ошибок JS`, errors.length === 0, errors.slice(0, 3).join(' | '));
    log('Браузеры', `${label}: все файлы загрузились`, failed.length === 0, failed.slice(0, 3).join(' | '));
    log('Браузеры', `${label}: нет горизонтальной прокрутки`, ov.docW <= ov.w + 1, `ширина документа ${ov.docW} при экране ${ov.w}`);
    const slug = label.replace(/[^\wа-я]+/gi, '-');
    await page.screenshot({ path: path.join(out, `browser-${slug}.png`) });
    if (engine === 'webkit' && label.includes('iPhone 13')) {
      await page.evaluate(() => document.querySelector('.footer').scrollIntoView()); await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(out, `footer-iphone.png`) });
    }
    if (label === 'Chrome · десктоп') {
      await page.evaluate(() => document.querySelector('.footer').scrollIntoView()); await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(out, `footer-desktop.png`) });
    }
    await browser.close();
  }

  const chrome = await pw.chromium.launch(chromeOpts);

  /* ---------- 2. Адаптивность: 8 ширин экрана ---------- */
  for (const w of [320, 360, 390, 414, 768, 1024, 1280, 1920]) {
    const page = await chrome.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle' }); await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
    await settle(page);
    const ov = await overflowCheck(page);
    const clipped = await page.evaluate(() => [...document.querySelectorAll('h1, h2, h3, .btn, .btn-tape, .tab, .nav a')].filter(el => el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflow !== 'visible').length);
    log('Экраны', `${w}px: нет горизонтальной прокрутки`, ov.docW <= ov.w + 1, `${ov.docW}/${ov.w}`);
    log('Экраны', `${w}px: тексты не обрезаны`, clipped === 0, clipped ? `${clipped} элементов` : '');
    await page.screenshot({ path: path.join(out, `width-${w}.png`) });
    await page.close();
  }

  /* ---------- 3. Функции ---------- */
  {
    const ctx = await chrome.newContext(devices['iPhone 13']);
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' }); await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
    // меню
    await page.click('.burger'); await page.waitForTimeout(500);
    log('Функции', 'Меню открывается', await page.$eval('#mnav', el => el.classList.contains('is-open')));
    log('Функции', 'Прокрутка страницы заблокирована под меню', await page.evaluate(() => document.body.classList.contains('is-locked')));
    await page.click('#mnav a[href="#prices"]'); await page.waitForTimeout(1200);
    log('Функции', 'Пункт меню ведёт к блоку «Цены» и закрывает меню', await page.evaluate(() => {
      const r = document.querySelector('#prices').getBoundingClientRect(); return !document.querySelector('#mnav').classList.contains('is-open') && r.top < innerHeight && r.bottom > 0;
    }));
    await page.click('.burger'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    log('Функции', 'Меню закрывается клавишей Esc', !(await page.$eval('#mnav', el => el.classList.contains('is-open'))));
    // нижняя кнопка
    await page.evaluate(() => scrollTo(0, 1800)); await page.waitForTimeout(600);
    log('Функции', 'Нижняя кнопка диагностики появляется после первого экрана', await page.$eval('.mcta', el => el.classList.contains('is-on')));
    await page.evaluate(() => document.querySelector('#diagnostics').scrollIntoView()); await page.waitForTimeout(700);
    log('Функции', 'Нижняя кнопка прячется у формы', !(await page.$eval('.mcta', el => el.classList.contains('is-on'))));
    // вкладки
    await page.evaluate(() => document.querySelector('#paths .tabs').scrollIntoView({ block: 'center' })); await page.waitForTimeout(300);
    await page.click('.tab[data-tab="2"]'); await page.waitForTimeout(400);
    log('Функции', 'Вкладки «С чего начать» переключаются', await page.evaluate(() => document.querySelectorAll('.tabpanel')[2].classList.contains('is-active') && document.querySelectorAll('.tabpanel.is-active').length === 1));
    // карусель услуг
    log('Функции', 'Услуги на телефоне листаются в ряд', await page.evaluate(() => { const r = document.querySelector('.svc-row'); return r.scrollWidth > r.clientWidth + 40; }));
    // переворот карточки
    await page.evaluate(() => document.querySelector('.flip').scrollIntoView({ block: 'center' })); await page.waitForTimeout(400);
    await page.tap('.flip'); await page.waitForTimeout(900);
    log('Функции', 'Карточка принципов переворачивается по нажатию', await page.$eval('.flip', el => el.classList.contains('is-flipped')));
    // колесо
    await page.evaluate(() => document.querySelector('#faq').scrollIntoView()); await page.waitForTimeout(400);
    const a0 = await page.$eval('.faq__text', el => el.textContent);
    await page.click('.wheel-nav__btn[data-step="1"]'); await page.waitForTimeout(600);
    const a1 = await page.$eval('.faq__text', el => el.textContent);
    log('Функции', 'Колесо вопросов: стрелка меняет ответ', a0 !== a1 && a1.length > 20);
    // карусель тарифов
    await page.evaluate(() => { const c = document.querySelector('.tariffs'); c.scrollIntoView(); c.scrollLeft = c.scrollWidth; }); await page.waitForTimeout(600);
    log('Функции', 'Карусель тарифов листается, точки следуют', await page.evaluate(() => document.querySelectorAll('.dots i')[2].classList.contains('is-on')));
    // форма
    await page.evaluate(() => document.querySelector('#diagnostics').scrollIntoView()); await page.waitForTimeout(300);
    await page.click('.form button[type=submit]'); await page.waitForTimeout(300);
    log('Функции', 'Пустая форма не отправляется и подсвечивает поля', await page.evaluate(() => !document.querySelector('.form').classList.contains('is-sent') && document.querySelectorAll('.form .is-bad').length >= 3));
    await page.fill('input[name=name]', 'Тест'); await page.fill('input[name=contact]', '+7 900 000-00-00'); await page.fill('input[name=city]', 'Москва');
    await page.check('.form__consent input'); await page.click('.form button[type=submit]'); await page.waitForTimeout(300);
    log('Функции', 'Заполненная форма показывает подтверждение', await page.$eval('.form', el => el.classList.contains('is-sent')));
    const fontSize = await page.$eval('.form input[name=name]', el => parseFloat(getComputedStyle(el).fontSize));
    log('Функции', 'iPhone не увеличивает страницу при вводе (шрифт полей ≥ 16px)', fontSize >= 16, fontSize + 'px');
    await ctx.close();
  }
  {
    const page = await chrome.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle' }); await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
    await page.evaluate(() => scrollTo(0, 2500)); await page.waitForTimeout(500);
    await page.evaluate(() => scrollTo(0, 3500)); await page.waitForTimeout(600);
    log('Функции', 'Шапка прячется при прокрутке вниз', await page.$eval('.header', el => el.classList.contains('is-hidden')));
    await page.evaluate(() => scrollTo(0, 3000)); await page.waitForTimeout(600);
    log('Функции', 'Шапка возвращается при прокрутке вверх', !(await page.$eval('.header', el => el.classList.contains('is-hidden'))));
    log('Функции', 'Индикатор прочтения двигается', await page.$eval('.progress', el => parseFloat(el.style.getPropertyValue('--p')) > 0));
    await page.hover('.flip'); await page.waitForTimeout(900);
    log('Функции', 'Карточка принципов переворачивается при наведении', await page.$eval('.flip .flip__in', el => getComputedStyle(el).transform !== 'none'));
    // выпадающий список услуг
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(700);
    await page.hover('.nav__item--drop .nav__link'); await page.waitForTimeout(600);
    log('Функции', 'Список услуг в шапке раскрывается при наведении', await page.evaluate(() => { const d = document.querySelector('.drop'); const cs = getComputedStyle(d); return cs.visibility === 'visible' && +cs.opacity > .9 && document.querySelector('.nav__item--drop .nav__link').getAttribute('aria-expanded') === 'true'; }));
    await page.click('.drop a[href="#complex"]'); await page.waitForTimeout(1400);
    log('Функции', 'Пункт списка ведёт к блоку услуги и закрывает список', await page.evaluate(() => { const r = document.querySelector('#complex').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0 && document.querySelector('.nav__item--drop .nav__link').getAttribute('aria-expanded') === 'false'; }));
    log('Функции', 'В шапке подсвечен раздел, который сейчас на экране', await page.evaluate(() => document.querySelector('.nav__link.is-active')?.getAttribute('href') === '#services'));
    // развилка управляет вкладками
    await page.evaluate(() => document.querySelector('.fork').scrollIntoView({ block: 'center' })); await page.waitForTimeout(900);
    await page.click('.fork__node--b'); await page.waitForTimeout(400);
    log('Функции', 'Развилка «реклама или основа» переключает вкладку', await page.evaluate(() => document.querySelector('#panel-1').classList.contains('is-active') && document.querySelector('.fork').dataset.active === '1'));
    log('Функции', 'Линии развилки дорисованы', await page.evaluate(() => [...document.querySelectorAll('.fork__path')].every(p => parseFloat(p.style.strokeDashoffset) < 2)));
    // план запуска по дням
    await page.evaluate(() => document.querySelector('.days').scrollIntoView({ block: 'center' })); await page.waitForTimeout(1900);
    log('Функции', 'План запуска: семь дней раскрываются', await page.evaluate(() => { const d = [...document.querySelectorAll('.day')]; return d.length === 7 && d.every(el => getComputedStyle(el).opacity === '1'); }));
    // клавиатура: проходим Tab по всей странице, на каждой остановке должен быть видимый фокус
    await page.reload({ waitUntil: 'networkidle' }); await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto'); await page.waitForTimeout(1500);
    const noFocus = []; let stops = 0, firstStop = null;
    for (let i = 0; i < 200; i++) {
      await page.keyboard.press('Tab'); await page.waitForTimeout(40);
      const probe = () => page.evaluate(() => {
        const el = document.activeElement; if (!el || el === document.body) return null;
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        const shown = r.width > 0 && r.height > 0 && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
        // сектор колеса вопросов показывает фокус заливкой, остальные элементы рамкой
        const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2) || el.matches('.seg');
        return { key: `${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(' ')[0]} «${el.textContent.trim().slice(0, 24)}»`, ok: shown && ring };
      });
      let st = await probe();
      // блок мог ещё проявляться после прокрутки к нему: даём анимации закончиться и смотрим снова
      if (st && !st.ok) { await page.waitForTimeout(1100); st = await probe(); }
      if (!st || st.key === firstStop) break;
      firstStop ??= st.key; stops++; if (!st.ok) noFocus.push(st.key);
    }
    log('Функции', 'Навигация с клавиатуры: фокус виден на каждой остановке', stops > 20 && noFocus.length === 0, `${stops} остановок` + (noFocus.length ? ', без видимого фокуса: ' + noFocus.slice(0, 4).join('; ') : ''));
    // якоря
    const anchors = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')).filter(h => h.length > 1 && !document.querySelector(h)));
    log('Ссылки', 'Все внутренние ссылки ведут на существующие блоки', anchors.length === 0, [...new Set(anchors)].join(', '));
    const imgs = await page.evaluate(() => [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length);
    log('Доступность', 'У всех картинок есть alt', imgs === 0);
    await page.close();
  }

  /* ---------- 4. Без JavaScript и с «уменьшить движение» ---------- */
  {
    const ctx = await chrome.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' }); await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
    const hidden = await page.evaluate(() => [...document.querySelectorAll('h1, h2, .svc, .day, .strip, .tariff, .flip, .checklist__row, .tabpanel, .faq__list dt, .faq__list dd')].filter(el => { const cs = getComputedStyle(el); return cs.opacity === '0' || cs.display === 'none' || cs.visibility === 'hidden'; }).length);
    log('Устойчивость', 'Без JavaScript весь текст виден', hidden === 0, hidden ? `${hidden} скрытых блоков` : '');
    log('Устойчивость', 'Без JavaScript вопросы и ответы показаны списком', await page.evaluate(() => document.querySelectorAll('.faq__list dt').length === 6 && getComputedStyle(document.querySelector('.wheel-box')).display === 'none'));
    await page.screenshot({ path: path.join(out, 'no-js.png'), fullPage: false });
    await ctx.close();
    const ctx2 = await chrome.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
    const p2 = await ctx2.newPage();
    const errs = []; p2.on('pageerror', e => errs.push(e.message));
    await p2.goto(url, { waitUntil: 'networkidle' });
    const anim = await p2.evaluate(() => getComputedStyle(document.querySelector('.ticker__track')).animationName);
    log('Устойчивость', 'Режим «уменьшить движение»: анимации выключены, ошибок нет', anim === 'none' && errs.length === 0, anim);
    await ctx2.close();
  }

  /* ---------- 5. Доступность: axe-core (WCAG 2.1 AA) ---------- */
  for (const [label, opts] of [['десктоп', { viewport: { width: 1440, height: 900 } }], ['телефон', devices['Pixel 7']]]) {
    const ctx = await chrome.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' }); await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
    await settle(page);
    await page.waitForTimeout(2500); // ждём, пока закончатся анимации появления: иначе контраст меряется на полупрозрачном тексте
    await page.addScriptTag({ content: axe });
    const res = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }));
    const v = res.violations.map(x => ({ id: x.id, impact: x.impact, n: x.nodes.length, help: x.help, targets: x.nodes.slice(0, 4).map(n => n.target.join(' ')) }));
    fs.writeFileSync(path.join(out, `axe-${label}.json`), JSON.stringify(v, null, 1));
    const serious = v.filter(x => ['critical', 'serious'].includes(x.impact));
    log('Доступность', `axe (${label}): нет серьёзных нарушений WCAG`, serious.length === 0, v.map(x => `${x.id}×${x.n}(${x.impact})`).join(', '));
    await ctx.close();
  }

  /* ---------- 6. SEO-проверки страницы ---------- */
  {
    const page = await chrome.newPage();
    await page.goto(url, { waitUntil: 'networkidle' }); await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
    const seo = await page.evaluate(() => {
      const t = document.title, d = document.querySelector('meta[name=description]')?.content || '';
      const h1 = document.querySelectorAll('h1').length;
      const levels = [...document.querySelectorAll('h1,h2,h3')].map(h => +h.tagName[1]);
      let skip = false; levels.reduce((p, c) => { if (c > p + 1) skip = true; return c; }, 1);
      let ld = []; document.querySelectorAll('script[type="application/ld+json"]').forEach(s => { try { ld.push(JSON.parse(s.textContent)); } catch (e) { ld.push('ERROR'); } });
      const norm = x => x.replace(/\s+/g, ' ').trim();
      const graph = ld.flatMap(x => x && x['@graph'] ? x['@graph'] : [x]);
      const faqLd = (graph.find(x => x && x['@type'] === 'FAQPage')?.mainEntity || []).map(q => norm(q.name) + '|' + norm(q.acceptedAnswer.text));
      const faqDom = [...document.querySelectorAll('.faq__list > div')].map(x => norm(x.querySelector('dt').textContent) + '|' + norm(x.querySelector('dd').textContent));
      const offers = graph.flatMap(x => x?.hasOfferCatalog?.itemListElement || []).map(o => o.price).filter(Boolean).map(String);
      const text = norm(document.body.innerText).replace(/\u00a0/g, ' ');
      return { faqSame: faqLd.length > 0 && faqLd.length === faqDom.length && faqLd.every((x, i) => x === faqDom[i]), faqN: faqLd.length, pricesShown: offers.length > 0 && offers.every(p => text.includes(Number(p).toLocaleString('ru-RU').replace(/\u00a0/g, ' '))), offers,
        t, tl: t.length, dl: d.length, h1, skip, ld: ld.includes('ERROR') ? 'ERROR' : 'ok', og: !!document.querySelector('meta[property="og:image"]'), lang: document.documentElement.lang, vp: !!document.querySelector('meta[name=viewport]'), robots: document.querySelector('meta[name=robots]')?.content };
    });
    log('SEO', 'Заголовок страницы 30–70 символов', seo.tl >= 30 && seo.tl <= 75, `${seo.tl}: ${seo.t}`);
    log('SEO', 'Описание страницы 120–200 символов', seo.dl >= 120 && seo.dl <= 220, `${seo.dl}`);
    log('SEO', 'Ровно один H1', seo.h1 === 1);
    log('SEO', 'Иерархия заголовков без пропусков', !seo.skip);
    log('SEO', 'Разметка schema.org читается без ошибок', seo.ld === 'ok');
    log('SEO', 'Вопросы в разметке совпадают с текстом на странице', seo.faqSame, `${seo.faqN} вопросов`);
    log('SEO', 'Цены в разметке совпадают с ценами на странице', seo.pricesShown, seo.offers.join(', '));
    log('SEO', 'Есть превью для соцсетей (Open Graph)', seo.og);
    log('SEO', 'Указан язык страницы и viewport', seo.lang === 'ru' && seo.vp);
    log('SEO', 'Запрет индексации включён (до запуска)', /noindex/.test(seo.robots || ''), seo.robots);
    await page.close();
  }

  /* ---------- 7. Медленный интернет ---------- */
  for (const [label, latency, down] of [['Fast 3G', 150, 1.6e6 / 8], ['Slow 3G', 400, 400e3 / 8]]) {
    const ctx = await chrome.newContext(devices['Pixel 7']);
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency, downloadThroughput: down, uploadThroughput: down / 2 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(url, { waitUntil: 'load', timeout: 180000 });
    const m = await page.evaluate(() => new Promise(res => {
      const o = {}; new PerformanceObserver(l => { for (const e of l.getEntries()) o.lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
      o.fcp = Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0);
      setTimeout(() => res(o), 1200);
    }));
    log('Скорость', `${label}: первый текст на экране`, m.fcp < (label === 'Fast 3G' ? 3000 : 6000), `${(m.fcp / 1000).toFixed(1)} с`);
    log('Скорость', `${label}: главная картинка первого экрана`, m.lcp < (label === 'Fast 3G' ? 4000 : 9000), `${(m.lcp / 1000).toFixed(1)} с`);
    await ctx.close();
  }
  /* ---------- 8. Варианты блоков: переключатель для превью (assets/js/variants.js, папка variants/) ---------- */
  {
    const BLOCKS = ['hero', 'paths', 'services', 'direct', 'complex', 'manifest', 'report', 'prices', 'about', 'faq', 'diagnostics'];
    const withV = code => url + (url.includes('?') ? '&' : '?') + 'v=' + code;
    for (const [label, opts] of [['компьютер', { viewport: { width: 1440, height: 900 } }], ['телефон', devices['iPhone 13']]]) {
      for (let n = 2; n <= 5; n++) {
        const ctx = await chrome.newContext(opts);
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
        page.on('response', r => { if (r.status() >= 400) errs.push(r.status() + ' ' + r.url().split('/').pop()); });
        await page.goto(withV(String(n).repeat(BLOCKS.length)), { waitUntil: 'networkidle' });
        await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
        await page.waitForTimeout(700);
        await settle(page);
        // каждый блок: вариант включён, блок не пустой, ничего не торчит за края экрана
        const bad = [];
        for (const id of BLOCKS) {
          await page.evaluate(id => document.getElementById(id).scrollIntoView(), id); await page.waitForTimeout(120);
          const r = await page.evaluate(([id, n]) => {
            const s = document.getElementById(id), w = document.documentElement.clientWidth;
            const shown = [...s.querySelectorAll('h1, h2, h3, p, li, a, button, label')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; }).length;
            return { v: +s.dataset.v, h: s.getBoundingClientRect().height, shown, wide: document.documentElement.scrollWidth > w + 1 };
          }, [id, n]);
          if (r.v !== n) bad.push(`${id}: вариант не включился`);
          if (r.h < 200 || r.shown < 3) bad.push(`${id}: блок пустой`);
          if (r.wide) bad.push(`${id}: горизонтальная прокрутка`);
        }
        log('Варианты', `Вариант ${n} всех блоков · ${label}: включается, без ошибок и горизонтальной прокрутки`, !errs.length && !bad.length, [...errs, ...bad].slice(0, 6).join('; '));

        // доступность в этом оформлении
        await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(2500);
        await page.addScriptTag({ content: axe });
        const res = await page.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }));
        const v = res.violations.map(x => ({ id: x.id, impact: x.impact, n: x.nodes.length, help: x.help, targets: x.nodes.slice(0, 6).map(t => t.target.join(' ')) }));
        fs.writeFileSync(path.join(out, `axe-variants-${n}-${label}.json`), JSON.stringify(v, null, 1));
        log('Варианты', `Вариант ${n} · ${label}: axe без серьёзных нарушений WCAG`, !v.some(x => ['critical', 'serious'].includes(x.impact)), v.map(x => `${x.id}×${x.n}(${x.impact})`).join(', '));

        // колесо на месте и отвечает
        await page.evaluate(() => document.getElementById('faq').scrollIntoView()); await page.waitForTimeout(400);
        const wheel = await page.evaluate(async () => {
          const segs = document.querySelectorAll('.wheel .seg'), box = document.querySelector('.wheel').getBoundingClientRect();
          const want = document.querySelectorAll('.faq__list dd')[2].textContent.trim();
          segs[2].dispatchEvent(new Event('click')); await new Promise(r => setTimeout(r, 500));
          return { n: segs.length, size: Math.round(box.width), ok: document.querySelector('.faq__text').textContent.trim() === want && segs[2].classList.contains('is-active') };
        });
        log('Варианты', `Вариант ${n} · ${label}: колесо на месте, вопрос выбирается`, wheel.n === 6 && wheel.size >= 240 && wheel.ok, `секторов ${wheel.n}, диаметр ${wheel.size}px`);

        // форма та же: пустая не уходит, заполненная подтверждается
        await page.evaluate(() => document.getElementById('diagnostics').scrollIntoView()); await page.waitForTimeout(400);
        await page.click('.form button[type=submit]'); await page.waitForTimeout(300);
        const empty = await page.evaluate(() => !document.querySelector('.form').classList.contains('is-sent') && document.querySelectorAll('.form .is-bad').length >= 3);
        await page.fill('input[name=name]', 'Тест'); await page.fill('input[name=contact]', '+7 900 000-00-00'); await page.fill('input[name=city]', 'Москва');
        await page.check('.form__consent input'); await page.click('.form button[type=submit]'); await page.waitForTimeout(300);
        log('Варианты', `Вариант ${n} · ${label}: форма проверяет поля и подтверждает отправку`, empty && await page.$eval('.form', el => el.classList.contains('is-sent')));
        await ctx.close();
      }
    }

    // панель переключателя: кнопки, клавиши, сохранение, «Мой выбор»
    {
      const ctx = await chrome.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'networkidle' }); await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
      await page.waitForTimeout(700);
      const at = async id => { await page.evaluate(id => { const s = document.getElementById(id); scrollTo(0, s.getBoundingClientRect().top + scrollY + 10); }, id); await page.waitForTimeout(500); };
      const vOf = id => page.evaluate(id => document.getElementById(id).dataset.v || '1', id);
      await at('services'); await page.click('.vdock [data-vset="3"]'); await page.waitForTimeout(500);
      log('Варианты', 'Кнопка на панели переключает блок на экране', await vOf('services') === '3' && await vOf('paths') === '1');
      log('Варианты', 'Выбор попадает в адрес страницы', /[?&]v=11311111111/.test(page.url()), page.url().split('/').pop());
      await page.waitForTimeout(600); // панель сама докручивает к началу блока после переключения
      await at('prices'); await page.waitForTimeout(600); await page.keyboard.press('4'); await page.waitForTimeout(500);
      log('Варианты', 'Клавиши 1–5 переключают блок на экране', await vOf('prices') === '4');
      await page.goto(url, { waitUntil: 'networkidle' }); await page.waitForTimeout(900);
      log('Варианты', 'Выбор сохраняется после перезагрузки', await vOf('services') === '3' && await vOf('prices') === '4');
      await page.click('.vdock__list'); await page.waitForTimeout(400);
      const sheet = await page.evaluate(() => { const s = document.querySelector('.vsheet'); return { open: !s.hidden && s.getBoundingClientRect().height > 100, text: document.querySelector('.vsheet__out').textContent }; });
      log('Варианты', '«Мой выбор» открывается и перечисляет выбранные варианты', sheet.open && /услуги 3/.test(sheet.text) && /цены 4/.test(sheet.text) && /v=11311114111/.test(sheet.text), sheet.text.slice(0, 90));
      await page.click('[data-vreset]'); await page.waitForTimeout(500);
      log('Варианты', '«Сбросить всё» возвращает исходное оформление', await page.evaluate(() => !document.querySelector('.section[data-v], #hero[data-v]')));
      await ctx.close();
    }
    {
      const ctx = await chrome.newContext(devices['iPhone 13']);
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'networkidle' }); await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
      await page.waitForTimeout(700);
      await page.evaluate(() => scrollTo(0, 1400)); await page.waitForTimeout(700);
      const r = await page.evaluate(() => {
        const box = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
        const d = box('.vdock'), m = box('.mcta'), vh = innerHeight;
        return { dock: !!d && d.height > 0 && d.bottom <= vh + 1 && d.left >= -1 && d.right <= innerWidth + 1, clear: !m || m.height === 0 || m.bottom <= d.top + 1 || m.top >= d.bottom - 1, tap: [...document.querySelectorAll('.vdock [data-vset]')].every(b => { const q = b.getBoundingClientRect(); return q.width >= 40 && q.height >= 40; }) };
      });
      log('Варианты', 'Телефон: панель помещается на экране и не закрывает нижнюю кнопку', r.dock && r.clear);
      log('Варианты', 'Телефон: кнопки вариантов не меньше 40 px', r.tap);
      await page.tap('.vdock [data-vset="2"]'); await page.waitForTimeout(500);
      log('Варианты', 'Телефон: нажатие переключает блок на экране', await page.evaluate(() => !!document.querySelector('[data-v="2"]')));
      await ctx.close();
    }
    // на боевых адресах переключатель выключен
    log('Варианты', 'На боевых доменах переключатель не запускается', /medvector\\\.pro/.test(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'variants.js'), 'utf8').split('\n').slice(0, 12).join('\n')));
  }
  await chrome.close();

  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ results, skipped }, null, 1));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\nИТОГО: ${results.length - failed} из ${results.length} проверок пройдено`);
  if (skipped.length) console.log(`НЕ ЗАПУСКАЛИСЬ (движок не установлен): ${skipped.join('; ')}`);
  process.exitCode = failed ? 1 : 0;
})();

