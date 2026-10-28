/**
 * models.js — Моделі даних та бізнес-логіка планувальника подій
 */

/**
 * Сутність однієї події
 */
class Event {
  constructor({ id = null, title, date, time, type = 'study', location, description = '' }) {
    this.id          = id || 'e_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    this.title       = title.trim();
    this.date        = date.trim();
    this.time        = time.trim();
    this.type        = type;
    this.location    = location.trim();
    this.description = description.trim();
  }

  getTypeLabel() {
    return {
      study: 'Навчання',
      work: 'Робота',
      personal: 'Особисте',
      leisure: 'Відпочинок'
    }[this.type] || this.type;
  }

  toDate() {
    return new Date(`${this.date}T${this.time}`);
  }
}

/**
 * Менеджер колекції подій: CRUD-операції, персистентність у localStorage,
 * фільтрація та сортування даних.
 */
class EventPlanner {
  constructor(key = 'tvr_events_v17') {
    this.key   = key;
    this.items = [];
    this._load();
  }

  /**
   * Завантаження та десеріалізація даних з локального сховища
   */
  _load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        this.items = JSON.parse(raw).map(o => new Event(o));
      }
    } catch {
      this.items = [];
    }
  }

  /**
   * Серіалізація та синхронізація поточного стану з localStorage
   */
  _save() {
    localStorage.setItem(this.key, JSON.stringify(this.items));
  }

  add(data) {
    const event = new Event(data);
    this.items.push(event);
    this._save();
    return event;
  }

  remove(id) {
    this.items = this.items.filter(e => e.id !== id);
    this._save();
  }

  getById(id) {
    return this.items.find(e => e.id === id) || null;
  }

  update(id, data) {
    const index = this.items.findIndex(e => e.id === id);
    if (index === -1) return null;
    this.items[index] = new Event({ id, ...data });
    this._save();
    return this.items[index];
  }

  /**
   * Отримання відфільтрованого та відсортованого списку подій
   */
  getFiltered({ query = '', type = 'all', sortBy = 'date-asc' } = {}) {
    let list = [...this.items];

    if (query.trim()) {
      const re = new RegExp(query.trim(), 'i');
      list = list.filter(e => re.test(e.title) || re.test(e.location));
    }

    if (type !== 'all') {
      list = list.filter(e => e.type === type);
    }

    list.sort((a, b) =>
      sortBy === 'date-desc' ? b.toDate() - a.toDate() :
      sortBy === 'title-asc' ? a.title.localeCompare(b.title, 'uk') :
      a.toDate() - b.toDate()
    );

    return list;
  }
}

/**
 * Сервіс спливаючих сповіщень користувача (Toast-повідомлення)
 */
class NotificationManager {
  constructor(id = 'toasts') {
    this.el = document.getElementById(id);
  }

  show(msg, type = 'info', ms = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    this.el.appendChild(toast);
    setTimeout(() => toast.remove(), ms);
  }

  success(m) { this.show(m, 'success'); }
  error(m)   { this.show(m, 'error', 4000); }
  info(m)    { this.show(m, 'info'); }
}
