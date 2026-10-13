// МедВектор — живые элементы прототипа
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* шапка и мобильное меню */
  const header = $('.header');
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('.burger'), nav = $('.nav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('.nav a').forEach(a => a.addEventListener('click', () => nav.classList.remove('is-open')));

  /* поисковые запросы печатаются в плашках коллажа */
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
    setTimeout(step, 900 + i * 700);
  });

  /* лёгкий 3D-наклон коллажа за курсором */
  const art = $('[data-tilt]');
  if (art && !reduce && matchMedia('(pointer: fine)').matches) {
    const hero = $('.hero');
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      art.style.transform = `perspective(1100px) rotateY(${x * 9}deg) rotateX(${-y * 7}deg)`;
    });
    hero.addEventListener('mouseleave', () => art.style.transform = '');
  }

  /* 3D-наклон карточек тарифов */
  $$('[data-tilt-card]').forEach(card => {
    if (reduce) return;
    const base = getComputedStyle(card).transform === 'none' ? '' : getComputedStyle(card).transform;
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `${base} perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg) translateZ(10px)`;
    });
    card.addEventListener('mouseleave', () => card.style.transform = '');
  });

  /* появление блоков, график, счётчики */
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
    else el.classList.add('is-in');
    io.unobserve(el);
  }), { threshold: .2 });
  $$('.reveal, .chart').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 90}ms`; io.observe(el); });
  if (!reduce) $$('.num').forEach(el => io.observe(el));

  /* линия пути пациента и линия месяца запуска рисуются при прокрутке */
  const path = $('.journey__path path'), steps = $('.journey__steps');
  const line = $('.strips__line'), strips = $('.strips');
  const progress = el => {
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .3)));
  };
  const draw = () => {
    if (path) path.style.setProperty('--draw', 1400 * (1 - progress(steps) * 1.6));
    if (line) line.style.setProperty('--grow', Math.min(1, progress(strips) * 1.3));
  };
  addEventListener('scroll', draw, { passive: true }); draw();

  /* вкладки «Узнаёте свою ситуацию?» */
  const tabs = $$('.tab'), panels = $$('.tabpanel');
  tabs.forEach((t, i) => t.addEventListener('click', () => {
    tabs.forEach((x, j) => { x.classList.toggle('is-active', i === j); x.setAttribute('aria-selected', i === j); });
    panels.forEach((p, j) => p.classList.toggle('is-active', i === j));
  }));

  /* колесо вопросов (отсылка к FAQ текущего лендинга) */
  const faq = [
    ['Гарантируете пациентов?', 'Нет, и честно говорим об этом. В договоре закрепляем то, что зависит от нас: состав работ, сроки и дату отчёта. Число пациентов зависит и от клиники: цен, врачей, работы администраторов.'],
    ['Когда будут первые изменения?', 'Карточки на картах и профили на площадках меняются сразу после заполнения. Поиск — накопительный канал, сдвиги видны через несколько месяцев. Прогноз для вашей клиники даём после диагностики.'],
    ['Что нужно от клиники?', 'Ответственный человек, доступы к сайту и кабинетам, фото и данные врачей, а ещё обратная связь: какие обращения дошли до записи.'],
    ['Реклама входит в стоимость?', 'Нет. Яндекс Директ — отдельный модуль. Предлагаем его, когда он окупается, а бюджет вы платите площадке напрямую.'],
    ['Сайт уже есть. Нужен новый?', 'Не обязательно. Диагностика покажет, что выгоднее: доработать текущий или сделать новый. В тарифе «Всё присутствие» сайт входит в стоимость.'],
    ['Кому принадлежат доступы?', 'Клинике. Сайт, кабинеты карт, Метрику и площадки оформляем на вас. Если перестанем работать вместе, всё останется у клиники.'],
  ];
  const wheel = $('.wheel'), ans = $('.faq__text');
  const N = faq.length, R = 300, C = 300, seg = 360 / N;
  const pt = (a, r) => [C + r * Math.sin(a * Math.PI / 180), C - r * Math.cos(a * Math.PI / 180)];
  let svg = `<svg viewBox="0 0 600 600" aria-hidden="true">`;
  faq.forEach(([q], i) => {
    const a0 = i * seg, a1 = a0 + seg, [x0, y0] = pt(a0, R), [x1, y1] = pt(a1, R), mid = a0 + seg / 2, [tx, ty] = pt(mid, R * .6);
    const lines = q.toUpperCase().match(/.{1,14}(\s|$)/g).map(s => s.trim());
    svg += `<g class="seg" data-i="${i}"><path d="M${C} ${C} L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z"/>` +
      `<text data-x="${tx.toFixed(1)}" data-y="${ty.toFixed(1)}" text-anchor="middle">` +
      lines.map((l, k) => `<tspan x="0" dy="${k ? 22 : -(lines.length - 1) * 11 + 7}">${l}</tspan>`).join('') + `</text></g>`;
  });
  svg += '</svg>';
  wheel.innerHTML = svg;
  // кнопки для клавиатуры поверх колеса
  const segs = $$('.seg', wheel);
  const pick = i => {
    const mid = i * seg + seg / 2, W = 270 - mid;
    wheel.style.transform = `rotate(${W}deg)`;
    // подписи остаются горизонтальными, пока колесо крутится
    $$('text', wheel).forEach(t => t.style.transform = `translate(${t.dataset.x}px, ${t.dataset.y}px) rotate(${-W}deg)`);
    segs.forEach((g, j) => g.classList.toggle('is-active', i === j));
    ans.style.opacity = 0;
    setTimeout(() => { ans.textContent = faq[i][1]; ans.style.opacity = 1; }, 220);
  };
  segs.forEach((g, i) => {
    g.setAttribute('role', 'tab'); g.setAttribute('tabindex', '0'); g.setAttribute('aria-label', faq[i][0]);
    g.addEventListener('click', () => pick(i));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(i); } });
  });
  pick(0);
})();
