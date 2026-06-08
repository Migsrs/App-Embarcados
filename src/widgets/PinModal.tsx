import { useEffect, useRef, useState } from 'react';
import { KeyRound, X } from 'lucide-react';

interface Props {
  title: string;
  error?: string;
  onConfirm: (pin: string) => void;
  onCancel: () => void;
}

export default function PinModal({ title, error, onConfirm, onCancel }: Props) {
  const [pin, setPin] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const submit = () => {
    if (pin) onConfirm(pin);
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="modal modal-sm">
        <div className="modal-head">
          <div className="modal-icon accent">
            <KeyRound size={20} aria-hidden="true" />
          </div>
          <h2 id="pin-modal-title">{title}</h2>
          <button className="icon-btn" onClick={onCancel} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </div>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          placeholder="• • • •"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          className="pin-input"
          aria-label="PIN de segurança"
          aria-describedby={error ? 'pin-error' : undefined}
        />
        {error && (
          <p id="pin-error" className="input-error" role="alert">
            {error}
          </p>
        )}
        <div className="button-group">
          <button className="primary" onClick={submit} disabled={!pin}>
            Confirmar
          </button>
          <button className="secondary" onClick={onCancel}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
