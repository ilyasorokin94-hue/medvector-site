/* карточка до и после «Шторка»: ползунок двигает границу между карточками */
MV.looks['mapbox-curtain'] = function (el) {
  var r = el.querySelector('.mbs__range');
  if (!r) return;
  el.classList.add('is-live');
  var set = function () { el.style.setProperty('--x', r.value); };
  r.addEventListener('input', set); set();
};
