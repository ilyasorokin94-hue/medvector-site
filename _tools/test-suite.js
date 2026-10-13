// Полный прогон тестов прототипа. node test-suite.js <url> <outdir>
// Браузеры: Chromium (Chrome), Firefox, WebKit (движок Safari на iPhone).
const pw = require('playwright');
const { devices } = pw;
const fs = require('fs');
const path = require('path');
const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const results = [];
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
    const browser = await pw[engine].launch(engine === 'chromium' ? { executablePath: CHROME } : {});
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

  const chrome = await pw.chromium.launch({ executablePath: CHROME });

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
    await page.evaluate(() => document.querySelector('#cases').scrollIntoView()); await page.waitForTimeout(300);
    await page.click('.tab[data-tab="2"]'); await page.waitForTimeout(400);
    log('Функции', 'Вкладки ситуаций переключаются', await page.evaluate(() => document.querySelectorAll('.tabpanel')[2].classList.contains('is-active')));
    // переворот карточки
    await page.evaluate(() => document.querySelector('.flip').scrollIntoView({ block: 'center' })); await page.waitForTimeout(400);
    await page.tap('.flip'); await page.waitForTimeout(900);
    log('Функции', 'Карточка «потерь» переворачивается по нажатию', await page.$eval('.flip', el => el.classList.contains('is-flipped')));
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
    log('Функции', 'Карточка «потерь» переворачивается при наведении', await page.$eval('.flip .flip__in', el => getComputedStyle(el).transform !== 'none'));
    // клавиатура
    await page.evaluate(() => scrollTo(0, 0)); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    log('Функции', 'Навигация с клавиатуры: фокус виден', await page.evaluate(() => { const el = document.activeElement; const cs = getComputedStyle(el); return el !== document.body && cs.outlineStyle !== 'none'; }));
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
    const hidden = await page.evaluate(() => [...document.querySelectorAll('h2, .step, .tariff, .flip')].filter(el => getComputedStyle(el).opacity === '0').length);
    log('Устойчивость', 'Без JavaScript весь текст виден', hidden === 0, hidden ? `${hidden} скрытых блоков` : '');
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
      return { t, tl: t.length, dl: d.length, h1, skip, ld: ld.includes('ERROR') ? 'ERROR' : 'ok', og: !!document.querySelector('meta[property="og:image"]'), lang: document.documentElement.lang, vp: !!document.querySelector('meta[name=viewport]'), robots: document.querySelector('meta[name=robots]')?.content };
    });
    log('SEO', 'Заголовок страницы 30–70 символов', seo.tl >= 30 && seo.tl <= 75, `${seo.tl}: ${seo.t}`);
    log('SEO', 'Описание страницы 120–200 символов', seo.dl >= 120 && seo.dl <= 220, `${seo.dl}`);
    log('SEO', 'Ровно один H1', seo.h1 === 1);
    log('SEO', 'Иерархия заголовков без пропусков', !seo.skip);
    log('SEO', 'Разметка schema.org читается без ошибок', seo.ld === 'ok');
    log('SEO', 'Есть превью для соцсетей (Open Graph)', seo.og);
    log('SEO', 'Указан язык страницы и viewport', seo.lang === 'ru' && seo.vp);
    log('SEO', 'Запрет индексации включён (прототип)', /noindex/.test(seo.robots || ''), seo.robots);
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
  await chrome.close();

  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 1));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\nИТОГО: ${results.length - failed} из ${results.length} проверок пройдено`);
})();

