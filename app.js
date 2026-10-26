// ── app.js — Логіка інтерфейсу «Планувальник подій» (Кроки 1–10 методички) ──

document.addEventListener('DOMContentLoaded', () => {

  // 1. Ініціалізація (Крок 4)
  const planner  = new EventPlanner('tvr_events_v17');
  const notifier = new NotificationManager('toasts');

  // 2. Елементи DOM (querySelector / getElementById — КП №6)
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

  let editId = null;   // null = режим «Створити», <id> = режим «Редагувати»


  // ─────────────────────────────────────────────────
  // 3. ВАЛІДАЦІЯ RegExp (Крок 5, КП №12, №13)
  // ─────────────────────────────────────────────────
  const RULES = {
    'f-title':    { re: /^.{3,80}$/,                                   msg: 'Від 3 до 80 символів.' },
    'f-date':     { re: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, msg: 'Формат: РРРР-ММ-ДД.' },
    'f-time':     { re: /^(0\d|1\d|2[0-3]):[0-5]\d$/,                 msg: 'Формат: ГГ:ХХ.' },
    'f-location': { re: /^.{2,80}$/,                                   msg: 'Від 2 до 80 символів.' },
  };

  // Перевіряє одне поле, ставить/знімає .invalid та показує помилку
  function check(input) {
    const rule  = RULES[input.id];
    const valid = rule && rule.re.test(input.value.trim());
    const errEl = document.getElementById('e-' + input.id.slice(2));  // e-title, e-date …

    input.classList.toggle('invalid', !valid);
    if (errEl) { errEl.textContent = valid ? '' : rule.msg; errEl.classList.toggle('on', !valid); }
    return valid;
  }

  // Жива валідація під час набору (подія input — Крок 5)
  [fTitle, fDate, fTime, fLocation].forEach(inp => inp.addEventListener('input', () => check(inp)));


  // ─────────────────────────────────────────────────
  // 4. РЕНДЕРИНГ КАРТОК (Крок 7, КП №7)
  // createElement, dataset.id, DocumentFragment, append
  // ─────────────────────────────────────────────────
  function render(items) {
    list.innerHTML = '';  // очищення списку (КП №8)

    if (!items.length) {
      list.innerHTML = `<div class="empty"><h3>Список порожній</h3><p>Заповніть форму ліворуч і натисніть «Створити подію».</p></div>`;
      return;
    }

    const frag = document.createDocumentFragment();  // DocumentFragment (Крок 7)

    items.forEach(item => {
      const card = document.createElement('article');  // createElement (Крок 7)
      card.className   = 'card';
      card.dataset.id  = item.id;           // dataset.id — прив'язка до об'єкта (Крок 7)
      card.dataset.type = item.type;

      card.innerHTML = `
        <div class="card-head">
          <h3>${esc(item.title)}</h3>
          <div class="card-actions">
            <button class="btn-edit">Ред.</button>
            <button class="btn-delete">Вид.</button>
          </div>
        </div>
        <div class="card-meta">${item.date} &nbsp; ${item.time}</div>
        <div class="card-meta">${esc(item.location)}</div>
        ${ item.description ? `<div class="card-desc">${esc(item.description)}</div>` : '' }
        <span class="badge">${item.getTypeLabel()}</span>
      `;

      frag.append(card);  // append (Крок 7)
    });

    list.append(frag);
  }

  // Екранування HTML (захист від XSS)
  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }


  // ─────────────────────────────────────────────────
  // 5. ДЕЛЕГУВАННЯ ПОДІЙ (Крок 8, КП №9, №10)
  // Один обробник на #events-list → closest()
  // ─────────────────────────────────────────────────
  list.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (!card) return;

    const id   = card.dataset.id;
    const item = planner.getById(id);
    if (!item) return;

    if (e.target.closest('.btn-delete')) {
      if (confirm(`Видалити «${item.title}»?`)) {
        planner.remove(id);
        if (editId === id) resetForm();
        updateUI();
        notifier.info(`Подію «${item.title}» видалено.`);
      }
    }

    if (e.target.closest('.btn-edit')) startEdit(item);
  });


  // ─────────────────────────────────────────────────
  // 6. SUBMIT ФОРМИ (Крок 5, 6 — КП №11)
  // event.preventDefault() — скасовуємо перезавантаження
  // ─────────────────────────────────────────────────
  form.addEventListener('submit', e => {
    e.preventDefault();  // КП №11

    const ok = [fTitle, fDate, fTime, fLocation].every(inp => check(inp));
    if (!ok) { notifier.error('Виправте помилки у формі.'); return; }

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
      notifier.success(`«${data.title}» — оновлено!`);
    } else {
      planner.add(data);
      notifier.success(`«${data.title}» — додано!`);
    }

    resetForm();
    updateUI();
  });


  // ─────────────────────────────────────────────────
  // 7. ПОШУК + ФІЛЬТР + СОРТУВАННЯ (Крок 9, КП №9)
  // ─────────────────────────────────────────────────
  function updateUI() {
    render(planner.getFiltered({
      query:  inpSearch.value,
      type:   selType.value,
      sortBy: selSort.value,
    }));
  }

  inpSearch.addEventListener('input',  updateUI);  // живий пошук на input
  selType.addEventListener('change',   updateUI);
  selSort.addEventListener('change',   updateUI);


  // ─────────────────────────────────────────────────
  // 8. РЕЖИМИ ФОРМИ: Редагувати / Скинути
  // ─────────────────────────────────────────────────
  function startEdit(item) {
    editId = item.id;
    formTitle.textContent   = 'Редагувати подію';
    btnSubmit.textContent   = 'Зберегти зміни';
    btnCancel.hidden        = false;

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
    document.querySelectorAll('.err.on').forEach(el => { el.textContent = ''; el.classList.remove('on'); });
  }

  btnCancel.addEventListener('click', resetForm);


  // Перший рендеринг (Крок 7)
  updateUI();

});
