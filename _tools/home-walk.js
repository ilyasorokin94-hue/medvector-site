// Проход по главной экран за экраном: node _tools/home-walk.js <адрес> <папка> [ширина=1440] [высота=900] [телефон=0]
// Прокручивает страницу шагами в один экран, ждёт анимации и сохраняет снимок каждого экрана. По ним видно страницу так, как её видит человек.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [url, out, w = '1440', h = '900', mobile = '0'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, hasTouch: mobile === '1', isMobile: mobile === '1' });
  const p = await ctx.newPage();
  p.on('pageerror', e => console.log('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('console: ' + m.text()); });
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const total = await p.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.round(+h * 0.9);
  let n = 0;
  for (let y = 0; y < total; y += step) {
    await p.evaluate(v => window.scrollTo(0, v), y);
    await p.waitForTimeout(500);
    // анимации идут по кадрам: даём им доиграть
    await p.evaluate(() => new Promise(r => { let k = 0; const f = () => (++k > 110 ? r() : requestAnimationFrame(f)); f(); }));
    await p.screenshot({ path: out + '/' + String(n++).padStart(2, '0') + '.png' });
  }
  console.log('экранов', n, '| высота страницы', total);
  await b.close();
})();
