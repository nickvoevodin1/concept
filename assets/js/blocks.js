/* ============================================================
   CONCEPT — поведение дополнительных вариантов блоков 4–11
   Без библиотек. Каждая часть молчит, если её варианта нет
   на странице или он сейчас не выбран.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function all(selector, root) {
    return [].slice.call((root || document).querySelectorAll(selector));
  }
  function shown(el) { return !!el && el.offsetParent !== null; }

  /* ------------------------------------------------------------------
     Ленты вбок: полоса прогресса, стрелки, перетаскивание мышью.
     Если лента целиком помещается, управление прячется.
     ------------------------------------------------------------------ */
  var rails = all('[data-rail]').map(function (root) {
    var track = root.querySelector('.rail__track');
    var nav = root.querySelector('.rail__nav');
    var thumb = root.querySelector('.rail__bar i');
    var prev = root.querySelector('.rail__btn--prev');
    var next = root.querySelector('.rail__btn--next');

    function update() {
      if (!shown(track)) return;
      var total = track.scrollWidth;
      var view = track.clientWidth;
      var fits = total - view < 4;
      if (nav) nav.classList.toggle('is-static', fits);
      if (fits) return;
      if (thumb) {
        thumb.style.setProperty('--w', (view / total * 100) + '%');
        thumb.style.setProperty('--x', (track.scrollLeft / total * 100) + '%');
      }
      if (prev) prev.disabled = track.scrollLeft < 4;
      if (next) next.disabled = track.scrollLeft > total - view - 4;
    }

    function page(direction) {
      var step = track.firstElementChild ? track.firstElementChild.getBoundingClientRect().width : track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.scrollBy({ left: direction * (step + gap), behavior: reduce ? 'auto' : 'smooth' });
    }

    if (prev) prev.addEventListener('click', function () { page(-1); });
    if (next) next.addEventListener('click', function () { page(1); });
    track.addEventListener('scroll', update, { passive: true });

    /* Перетаскивание мышью: на телефоне лента и так листается пальцем */
    if (track.hasAttribute('data-drag')) {
      var startX = 0, startLeft = 0, moved = false, down = false;
      track.addEventListener('pointerdown', function (event) {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        down = true; moved = false;
        startX = event.clientX; startLeft = track.scrollLeft;
      });
      window.addEventListener('pointermove', function (event) {
        if (!down) return;
        var dx = event.clientX - startX;
        if (!moved && Math.abs(dx) > 4) { moved = true; track.classList.add('is-drag'); }
        if (moved) track.scrollLeft = startLeft - dx;
      });
      window.addEventListener('pointerup', function () {
        if (!down) return;
        down = false;
        track.classList.remove('is-drag');
      });
      /* После перетаскивания отпускание кнопки — не клик */
      track.addEventListener('click', function (event) {
        if (moved) { event.preventDefault(); event.stopPropagation(); moved = false; }
      }, true);
    }

    return update;
  });

  function syncRails() { rails.forEach(function (update) { update(); }); }

  /* ------------------------------------------------------------------
     Этапы, вариант 2: этап выше экрана не прилипает — иначе
     следующий закрыл бы его низ.
     ------------------------------------------------------------------ */
  function syncStepsStack() {
    var cards = all('.stp2.is-active .stp2__card');
    if (!cards.length) return;
    var room = window.innerHeight - 140;
    cards.forEach(function (card) {
      card.classList.remove('is-tall');
      card.classList.toggle('is-tall', card.offsetHeight > room);
    });
  }

  /* ------------------------------------------------------------------
     Этапы, вариант 3: аккордеон, который на широком экране
     раскрывается прокруткой. Открыт всегда один этап.
     ------------------------------------------------------------------ */
  var stp3 = document.querySelector('.stp3');
  var stp3Rows = stp3 ? all('.stp3__row', stp3) : [];
  var stp3Open = 0;

  function openStep(index) {
    stp3Open = index;
    stp3Rows.forEach(function (row, i) {
      row.classList.toggle('is-open', i === index);
      row.querySelector('.stp3__bar').setAttribute('aria-expanded', String(i === index));
    });
  }

  function layoutSteps() {
    if (!stp3 || !shown(stp3)) return;
    var card = stp3.querySelector('.stp3__card');
    var track = stp3.querySelector('.stp3__track');
    var frame = stp3.querySelector('.stp3__frame');

    /* Высота раскрытой части — по самому длинному этапу,
       чтобы карточка не прыгала при смене этапа */
    var tallest = 0;
    stp3Rows.forEach(function (row) {
      tallest = Math.max(tallest, row.querySelector('.stp3__inner').offsetHeight);
    });
    card.style.setProperty('--panel-h', tallest + 'px');

    stp3.classList.remove('is-pinned');
    track.style.height = '';
    if (window.innerWidth <= 1024) return;

    /* Встаёт на место, только если кадр целиком помещается в экран */
    stp3.classList.add('is-pinned');
    var head = stp3.querySelector('.stp3__head');
    var bars = stp3Rows.length * stp3Rows[0].querySelector('.stp3__bar').offsetHeight;
    var styles = getComputedStyle(frame);
    var need = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom) +
               head.offsetHeight + parseFloat(getComputedStyle(card).marginTop) + bars + tallest + 8;
    if (need > window.innerHeight) {
      stp3.classList.remove('is-pinned');
      return;
    }
    track.style.height = (window.innerHeight + stp3Rows.length * window.innerHeight * 0.42) + 'px';
    scrollSteps();
  }

  function scrollSteps() {
    if (!stp3 || !stp3.classList.contains('is-pinned') || !shown(stp3)) return;
    var track = stp3.querySelector('.stp3__track');
    var span = track.offsetHeight - window.innerHeight;
    var progress = Math.min(Math.max(-track.getBoundingClientRect().top / span, 0), 0.9999);
    var index = Math.floor(progress * stp3Rows.length);
    if (index !== stp3Open) openStep(index);
  }

  stp3Rows.forEach(function (row, i) {
    row.querySelector('.stp3__bar').addEventListener('click', function () {
      if (stp3.classList.contains('is-pinned')) {
        /* Прокручиваем к середине отрезка этого этапа */
        var track = stp3.querySelector('.stp3__track');
        var span = track.offsetHeight - window.innerHeight;
        var top = track.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: top + span * (i + 0.5) / stp3Rows.length, behavior: reduce ? 'auto' : 'smooth' });
      } else {
        openStep(i);
      }
    });
  });

  /* ------------------------------------------------------------------
     Вопросы, вариант 2: латунная волна по буквам.
     Текст остаётся целым для чтения вслух, буквы — копия для глаз.
     ------------------------------------------------------------------ */
  all('.fq2 [data-wave]').forEach(function (q) {
    var text = q.textContent;
    var n = 0;
    var words = text.split(' ').map(function (word) {
      var letters = word.split('').map(function (ch) {
        return '<i style="--i:' + (n++) + '">' + ch + '</i>';
      }).join('');
      n++;
      return '<span class="wv__w">' + letters + '</span>';
    }).join(' ');
    q.innerHTML = '<span class="visually-hidden">' + text + '</span><span aria-hidden="true">' + words + '</span>';

    var summary = q.closest('summary');
    function run() {
      q.classList.remove('is-wave');
      void q.offsetWidth;          // перезапуск анимации
      q.classList.add('is-wave');
    }
    summary.addEventListener('mouseenter', run);
    summary.addEventListener('focus', run);
  });

  /* ------------------------------------------------------------------
     Вопросы, вариант 3: темы слева переключают набор вопросов
     ------------------------------------------------------------------ */
  var tabs = all('.fq3__tab');

  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (event) {
      var step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      selectTab(tabs[(i + step + tabs.length) % tabs.length], true);
    });
  });

  /* Заголовок в одну строку: кегль подгоняется под ширину колонки,
     ширина которой зависит от экрана и от выбранного первого экрана */
  function fitLines() {
    all('.fq3__h').forEach(function (h) {
      if (!shown(h)) return;
      h.style.fontSize = '';
      var room = h.parentElement.clientWidth -
                 parseFloat(getComputedStyle(h.parentElement).paddingLeft) -
                 parseFloat(getComputedStyle(h.parentElement).paddingRight);
      var size = parseFloat(getComputedStyle(h).fontSize);
      if (h.scrollWidth > room) h.style.fontSize = Math.floor(size * room / h.scrollWidth) + 'px';
    });
  }

  /* ------------------------------------------------------------------
     Окно заявки. Открывается кнопкой баннера, а когда выбран этот
     вариант блока — и всеми ссылками «на форму» по странице.
     ------------------------------------------------------------------ */
  var modal = document.querySelector('.modal');
  var opener = null;

  function openModal(from) {
    if (!modal) return;
    opener = from || document.activeElement;
    modal.hidden = false;
    document.body.classList.add('is-modal');
    var first = modal.querySelector('input');
    if (first) first.focus({ preventScroll: true });
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('is-modal');
    if (opener && opener.focus) opener.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (event) {
    var trigger = event.target.closest('[data-modal-open], a[href="#contacts"]');
    if (trigger && (trigger.hasAttribute('data-modal-open') || document.body.classList.contains('lead-modal-mode'))) {
      if (modal && modal.contains(trigger)) return;
      event.preventDefault();
      openModal(trigger);
      return;
    }
    if (event.target.closest('[data-modal-close]')) closeModal();
  });

  document.addEventListener('keydown', function (event) {
    if (!modal || modal.hidden) return;
    if (event.key === 'Escape') { closeModal(); return; }
    /* Tab не уходит из окна */
    if (event.key !== 'Tab') return;
    var focusable = all('button, a[href], input, textarea', modal).filter(shown);
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  /* ------------------------------------------------------------------
     Подвал, вариант 2: в конце страницы кадр сайта сжимается к низу
     и скругляется, из-за краёв выходит латунное поле.
     ------------------------------------------------------------------ */
  var page = document.querySelector('.page');
  var reveal = document.querySelector('.reveal');

  all('[data-today]').forEach(function (el) {
    var text = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    el.textContent = text.charAt(0).toUpperCase() + text.slice(1);
  });

  function syncReveal() {
    if (!page || !reveal) return;
    var on = document.body.classList.contains('foot-reveal-mode');
    var box = reveal.getBoundingClientRect();
    var progress = on && box.height ? (window.innerHeight - box.top) / box.height : 0;
    progress = Math.min(Math.max(progress, 0), 1);
    if (progress <= 0 || reduce) {
      page.style.transform = '';
      page.style.clipPath = '';
      page.style.transformOrigin = '';
      return;
    }
    page.style.transformOrigin = '50% 100%';
    page.style.transform = 'scale(' + (1 - 0.05 * progress).toFixed(4) + ')';
    page.style.clipPath = 'inset(0 round ' + (22 * progress).toFixed(1) + 'px)';
  }

  /* ------------------------------------------------------------------
     Общие обновления
     ------------------------------------------------------------------ */
  function relayout() {
    fitLines();
    syncRails();
    syncStepsStack();
    layoutSteps();
    syncReveal();
  }

  window.addEventListener('scroll', function () {
    scrollSteps();
    syncReveal();
  }, { passive: true });
  window.addEventListener('resize', relayout);
  window.addEventListener('load', relayout);
  document.addEventListener('variants:change', function () {
    closeModal();
    relayout();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  relayout();
})();
