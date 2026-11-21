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

  /* ---------- «Услуги» в шапке: список открывается по наведению мыши, по нажатию и с клавиатуры ---------- */
  $$('[data-drop]').forEach(drop => {
    const btn = $('.drop__btn', drop);
    let timer;
    const isOpen = () => drop.classList.contains('is-open');
    const set = open => { clearTimeout(timer); drop.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open); };
    // нажатие мышью после наведения не должно закрывать список; нажатие с клавиатуры и пальцем переключает
    btn.addEventListener('click', e => set(fine && e.detail ? true : !isOpen()));
    if (fine) {
      drop.addEventListener('pointerenter', () => set(true));
      drop.addEventListener('pointerleave', () => { timer = setTimeout(() => set(false), 180); });
    }
    drop.addEventListener('focusout', e => { if (!drop.contains(e.relatedTarget)) set(false); });
    drop.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) { set(false); btn.focus(); } });
    drop.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    document.addEventListener('click', e => { if (!drop.contains(e.target)) set(false); });
  });

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
    const s = clamp(p / 0.7, 0, 1) ** 1.6;
    disc.style.setProperty('--s', s.toFixed(4));
    cin.style.setProperty('--o', clamp((p - 0.5) / 0.3, 0, 1).toFixed(3));
  };

  /* ---------- образцы в блоке «Сайт и Карты» выпрямляются по мере прокрутки ---------- */
  const trios = $$('[data-trio]');
  const onTrio = () => trios.forEach(el => {
    if (reduce) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--t', (1 - clamp((vh - r.top) / (vh * 0.7), 0, 1)).toFixed(3));
  });

  /* ---------- объёмная сцена первого экрана: слои появляются по очереди и следят за мышью ---------- */
  const scene = $('[data-scene]');
  if (scene) {
    if (reduce) scene.classList.add('is-in');
    else {
      requestAnimationFrame(() => requestAnimationFrame(() => scene.classList.add('is-in')));
      setTimeout(() => scene.classList.add('is-float'), 3200);
      if (fine) {
        const inner = $('.scene__in', scene), host = scene.closest('section');
        let tx = 0, ty = 0, x = 0, y = 0, on = false;
        host.addEventListener('pointermove', e => {
          const r = host.getBoundingClientRect();
          tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
          if (!on) { on = true; requestAnimationFrame(tilt); }
        });
        host.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
        const tilt = () => {
          x += (tx - x) * 0.08; y += (ty - y) * 0.08;
          inner.style.setProperty('--ry', `${(x * 14).toFixed(2)}deg`);
          inner.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
          if (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) requestAnimationFrame(tilt); else on = false;
        };
      }
    }
  }

  /* ---------- путь пациента: остановки подсвечиваются по очереди, пока блок на экране ---------- */
  const stops = $$('.jr__st');
  if (stops.length && !reduce) {
    let k = -1, timer = null;
    const step = () => { stops.forEach(s => s.classList.remove('is-live')); k = (k + 1) % (stops.length + 1); if (k < stops.length) stops[k].classList.add('is-live'); };
    new IntersectionObserver(es => {
      if (es[0].isIntersecting && !timer) { k = -1; timer = setInterval(step, 1500); }
      else if (!es[0].isIntersecting && timer) { clearInterval(timer); timer = null; stops.forEach(s => s.classList.remove('is-live')); }
    }, { threshold: 0.35 }).observe(stops[0].parentElement);
  }

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
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
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

  /* ---------- колесо вопросов: на широком экране собирается из раскрывающегося списка ---------- */
  const qaw = $('[data-wheel]');
  if (qaw) {
    const items = $$('.qa__item', qaw).map(d => ({ q: $('.qa__q', d).innerHTML, a: $('.qa__a', d).innerHTML }));
    const N = items.length, STEP = 26;
    const wheel = document.createElement('div');
    wheel.className = 'wheel';
    wheel.innerHTML = `<div class="wheel__dial"><div class="wheel__ring"><i aria-hidden="true"></i><i aria-hidden="true"></i><div class="wheel__tabs" role="tablist" aria-label="Вопросы" aria-orientation="vertical">${items.map((it, i) => `<button type="button" class="wheel__q" role="tab" id="wq-${i}" aria-controls="wheel-panel" style="--a: ${i * STEP}deg">${it.q}</button>`).join('')}</div></div><span class="wheel__ptr" aria-hidden="true"></span><p class="wheel__count" aria-hidden="true"><b></b><span>из ${N}</span></p></div><div class="wheel__panel" role="tabpanel" id="wheel-panel" tabindex="0"><h3 class="wheel__title"></h3><div class="wheel__a"></div><div class="wheel__nav"><button type="button" class="wheel__btn" data-step="-1" aria-label="Предыдущий вопрос"></button><button type="button" class="wheel__btn wheel__btn--next" data-step="1" aria-label="Следующий вопрос"></button></div></div>`;
    qaw.after(wheel);
    // в середине колеса стоит та же сфера: добавляется до общего запуска сфер ниже
    const hub = document.createElement('canvas');
    hub.className = 'orb wheel__orb'; hub.dataset.orb = '360'; hub.setAttribute('aria-hidden', 'true');
    $('.wheel__dial', wheel).prepend(hub);
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

  /* ---------- сфера из плюсов: точки на сфере медленно вращаются, несколько плюсов синие ----------
     Холст берёт цвет из CSS (тёмный на белом, белый на тёмном) и рисует только пока виден. */
  const VEC = '#008cd8';
  const makeOrb = cv => {
    const ctx = cv.getContext('2d'), N = +cv.dataset.orb || 300;
    const pts = [], gold = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = gold * i; pts.push([Math.cos(a) * r, y, Math.sin(a) * r, i % 23 === 7]); }
    const tilt = 0.42, ct = Math.cos(tilt), st = Math.sin(tilt);
    let rot = 0.6, size = 0, seen = false, raf = 0, ink = '#000f40';
    const fit = () => {
      const w = cv.clientWidth, d = Math.min(devicePixelRatio || 1, 2);
      if (!w) return;
      size = Math.round(w * d); cv.width = size; cv.height = size;
      ink = getComputedStyle(cv).color;
    };
    const draw = () => {
      if (!size) return;
      ctx.clearRect(0, 0, size, size);
      const R = size * 0.44, c = size / 2, sr = Math.sin(rot), cr = Math.cos(rot), small = size < 140;
      const unit = Math.max(1, size / (small ? 26 : 90));
      for (const [x0, y0, z0, mark] of pts) {
        const x = x0 * cr + z0 * sr, z1 = z0 * cr - x0 * sr, y = y0 * ct - z1 * st, z = y0 * st + z1 * ct;
        const k = (z + 1) / 2, px = c + x * R, py = c + y * R;
        ctx.globalAlpha = 0.12 + 0.88 * k ** 1.6;
        if (mark && z > -0.2) {
          const s = unit * (small ? 2.2 : 1.9) * (0.6 + 0.4 * k);
          ctx.strokeStyle = VEC; ctx.lineWidth = Math.max(1, unit * (small ? .9 : .42));
          ctx.beginPath(); ctx.moveTo(px - s, py); ctx.lineTo(px + s, py); ctx.moveTo(px, py - s); ctx.lineTo(px, py + s); ctx.stroke();
        } else {
          ctx.fillStyle = ink;
          ctx.beginPath(); ctx.arc(px, py, unit * (small ? .55 : .3) * (0.5 + 0.9 * k), 0, 6.283); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };
    const loop = () => { rot += 0.0035; draw(); raf = seen ? requestAnimationFrame(loop) : 0; };
    new IntersectionObserver(es => {
      seen = es[0].isIntersecting;
      if (seen) { fit(); if (reduce) draw(); else if (!raf) raf = requestAnimationFrame(loop); }
    }).observe(cv);
    addEventListener('resize', () => { fit(); draw(); });
    fit(); draw();
  };
  $$('canvas[data-orb]').forEach(makeOrb);

  /* ---------- первый экран «Один вектор»: шесть стрелок стоят вразнобой и сходятся в одну линию ----------
     Слой [data-vx] лежит поверх первого экрана. На широком экране ось стрелок продолжает третью строку заголовка,
     на узком это отдельная полоса под заголовком. Когда стрелки встали в ряд, от последней начинается линия-вектор. */
  const vxEl = $('[data-vx]'), vxMark = $('[data-vstart]');
  let vx = null;
  if (vxEl && vxMark) {
    // куда и на сколько каждая стрелка уходит от оси, пока они вразнобой: сдвиг вбок в долях шага, сторона, доля свободного места, угол
    const CHAOS = [[.12, 1, .5, 24], [-.06, -1, .62, -52], [.16, 1, .78, 142], [-.1, -1, .8, -118], [.06, 1, .5, 78], [-.22, -1, .52, -164]];
    const items = $$('li', vxEl).map((li, i) => {
      const text = li.textContent.trim();
      li.textContent = '';
      li.style.setProperty('--i', i);
      const ar = document.createElement('span'); ar.className = 'vx__ar';
      const lb = document.createElement('span'); lb.className = 'vx__lb'; lb.textContent = text;
      li.append(ar, lb);
      return { li, ar, lb, c: CHAOS[i % CHAOS.length], on: reduce, x: 0, y: 0, a: 0, vx: 0, vy: 0, va: 0, hx: 0, hy: 0, sx: 0, sy: 0, sa: 0, ph: i * 1.7, side: -1, lo: -1 };
    });
    vx = { items, wait: !reduce, len: 0, end: null, raf: 0, last: 0, acc: 0, px: null, py: 0, timer: 0, gen: 0, tight: false, again: $('[data-vx-again]'), started: false };
  }
  // расставляет стрелки: считает ось, места в ряду и места «вразнобой», которые не задевают текст
  const vxLayout = () => {
    if (!vx) return null;
    const box = vxEl.getBoundingClientRect();
    if (!box.width) return null;
    const block = getComputedStyle(vxEl).position !== 'absolute';
    const wrapEl = vxEl.closest('.wrap'), wr = wrapEl.getBoundingClientRect();
    const gut = parseFloat(getComputedStyle(wrapEl).paddingLeft);
    const Rx = wr.right - gut / 2 - box.left;
    let x0, x1, y;
    // полоса под заголовком: нижние 28 px заходят под следующий абзац, поэтому ось стоит чуть выше середины
    if (block) { x0 = 0; x1 = box.width - 14; y = (box.height - 28) / 2; }
    else { const m = vxMark.getBoundingClientRect(); x0 = m.left - box.left; x1 = Rx - 60; y = m.top + m.height / 2 - box.top; }
    const n = vx.items.length, s = (x1 - x0) / n, gap = clamp(s * .1, 6, 12), len = s - gap;
    vx.len = len;
    vxEl.style.setProperty('--len', `${len.toFixed(1)}px`);
    vx.tight = s < 84;
    vxEl.classList.toggle('is-tight', vx.tight);
    // препятствия: строки заголовка, подзаголовок, факты и кнопки
    const walls = block ? [] : $$('.hero__label, .ln__t, .hero__sub, .hero__facts, .hero__acts', vxEl.closest('section')).map(el => {
      const r = el.getBoundingClientRect(), fs = el.classList.contains('ln__t') ? parseFloat(getComputedStyle(el).fontSize) : 0;
      const ln = fs ? el.parentElement.getBoundingClientRect() : r;
      // у строки заголовка считаем по буквам, а не по высоте строки
      return { l: r.left - box.left, r: r.right - box.left, t: ln.top - box.top + fs * .16, b: ln.bottom - box.top - fs * .1 };
    });
    vx.items.forEach((it, i) => {
      it.hx = x0 + s * i + gap + len / 2; it.hy = y;
      it.side = vx.tight && i % 2 ? 1 : -1;
      const [dx, dir, f, ang] = it.c;
      const cx = it.hx + dx * s;
      let room;
      if (block) room = y - 26;
      else {
        const l = cx - len / 2 - 12, r = cx + len / 2 + 12;
        let top = 0, bot = box.height;
        walls.forEach(w => { if (w.r < l || w.l > r) return; if (w.b <= y) top = Math.max(top, w.b); else if (w.t >= y) bot = Math.min(bot, w.t); });
        room = Math.min(dir < 0 || vx.tight ? (dir < 0 ? y - top : bot - y) - 30 : bot - y - 14, len * 1.7);
      }
      room = Math.max(room, 6);
      const off = room * f;
      // наклон не больше, чем позволяет оставшееся место
      const cap = clamp((room - off) / (len / 2), .08, 1), rad = ang * Math.PI / 180;
      let a = ang;
      if (Math.abs(Math.sin(rad)) > cap) { const q = Math.asin(cap) * 180 / Math.PI * Math.sign(Math.sin(rad)); a = Math.cos(rad) >= 0 ? q : (q > 0 ? 180 - q : -180 - q); }
      it.sx = cx; it.sy = y + dir * off; it.sa = a;
      if (!vx.started || reduce) { it.x = it.on ? it.hx : it.sx; it.y = it.on ? it.hy : it.sy; it.a = it.on ? 0 : it.sa; it.lo = it.on ? it.side : (vx.tight ? dir : -1); }
    });
    if (vx.again) { const g = vxEl.closest('.hero__grid').getBoundingClientRect(); vx.again.style.left = `${box.left - g.left + x1}px`; vx.again.style.top = `${box.top - g.top + y + (vx.tight ? 34 : 16)}px`; }
    vxPaint();
    vxRun();
    const mr = main.getBoundingClientRect();
    vx.end = { x: box.left - mr.left + x1, y: box.top - mr.top + y };
    return vx.end;
  };
  const vxPaint = () => vx.items.forEach(it => {
    it.li.style.transform = `translate(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px)`;
    it.ar.style.transform = `rotate(${it.a.toFixed(2)}deg)`;
    // подпись стоит над стрелкой или под ней и переезжает плавно: lo от -1 (над) до 1 (под)
    const ext = Math.abs(Math.sin(it.a * Math.PI / 180)) * vx.len / 2 + 11, h = vx.tight ? 13 : 15;
    it.lb.style.transform = `translate(-50%, ${((it.lo - 1) / 2 * (ext + h) + (it.lo + 1) / 2 * ext).toFixed(1)}px)`;
  });
  const turn = d => ((d + 540) % 360) - 180;
  const vxStep = t => {
    let live = false;
    vx.items.forEach(it => {
      let tx = it.on ? it.hx : it.sx, ty = it.on ? it.hy : it.sy, ta = it.on ? 0 : it.sa;
      if (!it.on) { ta += Math.sin(t / 900 + it.ph) * 9; ty += Math.sin(t / 1300 + it.ph * 2) * 4; live = true; }
      if (vx.px !== null) {
        const dx = vx.px - it.x, dy = vx.py - it.y, d = Math.hypot(dx, dy);
        // вразнобой стрелка тянется за курсором, как стрелка компаса; в ряду только слегка кланяется ему
        if (!it.on) { const k = clamp(1 - d / 520, 0, 1); ta += turn(Math.atan2(dy, dx) * 180 / Math.PI - ta) * .45 * k; }
        else if (d < 240) ta += dy / (d + 40) * 34 * (1 - d / 240) ** 2;
      }
      it.vx = (it.vx + (tx - it.x) * .075) * .79; it.x += it.vx;
      it.vy = (it.vy + (ty - it.y) * .075) * .79; it.y += it.vy;
      it.va = (it.va + turn(ta - it.a) * .075) * .79; it.a = turn(it.a + it.va);
      const ts = it.on ? it.side : (vx.tight ? it.c[1] : -1);
      it.lo += (ts - it.lo) * .12;
      if (Math.abs(ts - it.lo) > .01) live = true;
      if (Math.abs(it.vx) + Math.abs(it.vy) + Math.abs(it.va) > .02 || Math.abs(tx - it.x) + Math.abs(ty - it.y) + Math.abs(turn(ta - it.a)) > .05) live = true;
    });
    return live;
  };
  const vxLoop = now => {
    vx.acc = Math.min(vx.acc + now - vx.last, 80); vx.last = now;
    let live = true;
    while (vx.acc >= 16.6) { live = vxStep(now); vx.acc -= 16.6; }
    vxPaint();
    vx.raf = live ? requestAnimationFrame(vxLoop) : 0;
  };
  const vxRun = () => { if (vx && !reduce && vx.started && !vx.raf) { vx.last = performance.now(); vx.raf = requestAnimationFrame(vxLoop); } };
  // стрелки по очереди встают в ряд; после последней линия-вектор идёт дальше по странице
  const vxCollect = () => {
    clearTimeout(vx.timer);
    const gen = ++vx.gen;
    vx.items.forEach((it, i) => setTimeout(() => { if (gen !== vx.gen) return; it.on = true; it.li.classList.add('is-on'); vxRun(); }, i * 110));
    vx.timer = setTimeout(() => { vx.wait = false; vxEl.classList.add('is-set'); if (vx.again) vx.again.hidden = false; lineTarget(); }, vx.items.length * 110 + 520);
  };
  const vxScatter = () => {
    clearTimeout(vx.timer);
    vx.gen++;
    vxEl.classList.remove('is-set');
    vx.items.forEach(it => { it.on = false; it.li.classList.remove('is-on'); });
    vxRun();
    vx.timer = setTimeout(vxCollect, 2600);
  };
  const vxStart = () => {
    if (!vx || vx.started) return;
    vx.started = true;
    vxEl.classList.add('is-in');
    if (reduce) { vx.items.forEach(it => it.li.classList.add('is-on')); vxEl.classList.add('is-set'); return; }
    vxRun();
    vx.timer = setTimeout(vxCollect, 2400);
    // прокрутка не ждёт: стрелки сходятся сразу
    const early = () => { if (scrollY > 24 && vx.wait) { vxCollect(); removeEventListener('scroll', early); } };
    addEventListener('scroll', early, { passive: true });
    if (fine) {
      const host = vxEl.closest('section');
      host.addEventListener('pointermove', e => { const b = vxEl.getBoundingClientRect(); vx.px = e.clientX - b.left; vx.py = e.clientY - b.top; vxRun(); });
      host.addEventListener('pointerleave', () => { vx.px = null; vxRun(); });
    }
    if (vx.again) vx.again.addEventListener('click', vxScatter);
  };

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
    // если на первом экране стоят шесть стрелок, линия начинается от последней из них
    const ax = vxLayout();
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
      const y0 = hero.b - 56, by = btn.t + btn.h / 2;
      pts = ax ? [[ax.x, ax.y], [Rx, ax.y], [Rx, y0], [L, y0], [L, by], [btn.l - 4, by]] : [[L, y0], [L, by], [btn.l - 4, by]];
    } else {
      const ay = ax ? ax.y : a.t + a.h / 2, band = hero.b - 56;
      pts = [[ax ? ax.x : a.r, ay], [Rx, ay]];
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
    if (vx && vx.wait) { line.target = 0; return; }
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
    // пока линия не началась, круглый конец штриха не должен быть виден точкой
    line.path.style.visibility = line.drawn < 1 ? 'hidden' : '';
    line.svg.classList.toggle('is-done', line.drawn >= line.total - 1);
    line.dots.forEach(d => d.el.classList.toggle('is-on', d.ok ? line.drawn >= d.at - 2 : false));
  };
  /* ---------- общий цикл: всё, что зависит от прокрутки ---------- */
  let ticking = false;
  const frame = () => {
    ticking = false;
    onHeader(); onFill(); onCircle(); onTrio(); lineTarget();
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
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { buildLine(); frame(); vxStart(); });
  addEventListener('load', rebuild);

  /* ---------- форма заявки ---------- */
  $$('form.form').forEach(form => {
    const dir = $('.form__dir', form);
    const sync = () => {
      const v = (form.querySelector('input[name="service"]:checked') || {}).value;
      if (dir) dir.hidden = v === 'site' || v === 'single';
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
