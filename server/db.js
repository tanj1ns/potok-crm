'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./auth');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'potok.db');

const DEFAULT_ADMIN_SCRYPT =
  '8d7f6aa0226f41f6675eb594ff30334f:01b9dee690626c529da19c8ba30eb5fb103dda0fdfea639aa1a73fbc9ae6809e1d2bc170e358c4cf2213f8ae4266f9a0c9c92775049522cf38fcf192f68506ba';

function initDatabase() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      client_name TEXT NOT NULL,
      company TEXT DEFAULT '',
      phone TEXT NOT NULL,
      source TEXT NOT NULL,
      manager TEXT NOT NULL,
      budget INTEGER NOT NULL DEFAULT 0,
      stage TEXT NOT NULL DEFAULT 'new',
      notes_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );
  `);

  seed(db);
  return db;
}

function seedDeals(db) {
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO deals (code, title, client_name, company, phone, source, manager, budget, stage, notes_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const initialDeals = [
    [
      'DL-1041',
      'Редизайн корпоративного сайта и каталога',
      'Алексей Громов',
      'ТехноПром',
      '+7 (916) 510-22-41',
      'Сайт',
      'Анна К.',
      145000,
      'new',
      [{ id: 1, text: 'Отправлено ТЗ в PDF, созвон запланирован на завтра 11:00.', at: now }],
      now
    ],
    [
      'DL-1042',
      'Telegram-бот для приёма заявок и записи',
      'Марина Ли',
      'Студия «Линия»',
      '+7 (925) 318-90-14',
      'Telegram',
      'Максим В.',
      68000,
      'new',
      [{ id: 2, text: 'Нужна связка с Google Таблицей и автоответы клиентам.', at: now }],
      now
    ],
    [
      'DL-1043',
      'Настройка CRM и сквозной аналитики',
      'Егор Белов',
      'ООО «Альфа-Логистика»',
      '+7 (903) 740-11-05',
      'Рекомендация',
      'Анна К.',
      190000,
      'in_progress',
      [
        { id: 3, text: 'Согласован этап 1: импорт клиентской базы и настройка воронки.', at: now },
        { id: 4, text: 'Передали доступы к почте и телефонии.', at: now }
      ],
      now
    ],
    [
      'DL-1044',
      'Лендинг для коттеджного посёлка',
      'Сергей Власов',
      'СтройГрупп',
      '+7 (985) 219-66-70',
      'Авито',
      'Максим В.',
      95000,
      'in_progress',
      [{ id: 5, text: 'Утвердили прототип и расчёт ипотечного калькулятора.', at: now }],
      now
    ],
    [
      'DL-1045',
      'Интернет-магазин автозапчастей под ключ',
      'Дмитрий Карпов',
      'КарданСервис',
      '+7 (926) 804-12-93',
      'Сайт',
      'Анна К.',
      240000,
      'paid',
      [{ id: 6, text: 'Предоплата 100% получена по счёту №418. Идёт загрузка каталога.', at: now }],
      now
    ],
    [
      'DL-1046',
      'Запуск Telegram Mini App для заказа кофе',
      'Ольга Сомова',
      'Кофе-сеть «Свои»',
      '+7 (915) 602-88-31',
      'Telegram',
      'Максим В.',
      165000,
      'done',
      [{ id: 7, text: 'Проект принят без замечаний, подключили эквайринг.', at: now }],
      now
    ]
  ];

  for (const d of initialDeals) {
    stmt.run(d[0], d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8], JSON.stringify(d[9]), d[10]);
  }
}

function seed(db) {
  const now = new Date().toISOString();
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@potok-crm.ru').trim().toLowerCase();
  const adminHash = process.env.ADMIN_PASSWORD ? hashPassword(process.env.ADMIN_PASSWORD) : DEFAULT_ADMIN_SCRYPT;

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existing) {
    db.prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)').run(
      'Руководитель ПОТОК',
      adminEmail,
      adminHash,
      'admin',
      now
    );
  }

  const dealCount = db.prepare('SELECT COUNT(*) AS cnt FROM deals').get().cnt;
  if (dealCount === 0) {
    seedDeals(db);
  }
}

module.exports = { initDatabase, seedDeals };
