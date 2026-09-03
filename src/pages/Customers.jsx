import { useState } from 'react';
import { db } from '../db.js';

function AddModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name:'', phone:'', email:'', address:'', creditLimit: 50000 });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const handleSubmit = (e) => {
    e.preventDefault();
    const customer = { ...form, id: `c_${Date.now()}`, creditLimit: Number(form.creditLimit) };
    db.addCustomer(customer);
    onAdd();
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>👥 Add New Customer</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <form id="customer-form" onSubmit={handleSubmit}>
            <div className="form-group"><label>Company / Customer Name *</label><input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Sharma Traders" required /></div>
            <div className="form-grid-2">
              <div className="form-group"><label>Phone *</label><input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="9876543210" required /></div>
              <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="customer@email.com" /></div>
            </div>
            <div className="form-group"><label>Address</label><input value={form.address} onChange={e=>set('address',e.target.value)} placeholder="City, State" /></div>
            <div className="form-group"><label>Credit Limit (₹)</label><input type="number" value={form.creditLimit} onChange={e=>set('creditLimit',e.target.value)} /></div>
          </form>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" type="submit" form="customer-form">Add Customer</button>
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const [showAdd, setShowAdd] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const customers = db.getCustomers();
  const invoices  = db.getInvoices();

  const getRevenue = (id) => invoices.filter(i => i.customerId === id).reduce((s, i) => s + i.total, 0);

  return (
    <>
      <div className="page-head">
        <div><h1>Customers</h1><p>Manage your customer database</p></div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Customer</button>
      </div>

      <div className="stats-grid" style={{ marginBottom:20 }}>
        <div className="stat-card"><div className="stat-icon blue">👥</div><div><div className="stat-value">{customers.length}</div><div className="stat-label">Total Customers</div></div></div>
        <div className="stat-card"><div className="stat-icon green">₹</div><div><div className="stat-value">₹{customers.reduce((s,c)=>s+getRevenue(c.id),0).toLocaleString()}</div><div className="stat-label">Total Revenue</div></div></div>
      </div>

      <div className="card">
        {customers.length === 0 ? (
          <div className="empty"><div className="empty-icon">👥</div><h3>No customers yet</h3><p>Add your first customer using the button above.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Customer Name</th><th>Phone</th><th>Email</th><th>Address</th><th>Credit Limit</th><th>Total Orders</th><th>Revenue</th></tr></thead>
              <tbody>
                {customers.map((c, i) => {
                  const custInv = invoices.filter(inv => inv.customerId === c.id);
                  return (
                    <tr key={c.id}>
                      <td style={{ color:'var(--text-light)', fontWeight:600 }}>{String(i+1).padStart(2,'0')}</td>
                      <td style={{ fontWeight:700 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--blue-bg)', color:'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:14, flexShrink:0 }}>
                            {c.name.charAt(0)}
                          </div>
                          {c.name}
                        </div>
                      </td>
                      <td>{c.phone}</td>
                      <td style={{ color:'var(--text-med)', fontSize:13 }}>{c.email || '—'}</td>
                      <td style={{ fontSize:12, color:'var(--text-med)' }}>{c.address || '—'}</td>
                      <td>₹{Number(c.creditLimit).toLocaleString()}</td>
                      <td><span className="badge badge-blue">{custInv.length}</span></td>
                      <td style={{ fontWeight:700, color:'var(--green)' }}>₹{getRevenue(c.id).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={() => setRefresh(r => r+1)} />}
    </>
  );
}
