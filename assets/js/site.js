// МедВектор: живые элементы сайта. Шапка и меню, якорное меню страницы, появление блоков, счётчики,
// вкладки направлений, колесо вопросов на главной, фильтр работ, форма заявки с выбором услуги.
// Без JavaScript всё содержимое видно: вкладки идут подряд, вопросы списком, форма обычной формой.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- шапка: компактная после прокрутки, прячется при прокрутке вниз ---------- */
  const header = $('.header');
  const bar = $('.progress');
  const mcta = $('.mcta');
  const start = $('#start');
  const hero = $('.hero, .phero, .solo');
  let lastY = scrollY, ticking = false, menuOpen = false, startVisible = false, keepHeader = 0;
  // после перехода по якорю шапка не прячется: меню остаётся под рукой
  document.addEventListener('click', e => { if (e.target.closest('a[href*="#"]')) keepHeader = performance.now() + 1200; });

  const onScroll = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    header.classList.toggle('is-compact', y > 40);
    if (!menuOpen && y > 500 && y > lastY + 4 && performance.now() > keepHeader) header.classList.add('is-hidden');
    if (y < lastY - 4 || y < 500) header.classList.remove('is-hidden');
    if (bar) bar.style.setProperty('--p', max > 0 ? (y / max).toFixed(4) : 0);
    if (mcta) mcta.classList.toggle('is-on', y > (hero ? hero.offsetHeight * .7 : 400) && !startVisible && !menuOpen);
    lastY = y;
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  if (start && mcta) new IntersectionObserver(([e]) => { startVisible = e.isIntersecting; onScroll(); }, { threshold: .05 }).observe(start);

  /* ---------- мобильное меню ---------- */
  const burger = $('.burger'), mnav = $('#mnav');
  const setMenu = open => {
    menuOpen = open;
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mnav.classList.toggle('is-open', open);
    mnav.setAttribute('aria-hidden', !open);
    mnav.inert = !open;
    header.classList.toggle('menu-open', open);
    header.classList.remove('is-hidden');
    document.body.classList.toggle('is-locked', open);
    if (mcta) mcta.classList.remove('is-on');
  };
  if (burger && mnav) {
    mnav.inert = true;
    burger.addEventListener('click', () => setMenu(!menuOpen));
    $$('a', mnav).forEach(a => a.addEventListener('click', () => setMenu(false)));
    addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) { setMenu(false); burger.focus(); } });
    matchMedia('(min-width: 1021px)').addEventListener('change', e => { if (e.matches && menuOpen) setMenu(false); });
  }

  /* ---------- якорное меню страницы: подсветка текущего раздела ---------- */
  const anchors = $$('.anchors a');
  if (anchors.length) {
    const map = new Map(anchors.map(a => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      anchors.forEach(a => a.classList.remove('is-active'));
      const a = map.get(e.target.id);
      if (a) { a.classList.add('is-active'); a.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); }
    }), { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((a, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---------- появление блоков и счётчики ---------- */
  const countUp = el => {
    const end = +el.dataset.count, t0 = performance.now(), dur = 1200;
    const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target;
    if (el.dataset.count) countUp(el); else el.classList.add('is-in');
    io.unobserve(el);
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .reveal-l').forEach(el => {
    // соседи в одной сетке появляются лесенкой
    const sib = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
    el.style.transitionDelay = `${Math.min(sib, 5) * 70}ms`;
    io.observe(el);
  });
  $$('.steps4, .stage').forEach(el => io.observe(el));
  if (!reduce) $$('[data-count]').forEach(el => io.observe(el));

  /* ---------- лёгкий наклон макетов за курсором и «магнитные» кнопки ---------- */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach(art => {
      const area = art.closest('section') || art;
      area.addEventListener('mousemove', e => {
        const r = art.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        art.style.transform = `perspective(1400px) rotateY(${x * 5}deg) rotateX(${-y * 4}deg)`;
      });
      area.addEventListener('mouseleave', () => art.style.transform = '');
    });
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        b.style.translate = `${(e.clientX - r.left - r.width / 2) * .12}px ${(e.clientY - r.top - r.height / 2) * .22}px`;
      });
      b.addEventListener('mouseleave', () => b.style.translate = '');
    });
  }

  /* ---------- вкладки ---------- */
  $$('[data-tabs]').forEach(box => {
    const tabs = $$('[role="tab"]', box), panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
    const show = (i, focus) => {
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', i === j); t.tabIndex = i === j ? 0 : -1; panels[j].hidden = i !== j; });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(i));
      t.addEventListener('keydown', e => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); show((i + d + tabs.length) % tabs.length, true); }
      });
    });
    // ссылка вида #all-on-4 открывает нужную вкладку
    const fromHash = () => { const i = panels.findIndex(p => p && '#' + p.id === location.hash); if (i >= 0) show(i); };
    addEventListener('hashchange', fromHash); fromHash();
    $$('a[data-tab]').forEach(a => a.addEventListener('click', () => { const i = panels.findIndex(p => p.id === a.dataset.tab); if (i >= 0) show(i); }));
  });

  /* ---------- лента примеров: стрелки ---------- */
  $$('[data-strip]').forEach(strip => {
    const nav = document.querySelector(`[data-strip-nav="${strip.id}"]`);
    if (!nav) return;
    $$('button', nav).forEach(b => b.addEventListener('click', () => {
      const card = strip.firstElementChild;
      strip.scrollBy({ left: (card ? card.offsetWidth + 24 : 300) * +b.dataset.dir, behavior: reduce ? 'auto' : 'smooth' });
    }));
  });

  /* ---------- фильтр работ ---------- */
  $$('[data-filter]').forEach(box => {
    const grid = document.getElementById(box.dataset.filter);
    const btns = $$('button', box);
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.setAttribute('aria-pressed', x === b));
      $$('[data-kind]', grid).forEach(card => { card.hidden = b.dataset.kind !== 'all' && !card.dataset.kind.split(' ').includes(b.dataset.kind); });
    }));
  });

  /* ---------- колесо вопросов на главной ---------- */
  // вопросы и ответы берём из списка в разметке: он же виден, если JavaScript выключен
  const faq = $$('.faq__list > div').map(d => [$('dt', d).textContent.trim(), $('dd', d).textContent.trim()]);
  const wheel = $('.wheel'), ans = $('.faq__text'), ansQ = $('.faq__q'), count = $('.wheel-nav__count b');
  if (wheel && faq.length) {
    const N = faq.length, R = 300, C = 300, seg = 360 / N;
    const pt = (a, r) => [C + r * Math.sin(a * Math.PI / 180), C - r * Math.cos(a * Math.PI / 180)];
    let svg = '<svg viewBox="0 0 600 600" role="presentation">';
    faq.forEach(([q], i) => {
      const a0 = i * seg, a1 = a0 + seg, [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [tx, ty] = pt(a0 + seg / 2, R * .62);
      const lines = q.toUpperCase().match(/.{1,13}(\s|$)/g).map(s => s.trim());
      svg += `<g class="seg"><path d="M${C} ${C} L${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z"/>` +
        `<text data-x="${tx.toFixed(1)}" data-y="${ty.toFixed(1)}" text-anchor="middle">` +
        lines.map((l, k) => `<tspan x="0" dy="${k ? 22 : -(lines.length - 1) * 11 + 7}">${l}</tspan>`).join('') + '</text></g>';
    });
    wheel.innerHTML = svg + '</svg>';
    const segs = $$('.seg', wheel);
    let cur = 0, turn = 0;
    const pick = (i, first) => {
      // выбранный сектор поворачивается к ответу: на компьютере влево, на телефоне вниз (угол задан в стилях)
      const point = parseFloat(getComputedStyle(wheel).getPropertyValue('--point'));
      const target = (isNaN(point) ? 270 : point) - (i * seg + seg / 2);
      const d = ((target - turn) % 360 + 540) % 360 - 180;
      turn += d; cur = i;
      wheel.style.transform = `rotate(${turn}deg)`;
      $$('text', wheel).forEach(t => t.style.transform = `translate(${t.dataset.x}px, ${t.dataset.y}px) rotate(${-turn}deg)`);
      segs.forEach((g, j) => { g.classList.toggle('is-active', i === j); g.setAttribute('aria-selected', i === j); g.tabIndex = i === j ? 0 : -1; });
      if (count) count.textContent = i + 1;
      const show = () => { ans.textContent = faq[i][1]; ansQ.textContent = faq[i][0]; ans.classList.remove('is-out'); };
      if (first) return show();
      ans.classList.add('is-out'); setTimeout(show, 200);
    };
    segs.forEach((g, i) => {
      g.setAttribute('role', 'tab'); g.setAttribute('aria-label', faq[i][0]);
      g.addEventListener('click', () => pick(i));
      g.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); pick((i + 1) % N); segs[(i + 1) % N].focus(); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); pick((i - 1 + N) % N); segs[(i - 1 + N) % N].focus(); }
      });
    });
    $$('.wheel-nav__btn').forEach(b => b.addEventListener('click', () => pick((cur + +b.dataset.step + N) % N)));
    let sx = null;
    wheel.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    wheel.addEventListener('touchend', e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 40) pick((cur + (dx < 0 ? 1 : -1) + N) % N);
    });
    // на телефоне ответ стоит под колесом, поэтому выбранный сектор смотрит вниз
    matchMedia('(max-width: 1020px)').addEventListener('change', () => pick(cur, true));
    pick(0, true);
  }

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
    const d = a.dataset.dir && document.querySelector(`#start select[name="direction"]`);
    if (d) d.value = a.dataset.dir;
  });

  /* ---------- пауза анимаций вне экрана ---------- */
  const animIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-offscreen', !e.isIntersecting)));
  $$('.hero, .phero, .faq').forEach(el => animIO.observe(el));

  onScroll();
})();
