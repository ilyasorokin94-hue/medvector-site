/* МедВектор, «Траектория»: линия-вектор, появление по строкам, заливка фразы, круг, счётчики,
   шапка, меню, форма, курсор «+», магнитные кнопки и плавная прокрутка (Lenis, только мышь). */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  let vh = innerHeight;

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
          const parts = n.textContent.split(/(\s+)/);
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
  const heads = reduce ? [] : $$('.h1, main .h2, .svc__title, .work__title');
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
    const s = 0.06 + 0.94 * clamp(p / 0.55, 0, 1) ** 1.6;
    disc.style.setProperty('--s', s.toFixed(4));
    cin.style.setProperty('--o', clamp((p - 0.42) / 0.25, 0, 1).toFixed(3));
  };

  /* ---------- кейсы: картинка раскрывается из узкой полосы ---------- */
  const pics = $$('.work__pic');
  const onPics = () => pics.forEach(el => {
    if (reduce) return;
    const r = el.getBoundingClientRect();
    const p = clamp((vh - r.top) / (vh * 0.75), 0, 1);
    el.style.setProperty('--cx', ((1 - p) * 18).toFixed(2) + '%');
  });

  /* ---------- счётчики ---------- */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, end = +el.dataset.count, t0 = performance.now(), dur = 1200;
    const tick = t => { const k = clamp((t - t0) / dur, 0, 1); el.textContent = Math.round(end * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  if (!reduce) $$('[data-count]').forEach(el => { if (+el.dataset.count > 1) { el.textContent = '0'; cio.observe(el); } });

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
    const wrap = rel($('.hero .wrap'));
    const gut = parseFloat(getComputedStyle($('.hero .wrap')).paddingLeft);
    const L = wrap.l + gut / 2, Rx = wrap.r - gut / 2;
    const a = rel(vStart), btn = rel(vEnd);
    const hero = rel($('.hero'));
    const dots = $$('[data-vpoint]').map(d => { const r = rel(d); return { el: d.closest('.step') || d, x: r.l + r.w / 2, y: r.t + r.h / 2 }; });
    let pts;
    if (W <= 720) {
      // телефон: простая вертикальная линия слева
      const y0 = hero.b - 56;
      pts = [[L, y0], [L, btn.t + btn.h / 2], [btn.l - 4, btn.t + btn.h / 2]];
    } else {
      const ay = a.t + a.h / 2, band = hero.b - 56;
      pts = [[a.r, ay], [Rx, ay], [Rx, band], [L, band]];
      if (dots.length && Math.abs(dots[0].y - dots[dots.length - 1].y) < 4) {
        const ry = dots[0].y;
        pts.push([L, ry], [Rx, ry]);
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
    onHeader(); onFill(); onCircle(); onPics(); lineTarget();
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
