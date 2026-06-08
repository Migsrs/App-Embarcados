import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel, onConfirm]);

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="modal modal-sm">
        <div className="modal-head">
          <div className={`modal-icon ${danger ? 'danger' : 'accent'}`}>
            <AlertTriangle size={20} aria-hidden="true" />
          </div>
          <h2 id="confirm-modal-title">{title}</h2>
        </div>
        <p className="modal-msg">{message}</p>
        <div className="button-group">
          <button className={danger ? 'danger' : 'primary'} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
          <button className="secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
