import { useState } from 'react';
import { db } from '../db.js';

function fmt(iso) { return iso ? new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'; }

export default function Inventory() {
  const [tab, setTab] = useState('stock');
  const inventory = db.getInventory();
  const log = db.getStockLog();

  const total = inventory.reduce((s, i) => s + i.quantity, 0);
  const low   = inventory.filter(i => i.quantity < 500);

  return (
    <>
      <div className="page-head"><div><h1>Live Inventory</h1><p>Real-time stock levels — updated automatically on approval & invoice</p></div></div>

      {low.length > 0 && (
        <div className="alert alert-warn">
          ⚠ Low stock alert: {low.map(i => `${i.productType} (${i.quantity} units)`).join(', ')}
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon blue">📦</div>
          <div><div className="stat-value">{total.toLocaleString()}</div><div className="stat-label">Total Units in Stock</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div><div className="stat-value">{inventory.length - low.length}</div><div className="stat-label">Healthy Products</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">⚠</div>
          <div><div className="stat-value">{low.length}</div><div className="stat-label">Low Stock Alerts</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">🔄</div>
          <div><div className="stat-value">{log.length}</div><div className="stat-label">Stock Movements</div></div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab==='stock'?'active':''}`} onClick={() => setTab('stock')}>📦 Current Stock</button>
        <button className={`tab-btn ${tab==='log'?'active':''}`} onClick={() => setTab('log')}>🔄 Stock Log</button>
      </div>

      {tab === 'stock' && (
        <>
          <div className="stock-grid" style={{ marginBottom: 24 }}>
            {inventory.map(item => (
              <div key={item.productType} className={`stock-card ${item.quantity < 500 ? 'low' : ''}`}>
                <div className="product-icon">{item.productType.startsWith('Cup') ? '🥤' : '🍽'}</div>
                <div className="product-name">{item.productType}</div>
                <div className="product-qty">{item.quantity.toLocaleString()}</div>
                <div className="product-unit">units in stock</div>
                <div style={{ marginTop:8 }}>
                  <div style={{ height:6, background:'#e2e8f0', borderRadius:4, overflow:'hidden' }}>
                    <div style={{
                      height:'100%', borderRadius:4,
                      width: `${Math.min(100, (item.quantity / total) * 100 * 3)}%`,
                      background: item.quantity < 500 ? 'var(--orange)' : 'var(--green)'
                    }} />
                  </div>
                </div>
                {item.quantity < 500 && <div className="badge badge-orange" style={{marginTop:6}}>Low Stock</div>}
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Stock Details Table</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Available Qty</th><th>Status</th><th>Last Updated</th></tr></thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.productType}>
                      <td style={{ fontWeight:600 }}>{item.productType.startsWith('Cup') ? '🥤' : '🍽'} {item.productType}</td>
                      <td style={{ fontWeight:700, fontSize:16 }}>{item.quantity.toLocaleString()}</td>
                      <td>
                        {item.quantity < 200 ? <span className="badge badge-red">Critical</span>
                          : item.quantity < 500 ? <span className="badge badge-orange">Low</span>
                          : <span className="badge badge-green">Healthy</span>}
                      </td>
                      <td style={{ fontSize:12 }}>{fmt(item.lastUpdated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'log' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Stock Movement Log</span><span style={{fontSize:12,color:'var(--text-light)'}}>Auto-updated on approvals & invoices</span></div>
          {log.length === 0 ? (
            <div className="empty"><div className="empty-icon">🔄</div><h3>No movements yet</h3><p>Stock movements from approvals and invoices will appear here.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date/Time</th><th>Action</th><th>Product</th><th>Qty</th><th>Reference</th><th>By</th></tr></thead>
                <tbody>
                  {log.map((l, i) => (
                    <tr key={i}>
                      <td style={{ fontSize:12 }}>{fmt(l.at)}</td>
                      <td>
                        {l.action === 'IN'
                          ? <span className="badge badge-green">↑ IN</span>
                          : <span className="badge badge-red">↓ OUT</span>}
                      </td>
                      <td>{l.productType}</td>
                      <td style={{ fontWeight:700 }}>{l.quantity.toLocaleString()}</td>
                      <td style={{ color:'var(--primary)', fontWeight:600 }}>{l.ref}</td>
                      <td>{l.by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
