/* ============================================================
   CONCEPT — мелкий интерфейс без библиотек
   ============================================================ */
(function () {
  'use strict';

  /* --- Шапка ---------------------------------------------------------
     Закреплена на экране. Ниже первого экрана фон страницы светлый,
     поэтому стекло уплотняется — иначе белый текст на нём не прочитать. */
  var hdr = document.querySelector('.hdr');
  var hero = document.querySelector('.hero');

  if (hdr && hero) {
    var stuck = false;
    var syncHeader = function () {
      var next = window.scrollY > hero.offsetHeight - 140;
      if (next === stuck) return;
      stuck = next;
      hdr.classList.toggle('is-stuck', stuck);
    };
    window.addEventListener('scroll', syncHeader, { passive: true });
    window.addEventListener('resize', syncHeader);
    syncHeader();
  }

  /* --- Раскрытие по центру экрана ------------------------------------
     На тач-экранах нет наведения: блок раскрывается сам, когда доходит
     до середины экрана, и закрывается по касанию. */
  var isTouch = window.matchMedia('(hover: none)').matches;
  if (!isTouch || !('IntersectionObserver' in window)) return;

  function revealOnScroll(selector, band, closeOnTap) {
    var items = document.querySelectorAll(selector);
    if (!items.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        // Карточку закрыли касанием — не трогаем, пока не уйдёт с экрана
        if (el.dataset.locked) {
          if (!entry.isIntersecting) delete el.dataset.locked;
          return;
        }
        el.classList.toggle('is-open', entry.isIntersecting);
      });
    }, { rootMargin: band, threshold: 0 });

    items.forEach(function (el) {
      observer.observe(el);
      if (!closeOnTap) return;
      el.addEventListener('click', function (event) {
        if (event.target.closest('a')) return;   // ссылки внутри работают как обычно
        if (!el.classList.contains('is-open')) return;
        el.classList.remove('is-open');
        el.dataset.locked = '1';
      });
    });
  }

  revealOnScroll('.usp__card', '-45% 0px -45% 0px', true);
  revealOnScroll('.work', '-32% 0px -32% 0px', false);
})();
