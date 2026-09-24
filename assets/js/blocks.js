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
     Таблица форматов на телефоне: слева пункты, справа один формат.
     Стрелки сверху и снизу переключают формат, чтобы сравнивать.
     ------------------------------------------------------------------ */
  var ARROW = '<svg aria-hidden="true" focusable="false"><use href="#i-arrow"/></svg>';

  all('.fmt').forEach(function (table) {
    var scroller = table.closest('.fmt__scroll');
    var cells = all('thead th', table);
    var label = cells[0].textContent.trim();
    var names = cells.slice(1).map(function (th) {
      return th.innerHTML.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').trim();
    });
    var col = 0;

    function bar(where) {
      var el = document.createElement('div');
      el.className = 'fmt__pager fmt__pager--' + where;
      el.innerHTML = '<span class="fmt__label">' + (where === 'top' ? label : '') + '</span>' +
        '<span class="fmt__switch">' +
        '<button class="fmt__arr fmt__arr--prev" type="button" data-step="-1" aria-label="Предыдущий формат">' + ARROW + '</button>' +
        '<span class="fmt__name"' + (where === 'top' ? ' aria-live="polite"' : '') + '></span>' +
        '<button class="fmt__arr" type="button" data-step="1" aria-label="Следующий формат">' + ARROW + '</button>' +
        '</span>';
      el.addEventListener('click', function (event) {
        var button = event.target.closest('.fmt__arr');
        if (!button) return;
        col = (col + Number(button.dataset.step) + names.length) % names.length;
        show();
      });
      return el;
    }

    var top = bar('top');
    var bottom = bar('bottom');
    scroller.parentNode.insertBefore(top, scroller);
    scroller.parentNode.insertBefore(bottom, scroller.nextSibling);

    function show() {
      table.dataset.col = String(col + 1);
      [top, bottom].forEach(function (b) {
        b.querySelector('.fmt__name').innerHTML = names[col] + ' <small>' + (col + 1) + '/' + names.length + '</small>';
      });
    }
    show();
  });

  /* ------------------------------------------------------------------
     Этапы, вариант 2: карточки липнут и наезжают друг на друга —
     и на десктопе, и на телефоне. Чтобы следующая целиком закрывала
     предыдущую, высоты идут по нарастающей. Карточка выше экрана
     прилипает нижним краем: сначала дочитывается, потом её накрывают.
     ------------------------------------------------------------------ */
  function syncStepsStack() {
    var cards = all('.stp2.is-active .stp2__card');
    if (!cards.length) return;
    var hdr = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr')) || 76;
    var base = hdr + (window.innerWidth <= 760 ? 30 : 64);
    cards.forEach(function (card) {
      card.style.minHeight = '';
      card.style.top = '';
    });
    var tallest = 0;
    cards.forEach(function (card) {
      tallest = Math.max(tallest, card.offsetHeight);
      card.style.minHeight = tallest + 'px';
      card.style.top = Math.min(base, window.innerHeight - tallest - 12) + 'px';
    });
  }

  /* ------------------------------------------------------------------
     Этапы, вариант 3: этапы раскрываются по мере прокрутки, пока
     блок стоит на месте. Если кадр выше экрана, он встаёт нижним
     краем. На десктопе раскрытая часть одной высоты у всех этапов,
     на телефоне — у каждого своя, без пустот.
     ------------------------------------------------------------------ */
  var stp3 = document.querySelector('.stp3');
  var stp3Rows = stp3 ? all('.stp3__row', stp3) : [];
  var stp3Open = 0;
  var stp3Span = 0;
  var stp3Top = 0;

  function openStep(index) {
    stp3Open = index;
    stp3Rows.forEach(function (row, i) {
      row.classList.toggle('is-open', i === index);
      row.querySelector('.stp3__bar').setAttribute('aria-expanded', String(i === index));
    });
  }

  function layoutSteps() {
    if (!stp3 || !shown(stp3)) return;
    var track = stp3.querySelector('.stp3__track');
    var frame = stp3.querySelector('.stp3__frame');
    var wide = window.innerWidth > 760;

    var tallest = 0;
    var heights = stp3Rows.map(function (row) {
      var h = row.querySelector('.stp3__inner').offsetHeight;
      tallest = Math.max(tallest, h);
      return h;
    });
    stp3Rows.forEach(function (row, i) {
      row.style.setProperty('--h', (wide ? tallest : heights[i]) + 'px');
    });

    var openPanel = stp3Rows[stp3Open].querySelector('.stp3__panel');
    frame.style.paddingTop = '';
    var frameMax = frame.offsetHeight - openPanel.offsetHeight + tallest;

    /* Не помещается по высоте — сначала ужимаем воздух над заголовком
       (но не под островок шапки), и только потом кадр уходит вверх */
    var over = frameMax - window.innerHeight;
    if (over > 0) {
      var pad = parseFloat(getComputedStyle(frame).paddingTop);
      var hdr = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hdr')) || 76;
      var floor = wide ? hdr + 22 + 24 : 56;
      var cut = Math.min(over, Math.max(0, pad - floor));
      frame.style.paddingTop = (pad - cut) + 'px';
      frameMax -= cut;
    }
    stp3Top = Math.min(0, window.innerHeight - frameMax);
    frame.style.top = stp3Top + 'px';
    stp3Span = stp3Rows.length * window.innerHeight * (wide ? 0.42 : 0.36);
    track.style.height = (frameMax + stp3Span) + 'px';
    scrollSteps();
  }

  function scrollSteps() {
    if (!stp3 || !stp3Span || !shown(stp3)) return;
    var track = stp3.querySelector('.stp3__track');
    var progress = (stp3Top - track.getBoundingClientRect().top) / stp3Span;
    progress = Math.min(Math.max(progress, 0), 0.9999);
    var index = Math.floor(progress * stp3Rows.length);
    if (index !== stp3Open) openStep(index);
  }

  stp3Rows.forEach(function (row, i) {
    row.querySelector('.stp3__bar').addEventListener('click', function () {
      /* Прокручиваем к середине отрезка этого этапа */
      var track = stp3.querySelector('.stp3__track');
      var start = track.getBoundingClientRect().top + window.scrollY - stp3Top;
      window.scrollTo({ top: start + stp3Span * (i + 0.5) / stp3Rows.length, behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  /* ------------------------------------------------------------------
     Вопросы, все варианты: ответ выезжает сверху из-под вопроса.
     <details> раскрывается мгновенно, поэтому ведём его вручную.
     ------------------------------------------------------------------ */
  function afterToggle(row, open, quiet) {
    var list = row.closest('.fq4__list');
    if (!list) return;
    /* Вариант 4: открыт один вопрос, остальные размываются */
    if (open) {
      all('.faq__row', list).forEach(function (other) {
        if (other !== row && other.open && !other.classList.contains('is-closing')) toggleRow(other, false, true);
      });
      list.classList.add('has-open');
    } else if (!quiet) {
      list.classList.remove('has-open');
    }
  }

  function toggleRow(row, open, quiet) {
    var answer = row.querySelector('.faq__a');
    if (row._anim) { row._anim.cancel(); row._anim = null; }
    row.classList.toggle('is-closing', !open);
    afterToggle(row, open, quiet);
    if (reduce || !answer || !answer.animate) {
      row.open = open;
      row.classList.remove('is-closing');
      return;
    }
    if (open) row.open = true;
    var styles = getComputedStyle(answer);
    var full = { height: answer.scrollHeight + 'px', paddingTop: styles.paddingTop, paddingBottom: styles.paddingBottom, opacity: 1, transform: 'none' };
    var none = { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0, transform: 'translateY(-16px)' };
    answer.style.overflow = 'hidden';
    var anim = answer.animate(open ? [none, full] : [full, none],
                              { duration: open ? 460 : 300, easing: 'cubic-bezier(.3,.7,.3,1)' });
    row._anim = anim;
    anim.onfinish = function () {
      answer.style.overflow = '';
      row._anim = null;
      if (!open) { row.open = false; row.classList.remove('is-closing'); }
    };
  }

  all('details.faq__row').forEach(function (row) {
    row.querySelector('summary').addEventListener('click', function (event) {
      event.preventDefault();
      toggleRow(row, !row.open || row.classList.contains('is-closing'));
    });
  });

  /* ------------------------------------------------------------------
     Вопросы, вариант 2: по вопросу пробегает смена гарнитур — каждая
     буква по очереди перебирает шрифты и латунью возвращается в свой.
     Ширина букв закреплена, поэтому строка не дёргается. Текст для
     чтения вслух лежит целым, буквы — копия для глаз.
     ------------------------------------------------------------------ */
  var FACES = ['f1', 'f2', 'f3', 'f4'];
  var letterSets = [];

  all('.fq2 [data-wave]').forEach(function (q) {
    var text = q.textContent;
    var words = text.split(' ').map(function (word) {
      return '<span class="wv__w">' + word.split('').map(function (ch) { return '<i>' + ch + '</i>'; }).join('') + '</span>';
    }).join(' ');
    q.innerHTML = '<span class="visually-hidden">' + text + '</span><span aria-hidden="true">' + words + '</span>';

    var letters = all('i', q);
    letterSets.push(letters);
    var timers = [];

    function run() {
      timers.forEach(clearTimeout);
      timers = [];
      if (reduce) return;
      letters.forEach(function (letter, i) {
        for (var k = 0; k < 4; k++) {
          (function (k) {
            timers.push(setTimeout(function () {
              letter.className = k < 3 ? 'is-flip ' + FACES[(i + k * 3 + Math.floor(Math.random() * 4)) % FACES.length] : '';
            }, i * 24 + k * 75));
          })(k);
        }
      });
    }
    var summary = q.closest('summary');
    summary.addEventListener('mouseenter', run);
    summary.addEventListener('focus', run);
    summary.addEventListener('click', run);
  });

  function fixLetters() {
    letterSets.forEach(function (letters) {
      if (!letters.length || !shown(letters[0].closest('summary'))) return;
      letters.forEach(function (l) { l.style.width = ''; });
      var widths = letters.map(function (l) { return l.getBoundingClientRect().width; });
      letters.forEach(function (l, i) { l.style.width = widths[i] + 'px'; });
    });
  }

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
    fixLetters();
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
