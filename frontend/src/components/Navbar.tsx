import React, { useEffect, useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { BatteryCharging, LayoutDashboard, Database, PlayCircle } from 'lucide-react';
import { checkBackendHealth } from '../api/client';

export const Navbar: React.FC = () => {
  const [dbStatus, setDbStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CHECKING'>('CHECKING');

  useEffect(() => {
    let isMounted = true;
    const check = async () => {
      const res = await checkBackendHealth();
      if (isMounted) {
        setDbStatus(res.database === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED');
      }
    };

    check();
    const interval = setInterval(check, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="header-nav">
      <div className="nav-inner">
        <Link to="/" className="brand">
          <BatteryCharging className="w-6 h-6 text-emerald-400" size={24} color="#10b981" />
          <span>ReVoltCell</span>
          <span className="brand-badge">Prototype</span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={17} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/cells" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Database size={17} />
            <span>Cells Inventory</span>
          </NavLink>
          <NavLink to="/test/new" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <PlayCircle size={17} />
            <span>New Test Session</span>
          </NavLink>
        </nav>

        <div className="health-status">
          <div className={`status-dot ${dbStatus === 'CONNECTED' ? 'online' : 'offline'}`} />
          <span>API & DB: {dbStatus}</span>
        </div>
      </div>
    </header>
  );
};
