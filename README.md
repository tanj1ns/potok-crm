# ПОТОК CRM — Канбан-воронка и трекер сделок

Лёгкая CRM-система для малого бизнеса и агентств: канбан-воронка с перетаскиванием и быстрым переводом этапов, карточки клиентов с заметками и аналитикой выручки.

- **Стек:** React 19, Vite 6, Lucide Icons, Node.js (`http` + `node:sqlite`).
- **Деплой:**
  - Статика: `npm run publish` -> ветка `gh-pages` (`localStorage`-демо без раскрытия админских секретов).
  - Node.js + SQLite (VPS / Amvera): `Dockerfile` + `amvera.yml`, порт `4003`, `/data`, `/api/health`.
- **Безопасность:** `HttpOnly`-куки, `scrypt` + `timingSafeEqual`, rate limiting, CSRF защита `Origin/Host`, CSP (`script-src 'self'`), honeypot `.hp-trap`, согласие 152-ФЗ, `robots.txt`.
