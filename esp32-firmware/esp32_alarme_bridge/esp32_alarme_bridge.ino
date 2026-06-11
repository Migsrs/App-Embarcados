#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "MBSilva";
const char* WIFI_PASSWORD = "142536mbs";
const char* MQTT_HOST = "broker.local";
const uint16_t MQTT_PORT = 1883;
const char* MQTT_USER = "Miguel";
const char* MQTT_PASSWORD = "142536Mb";
const char* MQTT_CLIENT_ID = "esp32-alarme-bridge";
const char* TOPIC_PREFIX = "casa/alarme";

const int RELAY_PIN = 2;
const bool RELAY_ACTIVE_HIGH = true;

WiFiClient net;
PubSubClient mqtt(net);
HardwareSerial fpgaSerial(2);

bool zoneMask[5] = { true, true, true, true, true };
bool lastAlertPublished = false;

unsigned long lastStatusPublish = 0;

void publishStatus(int estado, uint8_t zonasVioladasMask) {
  bool zonasVioladas[5];
  for (int i = 0; i < 5; i++) {
    zonasVioladas[i] = (zonasVioladasMask >> i) & 0x1;
  }

  String json = "{";
  json += "\"estado\":" + String(estado) + ",";
  json += "\"armado\":" + String(estado != 0 ? "true" : "false") + ",";
  json += "\"zonas_violadas\":[";
  for (int i = 0; i < 5; i++) {
    json += zonasVioladas[i] ? "true" : "false";
    if (i < 4) json += ",";
  }
  json += "],";
  json += "\"zonas_ativas\":[";
  for (int i = 0; i < 5; i++) {
    json += zoneMask[i] ? "true" : "false";
    if (i < 4) json += ",";
  }
  json += "],";
  json += "\"segundos\":0,";
  json += "\"ts\":" + String(millis() / 1000);
  json += "}";

  String topic = String(TOPIC_PREFIX) + "/status";
  mqtt.publish(topic.c_str(), json.c_str(), true);

  if (estado == 4 && !lastAlertPublished) {
    publishAlert(zonasVioladas);
    lastAlertPublished = true;
  }
  if (estado != 4) {
    lastAlertPublished = false;
  }
}

void publishAlert(bool zonasVioladas[5]) {
  String json = "{";
  json += "\"evento\":\"invasao\",";
  json += "\"zonas\": [";
  for (int i = 0; i < 5; i++) {
    json += zonasVioladas[i] ? "true" : "false";
    if (i < 4) json += ",";
  }
  json += "],";
  json += "\"ts\":" + String(time(nullptr));
  json += "}";
  String topic = String(TOPIC_PREFIX) + "/alerta";
  mqtt.publish(topic.c_str(), json.c_str(), false);
}

void publishLightState() {
  String json = String("{\"ligada\":") + (digitalRead(RELAY_PIN) == (RELAY_ACTIVE_HIGH ? HIGH : LOW) ? "true" : "false") + "}";
  mqtt.publish((String(TOPIC_PREFIX) + "/luzes/estado").c_str(), json.c_str(), true);
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  if (String(topic).endsWith("/cmd")) {
    handleCommand(message);
  } else if (String(topic).endsWith("/luzes")) {
    handleLight(message);
  }
}

void handleCommand(const String& payload) {
  if (payload.indexOf("\"acao\":\"armar\"") >= 0) {
    fpgaSerial.write('A');
  } else if (payload.indexOf("\"acao\":\"desarmar\"") >= 0) {
    fpgaSerial.write('D');
    for (int i = 0; i < 5; i++) zoneMask[i] = true;
  } else if (payload.indexOf("\"acao\":\"bypass\"") >= 0) {
    int pos = payload.indexOf("\"zona\":");
    if (pos >= 0) {
      int zona = payload.substring(pos + 7).toInt();
      if (zona >= 1 && zona <= 5) {
        fpgaSerial.write('a' + (zona - 1));
        zoneMask[zona - 1] = !zoneMask[zona - 1];
      }
    }
  }
}

void handleLight(const String& payload) {
  if (payload.indexOf("\"acao\":\"apagar\"") >= 0) {
    digitalWrite(RELAY_PIN, RELAY_ACTIVE_HIGH ? LOW : HIGH);
  } else if (payload.indexOf("\"acao\":\"acender\"") >= 0) {
    digitalWrite(RELAY_PIN, RELAY_ACTIVE_HIGH ? HIGH : LOW);
  } else if (payload.indexOf("\"acao\":\"toggle\"") >= 0) {
    digitalWrite(RELAY_PIN, !digitalRead(RELAY_PIN));
  }
  publishLightState();
}

bool connectMqtt() {
  if (!mqtt.connected()) {
    if (mqtt.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASSWORD)) {
      mqtt.subscribe((String(TOPIC_PREFIX) + "/cmd").c_str(), 1);
      mqtt.subscribe((String(TOPIC_PREFIX) + "/luzes").c_str(), 1);
      publishLightState();
      return true;
    }
    return false;
  }
  return true;
}

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_HIGH ? LOW : HIGH);

  Serial.begin(115200);
  fpgaSerial.begin(9600, SERIAL_8N1, 16, 17);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);

  Serial.println("Iniciando ESP32 ponte MQTT <-> UART");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    delay(200);
    return;
  }

  if (!mqtt.connected()) {
    connectMqtt();
  }
  mqtt.loop();

  while (fpgaSerial.available() >= 4) {
    if (fpgaSerial.peek() != 0xAA) {
      fpgaSerial.read();
      continue;
    }

    byte buffer[4];
    fpgaSerial.readBytes(buffer, 4);
    if (buffer[0] != 0xAA) continue;

    byte estado = buffer[1];
    byte zonasMask = buffer[2];
    byte checksum = buffer[3];
    if ((0xAA ^ estado ^ zonasMask) != checksum) {
      continue;
    }

    fpgaSerial.write(0x55);
    if (millis() - lastStatusPublish > 500) {
      publishStatus(estado, zonasMask);
      lastStatusPublish = millis();
    }
  }

  if (millis() - lastStatusPublish > 1000) {
    // Publish current state at least once per second if FPGA heartbeat is not present
    publishLightState();
    lastStatusPublish = millis();
  }
}
