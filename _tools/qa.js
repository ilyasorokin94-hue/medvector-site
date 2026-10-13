// Проверка прототипа: десктоп, iPhone, Android, медленный интернет.
// node qa.js <url> <outdir>
const { chromium, devices } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const [url, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });

const configs = [
  { name: 'desktop', opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'iphone', opts: { ...devices['iPhone 13'] } },
  { name: 'android', opts: { ...devices['Pixel 7'] } },
];

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  for (const c of configs) {
    const ctx = await browser.newContext(c.opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const vh = page.viewportSize().height;
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += vh / 2) { await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(140); }
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(() => {
      const w = document.documentElement.clientWidth;
      return [...document.querySelectorAll('body *')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.right > w + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.ticker, .tariffs, .tabs, .journey__steps, .losses__panel, .site__frame, .faq__panel');
      }).slice(0, 8).map(el => el.className || el.tagName);
    });
    const small = await page.evaluate(() => [...document.querySelectorAll('a, button')].filter(el => {
      const r = el.getBoundingClientRect(); return r.width > 0 && (r.height < 40 && r.width < 40);
    }).slice(0, 8).map(el => (el.textContent || el.className).trim().slice(0, 30)));
    // кадры по экранам
    let i = 1;
    for (let y = 0; y < total; y += vh) {
      await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(450);
      await page.screenshot({ path: path.join(out, `${c.name}-${String(i++).padStart(2, '0')}.png`) });
    }
    // меню на телефоне
    if (c.name !== 'desktop') {
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400);
      await page.click('.burger'); await page.waitForTimeout(700);
      await page.screenshot({ path: path.join(out, `${c.name}-menu.png`) });
      await page.click('.burger'); await page.waitForTimeout(400);
    }
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, `${c.name}-full.png`), fullPage: true });
    console.log(JSON.stringify({ device: c.name, height: total, screens: i - 1, errors, overflow, smallTargets: small }));
    await ctx.close();
  }

  // медленный интернет: «Slow 4G» и «3G» на телефоне
  for (const [label, net] of [['slow-4g', { latency: 150, down: 1.6e6 / 8 * 1.0, up: 750e3 / 8 }], ['3g', { latency: 300, down: 400e3 / 8 * 1.0, up: 400e3 / 8 }]]) {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: net.latency, downloadThroughput: net.down, uploadThroughput: net.up });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    let bytes = 0;
    page.on('response', async r => { try { const b = await r.body(); bytes += b.length; } catch (e) {} });
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    const loadMs = Date.now() - t0;
    const m = await page.evaluate(() => new Promise(res => {
      const o = {};
      new PerformanceObserver(l => { for (const e of l.getEntries()) o.lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      o.fcp = fcp && Math.round(fcp.startTime);
      let cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; o.cls = +cls.toFixed(3); }).observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => res(o), 1500);
    }));
    await page.screenshot({ path: path.join(out, `${label}-first-screen.png`) });
    console.log(JSON.stringify({ network: label, loadMs, ...m, transferredKB: Math.round(bytes / 1024) }));
    await ctx.close();
  }
  await browser.close();
})();
