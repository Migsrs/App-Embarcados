export type AlarmStateCode = 0 | 1 | 2 | 3 | 4;

export interface AlarmStatus {
  estado: AlarmStateCode;
  armado: boolean;
  zonas_violadas: boolean[];
  zonas_ativas: boolean[];
  segundos: number;
  ts: number;
}

export interface LightState {
  ligada: boolean;
}

export interface MqttConfig {
  host: string;
  port: number;
  wsPort: number;
  path: string;
  useTls: boolean;
  clientId: string;
  username: string;
  password: string;
  prefix: string;
}

export interface AppConfig extends MqttConfig {
  pin: string;
}

export const ZONES = [
  { id: 1, code: 'Z1', name: 'Entrada', sensors: ['Reed', 'PIR'] },
  { id: 2, code: 'Z2', name: 'Sala', sensors: ['HC-SR04', 'IR'] },
  { id: 3, code: 'Z3', name: 'Cozinha', sensors: ['VL53L0X', 'PIR'] },
  { id: 4, code: 'Z4', name: 'Quarto', sensors: ['IR', 'Reed'] },
  { id: 5, code: 'Z5', name: 'Garagem', sensors: ['HC-SR04', 'VL53L0X'] },
];

export const stateLabels: Record<AlarmStateCode, { label: string; color: string }> = {
  0: { label: 'DESARMADO', color: 'gray' },
  1: { label: 'SAÍDA', color: 'yellow' },
  2: { label: 'ARMADO', color: 'green' },
  3: { label: 'ENTRADA', color: 'orange' },
  4: { label: 'DISPARANDO', color: 'red' },
};

export type AlarmEvent =
  | { tipo: 'luz'; valor: 'acesa' | 'apagada'; ts: number }
  | { tipo: 'deteccao'; zona: number; ts: number }
  | { tipo: 'estado'; de: AlarmStateCode; para: AlarmStateCode; ts: number }
  | { tipo: 'invasao'; zonas: boolean[]; ts: number }
  | { tipo: 'bypass'; zona: number; ativo: boolean; ts: number };
