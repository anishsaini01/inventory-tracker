import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../db.js';

function fmt(iso) { return iso ? new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'; }

function Modal({ entry, mode, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  if (!entry) return null;
  const net = entry.quantityProduced - entry.quantityRejected;
  const isApprove = mode === 'approve';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isApprove ? '✅ Approve Entry' : '❌ Reject Entry'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ background:'#f8fafc', borderRadius:8, padding:14, marginBottom:16, fontSize:13 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div><strong>Worker:</strong> {entry.workerName}</div>
              <div><strong>Machine:</strong> {entry.machineId}</div>
              <div><strong>Product:</strong> {entry.productType}</div>
              <div><strong>Shift:</strong> {entry.shift}</div>
              <div><strong>Produced:</strong> {entry.quantityProduced}</div>
              <div><strong>Rejected:</strong> <span style={{color:'var(--red)'}}>{entry.quantityRejected}</span></div>
            </div>
            {isApprove && (
              <div style={{ marginTop:10, padding:'8px 12px', background:'var(--green-bg)', borderRadius:6, color:'#065f46', fontWeight:600 }}>
                ✅ Net {net} units of <em>{entry.productType}</em> will be added to Live Inventory.
              </div>
            )}
          </div>
          {entry.remarks && (
            <div style={{ marginBottom:12, fontSize:13, color:'var(--text-med)' }}>
              <strong>Worker Remarks:</strong> {entry.remarks}
            </div>
          )}
          <div className="form-group">
            <label>{isApprove ? 'Approval Note (optional)' : 'Rejection Reason *'}</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={isApprove ? 'e.g. Stock physically verified.' : 'Please provide a reason…'} required={!isApprove ? true : false} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button
            className={`btn ${isApprove ? 'btn-success' : 'btn-danger'}`}
            onClick={() => { if (!isApprove && !note.trim()) return; onConfirm(entry.id, note); }}
          >
            {isApprove ? '✅ Confirm Approve' : '❌ Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Approvals() {
  const { user } = useAuth();
  const [tab, setTab] = useState('pending');
  const [modal, setModal] = useState(null);
  const [mode, setMode] = useState('approve');
  const [refresh, setRefresh] = useState(0);

  const all     = db.getProductionEntries();
  const pending  = all.filter(e => e.status === 'pending');
  const approved = all.filter(e => e.status === 'approved');
  const rejected = all.filter(e => e.status === 'rejected');
  const shown = { pending, approved, rejected }[tab];

  const openModal = (entry, m) => { setModal(entry); setMode(m); };

  const handleConfirm = (id, note) => {
    if (mode === 'approve') db.approveEntry(id, { id: user.id, name: user.name }, note);
    else db.rejectEntry(id, { id: user.id, name: user.name }, note);
    setModal(null);
    setRefresh(r => r + 1);
  };

  const badge = s => ({ approved:'badge-green', pending:'badge-orange', rejected:'badge-red' })[s];

  return (
    <>
      <div className="page-head"><div><h1>Approval Queue</h1><p>Review, verify, and approve production entries</p></div></div>

      {pending.length > 0 && tab !== 'pending' && (
        <div className="alert alert-warn">⚠ {pending.length} entries are still pending your review.</div>
      )}

      <div className="tabs">
        {[['pending','⏳ Pending',pending.length],['approved','✅ Approved',approved.length],['rejected','❌ Rejected',rejected.length]].map(([k,l,c]) => (
          <button key={k} className={`tab-btn ${tab===k?'active':''}`} onClick={() => setTab(k)}>
            {l} <span style={{opacity:.7}}>({c})</span>
          </button>
        ))}
      </div>

      <div className="card">
        {shown.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">{tab==='pending'?'✅':'📋'}</div>
            <h3>{tab==='pending' ? 'No pending approvals' : `No ${tab} entries`}</h3>
            <p>{tab==='pending' ? 'All entries have been reviewed.' : 'Entries in this status will appear here.'}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Worker</th><th>Machine</th><th>Shift</th><th>Product</th>
                  <th>Produced</th><th>Rejected</th><th>Net</th>
                  <th>Submitted</th>
                  {tab !== 'pending' && <><th>Reviewed By</th><th>Note</th><th>Reviewed</th></>}
                  {tab === 'pending' && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {shown.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight:600 }}>{e.workerName}</td>
                    <td><span className="badge badge-blue">{e.machineId}</span></td>
                    <td>{e.shift}</td>
                    <td>{e.productType}</td>
                    <td>{e.quantityProduced}</td>
                    <td style={{ color:'var(--red)' }}>{e.quantityRejected}</td>
                    <td style={{ fontWeight:700 }}>{e.quantityProduced - e.quantityRejected}</td>
                    <td style={{ fontSize:12 }}>{fmt(e.submittedAt)}</td>
                    {tab !== 'pending' && (
                      <>
                        <td>{e.supervisorName}</td>
                        <td style={{ fontSize:12, maxWidth:160, color:'var(--text-med)' }}>{e.supervisorNote || '—'}</td>
                        <td style={{ fontSize:12 }}>{fmt(e.reviewedAt)}</td>
                      </>
                    )}
                    {tab === 'pending' && (
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-success btn-sm" onClick={() => openModal(e, 'approve')}>✅ Approve</button>
                          <button className="btn btn-danger btn-sm"  onClick={() => openModal(e, 'reject')}>✗ Reject</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal entry={modal} mode={mode} onClose={() => setModal(null)} onConfirm={handleConfirm} />
    </>
  );
}
