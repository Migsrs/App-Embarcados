import { useMemo, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Lightbulb,
  LightbulbOff,
  Wifi,
  WifiOff,
  Activity,
  Clock,
} from 'lucide-react';
import { useAppState } from '../state/appState';
import { AlarmStateCode, stateLabels, ZONES } from '../models/types';
import PinModal from '../widgets/PinModal';
import ConfirmModal from '../widgets/ConfirmModal';

const STATE_CONFIG: Record<AlarmStateCode, { icon: typeof Shield; cls: string }> = {
  0: { icon: ShieldOff, cls: 'gray' },
  1: { icon: ShieldAlert, cls: 'yellow' },
  2: { icon: ShieldCheck, cls: 'green' },
  3: { icon: ShieldAlert, cls: 'orange' },
  4: { icon: ShieldAlert, cls: 'red' },
};

type Step = 'idle' | 'pin' | 'confirm';

export default function Home() {
  const { state, sendArmToggle, sendDisarm, toggleLights, validatePin } = useAppState();
  const [step, setStep] = useState<Step>('idle');
  const [pinError, setPinError] = useState('');

  const activeZones = useMemo(
    () => state.status.zonas_ativas.filter(Boolean).length,
    [state.status.zonas_ativas],
  );
  const violatedZones = useMemo(
    () => state.status.zonas_violadas.filter(Boolean).length,
    [state.status.zonas_violadas],
  );

  const currentState = stateLabels[state.status.estado];
  const cfg = STATE_CONFIG[state.status.estado];
  const StateIcon = cfg.icon;
  const isDisarmed = state.status.estado === 0 || !state.status.armado;
  const isConnected = state.connection === 'connected';
  const watchdogOk = Date.now() - (state.lastStatusAt ?? 0) < 5000;

  const handleArmToggle = () => {
    if (isDisarmed) {
      sendArmToggle();
    } else {
      if (state.pinValidated) {
        setStep('confirm');
      } else {
        setPinError('');
        setStep('pin');
      }
    }
  };

  const handlePinConfirm = (pin: string) => {
    if (!validatePin(pin)) {
      setPinError('PIN incorreto. Tente novamente.');
      return;
    }
    setStep('confirm');
  };

  const handleDisarmConfirmed = () => {
    sendDisarm();
    setStep('idle');
  };

  return (
    <>
      <div className="grid-2">
        <section className="panel">
          <div className="state-hero">
            <div className={`state-icon-wrap ${cfg.cls}`}>
              <StateIcon size={34} aria-hidden="true" />
            </div>
            <div className="state-hero-text">
              <span className="state-label">Estado atual</span>
              <strong className={`state-value state-${cfg.cls}`} aria-live="polite">
                {currentState.label}
              </strong>
            </div>
            <span className={`status-pill ${cfg.cls}`} role="status">
              {currentState.label}
            </span>
          </div>

          {state.status.estado === 3 && (
            <div className="countdown-bar">
              <Clock size={15} aria-hidden="true" />
              <span>Contagem de entrada</span>
              <strong>{state.status.segundos} s</strong>
            </div>
          )}

          <div className="metrics-grid">
            <div className="metric-card">
              <div className={`metric-icon ${state.status.armado ? 'green' : 'gray'}`}>
                {state.status.armado ? <ShieldCheck size={18} /> : <ShieldOff size={18} />}
              </div>
              <span className="metric-label">Armamento</span>
              <strong className="metric-value">{state.status.armado ? 'Sim' : 'Não'}</strong>
            </div>
            <div className="metric-card">
              <div className="metric-icon accent">
                <Activity size={18} />
              </div>
              <span className="metric-label">Zonas ativas</span>
              <strong className="metric-value">
                {activeZones}
                <small>/5</small>
              </strong>
            </div>
            <div className={`metric-card${violatedZones > 0 ? ' metric-alert' : ''}`}>
              <div className={`metric-icon ${violatedZones > 0 ? 'red' : 'green'}`}>
                {violatedZones > 0 ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <span className="metric-label">Violadas</span>
              <strong className="metric-value">{violatedZones}</strong>
            </div>
            <div className="metric-card">
              <div className={`metric-icon ${state.light.ligada ? 'yellow' : 'gray'}`}>
                {state.light.ligada ? <Lightbulb size={18} /> : <LightbulbOff size={18} />}
              </div>
              <span className="metric-label">Luzes</span>
              <strong className="metric-value">{state.light.ligada ? 'Ligadas' : 'Apagadas'}</strong>
            </div>
          </div>

          <div className="button-group">
            {isDisarmed ? (
              <button className="primary btn-lg" onClick={handleArmToggle} disabled={!isConnected}>
                <Shield size={17} aria-hidden="true" /> Armar
              </button>
            ) : (
              <button className="danger btn-lg" onClick={handleArmToggle}>
                <ShieldOff size={17} aria-hidden="true" /> Desarmar
              </button>
            )}
            <button
              className="secondary btn-lg"
              onClick={toggleLights}
              disabled={!isConnected}
              aria-label={state.light.ligada ? 'Apagar luzes' : 'Acender luzes'}
            >
              {state.light.ligada ? <LightbulbOff size={17} /> : <Lightbulb size={17} />}
              {state.light.ligada ? 'Apagar luzes' : 'Acender luzes'}
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="card-header">
            <div>
              <h2>Resumo</h2>
              <p>Heartbeat e zonas em tempo real</p>
            </div>
          </div>

          <div className="summary-stats">
            <div className="summary-row">
              <div className={`summary-icon ${isConnected ? 'green' : 'red'}`}>
                {isConnected ? <Wifi size={17} /> : <WifiOff size={17} />}
              </div>
              <div>
                <span className="summary-label">Broker MQTT</span>
                <strong className={isConnected ? 'text-success' : 'text-danger'}>
                  {isConnected ? 'Conectado' : 'Offline'}
                </strong>
              </div>
            </div>
            <div className="summary-row">
              <div className={`summary-icon ${watchdogOk ? 'green' : 'orange'}`}>
                <Activity size={17} />
              </div>
              <div>
                <span className="summary-label">Watchdog central</span>
                <strong className={watchdogOk ? 'text-success' : 'text-warning'}>
                  {watchdogOk ? 'OK' : 'Sem comunicação'}
                </strong>
              </div>
            </div>
            <div className="summary-row">
              <div className="summary-icon gray">
                <Clock size={17} />
              </div>
              <div>
                <span className="summary-label">Último status</span>
                <strong>
                  {state.status.ts
                    ? new Date(state.status.ts * 1000).toLocaleTimeString()
                    : '—'}
                </strong>
              </div>
            </div>
          </div>

          <div className="section">
            <h3>Mini zonas</h3>
            <div className="mini-zones">
              {ZONES.map((zone) => {
                const violated = state.status.zonas_violadas[zone.id - 1];
                const active = state.status.zonas_ativas[zone.id - 1];
                const cls = !active ? 'bypass' : violated ? 'violated' : 'normal';
                return (
                  <div
                    key={zone.id}
                    className={`mini-zone ${cls}`}
                    title={`${zone.code} — ${zone.name}`}
                  >
                    <span className="mini-zone-code">{zone.code}</span>
                    <span className="mini-zone-state">
                      {!active ? (
                        <MinusCircle size={11} aria-label="Bypass" />
                      ) : violated ? (
                        <XCircle size={11} aria-label="Violada" />
                      ) : (
                        <CheckCircle2 size={11} aria-label="Normal" />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {step === 'pin' && (
        <PinModal
          title="PIN para desarmar"
          error={pinError}
          onConfirm={handlePinConfirm}
          onCancel={() => setStep('idle')}
        />
      )}
      {step === 'confirm' && (
        <ConfirmModal
          title="Desarmar central"
          message="Deseja realmente desarmar a central de alarme?"
          confirmLabel="Desarmar"
          danger
          onConfirm={handleDisarmConfirmed}
          onCancel={() => setStep('idle')}
        />
      )}
    </>
  );
}
