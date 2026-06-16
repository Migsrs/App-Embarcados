#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>

// --- Bibliotecas Sinric Pro ---
#include <SinricPro.h>
#include <SinricProSwitch.h>

// ===================== CONFIG =====================
const char* WIFI_SSID     = "Galaxy A716727";
const char* WIFI_PASSWORD = "ozca4877";

// HiveMQ Cloud (TLS). Troque MQTT_HOST pelo SEU cluster URL.
const char* MQTT_HOST     = "1a5b3642296840498be5cb6c2548b390.s1.eu.hivemq.cloud";  // <-- seu cluster
const uint16_t MQTT_PORT  = 8883;                                // TLS
const char* MQTT_USER     = "Miguel";
const char* MQTT_PASSWORD = "142536Mb";
const char* MQTT_CLIENT_ID = "esp32-alarme-bridge";
const char* TOPIC_PREFIX  = "casa/alarme";

// ===================== CONFIG SINRIC PRO (VOZ) =====================
// Obtenha estas credenciais criando uma conta grátis em sinric.pro
#define APP_KEY           "dea22c44-a955-4177-8aa5-2f288ccee066"      
#define APP_SECRET        "a1fb84ff-12a8-4c4e-9774-6d2e9276f9bc-9ba4dbaf-044e-4d50-a9a9-bda4ad72df7a"   
#define SWITCH_ID         "6a31893a29c6be3342611b6c"    // Crie um "Switch" no painel

// Rele/luzes: NAO use GPIO2 (strapping/boot). Use GPIO23 (ou outro livre).
const int RELAY_PIN = 23;
const bool RELAY_ACTIVE_HIGH = true;

// UART para o FPGA (9600 8N1) nos pinos RX=16, TX=17
const int FPGA_RX = 16;
const int FPGA_TX = 17;
HardwareSerial FPGA(2);

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
unsigned long lastReconnectAttempt = 0;

// =================================================================
// FUNÇÕES MQTT 
// =================================================================
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  // Processamento de comandos vindos do MQTT (se houver)
}

void connectMqtt() {
  Serial.print("Conectando ao MQTT...");
  if (mqtt.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASSWORD)) {
    Serial.println(" OK!");
    String cmdTopic = String(TOPIC_PREFIX) + "/comando";
    mqtt.subscribe(cmdTopic.c_str());
  } else {
    Serial.print(" Falhou, rc=");
    Serial.println(mqtt.state());
  }
}

// =================================================================
// FUNÇÕES SINRIC PRO (Comando de Voz)
// =================================================================
bool onPowerState(const String &deviceId, bool &state) {
  Serial.printf("Comando de Voz Recebido! Estado solicitado: %s\n", state ? "LIGAR (Armar)" : "DESLIGAR (Desarmar)");
  
  if (state) {
    // Comando: "Alexa, liga o alarme"
    FPGA.write(0x41); // Envia 'A' (Armar) para a FPGA via UART
  } else {
    // Comando: "Alexa, desliga o alarme"
    FPGA.write(0x44); // Envia 'D' (Desarmar) para a FPGA via UART
  }
  
  return true; 
}

void setupSinricPro() {
  SinricProSwitch& mySwitch = SinricPro[SWITCH_ID];
  mySwitch.onPowerState(onPowerState);
  
  SinricPro.onConnected([](){ Serial.println("Conectado ao Sinric Pro (Voz Ativa)!"); });
  SinricPro.onDisconnected([](){ Serial.println("Desconectado do Sinric Pro."); });
  
  SinricPro.begin(APP_KEY, APP_SECRET);
}

// =================================================================
// SETUP & LOOP
// =================================================================
void setup() {
  Serial.begin(115200);
  
  // CORREÇÃO: Utilizando a variável FPGA em vez de fpgaSerial
  FPGA.begin(9600, SERIAL_8N1, FPGA_RX, FPGA_TX); 
  
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, !RELAY_ACTIVE_HIGH);

  Serial.print("Conectando Wi-Fi: ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.println("\nWi-Fi OK. IP: ");
  Serial.println(WiFi.localIP());
  
  mqtt.setBufferSize(1024);
  net.setCACert(ISRG_ROOT_X1); 
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqttMessage);
  
  setupSinricPro();
}

void loop() {
  SinricPro.handle();

  if (WiFi.status() != WL_CONNECTED) {
    delay(200);
    return;
  }

  if (!mqtt.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {   
      lastReconnectAttempt = now;
      connectMqtt();
    }
  } else {
    mqtt.loop();
  }

  // ---- Recebe frames do FPGA (0xAA estado zonas checksum) ----
  // CORREÇÃO: Utilizando a variável FPGA
  while (FPGA.available() >= 4) {
    if (FPGA.peek() != 0xAA) {
      FPGA.read();
      continue;
    }
    
    byte buf[4];
    FPGA.readBytes(buf, 4);
    
    byte st = buf[1];
    byte zn = buf[2];
    byte ck = buf[3];
    
    if (ck == (0xAA ^ st ^ zn)) {
      if ((st & 0x07) == 0b100) {
         digitalWrite(RELAY_PIN, RELAY_ACTIVE_HIGH);
         FPGA.write(0x55); // Envia ACK
         
         if (mqtt.connected()) {
             String topicAlarme = String(TOPIC_PREFIX) + "/alarme";
             mqtt.publish(topicAlarme.c_str(), "{\"alerta\":\"INTRUSAO DETECTADA\"}");
         }
      } else {
         digitalWrite(RELAY_PIN, !RELAY_ACTIVE_HIGH);
      }
    }
  }
}
