const SECRET_ROUTE_SALT = 'potok-route-v1:';
const SECRET_ROUTE_HASH = '586c510b49d775ca4218763da8d8da126ae370ca9095d850d3808aa178629315';

const ADMIN_EMAIL = 'admin@potok-crm.ru';
const ADMIN_PASS_SALT = 'potok-adm-v1:';
const ADMIN_PASS_HASH = '5524eef674bb9a83d45358ddcd610701ec6b5c0e40ba8cec412ab5e75280056a';

const STATIC_DB_KEY = 'potok_static_db_v1';
const STATIC_SESSION_KEY = 'potok_static_admin_v1';
const LOGIN_GUARD_KEY = 'potok_login_guard_v1';

let staticModeFlag = null;

export const STAGES = [
  { id: 'new', label: 'Новые', cls: 'status--wip' },
  { id: 'in_progress', label: 'В работе', cls: 'status--accent' },
  { id: 'paid', label: 'Оплачено', cls: 'status--live' },
  { id: 'done', label: 'Завершено', cls: 'status--oss' }
];

export const LEAD_SOURCES = ['Сайт', 'Telegram', 'Авито', 'Рекомендация'];
export const MANAGERS = ['Анна К.', 'Максим В.'];

export function isStaticHost() {
  if (staticModeFlag !== null) return staticModeFlag;
  return window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:';
}

export async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(str || '')));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function isSecretAdminHash(hashStr) {
  const clean = String(hashStr || '')
    .replace(/^#\/?/, '')
    .replace(/\/+$/, '')
    .trim();
  if (!clean) return false;
  return (await sha256Hex(SECRET_ROUTE_SALT + clean)) === SECRET_ROUTE_HASH;
}

export function formatRub(val) {
  return `${Math.round(Number(val) || 0).toLocaleString('ru-RU')} ₽`;
}

export function formatPhone(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits[0] === '8' || digits[0] === '7') digits = '7' + digits.slice(1);
  else digits = '7' + digits;
  digits = digits.slice(0, 11);

  let out = '+7';
  if (digits.length > 1) out += ' (' + digits.slice(1, 4);
  if (digits.length > 4) out += ') ' + digits.slice(4, 7);
  if (digits.length > 7) out += '-' + digits.slice(7, 9);
  if (digits.length > 9) out += '-' + digits.slice(9, 11);
  return out;
}

function getInitialStaticDb() {
  const now = new Date().toISOString();
  return {
    nextId: 7,
    deals: [
      {
        id: 1,
        code: 'DL-1041',
        title: 'Редизайн корпоративного сайта и каталога',
        clientName: 'Алексей Громов',
        company: 'ТехноПром',
        phone: '+7 (916) 510-22-41',
        source: 'Сайт',
        manager: 'Анна К.',
        budget: 145000,
        stage: 'new',
        notes: [{ id: 1, text: 'Отправлено ТЗ в PDF, созвон запланирован на завтра 11:00.', at: now }],
        createdAt: now
      },
      {
        id: 2,
        code: 'DL-1042',
        title: 'Telegram-бот для приёма заявок и записи',
        clientName: 'Марина Ли',
        company: 'Студия «Линия»',
        phone: '+7 (925) 318-90-14',
        source: 'Telegram',
        manager: 'Максим В.',
        budget: 68000,
        stage: 'new',
        notes: [{ id: 2, text: 'Нужна связка с Google Таблицей и автоответы клиентам.', at: now }],
        createdAt: now
      },
      {
        id: 3,
        code: 'DL-1043',
        title: 'Настройка CRM и сквозной аналитики',
        clientName: 'Егор Белов',
        company: 'ООО «Альфа-Логистика»',
        phone: '+7 (903) 740-11-05',
        source: 'Рекомендация',
        manager: 'Анна К.',
        budget: 190000,
        stage: 'in_progress',
        notes: [
          { id: 3, text: 'Согласован этап 1: импорт клиентской базы и настройка воронки.', at: now },
          { id: 4, text: 'Передали доступы к почте и телефонии.', at: now }
        ],
        createdAt: now
      },
      {
        id: 4,
        code: 'DL-1044',
        title: 'Лендинг для коттеджного посёлка',
        clientName: 'Сергей Власов',
        company: 'СтройГрупп',
        phone: '+7 (985) 219-66-70',
        source: 'Авито',
        manager: 'Максим В.',
        budget: 95000,
        stage: 'in_progress',
        notes: [{ id: 5, text: 'Утвердили прототип и расчёт ипотечного калькулятора.', at: now }],
        createdAt: now
      },
      {
        id: 5,
        code: 'DL-1045',
        title: 'Интернет-магазин автозапчастей под ключ',
        clientName: 'Дмитрий Карпов',
        company: 'КарданСервис',
        phone: '+7 (926) 804-12-93',
        source: 'Сайт',
        manager: 'Анна К.',
        budget: 240000,
        stage: 'paid',
        notes: [{ id: 6, text: 'Предоплата 100% получена по счёту №418. Идёт загрузка каталога.', at: now }],
        createdAt: now
      },
      {
        id: 6,
        code: 'DL-1046',
        title: 'Запуск Telegram Mini App для заказа кофе',
        clientName: 'Ольга Сомова',
        company: 'Кофе-сеть «Свои»',
        phone: '+7 (915) 602-88-31',
        source: 'Telegram',
        manager: 'Максим В.',
        budget: 165000,
        stage: 'done',
        notes: [{ id: 7, text: 'Проект принят без замечаний, подключили эквайринг.', at: now }],
        createdAt: now
      }
    ]
  };
}

function readStaticDb() {
  try {
    const raw = localStorage.getItem(STATIC_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.deals)) return parsed;
    }
  } catch {}
  const init = getInitialStaticDb();
  localStorage.setItem(STATIC_DB_KEY, JSON.stringify(init));
  return init;
}

