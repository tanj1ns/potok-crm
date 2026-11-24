'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const { initDatabase, seedDeals } = require('./db');
const {
  verifyPassword,
  createSession,
  deleteSession,
  getSessionUser,
  buildCookie
} = require('./auth');
const {
  apiLimiter,
  loginLimiter,
  leadLimiter,
  applySecurityHeaders,
  verifySameOrigin,
  hardenHttpServer
} = require('./security');

const {
  initClientAccount,
  handleClientApi
} = require('./clientAccount');

const PORT = Number(process.env.PORT) || 4003;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const CLIENT_ACCOUNT_CONFIG = {
  prefix: 'potok',
  ordersTable: null,
  seed: {
    name: 'Алексей Громов',
    email: 'client@potok-crm.ru',
    phone: '+7 (916) 510-22-41',
    password: process.env.DEMO_CLIENT_PASSWORD || 'client12345',
    meta: {
      company: 'ТехноПром',
      telegram: '@agromov_tp',
      dealCodes: ['DL-1041']
    }
  }
};

const db = initDatabase();
initClientAccount(db, CLIENT_ACCOUNT_CONFIG);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

const VALID_STAGES = ['new', 'in_progress', 'paid', 'done'];

function sendJson(res, status, data, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(data));
}

function readJson(req, maxBytes = 32 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Размер запроса превышает лимит'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Некорректный JSON'));
      }
    });
    req.on('error', reject);
  });
}

function serveFile(res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

function mapDeal(r) {
  let notes = [];
  try {
    notes = JSON.parse(r.notes_json || '[]');
  } catch {
    notes = [];
  }
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    clientName: r.client_name,
    company: r.company || '',
    phone: r.phone,
    source: r.source,
    manager: r.manager,
    budget: r.budget,
    stage: r.stage,
    notes,
    createdAt: r.created_at
  };
}

