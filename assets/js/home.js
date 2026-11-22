/* МедВектор, главная. Один файл из трёх частей:
   1. Общее: шапка, меню, появление блоков, счётчики, шар в колесе вопросов, курсор, вкладки, форма.
   2. Линия-вектор: одна линия через всю страницу по меткам [data-vp].
   3. Секции: указатель кейсов, макеты сайтов, колесо вопросов.
   Плавная прокрутка: assets/js/vendor/lenis.min.js (подключается раньше). */

/* ===== Общее: шапка, меню, появление блоков, счётчики, зуб, курсор, вкладки, форма ===== */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  var MV = window.MV = { reduce: reduce, fine: fine, clamp: clamp, hooks: [], frames: [] };
  // если скрипт пришёл поздно, страница уже показана как без скриптов (см. таймер в <head>): возвращаем обычный режим
  root.classList.remove('no-js'); root.classList.add('js');
  var vh = innerHeight;

  /* ---------- плавная прокрутка ---------- */
  var lenis = null;
  if (fine && !reduce && window.Lenis) {
    try { lenis = new Lenis({ autoRaf: true, lerp: 0.11, anchors: { offset: -16 }, stopInertiaOnNavigate: true }); MV.lenis = lenis; } catch (e) { lenis = null; }
  }

  /* ---------- шапка ---------- */
  var hdr = $('.hdr'), lastY = scrollY, menuOpen = false, keepHeader = 0;
  document.addEventListener('click', function (e) { if (e.target.closest('a[href*="#"]')) keepHeader = performance.now() + 1200; });
  var onHeader = function () {
    var y = scrollY;
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 8);
      if (!menuOpen && y > 400 && y > lastY + 4 && performance.now() > keepHeader) hdr.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 400) hdr.classList.remove('is-hidden');
    }
    lastY = y;
  };
  var burger = $('.burger'), mnav = $('#mnav');
  var setMenu = function (open) {
    menuOpen = open; root.classList.toggle('is-menu', open); mnav.classList.toggle('is-open', open); mnav.inert = !open;
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
    if (open) hdr.classList.remove('is-hidden');
  };
  if (burger && mnav) {
    burger.addEventListener('click', function () { setMenu(!menuOpen); });
    mnav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
    matchMedia('(min-width: 1021px)').addEventListener('change', function (e) { if (e.matches && menuOpen) setMenu(false); });
  }
  $$('[data-drop]').forEach(function (drop) {
    var btn = $('.drop__btn', drop), timer;
    var isOpen = function () { return drop.classList.contains('is-open'); };
    var set = function (open) { clearTimeout(timer); drop.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open); };
    btn.addEventListener('click', function (e) { set(fine && e.detail ? true : !isOpen()); });
    if (fine) { drop.addEventListener('pointerenter', function () { set(true); }); drop.addEventListener('pointerleave', function () { timer = setTimeout(function () { set(false); }, 180); }); }
    drop.addEventListener('focusout', function (e) { if (!drop.contains(e.relatedTarget)) set(false); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { set(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!drop.contains(e.target) || e.target.closest('a')) set(false); });
  });

  /* ---------- появление блоков ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (!e.isIntersecting) return; e.target.classList.add('is-in'); io.unobserve(e.target); });
  }, { rootMargin: '0px 0px -6% 0px' }) : null;
  var watch = function (scope, replay) {
    $$('[data-rv], .rvh', scope).forEach(function (el) {
      if (reduce || !io) { el.classList.add('is-in'); return; }
      if (replay) el.classList.remove('is-in');
      if (el.classList.contains('is-in')) return;
      /* первый экран показываем целиком сразу, не дожидаясь прокрутки */
      if (el.closest('#hero')) { requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); }); return; }
      io.observe(el);
    });
  };

  /* ---------- счётчики ---------- */
  var countIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return; countIO.unobserve(e.target);
      var el = e.target, to = parseFloat(el.dataset.count), t0 = performance.now(), dur = 1400;
      if (reduce) { el.textContent = fmt(to); return; }
      var tick = function (now) { var p = clamp((now - t0) / dur, 0, 1), k = 1 - Math.pow(1 - p, 4); el.textContent = fmt(to * k); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;
  var counts = function (scope) { $$('[data-count]', scope).forEach(function (el) { if (countIO && !el.dataset.cdone) { el.dataset.cdone = 1; countIO.observe(el); } }); };

  /* ---------- зуб: каждый холст с data-tooth получает свой рисунок ---------- */
  var teeth = [];
  var mountTeeth = function () {
    if (!window.MVTooth) return;
    $$('canvas[data-tooth]').forEach(function (c) {
      if (c.__tooth) return;
      // без WebGL место зуба остаётся пустым, текст и кнопки от него не зависят
      var d = c.dataset, inst = MVTooth.create(c, { mode: d.tooth || 'porcelain', preset: d.preset, spin: d.spin == null ? undefined : +d.spin, tilt: d.tilt == null ? undefined : +d.tilt, yaw: d.yaw == null ? 0.5 : +d.yaw, scale: d.scale == null ? 1 : +d.scale, size: d.size == null ? undefined : +d.size, follow: d.follow !== 'off', asm: d.asm !== 'off' });
      if (inst) { c.__tooth = inst; teeth.push({ canvas: c, inst: inst, scroll: +(d.scroll || 0) }); }
    });
  };
  MV.teeth = function () { return teeth; };

  /* ---------- шар из точек в центре колеса вопросов, как в первом варианте сайта ----------
     Точки лежат на сфере по спирали Фибоначчи и медленно вращаются, часть точек синие. Рисуем только пока шар виден. */
  var makeOrb = function (cv) {
    var ctx = cv.getContext('2d'), N = +cv.dataset.orb || 360, pts = [], gold = Math.PI * (3 - Math.sqrt(5));
    for (var i = 0; i < N; i++) { var y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), a = gold * i; pts.push([Math.cos(a) * r, y, Math.sin(a) * r, Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1 < 0.06]); }
    var ct = Math.cos(0.42), st = Math.sin(0.42), rot = 0.6, size = 0, seen = false, raf = 0, ink = '#000f40', vec = '#008cd8';
    var fit = function () {
      var w = cv.clientWidth, d = Math.min(window.devicePixelRatio || 1, 2);
      if (!w) return;
      size = Math.round(w * d); cv.width = size; cv.height = size;
      var cs = getComputedStyle(cv); ink = cs.color; vec = cs.getPropertyValue('--vec').trim() || vec;
    };
    var draw = function () {
      if (!size) return;
      ctx.clearRect(0, 0, size, size);
      var R = size * 0.44, c = size / 2, sr = Math.sin(rot), cr = Math.cos(rot), unit = Math.max(1, size / 90);
      // сначала дальние точки, потом ближние: синие не прячутся за тёмными
      var list = pts.map(function (p) {
        var x = p[0] * cr + p[2] * sr, z1 = p[2] * cr - p[0] * sr;
        return [x, p[1] * ct - z1 * st, p[1] * st + z1 * ct, p[3]];
      }).sort(function (a, b) { return a[2] - b[2]; });
      list.forEach(function (p) {
        var k = (p[2] + 1) / 2;
        ctx.globalAlpha = 0.1 + 0.9 * Math.pow(k, 1.6);
        ctx.fillStyle = p[3] && p[2] > -0.3 ? vec : ink;
        ctx.beginPath(); ctx.arc(c + p[0] * R, c + p[1] * R, unit * (p[3] ? 0.62 : 0.32) * (0.5 + 0.9 * k), 0, 6.283); ctx.fill();
      });
      ctx.globalAlpha = 1;
    };
    var loop = function () { rot += 0.0035; draw(); raf = seen ? requestAnimationFrame(loop) : 0; };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      seen = es[0].isIntersecting;
      if (seen) { fit(); if (reduce) draw(); else if (!raf) raf = requestAnimationFrame(loop); }
    }).observe(cv);
    addEventListener('resize', function () { fit(); draw(); });
    fit(); draw();
  };
  $$('canvas[data-orb]').forEach(makeOrb);

  /* надпись во всю ширину блока: подбираем кегль под любой набор шрифтов */
  var fit = function () {
    $$('[data-fit]').forEach(function (el) {
      var s = el.firstElementChild; el.style.fontSize = '100px';
      var w = s.getBoundingClientRect().width, k = +(el.dataset.fit || 1) || 1;
      var fs = 100 * el.clientWidth / w * k, cap = +(el.dataset.fitMax || 0) * innerHeight / 100;
      if (w > 0) el.style.fontSize = (cap && fs > cap ? cap : fs).toFixed(2) + 'px';
    });
  };
  MV.fit = fit;

  /* ---------- магнитные кнопки и курсор ---------- */
  if (fine && !reduce) {
    document.addEventListener('pointermove', function (e) {
      var b = e.target.closest && e.target.closest('[data-magnetic]');
      $$('[data-magnetic].is-mag').forEach(function (x) { if (x !== b) { x.style.transform = ''; x.classList.remove('is-mag'); } });
      if (!b) return;
      var r = b.getBoundingClientRect();
      b.classList.add('is-mag'); b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px)';
    }, { passive: true });
    var curEl = document.createElement('div'); curEl.className = 'cur'; curEl.setAttribute('aria-hidden', 'true'); curEl.innerHTML = '<i></i>'; document.body.appendChild(curEl);
    var cx = 0, cy = 0, tx = 0, ty = 0, curOn = false;
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY; if (!curOn) { cx = tx; cy = ty; curOn = true; curEl.classList.add('is-on'); }
      var t = e.target, link = t.closest && t.closest('a, button, [role="button"], [data-cur]'), text = t.closest && t.closest('input, textarea, select');
      curEl.classList.toggle('is-link', !!link && !text); curEl.classList.toggle('is-text', !!text);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { curOn = false; curEl.classList.remove('is-on'); });
    // курсор догоняет мышь; когда догнал, кадр ничего не пишет в стили
    var ctf = '';
    MV.frames.push(function () {
      if (Math.abs(tx - cx) < 0.15 && Math.abs(ty - cy) < 0.15) { cx = tx; cy = ty; } else { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; }
      var t = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
      if (t !== ctf) { ctf = t; curEl.style.transform = t; }
    });
  }

  /* ---------- прокрутка: прогресс секций и поворот зуба ---------- */
  var onScroll = function () {
    onHeader();
    $$('[data-prog]').forEach(function (el) {
      var r = el.getBoundingClientRect(), p;
      if (el.dataset.prog === 'pin') p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      else p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      // пишем, только если значение изменилось: каждая запись пересчитывает стили блока
      var v = p.toFixed(3); if (el.__p !== v) { el.__p = v; el.style.setProperty('--p', v); }
    });
    teeth.forEach(function (t) { if (t.scroll) { var r = t.canvas.getBoundingClientRect(); t.inst.state.extraYaw = (vh / 2 - (r.top + r.height / 2)) / vh * t.scroll; } });
  };
  var ticking = false;
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); } }, { passive: true });
  var rt;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { vh = innerHeight; fit(); onScroll(); if (MV.line) MV.line.rebuild(); }, 140); });
  var loop = function (now) { for (var i = 0; i < MV.frames.length; i++) MV.frames[i](now); requestAnimationFrame(loop); };

  /* ---------- вкладки и форма: общее поведение по атрибутам ---------- */
  document.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-tab]');
    if (tab) {
      var box = tab.closest('[data-tabs]'), id = tab.dataset.tab;
      $$('[data-tab]', box).forEach(function (t) { var on = t === tab; t.setAttribute('aria-selected', on); t.classList.toggle('is-on', on); });
      $$('[data-pane]', box).forEach(function (p) { var on = p.dataset.pane === id; p.hidden = !on; if (on) watch(p, true); });
      if (box.dataset.tabs) box.dataset.tabs = id;
      if (MV.line) MV.line.rebuild(); counts(box);
    }
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-demo-form]'); if (!f) return;
    e.preventDefault();
    var ok = $('[data-form-ok]', f); if (ok) { ok.hidden = false; ok.focus && ok.focus(); }
  });

  /* ---------- видео под первым экраном ----------
     Страница открывается без него. После загрузки, только на компьютере и при обычной связи, ролик скачивается
     и проявляется под синим слоем, слово «МедВектор» при этом становится стеклом (.is-film). Ушли с первого экрана: пауза. */
  (function () {
    var box = $('[data-hero-film]'); if (!box) return;
    var v = $('video', box), conn = navigator.connection || {};
    if (reduce || !fine || innerWidth < 1021 || conn.saveData || /2g|3g/.test(conn.effectiveType || '') || !v.canPlayType || !('IntersectionObserver' in window)) return;
    var me = document.currentScript || $('script[src*="home.js"]'), src = me && me.getAttribute('src');
    var base = src ? src.replace(/js\/[^/]*$/, 'video/') : 'assets/video/';
    var name = base + box.getAttribute('data-hero-film'), seen = true, loaded = false, shown = false;
    /* кадр-заставка (около 20 КБ) приходит вместе со страницей и ждёт под прозрачным слоем, сам ролик качается после загрузки */
    v.poster = name + '.webp';
    var play = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    var show = function () { if (shown) return; shown = true; box.classList.add('is-on'); box.parentNode.classList.add('is-film'); };
    var start = function () {
      loaded = true;
      v.src = name + (v.canPlayType('video/webm; codecs="vp9"') ? '.webm' : '.mp4');
      v.addEventListener('playing', show, { once: true });
      setTimeout(show, 1200); /* связь медленная: проявляем кадр-заставку, ролик подхватит с него же */
      if (seen) play();
    };
    new IntersectionObserver(function (es) {
      seen = es[es.length - 1].isIntersecting;
      if (!loaded) return;
      if (seen) play(); else v.pause();
    }, { threshold: 0.15 }).observe(box);
    document.addEventListener('visibilitychange', function () { if (!loaded) return; if (document.hidden) v.pause(); else if (seen) play(); });
    var later = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 400); })(start, { timeout: 1500 }); };
    if (document.readyState === 'complete') later(); else addEventListener('load', later);
  })();

  /* ---------- «Как идёт работа»: живая переписка в телефоне ----------
     Когда телефон на экране, менеджер «печатает» и присылает сообщения по одному, клиент набирает ответ в поле
     и отправляет, лента подъезжает вверх. Двигается только transform, раскладка страницы не меняется.
     Без JS и при «уменьшить движение» видна вся переписка сразу. */
  (function () {
    var ph = $('#process .cx'); if (!ph) return;
    var sec = ph.closest('section'), view = $('.cx__view', ph), feed = $('.cx__feed', ph), typing = $('.cx__typing', ph),
      status = $('.cx__status', ph), field = $('.cx__field', ph), send = $('.cx__send', ph), hint = field.textContent,
      items = $$('.cx__feed > *', ph), msgs = items.filter(function (x) { return x.classList.contains('cx__m'); });
    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var fit = function (extra) {
      var last = null; items.forEach(function (x) { if (x.classList.contains('on')) last = x; });
      var y = Math.min(0, view.clientHeight - 14 - (extra || 0) - (last ? last.offsetTop + last.offsetHeight : 0));
      feed.style.transform = 'translateY(' + y + 'px)';
    };
    var show = function (i) {
      var m = msgs[i];
      for (var k = items.indexOf(m) - 1; k >= 0 && !items[k].classList.contains('cx__m'); k--) items[k].classList.add('on');
      m.classList.add('on'); fit();
      $$('[data-at]', sec).forEach(function (x) { x.classList.toggle('on', +x.dataset.at <= i); });
    };
    var one = function (i) {
      var m = msgs[i];
      if (m.classList.contains('cx__m--me')) {
        var t = $('.cx__t', m).textContent, c = 0;
        field.classList.add('is-typing');
        var type = function () {
          if (c < t.length) { c++; field.textContent = t.slice(0, c); return wait(t[c - 1] === ' ' ? 70 : 38).then(type); }
          return wait(380).then(function () { send.classList.add('is-on'); return wait(260); }).then(function () {
            field.textContent = hint; field.classList.remove('is-typing'); send.classList.remove('is-on'); show(i);
            return wait(900);
          }).then(function () { m.classList.add('is-read'); return wait(600); });
        };
        return type();
      }
      status.textContent = 'печатает'; status.classList.add('is-typing');
      if (items.slice(0, items.indexOf(m)).some(function (x) { return x.classList.contains('on'); })) fit(46);
      typing.classList.add('on');
      return wait(Math.min(1800, 600 + m.textContent.length * 12)).then(function () {
        typing.classList.remove('on'); status.textContent = 'в сети'; status.classList.remove('is-typing'); show(i);
        return wait(750);
      });
    };
    var run = function (i) { if (i < msgs.length) one(i).then(function () { run(i + 1); }); };
    if (reduce || !('IntersectionObserver' in window)) { msgs.forEach(function (m, i) { show(i); m.classList.add('is-read'); }); return; }
    var io = new IntersectionObserver(function (es) {
      if (!es[es.length - 1].isIntersecting) return;
      io.disconnect(); wait(400).then(function () { run(0); });
    }, { threshold: 0.45 });
    io.observe(ph);
    addEventListener('resize', function () { fit(); });

    /* телефон чуть поворачивается за мышью */
    var stage = $('[data-tilt]', sec), dev = stage && $('.c5__dev', stage);
    if (stage && dev && fine) {
      var raf = 0, px = 0.5, py = 0.5;
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect(); px = (e.clientX - r.left) / r.width; py = (e.clientY - r.top) / r.height;
        if (!raf) raf = requestAnimationFrame(function () { raf = 0; dev.style.setProperty('--ry', (-16 + (px - 0.5) * 14).toFixed(2) + 'deg'); dev.style.setProperty('--rx', (6 - (py - 0.5) * 8).toFixed(2) + 'deg'); });
      });
      stage.addEventListener('pointerleave', function () { dev.style.removeProperty('--ry'); dev.style.removeProperty('--rx'); });
    }
  })();

  /* ---------- секции за экраном ставят свои бесконечные анимации на паузу ---------- */
  if ('IntersectionObserver' in window) {
    var offIO = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('is-off', !e.isIntersecting); }); }, { rootMargin: '100px 0px' });
    $$('main > section').forEach(function (s) { offIO.observe(s); });
  }

  /* ---------- запуск ---------- */
  fit(); mountTeeth(); counts(document); watch(document, false); onScroll();
  requestAnimationFrame(loop);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(); if (MV.line) MV.line.rebuild(); });
  addEventListener('load', function () { vh = innerHeight; onScroll(); if (MV.line) MV.line.rebuild(); });
})();

