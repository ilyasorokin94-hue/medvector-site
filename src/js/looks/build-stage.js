/* что собираем «Экран»: экран слева показывает образец того пункта, который сейчас в середине окна */
MV.looks['build-stage'] = function (el) {
  if (!('IntersectionObserver' in window)) return;
  var arts = el.querySelectorAll('.bds__art'), items = el.querySelectorAll('.bds__i');
  var set = function (i) {
    arts.forEach(function (a) { a.classList.toggle('is-on', a.dataset.i === i); });
    items.forEach(function (a) { a.classList.toggle('is-on', a.dataset.i === i); });
  };
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) set(e.target.dataset.i); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  items.forEach(function (it) { io.observe(it); });
};
