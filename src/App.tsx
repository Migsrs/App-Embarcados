import { HashRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Home as HomeIcon, Map, Settings, Moon, Sun, Shield, BarChart2 } from 'lucide-react';
import { AppProvider, useAppState } from './state/appState';
import Home from './screens/Home';
import Zones from './screens/Zones';
import Config from './screens/Config';
import Dashboard from './screens/Dashboard';
import AlertModal from './screens/AlertModal';
import ConnectionBanner from './widgets/ConnectionBanner';
import { useTheme } from './hooks/useTheme';

const NAV_ITEMS = [
  { to: '/', label: 'Painel', icon: HomeIcon, end: true },
  { to: '/zonas', label: 'Zonas', icon: Map, end: false },
  { to: '/dashboard', label: 'Estatísticas', icon: BarChart2, end: false },
  { to: '/config', label: 'Config', icon: Settings, end: false },
] as const;

function AppRoutes() {
  const { state } = useAppState();
  const { theme, toggle } = useTheme();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-brand">
          <Shield size={26} className="brand-icon" aria-hidden="true" />
          <div>
            <h1>Casa Alarme</h1>
            <p className="subtitle">Central perimétrica MQTT</p>
          </div>
        </div>
        <div className="header-right">
          <nav className="desktop-nav" aria-label="Navegação principal">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end}>
                <Icon size={15} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
          <button
            className="icon-btn theme-toggle"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </header>

      <ConnectionBanner />

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/zonas" element={<Zones />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/config" element={<Config />} />
        </Routes>
      </main>

      <nav className="bottom-nav" aria-label="Navegação mobile">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}>
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <AlertModal visible={state.alertActive} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AppProvider>
  );
}
