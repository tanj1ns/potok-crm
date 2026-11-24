import React, { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, Plus, X } from 'lucide-react';
import { LEAD_SOURCES, MANAGERS, STAGES, formatPhone, formatRub } from '../api';

export default function DealModal({ deal, onClose, onStageChange, onAddNote, onCreateDeal, onOpenPrivacy }) {
  const [noteText, setNoteText] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('Сайт');
  const [manager, setManager] = useState('Анна К.');
  const [budget, setBudget] = useState('120000');
  const [initialNote, setInitialNote] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const openedAt = useRef(Date.now());

  useEffect(() => {
    openedAt.current = Date.now();
  }, [deal]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleNoteSubmit(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setNoteBusy(true);
    setErr('');
    try {
      await onAddNote(deal.id, noteText);
      setNoteText('');
    } catch (error) {
      setErr(error.message);
    } finally {
      setNoteBusy(false);
    }
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    setErr('');
    if (Date.now() - openedAt.current < 1200) {
      setErr('Слишком быстрая отправка формы. Проверьте данные и повторите.');
      return;
    }
    setBusy(true);
    try {
      await onCreateDeal({
        title,
        clientName,
        company,
        phone,
        source,
        manager,
        budget: Number(budget),
        note: initialNote,
        consent,
        website: honeypot
      });
      onClose();
    } catch (error) {
      setErr(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-label={deal ? deal.title : 'Новая заявка'}>
        <div className="modal-head">
          <div>
            <span className="eyebrow" style={{ marginBottom: 2 }}>
              {deal ? deal.code : 'Новая сделка'}
            </span>
            <h3 style={{ fontSize: '1.12rem' }}>{deal ? deal.title : 'Добавить заявку в воронку'}</h3>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>

        {deal ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="deal-meta-grid">
              <div>
                <span>Клиент</span>
                <strong>{deal.clientName}{deal.company ? ` · ${deal.company}` : ''}</strong>
              </div>
              <div>
                <span>Телефон</span>
                <strong className="mono">{deal.phone}</strong>
              </div>
              <div>
                <span>Бюджет</span>
                <strong className="mono">{formatRub(deal.budget)}</strong>
              </div>
              <div>
                <span>Канал и ответственный</span>
                <strong>{deal.source} · {deal.manager}</strong>
              </div>
            </div>

            <div className="field">
              <label>Этап воронки</label>
              <div className="tabs">
                {STAGES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className={`tab ${deal.stage === st.id ? 'is-active' : ''}`}
                    onClick={() => onStageChange(deal.id, st.id)}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="notes-section">
              <strong style={{ fontSize: '0.88rem' }}>История заметок ({(deal.notes || []).length})</strong>
              <div className="notes-list">
                {(deal.notes || []).length === 0 ? (
                  <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>Заметок пока нет</span>
                ) : (
                  deal.notes.map((n) => (
                    <div key={n.id} className="note-item">
                      <p>{n.text}</p>
                      <span className="mono">{new Date(n.at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleNoteSubmit} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  className="input"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Добавить комментарий по созвону или оплате..."
                />
                <button type="submit" className="btn btn--primary btn--sm" disabled={noteBusy}>
                  <MessageSquarePlus size={15} />
                </button>
              </form>
            </div>
            {err && <div className="status-msg status-msg--err">{err}</div>}
          </div>
        ) : (
          <form onSubmit={handleCreateSubmit} className="form">
            <div className="field">
              <label>Суть заявки / проекта</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Сайт и CRM для доставки"
                required
              />
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Имя клиента</label>
                <input
                  className="input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Виктор Смирнов"
                  required
                />
              </div>
              <div className="field">
                <label>Компания</label>
                <input
                  className="input"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="ООО «Вектор»"
                />
              </div>
              <div className="field">
                <label>Телефон</label>
                <input
                  className="input mono"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="+7 (999) 000-00-00"
                  required
                />
              </div>
              <div className="field">
                <label>Бюджет (₽)</label>
                <input
                  type="number"
                  className="input mono"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  min="0"
                  required
                />
              </div>
              <div className="field">
                <label>Источник</label>
                <select className="input" value={source} onChange={(e) => setSource(e.target.value)}>
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Менеджер</label>
                <select className="input" value={manager} onChange={(e) => setManager(e.target.value)}>
                  {MANAGERS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="field full">
                <label>Первичная заметка</label>
                <input
                  className="input"
                  value={initialNote}
                  onChange={(e) => setInitialNote(e.target.value)}
                  placeholder="Пожелания клиента или дедлайн"
                />
              </div>
            </div>

            <div className="hp-trap" aria-hidden="true">
              <label htmlFor="hp-crm-web">Ваш сайт</label>
              <input
                id="hp-crm-web"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <label className="consent-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Согласен с{' '}
                <button type="button" className="link-inline" onClick={onOpenPrivacy}>
                  обработкой персональных данных (152-ФЗ)
                </button>
              </span>
            </label>

            {err && <div className="status-msg status-msg--err">{err}</div>}

            <button type="submit" className="btn btn--primary" disabled={busy}>
              <Plus size={15} /> {busy ? 'Сохранение...' : 'Создать сделку'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
