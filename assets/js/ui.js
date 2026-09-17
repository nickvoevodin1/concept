/* Шапка закреплена на экране. Ниже первого экрана фон страницы светлый,
   поэтому стекло уплотняется — иначе белый текст на нём не прочитать. */
(function () {
  'use strict';
  var hdr = document.querySelector('.hdr');
  var hero = document.querySelector('.hero');
  if (!hdr || !hero) return;

  var stuck = false;
  function sync() {
    var next = window.scrollY > hero.offsetHeight - 140;
    if (next === stuck) return;
    stuck = next;
    hdr.classList.toggle('is-stuck', stuck);
  }

  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
})();
