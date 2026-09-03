import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../db.js';
import { calcHours, isToday, isThisWeek, isThisMonth, fmtHours } from '../utils.js';

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

function StatusBadge({ status }) {
  const map = { approved:'badge-green', pending:'badge-orange', rejected:'badge-red', paid:'badge-green', unpaid:'badge-red', partial:'badge-blue' };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

/* ── ADMIN ── */
function AdminDash() {
  const navigate  = useNavigate();
  const entries   = db.getProductionEntries();
  const inventory = db.getInventory();
  const invoices  = db.getInvoices();
  const pending   = entries.filter(e => e.status === 'pending');
  const totalStock= inventory.reduce((s, i) => s + i.quantity, 0);
  const revenue   = invoices.reduce((s, i) => s + i.total, 0);
  const workerStats = getWorkerSummaries();
  const leaderboard = [...workerStats].sort((a, b) => b.netApproved - a.netApproved);

  const medals = ['🥇','🥈','🥉'];

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📦</div>
          <div><div className="stat-value">{totalStock.toLocaleString()}</div><div className="stat-label">Total Stock Units</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">⏳</div>
          <div><div className="stat-value">{pending.length}</div><div className="stat-label">Pending Approvals</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">🧾</div>
          <div><div className="stat-value">{invoices.length}</div><div className="stat-label">Total Invoices</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">₹</div>
          <div><div className="stat-value">₹{revenue.toLocaleString()}</div><div className="stat-label">Total Revenue</div></div>
        </div>
      </div>

      {/* Top Producers + Worker Hours */}
      <div className="grid-2 mb-24">
        {/* Leaderboard */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🏆 Top Producers</span>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/worker-stats')}>Full Analytics →</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Rank</th><th>Worker</th><th>Machine</th><th>Net Output</th><th>Hours</th><th>Rej%</th></tr></thead>
              <tbody>
                {leaderboard.map((w, i) => (
                  <tr key={w.id} style={{ background: i===0?'#fffbeb':'' }}>
                    <td style={{ fontSize:18 }}>{medals[i] || `#${i+1}`}</td>
                    <td>
                      <div style={{ fontWeight:700 }}>{w.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-light)' }}>{w.uniqueDays} days worked</div>
                    </td>
                    <td><span className="badge badge-blue">{w.machineId}</span></td>
                    <td style={{ fontWeight:800, color: i===0?'#f59e0b':'var(--text)' }}>{w.netApproved.toLocaleString()}</td>
                    <td style={{ fontWeight:600, color:'var(--primary)' }}>{fmtHours(w.totalHours)}</td>
                    <td>
                      <span style={{ fontWeight:700, color: w.rejRate < 5?'var(--green)':w.rejRate<10?'var(--orange)':'var(--red)' }}>
                        {w.rejRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Worker Hours Today / Week / Month */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">⏱ Worker Hours Tracker</span>
            <button className="btn btn-outline btn-sm" onClick={() => navigate('/worker-stats')}>Detailed View →</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker</th><th style={{color:'var(--primary)'}}>Today</th><th style={{color:'var(--blue)'}}>Week</th><th style={{color:'var(--green)'}}>Month</th><th>Total</th></tr></thead>
              <tbody>
                {workerStats.map(w => (
                  <tr key={w.id}>
                    <td>
                      <div style={{ fontWeight:700 }}>{w.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-light)' }}>{w.machineId}</div>
                    </td>
                    <td>
                      <span style={{ fontWeight:700, color: w.todayHours > 0 ? 'var(--primary)' : 'var(--text-light)' }}>
                        {w.todayHours > 0 ? fmtHours(w.todayHours) : <em style={{fontSize:12,opacity:.5}}>—</em>}
                      </span>
                    </td>
                    <td style={{ fontWeight:600, color:'var(--blue)' }}>{fmtHours(w.weekHours)}</td>
                    <td style={{ fontWeight:600, color:'var(--green)' }}>{fmtHours(w.monthHours)}</td>
                    <td style={{ fontWeight:700 }}>{fmtHours(w.totalHours)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Recent Production Entries</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Worker</th><th>Date</th><th>Machine</th><th>Product</th><th>Qty</th><th>Status</th></tr></thead>
              <tbody>
                {entries.slice(0,6).map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight:600 }}>{e.workerName}</td>
                    <td style={{ fontSize:12, color:'var(--text-med)' }}>
                      {e.productionDate ? new Date(e.productionDate+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'}
                    </td>
                    <td><span className="badge badge-blue">{e.machineId}</span></td>
                    <td>{e.productType}</td>
                    <td>{e.quantityProduced}</td>
                    <td><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Recent Invoices</span></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice#</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {invoices.slice(0,6).map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight:600, color:'var(--primary)' }}>{inv.invoiceNumber}</td>
                    <td>{inv.customerName}</td>
                    <td>₹{inv.total.toLocaleString()}</td>
                    <td><StatusBadge status={inv.paymentStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card mt-24">
        <div className="card-header"><span className="card-title">Live Inventory Snapshot</span></div>
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
  const entries = db.getProductionEntries().filter(e => e.workerId === user.id);
  const pending = entries.filter(e => e.status === 'pending').length;
  const approved = entries.filter(e => e.status === 'approved').length;
  const total = entries.reduce((s, e) => s + (e.quantityProduced - e.quantityRejected), 0);

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">⚙</div>
          <div><div className="stat-value">{user.machineId}</div><div className="stat-label">My Machine</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">⏳</div>
          <div><div className="stat-value">{pending}</div><div className="stat-label">Pending Entries</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div><div className="stat-value">{approved}</div><div className="stat-label">Approved Entries</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📦</div>
          <div><div className="stat-value">{total.toLocaleString()}</div><div className="stat-label">Total Units Produced</div></div>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => navigate('/production-entry')}>⚙ + New Production Entry</button>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">My Recent Entries</span></div>
        {entries.length === 0 ? (
          <div className="empty"><div className="empty-icon">📋</div><h3>No entries yet</h3><p>Submit your first production entry.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Machine</th><th>Shift</th><th>Product</th><th>Produced</th><th>Rejected</th><th>Status</th></tr></thead>
              <tbody>
                {entries.slice(0,8).map(e => (
                  <tr key={e.id}>
                    <td>{fmt(e.submittedAt)}</td>
                    <td><span className="badge badge-blue">{e.machineId}</span></td>
                    <td>{e.shift}</td>
                    <td>{e.productType}</td>
                    <td style={{ fontWeight:600 }}>{e.quantityProduced}</td>
                    <td style={{ color:'var(--red)' }}>{e.quantityRejected}</td>
                    <td><StatusBadge status={e.status} /></td>
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

/* ── SUPERVISOR ── */
function SupervisorDash({ user }) {
  const navigate = useNavigate();
  const all = db.getProductionEntries();
  const pending  = all.filter(e => e.status === 'pending');
  const approved = all.filter(e => e.status === 'approved' && e.supervisorId === user.id);

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon orange">⏳</div>
          <div><div className="stat-value">{pending.length}</div><div className="stat-label">Awaiting Approval</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div><div className="stat-value">{approved.length}</div><div className="stat-label">My Approvals</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div><div className="stat-value">{all.length}</div><div className="stat-label">Total Entries</div></div>
        </div>
      </div>
      {pending.length > 0 && (
        <div className="alert alert-warn">⚠ You have {pending.length} production {pending.length === 1 ? 'entry' : 'entries'} waiting for review.</div>
      )}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Pending Approvals</span>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/approvals')}>View All</button>
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
                    <td style={{ fontWeight:600 }}>{e.workerName}</td>
                    <td><span className="badge badge-blue">{e.machineId}</span></td>
                    <td>{e.shift}</td>
                    <td>{e.productType}</td>
                    <td>{e.quantityProduced}</td>
                    <td>{fmt(e.submittedAt)}</td>
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

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">📦</div>
          <div><div className="stat-value">{total.toLocaleString()}</div><div className="stat-label">Total Units in Stock</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div><div className="stat-value">{inventory.length - low}</div><div className="stat-label">Healthy Stock Items</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">⚠</div>
          <div><div className="stat-value">{low}</div><div className="stat-label">Low Stock Alerts</div></div>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">Current Stock Levels</span></div>
        <div className="card-body">
          <div className="stock-grid">
            {inventory.map(item => (
              <div key={item.productType} className={`stock-card ${item.quantity < 500 ? 'low' : ''}`}>
                <div className="product-icon">{item.productType.startsWith('Cup') ? '🥤' : '🍽'}</div>
                <div className="product-name">{item.productType}</div>
                <div className="product-qty">{item.quantity.toLocaleString()}</div>
                <div className="product-unit">units</div>
                {item.quantity < 500 && <div className="badge badge-orange" style={{marginTop:8}}>Low Stock</div>}
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
  const invoices = db.getInvoices();
  const revenue  = invoices.reduce((s, i) => s + i.total, 0);
  const unpaid   = invoices.filter(i => i.paymentStatus === 'unpaid').reduce((s, i) => s + i.total, 0);

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">🧾</div>
          <div><div className="stat-value">{invoices.length}</div><div className="stat-label">Total Invoices</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">₹</div>
          <div><div className="stat-value">₹{revenue.toLocaleString()}</div><div className="stat-label">Total Revenue</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">⏳</div>
          <div><div className="stat-value">₹{unpaid.toLocaleString()}</div><div className="stat-label">Pending Payment</div></div>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>🧾 + Create Invoice</button>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">Recent Invoices</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Invoice#</th><th>Customer</th><th>Amount</th><th>Payment</th><th>Date</th></tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight:600, color:'var(--primary)' }}>{inv.invoiceNumber}</td>
                  <td>{inv.customerName}</td>
                  <td>₹{inv.total.toLocaleString()}</td>
                  <td><span className={`badge ${inv.paymentStatus==='paid'?'badge-green':inv.paymentStatus==='partial'?'badge-blue':'badge-red'}`}>{inv.paymentStatus}</span></td>
                  <td>{fmt(inv.createdAt)}</td>
                </tr>
              ))}
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
