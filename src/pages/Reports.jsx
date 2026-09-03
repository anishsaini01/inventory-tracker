import { db } from '../db.js';

function Bar({ label, value, max, color = 'var(--primary)' }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
        <span style={{ fontWeight:600 }}>{label}</span>
        <span style={{ color:'var(--text-med)' }}>{value.toLocaleString()}</span>
      </div>
      <div style={{ height:8, background:'#e2e8f0', borderRadius:4, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:4, transition:'width .4s' }} />
      </div>
    </div>
  );
}

export default function Reports() {
  const entries   = db.getProductionEntries();
  const inventory = db.getInventory();
  const invoices  = db.getInvoices();
  const customers = db.getCustomers();

  const approved = entries.filter(e => e.status === 'approved');

  // Production by machine
  const byMachine = {};
  entries.forEach(e => {
    if (!byMachine[e.machineId]) byMachine[e.machineId] = { produced: 0, approved: 0, rejected: 0, entries: 0 };
    byMachine[e.machineId].produced += e.quantityProduced;
    byMachine[e.machineId].rejected += e.quantityRejected;
    byMachine[e.machineId].entries  += 1;
    if (e.status === 'approved') byMachine[e.machineId].approved += e.quantityProduced - e.quantityRejected;
  });

  // Production by worker
  const byWorker = {};
  entries.forEach(e => {
    if (!byWorker[e.workerName]) byWorker[e.workerName] = { produced:0, rejected:0, entries:0 };
    byWorker[e.workerName].produced += e.quantityProduced;
    byWorker[e.workerName].rejected += e.quantityRejected;
    byWorker[e.workerName].entries  += 1;
  });

  // Production by product
  const byProduct = {};
  approved.forEach(e => {
    const net = e.quantityProduced - e.quantityRejected;
    byProduct[e.productType] = (byProduct[e.productType] || 0) + net;
  });

  // Revenue by customer
  const byCustomer = {};
  invoices.forEach(inv => {
    byCustomer[inv.customerName] = (byCustomer[inv.customerName] || 0) + inv.total;
  });

  const totalProduced = entries.reduce((s,e) => s + e.quantityProduced, 0);
  const totalRejected = entries.reduce((s,e) => s + e.quantityRejected, 0);
  const rejectionRate = totalProduced ? ((totalRejected / totalProduced) * 100).toFixed(1) : 0;
  const totalRevenue  = invoices.reduce((s,i) => s + i.total, 0);
  const totalStock    = inventory.reduce((s,i) => s + i.quantity, 0);

  const maxMachine = Math.max(...Object.values(byMachine).map(v => v.produced));
  const maxWorker  = Math.max(...Object.values(byWorker).map(v => v.produced));
  const maxProduct = Math.max(...Object.values(byProduct));
  const maxCust    = Math.max(...Object.values(byCustomer));

  return (
    <>
      <div className="page-head"><div><h1>Reports & Analytics</h1><p>Production performance, inventory, and sales insights</p></div></div>

      <div className="stats-grid" style={{ marginBottom:24 }}>
        <div className="stat-card"><div className="stat-icon blue">⚙</div><div><div className="stat-value">{totalProduced.toLocaleString()}</div><div className="stat-label">Total Units Produced</div></div></div>
        <div className="stat-card"><div className="stat-icon red">❌</div><div><div className="stat-value">{rejectionRate}%</div><div className="stat-label">Rejection Rate</div></div></div>
        <div className="stat-card"><div className="stat-icon green">₹</div><div><div className="stat-value">₹{totalRevenue.toLocaleString()}</div><div className="stat-label">Total Revenue</div></div></div>
        <div className="stat-card"><div className="stat-icon purple">📦</div><div><div className="stat-value">{totalStock.toLocaleString()}</div><div className="stat-label">Live Stock Units</div></div></div>
      </div>

      <div className="grid-2" style={{ marginBottom:20 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Production by Machine</span></div>
          <div className="card-body">
            {Object.entries(byMachine).length === 0 ? <p style={{color:'var(--text-light)'}}>No data yet.</p> :
              Object.entries(byMachine).sort((a,b)=>b[1].produced-a[1].produced).map(([m, v]) => (
                <Bar key={m} label={`Machine ${m}`} value={v.produced} max={maxMachine} color="var(--primary)" />
              ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Production by Worker</span></div>
          <div className="card-body">
            {Object.entries(byWorker).length === 0 ? <p style={{color:'var(--text-light)'}}>No data yet.</p> :
              Object.entries(byWorker).sort((a,b)=>b[1].produced-a[1].produced).map(([name, v]) => (
                <Bar key={name} label={name} value={v.produced} max={maxWorker} color="var(--blue)" />
              ))}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom:20 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Approved Output by Product</span></div>
          <div className="card-body">
            {Object.entries(byProduct).length === 0 ? <p style={{color:'var(--text-light)'}}>No approved entries yet.</p> :
              Object.entries(byProduct).sort((a,b)=>b[1]-a[1]).map(([p, v]) => (
                <Bar key={p} label={p} value={v} max={maxProduct} color="var(--green)" />
              ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Revenue by Customer</span></div>
          <div className="card-body">
            {Object.entries(byCustomer).length === 0 ? <p style={{color:'var(--text-light)'}}>No invoices yet.</p> :
              Object.entries(byCustomer).sort((a,b)=>b[1]-a[1]).map(([name, v]) => (
                <Bar key={name} label={name} value={v} max={maxCust} color="var(--purple)" />
              ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title">Detailed Production Report</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Worker</th><th>Machine</th><th>Shift</th><th>Product</th><th>Produced</th><th>Rejected</th><th>Net Output</th><th>Rejection%</th><th>Status</th></tr></thead>
            <tbody>
              {entries.map(e => {
                const net = e.quantityProduced - e.quantityRejected;
                const rejPct = e.quantityProduced ? ((e.quantityRejected/e.quantityProduced)*100).toFixed(1) : 0;
                return (
                  <tr key={e.id}>
                    <td style={{ fontWeight:600 }}>{e.workerName}</td>
                    <td><span className="badge badge-blue">{e.machineId}</span></td>
                    <td>{e.shift}</td>
                    <td>{e.productType}</td>
                    <td>{e.quantityProduced.toLocaleString()}</td>
                    <td style={{ color:'var(--red)' }}>{e.quantityRejected}</td>
                    <td style={{ fontWeight:700 }}>{net.toLocaleString()}</td>
                    <td>
                      <span style={{ color: Number(rejPct) > 10 ? 'var(--red)' : Number(rejPct) > 5 ? 'var(--orange)' : 'var(--green)', fontWeight:600 }}>
                        {rejPct}%
                      </span>
                    </td>
                    <td><span className={`badge ${e.status==='approved'?'badge-green':e.status==='pending'?'badge-orange':'badge-red'}`}>{e.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
