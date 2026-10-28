/**
 * app.js — Головний контролер інтерфейсу користувача та взаємодії з DOM
 */

document.addEventListener('DOMContentLoaded', () => {

  // Ініціалізація бізнес-моделей та сервісу сповіщень
  const planner  = new EventPlanner('tvr_events_v17');
  const notifier = new NotificationManager('toasts');

  // Кешування посилань на елементи інтерфейсу
  const form      = document.getElementById('event-form');
  const formTitle = document.getElementById('form-title');
  const btnSubmit = document.getElementById('btn-submit');
  const btnCancel = document.getElementById('btn-cancel');

  const fTitle    = document.getElementById('f-title');
  const fDate     = document.getElementById('f-date');
  const fTime     = document.getElementById('f-time');
  const fType     = document.getElementById('f-type');
  const fLocation = document.getElementById('f-location');
  const fDesc     = document.getElementById('f-desc');

  const inpSearch = document.getElementById('inp-search');
  const selType   = document.getElementById('sel-type');
  const selSort   = document.getElementById('sel-sort');
  const list      = document.getElementById('events-list');

  let editId = null; // Поточний стан форми: null = створення, string = редагування за ID


  // ── ПРАВИЛА ВАЛІДАЦІЇ ФОРМИ ───────────────────────────────────────────────
  const RULES = {
    'f-title':    { re: /^.{3,80}$/,                                      msg: 'Від 3 до 80 символів.' },
    'f-date':     { re: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, msg: 'Формат: РРРР-ММ-ДД.' },
    'f-time':     { re: /^(0\d|1\d|2[0-3]):[0-5]\d$/,                    msg: 'Формат: ГГ:ХХ.' },
    'f-location': { re: /^.{2,80}$/,                                      msg: 'Від 2 до 80 символів.' },
  };

  /**
   * Перевірка валідності конкретного інпуту з динамічним оновленням стилів помилок
   */
  function check(input) {
    const rule  = RULES[input.id];
    const valid = rule && rule.re.test(input.value.trim());
    const errEl = document.getElementById('e-' + input.id.slice(2));

    input.classList.toggle('invalid', !valid);
    if (errEl) {
      errEl.textContent = valid ? '' : rule.msg;
      errEl.classList.toggle('on', !valid);
    }
    return valid;
  }

  // Інтерактивна валідація під час введення значень
  [fTitle, fDate, fTime, fLocation].forEach(inp => {
    inp.addEventListener('input', () => check(inp));
  });


  // ── ГЕНЕРАЦІЯ ТА РЕНДЕРИНГ КАРТОК У DOM ──────────────────────────────────
  function render(items) {
    list.innerHTML = '';

    if (!items.length) {
      list.innerHTML = `
        <div class="empty">
          <h3>Список порожній</h3>
          <p>Заповніть форму ліворуч і натисніть «Створити подію».</p>
        </div>`;
      return;
    }

    // Оптимізація пакетної вставки в DOM через DocumentFragment
    const frag = document.createDocumentFragment();

    items.forEach(item => {
      const card = document.createElement('article');
      card.className    = 'card';
      card.dataset.id   = item.id;
      card.dataset.type = item.type;

      card.innerHTML = `
        <div class="card-head">
          <h3>${esc(item.title)}</h3>
          <div class="card-actions">
            <button class="btn-edit" type="button">Ред.</button>
            <button class="btn-delete" type="button">Вид.</button>
          </div>
        </div>
        <div class="card-meta">${item.date} &nbsp; ${item.time}</div>
        <div class="card-meta">${esc(item.location)}</div>
        ${ item.description ? `<div class="card-desc">${esc(item.description)}</div>` : '' }
        <span class="badge">${item.getTypeLabel()}</span>
      `;

      frag.append(card);
    });

    list.append(frag);
  }

  /**
   * Базове екранування символів для запобігання XSS-ін'єкціям
   */
  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }


  // ── ДЕЛЕГУВАННЯ ПОДІЙ ДЛЯ КНОПОК КАРТОК ────────────────────────────────────
  list.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;

    const id   = card.dataset.id;
    const item = planner.getById(id);
    if (!item) return;

    // Обробка видалення події
    if (e.target.closest('.btn-delete')) {
      if (confirm(`Видалити подію «${item.title}»?`)) {
        planner.remove(id);
        if (editId === id) resetForm();
        updateUI();
        notifier.info(`Подію «${item.title}» видалено.`);
      }
    }

    // Обробка переходу в режим редагування
    if (e.target.closest('.btn-edit')) {
      startEdit(item);
    }
  });


  // ── ВІДПРАВКА ТА ОБРОБКА ФОРМИ ─────────────────────────────────────────────
  form.addEventListener('submit', e => {
    e.preventDefault();

    const ok = [fTitle, fDate, fTime, fLocation].every(inp => check(inp));
    if (!ok) {
      notifier.error('Будь ласка, виправте помилки у формі.');
      return;
    }

    const data = {
      title:       fTitle.value,
      date:        fDate.value,
      time:        fTime.value,
      type:        fType.value,
      location:    fLocation.value,
      description: fDesc.value,
    };

    if (editId) {
      planner.update(editId, data);
      notifier.success(`Подію «${data.title}» успішно оновлено!`);
    } else {
      planner.add(data);
      notifier.success(`Подію «${data.title}» успішно створено!`);
    }

    resetForm();
    updateUI();
  });


  // ── СИНХРОНІЗАЦІЯ ІНТЕРФЕЙСУ ТА ФІЛЬТРАЦІЯ ──────────────────────────────────
  function updateUI() {
    render(planner.getFiltered({
      query:  inpSearch.value,
      type:   selType.value,
      sortBy: selSort.value,
    }));
  }

  inpSearch.addEventListener('input', updateUI);
  selType.addEventListener('change', updateUI);
  selSort.addEventListener('change', updateUI);


  // ── КЕРУВАННЯ СТАНОМ ФОРМИ (РЕДАГУВАННЯ / СКИДАННЯ) ────────────────────────
  function startEdit(item) {
    editId = item.id;
    formTitle.textContent = 'Редагувати подію';
    btnSubmit.textContent = 'Зберегти зміни';
    btnCancel.hidden      = false;

    fTitle.value    = item.title;
    fDate.value     = item.date;
    fTime.value     = item.time;
    fType.value     = item.type;
    fLocation.value = item.location;
    fDesc.value     = item.description;

    form.scrollIntoView({ behavior: 'smooth' });
    fTitle.focus();
  }

  function resetForm() {
    editId = null;
    formTitle.textContent = 'Додати подію';
    btnSubmit.textContent = 'Створити подію';
    btnCancel.hidden      = true;
    form.reset();

    [fTitle, fDate, fTime, fLocation].forEach(inp => inp.classList.remove('invalid'));
    document.querySelectorAll('.err.on').forEach(el => {
      el.textContent = '';
      el.classList.remove('on');
    });
  }

  btnCancel.addEventListener('click', resetForm);

  // Початкове завантаження та виведення списку
  updateUI();

});
