import { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  Clock,
  Lightbulb,
  LightbulbOff,
  MinusCircle,
  Shield,
  Trash2,
  Zap,
} from 'lucide-react';
import { useAppState } from '../state/appState';
import { AlarmEvent, ZONES, stateLabels } from '../models/types';
import { useTheme } from '../hooks/useTheme';
import ConfirmModal from '../widgets/ConfirmModal';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: 'today' as const, label: 'Hoje' },
  { value: '7d' as const, label: '7 dias' },
  { value: '30d' as const, label: '30 dias' },
  { value: 'all' as const, label: 'Tudo' },
];

type Period = (typeof PERIODS)[number]['value'];

function formatDuration(ms: number): string {
  if (ms <= 0) return '0 min';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(ms / 1000)}s`;
}

function formatEventTs(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  return (
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

function describeEvent(event: AlarmEvent): string {
  switch (event.tipo) {
    case 'luz':
      return event.valor === 'acesa' ? 'Luz acesa' : 'Luz apagada';
    case 'deteccao': {
      const zone = ZONES.find((z) => z.id === event.zona);
      return zone ? `${zone.name} — sensor detectou movimento` : `Zona ${event.zona} — movimento detectado`;
    }
    case 'estado': {
      const de = stateLabels[event.de]?.label ?? `Estado ${event.de}`;
      const para = stateLabels[event.para]?.label ?? `Estado ${event.para}`;
      return `Central: ${de} → ${para}`;
    }
    case 'invasao': {
      const n = event.zonas.filter(Boolean).length;
      return `Alerta de invasão — ${n} zona${n !== 1 ? 's' : ''} violada${n !== 1 ? 's' : ''}`;
    }
    case 'bypass': {
      const zone = ZONES.find((z) => z.id === event.zona);
      const name = zone?.name ?? `Zona ${event.zona}`;
      return `${name} — bypass ${event.ativo ? 'removido' : 'ativado'}`;
    }
  }
}

function eventColorClass(tipo: AlarmEvent['tipo']): string {
  switch (tipo) {
    case 'luz': return 'yellow';
    case 'deteccao': return 'orange';
    case 'estado': return 'accent';
    case 'invasao': return 'red';
    case 'bypass': return 'gray';
  }
}

function EventIcon({ tipo }: { tipo: AlarmEvent['tipo'] }) {
  switch (tipo) {
    case 'luz': return <Lightbulb size={15} />;
    case 'deteccao': return <Zap size={15} />;
    case 'estado': return <Shield size={15} />;
    case 'invasao': return <AlertTriangle size={15} />;
    case 'bypass': return <MinusCircle size={15} />;
  }
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SummaryCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  colorClass: string;
}

function SummaryCard({ icon, label, value, colorClass }: SummaryCardProps) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${colorClass}`}>{icon}</div>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <BarChart2 size={48} />
      <h3>Nenhum evento registrado</h3>
      <p>Os eventos MQTT aparecerão aqui assim que forem detectados.</p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { state, clearEventLog } = useAppState();
  const { theme } = useTheme();
  const [period, setPeriod] = useState<Period>('7d');
  const [showClear, setShowClear] = useState(false);

  const chartColors = useMemo(
    () => ({
      accent: theme === 'dark' ? '#14b8a6' : '#0d9488',
      accent2: theme === 'dark' ? '#818cf8' : '#6366f1',
      border: theme === 'dark' ? '#334155' : '#e2e8f0',
      text: theme === 'dark' ? '#94a3b8' : '#6b7280',
      surface: theme === 'dark' ? '#1e293b' : '#ffffff',
      danger: theme === 'dark' ? '#f87171' : '#ef4444',
      warning: theme === 'dark' ? '#fbbf24' : '#f59e0b',
    }),
    [theme],
  );

  const periodStart = useMemo(() => {
    const now = Date.now();
    if (period === 'today') {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    if (period === '7d') return now - 7 * 86_400_000;
    if (period === '30d') return now - 30 * 86_400_000;
    return 0;
  }, [period]);

  const filteredEvents = useMemo(
    () => state.events.filter((e) => e.ts >= periodStart),
    [state.events, periodStart],
  );

  // ── Summary metrics ────────────────────────────────────────────────────────

  const detectionCount = useMemo(
    () => filteredEvents.filter((e) => e.tipo === 'deteccao').length,
    [filteredEvents],
  );

  const alarmCount = useMemo(
    () => filteredEvents.filter((e) => e.tipo === 'invasao').length,
    [filteredEvents],
  );

  const lightToggles = useMemo(
    () => filteredEvents.filter((e) => e.tipo === 'luz').length,
    [filteredEvents],
  );

  const lightOnTimeMs = useMemo(() => {
    const allLight = state.events
      .filter((e): e is Extract<AlarmEvent, { tipo: 'luz' }> => e.tipo === 'luz')
      .sort((a, b) => a.ts - b.ts);

    const lastBefore = [...allLight].reverse().find((e) => e.ts < periodStart);
    let isOn = lastBefore ? lastBefore.valor === 'acesa' : false;
    let onSince = isOn ? periodStart : null;
    let total = 0;

    for (const event of allLight.filter((e) => e.ts >= periodStart)) {
      if (event.valor === 'acesa' && !isOn) {
        onSince = event.ts;
        isOn = true;
      } else if (event.valor === 'apagada' && isOn && onSince !== null) {
        total += event.ts - onSince;
        isOn = false;
        onSince = null;
      }
    }

    if (isOn && onSince !== null) total += Date.now() - onSince;
    return total;
  }, [state.events, periodStart]);

  // ── Chart data ─────────────────────────────────────────────────────────────

  const lightTimeline = useMemo(() => {
    const allLight = state.events
      .filter((e): e is Extract<AlarmEvent, { tipo: 'luz' }> => e.tipo === 'luz')
      .sort((a, b) => a.ts - b.ts);

    const lastBefore = [...allLight].reverse().find((e) => e.ts < periodStart);
    let currentOn = lastBefore ? (lastBefore.valor === 'acesa' ? 1 : 0) : 0;

    const points: { ts: number; on: number }[] = [{ ts: periodStart, on: currentOn }];
    for (const event of allLight.filter((e) => e.ts >= periodStart)) {
      currentOn = event.valor === 'acesa' ? 1 : 0;
      points.push({ ts: event.ts, on: currentOn });
    }
    points.push({ ts: Date.now(), on: currentOn });
    return points;
  }, [state.events, periodStart]);

  const detectionsByZone = useMemo(
    () =>
      ZONES.map((zone) => ({
        name: zone.code,
        label: zone.name,
        count: filteredEvents.filter((e) => e.tipo === 'deteccao' && e.zona === zone.id).length,
      })),
    [filteredEvents],
  );

  const activityBuckets = useMemo(() => {
    if (period === 'today') {
      const hours = Array.from({ length: 24 }, (_, h) => ({ label: `${h}h`, count: 0 }));
      for (const e of filteredEvents) {
        if (e.tipo === 'deteccao' || e.tipo === 'invasao') {
          hours[new Date(e.ts).getHours()].count++;
        }
      }
      return hours;
    }
    const days = period === '7d' ? 7 : 30;
    const now = Date.now();
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(now - (days - 1 - i) * 86_400_000);
      d.setHours(0, 0, 0, 0);
      const end = d.getTime() + 86_400_000;
      return {
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        count: filteredEvents.filter(
          (e) => (e.tipo === 'deteccao' || e.tipo === 'invasao') && e.ts >= d.getTime() && e.ts < end,
        ).length,
      };
    });
  }, [filteredEvents, period]);

  // ── Tick formatters ────────────────────────────────────────────────────────

  const formatXTs = (ts: number) => {
    const d = new Date(ts);
    if (period === 'today') return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const hasData = filteredEvents.length > 0;
  const hasLightData = lightTimeline.length > 2;
  const visibleEvents = [...filteredEvents].reverse().slice(0, 50);

  const tooltipStyle = {
    backgroundColor: chartColors.surface,
    border: `1px solid ${chartColors.border}`,
    borderRadius: 8,
    color: chartColors.text,
    fontSize: 12,
  };

  return (
    <>
      <div className="dashboard-grid">
        {/* Period filter */}
        <div className="panel period-filter-row">
          <span className="period-label">Período:</span>
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`period-btn${period === p.value ? ' active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid-4">
          <SummaryCard
            icon={<Zap size={17} />}
            label="Detecções"
            value={detectionCount}
            colorClass="orange"
          />
          <SummaryCard
            icon={<AlertTriangle size={17} />}
            label="Disparos"
            value={alarmCount}
            colorClass="red"
          />
          <SummaryCard
            icon={<Lightbulb size={17} />}
            label="Acionamentos de luz"
            value={lightToggles}
            colorClass="yellow"
          />
          <SummaryCard
            icon={<Clock size={17} />}
            label="Tempo com luz acesa"
            value={formatDuration(lightOnTimeMs)}
            colorClass="accent"
          />
        </div>

        {/* Charts */}
        {hasData ? (
          <>
            <div className="charts-grid">
              {/* Light timeline */}
              <div className="chart-card">
                <h3>Linha do tempo das luzes</h3>
                {hasLightData ? (
                  <ResponsiveContainer width="100%" height={130}>
                    <LineChart data={lightTimeline} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
                      <XAxis
                        dataKey="ts"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        tickFormatter={formatXTs}
                        tick={{ fontSize: 11, fill: chartColors.text }}
                        tickCount={5}
                      />
                      <YAxis
                        domain={[0, 1]}
                        ticks={[0, 1]}
                        tickFormatter={(v) => (v === 1 ? 'Ligada' : 'Apagada')}
                        tick={{ fontSize: 10, fill: chartColors.text }}
                        width={56}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        labelFormatter={(v) => formatXTs(v as number)}
                        formatter={(v) => [v === 1 ? 'Ligada' : 'Apagada', 'Estado']}
                      />
                      <Line
                        type="stepAfter"
                        dataKey="on"
                        stroke={chartColors.accent}
                        dot={false}
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="chart-empty">Nenhum evento de luz no período</p>
                )}
              </div>

              {/* Detections by zone */}
              <div className="chart-card">
                <h3>Detecções por zona</h3>
                <ResponsiveContainer width="100%" height={130}>
                  <BarChart data={detectionsByZone} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: chartColors.text }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartColors.text }} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v, _, props) => [v, props.payload?.label ?? '']}
                    />
                    <Bar dataKey="count" fill={chartColors.accent} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity over time */}
            <div className="chart-card">
              <h3>
                <Activity size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} />
                Atividade ao longo do tempo
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={activityBuckets} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: chartColors.text }}
                    interval={period === 'today' ? 2 : 0}
                    angle={period !== 'today' ? -35 : 0}
                    textAnchor={period !== 'today' ? 'end' : 'middle'}
                    height={period !== 'today' ? 42 : 20}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: chartColors.text }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Eventos']} />
                  <Bar dataKey="count" fill={chartColors.accent2} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="panel">
            <EmptyState />
          </div>
        )}

        {/* Event log */}
        <div className="panel">
          <div className="card-header">
            <div>
              <h2>Log de eventos</h2>
              <p>
                {filteredEvents.length > 0
                  ? `${filteredEvents.length} evento${filteredEvents.length !== 1 ? 's' : ''} no período${filteredEvents.length > 50 ? ' (mostrando os 50 mais recentes)' : ''}`
                  : 'Nenhum evento no período selecionado'}
              </p>
            </div>
            {state.events.length > 0 && (
              <button
                className="secondary small"
                onClick={() => setShowClear(true)}
                aria-label="Limpar todo o histórico de eventos"
              >
                <Trash2 size={14} aria-hidden="true" /> Limpar histórico
              </button>
            )}
          </div>

          {visibleEvents.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="event-log">
              {visibleEvents.map((event, i) => (
                <div key={i} className="event-row">
                  <div className={`event-icon ${eventColorClass(event.tipo)}`}>
                    <EventIcon tipo={event.tipo} />
                  </div>
                  <span className="event-desc">{describeEvent(event)}</span>
                  <span className="event-ts">{formatEventTs(event.ts)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showClear && (
        <ConfirmModal
          title="Limpar histórico"
          message="Todos os eventos registrados serão apagados permanentemente. Deseja continuar?"
          confirmLabel="Limpar tudo"
          danger
          onConfirm={() => {
            clearEventLog();
            setShowClear(false);
          }}
          onCancel={() => setShowClear(false)}
        />
      )}
    </>
  );
}
