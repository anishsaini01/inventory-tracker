import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../db.js';
import { calcHours, isToday, isThisWeek, isThisMonth, fmtHours } from '../utils.js';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}

function getWorkerSummaries() {
  const entries = db.getProductionEntries();
  const workers = db.getUsers().filter(u => u.role === 'worker');
  return workers.map(w => {
    const mine = entries.filter(e => e.workerId === w.id);
    const approved = mine.filter(e => e.status === 'approved');
    const netApproved = approved.reduce((s, e) => s + (e.quantityProduced - e.quantityRejected), 0);
    const totalHours  = mine.reduce((s, e) => s + (e.hoursWorked ?? calcHours(e.startTime, e.endTime)), 0);
    const todayHours  = mine.filter(e => e.productionDate && isToday(e.productionDate)).reduce((s,e) => s + (e.hoursWorked ?? calcHours(e.startTime, e.endTime)), 0);
    const weekHours   = mine.filter(e => e.productionDate && isThisWeek(e.productionDate)).reduce((s,e) => s + (e.hoursWorked ?? calcHours(e.startTime, e.endTime)), 0);
    const monthHours  = mine.filter(e => e.productionDate && isThisMonth(e.productionDate)).reduce((s,e) => s + (e.hoursWorked ?? calcHours(e.startTime, e.endTime)), 0);
    const uniqueDays  = new Set(mine.map(e => e.productionDate).filter(Boolean)).size;
    const rejRate     = mine.reduce((s,e)=>s+e.quantityProduced,0) > 0
      ? +((mine.reduce((s,e)=>s+e.quantityRejected,0) / mine.reduce((s,e)=>s+e.quantityProduced,0)) * 100).toFixed(1)
      : 0;
    return { ...w, netApproved, totalHours, todayHours, weekHours, monthHours, uniqueDays, rejRate };
  });
}

function get7DayTrend() {
  const entries = db.getProductionEntries().filter(e => e.status === 'approved');
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const label = d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
    const dateStr = d.toLocaleDateString('en-CA');
    const dayEntries = entries.filter(e => e.productionDate === dateStr);
    const produced = dayEntries.reduce((s, e) => s + e.quantityProduced, 0);
    const net      = dayEntries.reduce((s, e) => s + (e.quantityProduced - e.quantityRejected), 0);
    days.push({ day: label, Produced: produced, Net: net });
  }
  return days;
}

function getWorkerBarData(workerStats) {
  return workerStats.map(w => ({
    name: w.name.split(' ')[0],
    'Net Output': w.netApproved,
    'Hours': Math.round(w.totalHours * 10) / 10,
  }));
}

