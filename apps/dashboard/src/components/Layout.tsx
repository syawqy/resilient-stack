import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dasbor' },
  { id: 'config', label: 'Konfigurasi' },
  { id: 'load-test', label: 'Uji Beban' },
  { id: 'scenarios', label: 'Skenario' },
];

export function Layout({ children, activeView, onNavigate }: LayoutProps) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Resilient Stack</h1>
          <span className="sidebar-subtitle">Monitoring Dashboard</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-version">v1.0.0</span>
        </div>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
