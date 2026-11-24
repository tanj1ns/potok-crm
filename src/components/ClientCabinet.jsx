import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Briefcase, LogOut, MessageSquarePlus, Plus, UserCheck } from 'lucide-react';
import { STAGES, formatRub } from '../api';
import { formatClientPhone } from '../clientAuth';

export default function ClientCabinet({
  client,
  clientAuth,
  deals,
  onClientChange,
  onAddNote,
  onOpenCreate,
  onBackToBoard,
  onOpenPrivacy
}) {
  const [authTab, setAuthTab] = useState('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authMsg, setAuthMsg] = useState({ type: '', text: '' });
  const [authBusy, setAuthBusy] = useState(false);

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regWebsite, setRegWebsite] = useState('');
  const [regConsent, setRegConsent] = useState(false);
  const regOpenedAt = useRef(Date.now());

  const [profName, setProfName] = useState('');
  const [profCompany, setProfCompany] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profTelegram, setProfTelegram] = useState('');
  const [profMsg, setProfMsg] = useState({ type: '', text: '' });
  const [profBusy, setProfBusy] = useState(false);

  const [noteDrafts, setNoteDrafts] = useState({});
  const [noteBusyId, setNoteBusyId] = useState(null);

  useEffect(() => {
    if (authTab === 'register') regOpenedAt.current = Date.now();
  }, [authTab]);

  useEffect(() => {
    if (!client) return;
    setProfName(client.name || '');
    setProfCompany(client.meta?.company || '');
    setProfPhone(client.phone || '');
    setProfTelegram(client.meta?.telegram || '');
  }, [client]);

  async function handleLogin(e) {
    e.preventDefault();
    setAuthMsg({ type: '', text: '' });
    setAuthBusy(true);
    try {
      const res = await clientAuth.login(loginEmail, loginPassword);
      onClientChange(res.client);
      setLoginPassword('');
    } catch (err) {
      setAuthMsg({ type: 'err', text: err.message });
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setAuthMsg({ type: '', text: '' });
    setAuthBusy(true);
    try {
      const res = await clientAuth.register({
        name: regName,
        email: regEmail,
        phone: regPhone,
        password: regPassword,
        meta: { company: regCompany.trim(), telegram: '', dealCodes: [] },
        consent: regConsent,
        website: regWebsite,
        elapsedMs: Date.now() - regOpenedAt.current
      });
      if (res.client) onClientChange(res.client);
      setRegPassword('');
    } catch (err) {
      setAuthMsg({ type: 'err', text: err.message });
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfMsg({ type: '', text: '' });
    setProfBusy(true);
    try {
      const res = await clientAuth.updateProfile({
        name: profName,
        phone: profPhone,
        meta: { company: profCompany.trim(), telegram: profTelegram.trim() }
      });
      onClientChange(res.client);
      setProfMsg({ type: 'ok', text: 'Профиль заказчика обновлён.' });
    } catch (err) {
      setProfMsg({ type: 'err', text: err.message });
    } finally {
      setProfBusy(false);
    }
  }

  async function handleSendDealNote(dealId) {
    const text = String(noteDrafts[dealId] || '').trim();
    if (!text) return;
    setNoteBusyId(dealId);
    try {
      await onAddNote(dealId, text);
      setNoteDrafts((prev) => ({ ...prev, [dealId]: '' }));
    } finally {
      setNoteBusyId(null);
    }
  }

  async function handleLogout() {
    await clientAuth.logout().catch(() => {});
    onClientChange(null);
  }

  function fillDemoClient() {
    setAuthTab('login');
    setLoginEmail('client@potok-crm.ru');
    setLoginPassword('client12345');
    setAuthMsg({ type: 'ok', text: 'Подставлены данные демо-заказчика' });
  }

  const clientDealCodes = Array.isArray(client?.meta?.dealCodes) ? client.meta.dealCodes : [];
  const normPhone = String(client?.phone || '').replace(/\D/g, '');
  const clientDeals = client
    ? deals.filter(
        (d) =>
          clientDealCodes.includes(d.code) ||
          (normPhone.length >= 10 && String(d.phone || '').replace(/\D/g, '') === normPhone) ||
          d.clientName === client.name
      )
    : [];

  return (
    <div>
      <div className="cab-head">
        <div>
          <span className="eyebrow">Портал заказчика ПОТОК CRM</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem' }}>
            {client ? `Личный кабинет · ${client.name}` : 'Личный кабинет заказчика'}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--outline btn--sm" onClick={onBackToBoard}>
            <ArrowLeft size={14} /> К воронке
          </button>
          {client && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
              <LogOut size={14} /> Выйти
            </button>
          )}
        </div>
      </div>

      {!client ? (
        <div className="auth-layout">
          <div className="panel">
            <div className="tabs" style={{ marginBottom: 16 }}>
              <button
                type="button"
                className={`tab ${authTab === 'login' ? 'is-active' : ''}`}
                onClick={() => {
                  setAuthTab('login');
                  setAuthMsg({ type: '', text: '' });
                }}
              >
                Вход
              </button>
              <button
                type="button"
                className={`tab ${authTab === 'register' ? 'is-active' : ''}`}
                onClick={() => {
                  setAuthTab('register');
                  setAuthMsg({ type: '', text: '' });
                }}
              >
                Регистрация заказчика
              </button>
            </div>

            {authTab === 'login' ? (
              <form className="form" onSubmit={handleLogin}>
                <div className="field">
                  <label htmlFor="ptkLoginEmail">Email</label>
                  <input
                    id="ptkLoginEmail"
                    type="email"
                    className="input mono"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="client@potok-crm.ru"
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="field">
                  <label htmlFor="ptkLoginPass">Пароль</label>
                  <input
                    id="ptkLoginPass"
                    type="password"
                    className="input"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Введите пароль"
                    required
                    autoComplete="current-password"
                  />
                </div>
                {authMsg.text && (
                  <div className={`status-msg ${authMsg.type === 'ok' ? 'status-msg--ok' : 'status-msg--err'}`}>
                    {authMsg.text}
                  </div>
                )}
                <button type="submit" className="btn btn--primary" disabled={authBusy}>
                  {authBusy ? 'Входим...' : 'Войти'}
                </button>
              </form>
            ) : (
              <form className="form" onSubmit={handleRegister}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="ptkRegName">Имя *</label>
                    <input
                      id="ptkRegName"
                      className="input"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Алексей Громов"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="ptkRegComp">Компания</label>
                    <input
                      id="ptkRegComp"
                      className="input"
                      value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)}
                      placeholder="ТехноПром"
                    />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="ptkRegEmail">Email *</label>
                    <input
                      id="ptkRegEmail"
                      type="email"
                      className="input mono"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="ptkRegPhone">Телефон</label>
                    <input
                      id="ptkRegPhone"
                      type="tel"
                      className="input mono"
                      value={regPhone}
                      onChange={(e) => setRegPhone(formatClientPhone(e.target.value))}
                      placeholder="+7 (999) 000-00-00"
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="ptkRegPass">Пароль (от 6 символов) *</label>
                  <input
                    id="ptkRegPass"
                    type="password"
                    className="input"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
                <div className="hp-trap" aria-hidden="true">
                  <label htmlFor="ptkRegTrap">Ваш сайт</label>
                  <input
                    id="ptkRegTrap"
                    tabIndex={-1}
                    autoComplete="off"
                    value={regWebsite}
                    onChange={(e) => setRegWebsite(e.target.value)}
                  />
                </div>
                <label className="consent-check">
                  <input
                    type="checkbox"
                    checked={regConsent}
                    onChange={(e) => setRegConsent(e.target.checked)}
                    required
                  />
                  <span>
                    Согласен с{' '}
                    <button type="button" className="link-inline" onClick={onOpenPrivacy}>152-ФЗ</button>
                  </span>
                </label>
                {authMsg.text && (
                  <div className={`status-msg ${authMsg.type === 'ok' ? 'status-msg--ok' : 'status-msg--err'}`}>
                    {authMsg.text}
                  </div>
                )}
                <button type="submit" className="btn btn--primary" disabled={authBusy}>
                  {authBusy ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
                </button>
              </form>
            )}
          </div>

          <aside className="panel demo-creds">
            <div>
              <span className="eyebrow">Демо-доступ</span>
              <h2 style={{ fontSize: '1.12rem', marginBottom: 6 }}>Кабинет клиента компании</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Отслеживайте статус ваших сделок, ответственного менеджера, комментарии и добавляйте новые заявки.
              </p>
            </div>
            <div className="demo-creds__box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <strong>Тестовый заказчик</strong>
                <span className="status-pill status--accent">КЛИЕНТ</span>
              </div>
              <div className="mono" style={{ fontSize: '0.8rem' }}>Email: client@potok-crm.ru</div>
              <div className="mono" style={{ fontSize: '0.8rem', marginBottom: 10 }}>Пароль: client12345</div>
              <button type="button" className="btn btn--outline btn--sm" onClick={fillDemoClient}>
                Подставить данные клиента
              </button>
            </div>
          </aside>
        </div>
      ) : (
        <div className="cab-grid">
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: '1.08rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCheck size={17} color="var(--accent)" /> Профиль заказчика
              </h2>
              <span className="status-pill status--accent">КЛИЕНТ</span>
            </div>
            <form className="form" onSubmit={handleProfileSave}>
              <div className="field">
                <label>Email</label>
                <input className="input mono" value={client.email} disabled />
              </div>
              <div className="field">
                <label htmlFor="ptkProfName">Имя</label>
                <input
                  id="ptkProfName"
                  className="input"
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="ptkProfComp">Компания</label>
                <input
                  id="ptkProfComp"
                  className="input"
                  value={profCompany}
                  onChange={(e) => setProfCompany(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="ptkProfPhone">Телефон</label>
                <input
                  id="ptkProfPhone"
                  type="tel"
                  className="input mono"
                  value={profPhone}
                  onChange={(e) => setProfPhone(formatClientPhone(e.target.value))}
                />
              </div>
              <div className="field">
                <label htmlFor="ptkProfTg">Telegram</label>
                <input
                  id="ptkProfTg"
                  className="input mono"
                  value={profTelegram}
                  onChange={(e) => setProfTelegram(e.target.value)}
                  placeholder="@username"
                />
              </div>
              {profMsg.text && (
                <div className={`status-msg ${profMsg.type === 'ok' ? 'status-msg--ok' : 'status-msg--err'}`}>
                  {profMsg.text}
                </div>
              )}
              <button type="submit" className="btn btn--primary" disabled={profBusy}>
                {profBusy ? 'Сохраняем...' : 'Сохранить профиль'}
              </button>
            </form>
          </div>

          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <h2 style={{ fontSize: '1.08rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={17} color="var(--accent)" /> Мои проекты и сделки ({clientDeals.length})
              </h2>
              <button type="button" className="btn btn--primary btn--sm" onClick={onOpenCreate}>
                <Plus size={14} /> Новая заявка
              </button>
            </div>

            {clientDeals.length === 0 ? (
              <div className="cab-item">
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                  У вас пока нет активных сделок. Оформите заявку на оценку проекта.
                </p>
              </div>
            ) : (
              <div className="cab-list">
                {clientDeals.map((d) => {
                  const st = STAGES.find((s) => s.id === d.stage) || STAGES[0];
                  return (
                    <article key={d.id} className="cab-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <strong className="mono">{d.code}</strong>
                        <span className={`status-pill ${st.cls}`}>{st.label}</span>
                      </div>
                      <h3 style={{ fontSize: '0.96rem' }}>{d.title}</h3>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Менеджер: <strong>{d.manager}</strong> &bull; Бюджет: <strong className="mono">{formatRub(d.budget)}</strong>
                      </div>
                      {(d.notes || []).length > 0 && (
                        <div className="notes-list" style={{ maxHeight: 130 }}>
                          {d.notes.slice(-2).map((n) => (
                            <div key={n.id} className="note-item">{n.text}</div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <input
                          className="input"
                          value={noteDrafts[d.id] || ''}
                          onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          placeholder="Написать комментарий менеджеру..."
                        />
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          disabled={noteBusyId === d.id}
                          onClick={() => handleSendDealNote(d.id)}
                          aria-label="Отправить комментарий"
                        >
                          <MessageSquarePlus size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
