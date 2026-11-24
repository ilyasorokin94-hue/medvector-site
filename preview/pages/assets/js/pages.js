/* МедВектор, внутренние страницы. Поведение как на главной (assets/js/home.js): плавная прокрутка, шапка, меню,
   появление блоков, счётчики, магнитные кнопки и курсор. Плюс то, что есть только здесь: вкладки, шаги и переключатели
   в секциях, форма заявки с выбором услуги, нижняя кнопка на телефоне и панель выбора вариантов в сборке выбора.
   Плавная прокрутка: assets/js/vendor/lenis.min.js (подключается раньше).
   Файл assets/js/pages.js собирается при сборке из src/js: основа, поведение использованных вариантов секций (src/js/looks) и запуск. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var fmt = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
  var MV = window.MV = { reduce: reduce, fine: fine, clamp: clamp, frames: [], on: {} };
  // если скрипт пришёл поздно, страница уже показана как без скриптов (см. таймер в <head>): возвращаем обычный режим
  root.classList.remove('no-js'); root.classList.add('js');
  var vh = innerHeight;

  /* ---------- плавная прокрутка (только мышь, как на главной) ---------- */
  var lenis = null;
  if (fine && !reduce && window.Lenis) {
    try { lenis = new Lenis({ autoRaf: true, lerp: 0.11, anchors: { offset: -16 }, stopInertiaOnNavigate: true }); MV.lenis = lenis; } catch (e) { lenis = null; }
  }

  /* ---------- шапка: прячется при прокрутке вниз, над тёмным первым экраном прозрачная ---------- */
  var hdr = $('.hdr'), mcta = $('.mcta'), lastY = scrollY, menuOpen = false, keepHeader = 0;
  document.addEventListener('click', function (e) { if (e.target.closest('a[href*="#"]')) keepHeader = performance.now() + 1200; });
  var overHero = function () {
    var first = $('main > section, main > .vset');
    if (first && first.classList.contains('vset')) first = $('.vset__v:not([hidden]) > section', first);
    if (hdr) hdr.classList.toggle('hdr--over', !!(first && first.hasAttribute('data-over')));
  };
  overHero();
  var onHeader = function () {
    var y = scrollY;
    if (hdr) {
      hdr.classList.toggle('is-scrolled', y > 8);
      if (!menuOpen && y > 400 && y > lastY + 4 && performance.now() > keepHeader) hdr.classList.add('is-hidden');
      else if (y < lastY - 4 || y < 400) hdr.classList.remove('is-hidden');
    }
    if (mcta) {
      var st = $('#start'), sr = st && st.getBoundingClientRect();
      mcta.classList.toggle('is-on', y > vh * 0.7 && !(sr && sr.top < vh * 0.9));
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
    if (fine) { drop.addEventListener('pointerenter', function () { set(true); }); drop.addEventListener('pointerleave', function () { timer = setTimeout(function () { set(false); }, 220); }); }
    drop.addEventListener('focusout', function (e) { if (!drop.contains(e.relatedTarget)) set(false); });
    drop.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { set(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!drop.contains(e.target) || e.target.closest('a')) set(false); });
  });

  /* ---------- появление блоков ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var row = e.target.parentElement, side = row && /auto|scroll/.test(getComputedStyle(row).overflowX);
      // карточки в ленте, которая листается вбок (телефон): появляются всей лентой, иначе те, что за краем экрана, так и остались бы скрытыми
      (side ? $$(':scope > [data-rv]', row) : [e.target]).forEach(function (el) { el.classList.add('is-in'); io.unobserve(el); });
    });
  }, { rootMargin: '0px 0px -6% 0px' }) : null;
  var watch = function (scope, replay) {
    $$('[data-rv], .ticks', scope).forEach(function (el) {
      if (reduce || !io) { el.classList.add('is-in'); return; }
      if (replay) el.classList.remove('is-in');
      if (el.classList.contains('is-in')) return;
      /* первый экран показываем целиком сразу, не дожидаясь прокрутки */
      if (el.closest('#intro, [data-sec="hero"]')) { requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); }); return; }
      io.observe(el);
    });
  };
  MV.watch = watch;

  /* ---------- счётчики: число набегает с нуля, когда видно ---------- */
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
  MV.counts = counts;

  /* ---------- магнитные кнопки и курсор (только мышь) ---------- */
  if (fine && !reduce) {
    document.addEventListener('pointermove', function (e) {
      var b = e.target.closest && e.target.closest('[data-magnetic]');
      $$('[data-magnetic].is-mag').forEach(function (x) { if (x !== b) { x.style.transform = ''; x.classList.remove('is-mag'); } });
      if (!b) return;
      var r = b.getBoundingClientRect();
      b.classList.add('is-mag'); b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px)';
    }, { passive: true });
    var curEl = document.createElement('div'); curEl.className = 'cur'; curEl.setAttribute('aria-hidden', 'true'); curEl.innerHTML = '<i></i>'; document.body.appendChild(curEl);
    var cx = 0, cy = 0, tx = 0, ty = 0, curOn = false, ctf = '';
    document.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY; if (!curOn) { cx = tx; cy = ty; curOn = true; curEl.classList.add('is-on'); }
      var t = e.target, link = t.closest && t.closest('a, button, summary, label, [role="button"], [data-cur]'), text = t.closest && t.closest('input, textarea, select');
      curEl.classList.toggle('is-link', !!link && !text); curEl.classList.toggle('is-text', !!text);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { curOn = false; curEl.classList.remove('is-on'); });
    // курсор догоняет мышь; когда догнал, кадр ничего не пишет в стили
    MV.frames.push(function () {
      if (Math.abs(tx - cx) < 0.15 && Math.abs(ty - cy) < 0.15) { cx = tx; cy = ty; } else { cx += (tx - cx) * 0.2; cy += (ty - cy) * 0.2; }
      var t = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
      if (t !== ctf) { ctf = t; curEl.style.transform = t; }
    });
  }

  /* ---------- прокрутка: прогресс секций (--p от 0 до 1) ---------- */
  var progs = [];
  var findProgs = function () { progs = $$('[data-prog]').filter(function (el) { return !el.closest('[hidden]'); }); };
  var onScroll = function () {
    onHeader();
    for (var i = 0; i < progs.length; i++) {
      var el = progs[i], r = el.getBoundingClientRect(), p;
      if (r.bottom < -vh || r.top > vh * 2) continue;
      if (el.dataset.prog === 'pin') p = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
      else p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      // пишем, только если значение изменилось: каждая запись пересчитывает стили блока
      var v = p.toFixed(3); if (el.__p !== v) { el.__p = v; el.style.setProperty('--p', v); if (MV.on[el.dataset.progHook]) MV.on[el.dataset.progHook](el, p); }
    }
  };
  var ticking = false;
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScroll(); }); } }, { passive: true });
  var rt;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { vh = innerHeight; onScroll(); }, 140); });
  var loop = function (now) { for (var i = 0; i < MV.frames.length; i++) MV.frames[i](now); requestAnimationFrame(loop); };

  /* ---------- вкладки: кнопки role="tab" управляют панелями по aria-controls, стрелки переключают ---------- */
  var tabs = function (scope) {
    $$('[data-tabs]', scope).forEach(function (box) {
      if (box.__tabs) return; box.__tabs = 1;
      var btns = $$('[role="tab"]', box), panels = btns.map(function (b) { return document.getElementById(b.getAttribute('aria-controls')) || $('#' + b.getAttribute('aria-controls'), box); });
      var show = function (i, focus) {
        btns.forEach(function (b, k) {
          var on = k === i;
          b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; b.classList.toggle('is-on', on);
          if (panels[k]) { panels[k].hidden = !on; if (on) { watch(panels[k], true); counts(panels[k]); } }
        });
        box.style.setProperty('--tab', i);
        if (focus) btns[i].focus();
      };
      btns.forEach(function (b, i) {
        // панель выезжает только при переключении: при загрузке первая вкладка стоит на месте
        b.addEventListener('click', function () { box.classList.add('is-used'); show(i); });
        b.addEventListener('keydown', function (e) {
          var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          if (step) { e.preventDefault(); box.classList.add('is-used'); show((i + step + btns.length) % btns.length, true); }
        });
      });
      var byHash = function () { var i = panels.findIndex(function (p) { return p && '#' + p.id === location.hash; }); if (i >= 0) show(i); return i >= 0; };
      addEventListener('hashchange', byHash);
      if (!byHash()) show(0);
    });
  };

  /* ---------- форма заявки: выбор услуги, проверка полей, макет отправки ---------- */
  var forms = function (scope) {
    $$('form[data-form]', scope).forEach(function (form) {
      if (form.__f) return; form.__f = 1;
      var dir = $('.fm__dir', form);
      var sync = function () { var v = (form.querySelector('input[name="service"]:checked') || {}).value; if (dir) dir.hidden = v === 'site'; };
      $$('input[name="service"]', form).forEach(function (r) { r.addEventListener('change', sync); });
      sync();
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = true;
        $$('input[required]', form).forEach(function (inp) {
          var bad = inp.type === 'checkbox' ? !inp.checked : !inp.value.trim();
          inp.classList.toggle('is-bad', bad); inp.setAttribute('aria-invalid', bad);
          if (bad && ok) { ok = false; inp.focus(); }
        });
        if (ok) { var m = $('.fm__ok', form); if (m) { m.hidden = false; m.focus(); } }
      });
      $$('input', form).forEach(function (inp) { inp.addEventListener('input', function () { inp.classList.remove('is-bad'); inp.removeAttribute('aria-invalid'); }); });
    });
  };
  // кнопки «Запустить тест» и «Обсудить сайт» заранее выбирают услугу в форме
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-pick]');
    if (!a) return;
    $$('#start input[name="service"][value="' + a.dataset.pick + '"]').forEach(function (r) { r.checked = true; r.dispatchEvent(new Event('change')); });
    if (a.dataset.dir) $$('#start select[name="direction"]').forEach(function (d) { d.value = a.dataset.dir; });
  });

  /* ---------- запрос в образце печатается по буквам ---------- */
  var typing = function (scope) {
    if (reduce || !('IntersectionObserver' in window)) return;
    $$('[data-type]', scope).forEach(function (el) {
      if (el.__t) return; el.__t = 1;
      var txt = el.dataset.type; el.textContent = '';
      var o = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; o.disconnect();
        var i = 0; setTimeout(function () { var t = setInterval(function () { el.textContent = txt.slice(0, ++i); if (i >= txt.length) clearInterval(t); }, 65); }, 500);
      }, { threshold: 0.8 });
      o.observe(el);
    });
  };

  /* ---------- поведение отдельных вариантов секций: каждый вариант регистрирует MV.looks[имя](секция) ---------- */
  MV.looks = MV.looks || {};
  var mountLooks = function (scope) {
    $$('[data-look]', scope).forEach(function (el) { var f = MV.looks[el.dataset.look]; if (f && !el.__look) { el.__look = 1; f(el, MV); } });
  };
  var mount = function (scope) { watch(scope); counts(scope); tabs(scope); forms(scope); typing(scope); mountLooks(scope); findProgs(); onScroll(); };
  MV.mount = mount;

  /* ---------- секция за экраном: бесконечные анимации стоят ---------- */
  if ('IntersectionObserver' in window) {
    var offIO = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('is-off', !e.isIntersecting); }); }, { rootMargin: '200px 0px' });
    $$('main section').forEach(function (s) { offIO.observe(s); });
  }

  /* ---------- содержание статьи: подсвечен раздел, который сейчас читают ---------- */
  var tocSpy = function () {
    var links = $$('.art-p__toc a[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;
    var byId = {};
    links.forEach(function (a) { byId[decodeURIComponent(a.hash.slice(1))] = a; });
    var hs = Object.keys(byId).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (!hs.length) return;
    var io = new IntersectionObserver(function () {
      // текущий раздел: последний заголовок, который уже поднялся выше середины экрана
      var cur = hs[0];
      hs.forEach(function (h) { if (h.getBoundingClientRect().top < innerHeight * .5) cur = h; });
      links.forEach(function (a) { a.classList.toggle('is-here', a === byId[cur.id]); });
    }, { rootMargin: '0px 0px -50% 0px', threshold: [0, 1] });
    hs.forEach(function (h) { io.observe(h); });
  };

  /* ---------- сборка выбора: у секции три варианта подачи, переключатель над ней, выбор копируется кодом ---------- */
  var pickUI = function () {
    var sets = $$('[data-vset]');
    // сборка MV_PICK=all показывает все варианты подряд для скриншотов: переключатель не нужен
    if (!sets.length || document.body.classList.contains('is-pick-all')) return;
    // выбор хранится по адресу страницы на боевом сайте (из canonical), поэтому одна кнопка собирает выбор со всех страниц
    var canon = document.querySelector('link[rel=canonical]');
    var key = 'mv-pick:' + (canon ? new URL(canon.href).pathname : location.pathname);
    var saved = {}; try { saved = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { saved = {}; }
    var bar = document.createElement('div'); bar.className = 'pick-bar';
    bar.innerHTML = '<p class="pick-bar__t">Выбор вариантов: <b data-code></b> <span data-all></span></p><button type="button" class="pick-bar__btn" data-copy>Скопировать выбор</button><button type="button" class="pick-bar__btn pick-bar__btn--ghost" data-reset>Сбросить</button>';
    document.body.appendChild(bar);
    var code = function () { return sets.map(function (s) { return s.__v || 1; }).join('-'); };
    // все страницы, где выбран не первый вариант: «/yandex-direkt/: intro 2, faq 3»
    var all = function () {
      var lines = [];
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i); if (k.indexOf('mv-pick:/') !== 0) continue;
          var o = JSON.parse(localStorage.getItem(k) || '{}');
          var p = Object.keys(o).filter(function (id) { return o[id] > 1; }).map(function (id) { return id + ' ' + o[id]; });
          if (p.length) lines.push(k.slice(8) + ': ' + p.join(', '));
        }
      } catch (e) {}
      return lines.sort();
    };
    var paint = function () { $('[data-code]', bar).textContent = code(); var n = all().length; $('[data-all]', bar).textContent = n ? '(страниц с выбором: ' + n + ')' : ''; };
    sets.forEach(function (set, n) {
      var vs = $$(':scope > .vset__v', set), sh = $('h2, h1', vs[0]);
      var name = sh ? sh.textContent.trim().replace(/\s+/g, ' ') : set.dataset.vtype;
      var ui = document.createElement('div'); ui.className = 'vset__bar';
      ui.innerHTML = '<span class="vset__num">' + (n + 1) + '</span><span class="vset__name">' + name.slice(0, 64) + '</span><span class="vset__btns" role="group" aria-label="Варианты секции"></span>';
      var box = $('.vset__btns', ui);
      var show = function (i, scroll) {
        set.__v = i + 1;
        vs.forEach(function (v, k) { v.hidden = k !== i; });
        $$('button', box).forEach(function (b, k) { b.setAttribute('aria-pressed', k === i); });
        saved[set.id || n] = i + 1; try { localStorage.setItem(key, JSON.stringify(saved)); } catch (e) {}
        mount(vs[i]); if (n === 0) overHero(); paint();
        if (scroll) { var y = set.getBoundingClientRect().top + scrollY - (hdr ? hdr.offsetHeight : 0) - 8; if (lenis) lenis.scrollTo(y, { immediate: true }); else scrollTo(0, y); }
      };
      vs.forEach(function (v, i) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'vset__b';
        b.innerHTML = '<b>' + (i + 1) + '</b><small>' + (v.dataset.name || '') + '</small>';
        b.addEventListener('click', function () { show(i, false); });
        box.appendChild(b);
      });
      set.insertBefore(ui, set.firstChild);
      show(clamp((saved[set.id || n] || 1) - 1, 0, vs.length - 1), false);
    });
    $('[data-copy]', bar).addEventListener('click', function (e) {
      var lines = all(), txt = 'Выбор вариантов МедВектор\n' + (lines.length ? lines.join('\n') : 'везде первые варианты');
      var done = function () { e.target.textContent = 'Скопировано'; setTimeout(function () { e.target.textContent = 'Скопировать выбор'; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, function () { prompt('Скопируйте выбор', txt); }); else prompt('Скопируйте выбор', txt);
    });
    $('[data-reset]', bar).addEventListener('click', function () { try { localStorage.removeItem(key); } catch (e) {} location.reload(); });
  };

  /* ---------- запуск ---------- */
  var boot = function () {
    pickUI();
    tocSpy();
    mount(document);
    onHeader();
    requestAnimationFrame(loop);
  };
  MV.boot = boot;
})();

