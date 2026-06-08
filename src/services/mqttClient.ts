import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { AlarmStatus, LightState, MqttConfig } from '../models/types';

export type ConnectionState = 'offline' | 'connecting' | 'connected' | 'error';

export interface BrokerCallbacks {
  onStatus: (status: AlarmStatus) => void;
  onAlert: (evento: string, zonas: boolean[]) => void;
  onLightState: (light: LightState) => void;
  onConnectionState: (state: ConnectionState) => void;
  onMessageError?: (error: Error) => void;
}

export class MqttBridge {
  private client: MqttClient | null = null;
  private callbacks: BrokerCallbacks;
  private config: MqttConfig;

  constructor(config: MqttConfig, callbacks: BrokerCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  connect() {
    if (!this.config.host || !this.config.wsPort || !this.config.prefix) {
      this.callbacks.onConnectionState('offline');
      return;
    }

    this.callbacks.onConnectionState('connecting');

    const protocol = this.config.useTls ? 'wss' : 'ws';
    const path = this.config.path?.startsWith('/') ? this.config.path : `/${this.config.path}`;
    const brokerUrl = `${protocol}://${this.config.host}:${this.config.wsPort}${path}`;

    const options: IClientOptions = {
      clientId: this.config.clientId || `alarme-web-${Math.random().toString(16).slice(2)}`,
      username: this.config.username || undefined,
      password: this.config.password || undefined,
      reconnectPeriod: 2000,
      connectTimeout: 15_000,
      clean: false,
      keepalive: 30,
    };

    const client = mqtt.connect(brokerUrl, options);
    this.client = client;

    client.on('connect', () => {
      this.callbacks.onConnectionState('connected');
      this.subscribeTopics();
    });

    client.on('reconnect', () => {
      this.callbacks.onConnectionState('connecting');
    });

    client.on('close', () => {
      this.callbacks.onConnectionState('offline');
    });

    client.on('error', (error) => {
      this.callbacks.onConnectionState('error');
      if (this.callbacks.onMessageError) this.callbacks.onMessageError(error);
    });

    client.on('message', this.handleMessage.bind(this));
  }

  disconnect() {
    this.client?.end(true);
    this.client = null;
    this.callbacks.onConnectionState('offline');
  }

  private subscribeTopics() {
    if (!this.client) return;
    const prefix = this.config.prefix.replace(/\\/g, '/');
    const topics = [
      `${prefix}/status`,
      `${prefix}/alerta`,
      `${prefix}/luzes/estado`,
    ];
    this.client.subscribe(topics, { qos: 1 });
  }

  private handleMessage(topic: string, payload: Uint8Array) {
    try {
      const message = JSON.parse(new TextDecoder().decode(payload));
      const prefix = this.config.prefix.replace(/\\/g, '/');

      if (topic === `${prefix}/status`) {
        this.callbacks.onStatus(message as AlarmStatus);
      } else if (topic === `${prefix}/alerta`) {
        this.callbacks.onAlert((message as any).evento, (message as any).zonas || []);
      } else if (topic === `${prefix}/luzes/estado`) {
        this.callbacks.onLightState(message as LightState);
      }
    } catch (error) {
      if (this.callbacks.onMessageError) this.callbacks.onMessageError(error as Error);
    }
  }

  private publish(topic: string, payload: unknown) {
    if (!this.client || !this.client.connected) return;
    this.client.publish(topic, JSON.stringify(payload), { qos: 1, retain: topic.endsWith('/estado') }, (error) => {
      if (error && this.callbacks.onMessageError) this.callbacks.onMessageError(error);
    });
  }

  sendCommand(action: string, zona?: number) {
    const prefix = this.config.prefix.replace(/\\/g, '/');
    const payload: any = { acao: action };
    if (zona) payload.zona = zona;
    this.publish(`${prefix}/cmd`, payload);
  }

  sendLightAction(action: 'apagar' | 'acender' | 'toggle') {
    const prefix = this.config.prefix.replace(/\\/g, '/');
    this.publish(`${prefix}/luzes`, { acao: action });
  }
}
