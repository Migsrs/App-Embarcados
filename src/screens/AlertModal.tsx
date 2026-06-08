import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ShieldOff, XCircle } from 'lucide-react';
import { useAppState } from '../state/appState';
import { ZONES } from '../models/types';
import PinModal from '../widgets/PinModal';

export default function AlertModal({ visible }: { visible: boolean }) {
  const { state, sendDisarm, clearAlert, validatePin } = useAppState();
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const disarmBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!visible) return;
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    disarmBtnRef.current?.focus();
  }, [visible]);

  // Focus trap — Escape is blocked while alert is active to prevent accidental dismissal
  useEffect(() => {
    if (!visible || showPin) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        return;
      }
      if (e.key !== 'Tab') return;
      const first = disarmBtnRef.current;
      const last = closeBtnRef.current;
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible, showPin]);

  if (!visible) return null;

  const zones = ZONES.filter((_, idx) => state.alertZonas[idx]);

  const handleDisarm = () => {
    if (!state.pinValidated) {
      setPinError('');
      setShowPin(true);
    } else {
      sendDisarm();
      clearAlert();
    }
  };

  const handlePinConfirm = (pin: string) => {
    if (!validatePin(pin)) {
      setPinError('PIN incorreto. Tente novamente.');
      return;
    }
    setShowPin(false);
    sendDisarm();
    clearAlert();
  };

  return (
    <>
      <div
        className="modal-overlay alert-overlay"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-title"
        aria-describedby="alert-desc"
      >
        <div className="modal alert-modal">
          <div className="alert-pulse-ring" aria-hidden="true" />

          <div className="alert-header">
            <div className="alert-icon-wrap">
              <AlertTriangle size={34} aria-hidden="true" />
            </div>
            <div>
              <h2 id="alert-title">ALERTA DE INVASÃO</h2>
              <p id="alert-desc">
                A central está em <strong>DISPARANDO</strong>. Desarme imediatamente.
              </p>
            </div>
          </div>

          <div className="alert-zones">
            <h3>Zonas violadas</h3>
            {zones.length ? (
              <ul className="alert-zone-list">
                {zones.map((zone) => (
                  <li key={zone.id}>
                    <XCircle size={15} aria-hidden="true" />
                    <strong>{zone.code}</strong> — {zone.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nenhuma zona identificada</p>
            )}
          </div>

          <div className="button-group alert-actions">
            <button
              ref={disarmBtnRef}
              className="danger btn-lg btn-full"
              onClick={handleDisarm}
            >
              <ShieldOff size={19} aria-hidden="true" /> DESARMAR
            </button>
            <button
              ref={closeBtnRef}
              className="secondary"
              onClick={clearAlert}
              aria-label="Fechar alerta sem desarmar"
            >
              Fechar alerta
            </button>
          </div>
        </div>
      </div>

      {showPin && (
        <PinModal
          title="PIN para desarmar durante disparo"
          error={pinError}
          onConfirm={handlePinConfirm}
          onCancel={() => setShowPin(false)}
        />
      )}
    </>
  );
}
