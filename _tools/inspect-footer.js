// Снимок футера medvectoragency.ru (десктоп и телефон) и его разметка
const { chromium, devices } = require('playwright-core');
const out = process.argv[2];
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  for (const [name, opts] of [['desk', { viewport: { width: 1440, height: 900 } }], ['mob', devices['iPhone 13']]]) {
    const page = await browser.newPage(opts);
    await page.goto('https://medvectoragency.ru/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 400) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(80); }
    await page.waitForTimeout(1500);
    const f = await page.$('footer');
    await f.scrollIntoViewIfNeeded(); await page.waitForTimeout(1500);
    await f.screenshot({ path: `${out}/orig-footer-${name}.png` });
    if (name === 'desk') console.log(await page.evaluate(() => {
      const f = document.querySelector('footer');
      const cs = getComputedStyle(f);
      return JSON.stringify({ h: f.getBoundingClientRect().height, bg: cs.backgroundColor, html: f.outerHTML.slice(0, 2500) });
    }));
    await page.close();
  }
  await browser.close();
})();
