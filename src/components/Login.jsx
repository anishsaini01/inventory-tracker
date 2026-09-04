import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const QUICK = [
  { role: 'Worker',     label: '👷 Worker',     username: 'ramesh', password: 'pass123',  color: '#10b981' },
  { role: 'Supervisor', label: '👔 Supervisor', username: 'amit',   password: 'pass123',  color: '#3b82f6' },
  { role: 'Inventory',  label: '📦 Inventory',  username: 'rajesh', password: 'pass123',  color: '#8b5cf6' },
  { role: 'Sales',      label: '💼 Sales',       username: 'neha',   password: 'pass123',  color: '#f59e0b' },
  { role: 'Admin',      label: '🔐 Admin',       username: 'admin',  password: 'admin123', color: '#2563eb' },
];

const FEATURES = [
  { icon: '⚙', title: 'Production Tracking', desc: 'Log machine output per shift with real-time visibility' },
  { icon: '✅', title: 'Supervisor Approvals', desc: 'Two-level approval flow before stock hits inventory' },
  { icon: '📦', title: 'Live Inventory', desc: 'Auto-updated stock levels on every approval and invoice' },
  { icon: '🧾', title: 'Smart Invoicing', desc: 'Create invoices with auto stock deduction and PDF export' },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [selRole, setSelRole]   = useState('');
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const handleQuick = (q) => {
    setUsername(q.username);
    setPassword(q.password);
    setSelRole(q.role);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const r = login(username, password);
    if (r.success) navigate('/dashboard');
    else setError('Invalid credentials. Use the quick login buttons below.');
  };

  return (
    <div className="login-page">
      {/* ── LEFT PANEL ── */}
      <div className="login-left">
        <div>
          <div className="ll-logo">
            <div className="ll-logo-icon">M</div>
            <span className="ll-logo-name">ManuTrack</span>
          </div>
          <div className="ll-headline">
            <h1>Factory floor to<br /><span>invoice</span>, automated.</h1>
            <p>End-to-end manufacturing management — from machine production entry to live inventory and billing.</p>
          </div>
          <div className="ll-features">
            {FEATURES.map(f => (
              <div key={f.title} className="ll-feature">
                <div className="ll-feature-icon">{f.icon}</div>
                <div className="ll-feature-text">
                  <strong>{f.title}</strong>
                  <span>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="ll-footer">© 2024 ManuTrack · Manufacturing Management POC</div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="login-right">
        <div className="login-form-wrap">
          <div className="welcome">
            <h2>Welcome back</h2>
            <p>Sign in to your ManuTrack workspace</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                value={username} onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username" autoComplete="username" required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password" autoComplete="current-password" required
              />
            </div>
            {error && <div className="error-msg">⚠ {error}</div>}
            <button type="submit" className="btn-login">Sign in →</button>
          </form>

          <div className="quick-login-section">
            <div className="quick-login-divider"><span>Quick login by role</span></div>
            <div className="quick-login-buttons">
              {QUICK.map(q => (
                <button
                  key={q.role} type="button"
                  className={`quick-login-btn ${selRole === q.role ? 'active' : ''}`}
                  style={{ '--btn-color': q.color }}
                  onClick={() => handleQuick(q)}
                >
                  {q.label}
                </button>
              ))}
            </div>
            {selRole && <p className="quick-login-hint">✓ {selRole} credentials loaded — click Sign in</p>}
          </div>

          <div className="cred-box">
            <strong>Demo credentials</strong>
            {QUICK.map(q => (
              <div key={q.role} className="cred-row">
                <div className="cred-dot" style={{ background: q.color }} />
                <span className="cred-name">{q.role}</span>
                <span className="cred-val">{q.username} / {q.password}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
