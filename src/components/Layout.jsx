import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../db.js';
import { useState, useEffect } from 'react';

const NAV = [
  { path: '/dashboard',       icon: '⊞',  label: 'Dashboard',        roles: ['worker','supervisor','inventory','sales','admin'] },
  { path: '/production-entry',icon: '⚙',  label: 'Production Entry',  roles: ['worker','admin'] },
  { path: '/my-entries',      icon: '📋', label: 'My Entries',        roles: ['worker'] },
  { path: '/approvals',       icon: '✅', label: 'Approvals',         roles: ['supervisor','admin'], badge: true },
  { path: '/inventory',       icon: '📦', label: 'Live Inventory',    roles: ['inventory','supervisor','admin'] },
  { path: '/invoices',        icon: '🧾', label: 'Invoices',          roles: ['sales','admin'] },
  { path: '/customers',       icon: '👥', label: 'Customers',         roles: ['sales','admin'] },
  { path: '/worker-stats',    icon: '👷', label: 'Worker Analytics',  roles: ['admin'] },
  { path: '/reports',         icon: '📊', label: 'Reports',           roles: ['admin'] },
];

const PAGE_META = {
  '/dashboard':        ['Dashboard',        'Overview of your workspace'],
  '/production-entry': ['Production Entry', 'Log your machine output for this shift'],
  '/my-entries':       ['My Entries',       'All your submitted production logs'],
  '/approvals':        ['Approvals',        'Review and approve production entries'],
  '/inventory':        ['Live Inventory',   'Current stock levels — real-time'],
  '/invoices':         ['Invoices',         'Manage customer invoices'],
  '/invoices/new':     ['Create Invoice',   'Generate a new customer invoice'],
  '/customers':        ['Customers',        'Manage your customer records'],
  '/worker-stats':     ['Worker Analytics', 'Hours, leaderboard, and productivity'],
  '/reports':          ['Reports',          'Production and sales analytics'],
};

const ROLE_COLORS = { worker:'#10b981', supervisor:'#3b82f6', inventory:'#8b5cf6', sales:'#f59e0b', admin:'#2563eb' };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setPendingCount(db.getProductionEntries().filter(e => e.status === 'pending').length);
  }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const visibleNav = NAV.filter(n => n.roles.includes(user.role));
  const [title, sub] = PAGE_META[location.pathname] || ['ManuTrack', ''];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="s-icon">M</div>
          <div>
            <div className="s-name">ManuTrack</div>
            <div className="s-tag">Manufacturing ERP</div>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
          {visibleNav.map(n => (
            <NavLink
              key={n.path} to={n.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
              {n.badge && pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-user">
          <div className="s-avatar">{user.name.charAt(0)}</div>
          <div className="s-info">
            <div className="s-name">{user.name}</div>
            <div className="s-role" style={{ color: ROLE_COLORS[user.role] || '#64748b' }}>● {user.role}</div>
          </div>
          <button className="s-logout" onClick={handleLogout} title="Sign out">⇥</button>
        </div>
      </aside>

      <div className="main-area">
        <header className="header">
          <div className="header-breadcrumb">
            <div className="page-title">{title}</div>
            <div className="page-sub">{sub}</div>
          </div>
          <div className="header-actions">
            <div className="header-chip">
              <span style={{ width:7, height:7, borderRadius:'50%', background: ROLE_COLORS[user.role], display:'inline-block' }} />
              <span style={{ textTransform:'capitalize' }}>{user.role}</span>
            </div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
