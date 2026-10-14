/**
 * models.js — Класи об'єктної моделі предметної області (ES6+).
 * Відповідає вимогам розділу 1.4.2 (Крок 4) та Варіанта 17 (Планувальник подій).
 * 
 * Контрольне питання №4: Що таке клас у JavaScript ES6+ і з яких елементів він складається?
 * - Клас містить constructor (ініціалізація полів), методи екземпляра та властивості.
 */

/**
 * Клас сутності окремої події (Event)
 */
class Event {
  /**
   * @param {Object} param0
   * @param {string} [param0.id] - Унікальний ідентифікатор події
   * @param {string} param0.title - Назва події
   * @param {string} param0.date - Дата у форматі YYYY-MM-DD
   * @param {string} param0.time - Час у форматі HH:MM
   * @param {string} param0.location - Місце проведення або онлайн-платформа
   * @param {string} param0.type - Тип події (conference, workshop, summit, expo, personal)
   * @param {string} [param0.description=''] - Опис події
   */
  constructor({
    id = null,
    title,
    date,
    time,
    location,
    type = 'study',
    description = ''
  }) {
    // Ініціалізація полів сутності
    this.id = id || 'evt_' + Date.now();
    this.title = (title || '').trim();
    this.date = (date || '').trim();
    this.time = (time || '').trim();
    this.location = (location || '').trim();
    this.type = type;
    this.description = (description || '').trim();
  }

  /**
   * Отримання скороченої назви місяця та дня для блоку дати
   * @returns {{ month: string, day: number, year: number }}
   */
  getDateParts() {
    const [year, month, day] = this.date.split('-').map(Number);
    const months = ['СІЧ', 'ЛЮТ', 'БЕР', 'КВІ', 'ТРА', 'ЧЕР', 'ЛИП', 'СЕР', 'ВЕР', 'ЖОВ', 'ЛИС', 'ГРУ'];
    return {
      month: months[month - 1] || 'ДАТА',
      day: day || 1,
      year: year || 2026
    };
  }

  /**
   * Створення об'єкта дати для порівняння та сортування
   * @returns {Date}
   */
  getDateTime() {
    return new Date(`${this.date}T${this.time}`);
  }

  /**
   * Текстова мітка типу події українською
   * @returns {string}
   */
  getTypeLabel() {
    const labels = {
      study: 'Навчання',
      work: 'Робота',
      personal: 'Особисте',
      leisure: 'Відпочинок'
    };
    return labels[this.type] || this.type;
  }
}

/**
 * Клас-менеджер колекції подій (EventPlanner)
 * Інкапсулює масив подій та методи роботи з колекцією (CRUD, пошук, фільтрація, сортування)
 */
class EventPlanner {
  /**
   * @param {string} storageKey
   */
  constructor(storageKey = 'tvr_events_v17') {
    this.storageKey = storageKey;
    /** @type {Event[]} */
    this.items = [];
    this.loadFromStorage();
  }

  /**
   * Зчитування збережених даних із localStorage (Крок 6 методички, Контрольне питання №14)
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved !== null) {
        // Контрольне питання №14: десеріалізація через JSON.parse()
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this.items = parsed.map(item => new Event(item));
          return;
        }
      }
    } catch (err) {
      console.error('Помилка завантаження з localStorage:', err);
    }
    this.items = [];
  }

  /**
   * Збереження даних у localStorage (Крок 6 методички, Контрольне питання №14)
   */
  saveToStorage() {
    try {
      // Контрольне питання №14: серіалізація через JSON.stringify()
      localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    } catch (err) {
      console.error('Помилка запису в localStorage:', err);
    }
  }

  /**
   * Додавання нового запису
   * @param {Object} data 
   * @returns {Event}
   */
  add(data) {
    const newEvent = new Event(data);
    this.items.push(newEvent);
    this.saveToStorage();
    return newEvent;
  }

  /**
   * Оновлення запису за ідентифікатором
   * @param {string} id 
   * @param {Object} data 
   * @returns {Event|null}
   */
  update(id, data) {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return null;
    this.items[index] = new Event({ id, ...data });
    this.saveToStorage();
    return this.items[index];
  }

  /**
   * Видалення запису за ідентифікатором (Крок 8 методички)
   * @param {string} id 
   * @returns {boolean}
   */
  remove(id) {
    const initialLen = this.items.length;
    this.items = this.items.filter(item => item.id !== id);
    const deleted = this.items.length < initialLen;
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Пошук запису за id
   * @param {string} id 
   * @returns {Event|null}
   */
  getById(id) {
    return this.items.find(item => item.id === id) || null;
  }

  /**
   * Пошук, фільтрація та сортування (Крок 9 методички)
   * Використовує метод filter() і sort(), створюючи похідний масив без зміни вихідного.
   * Для пошуку застосовується new RegExp(query, 'i') — Контрольне питання №12.
   * 
   * @param {Object} options
   * @param {string} [options.query='']
   * @param {string} [options.type='all']
   * @param {string} [options.sortBy='date-asc']
   * @returns {Event[]}
   */
  getFiltered({ query = '', type = 'all', sortBy = 'date-asc' } = {}) {
    let result = [...this.items];

    // Крок 9: пошук за регулярним виразом
    if (query && query.trim() !== '') {
      const pattern = new RegExp(query.trim(), 'i');
      result = result.filter(item => 
        pattern.test(item.title) || pattern.test(item.location)
      );
    }

    // Фільтрація за типом (Варіант 17)
    if (type && type !== 'all') {
      result = result.filter(item => item.type === type);
    }

    // Сортування за датою (Варіант 17)
    result.sort((a, b) => {
      if (sortBy === 'date-asc') {
        return a.getDateTime() - b.getDateTime();
      }
      if (sortBy === 'date-desc') {
        return b.getDateTime() - a.getDateTime();
      }
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title, 'uk-UA');
      }
      return 0;
    });

    return result;
  }
}

/**
 * Клас системи сповіщень NotificationManager (Варіант 17)
 * Реалізує створення toast-сповіщень відповідного типу (успіх, помилка, інфо),
 * що автоматично зникають через заданий час (setTimeout) або за кнопкою закриття.
 */
class NotificationManager {
  /**
   * @param {string} containerSelector
   */
  constructor(containerSelector = '#toast-container') {
    this.container = document.querySelector(containerSelector);
  }

  /**
   * Відображення сповіщення
   * @param {string} message
   * @param {'success'|'error'|'info'} [type='info']
   * @param {number} [duration=3500]
   */
  show(message, type = 'info', duration = 3500) {
    if (!this.container) return;

    // Контрольне питання №7: методи створення елементів createElement()
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    this.container.appendChild(toast);

    // Автоматичне зникання через setTimeout (вимога Варіанта 17)
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove(); // Контрольне питання №7: видалення елемента
        }
      }, 250);
    }, duration);
  }

  success(msg) { this.show(msg, 'success'); }
  error(msg) { this.show(msg, 'error', 4500); }
  info(msg) { this.show(msg, 'info'); }
}
