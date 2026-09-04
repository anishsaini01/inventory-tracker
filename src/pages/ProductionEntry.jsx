import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../db.js';
import { calcHours, toDateStr } from '../utils.js';

const PRODUCTS = ['Cup 100ml', 'Cup 200ml', 'Plate 6 inch', 'Plate 8 inch', 'Plate 10 inch'];
const MACHINES = Array.from({ length: 20 }, (_, i) => `M${String(i + 1).padStart(2, '0')}`);
const SHIFTS   = ['Morning (8am–4pm)', 'Evening (4pm–12am)', 'Night (12am–8am)'];

export default function ProductionEntry() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    productionDate: toDateStr(),
    machineId: user.machineId || 'M01',
    shift: 'Morning (8am–4pm)',
    startTime: '08:00',
    endTime: '16:00',
    productType: 'Cup 200ml',
    quantityProduced: '',
    quantityRejected: '',
    remarks: '',
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.quantityProduced || Number(form.quantityProduced) <= 0) { setError('Quantity produced must be greater than 0.'); return; }
    if (Number(form.quantityRejected) >= Number(form.quantityProduced)) { setError('Rejected quantity cannot be equal to or more than produced.'); return; }

    const hoursWorked = calcHours(form.startTime, form.endTime);
    db.addProductionEntry({
      id: `pe_${Date.now()}`,
      workerId: user.id, workerName: user.name,
      machineId: form.machineId, productionDate: form.productionDate,
      shift: form.shift.split(' ')[0], startTime: form.startTime, endTime: form.endTime, hoursWorked,
      productType: form.productType,
      quantityProduced: Number(form.quantityProduced),
      quantityRejected: Number(form.quantityRejected) || 0,
      remarks: form.remarks,
      status: 'pending', supervisorId: null, supervisorName: null, supervisorNote: '',
      submittedAt: new Date().toISOString(), reviewedAt: null,
    });
    setSuccess(true); setError('');
    setForm(f => ({ ...f, quantityProduced: '', quantityRejected: '', remarks: '' }));
    setTimeout(() => setSuccess(false), 4000);
  };

  const net   = Number(form.quantityProduced || 0) - Number(form.quantityRejected || 0);
  const hours = calcHours(form.startTime, form.endTime);

  return (
    <>
      <div className="page-head">
        <div><h1>Production Entry</h1><p>Log your machine output for this shift</p></div>
      </div>

      {success && <div className="alert alert-success">✅ Entry submitted successfully! Awaiting supervisor approval.</div>}
      {error   && <div className="alert alert-error">⚠ {error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="grid-2" style={{ alignItems: 'start' }}>

          {/* ── LEFT: Shift & Machine ── */}
          <div className="card">
            <div className="card-header"><span className="card-title">Shift & Machine Details</span></div>
            <div className="card-body">
              <div className="form-group">
                <label>Production Date</label>
                <input type="date" value={form.productionDate} max={toDateStr()} onChange={e => set('productionDate', e.target.value)} required />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Machine Number</label>
                  <select value={form.machineId} onChange={e => set('machineId', e.target.value)}>
                    {MACHINES.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Shift</label>
                  <select value={form.shift} onChange={e => set('shift', e.target.value)}>
                    {SHIFTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Start Time</label>
                  <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input type="time" value={form.endTime} onChange={e => set('endTime', e.target.value)} required />
                </div>
              </div>

              {hours > 0 && (
                <div style={{ display:'flex', gap:10, marginTop:4 }}>
                  <div style={{ flex:1, background:'var(--blue-bg)', border:'1px solid #bfdbfe', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
                    <div style={{ fontSize:20, fontWeight:800, color:'var(--brand)' }}>{hours}h</div>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>Shift Duration</div>
                  </div>
                  {net > 0 && hours > 0 && (
                    <div style={{ flex:1, background:'var(--green-bg)', border:'1px solid #a7f3d0', borderRadius:8, padding:'10px 14px', textAlign:'center' }}>
                      <div style={{ fontSize:20, fontWeight:800, color:'var(--green)' }}>{Math.round(net / hours)}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)' }}>Units/Hour</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Production Details ── */}
          <div className="card">
            <div className="card-header"><span className="card-title">Production Details</span></div>
            <div className="card-body">
              <div className="form-group">
                <label>Product Type</label>
                <select value={form.productType} onChange={e => set('productType', e.target.value)}>
                  {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Quantity Produced</label>
                  <input type="number" min="1" value={form.quantityProduced} onChange={e => set('quantityProduced', e.target.value)} placeholder="e.g. 1500" required />
                </div>
                <div className="form-group">
                  <label>Quantity Rejected / Defective</label>
                  <input type="number" min="0" value={form.quantityRejected} onChange={e => set('quantityRejected', e.target.value)} placeholder="e.g. 30" />
                </div>
              </div>
              <div className="form-group">
                <label>Remarks (optional)</label>
                <textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Any machine issues, downtime, or notes..." />
              </div>

              {form.quantityProduced > 0 && (
                <div style={{ background:'#f8fafc', border:'1px solid var(--border)', borderRadius:8, padding:'12px 16px', marginBottom:16 }}>
                  <div style={{ fontSize:12, color:'var(--text-3)', fontWeight:600, marginBottom:8 }}>PREVIEW</div>
                  <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontSize:18, fontWeight:800, color:'var(--brand)' }}>{net > 0 ? net.toLocaleString() : 0}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)' }}>Net Units</div>
                    </div>
                    <div>
                      <div style={{ fontSize:18, fontWeight:800, color:'var(--red)' }}>{form.quantityRejected || 0}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)' }}>Rejected</div>
                    </div>
                    {hours > 0 && net > 0 && (
                      <div>
                        <div style={{ fontSize:18, fontWeight:800, color:'var(--green)' }}>{Math.round(net / hours)}</div>
                        <div style={{ fontSize:11, color:'var(--text-3)' }}>Units/Hour</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display:'flex', gap:10 }}>
                <button type="submit" className="btn btn-primary">Submit Entry →</button>
                <button type="button" className="btn btn-outline" onClick={() => setForm(f => ({ ...f, quantityProduced:'', quantityRejected:'', remarks:'' }))}>Clear</button>
              </div>
            </div>
          </div>

        </div>
      </form>
    </>
  );
}
