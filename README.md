# App de Controle da Central de Alarme Perimétrica

Este repositório contém:

- `src/`: aplicativo web React para controlar a central de alarme via MQTT.
- `esp32-firmware/`: firmware Arduino para ESP32 que realiza a ponte MQTT ⇄ UART e controla o relé das luzes.
- `mock/`: simulador de ESP32 para testar o app sem hardware.

## Visão geral

A comunicação segue o fluxo:

`[App web] <--MQTT/WSS--> [Broker MQTT] <--MQTT--> [ESP32] <--UART 9600 8N1--> [FPGA Basys 3]`

O app nunca fala direto com o FPGA. Ele envia comandos e recebe status através do broker MQTT.

## Zonas e Sensores

O perímetro é monitorado por 5 zonas, cada uma associada a um sensor diferente conectado à central FPGA (mínimo de 4 tipos de sensor exigido pelo projeto):

| Zona | Local             | Sensor                          |
| ---- | ----------------- | -------------------------------- |
| Z1   | Porta Principal    | Reed Switch                      |
| Z2   | Porta dos Fundos   | Reed Switch                      |
| Z3   | Corredor           | Sensor Laser de Obstáculo (IR direcional) |
| Z4   | Sala               | Sensor Laser de Proximidade (ToF) |
| Z5   | Garagem            | Sensor Ultrassônico (HC-SR04)    |

A FPGA envia o estado e o bitmask de zonas violadas (bit 0 = Z1 ... bit 4 = Z5) ao ESP32, que repassa via MQTT no tópico `status` (`zonas_violadas` e `zonas_ativas`).

## Funcionalidades implementadas

- Armar / desarmar a central
- Visualizar 5 zonas com estados Normal / Violada / Bypass
- Bypass individual por zona
- Controle de luzes por tópico MQTT separado
- Tela de configurações para broker, topics, usuário, senha e PIN
- Alertas de invasão em tempo real com modal, som e notificação do navegador
- Reconexão automática MQTT e indicador de offline
- Uso de status retained para trazer último estado ao abrir o app
- Simulador de ESP32 para testes locais

## Tópicos MQTT usados

Prefixo padrão: `casa/alarme`

### Status
`casa/alarme/status` (retained, QoS 1)

Exemplo:
```json
{
  "estado": 2,
  "armado": true,
  "zonas_violadas": [false, false, false, false, false],
  "zonas_ativas": [true, true, true, true, true],
  "segundos": 0,
  "ts": 1730000000
}
```

### Comando
`casa/alarme/cmd` (QoS 1)

Exemplos:
```json
{ "acao": "armar" }
{ "acao": "desarmar" }
{ "acao": "bypass", "zona": 3 }
```

### Alerta
`casa/alarme/alerta` (QoS 1)

Exemplo:
```json
{ "evento": "invasao", "zonas": [false, true, false, false, false], "ts": 1730000000 }
```

### Luzes
`casa/alarme/luzes` (QoS 1)

Exemplo:
```json
{ "acao": "apagar" }
```

Estado:
`casa/alarme/luzes/estado` (retained)

Exemplo:
```json
{ "ligada": false }
```

## Como usar o app

1. Instale dependências:
   ```bash
   npm install
   ```
2. Execute o app web:
   ```bash
   npm run dev
   ```
3. Configure o broker MQTT no menu Configurações usando os campos de host, porta TLS MQTT, porta TLS WebSocket e path do WebSocket.
4. Use a aba Painel e Zonas para controlar o sistema.

> Para o HiveMQ Cloud use os dados da tela de conexão:
> - Host: `ce42bc3ef863430ea5f1ea87d8b15069.s1.eu.hivemq.cloud`
> - Porta TLS MQTT: `8883`
> - Porta TLS WebSocket: `8884`
> - Path WebSocket: `/mqtt`

> O app gera automaticamente a URL `wss://...` e a URL `mqtts://...` a partir desses dados.

## Como rodar o simulador

1. Instale dependências no projeto:
   ```bash
   npm install
   ```
2. Execute o simulador:
   ```bash
   node mock/esp32-simulator.js
   ```
3. Configure o mesmo broker e prefixo no app.

## Firmware ESP32

O firmware em `esp32-firmware/esp32_alarme_bridge.ino` realiza:

- conexão Wi-Fi
- conexão MQTT com broker
- assinatura dos tópicos `casa/alarme/cmd` e `casa/alarme/luzes`
- tradução MQTT → UART para o FPGA
- leitura de quadros UART do FPGA e publicação de `status`
- envio rápido de ACK `0x55` ao FPGA
- comando de relé de luzes a partir de MQTT

### Ajustes necessários

- configure `WIFI_SSID` e `WIFI_PASSWORD`
- configure `MQTT_HOST`, `MQTT_PORT`, `MQTT_USER`, `MQTT_PASSWORD`
- ajuste o `RELAY_PIN` para o GPIO usado no relé de luzes
- ajuste `RELAY_ACTIVE_HIGH` conforme o circuito do relé

## Observação importante

O FPGA não controla iluminação. O comando de luzes é implementado no ESP32 e atua sobre um relé/MOSFET conectado ao circuito de iluminação.

## Estrutura do app

- `src/models/` — tipos e mapa fixo de zonas
- `src/services/mqttClient.ts` — camada MQTT isolada
- `src/state/appState.ts` — gerenciamento global de estado
- `src/screens/` — telas de Painel, Zonas, Configurações e Alerta
- `src/widgets/` — componentes reutilizáveis

## Nota

O app está implementado como web React, atendendo ao requisito de produto móvel/web. O comportamento principal do prompt — MQTT, zonas, armar/desarmar, bypass, alerta e controle de luzes — está incluído.
