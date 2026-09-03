import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db.js';

function fmt(iso) { return iso ? new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'; }

function InvoiceDetailModal({ invoice, onClose, onUpdatePayment }) {
  if (!invoice) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🧾 {invoice.invoiceNumber}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16, fontSize:13 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15 }}>{invoice.customerName}</div>
              <div style={{ color:'var(--text-med)', marginTop:2 }}>Date: {fmt(invoice.createdAt)}</div>
              <div style={{ color:'var(--text-med)' }}>Created by: {invoice.createdBy}</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <span className={`badge ${invoice.paymentStatus==='paid'?'badge-green':invoice.paymentStatus==='partial'?'badge-blue':'badge-red'}`} style={{fontSize:13,padding:'4px 14px'}}>
                {invoice.paymentStatus}
              </span>
            </div>
          </div>

          <div className="invoice-line-items">
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto', gap:12, padding:'8px 14px', background:'#f8fafc', fontWeight:700, fontSize:12, color:'var(--text-light)', textTransform:'uppercase' }}>
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

          <div className="invoice-totals" style={{ marginTop:12 }}>
            <div className="row"><span>Subtotal</span><span>₹{invoice.subtotal.toLocaleString()}</span></div>
            <div className="row"><span>GST (18%)</span><span>₹{invoice.tax.toLocaleString()}</span></div>
            <div className="row total"><span>Total</span><span>₹{invoice.total.toLocaleString()}</span></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          {invoice.paymentStatus !== 'paid' && (
            <button className="btn btn-success" onClick={() => { onUpdatePayment(invoice.id, 'paid'); onClose(); }}>
              Mark as Paid ✓
            </button>
          )}
          {invoice.paymentStatus === 'unpaid' && (
            <button className="btn btn-warning" onClick={() => { onUpdatePayment(invoice.id, 'partial'); onClose(); }}>
              Mark Partial
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Invoices() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const all      = db.getInvoices();
  const invoices = filter === 'all' ? all : all.filter(i => i.paymentStatus === filter);

  const handleUpdatePayment = (id, status) => {
    db.updatePaymentStatus(id, status);
    setRefresh(r => r + 1);
  };

  const revenue = all.reduce((s, i) => s + i.total, 0);
  const paid    = all.filter(i => i.paymentStatus === 'paid').reduce((s, i) => s + i.total, 0);
  const pending = all.filter(i => i.paymentStatus !== 'paid').reduce((s, i) => s + i.total, 0);

  return (
    <>
      <div className="page-head">
        <div><h1>Invoices</h1><p>Manage customer invoices — stock auto-deducted on creation</p></div>
        <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>🧾 + Create Invoice</button>
      </div>

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card"><div className="stat-icon blue">🧾</div><div><div className="stat-value">{all.length}</div><div className="stat-label">Total Invoices</div></div></div>
        <div className="stat-card"><div className="stat-icon green">₹</div><div><div className="stat-value">₹{revenue.toLocaleString()}</div><div className="stat-label">Total Revenue</div></div></div>
        <div className="stat-card"><div className="stat-icon orange">✅</div><div><div className="stat-value">₹{paid.toLocaleString()}</div><div className="stat-label">Collected</div></div></div>
        <div className="stat-card"><div className="stat-icon red">⏳</div><div><div className="stat-value">₹{pending.toLocaleString()}</div><div className="stat-label">Pending</div></div></div>
      </div>

      <div className="tabs">
        {[['all','All'],['paid','Paid'],['unpaid','Unpaid'],['partial','Partial']].map(([k,l]) => (
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
                <tr><th>Invoice #</th><th>Customer</th><th>Items</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Payment</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight:700, color:'var(--primary)' }}>{inv.invoiceNumber}</td>
                    <td style={{ fontWeight:600 }}>{inv.customerName}</td>
                    <td><span className="badge badge-blue">{inv.items.length} item{inv.items.length>1?'s':''}</span></td>
                    <td>₹{inv.subtotal.toLocaleString()}</td>
                    <td style={{ color:'var(--text-med)' }}>₹{inv.tax.toLocaleString()}</td>
                    <td style={{ fontWeight:800, fontSize:15 }}>₹{inv.total.toLocaleString()}</td>
                    <td>
                      <span className={`badge ${inv.paymentStatus==='paid'?'badge-green':inv.paymentStatus==='partial'?'badge-blue':'badge-red'}`}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                    <td style={{ fontSize:12 }}>{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => setSelected(inv)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InvoiceDetailModal invoice={selected} onClose={() => setSelected(null)} onUpdatePayment={handleUpdatePayment} />
    </>
  );
}
