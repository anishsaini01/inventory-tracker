import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../db.js';

const PRODUCTS = ['Cup 100ml', 'Cup 200ml', 'Plate 6 inch', 'Plate 8 inch', 'Plate 10 inch'];
const DEFAULT_RATES = { 'Cup 100ml': 1.5, 'Cup 200ml': 2.5, 'Plate 6 inch': 3.0, 'Plate 8 inch': 4.0, 'Plate 10 inch': 5.0 };
const GST = 0.18;

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const customers = db.getCustomers();
  const inventory = db.getInventory();

  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ productType: 'Cup 200ml', quantity: '', rate: DEFAULT_RATES['Cup 200ml'] }]);
  const [success, setSuccess] = useState(null);
  const [errors, setErrors] = useState([]);

  const addItem = () => setItems(it => [...it, { productType: 'Cup 100ml', quantity: '', rate: DEFAULT_RATES['Cup 100ml'] }]);
  const removeItem = idx => setItems(it => it.filter((_, i) => i !== idx));
  const updateItem = (idx, key, val) => setItems(it => {
    const next = [...it];
    next[idx] = { ...next[idx], [key]: val };
    if (key === 'productType') next[idx].rate = DEFAULT_RATES[val] || 1;
    return next;
  });

  const getStock = pt => inventory.find(i => i.productType === pt)?.quantity || 0;

  const subtotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * Number(it.rate), 0);
  const tax   = Math.round(subtotal * GST);
  const total = subtotal + tax;

  const validate = () => {
    const errs = [];
    if (!customerId) errs.push('Please select a customer.');
    items.forEach((it, i) => {
      const qty = Number(it.quantity);
      const stock = getStock(it.productType);
      if (!qty || qty <= 0) errs.push(`Item ${i + 1}: Enter a valid quantity.`);
      else if (qty > stock) errs.push(`Item ${i + 1}: Only ${stock} units of ${it.productType} in stock.`);
    });
    return errs;
  };

  const handleSubmit = () => {
    const errs = validate();
    if (errs.length) { setErrors(errs); return; }
    const customer = customers.find(c => c.id === customerId);
    const builtItems = items.map(it => ({
      productType: it.productType,
      quantity: Number(it.quantity),
      rate: Number(it.rate),
      amount: Number(it.quantity) * Number(it.rate),
    }));
    const invoice = db.createInvoice({
      customerId,
      customerName: customer.name,
      items: builtItems,
      subtotal,
      tax,
      total,
      paymentStatus: 'unpaid',
      createdAt: new Date().toISOString(),
      createdBy: user.name,
    });
    setSuccess(invoice);
  };

  if (success) {
    return (
      <div style={{ maxWidth: 560 }}>
        <div className="card" style={{ textAlign:'center', padding:'40px 30px' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🎉</div>
          <h2 style={{ color:'var(--green)', marginBottom:8 }}>Invoice Created!</h2>
          <p style={{ color:'var(--text-med)', marginBottom:4 }}>Invoice Number: <strong style={{ color:'var(--primary)' }}>{success.invoiceNumber}</strong></p>
          <p style={{ color:'var(--text-med)', marginBottom:4 }}>Customer: <strong>{success.customerName}</strong></p>
          <p style={{ fontSize:22, fontWeight:800, color:'var(--text)', margin:'16px 0' }}>₹{success.total.toLocaleString()}</p>
          <div className="alert alert-info" style={{ textAlign:'left', margin:'0 0 20px' }}>
            📦 Stock automatically deducted from Live Inventory for {success.items.length} product{success.items.length>1?'s':''}.
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
            <button className="btn btn-primary" onClick={() => navigate('/invoices')}>View All Invoices</button>
            <button className="btn btn-outline" onClick={() => { setSuccess(null); setCustomerId(''); setItems([{ productType:'Cup 200ml', quantity:'', rate:2.5 }]); setErrors([]); }}>Create Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-head">
        <div><h1>Create Invoice</h1><p>Stock will be auto-deducted from Live Inventory on creation</p></div>
        <button className="btn btn-outline" onClick={() => navigate('/invoices')}>← Back</button>
      </div>

      {errors.length > 0 && (
        <div className="alert alert-error">
          {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
        </div>
      )}

      <div className="card mb-16">
        <div className="card-header"><span className="card-title">Customer Details</span></div>
        <div className="card-body">
          <div className="form-group">
            <label>Select Customer</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)} required>
              <option value="">— Select a customer —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
            </select>
          </div>
          {customerId && (() => {
            const c = customers.find(x => x.id === customerId);
            return (
              <div style={{ background:'#f8fafc', borderRadius:8, padding:12, fontSize:13, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                <div><strong>Phone:</strong> {c.phone}</div>
                <div><strong>Email:</strong> {c.email}</div>
                <div style={{ gridColumn:'span 2' }}><strong>Address:</strong> {c.address}</div>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="card mb-16">
        <div className="card-header">
          <span className="card-title">Product Line Items</span>
          <button className="btn btn-outline btn-sm" onClick={addItem}>+ Add Item</button>
        </div>
        <div className="card-body">
          {items.map((item, idx) => {
            const avail = getStock(item.productType);
            const qty   = Number(item.quantity) || 0;
            const overStock = qty > avail;
            return (
              <div key={idx} style={{ border:'1px solid var(--border)', borderRadius:8, padding:14, marginBottom:12 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>Item {idx + 1}</span>
                  {items.length > 1 && <button className="btn-ghost" style={{ color:'var(--red)' }} onClick={() => removeItem(idx)}>✕ Remove</button>}
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Product</label>
                    <select value={item.productType} onChange={e => updateItem(idx, 'productType', e.target.value)}>
                      {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                    </select>
                    <div style={{ fontSize:11, marginTop:4, color: avail < 200 ? 'var(--red)' : avail < 500 ? 'var(--orange)' : 'var(--green)', fontWeight:600 }}>
                      Available: {avail.toLocaleString()} units
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} placeholder="e.g. 500" />
                    {overStock && <div style={{ fontSize:11, color:'var(--red)', marginTop:3, fontWeight:600 }}>⚠ Exceeds available stock ({avail})</div>}
                  </div>
                  <div className="form-group">
                    <label>Rate per Unit (₹)</label>
                    <input type="number" step="0.5" min="0.5" value={item.rate} onChange={e => updateItem(idx, 'rate', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Amount</label>
                    <input value={`₹${((Number(item.quantity)||0) * Number(item.rate)).toLocaleString()}`} readOnly style={{ background:'#f8fafc', fontWeight:700 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card mb-16">
        <div className="card-header"><span className="card-title">Invoice Summary</span></div>
        <div className="card-body">
          <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:320, marginLeft:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:14 }}>
              <span>Subtotal</span><span style={{ fontWeight:600 }}>₹{subtotal.toLocaleString()}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, color:'var(--text-med)' }}>
              <span>GST (18%)</span><span>₹{tax.toLocaleString()}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:18, fontWeight:800, borderTop:'2px solid var(--border)', paddingTop:10 }}>
              <span>Total</span><span style={{ color:'var(--primary)' }}>₹{total.toLocaleString()}</span>
            </div>
          </div>
          <div className="alert alert-info" style={{ marginTop:16 }}>
            📦 On creating this invoice, stock will be automatically deducted from Live Inventory.
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:12 }}>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={subtotal === 0}>
          🧾 Create Invoice & Deduct Stock
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/invoices')}>Cancel</button>
      </div>
    </div>
  );
}
