// ================================================
// app.js — Логіка інтерфейсу «Планувальник подій»
// Кроки 1–10 розділу 1.4.2 методички ТВР
// ================================================

document.addEventListener('DOMContentLoaded', () => {

  // --- Ініціалізація (Крок 4) ---
  const planner  = new EventPlanner('tvr_events_v17');
  const notifier = new NotificationManager('toast-container');

  // --- Елементи форми ---
  const form       = document.getElementById('event-form');
  const formTitle  = document.getElementById('form-title');
  const btnSubmit  = document.getElementById('btn-submit');
  const btnCancel  = document.getElementById('btn-cancel');

  const inpTitle    = document.getElementById('inp-title');
  const inpDate     = document.getElementById('inp-date');
  const inpTime     = document.getElementById('inp-time');
  const inpType     = document.getElementById('inp-type');
  const inpLocation = document.getElementById('inp-location');
  const inpDesc     = document.getElementById('inp-desc');

  // --- Елементи пошуку / фільтрів ---
  const inpSearch = document.getElementById('inp-search');
  const selType   = document.getElementById('sel-type');
  const selSort   = document.getElementById('sel-sort');

  // --- Контейнер списку ---
  const eventsList = document.getElementById('events-list');

  // Поточний id редагованої події (null = режим створення)
  let editingId = null;


  // ================================================
  // ВАЛІДАЦІЯ (Крок 5 методички)
  // RegExp для дати та часу, перевірка через .test()
  // ================================================
  const PATTERNS = {
    title:    /^.{3,80}$/,
    date:     /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    time:     /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
    location: /^.{2,80}$/,
  };

  const ERROR_MESSAGES = {
    title:    'Назва: від 3 до 80 символів.',
    date:     'Формат дати: РРРР-ММ-ДД.',
    time:     'Формат часу: ГГ:ХХ (00:00–23:59).',
    location: 'Місце: від 2 до 80 символів.',
  };

  // Перевірка одного поля — додає/знімає клас .invalid
  function validateField(input, name) {
    const value  = input.value.trim();
    const errEl  = document.getElementById('err-' + name);
    const valid  = value !== '' && PATTERNS[name].test(value);

    if (valid) {
      input.classList.remove('invalid');
      if (errEl) { errEl.textContent = ''; errEl.classList.remove('show'); }
    } else {
      input.classList.add('invalid');
      if (errEl) { errEl.textContent = ERROR_MESSAGES[name] || ''; errEl.classList.add('show'); }
    }

    return valid;
  }

  // Жива валідація під час набору (подія input)
  inpTitle.addEventListener('input',    () => validateField(inpTitle,    'title'));
  inpDate.addEventListener('input',     () => validateField(inpDate,     'date'));
  inpTime.addEventListener('input',     () => validateField(inpTime,     'time'));
  inpLocation.addEventListener('input', () => validateField(inpLocation, 'location'));


  // ================================================
  // РЕНДЕРИНГ СПИСКУ (Крок 7 методички)
  // createElement, dataset.id, append, DocumentFragment
  // ================================================
  function render(items) {
    // Очищення контейнера (Крок 7)
    eventsList.innerHTML = '';

    if (items.length === 0) {
      eventsList.innerHTML = `
        <div class="empty-state">
          <h3>Список подій порожній</h3>
          <p>Заповніть форму ліворуч і натисніть «Створити подію».</p>
        </div>`;
      return;
    }

    // DocumentFragment — вставляємо всі картки за один раз (Крок 7)
    const fragment = document.createDocumentFragment();

    items.forEach(item => {
      const card = document.createElement('article'); // Крок 7: createElement
      card.className   = 'event-card';
      card.dataset.id  = item.id;            // Крок 7: dataset.id
      card.dataset.type = item.type;

      card.innerHTML = `
        <div class="card-btns">
          <button class="btn-edit">Ред.</button>
          <button class="btn-delete">Вид.</button>
        </div>
        <h3>${escapeHTML(item.title)}</h3>
        <p class="meta">📅 ${item.date} о ${item.time}</p>
        <p class="meta">📍 ${escapeHTML(item.location)}</p>
        ${item.description ? `<p class="meta">${escapeHTML(item.description)}</p>` : ''}
        <span class="badge">${item.getTypeLabel()}</span>
      `;

      fragment.append(card);  // Крок 7: append
    });

    eventsList.append(fragment);
  }

  // Екранування спеціальних символів (захист від XSS)
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }


  // ================================================
  // ДЕЛЕГУВАННЯ ПОДІЙ (Крок 8 методички)
  // Один обробник на контейнер — event.target.closest()
  // ================================================
  eventsList.addEventListener('click', (e) => {
    const card = e.target.closest('.event-card');
    if (!card) return;

    const id   = card.dataset.id;
    const item = planner.getById(id);
    if (!item) return;

    // Видалити
    if (e.target.closest('.btn-delete')) {
      if (confirm(`Видалити подію «${item.title}»?`)) {
        planner.remove(id);
        if (editingId === id) resetForm();
        updateUI();
        notifier.info(`Подію «${item.title}» видалено.`);
      }
      return;
    }

    // Редагувати
    if (e.target.closest('.btn-edit')) {
      startEdit(item);
    }
  });


  // ================================================
  // SUBMIT ФОРМИ (Крок 5, 6, КП №11)
  // event.preventDefault() — скасовуємо перезавантаження
  // ================================================
  form.addEventListener('submit', (e) => {
    e.preventDefault();  // КП №11: обов'язковий виклик

    // Перевіряємо всі поля
    const ok =
      validateField(inpTitle,    'title') &
      validateField(inpDate,     'date')  &
      validateField(inpTime,     'time')  &
      validateField(inpLocation, 'location');

    if (!ok) {
      notifier.error('Виправте помилки у формі.');
      return;
    }

    const data = {
      title:       inpTitle.value,
      date:        inpDate.value,
      time:        inpTime.value,
      type:        inpType.value,
      location:    inpLocation.value,
      description: inpDesc.value,
    };

    if (editingId) {
      planner.update(editingId, data);
      notifier.success(`Подію «${data.title}» оновлено!`);
    } else {
      planner.add(data);
      notifier.success(`Подію «${data.title}» створено!`);
    }

    resetForm();
    updateUI();
  });


  // ================================================
  // ПОШУК, ФІЛЬТР, СОРТУВАННЯ (Крок 9 методички)
  // ================================================
  function updateUI() {
    const items = planner.getFiltered({
      query:  inpSearch.value,
      type:   selType.value,
      sortBy: selSort.value,
    });
    render(items);
  }

  // Живий пошук на події input
  inpSearch.addEventListener('input', updateUI);
  selType.addEventListener('change',  updateUI);
  selSort.addEventListener('change',  updateUI);


  // ================================================
  // РЕДАГУВАННЯ / СКИДАННЯ ФОРМИ
  // ================================================
  function startEdit(item) {
    editingId = item.id;
    formTitle.textContent    = 'Редагувати подію';
    btnSubmit.textContent    = 'Зберегти зміни';
    btnCancel.style.display  = 'inline-block';

    inpTitle.value    = item.title;
    inpDate.value     = item.date;
    inpTime.value     = item.time;
    inpType.value     = item.type;
    inpLocation.value = item.location;
    inpDesc.value     = item.description;

    form.scrollIntoView({ behavior: 'smooth' });
    inpTitle.focus();
  }

  function resetForm() {
    editingId = null;
    formTitle.textContent   = 'Додати подію';
    btnSubmit.textContent   = 'Створити подію';
    btnCancel.style.display = 'none';
    form.reset();

    // Зняти класи помилок
    [inpTitle, inpDate, inpTime, inpLocation].forEach(inp => {
      inp.classList.remove('invalid');
    });
    document.querySelectorAll('.error').forEach(el => {
      el.textContent = '';
      el.classList.remove('show');
    });
  }

  btnCancel.addEventListener('click', resetForm);


  // --- Перший рендеринг при завантаженні (Крок 7) ---
  updateUI();

});
