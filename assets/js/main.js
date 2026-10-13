// МедВектор — живые элементы прототипа
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mobile = () => innerWidth <= 760;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- шапка: крупная наверху, компактная после прокрутки, прячется при прокрутке вниз ---------- */
  const header = $('.header');
  const progress = $('.progress');
  const mcta = $('.mcta');
  const diag = $('#diagnostics');
  const hero = $('.hero');
  let lastY = scrollY, ticking = false, menuOpen = false, diagVisible = false, keepHeader = 0;
  // после перехода по пункту меню шапка остаётся на месте, чтобы меню было под рукой
  document.addEventListener('click', e => { if (e.target.closest('a[href^="#"]')) keepHeader = performance.now() + 1500; });

  const onScroll = () => {
    const y = scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    header.classList.toggle('is-compact', y > 60);
    // прячем только при явной прокрутке вниз; мелкие сдвиги в конце плавной прокрутки шапку не трогают
    if (!menuOpen && y > 400 && y > lastY + 4 && performance.now() > keepHeader) header.classList.add('is-hidden');
    if (y < lastY - 4 || y < 400) header.classList.remove('is-hidden');
    progress.style.setProperty('--p', max > 0 ? y / max : 0);
    if (mcta) mcta.classList.toggle('is-on', y > hero.offsetHeight * .8 && !diagVisible && !menuOpen);
    lastY = y;
    parallax();
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll, { passive: true });

  if (diag && mcta) new IntersectionObserver(([e]) => { diagVisible = e.isIntersecting; onScroll(); }, { threshold: .05 }).observe(diag);

  /* активный пункт меню */
  const navLinks = $$('.nav a');
  const navIO = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s) navIO.observe(s); });

  /* ---------- мобильное меню на весь экран ---------- */
  const burger = $('.burger'), mnav = $('#mnav');
  const setMenu = open => {
    menuOpen = open;
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    mnav.classList.toggle('is-open', open);
    mnav.setAttribute('aria-hidden', !open);
    $$('a', mnav).forEach(a => a.tabIndex = open ? 0 : -1);
    header.classList.toggle('menu-open', open);
    header.classList.remove('is-hidden');
    document.body.classList.toggle('is-locked', open);
    if (mcta) mcta.classList.remove('is-on');
  };
  burger.addEventListener('click', () => setMenu(!menuOpen));
  $$('a', mnav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) setMenu(false); });

  /* ---------- заголовки по словам ---------- */
  $$('[data-split]').forEach(h => {
    let i = 0;
    h.innerHTML = h.textContent.trim().split(/\s+/).map(w => `<span class="w"><span style="--i:${i++}">${w}</span></span>`).join(' ');
    h.classList.add('reveal-words');
  });

  /* ---------- поисковые запросы печатаются в плашках коллажа ---------- */
  $$('.chip b').forEach((el, i) => {
    const text = el.dataset.type;
    if (reduce) { el.textContent = text; return; }
    let n = 0, dir = 1;
    const step = () => {
      n += dir; el.textContent = text.slice(0, n);
      if (n === text.length) { dir = -1; return setTimeout(step, 2600); }
      if (n === 0) { dir = 1; return setTimeout(step, 500); }
      setTimeout(step, dir > 0 ? 70 : 28);
    };
    setTimeout(step, 1600 + i * 700);
  });

  /* ---------- 3D-наклоны за курсором ---------- */
  const tilt = (el, area, power, extra = () => '') => {
    area.addEventListener('mousemove', e => {
      const r = area.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(1100px) rotateY(${x * power}deg) rotateX(${-y * power * .8}deg) ${extra()}`;
    });
    area.addEventListener('mouseleave', () => el.style.transform = '');
  };
  if (fine && !reduce) {
    const art = $('[data-tilt]');
    if (art) tilt(art, hero, 9);
    $$('[data-tilt-soft]').forEach(el => tilt(el, el, 6));
    $$('[data-tilt-card]').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = `rotate(var(--rz)) perspective(900px) rotateY(${(x - .5) * 12}deg) rotateX(${(.5 - y) * 10}deg) translateZ(14px)`;
        card.style.setProperty('--mx', x * 100 + '%'); card.style.setProperty('--my', y * 100 + '%');
        card.classList.add('is-hover');
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; card.classList.remove('is-hover'); });
    });
  }

  /* ---------- «магнитные» кнопки ---------- */
  if (fine && !reduce) $$('[data-magnetic]').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      b.style.translate = `${(e.clientX - r.left - r.width / 2) * .18}px ${(e.clientY - r.top - r.height / 2) * .3}px`;
    });
    b.addEventListener('mouseleave', () => b.style.translate = '');
  });

  /* ---------- курсор-прицел ---------- */
  const cursor = $('.cursor');
  if (fine && !reduce && cursor) {
    addEventListener('mousemove', e => {
      cursor.style.setProperty('--cx', e.clientX + 'px'); cursor.style.setProperty('--cy', e.clientY + 'px');
      cursor.classList.add('is-on');
      cursor.classList.toggle('is-link', !!e.target.closest('a, button, .flip, .seg, input, label'));
    }, { passive: true });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
  }

  /* ---------- параллакс и дрейф ---------- */
  const para = $$('[data-parallax]'), drift = $('[data-drift]');
  function parallax() {
    if (reduce || mobile()) return;
    para.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      el.style.translate = `0 ${((r.top + r.height / 2) - innerHeight / 2) * +el.dataset.parallax}px`;
    });
    if (drift) {
      const r = drift.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) drift.style.setProperty('--drift', `${(r.top / innerHeight) * 120}px`);
    }
    drawLines();
  }

  /* ---------- появление блоков, график, счётчики ---------- */
  const countUp = el => {
    const end = +el.dataset.count, t0 = performance.now(), dur = 1300;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target;
    if (el.classList.contains('num')) countUp(el);
    // панель с clip-path наблюдаем через родителя: обрезанный элемент сам не «пересекается» с экраном
    else if (el.querySelector(':scope > [data-tear]')) el.querySelector(':scope > [data-tear]').classList.add('is-in');
    else el.classList.add('is-in');
    io.unobserve(el);
  }), { threshold: .15, rootMargin: '0px 0px -5% 0px' });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 80}ms`; io.observe(el); });
  $$('.chart, [data-split], .footer__divider').forEach(el => io.observe(el));
  $$('[data-tear]').forEach(el => io.observe(el.parentElement));
  if (!reduce) $$('.num').forEach(el => io.observe(el));

  /* линия пути пациента и линия месяца запуска рисуются при прокрутке */
  const path = $('.journey__path path'), steps = $('.journey__steps');
  const line = $('.strips__line'), strips = $('.strips');
  const prog = el => {
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .3)));
  };
  function drawLines() {
    if (path) path.style.setProperty('--draw', 1400 * (1 - Math.min(1, prog(steps) * 1.6)));
    if (line) line.style.setProperty('--grow', Math.min(1, prog(strips) * 1.3));
  }
  // на телефоне линии тоже должны дорисовываться
  addEventListener('scroll', () => { if (mobile()) drawLines(); }, { passive: true });

  /* ---------- карточки потерь: переворот по нажатию на телефоне ---------- */
  $$('.flip').forEach(f => {
    f.addEventListener('click', () => { if (!fine) f.classList.toggle('is-flipped'); });
    f.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f.classList.toggle('is-flipped'); } });
  });

  /* ---------- вкладки «Узнаёте свою ситуацию?» ---------- */
  const tabs = $$('.tab'), panels = $$('.tabpanel');
  tabs.forEach((t, i) => t.addEventListener('click', () => {
    tabs.forEach((x, j) => { x.classList.toggle('is-active', i === j); x.setAttribute('aria-selected', i === j); });
    panels.forEach((p, j) => p.classList.toggle('is-active', i === j));
    t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  }));

  /* ---------- точки под каруселью тарифов ---------- */
  const car = $('[data-carousel]'), dots = $$('.dots i');
  if (car && dots.length) car.addEventListener('scroll', () => {
    const cards = $$('.tariff', car);
    const mid = car.scrollLeft + car.clientWidth / 2;
    let best = 0;
    cards.forEach((c, i) => { if (Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid) < Math.abs(cards[best].offsetLeft + cards[best].offsetWidth / 2 - mid)) best = i; });
    dots.forEach((d, i) => d.classList.toggle('is-on', i === best));
  }, { passive: true });

  /* ---------- колесо вопросов (как на текущем лендинге) ---------- */
  const faq = [
    ['Гарантируете пациентов?', 'Нет, и честно говорим об этом. В договоре закрепляем то, что зависит от нас: состав работ, сроки и дату отчёта. Число пациентов зависит и от клиники: цен, врачей, работы администраторов.'],
    ['Когда будут первые изменения?', 'Карточки на картах и профили на площадках меняются сразу после заполнения. Поиск — накопительный канал, сдвиги видны через несколько месяцев. Прогноз для вашей клиники даём после диагностики.'],
    ['Что нужно от клиники?', 'Ответственный человек, доступы к сайту и кабинетам, фото и данные врачей, а ещё обратная связь: какие обращения дошли до записи.'],
    ['Реклама входит в стоимость?', 'Нет. Яндекс Директ — отдельный модуль. Предлагаем его, когда он окупается, а бюджет вы платите площадке напрямую.'],
    ['Сайт уже есть. Нужен новый?', 'Не обязательно. Диагностика покажет, что выгоднее: доработать текущий или сделать новый. В тарифе «Всё присутствие» сайт входит в стоимость.'],
    ['Кому принадлежат доступы?', 'Клинике. Сайт, кабинеты карт, Метрику и площадки оформляем на вас. Если перестанем работать вместе, всё останется у клиники.'],
  ];
  const wheel = $('.wheel'), ans = $('.faq__text'), ansQ = $('.faq__q'), count = $('.wheel-nav__count b');
  const N = faq.length, R = 300, C = 300, seg = 360 / N;
  const pt = (a, r) => [C + r * Math.sin(a * Math.PI / 180), C - r * Math.cos(a * Math.PI / 180)];
  let svg = '<svg viewBox="0 0 600 600" role="presentation">';
  faq.forEach(([q], i) => {
    const a0 = i * seg, a1 = a0 + seg, [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), [tx, ty] = pt(a0 + seg / 2, R * .6);
    const lines = q.toUpperCase().match(/.{1,14}(\s|$)/g).map(s => s.trim());
    svg += `<g class="seg"><path d="M${C} ${C} L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z"/>` +
      `<text data-x="${tx.toFixed(1)}" data-y="${ty.toFixed(1)}" text-anchor="middle">` +
      lines.map((l, k) => `<tspan x="0" dy="${k ? 22 : -(lines.length - 1) * 11 + 7}">${l}</tspan>`).join('') + '</text></g>';
  });
  wheel.innerHTML = svg + '</svg>';
  const segs = $$('.seg', wheel);
  let cur = 0, turn = 0;
  const pick = (i, first) => {
    const target = 270 - (i * seg + seg / 2);
    // вращаем кратчайшим путём, чтобы колесо не раскручивалось назад через полный круг
    let d = ((target - turn) % 360 + 540) % 360 - 180;
    turn += d; cur = i;
    wheel.style.transform = `rotate(${turn}deg)`;
    $$('text', wheel).forEach(t => t.style.transform = `translate(${t.dataset.x}px, ${t.dataset.y}px) rotate(${-turn}deg)`);
    segs.forEach((g, j) => { g.classList.toggle('is-active', i === j); g.setAttribute('aria-selected', i === j); });
    if (count) count.textContent = i + 1;
    const show = () => { ans.textContent = faq[i][1]; ansQ.textContent = faq[i][0]; ans.classList.remove('is-out'); };
    if (first) return show();
    ans.classList.add('is-out'); setTimeout(show, 220);
  };
  segs.forEach((g, i) => {
    g.setAttribute('role', 'tab'); g.setAttribute('tabindex', '0');
    g.addEventListener('click', () => pick(i));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } });
  });
  $$('.wheel-nav__btn').forEach(b => b.addEventListener('click', () => pick((cur + +b.dataset.step + N) % N)));
  // свайп по колесу на телефоне поворачивает к следующему вопросу
  let sx = null;
  wheel.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
  wheel.addEventListener('touchend', e => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(dx) > 40) pick((cur + (dx < 0 ? 1 : -1) + N) % N);
  });
  pick(0, true);

  /* ---------- форма (прототип: никуда не отправляет) ---------- */
  const form = $('.form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('input[required]', form).forEach(inp => {
      const bad = inp.type === 'checkbox' ? !inp.checked : !inp.value.trim();
      inp.classList.toggle('is-bad', bad); if (bad && ok) { ok = false; inp.focus(); }
    });
    if (ok) form.classList.add('is-sent');
  });
  $$('input', form).forEach(inp => inp.addEventListener('input', () => inp.classList.remove('is-bad')));

  /* ---------- пауза анимаций вне экрана (меньше нагрузка на телефон) ---------- */
  const animIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-offscreen', !e.isIntersecting)));
  $$('.hero, .ticker, .system__visual, .faq__panel, .footer').forEach(el => animIO.observe(el));

  onScroll();
})();
