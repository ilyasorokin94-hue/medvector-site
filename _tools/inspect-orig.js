// Изучение шапки и анимаций текущего лендинга medvectoragency.ru
const { chromium, devices } = require('playwright-core');
const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('https://medvectoragency.ru/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const h = document.querySelector('header') || document.querySelector('nav');
    const cs = h && getComputedStyle(h);
    const logo = document.querySelector('img[alt="Мед Вектор"]');
    const lr = logo.getBoundingClientRect();
    const lc = getComputedStyle(logo.parentElement);
    // какие анимации/переходы объявлены в CSS
    const anims = new Set();
    for (const ss of document.styleSheets) { try { for (const r of ss.cssRules) { if (r.type === 7) anims.add(r.name); } } catch (e) {} }
    return {
      header: h && { tag: h.tagName, pos: cs.position, h: h.getBoundingClientRect().height, bg: cs.backgroundColor, cls: h.className },
      logo: { w: lr.width, h: lr.height, x: lr.x, y: lr.y, parentCls: logo.parentElement.className, parentTransform: lc.transform, parentPad: lc.padding },
      keyframes: [...anims],
      headerHTML: h && h.outerHTML.slice(0, 1500),
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await page.screenshot({ path: out + '/orig-header-top.png', clip: { x: 0, y: 0, width: 1440, height: 160 } });
  await page.evaluate(() => window.scrollTo(0, 1500)); await page.waitForTimeout(1200);
  await page.screenshot({ path: out + '/orig-header-scrolled.png', clip: { x: 0, y: 0, width: 1440, height: 160 } });
  const m = await browser.newPage({ ...devices['iPhone 13'] });
  await m.goto('https://medvectoragency.ru/', { waitUntil: 'networkidle' }); await m.waitForTimeout(3000);
  await m.screenshot({ path: out + '/orig-mobile-top.png' });
  await m.evaluate(() => window.scrollTo(0, 1500)); await m.waitForTimeout(1200);
  await m.screenshot({ path: out + '/orig-mobile-scrolled.png' });
  await browser.close();
})();
