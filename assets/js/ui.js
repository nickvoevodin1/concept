/* ============================================================
   CONCEPT — интерфейс страницы, без библиотек
   ============================================================ */
(function () {
  'use strict';

  var isTouch = window.matchMedia('(hover: none)').matches;

  /* ------------------------------------------------------------------
     Шапка: закреплена на экране. Ниже первого экрана фон страницы
     светлый, поэтому стекло уплотняется — иначе белый текст не прочитать.
     ------------------------------------------------------------------ */
  var hdr = document.querySelector('.hdr');

  function syncHeader() {
    if (!hdr) return;
    var first = document.querySelector('.variants > [data-variant].is-active, .hero');
    var edge = first ? first.getBoundingClientRect().bottom : 0;
    hdr.classList.toggle('is-stuck', edge < 140);
  }
  window.addEventListener('scroll', syncHeader, { passive: true });
  window.addEventListener('resize', syncHeader);

  /* ------------------------------------------------------------------
     Варианты блоков: рядом в разметке лежит несколько версий одного
     блока, показываем выбранную. Выбор запоминается в браузере.
     ------------------------------------------------------------------ */
  var STORE = 'concept-variants';
  var groups = [].slice.call(document.querySelectorAll('.variants'));
  var chosen = {};

  try { chosen = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { chosen = {}; }

  function applyVariant(group, index) {
    var options = group.querySelectorAll(':scope > [data-variant]');
    [].forEach.call(options, function (el, i) {
      el.classList.toggle('is-active', i === index);
    });
    group.setAttribute('data-ready', '');
    chosen[group.dataset.block] = index;
    try { localStorage.setItem(STORE, JSON.stringify(chosen)); } catch (e) { /* приватный режим */ }
    syncHeader();
    syncSequence();
  }

  function buildSwitch() {
    var box = document.querySelector('.switch');
    if (!box) return;

    var multi = groups.filter(function (g) {
      return g.querySelectorAll(':scope > [data-variant]').length > 1;
    });
    if (!multi.length) return;

    var toggle = box.querySelector('.switch__toggle');
    var panel = box.querySelector('.switch__panel');
    var html = '<p class="switch__title">Варианты блоков</p>';

    multi.forEach(function (group) {
      var count = group.querySelectorAll(':scope > [data-variant]').length;
      var buttons = '';
      for (var i = 0; i < count; i++) {
        buttons += '<button type="button" data-set="' + i + '">' + (i + 1) + '</button>';
      }
      html += '<div class="switch__row" data-block="' + group.dataset.block + '">' +
              '<span>' + group.dataset.label + '</span>' +
              '<span class="switch__btns">' + buttons + '</span></div>';
    });
    panel.innerHTML = html;

    function markActive() {
      multi.forEach(function (group) {
        var row = panel.querySelector('[data-block="' + group.dataset.block + '"]');
        var active = chosen[group.dataset.block] || 0;
        [].forEach.call(row.querySelectorAll('button'), function (b, i) {
          b.setAttribute('aria-pressed', String(i === active));
        });
      });
    }

    panel.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-set]');
      if (!button) return;
      var block = button.closest('.switch__row').dataset.block;
      var group = multi.filter(function (g) { return g.dataset.block === block; })[0];
      applyVariant(group, Number(button.dataset.set));
      markActive();
    });

    toggle.addEventListener('click', function () {
      var open = panel.hasAttribute('hidden');
      if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', String(open));
    });

    box.removeAttribute('hidden');
    markActive();
  }

  groups.forEach(function (group) {
    applyVariant(group, chosen[group.dataset.block] || 0);
  });
  buildSwitch();

  /* ------------------------------------------------------------------
     Первый экран, вариант 2: кадр и строка меняются по мере прокрутки.
     ------------------------------------------------------------------ */
  function syncSequence() {
    var seq = document.querySelector('.heroseq.is-active');
    if (!seq) return;
    var track = seq.querySelector('.heroseq__track');
    var span = track.offsetHeight - window.innerHeight;
    if (span <= 0) return;

    var progress = Math.min(Math.max(-track.getBoundingClientRect().top / span, 0), 1);
    var step = progress < 0.24 ? 1 : progress < 0.48 ? 2 : progress < 0.72 ? 3 : 4;
    if (seq.dataset.step !== String(step)) seq.dataset.step = String(step);
  }
  window.addEventListener('scroll', syncSequence, { passive: true });
  window.addEventListener('resize', syncSequence);
  syncSequence();
  syncHeader();

  /* ------------------------------------------------------------------
     Полное фото объекта
     ------------------------------------------------------------------ */
  var lightbox = document.querySelector('.lightbox');

  if (lightbox) {
    var picture = lightbox.querySelector('.lightbox__img');

    document.addEventListener('click', function (event) {
      var card = event.target.closest('.work__card');
      if (!card) return;
      event.preventDefault();
      picture.src = card.dataset.full;
      lightbox.removeAttribute('hidden');
      document.body.classList.add('is-lightbox');
      document.body.style.overflow = 'hidden';
    });

    function closeLightbox() {
      lightbox.setAttribute('hidden', '');
      picture.src = '';
      document.body.classList.remove('is-lightbox');
      document.body.style.overflow = '';
    }
    lightbox.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !lightbox.hasAttribute('hidden')) closeLightbox();
    });
  }

  /* ------------------------------------------------------------------
     Раскрытие по центру экрана. На тач-экранах нет наведения: блок
     раскрывается сам, когда доходит до середины, и закрывается касанием.
     ------------------------------------------------------------------ */
  if (!isTouch || !('IntersectionObserver' in window)) return;

  function revealOnScroll(selector, band, tapToggles) {
    var items = document.querySelectorAll(selector);
    if (!items.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (!entry.isIntersecting) delete el.dataset.touched;   // ушёл с экрана — снова слушаем прокрутку
        if (el.dataset.touched) return;                          // им управляли касанием
        el.classList.toggle('is-open', entry.isIntersecting);
      });
    }, { rootMargin: band, threshold: 0 });

    [].forEach.call(items, function (el) {
      observer.observe(el);
      if (!tapToggles) return;
      el.addEventListener('click', function (event) {
        if (event.target.closest('a, button')) return;   // ссылки и фотокарточки работают как обычно
        el.classList.toggle('is-open');
        el.dataset.touched = '1';
      });
    });
  }

  revealOnScroll('.usp__card', '-45% 0px -45% 0px', true);
  revealOnScroll('.work', '-32% 0px -32% 0px', false);
})();
