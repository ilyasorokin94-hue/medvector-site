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