function writeStaticDb(db) {
  localStorage.setItem(STATIC_DB_KEY, JSON.stringify(db));
}

function getStaticUser() {
  try {
    const raw = sessionStorage.getItem(STATIC_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function reqJson(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Сервер вернул некорректный ответ');
  }
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `Ошибка ${res.status}`);
  }
  return data;
}

export const crmApi = {
  async bootstrap() {
    if (isStaticHost()) {
      const db = readStaticDb();
      return { ok: true, deals: db.deals, user: getStaticUser() };
    }
    try {
      const res = await reqJson('./api/bootstrap');
      staticModeFlag = false;
      return res;
    } catch {
      staticModeFlag = true;
      const db = readStaticDb();
      return { ok: true, deals: db.deals, user: getStaticUser() };
    }
  },

  async createDeal(payload) {
    if (String(payload.website || '').trim() !== '') {
      return { ok: true, deal: { id: 0, code: 'DL-9999', title: 'Заявка принята', stage: 'new', notes: [] } };
    }
    if (!payload.consent) {
      throw new Error('Подтвердите согласие на обработку персональных данных (152-ФЗ).');
    }

    if (isStaticHost()) {
      const title = String(payload.title || '').trim();
      const clientName = String(payload.clientName || '').trim();
      const phone = String(payload.phone || '').trim();
      if (title.length < 2 || clientName.length < 2 || phone.replace(/\D/g, '').length < 11) {
        throw new Error('Заполните задачу, имя клиента и телефон (+7)');
      }

      const db = readStaticDb();
      const now = new Date().toISOString();
      const id = db.nextId++;
      const deal = {
        id,
        code: `DL-${1040 + id}`,
        title,
        clientName,
        company: String(payload.company || '').trim(),
        phone,
        source: LEAD_SOURCES.includes(payload.source) ? payload.source : 'Сайт',
        manager: MANAGERS.includes(payload.manager) ? payload.manager : 'Анна К.',
        budget: Math.max(0, Math.round(Number(payload.budget) || 0)),
        stage: 'new',
        notes: payload.note ? [{ id: Date.now(), text: String(payload.note).trim(), at: now }] : [],
        createdAt: now
      };
      db.deals.unshift(deal);
      writeStaticDb(db);
      return { ok: true, deal };
    }

    return reqJson('./api/deals', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateStage(id, stage) {
    if (isStaticHost()) {
      const db = readStaticDb();
      const target = db.deals.find((d) => d.id === Number(id));
      if (!target) throw new Error('Сделка не найдена');
      target.stage = stage;
      writeStaticDb(db);
      return { ok: true, deal: target };
    }
    return reqJson(`./api/deals/${id}/stage`, {
      method: 'PATCH',
      body: JSON.stringify({ stage })
    });
  },

  async addNote(id, text) {
    if (isStaticHost()) {
      const clean = String(text || '').trim();
      if (clean.length < 2) throw new Error('Введите текст заметки');
      const db = readStaticDb();
      const target = db.deals.find((d) => d.id === Number(id));
      if (!target) throw new Error('Сделка не найдена');
      target.notes = [...(target.notes || []), { id: Date.now(), text: clean, at: new Date().toISOString() }].slice(-25);
      writeStaticDb(db);
      return { ok: true, deal: target };
    }
    return reqJson(`./api/deals/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  },

  async login(email, password) {
    if (isStaticHost()) {
      let guard = { count: 0, lockedUntil: 0 };
      try {
        guard = JSON.parse(localStorage.getItem(LOGIN_GUARD_KEY) || '{}');
      } catch {}
      if (guard.lockedUntil && guard.lockedUntil > Date.now()) {
        const sec = Math.ceil((guard.lockedUntil - Date.now()) / 1000);
        throw new Error(`Слишком много попыток входа. Повторите через ${sec} сек.`);
      }

      await new Promise((r) => setTimeout(r, 450));
      const cleanEmail = String(email || '').trim().toLowerCase();
      const passHash = await sha256Hex(ADMIN_PASS_SALT + String(password || ''));

      if (cleanEmail !== ADMIN_EMAIL || passHash !== ADMIN_PASS_HASH) {
        const count = Number(guard.count || 0) + 1;
        const nextGuard = count >= 5 ? { count: 0, lockedUntil: Date.now() + 5 * 60_000 } : { count, lockedUntil: 0 };
        localStorage.setItem(LOGIN_GUARD_KEY, JSON.stringify(nextGuard));
        throw new Error('Неверный email или пароль');
      }

      localStorage.removeItem(LOGIN_GUARD_KEY);
      const user = { id: 1, name: 'Руководитель ПОТОК', email: ADMIN_EMAIL, role: 'admin' };
      sessionStorage.setItem(STATIC_SESSION_KEY, JSON.stringify(user));
      return { ok: true, user };
    }

    return reqJson('./api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async logout() {
    if (isStaticHost()) {
      sessionStorage.removeItem(STATIC_SESSION_KEY);
      return { ok: true };
    }
    return reqJson('./api/auth/logout', { method: 'POST' });
  },

  async deleteDeal(id) {
    if (isStaticHost()) {
      const db = readStaticDb();
      db.deals = db.deals.filter((d) => d.id !== Number(id));
      writeStaticDb(db);
      return { ok: true };
    }
    return reqJson(`./api/admin/deals/${id}`, { method: 'DELETE' });
  },

  async resetDemo() {
    if (isStaticHost()) {
      const fresh = getInitialStaticDb();
      writeStaticDb(fresh);
      return { ok: true, deals: fresh.deals };
    }
    return reqJson('./api/admin/reset', { method: 'POST' });
  }
};
