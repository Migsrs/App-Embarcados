import { FormEvent, useMemo, useState } from 'react';
import { Save, Wifi } from 'lucide-react';
import { useAppState } from '../state/appState';

export default function Config() {
  const { state, setConfig } = useAppState();
  const [form, setForm] = useState(state.config);
  const [testResult, setTestResult] = useState<string>('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setConfig(form);
    setTestResult('Configurações salvas. Reconectando...');
    window.setTimeout(() => setTestResult(''), 3000);
  };

  const wsUrl = useMemo(() => {
    const protocol = form.useTls ? 'wss' : 'ws';
    const path = form.path?.startsWith('/') ? form.path : `/${form.path}`;
    return `${protocol}://${form.host}:${form.wsPort}${path}`;
  }, [form.host, form.wsPort, form.path, form.useTls]);

  const mqttUrl = useMemo(() => {
    const protocol = form.useTls ? 'mqtts' : 'mqtt';
    return `${protocol}://${form.host}:${form.port}`;
  }, [form.host, form.port, form.useTls]);

  const testConnection = () => {
    setTestResult('Verificando conexão...');
    window.setTimeout(() => {
      setTestResult(`Status atual: ${state.connection}`);
    }, 400);
  };

  return (
    <section className="panel">
      <div className="card-header">
        <div>
          <h2>Configurações</h2>
          <p>Broker MQTT, tópicos e PIN de segurança para desarmar e bypass.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <label>
            Broker Host
            <input
              value={form.host}
              onChange={(e) => setForm({ ...form, host: e.target.value })}
              placeholder="host.hivemq.cloud"
            />
          </label>
          <label>
            Porta TLS MQTT
            <input
              type="number"
              value={form.port}
              onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
              placeholder="8883"
            />
          </label>
          <label>
            Porta TLS WebSocket
            <input
              type="number"
              value={form.wsPort}
              onChange={(e) => setForm({ ...form, wsPort: Number(e.target.value) })}
              placeholder="8884"
            />
          </label>
          <label>
            Path WebSocket
            <input
              value={form.path}
              onChange={(e) => setForm({ ...form, path: e.target.value })}
              placeholder="/mqtt"
            />
          </label>
          <label>
            Usar TLS
            <select
              value={form.useTls ? 'true' : 'false'}
              onChange={(e) => setForm({ ...form, useTls: e.target.value === 'true' })}
            >
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </label>
          <label>
            Client ID
            <input
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              placeholder="alarme-web-client"
            />
          </label>
          <label>
            Usuário MQTT
            <input
              value={form.username}
              placeholder="usuario"
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </label>
          <label>
            Senha MQTT
            <input
              type="password"
              value={form.password}
              placeholder="senha"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </label>
          <label>
            Prefixo de tópico
            <input
              value={form.prefix}
              onChange={(e) => setForm({ ...form, prefix: e.target.value })}
              placeholder="casa/alarme"
            />
          </label>
          <label>
            PIN de segurança
            <input
              type="password"
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
              placeholder="••••"
            />
          </label>
        </div>

        <div className="config-footer">
          <div className="button-group">
            <button type="submit" className="primary">
              <Save size={15} aria-hidden="true" /> Salvar
            </button>
            <button type="button" className="secondary" onClick={testConnection}>
              <Wifi size={15} aria-hidden="true" /> Testar conexão
            </button>
          </div>
          <div className="url-preview">
            <p>
              <span className="url-label">MQTT:</span>{' '}
              <code>{mqttUrl}</code>
            </p>
            <p>
              <span className="url-label">WebSocket:</span>{' '}
              <code>{wsUrl}</code>
            </p>
          </div>
          {testResult && <p className="test-result">{testResult}</p>}
        </div>
      </form>
    </section>
  );
}
