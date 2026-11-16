/* МедВектор, «Траектория»: линия-вектор, появление по строкам, заливка фразы, круг, счётчики,
   шапка, меню, форма, курсор «+», магнитные кнопки и плавная прокрутка (Lenis, только мышь). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');  let vh = innerHeight;

  /* ---------- плавная прокрутка ---------- */
  let lenis = null;
  if (fine && !reduce && window.Lenis) {
    lenis = new Lenis({ autoRaf: true, lerp: 0.11, anchors: { offset: -16 }, stopInertiaOnNavigate: true });
    window.__lenis = lenis;
  }

  /* ---------- шапка прячется при прокрутке вниз ---------- */
  const hdr = $('.hdr');
  const mcta = $('.mcta');
  const start = $('#start');
  let lastY = scrollY, menuOpen = false, keepHeader = 0;
  document.addEventListener('click', e => { if (e.target.closest('a[href*="#"]')) keepHeader = performance.now() + 1200; });
  const onHeader = () => {
    const y = scrollY;
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 8);
      if (!menuOpen && y > 400 && y > lastY + 4 && performance.now() > keepHeader) hdr.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 400) hdr.classList.remove('is-hidden');
    }
    if (mcta) {
      const sr = start && start.getBoundingClientRect();
      mcta.classList.toggle('is-on', y > vh * 0.8 && !(sr && sr.top < vh));
    }
    lastY = y;
  };

  /* ---------- мобильное меню ---------- */
  const burger = $('.burger'), mnav = $('#mnav');
  const setMenu = open => {
    menuOpen = open;
    root.classList.toggle('is-menu', open);
    mnav.classList.toggle('is-open', open);
    mnav.inert = !open;
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (lenis) open ? lenis.stop() : lenis.start();
    if (open) hdr.classList.remove('is-hidden');
  };
  if (burger && mnav) {
    burger.addEventListener('click', () => setMenu(!menuOpen));
    mnav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
    matchMedia('(min-width: 1021px)').addEventListener('change', e => { if (e.matches && menuOpen) setMenu(false); });
  }

  /* ---------- заголовки: слова в маске, строки поднимаются по очереди ---------- */
  const splitWords = el => {
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          // неразрывный пробел не делит слова: «в&nbsp;Яндексе» поднимается одним куском
          const parts = n.textContent.split(/([ \t\n\r]+)/);
          if (parts.every(p => !p.trim())) return;
          const frag = document.createDocumentFragment();
          parts.forEach(p => {
            if (!p) return;
            if (!p.trim()) { frag.append(p); return; }
            const m = document.createElement('span'); m.className = 'wm';
            const i = document.createElement('span'); i.className = 'wi'; i.textContent = p;
            m.append(i); frag.append(m);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && !n.matches('svg, .vec-arrow')) walk(n);
      });
    };
    walk(el);
    // номер строки по вертикальному положению слова
    let top = null, line = -1;
    $$('.wm', el).forEach(w => { const t = Math.round(w.offsetTop); if (t !== top) { top = t; line++; } w.style.setProperty('--l', line); });
  };
  const heads = reduce ? [] : $$('.h1, main .h2');
  heads.forEach(splitWords);

  /* ---------- появление блоков ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add(e.target.classList.contains('reveal') ? 'is-in' : 'is-shown');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px' });
  if (reduce) $$('.reveal').forEach(el => el.classList.add('is-in'));
  else { $$('.reveal').forEach(el => io.observe(el)); heads.forEach(h => io.observe(h)); }
  // первый экран показываем сразу
  const h1 = $('.h1');
  if (h1 && !reduce) requestAnimationFrame(() => requestAnimationFrame(() => h1.classList.add('is-shown')));

  /* ---------- фраза: слова загораются по мере прокрутки ---------- */
  const fills = $$('[data-fill]').map(el => {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(p => {
          if (!p) return;
          if (!p.trim()) { frag.append(p); return; }
          const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.append(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
    return { el, words: $$('.w', el) };
  });
  const onFill = () => fills.forEach(({ el, words }) => {
    const r = el.getBoundingClientRect();
    const p = reduce ? 1 : clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
  });

  /* ---------- круг растёт до тёмного экрана ---------- */
  const track = $('.circle__track'), disc = $('.circle__disc'), cin = $('.circle__in');
  const onCircle = () => {
    if (!track || reduce) return;
    const r = track.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
    const s = clamp(p / 0.62, 0, 1) ** 1.7;
    disc.style.setProperty('--s', s.toFixed(4));
    cin.style.setProperty('--o', clamp((p - 0.48) / 0.25, 0, 1).toFixed(3));
  };

  /* ---------- счётчики ---------- */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, t0 = performance.now(), dur = 1200;
    const tick = t => { const k = clamp((t - t0) / dur, 0, 1), v = Math.round(end * (1 - (1 - k) ** 3)); el.textContent = 'sep' in el.dataset ? fmt(v) : v; if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  if (!reduce) $$('[data-count]').forEach(el => { if (+el.dataset.count > 1) { el.textContent = '0'; cio.observe(el); } });

  /* ---------- вкладки: имплантация и All-on-4 ---------- */
  $$('[data-tabs]').forEach(box => {
    const btns = $$('[role="tab"]', box), panels = btns.map(b => document.getElementById(b.getAttribute('aria-controls')));
    const show = (i, focus) => {
      btns.forEach((b, k) => {
        const on = k === i;
        b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
        panels[k].classList.toggle('is-enter', on);
        if (on) $$('.reveal', panels[k]).forEach(el => el.classList.add('is-in'));
      });
      if (focus) btns[i].focus();
    };
    btns.forEach((b, i) => {
      b.addEventListener('click', () => show(i));
      b.addEventListener('keydown', e => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (step) { e.preventDefault(); show((i + step + btns.length) % btns.length, true); }
      });
    });
    const byHash = () => { const i = panels.findIndex(p => '#' + p.id === location.hash); if (i >= 0) show(i); return i >= 0; };
    addEventListener('hashchange', byHash);
    document.addEventListener('click', e => { const a = e.target.closest('a[data-tab]'); if (a) show(panels.findIndex(p => p.id === a.dataset.tab)); });
    if (!byHash()) show(0);
  });

  /* ---------- запрос в образце печатается по буквам ---------- */
  if (!reduce) $$('[data-type]').forEach(el => {
    const txt = el.dataset.type;
    el.textContent = '';
    const o = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return;
      o.disconnect();
      let i = 0;
      setTimeout(() => { const t = setInterval(() => { el.textContent = txt.slice(0, ++i); if (i >= txt.length) clearInterval(t); }, 65); }, 600);
    }, { threshold: 0.8 });
    o.observe(el);
  });

  /* ---------- калькулятор тестового месяца ---------- */
  const plural = (n, f) => { const a = n % 100, b = n % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b > 1 && b < 5 ? f[1] : f[2]; };
  $$('[data-calc]').forEach(c => {
    const inp = n => $(`input[name="${n}"]`, c), out = n => $(`[data-out="${n}"]`, c), res = n => $(`[data-res="${n}"]`, c);
    const words = {
      clicks: ['переход на страницу услуги', 'перехода на страницу услуги', 'переходов на страницу услуги'],
      leads: ['заявка', 'заявки', 'заявок'],
      books: ['запись на консультацию', 'записи на консультацию', 'записей на консультацию'],
    };
    const shown = {};
    const show = (key, to, text) => {
      const el = res(key), from = shown[key] == null ? to : shown[key], t0 = performance.now();
      shown[key] = to;
      cancelAnimationFrame(el._raf);
      const tick = t => {
        const k = reduce ? 1 : clamp((t - t0) / 450, 0, 1), v = from + (to - from) * (1 - (1 - k) ** 3);
        el.textContent = text ? text(v) : fmt(v);
        if (k < 1) el._raf = requestAnimationFrame(tick);
      };
      tick(t0);
    };
    const upd = () => {
      const b = +inp('budget').value, cpc = +inp('cpc').value, cr = +inp('cr').value, bk = +inp('book').value;
      const clicks = Math.round(b / cpc), leads = Math.round(clicks * cr / 100), books = Math.round(leads * bk / 10);
      out('budget').textContent = `${fmt(b)} ₽`;
      out('cpc').textContent = `${fmt(cpc)} ₽`;
      out('cr').textContent = String(cr).replace('.', ',');
      out('book').textContent = bk;
      inp('budget').setAttribute('aria-valuetext', `${fmt(b)} рублей`);
      inp('cpc').setAttribute('aria-valuetext', `${cpc} рублей`);
      ['clicks', 'leads', 'books'].forEach(k => {
        const v = { clicks, leads, books }[k];
        show(k, v);
        res(k).nextElementSibling.textContent = plural(v, words[k]);
      });
      const r100 = v => Math.round(v / 100) * 100;
      show('cpl', leads ? r100(b / leads) : 0);
      show('cpb', books ? r100(b / books) : 0);
      const bars = $$('.flow__bar', c);
      bars[1].style.setProperty('--w', `${clamp((leads / clicks) ** 0.4 * 100, 6, 100).toFixed(1)}%`);
      bars[2].style.setProperty('--w', `${clamp((books / clicks) ** 0.4 * 100, 4, 100).toFixed(1)}%`);
      $$('input[type="range"]', c).forEach(r => r.style.setProperty('--p', `${((r.value - r.min) / (r.max - r.min) * 100).toFixed(1)}%`));
    };
    c.addEventListener('input', upd);
    upd();
  });

  /* ---------- колесо вопросов: на широком экране собирается из раскрывающегося списка ---------- */
  const qaw = $('[data-wheel]');
  if (qaw) {
    const items = $$('.qa__item', qaw).map(d => ({ q: $('.qa__q', d).innerHTML, a: $('.qa__a', d).innerHTML }));
    const N = items.length, STEP = 26;
    const wheel = document.createElement('div');
    wheel.className = 'wheel';
    wheel.innerHTML = `<div class="wheel__dial"><div class="wheel__ring"><i aria-hidden="true"></i><i aria-hidden="true"></i><div class="wheel__tabs" role="tablist" aria-label="Вопросы" aria-orientation="vertical">${items.map((it, i) => `<button type="button" class="wheel__q" role="tab" id="wq-${i}" aria-controls="wheel-panel" style="--a: ${i * STEP}deg">${it.q}</button>`).join('')}</div></div><span class="wheel__ptr" aria-hidden="true"></span><p class="wheel__count" aria-hidden="true"><b></b><span>из ${N}</span></p></div><div class="wheel__panel" role="tabpanel" id="wheel-panel" tabindex="0"><h3 class="wheel__title"></h3><div class="wheel__a"></div><div class="wheel__nav"><button type="button" class="wheel__btn" data-step="-1" aria-label="Предыдущий вопрос"></button><button type="button" class="wheel__btn wheel__btn--next" data-step="1" aria-label="Следующий вопрос"></button></div></div>`;
    qaw.after(wheel);
    const ring = $('.wheel__ring', wheel), tabs = $$('.wheel__q', wheel), panel = $('.wheel__panel', wheel);
    const title = $('.wheel__title', wheel), ans = $('.wheel__a', wheel), count = $('.wheel__count b', wheel);
    let cur = -1, swap;
    const pick = (i, focus) => {
      i = (i + N) % N;
      if (i === cur) return;
      const first = cur < 0;
      cur = i;
      ring.style.setProperty('--rot', `${-cur * STEP}deg`);
      tabs.forEach((t, k) => { const on = k === cur; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; t.classList.toggle('is-far', Math.abs(k - cur) > 2); });
      panel.setAttribute('aria-labelledby', tabs[cur].id);
      count.textContent = cur + 1;
      const fill = () => { title.innerHTML = items[cur].q; ans.innerHTML = items[cur].a; panel.classList.remove('is-swap'); };
      clearTimeout(swap);
      if (first || reduce) fill(); else { panel.classList.add('is-swap'); swap = setTimeout(fill, 220); }
      if (focus) tabs[cur].focus({ preventScroll: true });
    };
    tabs.forEach((t, k) => t.addEventListener('click', () => pick(k)));
    $$('.wheel__btn', wheel).forEach(b => b.addEventListener('click', () => pick(cur + +b.dataset.step)));
    $('.wheel__tabs', wheel).addEventListener('keydown', e => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (step) { e.preventDefault(); pick(cur + step, true); }
      else if (e.key === 'Home') { e.preventDefault(); pick(0, true); }
      else if (e.key === 'End') { e.preventDefault(); pick(N - 1, true); }
    });
    pick(0);
    const wide = matchMedia('(min-width: 1021px)');
    const syncWheel = () => qaw.parentElement.classList.toggle('has-wheel', wide.matches);
    wide.addEventListener('change', syncWheel);
    syncWheel();
  }

  /* ---------- линия-вектор: от стрелки в заголовке до кнопки формы ---------- */
  const main = $('main');
  const vStart = $('[data-vstart]'), vEnd = $('[data-vend]');
  const NS = 'http://www.w3.org/2000/svg';
  let line = null;
  if (main && vStart && vEnd) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'vline'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<defs><linearGradient id="vgrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1"></linearGradient></defs><path class="vline__path" stroke="url(#vgrad)"/><path class="vline__head" stroke="url(#vgrad)"/>';
    main.append(svg);
    line = { svg, path: $('.vline__path', svg), head: $('.vline__head', svg), grad: $('#vgrad', svg), segs: [], total: 0, real: 0, drawn: 0, target: 0, dots: [] };
  }
  // положение относительно main без учёта анимаций transform (появление, магнитные кнопки)
  const rel = el => {
    let x = 0, y = 0, e = el;
    while (e && e !== main) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
    const w = el.offsetWidth, h = el.offsetHeight;
    return { l: x, t: y, r: x + w, b: y + h, w, h };
  };
  const roundPath = (pts, R) => {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], [cx, cy] = pts[i + 1];
      const l1 = Math.hypot(bx - ax, by - ay), l2 = Math.hypot(cx - bx, cy - by);
      const r = Math.min(R, l1 / 2, l2 / 2);
      const p1 = [bx - (bx - ax) / l1 * r, by - (by - ay) / l1 * r], p2 = [bx + (cx - bx) / l2 * r, by + (cy - by) / l2 * r];
      d += `L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}Q${bx.toFixed(1)} ${by.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    const z = pts[pts.length - 1];
    return d + `L${z[0].toFixed(1)} ${z[1].toFixed(1)}`;
  };
  const buildLine = () => {
    if (!line) return;

    const W = main.clientWidth, H = main.offsetHeight;
    line.svg.setAttribute('width', W); line.svg.setAttribute('height', H);
    line.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const heroEl = vStart.closest('section'), wrapEl = $('.wrap', heroEl);
    const wrap = rel(wrapEl);
    const gut = parseFloat(getComputedStyle(wrapEl).paddingLeft);
    const L = wrap.l + gut / 2, Rx = wrap.r - gut / 2;
    const a = rel(vStart), btn = rel(vEnd);
    const hero = rel(heroEl);
    const dots = $$('[data-vpoint]').filter(d => d.offsetParent).map(d => { const r = rel(d); return { el: d.closest('.jr__st') || d, x: r.l + r.w / 2, y: r.t + r.h / 2 }; });
    let pts;
    if (W <= 720) {
      // телефон: простая вертикальная линия слева
      const y0 = hero.b - 56;
      pts = [[L, y0], [L, btn.t + btn.h / 2], [btn.l - 4, btn.t + btn.h / 2]];
    } else {
      const ay = a.t + a.h / 2, band = hero.b - 56;
      pts = [[a.r, ay], [Rx, ay]];
      // главная: линия уходит влево и проходит по ряду остановок; остальные страницы: сразу вниз по правому краю
      if (dots.length && Math.abs(dots[0].y - dots[dots.length - 1].y) < 4) {
        const ry = dots[0].y;
        pts.push([Rx, band], [L, band], [L, ry], [Rx, ry]);
      }
      const by = btn.t + btn.h / 2;
      pts.push([Rx, by], [btn.r + 6, by]);
    }
    line.path.setAttribute('d', roundPath(pts, W <= 720 ? 12 : 28));
    // длины по ломаной
    line.segs = []; let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x1, y1] = pts[i - 1], [x2, y2] = pts[i], len = Math.hypot(x2 - x1, y2 - y1);
      line.segs.push({ x1, y1, x2, y2, len, from: acc }); acc += len;
    }
    line.total = acc;
    line.real = line.path.getTotalLength();
    line.path.style.strokeDasharray = `${line.real} ${line.real}`;
    // где на линии лежат точки шагов
    line.dots = dots.map(d => {
      let best = Infinity, at = 0;
      line.segs.forEach(s => {
        const t = s.len ? clamp(((d.x - s.x1) * (s.x2 - s.x1) + (d.y - s.y1) * (s.y2 - s.y1)) / (s.len * s.len), 0, 1) : 0;
        const px = s.x1 + (s.x2 - s.x1) * t, py = s.y1 + (s.y2 - s.y1) * t, dist = Math.hypot(px - d.x, py - d.y);
        if (dist < best) { best = dist; at = s.from + s.len * t; }
      });
      return { el: d.el, at, ok: best < 30 };
    });
    // наконечник: по направлению последнего отрезка
    const s = line.segs[line.segs.length - 1], dx = Math.sign(s.x2 - s.x1), dy = Math.sign(s.y2 - s.y1), k = 9;
    const ex = s.x2, ey = s.y2;
    line.head.setAttribute('d', `M${ex - dx * k - dy * k} ${ey - dy * k - dx * k}L${ex} ${ey}L${ex - dx * k + dy * k} ${ey - dy * k + dx * k}`);
    // цвет: синий на белом, голубой на тёмных экранах
    const stops = [];
    const push = (y, c) => stops.push(`<stop offset="${clamp(y / H, 0, 1).toFixed(5)}" stop-color="${c}"/>`);
    push(0, '#008cd8');
    $$('[data-dark]').forEach(el => { const r = rel(el); push(r.t, '#008cd8'); push(r.t, '#2aa8f2'); push(r.b, '#2aa8f2'); push(r.b, '#008cd8'); });
    push(H, '#008cd8');
    line.grad.setAttribute('y2', H);
    line.grad.innerHTML = stops.join('');
    if (reduce) line.drawn = line.total;
    lineTarget();
    paintLine(true);
  };
  // сколько линии нарисовать: до уровня 62% высоты экрана
  const lineTarget = () => {
    if (!line || !line.segs.length) return;
    if (reduce) { line.target = line.total; return; }
    const y = scrollY + vh * 0.62 - (main.getBoundingClientRect().top + scrollY);
    let t = 0;
    for (const s of line.segs) {
      if (s.y1 === s.y2) { if (y >= s.y1) t = s.from + s.len; else break; }
      else { const lo = Math.min(s.y1, s.y2), hi = Math.max(s.y1, s.y2); if (y >= hi) t = s.from + s.len; else { if (y > lo) t = s.from + s.len * (y - lo) / (hi - lo); break; } }
    }
    // на финальном экране дорисовываем до кнопки
    const sr = start && start.getBoundingClientRect();
    if (sr && sr.top < vh * 0.35) t = line.total;
    line.target = t;
  };
  const paintLine = force => {
    if (!line || !line.total) return;
    const prev = line.drawn;
    line.drawn += (line.target - line.drawn) * (force && reduce ? 1 : 0.14);
    if (Math.abs(line.target - line.drawn) < 0.5) line.drawn = line.target;
    if (!force && Math.abs(prev - line.drawn) < 0.01) return;
    const real = line.drawn / line.total * line.real;
    line.path.style.strokeDashoffset = (line.real - real).toFixed(1);
    line.svg.classList.toggle('is-done', line.drawn >= line.total - 1);
    line.dots.forEach(d => d.el.classList.toggle('is-on', d.ok ? line.drawn >= d.at - 2 : false));
  };
  /* ---------- общий цикл: всё, что зависит от прокрутки ---------- */
  let ticking = false;
  const frame = () => {
    ticking = false;
    onHeader(); onFill(); onCircle(); lineTarget();
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  const loop = () => { paintLine(false); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);

  let rt;
  const rebuild = () => { clearTimeout(rt); rt = setTimeout(() => { vh = innerHeight; buildLine(); frame(); }, 120); };
  addEventListener('resize', rebuild);
  if (window.ResizeObserver && main) new ResizeObserver(rebuild).observe(main);
  $$('details').forEach(d => d.addEventListener('toggle', rebuild));
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { buildLine(); frame(); });
  addEventListener('load', rebuild);

  /* ---------- форма заявки ---------- */
  $$('form.form').forEach(form => {
    const dir = $('.form__dir', form);
    const sync = () => {
      const v = (form.querySelector('input[name="service"]:checked') || {}).value;
      if (dir) dir.hidden = v === 'site';
    };
    $$('input[name="service"]', form).forEach(r => r.addEventListener('change', sync));
    sync();
    form.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      $$('input[required]', form).forEach(inp => {
        const bad = inp.type === 'checkbox' ? !inp.checked : !inp.value.trim();
        inp.classList.toggle('is-bad', bad);
        inp.setAttribute('aria-invalid', bad);
        if (bad && ok) { ok = false; inp.focus(); }
      });
      if (ok) form.classList.add('is-sent');
    });
    $$('input', form).forEach(inp => inp.addEventListener('input', () => { inp.classList.remove('is-bad'); inp.removeAttribute('aria-invalid'); }));
  });
  // кнопки «Запустить тест» и «Получить сайт бесплатно» заранее выбирают услугу в форме
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-pick]');
    if (!a) return;
    const r = document.querySelector(`#start input[name="service"][value="${a.dataset.pick}"]`);
    if (r) { r.checked = true; r.dispatchEvent(new Event('change')); }
    const d = a.dataset.dir && document.querySelector('#start select[name="direction"]');
    if (d) d.value = a.dataset.dir;
  });

  /* ---------- только мышь: курсор «+» и магнитные кнопки ---------- */
  if (fine && !reduce) {
    const cur = document.createElement('div');
    cur.className = 'cursor'; cur.setAttribute('aria-hidden', 'true'); cur.innerHTML = '<i></i>';
    document.body.append(cur);
    let cx = -100, cy = -100, x = -100, y = -100;
    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY;
      cur.classList.add('is-on');
      const t = e.target;
      cur.classList.toggle('is-link', !!t.closest('a, button, summary, label'));
      cur.classList.toggle('is-text', !!t.closest('input, select, textarea'));
    }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('is-on'));
    const follow = () => { cx += (x - cx) * 0.22; cy += (y - cy) * 0.22; cur.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`; requestAnimationFrame(follow); };
    requestAnimationFrame(follow);

    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        const mx = (e.clientX - r.left - r.width / 2) / r.width, my = (e.clientY - r.top - r.height / 2) / r.height;
        b.style.transform = `translate(${(mx * 10).toFixed(1)}px, ${(my * 8).toFixed(1)}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transition = 'transform .6s cubic-bezier(.22, 1, .36, 1), background-color .4s, color .4s'; b.style.transform = ''; setTimeout(() => { b.style.transition = ''; }, 600); });
    });
  }

  frame();
})();