/* МедВектор: линия-вектор. Одна линия идёт через всю страницу по невидимым меткам [data-vp] в показанных визуалах,
   рисуется по мере прокрутки, впереди идёт стрелка, по готовой части пробегает импульс.
   Метка: data-vp, data-vp-r (как прийти в точку: z, vh, hv, d, l), data-vp-f (доля поворота), data-vp-node (узел). */
(function () {
  'use strict';
  var MV = window.MV, main = document.querySelector('main');
  if (!MV || !main) return;
  var NS = 'http://www.w3.org/2000/svg';
  var el = function (n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; };
  var svg = el('svg', { 'class': 'vecline', 'aria-hidden': 'true', focusable: 'false' });
  main.insertBefore(svg, main.firstChild);
  var COLOR = { light: '#008cd8', fog: '#008cd8', dark: '#2aa8f2', azure: '#ffffff' };
  var BG = { light: '#ffffff', fog: '#f2f4f7', dark: '#000f40', azure: '#008cd8' };
  var total = 0, samples = [], drawn = [], pulses = [], dots = [], bands = [], head = null, cur = 0, target = 0, ready = false, R = 30;

  // положение метки относительно main без учёта анимаций transform
  var pos = function (e) { var x = 0, y = 0, n = e; while (n && n !== main) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return n === main ? { x: x + 0.5, y: y + 0.5 } : null; };

  var route = function (pts) {
    var v = [{ x: pts[0].x, y: pts[0].y }], i, a, p, dx, dy, f, s, m;
    for (i = 1; i < pts.length; i++) {
      a = v[v.length - 1]; p = pts[i]; dx = p.x - a.x; dy = p.y - a.y; f = p.f;
      if (p.r === 'l' || (Math.abs(dx) < 1 || Math.abs(dy) < 1)) { v.push({ x: p.x, y: p.y }); continue; }
      if (p.r === 'vh') { v.push({ x: a.x, y: p.y }, { x: p.x, y: p.y }); continue; }
      if (p.r === 'hv') { v.push({ x: p.x, y: a.y }, { x: p.x, y: p.y }); continue; }
      if (p.r === 'd') { // вертикаль, диагональ под 45 градусов, вертикаль
        s = dy > 0 ? 1 : -1;
        if (Math.abs(dy) >= Math.abs(dx)) { m = a.y + (dy - s * Math.abs(dx)) * f; v.push({ x: a.x, y: m }, { x: p.x, y: m + s * Math.abs(dx) }, { x: p.x, y: p.y }); }
        else { s = dx > 0 ? 1 : -1; m = a.x + (dx - s * Math.abs(dy)) * f; v.push({ x: m, y: a.y }, { x: m + s * Math.abs(dy), y: p.y }, { x: p.x, y: p.y }); }
        continue;
      }
      if (p.r === 'zh') { m = a.x + dx * f; v.push({ x: m, y: a.y }, { x: m, y: p.y }, { x: p.x, y: p.y }); continue; }
      m = a.y + dy * f; v.push({ x: a.x, y: m }, { x: p.x, y: m }, { x: p.x, y: p.y }); // z: вниз, вбок, вниз
    }
    // убрать повторы и точки на одной прямой
    var c = [v[0]];
    for (i = 1; i < v.length; i++) {
      var q = v[i], l = c[c.length - 1];
      if (Math.abs(q.x - l.x) < 0.5 && Math.abs(q.y - l.y) < 0.5) continue;
      if (c.length > 1) { var k = c[c.length - 2], cr = (l.x - k.x) * (q.y - l.y) - (l.y - k.y) * (q.x - l.x); if (Math.abs(cr) < 0.5 && ((l.x - k.x) * (q.x - l.x) + (l.y - k.y) * (q.y - l.y)) > 0) { c[c.length - 1] = q; continue; } }
      c.push(q);
    }
    var r1 = function (v) { return Math.round(v * 10) / 10; };
    var d = 'M' + r1(c[0].x) + ' ' + r1(c[0].y), poly = [[r1(c[0].x), r1(c[0].y)]];
    for (i = 1; i < c.length; i++) {
      var B = c[i], A = c[i - 1], C = c[i + 1];
      if (!C) { d += 'L' + r1(B.x) + ' ' + r1(B.y); poly.push([r1(B.x), r1(B.y)]); break; }
      var ab = Math.hypot(B.x - A.x, B.y - A.y), bc = Math.hypot(C.x - B.x, C.y - B.y), r = Math.min(R, ab / 2, bc / 2);
      var p1x = r1(B.x + (A.x - B.x) / ab * r), p1y = r1(B.y + (A.y - B.y) / ab * r), p2x = r1(B.x + (C.x - B.x) / bc * r), p2y = r1(B.y + (C.y - B.y) / bc * r), bx = r1(B.x), by = r1(B.y);
      d += 'L' + p1x + ' ' + p1y + 'Q' + bx + ' ' + by + ' ' + p2x + ' ' + p2y;
      poly.push([p1x, p1y]);
      // скругление: кривая разбита на 10 отрезков
      for (var t = 1; t <= 10; t++) { var u = t / 10, w = 1 - u; poly.push([w * w * p1x + 2 * w * u * bx + u * u * p2x, w * w * p1y + 2 * w * u * by + u * u * p2y]); }
    }
    return { d: d, poly: poly };
  };

  // таблица длин по ломаной: точка на заданной длине без обращений к SVG
  var PX = [], PY = [], PL = [];
  var table = function (poly) {
    PX = []; PY = []; PL = []; var L = 0;
    for (var i = 0; i < poly.length; i++) {
      if (i) L += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
      PX.push(poly[i][0]); PY.push(poly[i][1]); PL.push(L);
    }
    return L;
  };
  var pointAt = function (l) {
    var n = PL.length - 1; if (n < 1) return { x: PX[0] || 0, y: PY[0] || 0 };
    if (l <= 0) return { x: PX[0], y: PY[0] }; if (l >= PL[n]) return { x: PX[n], y: PY[n] };
    var lo = 0, hi = n;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (PL[mid] <= l) lo = mid; else hi = mid; }
    var k = (l - PL[lo]) / ((PL[hi] - PL[lo]) || 1);
    return { x: PX[lo] + (PX[hi] - PX[lo]) * k, y: PY[lo] + (PY[hi] - PY[lo]) * k };
  };

  var rebuild = function () {
    var marks = Array.prototype.slice.call(main.querySelectorAll('[data-vp]')).filter(function (m) { return !m.closest('[hidden]') && m.offsetParent !== null; });
    var pts = [];
    marks.forEach(function (m) {
      var p = pos(m); if (!p) return;
      pts.push({ x: p.x, y: p.y, r: m.dataset.vpR || 'z', f: m.dataset.vpF == null ? 0.5 : +m.dataset.vpF, node: m.hasAttribute('data-vp-node'), el: m });
    });
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    drawn = []; pulses = []; dots = []; bands = []; ready = false;
    if (pts.length < 2) return;
    R = innerWidth < 720 ? 18 : 30;
    var rr = route(pts), d = rr.d, W = main.offsetWidth, defs = el('defs', {});
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + main.offsetHeight);
    svg.setAttribute('width', W); svg.setAttribute('height', main.offsetHeight);
    svg.appendChild(defs);
    total = table(rr.poly);
    // выборка длины: для каждой длины наибольшая достигнутая высота
    samples = []; var step = 10, my = -1e9, L, pt;
    for (L = 0; L <= total; L += step) { pt = pointAt(L); if (pt.y > my) my = pt.y; samples.push(my); }
    var TL = total.toFixed(1);
    Array.prototype.forEach.call(main.querySelectorAll(':scope > section'), function (sec, i) {
      var kind = sec.dataset.line || 'light', col = COLOR[kind] || COLOR.light, top = sec.offsetTop, h = sec.offsetHeight, id = 'vlc' + i;
      var cp = el('clipPath', { id: id }); cp.appendChild(el('rect', { x: -40, y: top, width: W + 80, height: h })); defs.appendChild(cp);
      var g = el('g', { 'clip-path': 'url(#' + id + ')', stroke: col });
      g.appendChild(el('path', { d: d, 'class': 'vl-ghost' }));
      // pathLength: длина в штрихах равна длине по таблице, расчёт и рисунок совпадают
      var p = el('path', { d: d, 'class': 'vl-main', pathLength: TL }); g.appendChild(p); drawn.push(p);
      var pu = el('path', { d: d, 'class': 'vl-pulse', pathLength: TL, stroke: kind === 'azure' ? '#000f40' : kind === 'dark' ? '#ffffff' : '#000f40' }); g.appendChild(pu); pulses.push(pu);
      p.__da = pu.__da = '';
      svg.appendChild(g); bands.push({ top: top, bottom: top + h, col: col, bg: BG[kind] || BG.light });
    });
    var band = function (y) { for (var i = 0; i < bands.length; i++) if (y >= bands[i].top && y < bands[i].bottom) return bands[i]; return bands[0] || { col: COLOR.light, bg: BG.light }; };
    // узлы: найти длину пути, ближайшую к метке
    pts.forEach(function (p) {
      if (!p.node) return;
      var best = 0, bd = 1e9, l, q;
      for (l = 0; l <= total; l += 4) { q = pointAt(l); var dd = (q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y); if (dd < bd) { bd = dd; best = l; } }
      var b = band(p.y), c = el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 5.5, 'class': 'vl-dot', stroke: b.col }); c.style.color = b.col; c.style.fill = b.bg;
      svg.appendChild(c); dots.push({ el: c, len: best, bg: b.bg, col: b.col, on: null });
    });
    head = el('path', { d: 'M-10 -7.5L0 0L-10 7.5', 'class': 'vl-head' }); head.__band = band; svg.appendChild(head);
    cur = Math.min(cur, total); ready = true; frame(performance.now(), true);
  };

  var lenAt = function (y) { // длина пути, до которой линия не опускается ниже y
    var lo = 0, hi = samples.length - 1;
    if (!samples.length || samples[0] > y) return 0;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (samples[mid] <= y) lo = mid; else hi = mid - 1; }
    return Math.min(total, lo * 10 + 10);
  };
  var frame = function (now, force) {
    if (!ready) return;
    var top = main.getBoundingClientRect().top, y = innerHeight * 0.64 - top;
    target = lenAt(y);
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 6) target = total;
    if (MV.reduce) cur = target; else cur += (target - cur) * 0.12;
    if (Math.abs(target - cur) < 0.4) cur = target;
    var da = cur.toFixed(1) + ' ' + (total + 20).toFixed(0), i, vt = -top - 200, vb = -top + innerHeight + 200, on;
    // импульс бежит по нарисованной части к стрелке
    var pp = MV.reduce ? -1 : (now * 0.34) % (cur + 900), pd = pp > 60 && pp < cur ? '0 ' + (pp - 60).toFixed(1) + ' 60 ' + (total + 20).toFixed(0) : '0 ' + (total + 20).toFixed(0);
    for (i = 0; i < drawn.length; i++) {
      on = bands[i].bottom > vt && bands[i].top < vb;
      // полосы за экраном не перерисовываем: их догонит первый кадр, когда они появятся
      if (!on && !force) continue;
      if (drawn[i].__da !== da) { drawn[i].__da = da; drawn[i].style.strokeDasharray = da; }
      var pdi = on ? pd : '0 ' + (total + 20).toFixed(0);
      if (pulses[i].__da !== pdi) { pulses[i].__da = pdi; pulses[i].style.strokeDasharray = pdi; }
    }
    if (cur > 14) {
      var a = pointAt(cur), b = pointAt(cur - 4), ang = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI;
      var tf = 'translate(' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) + ') rotate(' + ang.toFixed(1) + ')', hc = head.__band(a.y).col;
      if (head.__tf !== tf) { head.__tf = tf; head.setAttribute('transform', tf); }
      if (head.__c !== hc) { head.__c = hc; head.setAttribute('stroke', hc); }
      if (head.__o !== 1) { head.__o = 1; head.style.opacity = 1; }
    } else if (head.__o !== 0) { head.__o = 0; head.style.opacity = 0; }
    for (i = 0; i < dots.length; i++) { on = cur >= dots[i].len; if (dots[i].on !== on) { dots[i].on = on; dots[i].el.style.fill = on ? dots[i].col : dots[i].bg; } }
  };
  var rt = 0;
  MV.line = { rebuild: function () { cancelAnimationFrame(rt); rt = requestAnimationFrame(rebuild); }, state: function () { return { cur: cur, total: total }; } };
  MV.frames.push(frame);
  MV.line.rebuild();
})();

