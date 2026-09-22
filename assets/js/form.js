/* ============================================================
   CONCEPT — заявка

   Адреса приёмки заявок заказчик пока не передал, поэтому форма
   проверяет поля и показывает сообщение из документа «Тексты
   CONCEPT»: «Не удалось отправить заявку…». Когда появится адрес,
   укажите его в ENDPOINT — остальное уже готово.
   ============================================================ */
(function () {
  'use strict';

  var ENDPOINT = '';   // TODO: адрес приёмки заявок

  var form = document.getElementById('lead');
  if (!form) return;

  var msg = form.querySelector('.form__msg');
  var required = form.querySelectorAll('[required]');

  function setBad(input, bad) {
    var field = input.closest('.field');
    if (!field) return;
    field.classList.toggle('is-bad', bad);
    var err = field.querySelector('.field__err');
    if (err) err.hidden = !bad;
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
  }

  function say(text) {
    if (!msg) return;
    msg.textContent = text;
    msg.hidden = false;
  }

  [].forEach.call(required, function (input) {
    /* Поле перестаёт краснеть, как только в нём что-то появилось */
    input.addEventListener('input', function () {
      if (input.value.trim()) setBad(input, false);
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    var firstBad = null;
    [].forEach.call(required, function (input) {
      var bad = !input.value.trim();
      setBad(input, bad);
      if (bad && !firstBad) firstBad = input;
    });

    if (firstBad) {
      if (msg) msg.hidden = true;
      firstBad.focus();
      return;
    }

    if (!ENDPOINT) {
      say('Не удалось отправить заявку. Напишите, пожалуйста, напрямую в WhatsApp или Telegram — контакты указаны ниже.');
      return;
    }

    var data = new FormData(form);
    fetch(ENDPOINT, { method: 'POST', body: data })
      .then(function (response) {
        if (!response.ok) throw new Error(response.status);
        form.reset();
        say('Заявка получена. Спасибо. Свяжемся с вами в рабочее время.');
      })
      .catch(function () {
        say('Не удалось отправить заявку. Напишите, пожалуйста, напрямую в WhatsApp или Telegram — контакты указаны ниже.');
      });
  });
})();
