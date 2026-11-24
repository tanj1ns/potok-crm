import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function PrivacyModal({ onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 520 }} role="dialog" aria-modal="true" aria-label="Политика конфиденциальности">
        <div className="modal-head">
          <h3 style={{ fontSize: '1.06rem' }}>Согласие на обработку данных (152-ФЗ)</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Создавая карточку заявки в «ПОТОК CRM», вы подтверждаете правомерность обработки контактных данных клиента (имя, компания, телефон) для ведения сделки, расчёта сметы и обратной связи по проекту.
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Данные обрабатываются в контуре компании и не передаются третьим лицам без основания, предусмотренного законодательством РФ.
        </p>
      </div>
    </div>
  );
}
