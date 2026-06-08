import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { AlarmEvent, AlarmStatus, AppConfig, LightState, MqttConfig } from '../models/types';
import { MqttBridge, ConnectionState } from '../services/mqttClient';
import { appendEvent, clearStoredEvents, loadEvents } from '../services/eventLog';

interface AppState {
  config: AppConfig;
  status: AlarmStatus;
  light: LightState;
  connection: ConnectionState;
  lastStatusAt: number | null;
  alertActive: boolean;
  alertZonas: boolean[];
  mqttBridge: MqttBridge | null;
  pinValidated: boolean;
  events: AlarmEvent[];
}

const initialStatus: AlarmStatus = {
  estado: 0,
  armado: false,
  zonas_violadas: [false, false, false, false, false],
  zonas_ativas: [true, true, true, true, true],
  segundos: 0,
  ts: 0,
};

const defaultConfig: AppConfig = {
  host: 'ce42bc3ef863430ea5f1ea87d8b15069.s1.eu.hivemq.cloud',
  port: 8883,
  wsPort: 8884,
  path: '/mqtt',
  useTls: true,
  clientId: 'alarme-web-client',
  username: '',
  password: '',
  prefix: 'casa/alarme',
  pin: '1234',
};

type Action =
  | { type: 'setConfig'; config: AppConfig }
  | { type: 'setStatus'; status: AlarmStatus }
  | { type: 'setLight'; light: LightState }
  | { type: 'setConnection'; connection: ConnectionState }
  | { type: 'setAlert'; active: boolean; zonas: boolean[] }
  | { type: 'resetAlert' }
  | { type: 'setPinValidated'; validated: boolean }
  | { type: 'setEvents'; events: AlarmEvent[] };

