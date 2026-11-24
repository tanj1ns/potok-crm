import React, { useState } from 'react';
import { ArrowLeft, Download, LogOut, RotateCcw, Shield, Trash2 } from 'lucide-react';
import { STAGES, crmApi, formatRub } from '../api';

export default function AdminCrm({ user, deals, onUserChange, onRefresh, onExit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await crmApi.login(email, password);
      onUserChange(res.user);
      setPassword('');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await crmApi.logout();
    onUserChange(null);
  }

  async function handleDelete(id) {
    await crmApi.deleteDeal(id);
    setMsg('Сделка удалена');
    await onRefresh();
  }

  async function handleReset() {
    await crmApi.resetDemo();
    setMsg('Воронка восстановлена к исходным 6 сделкам');
    await onRefresh();
  }

  function exportCsv() {
    const header = ['Код', 'Задача', 'Клиент', 'Компания', 'Телефон', 'Источник', 'Менеджер', 'Бюджет', 'Этап'];
    const lines = deals.map((d) =>
      [d.code, d.title, d.clientName, d.company, d.phone, d.source, d.manager, d.budget, d.stage]
        .map((val) => `"${String(val || '').replace(/"/g, '""')}"`)
        .join(';')
    );
    const csv = '\uFEFF' + [header.join(';'), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `potok-crm-deals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!user) {
    return (
      <section className="container admin-wrap">
        <div className="admin-login">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="eyebrow" style={{ marginBottom: 0 }}>
              <Shield size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              Закрытый доступ
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onExit}>
              <ArrowLeft size={14} /> В воронку
            </button>
          </div>
          <h2 style={{ fontSize: '1.3rem' }}>Администрирование ПОТОК CRM</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Удаление сделок, выгрузка CSV для бухгалтерии и сброс базы.
          </p>
          <form onSubmit={handleLogin} className="form">
            <div className="field">
              <label>Email</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Пароль</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {authError && <div className="status-msg status-msg--err">{authError}</div>}
            <button type="submit" className="btn btn--primary" disabled={authLoading}>
              {authLoading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="container admin-wrap">
      <div className="admin-header">
        <div>
          <span className="eyebrow">Управление CRM</span>
          <h2 style={{ fontSize: '1.5rem' }}>База сделок и экспорт</h2>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--outline btn--sm" onClick={exportCsv}>
            <Download size={14} /> Выгрузить CSV
          </button>
          <button type="button" className="btn btn--outline btn--sm" onClick={handleReset}>
            <RotateCcw size={14} /> Сбросить демо-базу
          </button>
          <button type="button" className="btn btn--outline btn--sm" onClick={onExit}>
            <ArrowLeft size={14} /> К доске
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
            <LogOut size={14} /> Выйти
          </button>
        </div>
      </div>

      {msg && <div className="status-msg status-msg--ok" style={{ marginBottom: 14 }}>{msg}</div>}

      <div className="admin-list">
        {deals.map((d) => {
          const st = STAGES.find((s) => s.id === d.stage) || STAGES[0];
          return (
            <div key={d.id} className="admin-row">
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <strong className="mono">{d.code}</strong>
                  <span className={`status-pill ${st.cls}`}>{st.label}</span>
                </div>
                <div style={{ fontWeight: 500, marginTop: 4 }}>{d.title}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {d.clientName} ({d.phone}) &bull; {d.source} &bull; {d.manager}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <strong className="mono">{formatRub(d.budget)}</strong>
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  onClick={() => handleDelete(d.id)}
                  aria-label={`Удалить ${d.code}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
