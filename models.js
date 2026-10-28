/**
 * models.js — Моделі даних за методичкою (Варіант 17)
 */

class Event {
  constructor({ id = null, title, date, time, type = 'study', location, description = '' }) {
    this.id          = id || String(Date.now());
    this.title       = (title || '').trim();
    this.date        = (date || '').trim();
    this.time        = (time || '').trim();
    this.location    = (location || '').trim();
    this.description = (description || '').trim();

    // Дозволені типи відповідають варіантам у формі:
    // study = Навчання, work = Робота, personal = Особисте, leisure = Відпочинок
    const validTypes = ['study', 'work', 'personal', 'leisure'];
    this.type = validTypes.includes(type) ? type : 'leisure';
  }

  getTypeLabel() {
    const labels = {
      study: 'Навчання',
      work: 'Робота',
      personal: 'Особисте',
      leisure: 'Відпочинок'
    };
    return labels[this.type];
  }

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

  // Зчитування з localStorage та нормалізація типів
  load() {
    try {
      const data = localStorage.getItem(this.key);
      if (data) {
        this.items = JSON.parse(data).map(item => new Event(item));
        this.save(); // очищуємо некоректні типи в localStorage
      } else {
        this.items = [];
      }
    } catch {
      this.items = [];
    }
  }

  // Збереження в localStorage
  save() {
    localStorage.setItem(this.key, JSON.stringify(this.items));
  }

  add(data) {
    const event = new Event(data);
    this.items.push(event);
    this.save();
    return event;
  }

  update(id, data) {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return null;
    this.items[index] = new Event({ id, ...data });
    this.save();
    return this.items[index];
  }

  remove(id) {
    this.items = this.items.filter(item => item.id !== id);
    this.save();
  }

  getById(id) {
    return this.items.find(item => item.id === id) || null;
  }

  getFiltered({ query = '', type = 'all', sortBy = 'date-asc' } = {}) {
    let result = [...this.items];

    if (query.trim()) {
      const regex = new RegExp(query.trim(), 'i');
      result = result.filter(item => regex.test(item.title) || regex.test(item.location));
    }

    if (type !== 'all') {
      result = result.filter(item => item.type === type);
    }

    result.sort((a, b) => {
      if (sortBy === 'date-desc') return b.toDate() - a.toDate();
      if (sortBy === 'title-asc') return a.title.localeCompare(b.title, 'uk');
      return a.toDate() - b.toDate();
    });

    return result;
  }
}

class NotificationManager {
  constructor(containerId = 'toasts') {
    this.container = document.getElementById(containerId);
  }

  show(message, type = 'info', duration = 3000) {
    if (!this.container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span>${message}</span>
      <button type="button" class="toast-close" title="Закрити">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => toast.remove());

    this.container.appendChild(toast);

    setTimeout(() => {
      if (toast.isConnected) toast.remove();
    }, duration);
  }

  success(msg) { this.show(msg, 'success'); }
  error(msg)   { this.show(msg, 'error', 4000); }
  info(msg)    { this.show(msg, 'info'); }
}