const initialState: AppState = {
  config: defaultConfig,
  status: initialStatus,
  light: { ligada: false },
  connection: 'offline',
  lastStatusAt: null,
  alertActive: false,
  alertZonas: [false, false, false, false, false],
  mqttBridge: null,
  pinValidated: false,
  events: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setConfig':
      return { ...state, config: action.config };
    case 'setStatus':
      return { ...state, status: action.status, lastStatusAt: Date.now() };
    case 'setLight':
      return { ...state, light: action.light };
    case 'setConnection':
      return { ...state, connection: action.connection };
    case 'setAlert':
      return { ...state, alertActive: action.active, alertZonas: action.zonas };
    case 'resetAlert':
      return { ...state, alertActive: false, alertZonas: [false, false, false, false, false] };
    case 'setPinValidated':
      return { ...state, pinValidated: action.validated };
    case 'setEvents':
      return { ...state, events: action.events };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  setConfig: (config: AppConfig) => void;
  sendArmToggle: () => void;
  sendDisarm: () => void;
  sendBypass: (zona: number) => void;
  toggleLights: () => void;
  clearAlert: () => void;
  validatePin: (pin: string) => boolean;
  clearEventLog: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

function loadConfig(): AppConfig {
  try {
    const stored = window.localStorage.getItem('alarme_config');
    if (!stored) return defaultConfig;
    return { ...defaultConfig, ...JSON.parse(stored) };
  } catch {
    return defaultConfig;
  }
}

function saveConfig(config: AppConfig) {
  window.localStorage.setItem('alarme_config', JSON.stringify(config));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const bridgeRef = useRef<MqttBridge | null>(null);
  const lastStatusRef = useRef<number>(0);
  const eventsRef = useRef<AlarmEvent[]>([]);
  const prevStatusRef = useRef<AlarmStatus | null>(null);
  const prevLightRef = useRef<boolean | null>(null);

  // Load persisted config
  useEffect(() => {
    const config = loadConfig();
    dispatch({ type: 'setConfig', config });
  }, []);

  // Load persisted events
  useEffect(() => {
    const events = loadEvents();
    eventsRef.current = events;
    if (events.length > 0) {
      dispatch({ type: 'setEvents', events });
    }
  }, []);

  const addEventToLog = useCallback((event: AlarmEvent) => {
    eventsRef.current = appendEvent(eventsRef.current, event);
    dispatch({ type: 'setEvents', events: eventsRef.current });
  }, []);

  useEffect(() => {
    const reconnect = (config: AppConfig) => {
      bridgeRef.current?.disconnect();

      // Reset diff refs so first message after reconnect doesn't generate spurious events
      prevStatusRef.current = null;
      prevLightRef.current = null;

      const bridge = new MqttBridge(config, {
        onStatus: (status) => {
          dispatch({ type: 'setStatus', status });

          const prev = prevStatusRef.current;
          const ts = status.ts ? status.ts * 1000 : Date.now();

          if (prev !== null) {
            // State machine transition
            if (prev.estado !== status.estado) {
              addEventToLog({ tipo: 'estado', de: prev.estado, para: status.estado, ts });
            }

            // Sensor detection: zone went from clear → violated
            status.zonas_violadas.forEach((violated, i) => {
              if (!prev.zonas_violadas[i] && violated) {
                addEventToLog({ tipo: 'deteccao', zona: i + 1, ts });
              }
            });

            // Bypass changes
            status.zonas_ativas.forEach((active, i) => {
              if (prev.zonas_ativas[i] !== active) {
                addEventToLog({ tipo: 'bypass', zona: i + 1, ativo: active, ts });
              }
            });
          }

          prevStatusRef.current = status;

          if (status.estado === 4) {
            dispatch({ type: 'setAlert', active: true, zonas: status.zonas_violadas });
            if (window.Notification && Notification.permission === 'granted') {
              new Notification('ALERTA DE INVASÃO', {
                body: `Zonas violadas: ${status.zonas_violadas
                  .map((v, idx) => (v ? idx + 1 : null))
                  .filter(Boolean)
                  .join(', ')}`,
              });
            }
            new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play().catch(() => undefined);
          }

          lastStatusRef.current = Date.now();
        },

        onAlert: (_evento, zonas) => {
          dispatch({ type: 'setAlert', active: true, zonas });
          addEventToLog({ tipo: 'invasao', zonas, ts: Date.now() });
        },

        onLightState: (light) => {
          dispatch({ type: 'setLight', light });
          if (prevLightRef.current !== null && prevLightRef.current !== light.ligada) {
            addEventToLog({
              tipo: 'luz',
              valor: light.ligada ? 'acesa' : 'apagada',
              ts: Date.now(),
            });
          }
          prevLightRef.current = light.ligada;
        },

        onConnectionState: (connection) => dispatch({ type: 'setConnection', connection }),
        onMessageError: (error) => console.warn('MQTT erro', error),
      });

      bridge.connect();
      bridgeRef.current = bridge;
      dispatch({ type: 'setPinValidated', validated: false });
    };

    if (state.config.host && state.config.wsPort && state.config.prefix) {
      reconnect(state.config);
    }
  }, [state.config, addEventToLog]);

  // Watchdog: mark as offline if central stops sending heartbeats
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!state.lastStatusAt) return;
      if (Date.now() - state.lastStatusAt > 5000 && state.connection === 'connected') {
        dispatch({ type: 'setConnection', connection: 'offline' });
      }
    }, 1200);
    return () => window.clearInterval(interval);
  }, [state.lastStatusAt, state.connection]);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  const setConfig = useCallback((config: AppConfig) => {
    saveConfig(config);
    dispatch({ type: 'setConfig', config });
  }, []);

  const sendArmToggle = useCallback(() => {
    bridgeRef.current?.sendCommand('armar');
  }, []);

  const sendDisarm = useCallback(() => {
    bridgeRef.current?.sendCommand('desarmar');
    dispatch({ type: 'setPinValidated', validated: false });
  }, []);

  const sendBypass = useCallback((zona: number) => {
    bridgeRef.current?.sendCommand('bypass', zona);
  }, []);

  const toggleLights = useCallback(() => {
    const action = state.light.ligada ? 'apagar' : 'acender';
    bridgeRef.current?.sendLightAction(action);
    dispatch({ type: 'setLight', light: { ligada: !state.light.ligada } });
  }, [state.light.ligada]);

  const clearAlert = useCallback(() => {
    dispatch({ type: 'resetAlert' });
  }, []);

  const validatePin = useCallback(
    (pin: string) => {
      const valid = pin === state.config.pin;
      dispatch({ type: 'setPinValidated', validated: valid });
      return valid;
    },
    [state.config.pin],
  );

  const clearEventLog = useCallback(() => {
    clearStoredEvents();
    eventsRef.current = [];
    dispatch({ type: 'setEvents', events: [] });
  }, []);

  const value = useMemo(
    () => ({
      state,
      setConfig,
      sendArmToggle,
      sendDisarm,
      sendBypass,
      toggleLights,
      clearAlert,
      validatePin,
      clearEventLog,
    }),
    [state, setConfig, sendArmToggle, sendDisarm, sendBypass, toggleLights, clearAlert, validatePin, clearEventLog],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppState must be used within AppProvider');
  return context;
}
