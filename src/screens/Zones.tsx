import { useState } from 'react';
import {
  DoorOpen,
  Tv2,
  UtensilsCrossed,
  Bed,
  Car,
  CheckCircle2,
  XCircle,
  MinusCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAppState } from '../state/appState';
import { ZONES } from '../models/types';
import PinModal from '../widgets/PinModal';
import ConfirmModal from '../widgets/ConfirmModal';

const ZONE_ICONS: LucideIcon[] = [DoorOpen, Tv2, UtensilsCrossed, Bed, Car];

type ZoneFlow = { zone: number; step: 'pin' | 'confirm' } | null;

export default function Zones() {
  const { state, sendBypass, validatePin } = useAppState();
  const [flow, setFlow] = useState<ZoneFlow>(null);
  const [pinError, setPinError] = useState('');

  const handleBypassClick = (zoneId: number) => {
    setPinError('');
    setFlow({ zone: zoneId, step: 'pin' });
  };

  const handlePinConfirm = (pin: string) => {
    if (!validatePin(pin)) {
      setPinError('PIN incorreto. Tente novamente.');
      return;
    }
    if (flow) setFlow({ ...flow, step: 'confirm' });
  };

  const handleBypassConfirm = () => {
    if (flow) {
      sendBypass(flow.zone);
      setFlow(null);
    }
  };

  const flowZone = flow ? ZONES.find((z) => z.id === flow.zone) : null;
  const flowIsActive = flow ? state.status.zonas_ativas[flow.zone - 1] : false;

  return (
    <>
      <section className="panel">
        <div className="card-header">
          <div>
            <h2>Zonas</h2>
            <p>Monitore e gerencie o bypass de cada zona.</p>
          </div>
        </div>
        <div className="grid-5">
          {ZONES.map((zone) => {
            const violated = state.status.zonas_violadas[zone.id - 1];
            const active = state.status.zonas_ativas[zone.id - 1];
            const ZoneIcon = ZONE_ICONS[zone.id - 1];
            const stateKey = !active ? 'bypass' : violated ? 'violated' : 'normal';

            return (
              <article key={zone.id} className={`zone-card ${stateKey}`}>
                <div className="zone-icon-wrap">
                  <ZoneIcon size={22} aria-hidden="true" />
                </div>
                <div className="zone-info">
                  <strong className="zone-name">{zone.name}</strong>
                  <span className="zone-code">{zone.code}</span>
                </div>
                <div className={`zone-badge ${stateKey}`}>
                  {stateKey === 'bypass' && <MinusCircle size={13} aria-hidden="true" />}
                  {stateKey === 'violated' && <XCircle size={13} aria-hidden="true" />}
                  {stateKey === 'normal' && <CheckCircle2 size={13} aria-hidden="true" />}
                  {stateKey === 'bypass' ? 'Bypass' : stateKey === 'violated' ? 'Violada' : 'Normal'}
                </div>
                <div className="sensor-list">
                  {zone.sensors.map((sensor) => (
                    <span key={sensor} className="sensor-pill">
                      {sensor}
                    </span>
                  ))}
                </div>
                <div className="zone-bypass-row">
                  <span className="bypass-label">Bypass</span>
                  <button
                    className={`toggle-switch${!active ? ' on' : ''}`}
                    onClick={() => handleBypassClick(zone.id)}
                    aria-pressed={!active}
                    aria-label={`${active ? 'Ativar' : 'Remover'} bypass da zona ${zone.code}`}
                  >
                    <span className="toggle-thumb" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {flow?.step === 'pin' && (
        <PinModal
          title={`PIN para ${flowIsActive ? 'bypass' : 'remover bypass'} — ${flowZone?.code}`}
          error={pinError}
          onConfirm={handlePinConfirm}
          onCancel={() => setFlow(null)}
        />
      )}
      {flow?.step === 'confirm' && (
        <ConfirmModal
          title={flowIsActive ? 'Ativar bypass' : 'Remover bypass'}
          message={`Deseja ${flowIsActive ? 'colocar' : 'remover'} o bypass da zona ${flowZone?.code} — ${flowZone?.name}?`}
          confirmLabel={flowIsActive ? 'Colocar bypass' : 'Remover bypass'}
          onConfirm={handleBypassConfirm}
          onCancel={() => setFlow(null)}
        />
      )}
    </>
  );
}