async function handleApi(req, res, parsed) {
  const method = req.method;
  const pathname = parsed.pathname;

  if (method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, service: 'potok-crm' });
  }

  const rate = apiLimiter(req);
  if (!rate.allowed) {
    return sendJson(res, 429, { ok: false, error: 'Слишком много запросов. Подождите минуту.' }, { 'Retry-After': String(rate.retryAfterSec) });
  }

  if (!verifySameOrigin(req)) {
    return sendJson(res, 403, { ok: false, error: 'Запрос отклонён политикой безопасности источника (CSRF)' });
  }

  const isSecure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  const user = getSessionUser(db, req);

  if (pathname.startsWith('/api/client/')) {
    return handleClientApi(req, res, parsed, db, CLIENT_ACCOUNT_CONFIG, {
      sendJson,
      readJson,
      loginLimiter,
      isSecure
    });
  }

  if (method === 'GET' && pathname === '/api/bootstrap') {
    const deals = db.prepare('SELECT * FROM deals ORDER BY id DESC').all().map(mapDeal);
    return sendJson(res, 200, {
      ok: true,
      deals,
      user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null
    });
  }

  if (method === 'POST' && pathname === '/api/deals') {
    const lRate = leadLimiter(req);
    if (!lRate.allowed) {
      return sendJson(res, 429, { ok: false, error: 'Превышен лимит создания сделок.' }, { 'Retry-After': String(lRate.retryAfterSec) });
    }

    const body = await readJson(req);
    if (String(body.website || '').trim() !== '') {
      return sendJson(res, 201, {
        ok: true,
        deal: { id: 0, code: 'DL-9999', title: 'Заявка принята', stage: 'new', notes: [] }
      });
    }

    if (!body.consent) {
      return sendJson(res, 400, { ok: false, error: 'Подтвердите согласие на обработку персональных данных (152-ФЗ).' });
    }

    const title = String(body.title || '').trim().slice(0, 140);
    const clientName = String(body.clientName || '').trim().slice(0, 100);
    const company = String(body.company || '').trim().slice(0, 100);
    const phone = String(body.phone || '').trim().slice(0, 32);
    const source = ['Сайт', 'Telegram', 'Авито', 'Рекомендация'].includes(body.source) ? body.source : 'Сайт';
    const manager = ['Анна К.', 'Максим В.'].includes(body.manager) ? body.manager : 'Анна К.';
    const budget = Math.max(0, Math.round(Number(body.budget) || 0));
    const initialNote = String(body.note || '').trim().slice(0, 400);

    if (title.length < 2 || clientName.length < 2 || phone.replace(/\D/g, '').length < 11) {
      return sendJson(res, 400, { ok: false, error: 'Заполните задачу, имя клиента и телефон (+7)' });
    }

    const code = `DL-${crypto.randomInt(1100, 9999)}`;
    const now = new Date().toISOString();
    const notes = initialNote ? [{ id: Date.now(), text: initialNote, at: now }] : [];

    const info = db
      .prepare(
        `INSERT INTO deals (code, title, client_name, company, phone, source, manager, budget, stage, notes_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`
      )
      .run(code, title, clientName, company, phone, source, manager, budget, JSON.stringify(notes), now);

    const created = db.prepare('SELECT * FROM deals WHERE id = ?').get(info.lastInsertRowid);
    return sendJson(res, 201, { ok: true, deal: mapDeal(created) });
  }

  const stageMatch = pathname.match(/^\/api\/deals\/(\d+)\/stage$/);
  if (stageMatch && method === 'PATCH') {
    const id = Number(stageMatch[1]);
    const body = await readJson(req);
    if (!VALID_STAGES.includes(body.stage)) {
      return sendJson(res, 400, { ok: false, error: 'Некорректный этап воронки' });
    }
    const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
    if (!existing) return sendJson(res, 404, { ok: false, error: 'Сделка не найдена' });
    db.prepare('UPDATE deals SET stage = ? WHERE id = ?').run(body.stage, id);
    const updated = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
    return sendJson(res, 200, { ok: true, deal: mapDeal(updated) });
  }

  const notesMatch = pathname.match(/^\/api\/deals\/(\d+)\/notes$/);
  if (notesMatch && method === 'POST') {
    const id = Number(notesMatch[1]);
    const body = await readJson(req);
    const text = String(body.text || '').trim().slice(0, 400);
    if (text.length < 2) return sendJson(res, 400, { ok: false, error: 'Введите текст заметки' });

    const existing = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
    if (!existing) return sendJson(res, 404, { ok: false, error: 'Сделка не найдена' });

    const mapped = mapDeal(existing);
    const nextNotes = [...mapped.notes, { id: Date.now(), text, at: new Date().toISOString() }].slice(-25);
    db.prepare('UPDATE deals SET notes_json = ? WHERE id = ?').run(JSON.stringify(nextNotes), id);
    const updated = db.prepare('SELECT * FROM deals WHERE id = ?').get(id);
    return sendJson(res, 200, { ok: true, deal: mapDeal(updated) });
  }

  if (method === 'POST' && pathname === '/api/auth/login') {
    const lRate = loginLimiter(req);
    if (!lRate.allowed) {
      return sendJson(res, 429, { ok: false, error: 'Слишком много попыток входа.' }, { 'Retry-After': String(lRate.retryAfterSec) });
    }

    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    const account = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
    if (!account || !verifyPassword(password, account.password_hash)) {
      return sendJson(res, 401, { ok: false, error: 'Неверный email или пароль' });
    }

    const token = createSession(db, account.id);
    return sendJson(
      res,
      200,
      { ok: true, user: { id: account.id, name: account.name, email: account.email, role: account.role } },
      { 'Set-Cookie': buildCookie(token, false, isSecure) }
    );
  }

  if (method === 'POST' && pathname === '/api/auth/logout') {
    if (user?.token) deleteSession(db, user.token);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': buildCookie('', true, isSecure) });
  }

  if (pathname.startsWith('/api/admin/')) {
    if (!user || user.role !== 'admin') {
      return sendJson(res, 401, { ok: false, error: 'Требуется авторизация администратора' });
    }

    const delMatch = pathname.match(/^\/api\/admin\/deals\/(\d+)$/);
    if (delMatch && method === 'DELETE') {
      db.prepare('DELETE FROM deals WHERE id = ?').run(Number(delMatch[1]));
      return sendJson(res, 200, { ok: true });
    }

    if (method === 'POST' && pathname === '/api/admin/reset') {
      db.prepare('DELETE FROM deals').run();
      seedDeals(db);
      const deals = db.prepare('SELECT * FROM deals ORDER BY id DESC').all().map(mapDeal);
      return sendJson(res, 200, { ok: true, deals });
    }
  }

  return sendJson(res, 404, { ok: false, error: 'Маршрут не найден' });
}

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res);

  try {
    const parsed = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (parsed.pathname.startsWith('/api/')) {
      return await handleApi(req, res, parsed);
    }

    const reqPath = decodeURIComponent(parsed.pathname);
    if (reqPath === '/robots.txt') {
      return serveFile(res, path.join(ROOT_DIR, 'public', 'robots.txt'));
    }

    const cleanDistPath = path.resolve(DIST_DIR, reqPath === '/' ? 'index.html' : `.${reqPath}`);
    if (!cleanDistPath.startsWith(path.resolve(DIST_DIR))) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (fs.existsSync(cleanDistPath) && fs.statSync(cleanDistPath).isFile()) {
      return serveFile(res, cleanDistPath);
    }

    return serveFile(res, path.join(DIST_DIR, 'index.html'));
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: err?.message || 'Внутренняя ошибка сервера' });
  }
});

hardenHttpServer(server);
server.listen(PORT, HOST, () => {
  console.log(`potok-crm server running at http://${HOST}:${PORT}`);
});
