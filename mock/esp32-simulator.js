import mqtt from 'mqtt';

const defaultBrokerUrl = 'wss://test.mosquitto.org:8081';
const prefix = process.env.MQTT_PREFIX || 'casa/alarme';
const host = process.env.MQTT_HOST;
const port = process.env.MQTT_PORT ? Number(process.env.MQTT_PORT) : undefined;
const wsPort = process.env.MQTT_WS_PORT ? Number(process.env.MQTT_WS_PORT) : undefined;
const path = process.env.MQTT_PATH || '/mqtt';
const useTls = process.env.MQTT_TLS?.toLowerCase() !== 'false';
const username = process.env.MQTT_USERNAME || process.env.MQTT_USER || undefined;
const password = process.env.MQTT_PASSWORD || undefined;

const brokerUrl = process.env.MQTT_URL || (() => {
  if (host && wsPort) {
    const protocol = useTls ? 'wss' : 'ws';
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${protocol}://${host}:${wsPort}${normalizedPath}`;
  }
  if (host && port) {
    const protocol = useTls ? 'mqtts' : 'mqtt';
    return `${protocol}://${host}:${port}`;
  }
  return defaultBrokerUrl;
})();

const clientId = `simulador-esp32-${Math.random().toString(16).slice(2)}`;
const connectOptions = {
  clientId,
  username,
  password,
  reconnectPeriod: 2000,
  clean: true,
};

const client = mqtt.connect(brokerUrl, connectOptions);

let estado = 0;
let segundos = 0;
let zonasAtivas = [true, true, true, true, true];
let zonasVioladas = [false, false, false, false, false];
let luzLigada = false;

function publishStatus() {
  const payload = {
    estado,
    armado: estado !== 0,
    zonas_violadas: zonasVioladas,
    zonas_ativas: zonasAtivas,
    segundos,
    ts: Math.floor(Date.now() / 1000),
  };
  client.publish(`${prefix}/status`, JSON.stringify(payload), { qos: 1, retain: true });
}

function publishLightState() {
  client.publish(`${prefix}/luzes/estado`, JSON.stringify({ ligada: luzLigada }), { qos: 1, retain: true });
}

function publishAlert() {
  client.publish(
    `${prefix}/alerta`,
    JSON.stringify({ evento: 'invasao', zonas: zonasVioladas, ts: Math.floor(Date.now() / 1000) }),
    { qos: 1 },
  );
}

client.on('connect', () => {
  console.log('Simulador ESP32 conectado ao broker', brokerUrl);
  client.subscribe([`${prefix}/cmd`, `${prefix}/luzes`], { qos: 1 }, (err) => {
    if (err) console.warn('Falha ao assinar tópicos', err);
  });
  publishStatus();
  publishLightState();
});

client.on('reconnect', () => {
  console.log('Simulador ESP32 tentando reconectar...');
});

client.on('error', (error) => {
  console.warn('Simulador ESP32 erro MQTT', error.message);
});

client.on('message', (topic, payload) => {
  try {
    const message = JSON.parse(payload.toString());
    console.log('Simulador ESP32 recebeu', topic, message);

    if (message.acao === 'armar') {
      if (estado === 0) {
        estado = 1;
        segundos = 10;
      }
    } else if (message.acao === 'desarmar') {
      estado = 0;
      segundos = 0;
      zonasVioladas = [false, false, false, false, false];
    } else if (message.acao === 'bypass' && typeof message.zona === 'number') {
      zonasAtivas = zonasAtivas.map((active, idx) => (idx === message.zona - 1 ? !active : active));
    } else if (message.acao === 'apagar') {
      luzLigada = false;
      publishLightState();
    } else if (message.acao === 'acender') {
      luzLigada = true;
      publishLightState();
    } else if (message.acao === 'toggle') {
      luzLigada = !luzLigada;
      publishLightState();
    }

    publishStatus();
  } catch (error) {
    console.warn('Falha ao processar mensagem', error);
  }
});

setInterval(() => {
  if (estado === 1) {
    segundos -= 1;
    if (segundos <= 0) {
      estado = 2;
      segundos = 0;
    }
  }
  if (estado === 2) {
    if (Math.random() < 0.08) {
      const index = Math.floor(Math.random() * 5);
      zonasVioladas[index] = true;
      estado = 3;
      segundos = 15;
    }
  }
  if (estado === 3) {
    segundos -= 1;
    if (segundos <= 0) {
      estado = 4;
      publishAlert();
    }
  }
  if (estado === 4) {
    // keep sending during disparo
  }
  publishStatus();
}, 1000);
