import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db.js';
import { generateInvoicePDF } from '../generateInvoicePDF.js';

const METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Online'];

function fmt(iso) { return iso ? new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'; }
function fmtTime(iso) { return iso ? new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'; }

function statusBadge(s) {
  const map = { paid:'badge-green', unpaid:'badge-red', partial:'badge-orange' };
  return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
}

/* ── RECORD PAYMENT MODAL ── */
function PaymentModal({ invoice, onClose, onSave }) {
  const balance = invoice.total - (invoice.amountReceived || 0);
  const [amount, setAmount]   = useState('');
  const [method, setMethod]   = useState('Cash');
  const [note, setNote]       = useState('');
  const [date, setDate]       = useState(new Date().toLocaleDateString('en-CA'));
  const [error, setError]     = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0)        { setError('Enter a valid amount.'); return; }
    if (num > balance + 0.01)    { setError(`Amount cannot exceed balance of ₹${balance.toLocaleString()}.`); return; }
    onSave({ amount: num, method, note, date: new Date(date).toISOString() });
    onClose();
  };

  const newReceived = (invoice.amountReceived || 0) + Number(amount || 0);
  const newBalance  = invoice.total - newReceived;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💳 Record Payment</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Summary strip */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:20 }}>
            {[
              { label:'Invoice Total', val:`₹${invoice.total.toLocaleString()}`, color:'var(--text)' },
              { label:'Already Received', val:`₹${(invoice.amountReceived||0).toLocaleString()}`, color:'var(--green)' },
              { label:'Balance Due', val:`₹${balance.toLocaleString()}`, color: balance > 0 ? 'var(--red)' : 'var(--green)' },
            ].map(s => (
              <div key={s.label} style={{ background:'#f8fafc', border:'1px solid var(--border)', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800, color:s.color }}>{s.val}</div>
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <form id="pay-form" onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Amount Received (₹) *</label>
                <input type="number" min="1" max={balance} step="0.01"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder={`Max ₹${balance.toLocaleString()}`} required
                />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select value={method} onChange={e => setMethod(e.target.value)}>
                  {METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Payment Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Note (optional)</label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Cheque no. 123456" />
            </div>
            {error && <div className="error-msg">⚠ {error}</div>}
          </form>

          {/* Live preview */}
          {Number(amount) > 0 && (
            <div style={{ background: newBalance <= 0 ? 'var(--green-bg)' : 'var(--orange-bg)', border:`1px solid ${newBalance<=0?'#a7f3d0':'#fde68a'}`, borderRadius:8, padding:'10px 14px', fontSize:13 }}>
              {newBalance <= 0
                ? <span style={{ color:'var(--green-text)', fontWeight:600 }}>✅ This payment will mark the invoice as <strong>Fully Paid</strong></span>
                : <span style={{ color:'var(--orange-text)', fontWeight:600 }}>⏳ Remaining balance after this payment: <strong>₹{newBalance.toLocaleString()}</strong></span>
              }
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" type="submit" form="pay-form">Record Payment ✓</button>
        </div>
      </div>
    </div>
  );
}

/* ── INVOICE DETAIL MODAL ── */
function InvoiceDetailModal({ invoice, onClose, onPayment }) {
  if (!invoice) return null;
  const received = invoice.amountReceived || 0;
  const balance  = invoice.total - received;
  const pct      = Math.round((received / invoice.total) * 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth:580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>🧾 {invoice.invoiceNumber}</h3>
            <div style={{ fontSize:12, color:'var(--text-3)', marginTop:3 }}>{invoice.customerName} · {fmt(invoice.createdAt)} · by {invoice.createdBy}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Payment progress bar */}
          <div style={{ marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
              <span style={{ fontWeight:600 }}>Payment Progress</span>
              <span style={{ fontWeight:700, color: balance<=0 ? 'var(--green)' : 'var(--orange)' }}>{pct}% received</span>
            </div>
            <div style={{ height:10, background:'#e2e8f0', borderRadius:10, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background: balance<=0 ? 'var(--green)' : 'var(--orange)', borderRadius:10, transition:'width .4s' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:12 }}>
              {[
                { label:'Invoice Total', val:`₹${invoice.total.toLocaleString()}`, color:'var(--text)' },
                { label:'Amount Received', val:`₹${received.toLocaleString()}`, color:'var(--green)' },
                { label:'Balance Due', val:`₹${balance.toLocaleString()}`, color: balance>0?'var(--red)':'var(--green)' },
              ].map(s => (
                <div key={s.label} style={{ background:'#f8fafc', border:'1px solid var(--border)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                  <div style={{ fontSize:15, fontWeight:800, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Line items */}
          <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', marginBottom:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:12, padding:'8px 14px', background:'#f8fafc', fontWeight:700, fontSize:11, color:'var(--text-3)', textTransform:'uppercase' }}>
              <span>Product</span><span>Qty</span><span>Rate</span><span>Amount</span>
            </div>
            {invoice.items.map((item, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:12, padding:'10px 14px', borderTop:'1px solid var(--border)', fontSize:13 }}>
                <span style={{ fontWeight:600 }}>{item.productType}</span>
                <span>{item.quantity.toLocaleString()}</span>
                <span>₹{item.rate}</span>
                <span style={{ fontWeight:700 }}>₹{item.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, marginBottom:16 }}>
            <div style={{ display:'flex', gap:60, fontSize:13, color:'var(--text-2)' }}><span>Subtotal</span><span>₹{invoice.subtotal.toLocaleString()}</span></div>
            <div style={{ display:'flex', gap:60, fontSize:13, color:'var(--text-3)' }}><span>GST (18%)</span><span>₹{invoice.tax.toLocaleString()}</span></div>
            <div style={{ display:'flex', gap:60, fontSize:16, fontWeight:800, borderTop:'1.5px solid var(--border)', paddingTop:8, marginTop:4 }}><span>Total</span><span style={{ color:'var(--brand)' }}>₹{invoice.total.toLocaleString()}</span></div>
          </div>

          {/* Payment history */}
          {invoice.paymentHistory?.length > 0 && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Payment History</div>
              <div style={{ border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
                {invoice.paymentHistory.map((p, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom: i < invoice.paymentHistory.length-1 ? '1px solid var(--border-light)' : 'none', fontSize:13 }}>
                    <div style={{ display:'flex', align:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:8, background:'var(--green-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>💳</div>
                      <div>
                        <div style={{ fontWeight:600 }}>{p.method}</div>
                        <div style={{ fontSize:11, color:'var(--text-3)' }}>{p.note || fmtTime(p.date)}</div>
                      </div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:800, color:'var(--green)', fontSize:15 }}>+₹{p.amount.toLocaleString()}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)' }}>{fmt(p.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          <button className="btn btn-outline" onClick={() => generateInvoicePDF({ ...invoice, _customer:{} })} style={{ borderColor:'var(--brand)', color:'var(--brand)' }}>⬇ PDF</button>
          {balance > 0 && (
            <button className="btn btn-success" onClick={() => { onClose(); onPayment(invoice); }}>💳 Record Payment</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── MAIN PAGE ── */
export default function Invoices() {
  const navigate = useNavigate();
  const [filter, setFilter]   = useState('all');
  const [selected, setSelected] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const all      = db.getInvoices();
  const invoices = filter === 'all' ? all : all.filter(i => i.paymentStatus === filter);

  const handlePayment = (invoice, payData) => {
    db.recordPayment(invoice.id, payData);
    setRefresh(r => r + 1);
  };

  const totalRevenue  = all.reduce((s, i) => s + i.total, 0);
  const totalReceived = all.reduce((s, i) => s + (i.amountReceived || 0), 0);
  const totalBalance  = totalRevenue - totalReceived;
  const paidCount     = all.filter(i => i.paymentStatus === 'paid').length;

  return (
    <>
      <div className="page-head">
        <div><h1>Invoices</h1><p>Manage invoices and track payments — stock auto-deducted on creation</p></div>
        <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>🧾 + Create Invoice</button>
      </div>

      <div className="stats-grid" style={{ marginBottom:20 }}>
        <div className="stat-card"><div className="stat-icon blue">🧾</div><div><div className="stat-value">{all.length}</div><div className="stat-label">Total Invoices</div></div></div>
        <div className="stat-card"><div className="stat-icon green">✅</div><div><div className="stat-value">{paidCount}</div><div className="stat-label">Fully Paid</div></div></div>
        <div className="stat-card"><div className="stat-icon green">₹</div><div><div className="stat-value">₹{totalReceived.toLocaleString()}</div><div className="stat-label">Amount Received</div></div></div>
        <div className="stat-card"><div className="stat-icon red">⏳</div><div><div className="stat-value">₹{totalBalance.toLocaleString()}</div><div className="stat-label">Balance Pending</div></div></div>
      </div>

      <div className="tabs">
        {[['all','All'],['paid','Paid'],['partial','Partial'],['unpaid','Unpaid']].map(([k,l]) => (
          <button key={k} className={`tab-btn ${filter===k?'active':''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      <div className="card">
        {invoices.length === 0 ? (
          <div className="empty"><div className="empty-icon">🧾</div><h3>No invoices found</h3><p>Create your first invoice using the button above.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th><th>Customer</th><th>Total</th>
                  <th>Received</th><th>Balance Due</th>
                  <th>Payment</th><th>Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => {
                  const received = inv.amountReceived || 0;
                  const balance  = inv.total - received;
                  const pct      = Math.round((received / inv.total) * 100);
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontWeight:700, color:'var(--brand)' }}>{inv.invoiceNumber}</td>
                      <td style={{ fontWeight:600 }}>{inv.customerName}</td>
                      <td style={{ fontWeight:700 }}>₹{inv.total.toLocaleString()}</td>
                      <td>
                        <div style={{ fontWeight:700, color:'var(--green)' }}>₹{received.toLocaleString()}</div>
                        <div style={{ height:4, width:64, background:'#e2e8f0', borderRadius:4, marginTop:4, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background: balance<=0?'var(--green)':'var(--orange)', borderRadius:4 }} />
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight:700, color: balance<=0?'var(--green)':'var(--red)' }}>
                          {balance <= 0 ? '✓ Settled' : `₹${balance.toLocaleString()}`}
                        </span>
                      </td>
                      <td>{statusBadge(inv.paymentStatus)}</td>
                      <td style={{ fontSize:12, color:'var(--text-3)' }}>{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-outline btn-sm" onClick={() => setSelected(inv)}>View</button>
                          {balance > 0 && (
                            <button className="btn btn-success btn-sm" onClick={() => setPayTarget(inv)}>💳 Pay</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceDetailModal
        invoice={selected}
        onClose={() => setSelected(null)}
        onPayment={(inv) => setPayTarget(inv)}
      />
      {payTarget && (
        <PaymentModal
          invoice={payTarget}
          onClose={() => setPayTarget(null)}
          onSave={(data) => handlePayment(payTarget, data)}
        />
      )}
    </>
  );
}
