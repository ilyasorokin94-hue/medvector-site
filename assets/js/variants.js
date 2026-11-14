// МедВектор — переключатель вариантов оформления блоков.
// Работает только в превью: на боевых адресах панель не появляется, страница остаётся как есть.
// Вариант 1 — исходная вёрстка. Варианты 2–5 лежат в variants/<блок>.html: стили и, где нужно, дополнительная разметка.
(() => {
  if (/(^|\.)(medvector\.pro|med-vector\.ru|med-vector\.online|medvectoragency\.ru)$/.test(location.hostname)) return;
  const BLOCKS = [
    ['hero', 'Первый экран'], ['paths', 'С чего начать'], ['services', 'Услуги'], ['direct', 'Яндекс Директ'],
    ['complex', 'Комплексный маркетинг'], ['manifest', 'Наш принцип'], ['report', 'Отчёт'], ['prices', 'Цены'],
    ['about', 'Об агентстве'], ['faq', 'Вопросы'], ['diagnostics', 'Диагностика'],
  ];
  const N = 5, KEY = 'mv-variants', KEY_MIN = 'mv-variants-min';
  const base = new URL('../../', document.currentScript.src);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const sec = {};
  for (const [id] of BLOCKS) { sec[id] = document.getElementById(id); if (!sec[id]) return; }

  /* ---------- выбор: из ссылки (?v=31245…), иначе из памяти браузера ---------- */
  const sel = Object.fromEntries(BLOCKS.map(([id]) => [id, 1]));
  const fromUrl = new URLSearchParams(location.search).get('v') || '';
  if (new RegExp(`^[1-${N}]{${BLOCKS.length}}$`).test(fromUrl)) [...fromUrl].forEach((c, i) => sel[BLOCKS[i][0]] = +c);
  else try {
    const saved = JSON.parse(localStorage.getItem(KEY)) || {};
    for (const [id] of BLOCKS) if (saved[id] >= 1 && saved[id] <= N) sel[id] = Math.round(saved[id]);
  } catch (e) {}
  const code = () => BLOCKS.map(([id]) => sel[id]).join('');
  const link = () => { const u = new URL(location.href); u.hash = ''; if (/[^1]/.test(code())) u.searchParams.set('v', code()); else u.searchParams.delete('v'); return u; };
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch (e) {}
    const u = link(); u.hash = location.hash;
    history.replaceState(null, '', u);
  };

  /* ---------- загрузка вариантов блока ---------- */
  const parts = {};
  const load = id => parts[id] ||= fetch(new URL(`variants/${id}.html`, base)).then(r => r.ok ? r.text() : '').then(html => {
    const box = document.createElement('div'); box.innerHTML = html;
    box.querySelectorAll('style').forEach(s => document.head.appendChild(s));
    const map = {};
    box.querySelectorAll('template').forEach(t => (map[t.dataset.v] ||= []).push(t));
    return map;
  }).catch(() => ({}));

  /* ---------- оживление добавленной разметки: появление, заголовки по словам, наклон карточек ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in'); io.unobserve(e.target);
  }), { threshold: .12, rootMargin: '0px 0px -5% 0px' });
  const init = root => {
    root.querySelectorAll('[data-vsplit]').forEach(h => {
      let i = 0;
      h.innerHTML = h.textContent.trim().split(/[ \n\t\r]+/).map(w => `<span class="w"><span style="--i:${i++}">${w}</span></span>`).join(' ');
      io.observe(h);
    });
    root.querySelectorAll('.vr').forEach((el, i) => { el.style.setProperty('--d', i % 5); io.observe(el); });
    if (fine && !reduce) root.querySelectorAll('[data-vtilt]').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = `rotate(var(--rz, 0deg)) perspective(900px) rotateY(${(x - .5) * 10}deg) rotateX(${(.5 - y) * 8}deg) translateZ(10px)`;
      });
      card.addEventListener('mouseleave', () => card.style.transform = '');
    });
  };

  const apply = async id => {
    const s = sec[id], map = await load(id), n = sel[id];
    for (const t of map[n] || []) {
      if (t._done) continue; t._done = true;
      const vx = document.createElement(t.dataset.tag || 'div');
      vx.className = 'vx' + (t.dataset.cls ? ' ' + t.dataset.cls : ''); vx.dataset.vx = n;
      vx.appendChild(t.content.cloneNode(true));
      const host = t.dataset.into ? s.querySelector(t.dataset.into) : s;
      if (t.dataset.before) host.insertBefore(vx, host.querySelector(t.dataset.before)); else host.appendChild(vx);
      init(vx);
    }
    s.querySelectorAll('.vx').forEach(x => x.hidden = +x.dataset.vx !== n);
    if (n === 1) { s.removeAttribute('data-v'); s.removeAttribute('data-vmode'); }
    else { s.dataset.v = n; s.dataset.vmode = (map[n] || []).some(t => t.dataset.mode === 'swap') ? 'swap' : 'css'; }
    syncWheel();
    // колесо доворачивается под новое расположение ответа
    if (id === 'faq' && wheel) { const g = wheel.querySelector('.seg.is-active'); if (g) g.dispatchEvent(new Event('click')); }
    dispatchEvent(new Event('resize')); // основной скрипт пересчитывает шапку, линии и параллакс
  };

  /* ---------- общие обработчики для разметки вариантов ---------- */
  document.addEventListener('click', e => {
    const tab = e.target.closest('[data-vtab]');
    if (tab) {
      const box = tab.closest('[data-vtabs]'), i = tab.dataset.vtab;
      box.querySelectorAll('[data-vtab]').forEach(t => { const on = t.dataset.vtab === i; t.classList.toggle('is-on', on); t.setAttribute('aria-pressed', on); });
      box.querySelectorAll('[data-vpanel]').forEach(p => p.classList.toggle('is-on', p.dataset.vpanel === i));
      return;
    }
    // список вопросов рядом с колесом: нажатие поворачивает колесо
    const q = e.target.closest('[data-seg]');
    if (q) { const g = document.querySelectorAll('.wheel .seg')[+q.dataset.seg]; if (g) g.dispatchEvent(new Event('click')); }
  });
  const wheel = document.querySelector('.wheel');
  function syncWheel() {
    if (!wheel) return;
    const on = [...wheel.querySelectorAll('.seg')].findIndex(g => g.classList.contains('is-active'));
    document.querySelectorAll('[data-seg]').forEach(b => { const a = +b.dataset.seg === on; b.classList.toggle('is-on', a); b.setAttribute('aria-pressed', a); });
  }
  if (wheel) new MutationObserver(syncWheel).observe(wheel, { subtree: true, attributes: true, attributeFilter: ['class'] });

  /* ---------- панель переключателя ---------- */
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL('assets/css/variants.css', base);
  document.head.appendChild(css);

  const dock = document.createElement('aside');
  dock.className = 'vdock'; dock.setAttribute('aria-label', 'Варианты оформления блоков'); dock.hidden = true;
  dock.innerHTML = `
    <button type="button" class="vdock__open" data-vmin aria-label="Показать панель вариантов">Варианты</button>
    <div class="vdock__bar">
      <button type="button" class="vdock__nav" data-vnav="-1" aria-label="Предыдущий блок">‹</button>
      <p class="vdock__name" aria-live="polite"><small></small><b></b></p>
      <button type="button" class="vdock__nav" data-vnav="1" aria-label="Следующий блок">›</button>
      <div class="vdock__nums" role="group" aria-label="Вариант этого блока">
        ${Array.from({ length: N }, (_, i) => `<button type="button" data-vset="${i + 1}" aria-pressed="false" aria-label="Вариант ${i + 1}">${i + 1}</button>`).join('')}
      </div>
      <button type="button" class="vdock__list" aria-expanded="false" aria-controls="vsheet" aria-label="Мой выбор"><span>Мой выбор</span><i aria-hidden="true">☰</i></button>
      <button type="button" class="vdock__min" data-vmin aria-label="Свернуть панель вариантов">×</button>
    </div>
    <div class="vsheet" id="vsheet" hidden>
      <p class="vsheet__title">Мой выбор</p>
      <ol class="vsheet__rows">${BLOCKS.map(([, name], i) => `<li><button type="button" data-vgo="${i}"><span>${name}</span><b></b></button></li>`).join('')}</ol>
      <p class="vsheet__out"></p>
      <div class="vsheet__btns">
        <button type="button" data-vcopy>Скопировать выбор</button>
        <button type="button" data-vreset>Сбросить всё</button>
      </div>
    </div>`;
  document.body.appendChild(dock);
  const $ = s => dock.querySelector(s), $$ = s => [...dock.querySelectorAll(s)];
  const nameSmall = $('.vdock__name small'), nameB = $('.vdock__name b'), sheet = $('.vsheet'), listBtn = $('.vdock__list');
  let cur = 0, lockUntil = 0, fixTimer = 0;

  const summary = () => 'Мой выбор: ' + BLOCKS.map(([id, name]) => `${name.toLowerCase().replace('яндекс директ', 'Яндекс Директ')} ${sel[id]}`).join(', ') + '. Ссылка: ' + link();
  const render = () => {
    const [id, name] = BLOCKS[cur];
    nameSmall.textContent = `Блок ${cur + 1} из ${BLOCKS.length}`; nameB.textContent = name;
    $$('[data-vset]').forEach(b => { const on = +b.dataset.vset === sel[id]; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
    $$('[data-vgo]').forEach((b, i) => { b.querySelector('b').textContent = 'вариант ' + sel[BLOCKS[i][0]]; b.classList.toggle('is-cur', i === cur); });
    $('.vsheet__out').textContent = summary();
  };
  const detect = () => {
    if (performance.now() < lockUntil) return;
    const y = innerHeight * .42; let best = 0, bd = Infinity;
    BLOCKS.forEach(([id], i) => {
      const r = sec[id].getBoundingClientRect();
      const d = r.top <= y && r.bottom >= y ? 0 : Math.min(Math.abs(r.top - y), Math.abs(r.bottom - y));
      if (d < bd) { bd = d; best = i; }
    });
    if (best !== cur) { cur = best; render(); }
  };
  let tick = false;
  addEventListener('scroll', () => { if (!tick) { tick = true; requestAnimationFrame(() => { tick = false; detect(); }); } }, { passive: true });

  const goTo = (i, smooth) => {
    cur = i; lockUntil = performance.now() + 900; render();
    const top = sec[BLOCKS[i][0]].getBoundingClientRect().top + scrollY - (i ? 64 : 0);
    scrollTo({ top, behavior: smooth && !reduce ? 'smooth' : 'instant' });
    // нижние блоки дорисовываются по мере прокрутки и меняют высоту: после остановки проверяем, что попали в начало блока
    clearTimeout(fixTimer);
    fixTimer = setTimeout(() => {
      if (cur !== i) return;
      const off = sec[BLOCKS[i][0]].getBoundingClientRect().top - (i ? 64 : 0);
      if (Math.abs(off) > 24) { lockUntil = performance.now() + 300; scrollTo({ top: scrollY + off, behavior: 'instant' }); }
    }, smooth && !reduce ? 800 : 80);
  };
  const set = async n => {
    const id = BLOCKS[cur][0];
    if (sel[id] === n) return;
    sel[id] = n; save(); render();
    lockUntil = performance.now() + 700;
    await apply(id);
    // если блок начат выше экрана, возвращаемся к его началу: новый вариант видно с первой строки
    const top = sec[id].getBoundingClientRect().top;
    if (top < 0 || top > innerHeight * .6) goTo(cur, false);
  };
  const setMin = min => {
    dock.classList.toggle('is-min', min); document.body.classList.toggle('vdock-on', !min);
    if (min) openSheet(false);
    try { localStorage.setItem(KEY_MIN, min ? '1' : ''); } catch (e) {}
  };
  const openSheet = open => { sheet.hidden = !open; listBtn.setAttribute('aria-expanded', open); if (open) render(); };

  dock.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.vset) set(+b.dataset.vset);
    else if (b.dataset.vnav) goTo((cur + +b.dataset.vnav + BLOCKS.length) % BLOCKS.length, true);
    else if (b.dataset.vgo) { openSheet(false); goTo(+b.dataset.vgo, true); }
    else if (b === listBtn) openSheet(sheet.hidden);
    else if ('vmin' in b.dataset) setMin(!dock.classList.contains('is-min'));
    else if ('vreset' in b.dataset) { for (const [id] of BLOCKS) sel[id] = 1; save(); render(); for (const [id] of BLOCKS) await apply(id); }
    else if ('vcopy' in b.dataset) {
      const text = summary(), done = () => { b.textContent = 'Скопировано'; setTimeout(() => b.textContent = 'Скопировать выбор', 2200); };
      const manual = () => { const r = document.createRange(); r.selectNodeContents($('.vsheet__out')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); try { document.execCommand('copy'); done(); } catch (er) {} };
      if (navigator.clipboard && isSecureContext) navigator.clipboard.writeText(text).then(done, manual); else manual();
    }
  });
  // цифры 1–5 на клавиатуре переключают вариант блока, который сейчас на экране
  addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey || e.altKey || dock.classList.contains('is-min')) return;
    if (e.target.closest('input, textarea, select, [contenteditable]')) return;
    if (e.key === 'Escape' && !sheet.hidden) openSheet(false);
    if (e.key >= '1' && e.key <= String(N)) set(+e.key);
  });
  document.addEventListener('click', e => { if (!sheet.hidden && !dock.contains(e.target)) openSheet(false); });

  /* ---------- запуск ---------- */
  const start = async () => {
    dock.hidden = false;
    let min = false; try { min = localStorage.getItem(KEY_MIN) === '1'; } catch (e) {}
    setMin(min);
    for (const [id] of BLOCKS) if (sel[id] !== 1) await apply(id);
    if (/[^1]/.test(code())) save();
    detect(); render();
    // остальные варианты подгружаем в фоне, чтобы переключение было мгновенным
    const idle = window.requestIdleCallback || (f => setTimeout(f, 600));
    idle(() => BLOCKS.forEach(([id]) => load(id)));
  };
  css.addEventListener('load', start); css.addEventListener('error', start);
})();
