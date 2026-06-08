import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { useAppState } from '../state/appState';

export default function ConnectionBanner() {
  const { state } = useAppState();
  const isOnline = state.connection === 'connected';
  const isConnecting = state.connection === 'connecting';

  if (isOnline) {
    return (
      <div className="banner-minimal" role="status" aria-live="polite">
        <Wifi size={13} aria-hidden="true" />
        <span>{state.config.prefix}</span>
      </div>
    );
  }

  return (
    <div
      className={`alert-banner ${isConnecting ? 'warning' : 'offline'}`}
      role="status"
      aria-live="assertive"
    >
      <div className="banner-content">
        {isConnecting ? (
          <Loader2 size={17} className="spin" aria-hidden="true" />
        ) : (
          <WifiOff size={17} aria-hidden="true" />
        )}
        <div>
          <strong>
            {isConnecting ? 'Reconectando ao broker...' : 'Offline — verifique broker ou rede'}
          </strong>
          <p>Prefixo: {state.config.prefix}</p>
        </div>
      </div>
      <span className={`badge ${isConnecting ? 'warning' : 'offline'}`} aria-hidden="true">
        {state.connection}
      </span>
    </div>
  );
}
