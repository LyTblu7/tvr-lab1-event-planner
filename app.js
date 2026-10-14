/**
 * app.js — Головна логіка застосунку «Планувальник подій» (Варіант 17).
 * Відповідає вимогам розділу 1.4.2 (Кроки 1–10) та розділу 1.7 методички ТВР.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Ініціалізація менеджерів (Крок 4)
  const planner = new EventPlanner('tvr_events_v17_hub');
  const notifier = new NotificationManager('#toast-container');

  // 2. Пошук елементів у DOM (Контрольне питання №6: getElementById, querySelector)
  const eventsList = document.querySelector('#events-list');
  const searchInput = document.getElementById('search-input');
  const filterType = document.getElementById('filter-type');
  const sortBy = document.getElementById('sort-by');

  // Елементи форми (Крок 2, 5)
  const eventForm = document.getElementById('event-form');
  const formHeading = document.getElementById('form-heading');
  const formSubmitBtn = document.getElementById('form-submit-btn');
  const formCancelBtn = document.getElementById('form-cancel-btn');

  // Поля вводу форми (Контрольне питання №8: читання через .value)
  const inputTitle = document.getElementById('event-title');
  const inputDate = document.getElementById('event-date');
  const inputTime = document.getElementById('event-time');
  const selectType = document.getElementById('event-type');
  const inputLocation = document.getElementById('event-location');
  const inputDescription = document.getElementById('event-description');

  // Стан поточного редагування (Контрольне питання №5: змінна let)
  let editingId = null;

  // ==============================================================
  // 3. ВАЛІДАЦІЯ ФОРМИ (Крок 5, Контрольні питання №12, №13)
  // Регулярні вирази: перевірка дати, часу, обов'язкових полів через .test()
  // ==============================================================
  const patterns = {
    // Дата: YYYY-MM-DD (4 цифри року, 01-12 місяць, 01-31 день)
    date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    // Час: HH:MM від 00:00 до 23:59
    time: /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/,
    // Назва: від 3 до 80 символів
    title: /^.{3,80}$/,
    // Локація: від 2 до 80 символів
    location: /^.{2,80}$/
  };

  /**
   * Валідація окремого поля з додаванням/видаленням класу .invalid (Крок 3, 5)
   * @param {HTMLInputElement|HTMLSelectElement} input
   * @param {string} fieldName
   * @returns {boolean}
   */
  function validateField(input, fieldName) {
    const value = input.value.trim(); // Контрольне питання №8: читання .value
    const errorEl = document.getElementById(`${input.id}-error`);
    let isValid = true;
    let message = '';

    if (!value) {
      isValid = false;
      message = "Поле обов'язкове для заповнення.";
    } else if (fieldName === 'date' && !patterns.date.test(value)) {
      // Контрольне питання №12: метод test() регулярного виразу
      isValid = false;
      message = 'Формат дати має бути РРРР-ММ-ДД (напр., 2026-10-15).';
    } else if (fieldName === 'time' && !patterns.time.test(value)) {
      isValid = false;
      message = 'Формат часу має бути ГГ:ХХ від 00:00 до 23:59.';
    } else if (fieldName === 'title' && !patterns.title.test(value)) {
      isValid = false;
      message = 'Назва повинна містити від 3 до 80 символів.';
    } else if (fieldName === 'location' && !patterns.location.test(value)) {
      isValid = false;
      message = 'Вкажіть місце (від 2 до 80 символів).';
    }

    if (!isValid) {
      input.classList.add('invalid');
      if (errorEl) {
        errorEl.textContent = message; // Контрольне питання №8: безпечний textContent
        errorEl.classList.add('show');
      }
    } else {
      input.classList.remove('invalid');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('show');
      }
    }

    return isValid;
  }

  function clearErrors() {
    [inputTitle, inputDate, inputTime, inputLocation].forEach(input => {
      input.classList.remove('invalid');
      const err = document.getElementById(`${input.id}-error`);
      if (err) {
        err.textContent = '';
        err.classList.remove('show');
      }
    });
  }

  // Жива валідація на подію input під час набору
  inputTitle.addEventListener('input', () => validateField(inputTitle, 'title'));
  inputDate.addEventListener('input', () => validateField(inputDate, 'date'));
  inputTime.addEventListener('input', () => validateField(inputTime, 'time'));
  inputLocation.addEventListener('input', () => validateField(inputLocation, 'location'));

  // ==============================================================
  // 4. ДИНАМІЧНИЙ РЕНДЕРИНГ СПИСКУ (Крок 7, Контрольні питання №7, 8)
  // ==============================================================
  function render(items) {
    // Контрольне питання №8: повне очищення вмісту через innerHTML = ""
    eventsList.innerHTML = '';

    if (items.length === 0) {
      eventsList.innerHTML = `
        <div class="empty-state">
          <h3>Список подій порожній</h3>
          <p>У вас ще немає доданих подій. Заповніть форму ліворуч, щоб створити перший запис.</p>
        </div>
      `;
      return;
    }

    // Контрольне питання №7: створення DocumentFragment для оптимізації DOM
    const fragment = document.createDocumentFragment();

    items.forEach(item => {
      const dateParts = item.getDateParts();

      // Контрольне питання №7: метод createElement()
      const card = document.createElement('article');
      const monthNum = parseInt(item.date.split('-')[1], 10) || 1;
      card.className = `entity-item event-card card-theme-${item.type}`;
      card.setAttribute('data-month', monthNum);
      // Крок 7 методички: зв'язок елемента через dataset.id
      card.dataset.id = item.id;

      card.innerHTML = `
        <!-- Блок дати (місяць, день, час) -->
        <div class="event-date-box">
          <span class="date-month">${dateParts.month}</span>
          <span class="date-day">${dateParts.day}</span>
          <span class="date-time">${item.time}</span>
        </div>

        <!-- Блок інформації про подію -->
        <div class="event-content-box">
          <div>
            <div class="card-top">
              <h3 class="event-title">${escapeHTML(item.title)}</h3>
              <div class="card-actions">
                <button type="button" class="btn-icon edit-btn" title="Редагувати" aria-label="Редагувати">
                  <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                </button>
                <button type="button" class="btn-icon delete-btn" title="Видалити" aria-label="Видалити">
                  <svg class="icon-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            </div>
            <span class="badge-tag">${item.getTypeLabel()}</span>
          </div>

          <div class="card-bottom">
            <div class="event-location">
              <svg class="icon-svg location-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${escapeHTML(item.location)}</span>
            </div>
          </div>
        </div>
      `;

      fragment.append(card); // Крок 7: append()
    });

    eventsList.append(fragment);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==============================================================
  // 5. ДЕЛЕГУВАННЯ ПОДІЙ (Крок 8, Контрольні питання №9, №10)
  // Обробник на спільному контейнері з event.target.closest()
  // ==============================================================
  eventsList.addEventListener('click', (event) => {
    // Контрольне питання №10: пошук цільових кнопок через closest()
    const deleteBtn = event.target.closest('.delete-btn');
    const editBtn = event.target.closest('.edit-btn');

    if (!deleteBtn && !editBtn) return;

    const card = event.target.closest('.entity-item');
    if (!card) return;
    const id = card.dataset.id;
    const item = planner.getById(id);
    if (!item) return;

    // 1) Видалення (Крок 8 методички)
    if (deleteBtn) {
      if (confirm(`Ви дійсно бажаєте видалити подію «${item.title}»?`)) {
        planner.remove(id);
        notifier.info(`Подію «${item.title}» видалено.`); // Варіант 17: Toast
        if (editingId === id) resetForm();
        updateUI();
      }
      return;
    }

    // 2) Редагування
    if (editBtn) {
      startEdit(item);
    }
  });

  // Перехід у режим редагування
  function startEdit(item) {
    editingId = item.id;
    formHeading.textContent = 'Редагувати подію';
    formSubmitBtn.textContent = 'Зберегти зміни';
    formCancelBtn.style.display = 'inline-block';

    inputTitle.value = item.title;
    inputDate.value = item.date;
    inputTime.value = item.time;
    selectType.value = item.type;
    inputLocation.value = item.location;
    inputDescription.value = item.description || '';

    clearErrors();
    eventForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    inputTitle.focus();
  }

  // Скидання форми у початковий стан створення
  function resetForm() {
    editingId = null;
    formHeading.textContent = 'Додати подію';
    formSubmitBtn.textContent = 'Створити подію';
    formCancelBtn.style.display = 'none';
    eventForm.reset();
    clearErrors();
  }

  formCancelBtn.addEventListener('click', resetForm);

  // ==============================================================
  // 6. ОБРОБКА ВІДПРАВЛЕННЯ ФОРМИ (Крок 5, 6, Контрольне питання №11)
  // ==============================================================
  eventForm.addEventListener('submit', (event) => {
    // Контрольне питання №11: обов'язковий виклик preventDefault()
    // щоб запобігти перезавантаженню сторінки
    event.preventDefault();

    const isTitleValid = validateField(inputTitle, 'title');
    const isDateValid = validateField(inputDate, 'date');
    const isTimeValid = validateField(inputTime, 'time');
    const isLocationValid = validateField(inputLocation, 'location');

    if (!isTitleValid || !isDateValid || !isTimeValid || !isLocationValid) {
      notifier.error('Будь ласка, виправте виявлені помилки у формі.');
      return;
    }

    const formData = {
      title: inputTitle.value,
      date: inputDate.value,
      time: inputTime.value,
      type: selectType.value,
      location: inputLocation.value,
      description: inputDescription.value
    };

    if (editingId) {
      planner.update(editingId, formData);
      notifier.success(`Подію «${formData.title}» успішно оновлено!`);
    } else {
      planner.add(formData); // Крок 6: збереження у масив та localStorage
      notifier.success(`Подію «${formData.title}» успішно створено!`);
    }

    resetForm();
    updateUI();
  });

  // ==============================================================
  // 7. ПОШУК ТА ФІЛЬТРАЦІЯ (Крок 9, Контрольні питання №9, 12)
  // ==============================================================
  function updateUI() {
    const filtered = planner.getFiltered({
      query: searchInput.value,
      type: filterType.value,
      sortBy: sortBy.value
    });
    render(filtered);
  }

  searchInput.addEventListener('input', updateUI);
  filterType.addEventListener('change', updateUI);
  sortBy.addEventListener('change', updateUI);

  // Первинний рендеринг при завантаженні (Крок 7)
  updateUI();

  // Допоміжний механізм сценаріїв для тестування та фіксації станів інтерфейсу для звіту
  const urlParams = new URLSearchParams(window.location.search);
  const scenario = urlParams.get('scenario');
  if (scenario === 'valid') {
    inputTitle.value = 'Захист лабораторної роботи №1 з ТВР';
    inputDate.value = '2026-10-15';
    inputTime.value = '14:30';
    selectType.value = 'study';
    inputLocation.value = 'ХНУРЕ, ауд. 312';
    inputDescription.value = 'Підготовка демонстрації функціоналу та захист перед викладачем.';
  } else if (scenario === 'invalid') {
    inputTitle.value = 'А';
    inputDate.value = '';
    inputTime.value = '';
    inputLocation.value = '';
    validateField(inputTitle, 'title');
    validateField(inputDate, 'date');
    validateField(inputTime, 'time');
    validateField(inputLocation, 'location');
    notifier.error('Будь ласка, виправте виявлені помилки у формі.');
  } else if (scenario === 'filter') {
    filterType.value = 'study';
    updateUI();
  } else if (scenario === 'search') {
    searchInput.value = 'Workshop';
    updateUI();
  } else if (scenario === 'toast') {
    notifier.success('Подію «Захист лабораторної роботи №1 з ТВР» успішно створено!');
  }
});
