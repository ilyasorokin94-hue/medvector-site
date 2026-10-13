// node shoot.js <url> <outdir> [width] [height]
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const [url, out, w = '1440', h = '900'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  // walk through the page so scroll-triggered animations fire
  for (let y = 0; y < total; y += +h / 2) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1200);
  let i = 1;
  for (let y = 0; y < total; y += +h) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(out, `screen-${String(i++).padStart(2, '0')}.png`) });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, 'full-page.png'), fullPage: true });
  console.log('height', total, 'screens', i - 1);
  await browser.close();
})();
