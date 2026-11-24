// Разбор замечаний по главной: node _tools/home-audit.js <адрес> [ширины=320,375,390,768,1024,1280,1440,1920]
// Печатает, какие элементы дают прокрутку вбок на каждой ширине, и подробности замечаний axe (WCAG 2.1 AA) на телефоне и на компьютере.
const { chromium } = require('playwright');
const fs = require('fs');
const axe = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
(async () => {
  const [url, ws = '320,375,390,768,1024,1280,1440,1920'] = process.argv.slice(2);
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const settle = async p => {
    const h = await p.evaluate(() => document.documentElement.scrollHeight), vh = p.viewportSize().height;
    for (let y = 0; y < h; y += vh / 2) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(40); }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
  };
  let bad = 0;
  for (const w of ws.split(',')) {
    const p = await (await b.newContext({ viewport: { width: +w, height: 860 } })).newPage();
    await p.goto(url, { waitUntil: 'networkidle' }); await settle(p);
    const r = await p.evaluate(() => {
      const de = document.documentElement, over = de.scrollWidth - de.clientWidth, out = [];
      if (over > 0) document.querySelectorAll('body *').forEach(e => {
        const r = e.getBoundingClientRect(); if (!r.width || r.right <= de.clientWidth + 1) return;
        let a = e.parentElement, clipped = false;
        while (a && a !== document.body) { if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(a).overflowX)) { clipped = true; break; } a = a.parentElement; }
        if (!clipped && out.length < 6) out.push((e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className || e.tagName) + ' +' + Math.round(r.right - de.clientWidth));
      });
      return { over, out };
    });
    if (r.over > 0) { bad++; console.log('ширина ' + w + ': лишние ' + r.over + 'px: ' + r.out.join(' | ')); }
    await p.close();
  }
  console.log(bad ? 'прокрутка вбок на ' + bad + ' ширинах' : 'прокрутки вбок нет');
  for (const [name, vp] of [['компьютер', { width: 1440, height: 900 }], ['телефон', { width: 390, height: 844 }]]) {
    const p = await (await b.newContext({ viewport: vp })).newPage();
    await p.goto(url, { waitUntil: 'networkidle' }); await settle(p);
    await p.waitForTimeout(3500); // появления блоков должны доиграть, иначе контраст считается по полупрозрачному тексту
    await p.addScriptTag({ content: axe });
    const v = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })).violations.map(x => ({ id: x.id, nodes: x.nodes.map(n => n.target.join(' ') + ' :: ' + (n.any[0] ? n.any[0].message : n.failureSummary).slice(0, 170)) })));
    console.log('axe, ' + name + ': ' + (v.length ? '' : 'замечаний нет'));
    v.forEach(x => { console.log('  ' + x.id); x.nodes.forEach(n => console.log('    ' + n)); });
    await p.close();
  }
  await b.close();
})();