/* ===== Секции: указатель кейсов, макеты сайтов, колесо вопросов ===== */
(function () {
  'use strict';
  var MV = window.MV; if (!MV) return;
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* вкладки, которые переключаются наведением (указатель кейсов) */
  if (MV.fine) {
    $$('[data-hover-tabs] [data-tab]').forEach(function (t) {
      t.addEventListener('pointerenter', function () { if (!t.classList.contains('is-on')) t.click(); });
    });
  }

  /* макеты страниц в секции сайтов: рисуем из одного описания, чтобы не повторять разметку пятнадцать раз */
  var MOCKS = {
    implant: { c: 'light', t: 'Имплантация зубов под ключ', s: 'Имплант, абатмент и коронка в одной цене', h: 'Цены под ключ', p: ['Имплант с коронкой', 'Костная пластика', 'Консультация и снимок'], d: 'Хирург-имплантолог' },
    allon4: { c: 'dark', t: 'Зубы на четырёх имплантах', s: 'All-on-4: протез ставят в день операции', h: 'Что входит в цену', p: ['Четыре импланта', 'Временный протез', 'Постоянный протез'], d: 'Хирург-имплантолог' },
    ortho: { c: 'azure', t: 'Элайнеры и брекеты', s: 'План лечения и цена известны до начала', h: 'Цены на лечение', p: ['Элайнеры', 'Брекеты', 'Ретейнеры'], d: 'Врач-ортодонт' },
    clinic: { c: 'fog', t: 'Стоматология рядом с домом', s: 'Врачи, цены и запись онлайн', h: 'Услуги и цены', p: ['Лечение кариеса', 'Имплантация', 'Исправление прикуса'], d: 'Главный врач' },
    doctors: { c: 'light', t: 'Наши врачи', s: 'Стаж, образование и документы каждого', h: 'Приём врачей', p: ['Терапевт', 'Хирург', 'Ортодонт'], d: 'Стоматолог-терапевт' }
  };
  function mockHTML(k) {
    var m = MOCKS[k] || MOCKS.implant;
    return '<div class="mk mk--' + m.c + '">' +
      '<div class="mk__bar"><i></i><span></span><span></span><span></span><b></b></div>' +
      '<div class="mk__hero"><div><p class="mk__t">' + m.t + '</p><p class="mk__s">' + m.s + '</p><p class="mk__btn">Записаться</p></div><div class="mk__pic"></div></div>' +
      '<div class="mk__row"><i></i><i></i><i></i></div>' +
      '<p class="mk__h">' + m.h + '</p>' +
      '<div class="mk__price">' + m.p.map(function (x) { return '<p><span>' + x + '</span><b></b></p>'; }).join('') + '</div>' +
      '<p class="mk__h">Врач</p>' +
      '<div class="mk__doc"><i></i><div><b>' + m.d + '</b><span></span><span></span></div></div>' +
      '<p class="mk__h">Этапы лечения</p>' +
      '<div class="mk__steps"><i></i><i></i><i></i><i></i></div>' +
      '<p class="mk__h">Отзывы</p>' +
      '<div class="mk__rev"><div><b>Яндекс Карты</b><span></span><span></span></div><div><b>ПроДокторов</b><span></span><span></span></div></div>' +
      '<p class="mk__lic">Имеются противопоказания. Необходима консультация специалиста. Лицензия на медицинскую деятельность</p>' +
      '</div>';
  }
  $$('.mock[data-mock]').forEach(function (el) { el.setAttribute('aria-hidden', 'true'); el.innerHTML = mockHTML(el.dataset.mock); });

  /* колесо вопросов из первого варианта сайта: на широком экране заменяет раскрывающийся список (переключают стили).
     Кольцо с делениями поворачивается целиком, выбранный вопрос встаёт против указателя, ответ меняется справа.
     Колесо замкнуто: после последнего вопроса идёт первый, кольцо продолжает вращаться в ту же сторону. */
  $$('[data-wheel]').forEach(function (qa) {
    var box = qa.parentElement, wheel = box.querySelector('.wheel'); if (!wheel) return;
    var items = $$('.qa__item', qa).map(function (d) { return { q: d.querySelector('.qa__q').innerHTML, a: d.querySelector('.qa__a').innerHTML }; });
    var N = items.length, STEP = 26, half = N >> 1;
    var ring = wheel.querySelector('.wheel__ring'), tabs = $$('.wheel__q', wheel), panel = wheel.querySelector('.wheel__panel');
    var title = wheel.querySelector('.wheel__title'), ans = wheel.querySelector('.wheel__a'), count = wheel.querySelector('.wheel__count b');
    var hub = wheel.querySelector('.wheel__hub canvas');
    if (!N || tabs.length !== N) return;
    var near = function (k) { return ((k % N) + N + half) % N - half; }; // смещение по кругу от -half до half - 1
    var cur = -1, pos = 0, swap;
    var pick = function (i, focus) {
      i = ((i % N) + N) % N;
      if (i === cur) return;
      var first = cur < 0;
      pos += first ? i : near(i - cur); cur = i;
      ring.style.setProperty('--rot', (-pos * STEP) + 'deg');
      tabs.forEach(function (t, k) {
        var o = near(k - cur), on = k === cur;
        t.style.setProperty('--a', ((pos + o) * STEP) + 'deg');
        t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; t.classList.toggle('is-far', Math.abs(o) > 2);
      });
      panel.setAttribute('aria-labelledby', tabs[cur].id);
      count.textContent = cur + 1;
      var fill = function () { title.innerHTML = items[cur].q; ans.innerHTML = items[cur].a; panel.classList.remove('is-swap'); };
      clearTimeout(swap);
      if (first || MV.reduce) fill(); else { panel.classList.add('is-swap'); swap = setTimeout(fill, 220); }
      if (focus) tabs[cur].focus({ preventScroll: true });
    };
    tabs.forEach(function (t, k) { t.addEventListener('click', function () { pick(k); }); });
    $$('.wheel__btn', wheel).forEach(function (b) { b.addEventListener('click', function () { pick(cur + +b.dataset.step); }); });
    wheel.querySelector('.wheel__tabs').addEventListener('keydown', function (e) {
      var step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (step) { e.preventDefault(); pick(cur + step, true); }
      else if (e.key === 'Home') { e.preventDefault(); pick(0, true); }
      else if (e.key === 'End') { e.preventDefault(); pick(N - 1, true); }
    });
    pick(0);
    // зуб в середине доворачивается вслед за колесом
    MV.frames.push(function () { var t = hub && hub.__tooth; if (t && t.state) t.state.extraYaw += (pos * 0.7 - t.state.extraYaw) * 0.06; });
  });
  /* стрелки на клавиатуре переключают вкладки */
  document.addEventListener('keydown', function (e) {
    var k = e.key, d = k === 'ArrowDown' || k === 'ArrowRight' ? 1 : k === 'ArrowUp' || k === 'ArrowLeft' ? -1 : 0;
    var tab = d && e.target.closest && e.target.closest('[role="tablist"] [data-tab]'); if (!tab) return;
    var tabs = $$('[data-tab]', tab.closest('[role="tablist"]')), next = tabs[(tabs.indexOf(tab) + d + tabs.length) % tabs.length];
    e.preventDefault(); next.click(); next.focus({ preventScroll: true });
  });

  /* карта регионов: когда круг проявления дошёл до краёв, маску снимаем, чтобы огоньки не тянули её за собой в каждом кадре */
  $$('.g2__frame').forEach(function (f) {
    f.addEventListener('transitionend', function (e) { if (e.propertyName === '--g2r' && f.parentElement.classList.contains('is-in')) f.classList.add('is-shown'); });
  });

})();
