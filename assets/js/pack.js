/* МедВектор, пробная упаковка: мелочи поверх trajectory.js */
(() => {
  'use strict';
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* бегущая строка: текст повторяется дважды, чтобы круг замыкался без шва */
  $$('.tick__run').forEach(run => {
    const copy = [...run.children].map(el => { const c = el.cloneNode(true); c.setAttribute('aria-hidden', 'true'); return c; });
    run.append(...copy);
  });

  /* точки справа: показывают, на каком шаге сейчас читатель */
  const steps = $$('.step[id]'), dots = document.querySelector('.sdots');
  if (steps.length && dots) {
    const links = steps.map((s, i) => {
      const a = document.createElement('a');
      a.href = '#' + s.id;
      a.setAttribute('aria-label', 'Шаг ' + (i + 1));
      dots.append(a);
      return a;
    });
    const seen = new Set();
    const io = new IntersectionObserver(es => {
      es.forEach(e => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      dots.classList.toggle('is-on', seen.size > 0);
      const cur = steps.findIndex(s => seen.has(s));
      links.forEach((a, i) => a.classList.toggle('is-cur', i === cur));
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => io.observe(s));
  }
})();