/* потери «Указатель»: на широком экране строит слева список проблем, справа показывает разбор выбранной */
MV.looks['loss-index'] = function (el) {
  var panes = [].slice.call(el.querySelectorAll('.loix__p'));
  if (panes.length < 2 || !window.matchMedia) return;
  var mq = matchMedia('(min-width: 961px)'), nav = null, btns = [], uid = 'loix' + Math.random().toString(36).slice(2, 7);
  function set(i, focus) {
    btns.forEach(function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; });
    panes.forEach(function (p, k) { p.classList.toggle('is-cur', k === i); });
    if (focus) btns[i].focus();
  }
  function on() {
    nav = document.createElement('div'); nav.className = 'loix__nav'; nav.setAttribute('role', 'tablist');
    btns = panes.map(function (p, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'loix__b'; b.id = uid + 't' + i; p.id = uid + 'p' + i;
      b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', p.id); p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', b.id);
      b.innerHTML = p.querySelector('.loix__h').innerHTML;
      b.addEventListener('click', function () { set(i); });
      b.addEventListener('mouseenter', function () { set(i); });
      b.addEventListener('keydown', function (e) {
        var k = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (k) { e.preventDefault(); set((i + k + panes.length) % panes.length, true); }
      });
      nav.appendChild(b); return b;
    });
    el.insertBefore(nav, el.firstChild); el.classList.add('is-on'); set(0);
  }
  function off() {
    if (!nav) return; nav.remove(); nav = null; btns = []; el.classList.remove('is-on');
    panes.forEach(function (p) { p.classList.remove('is-cur'); p.removeAttribute('role'); p.removeAttribute('aria-labelledby'); });
  }
  function sync() { if (mq.matches) { if (!nav) on(); } else off(); }
  sync();
  if (mq.addEventListener) mq.addEventListener('change', sync);
};

/* шаги «Рельс»: линия заполняется до строки чтения, пройденные шаги отмечаются */
MV.looks['steps-rail'] = function (el, MV) {
  if (MV.on.stpr) return;
  MV.on.stpr = function (list) {
    var line = innerHeight * 0.62, r = list.getBoundingClientRect();
    list.style.setProperty('--q', MV.clamp((line - r.top) / Math.max(1, r.height), 0, 1).toFixed(3));
    var its = list.__its || (list.__its = list.querySelectorAll('.stpr__i'));
    for (var i = 0; i < its.length; i++) its[i].classList.toggle('is-on', its[i].getBoundingClientRect().top + 10 < line);
  };
};

/* запуск: после основы и вариантов секций */
(function () { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', window.MV.boot); else window.MV.boot(); })();
