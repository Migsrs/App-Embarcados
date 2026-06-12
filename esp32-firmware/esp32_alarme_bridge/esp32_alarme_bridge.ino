#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// ===================== CONFIG =====================
const char* WIFI_SSID     = "Galaxy A716727";
const char* WIFI_PASSWORD = "ozca4877";

// HiveMQ Cloud (TLS). Troque MQTT_HOST pelo SEU cluster URL.
const char* MQTT_HOST     = "ce42bc3ef863430ea5f1ea87d8b15069.s1.eu.hivemq.cloud";  // <-- seu cluster
const uint16_t MQTT_PORT  = 8883;                                // TLS
const char* MQTT_USER     = "Miguel";
const char* MQTT_PASSWORD = "142536Mb";
const char* MQTT_CLIENT_ID = "esp32-alarme-bridge";
const char* TOPIC_PREFIX  = "casa/alarme";

// Rele/luzes: NAO use GPIO2 (strapping/boot). Use GPIO23 (ou outro livre).
const int RELAY_PIN = 23;
const bool RELAY_ACTIVE_HIGH = true;

// UART para o FPGA (9600 8N1) nos pinos RX=16, TX=17
const int FPGA_RX = 16;
const int FPGA_TX = 17;

// ===================== CERTIFICADO RAIZ (HiveMQ Cloud) =====================
// HiveMQ Cloud usa certificados Let's Encrypt -> raiz ISRG Root X1.
static const char* ISRG_ROOT_X1 = R"EOF(
-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----
)EOF";

WiFiClientSecure net;
PubSubClient mqtt(net);
HardwareSerial fpgaSerial(2);

bool zoneMask[5] = { true, true, true, true, true };
bool lastAlertPublished = false;
unsigned long lastStatusPublish = 0;
unsigned long lastReconnectAttempt = 0;

// ---- prototipos (evita erro de ordem de declaracao) ----
void publishAlert(bool zonasVioladas[5]);
void publishLightState();
void handleCommand(const String& payload);
void handleLight(const String& payload);

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
  json += "\"ts\":" + String(millis() / 1000);
  json += "}";
  String topic = String(TOPIC_PREFIX) + "/alerta";
  mqtt.publish(topic.c_str(), json.c_str(), false);
}

void publishLightState() {
  bool ligada = (digitalRead(RELAY_PIN) == (RELAY_ACTIVE_HIGH ? HIGH : LOW));
  String json = String("{\"ligada\":") + (ligada ? "true" : "false") + "}";
  mqtt.publish((String(TOPIC_PREFIX) + "/luzes/estado").c_str(), json.c_str(), true);
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) message += (char)payload[i];
  Serial.print("MQTT recebido [");
  Serial.print(topic);
  Serial.print("]: ");
  Serial.println(message);          // <-- mostra o que chegou

  String t = String(topic);
  if (t.endsWith("/cmd")) handleCommand(message);
  else if (t.endsWith("/luzes")) handleLight(message);
}

void handleCommand(const String& payload) {
  if (payload.indexOf("\"acao\":\"armar\"") >= 0) {
    fpgaSerial.write('A');
    Serial.println(">> Enviei 'A' (armar) para o FPGA");   // <-- confirma o envio na UART
  } else if (payload.indexOf("\"acao\":\"desarmar\"") >= 0) {
    fpgaSerial.write('D');
    for (int i = 0; i < 5; i++) zoneMask[i] = true;
    Serial.println(">> Enviei 'D' (desarmar) para o FPGA");
  } else if (payload.indexOf("\"acao\":\"bypass\"") >= 0) {
    int pos = payload.indexOf("\"zona\":");
    if (pos >= 0) {
      int zona = payload.substring(pos + 7).toInt();
      if (zona >= 1 && zona <= 5) {
        fpgaSerial.write('a' + (zona - 1));
        zoneMask[zona - 1] = !zoneMask[zona - 1];
        Serial.printf(">> Enviei bypass zona %d para o FPGA\n", zona);
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
  Serial.print("Conectando ao MQTT (HiveMQ TLS)... ");
  if (mqtt.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASSWORD)) {
    Serial.println("OK");
    mqtt.subscribe((String(TOPIC_PREFIX) + "/cmd").c_str(), 1);
    mqtt.subscribe((String(TOPIC_PREFIX) + "/luzes").c_str(), 1);
    publishLightState();
    return true;
  }
  Serial.print("FALHOU, rc=");
  Serial.println(mqtt.state());   // -2 = falha de conexao/TLS, 4/5 = auth
  return false;
}

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_HIGH ? LOW : HIGH);

  Serial.begin(115200);
  delay(200);
  fpgaSerial.begin(9600, SERIAL_8N1, FPGA_RX, FPGA_TX);

  Serial.println();
  Serial.println("Iniciando ESP32 ponte MQTT <-> UART");

  // Wi-Fi
  Serial.print("Conectando ao Wi-Fi ");
  Serial.print(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
// espera alguns segundos até time(nullptr) > ~1700000000
  Serial.println();
  Serial.print("Wi-Fi OK. IP: ");
  Serial.println(WiFi.localIP());
  mqtt.setBufferSize(1024);
  // TLS: valida o broker pelo certificado raiz
  net.setCACert(ISRG_ROOT_X1);

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    delay(200);
    return;
  }

  if (!mqtt.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {   // tenta a cada 5 s
      lastReconnectAttempt = now;
      connectMqtt();
    }
    return;
  }
  mqtt.loop();

  // ---- recebe frames do FPGA (0xAA estado zonas checksum) ----
  while (fpgaSerial.available() >= 4) {
    if (fpgaSerial.peek() != 0xAA) {
      fpgaSerial.read();
      continue;
    }
    byte buffer[4];
    fpgaSerial.readBytes(buffer, 4);
    if (buffer[0] != 0xAA) continue;

    byte estado    = buffer[1];
    byte zonasMask = buffer[2];
    byte checksum  = buffer[3];
    if ((byte)(0xAA ^ estado ^ zonasMask) != checksum) {
      continue;
    }

    fpgaSerial.write(0x55);   // ACK p/ watchdog do FPGA
    if (millis() - lastStatusPublish > 500) {
      publishStatus(estado, zonasMask);
      lastStatusPublish = millis();
    }
  }
}
