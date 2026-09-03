import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../db.js';

function fmt(iso) { return iso ? new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'; }

export default function MyEntries() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const all = db.getProductionEntries().filter(e => e.workerId === user.id);
  const entries = filter === 'all' ? all : all.filter(e => e.status === filter);

  const tabs = [
    { key:'all', label:'All', count: all.length },
    { key:'pending',  label:'Pending',  count: all.filter(e=>e.status==='pending').length },
    { key:'approved', label:'Approved', count: all.filter(e=>e.status==='approved').length },
    { key:'rejected', label:'Rejected', count: all.filter(e=>e.status==='rejected').length },
  ];

  const badge = s => ({ approved:'badge-green', pending:'badge-orange', rejected:'badge-red' })[s];

  return (
    <>
      <div className="page-head"><div><h1>My Entries</h1><p>All production entries you have submitted</p></div></div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn ${filter===t.key?'active':''}`} onClick={() => setFilter(t.key)}>
            {t.label} {t.count > 0 && <span style={{fontWeight:400, opacity:.7}}>({t.count})</span>}
          </button>
        ))}
      </div>

      <div className="card">
        {entries.length === 0 ? (
          <div className="empty"><div className="empty-icon">📋</div><h3>No entries found</h3><p>Try changing the filter or submit a new production entry.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Submitted</th><th>Machine</th><th>Shift</th><th>Time</th>
                  <th>Product</th><th>Produced</th><th>Rejected</th><th>Net</th>
                  <th>Status</th><th>Supervisor Note</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace:'nowrap', fontSize:12 }}>{fmt(e.submittedAt)}</td>
                    <td><span className="badge badge-blue">{e.machineId}</span></td>
                    <td>{e.shift}</td>
                    <td style={{ fontSize:12 }}>{e.startTime}–{e.endTime}</td>
                    <td style={{ fontWeight:600 }}>{e.productType}</td>
                    <td>{e.quantityProduced}</td>
                    <td style={{ color:'var(--red)' }}>{e.quantityRejected}</td>
                    <td style={{ fontWeight:700, color:'var(--green)' }}>{e.quantityProduced - e.quantityRejected}</td>
                    <td><span className={`badge ${badge(e.status)}`}>{e.status}</span></td>
                    <td style={{ fontSize:12, color:'var(--text-med)', maxWidth:200 }}>
                      {e.supervisorNote || (e.status === 'pending' ? <em style={{opacity:.5}}>Awaiting review…</em> : '—')}
                    </td>
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
