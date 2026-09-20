/* ============================================================
   CONCEPT — калькулятор стоимости

   Ставки взяты из утверждённого документа «Тексты CONCEPT»,
   раздел 2 «Расчёт стоимости и цены».

   Границы диапазонов читаются включительно по нижней таблице:
   «до 100 м²» — это 100 включительно, «от 100 до 200» — начиная со 101.
   ============================================================ */
(function () {
  'use strict';

  var RATES = {
    // Дизайн-проект, если ремонт выполняем мы
    full:   [{ upto: 100, rate: 3500 }, { upto: 200, rate: 2500 }, { upto: 500, rate: 2000 }],
    // Дизайн-проект без ремонта.
    // Ставка «до 100 м²» снижена с 7 000 до 5 000 ₽ по правке клиента —
    // в документе «Тексты CONCEPT» пока стоит прежнее значение.
    design: [{ upto: 100, rate: 5000 }, { upto: 200, rate: 5000 }, { upto: 500, rate: 4000 }]
  };
  var REPAIR_RATE = 25000;   // ремонтные работы, ₽ за м²
  var MAX_TABLE_AREA = 500;  // свыше — «Обсуждается»

  var form = document.getElementById('calc');
  if (!form) return;

  var areaNumber = document.getElementById('calc-area-number');
  var areaRange = document.getElementById('calc-area-range');
  var resultFull = document.getElementById('calc-result-full');
  var resultDesign = document.getElementById('calc-result-design');

  var MIN = Number(areaRange.min);
  var MAX = Number(areaRange.max);

  /** Ставка за м² для площади и формата; null — «Обсуждается». */
  function rateFor(format, area) {
    if (area > MAX_TABLE_AREA) return null;
    var bands = RATES[format];
    for (var i = 0; i < bands.length; i++) {
      if (area <= bands[i].upto) return bands[i].rate;
    }
    return null;
  }

  /** 2850000 → «2 850 000 ₽» (неразрывные пробелы, чтобы сумма не переносилась). */
  function money(value) {
    return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function render() {
    var area = clamp(Number(areaNumber.value));
    var format = form.querySelector('input[name="format"]:checked').value;

    // Показываем только таблицу выбранного формата
    var isFull = format === 'full';
    resultFull.hidden = !isFull;
    resultDesign.hidden = isFull;

    if (isFull) {
      var designRate = rateFor('full', area);
      if (designRate === null) {
        setText('sum-design-full', 'Обсуждается');
        setText('sum-repair', 'Обсуждается');
        setText('sum-total', 'Обсуждается');
      } else {
        var repair = area * REPAIR_RATE;
        var project = area * designRate;
        setText('sum-design-full', money(project));
        setText('sum-repair', 'от ' + money(repair));
        setText('sum-total', 'от ' + money(project + repair));
      }
    } else {
      var soloRate = rateFor('design', area);
      setText('sum-design-solo', soloRate === null ? 'Обсуждается' : money(area * soloRate));
    }
  }

  function clamp(value) {
    if (!isFinite(value) || value < MIN) return MIN;
    if (value > MAX) return MAX;
    return Math.round(value);
  }

  areaRange.addEventListener('input', function () {
    areaNumber.value = areaRange.value;
    render();
  });

  areaNumber.addEventListener('input', function () {
    // Во время набора не поправляем значение — иначе нельзя стереть цифру
    var value = Number(areaNumber.value);
    if (isFinite(value) && value >= MIN && value <= MAX) {
      areaRange.value = value;
      render();
    }
  });

  // Правим значение только когда человек закончил ввод
  areaNumber.addEventListener('blur', function () {
    areaNumber.value = clamp(Number(areaNumber.value));
    areaRange.value = areaNumber.value;
    render();
  });

  form.addEventListener('change', function (event) {
    if (event.target.name === 'format') render();
  });

  form.addEventListener('submit', function (event) { event.preventDefault(); });

  render();
})();
