import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const QUICK = [
  { role: 'Worker',     label: '👷 Worker',     username: 'ramesh', password: 'pass123',  color: '#10b981' },
  { role: 'Supervisor', label: '👔 Supervisor', username: 'amit',   password: 'pass123',  color: '#3b82f6' },
  { role: 'Inventory',  label: '📦 Inventory',  username: 'rajesh', password: 'pass123',  color: '#8b5cf6' },
  { role: 'Sales',      label: '💼 Sales',       username: 'neha',   password: 'pass123',  color: '#f59e0b' },
  { role: 'Admin',      label: '🔐 Admin',       username: 'admin',  password: 'admin123', color: '#1e3799' },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]   = useState('');
  const [selRole, setSelRole] = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

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
    else setError('Invalid username or password. Try the quick login buttons below.');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">M</div>
          <span className="logo-text">ManuTrack</span>
        </div>
        <h2>Welcome Back</h2>
        <p>Sign in to continue to ManuTrack</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
          </div>
          {error && <div className="error-msg">⚠ {error}</div>}
          <button type="submit" className="btn-login">Sign In →</button>
        </form>

        <div className="quick-login-section">
          <div className="quick-login-divider"><span>Quick Login by Role</span></div>
          <div className="quick-login-buttons">
            {QUICK.map(q => (
              <button
                key={q.role}
                type="button"
                className={`quick-login-btn ${selRole === q.role ? 'active' : ''}`}
                style={{ '--btn-color': q.color }}
                onClick={() => handleQuick(q)}
              >
                {q.label}
              </button>
            ))}
          </div>
          {selRole && (
            <p className="quick-login-hint">✓ {selRole} credentials loaded — click Sign In</p>
          )}
        </div>

        <div style={{ marginTop: 24, padding: '12px', background: '#f8fafc', borderRadius: 8, fontSize: 11, color: '#94a3b8' }}>
          <strong style={{ color: '#475569' }}>Demo credentials:</strong>
          {QUICK.map(q => (
            <div key={q.role} style={{ marginTop: 3 }}>
              <span style={{ color: q.color, fontWeight: 600 }}>{q.role}:</span> {q.username} / {q.password}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
