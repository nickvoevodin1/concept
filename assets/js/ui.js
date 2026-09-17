/* Шапка-островок: при прокрутке сворачивается вправо до лого,
   ключевых пунктов и кнопки. */
(function () {
  'use strict';
  var hdr = document.querySelector('.hdr');
  if (!hdr) return;

  var compact = false;
  function sync() {
    var next = window.scrollY > 80;
    if (next === compact) return;
    compact = next;
    hdr.classList.toggle('is-compact', compact);
  }

  window.addEventListener('scroll', sync, { passive: true });
  sync();
})();
