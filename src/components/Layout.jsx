import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../db.js';
import { useState, useEffect } from 'react';

const NAV = [
  { path: '/dashboard',       icon: '⊞',  label: 'Dashboard',       roles: ['worker','supervisor','inventory','sales','admin'] },
  { path: '/production-entry',icon: '⚙',  label: 'Production Entry', roles: ['worker','admin'] },
  { path: '/my-entries',      icon: '📋', label: 'My Entries',       roles: ['worker'] },
  { path: '/approvals',       icon: '✅', label: 'Approvals',        roles: ['supervisor','admin'], badge: true },
  { path: '/inventory',       icon: '📦', label: 'Live Inventory',   roles: ['inventory','supervisor','admin'] },
  { path: '/invoices',        icon: '🧾', label: 'Invoices',         roles: ['sales','admin'] },
  { path: '/customers',       icon: '👥', label: 'Customers',        roles: ['sales','admin'] },
  { path: '/worker-stats',    icon: '👷', label: 'Worker Analytics',  roles: ['admin'] },
  { path: '/reports',         icon: '📊', label: 'Reports',           roles: ['admin'] },
];

const PAGE_NAMES = {
  '/dashboard': ['Dashboard', 'Overview of your workspace'],
  '/production-entry': ['Production Entry', 'Log your machine production'],
  '/my-entries': ['My Entries', 'View your submitted production logs'],
  '/approvals': ['Approvals', 'Review and approve production entries'],
  '/inventory': ['Live Inventory', 'Current stock levels'],
  '/invoices': ['Invoices', 'Manage customer invoices'],
  '/invoices/new': ['Create Invoice', 'Generate a new customer invoice'],
  '/customers': ['Customers', 'Manage your customer records'],
  '/worker-stats': ['Worker Analytics', 'Hours, productivity, and leaderboard'],
  '/reports': ['Reports & Analytics', 'Production and sales insights'],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const count = db.getProductionEntries().filter(e => e.status === 'pending').length;
    setPendingCount(count);
  }, [location.pathname]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const visibleNav = NAV.filter(n => n.roles.includes(user.role));
  const [title, sub] = PAGE_NAMES[location.pathname] || ['ManuTrack', ''];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="s-icon">M</div>
          <span className="s-name">ManuTrack</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Menu</div>
          {visibleNav.map(n => (
            <NavLink
              key={n.path}
              to={n.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
              {n.badge && pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-user">
          <div className="avatar">{user.name.charAt(0)}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">⇥</button>
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
              <span>👤</span>
              <span style={{ textTransform: 'capitalize' }}>{user.role}</span>
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
