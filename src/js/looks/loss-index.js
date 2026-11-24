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
