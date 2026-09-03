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
    const entry = {
      id: `pe_${Date.now()}`,
      workerId: user.id,
      workerName: user.name,
      machineId: form.machineId,
      productionDate: form.productionDate,
      shift: form.shift.split(' ')[0],
      startTime: form.startTime,
      endTime: form.endTime,
      hoursWorked,
      productType: form.productType,
      quantityProduced: Number(form.quantityProduced),
      quantityRejected: Number(form.quantityRejected) || 0,
      remarks: form.remarks,
      status: 'pending',
      supervisorId: null, supervisorName: null, supervisorNote: '',
      submittedAt: new Date().toISOString(), reviewedAt: null,
    };

    db.addProductionEntry(entry);
    setSuccess(true);
    setError('');
    setForm(f => ({ ...f, quantityProduced: '', quantityRejected: '', remarks: '' }));
    setTimeout(() => setSuccess(false), 4000);
  };

  const net   = Number(form.quantityProduced || 0) - Number(form.quantityRejected || 0);
  const hours = calcHours(form.startTime, form.endTime);

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="page-head">
        <div><h1>Production Entry</h1><p>Log your machine output for this shift</p></div>
      </div>

      {success && <div className="alert alert-success">✅ Entry submitted successfully! Awaiting supervisor approval.</div>}
      {error   && <div className="alert alert-error">⚠ {error}</div>}

      <div className="card">
        <div className="card-header"><span className="card-title">New Production Log</span></div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-section-title">Date & Machine Details</div>
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

            <div className="form-section-title">Production Details</div>
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
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                📊 Net output after rejection: <strong>{net > 0 ? net.toLocaleString() : 0} units</strong> of {form.productType}
                &nbsp;·&nbsp; ⏱ Shift duration: <strong>{hours}h</strong>
                {hours > 0 && net > 0 && <>&nbsp;·&nbsp; ⚡ Efficiency: <strong>{Math.round(net / hours)} units/hr</strong></>}
              </div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <button type="submit" className="btn btn-primary">Submit Entry →</button>
              <button type="button" className="btn btn-outline" onClick={() => setForm(f => ({ ...f, quantityProduced:'', quantityRejected:'', remarks:'' }))}>Clear</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
