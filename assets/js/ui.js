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
    /* именно активный вариант: у скрытых соседей rect пустой,
       а :first-of-type в списке селекторов взял бы первый по разметке */
    var first = document.querySelector('.variants > [data-variant].is-active') ||
                document.querySelector('.hero');
    var edge = first ? first.getBoundingClientRect().bottom : 0;
    hdr.classList.toggle('is-stuck', edge < 140);
    hdr.classList.toggle('is-shrink', window.scrollY > 120);
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
    if (group.dataset.block === 'hero') {
      document.body.classList.toggle('hdr-shrink-mode', index === 1);
      document.body.classList.toggle('hero-corner-mode', index === 2);
      var chrome = document.querySelector('.corner');
      if (chrome) {
        if (index === 2) chrome.removeAttribute('hidden');
        else chrome.setAttribute('hidden', '');
      }
    }
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
      chosen[group.dataset.block] = Number(button.dataset.set);
      try { localStorage.setItem(STORE, JSON.stringify(chosen)); } catch (e) { /* приватный режим */ }
      window.scrollTo(0, 0);
      location.reload();
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
     Первый экран, вариант 2: кадр и строка меняются по мере прокрутки,
     а сетка плиток гаснет поштучно.
     ------------------------------------------------------------------ */
  var tiles = [];          // клетки, отсортированные по моменту угасания
  var tilesGone = 0;       // сколько уже погасло

  /* Одна и та же последовательность при каждой сборке: плитки гаснут
     вразнобой, но предсказуемо, без дёрганья при изменении размера. */
  function scatter(i) {
    var x = Math.sin(i * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function buildGrid() {
    /* Сетка нужна только когда второй вариант действительно показан */
    var seq = document.querySelector('.heroseq.is-active');
    if (!seq) return;
    var grid = seq.querySelector('.heroseq__grid');
    if (!grid) return;

    var wide = window.innerWidth > 760;
    var cols = wide ? 14 : 6;
    var tile = Math.ceil(window.innerWidth / cols);
    var rows = Math.ceil(window.innerHeight / tile) + 1;
    var total = cols * rows;

    grid.style.setProperty('--cols', cols);
    grid.style.setProperty('--tile', tile + 'px');

    var html = '';
    for (var i = 0; i < total; i++) {
      var r = scatter(i);
      /* Примерно каждая двенадцатая клетка остаётся до конца */
      var last = scatter(i + 7777) > 0.92;
      /* Заливка слабая, чтобы кадр читался сквозь сетку */
      var alpha = (0.16 + scatter(i + 31) * 0.2).toFixed(3);
      html += '<i data-t="' + (i % 5) +
              '" style="--a:' + alpha + '"' +
              (last ? ' class="is-last"' : '') + '></i>';
    }
    grid.innerHTML = html;

    tiles = [].slice.call(grid.children).map(function (el, i) {
      /* Плитки с пометкой is-last не гаснут: порог заведомо больше единицы */
      return { el: el, at: el.classList.contains('is-last') ? 2 : 0.04 + scatter(i) * 0.92 };
    }).sort(function (a, b) { return a.at - b.at; });
    tilesGone = 0;
  }

  function fadeTiles(progress) {
    if (!tiles || !tiles.length) return;
    while (tilesGone < tiles.length && tiles[tilesGone].at <= progress) {
      tiles[tilesGone].el.classList.add('is-gone');
      tilesGone++;
    }
    while (tilesGone > 0 && tiles[tilesGone - 1].at > progress) {
      tilesGone--;
      tiles[tilesGone].el.classList.remove('is-gone');
    }
  }

  function syncSequence() {
    var seq = document.querySelector('.heroseq.is-active');
    if (!seq) return;
    var track = seq.querySelector('.heroseq__track');
    var span = track.offsetHeight - window.innerHeight;
    if (span <= 0) return;

    var progress = Math.min(Math.max(-track.getBoundingClientRect().top / span, 0), 1);
    var step = progress < 0.34 ? 1 : progress < 0.67 ? 2 : 3;
    if (seq.dataset.step !== String(step)) seq.dataset.step = String(step);
    fadeTiles(progress);
  }
  window.addEventListener('scroll', syncSequence, { passive: true });
  window.addEventListener('resize', function () {
    buildGrid();
    syncSequence();
  });
  buildGrid();

  /* ------------------------------------------------------------------
     Первый экран, вариант 3: центральная и нижняя подписи уходят,
     как только страницу начинают листать.
     ------------------------------------------------------------------ */
  var corner = document.querySelector('.corner');

  function syncFull() {
    var full = document.querySelector('.herofull.is-active');
    if (!full) return;
    var past = window.scrollY > window.innerHeight * 0.55;
    full.classList.toggle('is-past', past);
    /* Угловое меню закреплено на весь сайт, но ниже первого экрана
       фон светлый — белый набор там не читается. */
    if (corner) corner.classList.toggle('is-light', full.getBoundingClientRect().bottom < 120);
  }
  window.addEventListener('scroll', syncFull, { passive: true });
  window.addEventListener('resize', syncFull);

  syncSequence();
  syncFull();
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

  function revealOnScroll(selector, band, tapToggles, once) {
    var items = document.querySelectorAll(selector);
    if (!items.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var el = entry.target;
        if (once) {                       // раскрылось один раз и осталось
          if (entry.isIntersecting) {
            el.classList.add('is-open');
            observer.unobserve(el);
          }
          return;
        }
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
  revealOnScroll('.work', '-32% 0px -32% 0px', false, true);
})();