function StatusBadge({ status }) {
  const map = { approved:'badge-green', pending:'badge-orange', rejected:'badge-red', paid:'badge-green', unpaid:'badge-red', partial:'badge-blue' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

const CHART_COLORS = { primary:'#4318FF', secondary:'#868CFF', green:'#01B574', orange:'#FFB547', red:'#EE5D50' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #E0E5F2', borderRadius:12, padding:'10px 14px', boxShadow:'14px 17px 40px 4px rgba(112,144,176,0.18)', fontFamily:'DM Sans, sans-serif' }}>
      <p style={{ fontWeight:800, fontSize:12, color:'#1B2559', marginBottom:6 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ fontSize:12, color:p.color, fontWeight:700, marginBottom:2 }}>
          {p.name}: <span style={{ color:'#1B2559' }}>{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

/* ── ADMIN ── */
function AdminDash() {
  const navigate  = useNavigate();
  const entries   = db.getProductionEntries();
  const inventory = db.getInventory();
  const invoices  = db.getInvoices();
  const pending   = entries.filter(e => e.status === 'pending');
  const totalStock= inventory.reduce((s, i) => s + i.quantity, 0);
  const revenue   = invoices.reduce((s, i) => s + i.total, 0);
  const received  = invoices.reduce((s, i) => s + (i.amountReceived || 0), 0);
  const workerStats = getWorkerSummaries();
  const leaderboard = [...workerStats].sort((a, b) => b.netApproved - a.netApproved);
  const trendData = get7DayTrend();
  const barData   = getWorkerBarData(workerStats);
  const medals = ['🥇','🥈','🥉'];

  return (
    <>
      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Stock Units</div>
            <div className="stat-value">{totalStock.toLocaleString()}</div>
            <div className="stat-trend up">↑ Live inventory</div>
          </div>
          <div className="stat-icon blue">📦</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Pending Approvals</div>
            <div className="stat-value">{pending.length}</div>
            <div className="stat-trend" style={{ color: pending.length > 0 ? 'var(--orange)' : 'var(--green)' }}>
              {pending.length > 0 ? '⚠ Needs review' : '✓ All caught up'}
            </div>
          </div>
          <div className="stat-icon orange">⏳</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">₹{revenue.toLocaleString()}</div>
            <div className="stat-trend up">↑ {invoices.length} invoices</div>
          </div>
          <div className="stat-icon purple">₹</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Amount Received</div>
            <div className="stat-value">₹{received.toLocaleString()}</div>
            <div className="stat-trend" style={{ color:'var(--text-3)' }}>
              ₹{(revenue - received).toLocaleString()} pending
            </div>
          </div>
          <div className="stat-icon green">💰</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2 mb-24">
        {/* 7-Day Production Trend */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Production Trend</div>
              <div className="card-subtitle">Last 7 days — approved output</div>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop:12 }}>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trendData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="gProduced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false}/>
                <XAxis dataKey="day" tick={{ fontSize:11, fontWeight:600, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fontWeight:600, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip />}/>
                <Legend wrapperStyle={{ fontSize:12, fontWeight:700 }}/>
                <Area type="monotone" dataKey="Produced" stroke={CHART_COLORS.secondary} strokeWidth={2} fill="url(#gProduced)" dot={false}/>
                <Area type="monotone" dataKey="Net" stroke={CHART_COLORS.primary} strokeWidth={2.5} fill="url(#gNet)" dot={{ r:3, fill:CHART_COLORS.primary, strokeWidth:0 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Worker Output Bar Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Worker Output</div>
              <div className="card-subtitle">Net approved units per worker</div>
            </div>
          </div>
          <div className="card-body" style={{ paddingTop:12 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:11, fontWeight:700, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fontWeight:600, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip />}/>
                <Bar dataKey="Net Output" fill="url(#barGrad)" radius={[6,6,0,0]}/>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.primary}/>
                    <stop offset="100%" stopColor={CHART_COLORS.secondary}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leaderboard + Worker Hours */}
      <div className="grid-2 mb-24">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">🏆 Top Producers</div>
              <div className="card-subtitle">Ranked by net approved output</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/worker-stats')}>Full Analytics →</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Rank</th><th>Worker</th><th>Machine</th><th>Net Units</th><th>Hours</th><th>Rej%</th></tr></thead>
              <tbody>
                {leaderboard.map((w, i) => (
                  <tr key={w.id}>
                    <td style={{ fontSize:20 }}>{medals[i] || `#${i+1}`}</td>
                    <td>
                      <div style={{ fontWeight:700, color:'var(--text)' }}>{w.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:500 }}>{w.uniqueDays} days worked</div>
                    </td>
                    <td><span className="badge badge-purple">{w.machineId}</span></td>
                    <td style={{ fontWeight:800, color: i===0?'var(--orange)':'var(--brand)' }}>{w.netApproved.toLocaleString()}</td>
                    <td style={{ fontWeight:700, color:'var(--text-2)' }}>{fmtHours(w.totalHours)}</td>
                    <td>
                      <span style={{ fontWeight:800, color: w.rejRate < 5?'var(--green)':w.rejRate<10?'var(--orange)':'var(--red)' }}>
                        {w.rejRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">⏱ Worker Hours</div>
              <div className="card-subtitle">Today / This Week / This Month</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/worker-stats')}>Detailed →</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th style={{ color:'var(--brand)' }}>Today</th>
                  <th style={{ color:'var(--blue)' }}>Week</th>
                  <th style={{ color:'var(--green)' }}>Month</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {workerStats.map(w => (
                  <tr key={w.id}>
                    <td>
                      <div style={{ fontWeight:700, color:'var(--text)' }}>{w.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:500 }}>{w.machineId}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight:800, color: w.todayHours > 0 ? 'var(--brand)' : 'var(--text-3)' }}>
                        {w.todayHours > 0 ? fmtHours(w.todayHours) : <em style={{ fontSize:12 }}>—</em>}
                      </span>
                    </td>
                    <td style={{ fontWeight:700, color:'var(--blue)' }}>{fmtHours(w.weekHours)}</td>
                    <td style={{ fontWeight:700, color:'var(--green)' }}>{fmtHours(w.monthHours)}</td>
                    <td style={{ fontWeight:800, color:'var(--text-2)' }}>{fmtHours(w.totalHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Tables */}
      <div className="grid-2 mb-24">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Production Entries</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker</th><th>Date</th><th>Machine</th><th>Product</th><th>Qty</th><th>Status</th></tr></thead>
              <tbody>
                {entries.slice(0,6).map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight:700 }}>{e.workerName}</td>
                    <td style={{ fontSize:12, color:'var(--text-3)', fontWeight:600 }}>
                      {e.productionDate ? new Date(e.productionDate+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'}
                    </td>
                    <td><span className="badge badge-purple">{e.machineId}</span></td>
                    <td style={{ fontSize:13, color:'var(--text-2)' }}>{e.productType}</td>
                    <td style={{ fontWeight:800, color:'var(--brand)' }}>{e.quantityProduced.toLocaleString()}</td>
                    <td><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Invoices</div>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice#</th><th>Customer</th><th>Total</th><th>Received</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.slice(0,6).map(inv => {
                  const rec = inv.amountReceived || 0;
                  const pct = Math.round((rec / inv.total) * 100);
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontWeight:800, color:'var(--brand)', fontSize:13 }}>{inv.invoiceNumber}</td>
                      <td style={{ fontWeight:600 }}>{inv.customerName}</td>
                      <td style={{ fontWeight:800 }}>₹{inv.total.toLocaleString()}</td>
                      <td>
                        <div style={{ fontWeight:700, color:'var(--green)', fontSize:13 }}>₹{rec.toLocaleString()}</div>
                        <div style={{ height:3, width:50, background:'#E0E5F2', borderRadius:3, marginTop:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background: pct>=100?'var(--green)':'var(--orange)', borderRadius:3 }}/>
                        </div>
                      </td>
                      <td><StatusBadge status={inv.paymentStatus} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Inventory Snapshot */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Live Inventory Snapshot</div>
            <div className="card-subtitle">Real-time stock across all products</div>
          </div>
        </div>
        <div className="card-body">
          <div className="stock-grid">
            {inventory.map(item => (
              <div key={item.productType} className={`stock-card ${item.quantity < 500 ? 'low' : ''}`}>
                <div className="product-icon">{item.productType.startsWith('Cup') ? '🥤' : '🍽'}</div>
                <div className="product-name">{item.productType}</div>
                <div className="product-qty">{item.quantity.toLocaleString()}</div>
                <div className="product-unit">units in stock</div>
                {item.quantity < 500 && <div className="badge badge-orange mt-4">Low Stock</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── WORKER ── */
function WorkerDash({ user }) {
  const navigate = useNavigate();
  const entries  = db.getProductionEntries().filter(e => e.workerId === user.id);
  const approved = entries.filter(e => e.status === 'approved');
  const pending  = entries.filter(e => e.status === 'pending').length;
  const total    = approved.reduce((s, e) => s + (e.quantityProduced - e.quantityRejected), 0);
  const totalHours = entries.reduce((s, e) => s + (e.hoursWorked ?? calcHours(e.startTime, e.endTime)), 0);

  const trendData = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
      const dateStr = d.toLocaleDateString('en-CA');
      const dayEntries = entries.filter(e => e.productionDate === dateStr);
      const net = dayEntries.reduce((s, e) => s + (e.quantityProduced - e.quantityRejected), 0);
      days.push({ day: label, Units: net });
    }
    return days;
  })();

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">My Machine</div>
            <div className="stat-value">{user.machineId}</div>
            <div className="stat-trend up">Active</div>
          </div>
          <div className="stat-icon blue">⚙</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Pending Entries</div>
            <div className="stat-value">{pending}</div>
            <div className="stat-trend" style={{ color: pending > 0 ? 'var(--orange)' : 'var(--green)' }}>
              {pending > 0 ? 'Awaiting review' : 'All reviewed'}
            </div>
          </div>
          <div className="stat-icon orange">⏳</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Units Produced</div>
            <div className="stat-value">{total.toLocaleString()}</div>
            <div className="stat-trend up">↑ Net approved</div>
          </div>
          <div className="stat-icon purple">📦</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Hours Worked</div>
            <div className="stat-value">{fmtHours(totalHours)}</div>
            <div className="stat-trend up">↑ All shifts</div>
          </div>
          <div className="stat-icon green">⏱</div>
        </div>
      </div>

      <div className="grid-2 mb-24">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">My 7-Day Output</div>
              <div className="card-subtitle">Net units produced per day</div>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/production-entry')}>+ New Entry</button>
          </div>
          <div className="card-body" style={{ paddingTop:12 }}>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="gWorker" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false}/>
                <XAxis dataKey="day" tick={{ fontSize:11, fontWeight:600, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:11, fontWeight:600, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip />}/>
                <Area type="monotone" dataKey="Units" stroke={CHART_COLORS.primary} strokeWidth={2.5} fill="url(#gWorker)" dot={{ r:3, fill:CHART_COLORS.primary, strokeWidth:0 }}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">My Recent Entries</div></div>
          {entries.length === 0 ? (
            <div className="empty"><div className="empty-icon">📋</div><h3>No entries yet</h3><p>Submit your first production entry.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Product</th><th>Produced</th><th>Rejected</th><th>Status</th></tr></thead>
                <tbody>
                  {entries.slice(0,5).map(e => (
                    <tr key={e.id}>
                      <td style={{ fontSize:12, color:'var(--text-3)', fontWeight:600 }}>{e.productionDate ? new Date(e.productionDate+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'}</td>
                      <td style={{ fontSize:13 }}>{e.productType}</td>
                      <td style={{ fontWeight:800, color:'var(--brand)' }}>{e.quantityProduced.toLocaleString()}</td>
                      <td style={{ fontWeight:700, color:'var(--red)' }}>{e.quantityRejected}</td>
                      <td><span className={`badge ${e.status==='approved'?'badge-green':e.status==='pending'?'badge-orange':'badge-red'}`}>{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── SUPERVISOR ── */
function SupervisorDash({ user }) {
  const navigate = useNavigate();
  const all     = db.getProductionEntries();
  const pending  = all.filter(e => e.status === 'pending');
  const approved = all.filter(e => e.status === 'approved' && e.supervisorId === user.id);
  const totalNet = approved.reduce((s,e) => s + (e.quantityProduced - e.quantityRejected), 0);

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Awaiting Approval</div>
            <div className="stat-value">{pending.length}</div>
            <div className="stat-trend" style={{ color: pending.length > 0 ? 'var(--orange)' : 'var(--green)' }}>
              {pending.length > 0 ? '⚠ Needs review' : '✓ All done'}
            </div>
          </div>
          <div className="stat-icon orange">⏳</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">My Approvals</div>
            <div className="stat-value">{approved.length}</div>
            <div className="stat-trend up">↑ Reviewed by you</div>
          </div>
          <div className="stat-icon green">✅</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Entries</div>
            <div className="stat-value">{all.length}</div>
            <div className="stat-trend up">All workers</div>
          </div>
          <div className="stat-icon blue">👥</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Net Units Approved</div>
            <div className="stat-value">{totalNet.toLocaleString()}</div>
            <div className="stat-trend up">↑ Added to stock</div>
          </div>
          <div className="stat-icon purple">📦</div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="alert alert-warn">⚠ You have {pending.length} production {pending.length === 1 ? 'entry' : 'entries'} waiting for your review.</div>
      )}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Pending Approvals</div>
            <div className="card-subtitle">Review and approve production entries</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/approvals')}>View All →</button>
        </div>
        {pending.length === 0 ? (
          <div className="empty"><div className="empty-icon">✅</div><h3>All caught up!</h3><p>No entries pending review.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker</th><th>Machine</th><th>Shift</th><th>Product</th><th>Qty</th><th>Submitted</th><th>Action</th></tr></thead>
              <tbody>
                {pending.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight:700 }}>{e.workerName}</td>
                    <td><span className="badge badge-purple">{e.machineId}</span></td>
                    <td style={{ color:'var(--text-2)', fontSize:13 }}>{e.shift}</td>
                    <td style={{ color:'var(--text-2)', fontSize:13 }}>{e.productType}</td>
                    <td style={{ fontWeight:800, color:'var(--brand)' }}>{e.quantityProduced.toLocaleString()}</td>
                    <td style={{ fontSize:12, color:'var(--text-3)' }}>{fmt(e.submittedAt)}</td>
                    <td><button className="btn btn-primary btn-sm" onClick={() => navigate('/approvals')}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ── INVENTORY ── */
function InventoryDash() {
  const inventory = db.getInventory();
  const total = inventory.reduce((s, i) => s + i.quantity, 0);
  const low   = inventory.filter(i => i.quantity < 500).length;

  const barData = inventory.map(item => ({
    name: item.productType.replace(' inch','″').replace('Cup ','Cup\n'),
    Stock: item.quantity,
  }));

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Units in Stock</div>
            <div className="stat-value">{total.toLocaleString()}</div>
            <div className="stat-trend up">↑ Live count</div>
          </div>
          <div className="stat-icon blue">📦</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Healthy Products</div>
            <div className="stat-value">{inventory.length - low}</div>
            <div className="stat-trend up">↑ Well stocked</div>
          </div>
          <div className="stat-icon green">✅</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Low Stock Alerts</div>
            <div className="stat-value">{low}</div>
            <div className="stat-trend" style={{ color: low > 0 ? 'var(--orange)' : 'var(--green)' }}>
              {low > 0 ? '⚠ Reorder needed' : '✓ All good'}
            </div>
          </div>
          <div className="stat-icon orange">⚠</div>
        </div>
      </div>

      <div className="card mb-24">
        <div className="card-header">
          <div>
            <div className="card-title">Stock by Product</div>
            <div className="card-subtitle">Current inventory levels</div>
          </div>
        </div>
        <div className="card-body" style={{ paddingTop:8 }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top:5, right:20, left:-10, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false}/>
              <XAxis dataKey="name" tick={{ fontSize:11, fontWeight:700, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Bar dataKey="Stock" radius={[8,8,0,0]}>
                {barData.map((entry, i) => (
                  <rect key={i} fill={entry.Stock < 500 ? '#FFB547' : '#4318FF'}/>
                ))}
              </Bar>
              <defs>
                <linearGradient id="barStock" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4318FF"/>
                  <stop offset="100%" stopColor="#868CFF"/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Current Stock Levels</div></div>
        <div className="card-body">
          <div className="stock-grid">
            {inventory.map(item => (
              <div key={item.productType} className={`stock-card ${item.quantity < 500 ? 'low' : ''}`}>
                <div className="product-icon">{item.productType.startsWith('Cup') ? '🥤' : '🍽'}</div>
                <div className="product-name">{item.productType}</div>
                <div className="product-qty">{item.quantity.toLocaleString()}</div>
                <div className="product-unit">units</div>
                {item.quantity < 500 && <div className="badge badge-orange" style={{ marginTop:8 }}>Low Stock</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── SALES ── */
function SalesDash() {
  const navigate = useNavigate();
  const invoices  = db.getInvoices();
  const revenue   = invoices.reduce((s, i) => s + i.total, 0);
  const received  = invoices.reduce((s, i) => s + (i.amountReceived || 0), 0);
  const unpaid    = revenue - received;
  const paidCount = invoices.filter(i => i.paymentStatus === 'paid').length;

  const trendData = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const label = d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
      const dateStr = d.toLocaleDateString('en-CA');
      const dayInvs = invoices.filter(inv => inv.createdAt?.startsWith(dateStr));
      days.push({ day: label, Revenue: dayInvs.reduce((s,i) => s+i.total, 0) });
    }
    return days;
  })();

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Invoices</div>
            <div className="stat-value">{invoices.length}</div>
            <div className="stat-trend up">↑ All time</div>
          </div>
          <div className="stat-icon blue">🧾</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">₹{revenue.toLocaleString()}</div>
            <div className="stat-trend up">↑ Billed</div>
          </div>
          <div className="stat-icon purple">₹</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Amount Received</div>
            <div className="stat-value">₹{received.toLocaleString()}</div>
            <div className="stat-trend up">↑ {paidCount} fully paid</div>
          </div>
          <div className="stat-icon green">💰</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Balance Pending</div>
            <div className="stat-value">₹{unpaid.toLocaleString()}</div>
            <div className="stat-trend" style={{ color: unpaid > 0 ? 'var(--orange)' : 'var(--green)' }}>
              {unpaid > 0 ? 'Awaiting payment' : '✓ Fully collected'}
            </div>
          </div>
          <div className="stat-icon red">⏳</div>
        </div>
      </div>

      <div className="card mb-24">
        <div className="card-header">
          <div>
            <div className="card-title">Revenue — Last 7 Days</div>
            <div className="card-subtitle">Invoice totals by creation date</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/invoices/new')}>+ Create Invoice</button>
        </div>
        <div className="card-body" style={{ paddingTop:8 }}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData} margin={{ top:5, right:10, left:-10, bottom:0 }}>
              <defs>
                <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false}/>
              <XAxis dataKey="day" tick={{ fontSize:11, fontWeight:600, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Area type="monotone" dataKey="Revenue" stroke={CHART_COLORS.green} strokeWidth={2.5} fill="url(#gRevenue)" dot={{ r:3, fill:CHART_COLORS.green, strokeWidth:0 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Recent Invoices</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice#</th><th>Customer</th><th>Total</th><th>Received</th><th>Balance</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {invoices.map(inv => {
                const rec = inv.amountReceived || 0;
                const bal = inv.total - rec;
                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight:800, color:'var(--brand)', fontSize:13 }}>{inv.invoiceNumber}</td>
                    <td style={{ fontWeight:600 }}>{inv.customerName}</td>
                    <td style={{ fontWeight:800 }}>₹{inv.total.toLocaleString()}</td>
                    <td style={{ fontWeight:700, color:'var(--green)' }}>₹{rec.toLocaleString()}</td>
                    <td style={{ fontWeight:700, color: bal > 0 ? 'var(--red)' : 'var(--green)' }}>
                      {bal > 0 ? `₹${bal.toLocaleString()}` : '✓ Settled'}
                    </td>
                    <td><span className={`badge ${inv.paymentStatus==='paid'?'badge-green':inv.paymentStatus==='partial'?'badge-blue':'badge-red'}`}>{inv.paymentStatus}</span></td>
                    <td style={{ fontSize:12, color:'var(--text-3)' }}>{fmt(inv.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const map = { admin: <AdminDash />, worker: <WorkerDash user={user} />, supervisor: <SupervisorDash user={user} />, inventory: <InventoryDash />, sales: <SalesDash /> };
  return map[user.role] || <AdminDash />;
}
