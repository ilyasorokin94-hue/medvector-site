// Картинка для превью ссылки: node og.js [url макета]. Снимает og.html в assets/img/og-cover.jpg (1200×630).
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const url = process.argv[2] || 'http://127.0.0.1:8099/_tools/og.html';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(__dirname, '../assets/img/og-cover.jpg'), type: 'jpeg', quality: 86 });
  await browser.close();
  console.log('ok og-cover.jpg');
})();
