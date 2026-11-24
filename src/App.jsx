import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Kanban,
  Menu,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Sun,
  X
} from 'lucide-react';
import { LEAD_SOURCES, MANAGERS, STAGES, crmApi, formatRub, isSecretAdminHash } from './api';
import DealModal from './components/DealModal';
import PrivacyModal from './components/PrivacyModal';
import AdminCrm from './pages/AdminCrm';

export default function App() {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [deals, setDeals] = useState([]);
  const [user, setUser] = useState(null);
  const [isAdminRoute, setIsAdminRoute] = useState(false);

  const [view, setView] = useState('kanban');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [activeDealId, setActiveDealId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [draggedId, setDraggedId] = useState(null);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('potok_theme', next);
    } catch {}
  }

  async function refresh() {
    try {
      const res = await crmApi.bootstrap();
      setDeals(res.deals || []);
      setUser(res.user || null);
    } catch {}
  }

  useEffect(() => {
    refresh();
    async function syncHash() {
      const ok = await isSecretAdminHash(window.location.hash);
      setIsAdminRoute(ok);
    }
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const filteredDeals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return deals.filter((d) => {
      if (sourceFilter !== 'all' && d.source !== sourceFilter) return false;
      if (managerFilter !== 'all' && d.manager !== managerFilter) return false;
      if (q && !`${d.code} ${d.title} ${d.clientName} ${d.company}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [deals, sourceFilter, managerFilter, search]);

  const metrics = useMemo(() => {
    const paidSum = deals
      .filter((d) => d.stage === 'paid' || d.stage === 'done')
      .reduce((s, d) => s + Number(d.budget || 0), 0);
    const activeSum = deals
      .filter((d) => d.stage === 'new' || d.stage === 'in_progress')
      .reduce((s, d) => s + Number(d.budget || 0), 0);
    const paidCount = deals.filter((d) => d.stage === 'paid' || d.stage === 'done').length;
    const conversion = deals.length ? Math.round((paidCount / deals.length) * 100) : 0;
    const avgCheck = deals.length
      ? Math.round(deals.reduce((s, d) => s + Number(d.budget || 0), 0) / deals.length)
      : 0;
    return { paidSum, activeSum, conversion, avgCheck };
  }, [deals]);

  const activeDeal = useMemo(
    () => deals.find((d) => d.id === activeDealId) || null,
    [deals, activeDealId]
  );

  async function handleStageMove(dealId, nextStage) {
    try {
      const res = await crmApi.updateStage(dealId, nextStage);
      setDeals((prev) => prev.map((d) => (d.id === Number(dealId) ? res.deal : d)));
    } catch {}
  }

  function stepStage(deal, dir) {
    const idx = STAGES.findIndex((s) => s.id === deal.stage);
    const next = STAGES[idx + dir];
    if (next) handleStageMove(deal.id, next.id);
  }

  async function handleAddNote(dealId, text) {
    const res = await crmApi.addNote(dealId, text);
    setDeals((prev) => prev.map((d) => (d.id === Number(dealId) ? res.deal : d)));
  }

  async function handleCreateDeal(payload) {
    const res = await crmApi.createDeal(payload);
    setDeals((prev) => [res.deal, ...prev]);
  }

  const maxStageBudget = Math.max(
    1,
    ...STAGES.map((st) => deals.filter((d) => d.stage === st.id).reduce((s, d) => s + d.budget, 0))
  );
  const maxSourceCount = Math.max(
    1,
    ...LEAD_SOURCES.map((src) => deals.filter((d) => d.source === src).length)
  );

  return (
    <div className="app-shell">
      <header className="header">
        <div className="container header__inner">
          <a
            href="#board"
            className="brand"
            onClick={(e) => {
              e.preventDefault();
              if (isAdminRoute) {
                window.location.hash = '';
                setIsAdminRoute(false);
              }
            }}
          >
            <span className="brand__icon">
              <Kanban size={17} />
            </span>
            <span>ПОТОК CRM</span>
          </a>

          {!isAdminRoute && (
            <nav className={`nav ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Разделы CRM">
              <button
                type="button"
                className={`nav__link ${view === 'kanban' ? 'is-active' : ''}`}
                onClick={() => {
                  setView('kanban');
                  setMobileMenuOpen(false);
                }}
              >
                <Kanban size={15} /> Воронка сделок
              </button>
              <button
                type="button"
                className={`nav__link ${view === 'analytics' ? 'is-active' : ''}`}
                onClick={() => {
                  setView('analytics');
                  setMobileMenuOpen(false);
                }}
              >
                <BarChart3 size={15} /> Аналитика
              </button>
            </nav>
          )}

          <div className="header__right">
            {!isAdminRoute && (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setCreateOpen(true)}>
                <Plus size={15} /> Новая заявка
              </button>
            )}
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Переключить тему">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {!isAdminRoute && (
              <button
                type="button"
                className="icon-btn mobile-menu-btn"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-label="Меню"
              >
                {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
              </button>
            )}
          </div>
        </div>
      </header>

      {isAdminRoute ? (
        <AdminCrm
          user={user}
          deals={deals}
          onUserChange={setUser}
          onRefresh={refresh}
          onExit={() => {
            window.location.hash = '';
            setIsAdminRoute(false);
          }}
        />
      ) : (
        <main className="container workspace">
          <div className="kpi-grid">
            <div className="kpi-card">
              <span>Оплачено и завершено</span>
              <strong className="mono">{formatRub(metrics.paidSum)}</strong>
            </div>
            <div className="kpi-card">
              <span>В активной воронке</span>
              <strong className="mono">{formatRub(metrics.activeSum)}</strong>
            </div>
            <div className="kpi-card">
              <span>Конверсия в оплату</span>
              <strong className="mono">{metrics.conversion}%</strong>
            </div>
            <div className="kpi-card">
              <span>Средний чек</span>
              <strong className="mono">{formatRub(metrics.avgCheck)}</strong>
            </div>
          </div>

          {view === 'kanban' ? (
            <>
              <div className="toolbar">
                <div className="search-wrap">
                  <Search size={15} />
                  <input
                    type="search"
                    className="search-input"
                    placeholder="Поиск по клиенту, компании или DL-коду..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <select className="input select-sm" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} aria-label="Источник">
                    <option value="all">Все источники</option>
                    {LEAD_SOURCES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select className="input select-sm" value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} aria-label="Менеджер">
                    <option value="all">Все менеджеры</option>
                    {MANAGERS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="kanban-board">
                {STAGES.map((stage, sIdx) => {
                  const colDeals = filteredDeals.filter((d) => d.stage === stage.id);
                  const colBudget = colDeals.reduce((sum, d) => sum + Number(d.budget || 0), 0);

                  return (
                    <section
                      key={stage.id}
                      className="kanban-col"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedId) {
                          handleStageMove(draggedId, stage.id);
                          setDraggedId(null);
                        }
                      }}
                    >
                      <div className="kanban-col__head">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`status-pill ${stage.cls}`}>{stage.label}</span>
                          <span className="mono col-count">{colDeals.length}</span>
                        </div>
                        <span className="mono col-sum">{formatRub(colBudget)}</span>
                      </div>

                      <div className="kanban-cards">
                        {colDeals.map((deal) => (
                          <article
                            key={deal.id}
                            className="deal-card"
                            draggable
                            onDragStart={() => setDraggedId(deal.id)}
                          >
                            <div className="deal-card__top" onClick={() => setActiveDealId(deal.id)}>
                              <span className="mono deal-code">{deal.code}</span>
                              <span className="deal-source">{deal.source}</span>
                            </div>
                            <h3 className="deal-card__title" onClick={() => setActiveDealId(deal.id)}>
                              {deal.title}
                            </h3>
                            <p className="deal-card__client">
                              {deal.clientName}{deal.company ? ` · ${deal.company}` : ''}
                            </p>
                            <div className="deal-card__foot">
                              <strong className="mono deal-budget">{formatRub(deal.budget)}</strong>
                              <span className="deal-notes mono">
                                <MessageSquare size={12} /> {(deal.notes || []).length}
                              </span>
                            </div>
                            <div className="deal-card__actions">
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{deal.manager}</span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  type="button"
                                  className="step-btn"
                                  disabled={sIdx === 0}
                                  onClick={() => stepStage(deal, -1)}
                                  aria-label="Предыдущий этап"
                                >
                                  <ArrowLeft size={13} />
                                </button>
                                <button
                                  type="button"
                                  className="step-btn"
                                  disabled={sIdx === STAGES.length - 1}
                                  onClick={() => stepStage(deal, 1)}
                                  aria-label="Следующий этап"
                                >
                                  <ArrowRight size={13} />
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="analytics-grid">
              <div className="panel">
                <span className="eyebrow">Воронка</span>
                <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Распределение бюджета по этапам</h2>
                <div className="bars-list">
                  {STAGES.map((st) => {
                    const list = deals.filter((d) => d.stage === st.id);
                    const sum = list.reduce((s, d) => s + Number(d.budget || 0), 0);
                    const pct = Math.round((sum / maxStageBudget) * 100);
                    return (
                      <div key={st.id} className="bar-item">
                        <div className="bar-head">
                          <span>{st.label} ({list.length})</span>
                          <strong className="mono">{formatRub(sum)}</strong>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="panel">
                <span className="eyebrow">Каналы лидогенерации</span>
                <h2 style={{ fontSize: '1.2rem', marginBottom: 16 }}>Количество заявок по источникам</h2>
                <div className="bars-list">
                  {LEAD_SOURCES.map((src) => {
                    const list = deals.filter((d) => d.source === src);
                    const sum = list.reduce((s, d) => s + Number(d.budget || 0), 0);
                    const pct = Math.round((list.length / maxSourceCount) * 100);
                    return (
                      <div key={src} className="bar-item">
                        <div className="bar-head">
                          <span>{src}</span>
                          <strong className="mono">{list.length} сд. &bull; {formatRub(sum)}</strong>
                        </div>
                        <div className="bar-track">
                          <div className="bar-fill bar-fill--alt" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {(activeDeal || createOpen) && (
        <DealModal
          deal={activeDeal}
          onClose={() => {
            setActiveDealId(null);
            setCreateOpen(false);
          }}
          onStageChange={handleStageMove}
          onAddNote={handleAddNote}
          onCreateDeal={handleCreateDeal}
          onOpenPrivacy={() => setPrivacyOpen(true)}
        />
      )}

      {privacyOpen && <PrivacyModal onClose={() => setPrivacyOpen(false)} />}

      <footer className="footer">
        <div className="container footer__inner">
          <span>&copy; 2026 ПОТОК CRM — Учёт сделок и воронки продаж</span>
          <span>React + Node.js + SQLite</span>
        </div>
      </footer>
    </div>
  );
}
