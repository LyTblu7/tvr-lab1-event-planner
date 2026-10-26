// ── models.js — Класи предметної області (Крок 4 методички) ──

// Клас однієї події
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
    return { study: 'Навчання', work: 'Робота', personal: 'Особисте', leisure: 'Відпочинок' }[this.type] || this.type;
  }

  toDate() { return new Date(`${this.date}T${this.time}`); }
}


// Менеджер колекції: CRUD + пошук / фільтр / сортування
class EventPlanner {
  constructor(key = 'tvr_events_v17') {
    this.key   = key;
    this.items = [];
    this._load();
  }

  // Завантаження з localStorage (JSON.parse — Крок 6)
  _load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) this.items = JSON.parse(raw).map(o => new Event(o));
    } catch { this.items = []; }
  }

  // Збереження (JSON.stringify — Крок 6)
  _save() { localStorage.setItem(this.key, JSON.stringify(this.items)); }

  add(data)        { const e = new Event(data); this.items.push(e); this._save(); return e; }
  remove(id)       { this.items = this.items.filter(e => e.id !== id); this._save(); }
  getById(id)      { return this.items.find(e => e.id === id) || null; }
  update(id, data) {
    const i = this.items.findIndex(e => e.id === id);
    if (i === -1) return null;
    this.items[i] = new Event({ id, ...data });
    this._save();
    return this.items[i];
  }

  // Пошук RegExp + фільтр + сортування (Крок 9)
  getFiltered({ query = '', type = 'all', sortBy = 'date-asc' } = {}) {
    let list = [...this.items];

    if (query.trim()) {
      const re = new RegExp(query.trim(), 'i');         // new RegExp(query, 'i')
      list = list.filter(e => re.test(e.title) || re.test(e.location));
    }

    if (type !== 'all') list = list.filter(e => e.type === type);

    list.sort((a, b) =>
      sortBy === 'date-desc' ? b.toDate() - a.toDate() :
      sortBy === 'title-asc' ? a.title.localeCompare(b.title, 'uk') :
      a.toDate() - b.toDate()
    );

    return list;
  }
}


// Toast-сповіщення (Варіант 17: setTimeout)
class NotificationManager {
  constructor(id = 'toasts') { this.el = document.getElementById(id); }

  show(msg, type = 'info', ms = 3000) {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    this.el.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  success(m) { this.show(m, 'success'); }
  error(m)   { this.show(m, 'error', 4000); }
  info(m)    { this.show(m, 'info'); }
}
