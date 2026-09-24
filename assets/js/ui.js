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
  var STORE = 'concept-variants-2';
  var groups = [].slice.call(document.querySelectorAll('.variants'));
  var chosen = {};

  try { chosen = JSON.parse(localStorage.getItem(STORE) || '{}'); } catch (e) { chosen = {}; }

  function applyVariant(group, index) {
    var options = group.querySelectorAll(':scope > [data-variant]');
    /* Запомненного варианта может уже не быть — тогда первый */
    if (!(index >= 0 && index < options.length)) index = 0;
    [].forEach.call(options, function (el, i) {
      el.classList.toggle('is-active', i === index);
    });
    group.setAttribute('data-ready', '');
    chosen[group.dataset.block] = index;
    if (group.dataset.block === 'hero') {
      /* Смотрим на сам вариант, а не на его номер: порядок вариантов
         меняется по просьбе клиента, номера вместе с ним. */
      var active = options[index];
      var corners = !!active && active.classList.contains('herofull');
      document.body.classList.toggle('hdr-shrink-mode', !!active && active.classList.contains('heroseq'));
      document.body.classList.toggle('hero-corner-mode', corners);
      var chrome = document.querySelector('.corner');
      if (chrome) {
        if (corners) chrome.removeAttribute('hidden');
        else chrome.setAttribute('hidden', '');
      }
    }
    try { localStorage.setItem(STORE, JSON.stringify(chosen)); } catch (e) { /* приватный режим */ }
    syncBodyModes();
    syncHeader();
    syncSequence();
    document.dispatchEvent(new CustomEvent('variants:change', { detail: { block: group.dataset.block } }));
  }

  /* Некоторым вариантам нужен режим на всю страницу (окно заявки,
     поле за кадром в подвале). Вариант пишет его в data-body. */
  function syncBodyModes() {
    var modes = {};
    [].forEach.call(document.querySelectorAll('.variants > [data-variant][data-body]'), function (el) {
      modes[el.dataset.body] = modes[el.dataset.body] || el.classList.contains('is-active');
    });
    Object.keys(modes).forEach(function (mode) {
      document.body.classList.toggle(mode, modes[mode]);
    });
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
      /* Блок меняется на месте: соседние блоки остаются как есть,
         поэтому варианты можно смешивать. Страница встаёт на начало
         блока: высота у вариантов разная. */
      applyVariant(group, Number(button.dataset.set));
      function land() {
        if (block === 'hero') window.scrollTo(0, 0);
        else window.scrollTo(0, group.getBoundingClientRect().top + window.scrollY - 24);
      }
      land();
      /* Соседние варианты пересчитывают высоту следом — встаём ещё раз */
      requestAnimationFrame(function () { requestAnimationFrame(land); });
      markActive();
      buildGrid();
      syncSequence();
      syncFull();
      syncHeader();
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
  var tiles = [];          // клетки со своим темпом угасания
  var LEVELS = 5;          // ступеней от полной заливки до нуля

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
      /* Цвет вразнобой: по порядку получались бы диагональные полосы.
         Тонов четыре: светлый песочный при такой плотности съедал
         контраст белого текста на первом кадре. */
      var tone = Math.floor(scatter(i + 991) * 4);
      html += '<i data-t="' + tone + '" data-k="0"></i>';
    }
    grid.innerHTML = html;

    tiles = [].slice.call(grid.children).map(function (el, i) {
      return {
        el: el,
        /* с какой прокрутки плитка начинает бледнеть */
        from: 0.02 + scatter(i) * 0.44,
        /* насколько прокрутки хватает на одну ступень */
        step: 0.07 + scatter(i + 517) * 0.06,
        /* примерно треть плиток не гаснет совсем: к финалу они
           остаются на последней видимой ступени */
        floor: scatter(i + 7777) < 0.36 ? LEVELS - 1 : LEVELS,
        k: 0
      };
    });
  }

  function fadeTiles(progress) {
    if (!tiles || !tiles.length) return;
    for (var i = 0; i < tiles.length; i++) {
      var t = tiles[i];
      var k = Math.floor((progress - t.from) / t.step);
      if (k < 0) k = 0;
      if (k > t.floor) k = t.floor;
      if (k !== t.k) {
        t.k = k;
        t.el.setAttribute('data-k', String(k));
      }
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
    if (corner) {
      var below = full.getBoundingClientRect().bottom < 120;
      corner.classList.toggle('is-below', below);
      corner.classList.toggle('is-light', below && !darkUnderCorner());
    }
  }

  /* Под кромкой меню тёмный блок? Смотрим у левого края посередине
     экрана, пропуская само меню. Не у самой кромки: в конце страницы
     кадр сайта сжимается, и там уже поле за кадром. */
  function darkUnderCorner() {
    if (!document.elementsFromPoint) return false;
    var stack = document.elementsFromPoint(60, window.innerHeight / 2);
    for (var i = 0; i < stack.length; i++) {
      if (stack[i].closest('.corner')) continue;
      return !!stack[i].closest('[data-tone="dark"]');
    }
    return false;
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
      lightbox.classList.remove('is-gallery');
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
    lightbox.addEventListener('click', function (event) {
      if (event.target.closest('.lightbox__nav')) return;   // листание галереи
      closeLightbox();
    });
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
