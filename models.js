/**
 * models.js — Класи за вимогами методички (Варіант 17):
 * 1. Event — сутність події
 * 2. EventPlanner — менеджер колекції (CRUD, збереження, фільтрація)
 * 3. NotificationManager — спливаючі сповіщення (Toast)
 */

class Event {
  constructor({ id = null, title, date, time, type = 'study', location, description = '' }) {
    this.id          = id || String(Date.now());
    this.title       = title.trim();
    this.date        = date.trim();
    this.time        = time.trim();
    this.type        = type;
    this.location    = location.trim();
    this.description = description.trim();
  }

  // Назва категорії українською для відображення на картці
  getTypeLabel() {
    const labels = {
      study: 'Навчання',
      work: 'Робота',
      personal: 'Особисте',
      leisure: 'Відпочинок'
    };
    return labels[this.type] || 'Подія';
  }

  // Об'єкт дати для зручного сортування
  toDate() {
    return new Date(`${this.date}T${this.time}`);
  }
}

class EventPlanner {
  constructor(storageKey = 'tvr_events_v17') {
    this.key   = storageKey;
    this.items = [];
    this.load();
  }

  // Зчитування з localStorage
  load() {
    try {
      const data = localStorage.getItem(this.key);
      this.items = data ? JSON.parse(data).map(item => new Event(item)) : [];
    } catch {
      this.items = [];
    }
  }

  // Збереження в localStorage
  save() {
    localStorage.setItem(this.key, JSON.stringify(this.items));
  }

  // Додавання
  add(data) {
    const event = new Event(data);
    this.items.push(event);
    this.save();
    return event;
  }

  // Оновлення
  update(id, data) {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return null;
    this.items[index] = new Event({ id, ...data });
    this.save();
    return this.items[index];
  }

  // Видалення
  remove(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.save();
  }

  // Отримання за ID
  getById(id) {
    return this.items.find(item => item.id === id) || null;
  }

  // Пошук, фільтрація та сортування
  getFiltered({ query = '', type = 'all', sortBy = 'date-asc' } = {}) {
    let result = [...this.items];

    // Пошук регулярним виразом
    if (query.trim()) {
      const regex = new RegExp(query.trim(), 'i');
      result = result.filter(item => regex.test(item.title) || regex.test(item.location));
    }

    // Фільтр за типом
    if (type !== 'all') {
      result = result.filter(item => item.type === type);
    }

    // Сортування
    result.sort((a, b) => {
      if (sortBy === 'date-desc') return b.toDate() - a.toDate();
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title, 'uk');
      return a.toDate() - b.toDate(); // за замовчуванням: найближчі перші
    });

    return result;
  }
}

class NotificationManager {
  constructor(containerId = 'toasts') {
    this.container = document.getElementById(containerId);
  }

  // Показ сповіщення (зникає саме через setTimeout або за кліком на хрестик)
  show(message, type = 'info', duration = 3000) {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button type="button" class="toast-close" title="Закрити">&times;</button>
    `;

    // Закриття за кліком
    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());

    this.container.appendChild(toast);

    // Автоматичне зникання через заданий час (вимога методички)
    setTimeout(() => {
      if (toast.isConnected) toast.remove();
    }, duration);
  }

  success(msg) { this.show(msg, 'success'); }
  error(msg)   { this.show(msg, 'error', 4000); }
  info(msg)    { this.show(msg, 'info'); }
}
