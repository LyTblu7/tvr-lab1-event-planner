// ================================================
// models.js — Класи предметної області (ES6+)
// Крок 4 методички: Event, EventPlanner, NotificationManager
// ================================================


// ---- Клас окремої події ----
class Event {
  constructor({ id = null, title, date, time, type = 'study', location, description = '' }) {
    this.id          = id || 'evt_' + Date.now();
    this.title       = title.trim();
    this.date        = date.trim();
    this.time        = time.trim();
    this.type        = type;
    this.location    = location.trim();
    this.description = description.trim();
  }

  // Мітка типу українською
  getTypeLabel() {
    const labels = { study: 'Навчання', work: 'Робота', personal: 'Особисте', leisure: 'Відпочинок' };
    return labels[this.type] || this.type;
  }

  // Date-об'єкт для сортування
  getDateTime() {
    return new Date(`${this.date}T${this.time}`);
  }
}


// ---- Менеджер колекції подій (CRUD + пошук/фільтр/сортування) ----
class EventPlanner {
  constructor(storageKey = 'tvr_events_v17') {
    this.storageKey = storageKey;
    this.items = [];
    this.loadFromStorage();
  }

  // Завантаження з localStorage (JSON.parse)
  loadFromStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data)) {
          this.items = data.map(obj => new Event(obj));
        }
      }
    } catch (e) {
      this.items = [];
    }
  }

  // Збереження в localStorage (JSON.stringify)
  saveToStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
  }

  // Додати подію
  add(data) {
    const event = new Event(data);
    this.items.push(event);
    this.saveToStorage();
    return event;
  }

  // Оновити подію за id
  update(id, data) {
    const i = this.items.findIndex(e => e.id === id);
    if (i === -1) return null;
    this.items[i] = new Event({ id, ...data });
    this.saveToStorage();
    return this.items[i];
  }

  // Видалити подію за id
  remove(id) {
    this.items = this.items.filter(e => e.id !== id);
    this.saveToStorage();
  }

  // Знайти за id
  getById(id) {
    return this.items.find(e => e.id === id) || null;
  }

  // Пошук (RegExp), фільтр за типом, сортування
  getFiltered({ query = '', type = 'all', sortBy = 'date-asc' } = {}) {
    let result = [...this.items];

    // Живий пошук — new RegExp(query, 'i') (Крок 9 методички)
    if (query.trim()) {
      const re = new RegExp(query.trim(), 'i');
      result = result.filter(e => re.test(e.title) || re.test(e.location));
    }

    // Фільтр за типом
    if (type !== 'all') {
      result = result.filter(e => e.type === type);
    }

    // Сортування
    result.sort((a, b) => {
      if (sortBy === 'date-asc')  return a.getDateTime() - b.getDateTime();
      if (sortBy === 'date-desc') return b.getDateTime() - a.getDateTime();
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title, 'uk');
      return 0;
    });

    return result;
  }
}


// ---- Toast-сповіщення (setTimeout) ----
class NotificationManager {
  constructor(containerId = 'toast-container') {
    this.container = document.getElementById(containerId);
  }

  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    this.container.appendChild(toast);

    setTimeout(() => toast.remove(), duration);
  }

  success(msg) { this.show(msg, 'success'); }
  error(msg)   { this.show(msg, 'error', 4000); }
  info(msg)    { this.show(msg, 'info'); }
}
