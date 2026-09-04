import { useState } from 'react';
import { db } from '../db.js';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, RadialBarChart, RadialBar,
} from 'recharts';

const COLORS = {
  primary:   '#4318FF',
  secondary: '#868CFF',
  green:     '#01B574',
  orange:    '#FFB547',
  red:       '#EE5D50',
  blue:      '#39CFFE',
  teal:      '#05CD99',
};

const PIE_PALETTE = ['#4318FF','#868CFF','#01B574','#FFB547','#EE5D50','#39CFFE'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #E0E5F2', borderRadius:12, padding:'10px 14px', boxShadow:'14px 17px 40px 4px rgba(112,144,176,0.2)', fontFamily:'DM Sans, sans-serif' }}>
      {label && <p style={{ fontWeight:800, fontSize:12, color:'#1B2559', marginBottom:6 }}>{label}</p>}
      {payload.map(p => (
        <p key={p.name} style={{ fontSize:12, color:p.color || '#4318FF', fontWeight:700, marginBottom:2 }}>
          {p.name}: <span style={{ color:'#1B2559' }}>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid #E0E5F2', borderRadius:12, padding:'10px 14px', boxShadow:'14px 17px 40px 4px rgba(112,144,176,0.2)', fontFamily:'DM Sans, sans-serif' }}>
      <p style={{ fontWeight:800, fontSize:12, color:'#1B2559', marginBottom:3 }}>{payload[0].name}</p>
      <p style={{ fontSize:12, fontWeight:700, color: payload[0].payload.fill }}>{payload[0].value.toLocaleString()} units</p>
      <p style={{ fontSize:11, color:'#A3AED0' }}>{payload[0].payload.pct}% of total</p>
    </div>
  );
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize:11, fontWeight:800, fontFamily:'DM Sans, sans-serif' }}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState('production');

  const entries   = db.getProductionEntries();
  const inventory = db.getInventory();
  const invoices  = db.getInvoices();

  const approved = entries.filter(e => e.status === 'approved');
  const totalProduced = entries.reduce((s,e) => s + e.quantityProduced, 0);
  const totalRejected = entries.reduce((s,e) => s + e.quantityRejected, 0);
  const rejectionRate = totalProduced ? ((totalRejected / totalProduced) * 100).toFixed(1) : 0;
  const totalRevenue  = invoices.reduce((s,i) => s + i.total, 0);
  const totalReceived = invoices.reduce((s,i) => s + (i.amountReceived || 0), 0);
  const totalStock    = inventory.reduce((s,i) => s + i.quantity, 0);

  /* ── Production by Machine ── */
  const machineMap = {};
  entries.forEach(e => {
    if (!machineMap[e.machineId]) machineMap[e.machineId] = { machine: e.machineId, Produced: 0, Rejected: 0, Net: 0 };
    machineMap[e.machineId].Produced += e.quantityProduced;
    machineMap[e.machineId].Rejected += e.quantityRejected;
    if (e.status === 'approved') machineMap[e.machineId].Net += e.quantityProduced - e.quantityRejected;
  });
  const machineData = Object.values(machineMap).sort((a,b) => b.Produced - a.Produced);

  /* ── Production by Worker ── */
  const workerMap = {};
  entries.forEach(e => {
    if (!workerMap[e.workerName]) workerMap[e.workerName] = { name: e.workerName.split(' ')[0], Produced: 0, Rejected: 0, Net: 0 };
    workerMap[e.workerName].Produced += e.quantityProduced;
    workerMap[e.workerName].Rejected += e.quantityRejected;
    if (e.status === 'approved') workerMap[e.workerName].Net += e.quantityProduced - e.quantityRejected;
  });
  const workerData = Object.values(workerMap).sort((a,b) => b.Produced - a.Produced);

  /* ── Product Mix Pie ── */
  const productMap = {};
  approved.forEach(e => {
    const net = e.quantityProduced - e.quantityRejected;
    productMap[e.productType] = (productMap[e.productType] || 0) + net;
  });
  const totalProductNet = Object.values(productMap).reduce((s,v) => s+v, 0);
  const productPieData = Object.entries(productMap).sort((a,b) => b[1]-a[1]).map(([name, value], i) => ({
    name, value, fill: PIE_PALETTE[i % PIE_PALETTE.length],
    pct: totalProductNet ? ((value/totalProductNet)*100).toFixed(1) : 0,
  }));

  /* ── 7-Day Production Trend ── */
  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const label = d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
    const dateStr = d.toLocaleDateString('en-CA');
    const dayEntries = entries.filter(e => e.productionDate === dateStr);
    trendData.push({
      day: label,
      Produced: dayEntries.reduce((s,e) => s+e.quantityProduced, 0),
      Net: dayEntries.filter(e=>e.status==='approved').reduce((s,e) => s+(e.quantityProduced-e.quantityRejected), 0),
      Rejected: dayEntries.reduce((s,e) => s+e.quantityRejected, 0),
    });
  }

  /* ── Revenue by Customer ── */
  const customerMap = {};
  invoices.forEach(inv => {
    if (!customerMap[inv.customerName]) customerMap[inv.customerName] = { name: inv.customerName.split(' ')[0], Revenue: 0, Received: 0 };
    customerMap[inv.customerName].Revenue  += inv.total;
    customerMap[inv.customerName].Received += inv.amountReceived || 0;
  });
  const customerData = Object.values(customerMap).sort((a,b) => b.Revenue - a.Revenue);

  /* ── Shift Distribution ── */
  const shiftMap = {};
  entries.forEach(e => { shiftMap[e.shift] = (shiftMap[e.shift] || 0) + 1; });
  const shiftData = Object.entries(shiftMap).map(([name, value], i) => ({ name, value, fill: PIE_PALETTE[i] }));

  /* ── Inventory Radial ── */
  const maxStock = Math.max(...inventory.map(i => i.quantity));
  const inventoryRadial = inventory.map((item, i) => ({
    name: item.productType,
    value: item.quantity,
    fill: PIE_PALETTE[i % PIE_PALETTE.length],
  }));

  const tabs = [
    { key: 'production', label: '⚙ Production' },
    { key: 'quality',    label: '🎯 Quality' },
    { key: 'inventory',  label: '📦 Inventory' },
    { key: 'sales',      label: '💰 Sales' },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reports & Analytics</h1>
          <p>Production performance, quality metrics, inventory, and sales insights</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Units Produced</div>
            <div className="stat-value">{totalProduced.toLocaleString()}</div>
            <div className="stat-trend up">↑ All entries</div>
          </div>
          <div className="stat-icon blue">⚙</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Rejection Rate</div>
            <div className="stat-value">{rejectionRate}%</div>
            <div className="stat-trend" style={{ color: Number(rejectionRate) > 10 ? 'var(--red)' : Number(rejectionRate) > 5 ? 'var(--orange)' : 'var(--green)' }}>
              {Number(rejectionRate) > 10 ? '⚠ High' : Number(rejectionRate) > 5 ? '⚠ Moderate' : '✓ Healthy'}
            </div>
          </div>
          <div className="stat-icon red">🎯</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">₹{totalRevenue.toLocaleString()}</div>
            <div className="stat-trend up">↑ {invoices.length} invoices</div>
          </div>
          <div className="stat-icon purple">₹</div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <div className="stat-label">Live Stock Units</div>
            <div className="stat-value">{totalStock.toLocaleString()}</div>
            <div className="stat-trend up">↑ {inventory.length} products</div>
          </div>
          <div className="stat-icon green">📦</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PRODUCTION TAB ── */}
      {activeTab === 'production' && (
        <>
          {/* 7-Day Trend */}
          <div className="card mb-24">
            <div className="card-header">
              <div>
                <div className="card-title">7-Day Production Trend</div>
                <div className="card-subtitle">Daily produced vs net approved vs rejected</div>
              </div>
            </div>
            <div className="card-body" style={{ paddingTop:8 }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData} margin={{ top:10, right:20, left:-10, bottom:0 }}>
                  <defs>
                    <linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gNet2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gRej" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.red} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={COLORS.red} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false}/>
                  <XAxis dataKey="day" tick={{ fontSize:11, fontWeight:600, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:11, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip />}/>
                  <Legend wrapperStyle={{ fontSize:12, fontWeight:700, paddingTop:16 }}/>
                  <Area type="monotone" dataKey="Produced" stroke={COLORS.secondary} strokeWidth={2} fill="url(#gProd)" dot={false}/>
                  <Area type="monotone" dataKey="Net"      stroke={COLORS.primary}   strokeWidth={2.5} fill="url(#gNet2)" dot={{ r:3, fill:COLORS.primary, strokeWidth:0 }}/>
                  <Area type="monotone" dataKey="Rejected" stroke={COLORS.red}       strokeWidth={1.5} fill="url(#gRej)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid-2 mb-24">
            {/* By Machine */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Production by Machine</div>
                  <div className="card-subtitle">Produced vs net output</div>
                </div>
              </div>
              <div className="card-body" style={{ paddingTop:8 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={machineData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false}/>
                    <XAxis dataKey="machine" tick={{ fontSize:11, fontWeight:700, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Legend wrapperStyle={{ fontSize:12, fontWeight:700, paddingTop:12 }}/>
                    <Bar dataKey="Produced" fill={COLORS.secondary} radius={[4,4,0,0]}/>
                    <Bar dataKey="Net"      fill={COLORS.primary}   radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* By Worker */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Production by Worker</div>
                  <div className="card-subtitle">Gross produced vs net approved</div>
                </div>
              </div>
              <div className="card-body" style={{ paddingTop:8 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={workerData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fontSize:11, fontWeight:700, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Legend wrapperStyle={{ fontSize:12, fontWeight:700, paddingTop:12 }}/>
                    <Bar dataKey="Produced" fill={COLORS.blue}    radius={[4,4,0,0]}/>
                    <Bar dataKey="Net"      fill={COLORS.green}   radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Shift Distribution */}
          <div className="card mb-24">
            <div className="card-header">
              <div>
                <div className="card-title">Entries by Shift</div>
                <div className="card-subtitle">Distribution of production entries across shifts</div>
              </div>
            </div>
            <div className="card-body" style={{ display:'flex', alignItems:'center', gap:40, flexWrap:'wrap', paddingTop:8 }}>
              <ResponsiveContainer width={220} height={220}>
                <PieChart>
                  <Pie data={shiftData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    dataKey="value" labelLine={false} label={renderCustomLabel}>
                    {shiftData.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
                  </Pie>
                  <Tooltip content={<PieTooltip />}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {shiftData.map(s => (
                  <div key={s.name} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                    <div style={{ width:12, height:12, borderRadius:3, background:s.fill, flexShrink:0 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{s.name} Shift</span>
                        <span style={{ fontSize:13, fontWeight:800, color:'var(--brand)' }}>{s.value} entries</span>
                      </div>
                      <div style={{ height:6, background:'#F4F7FE', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${(s.value / entries.length) * 100}%`, background:s.fill, borderRadius:4 }}/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── QUALITY TAB ── */}
      {activeTab === 'quality' && (
        <>
          <div className="grid-2 mb-24">
            {/* Rejection by Worker */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Rejection by Worker</div>
                  <div className="card-subtitle">Defective units per worker</div>
                </div>
              </div>
              <div className="card-body" style={{ paddingTop:8 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={workerData} margin={{ top:5, right:10, left:-20, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fontSize:11, fontWeight:700, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Bar dataKey="Rejected" radius={[6,6,0,0]}>
                      {workerData.map((entry, i) => {
                        const rate = entry.Produced ? (entry.Rejected / entry.Produced) * 100 : 0;
                        return <Cell key={i} fill={rate > 10 ? COLORS.red : rate > 5 ? COLORS.orange : COLORS.green}/>;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Product Mix Pie */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Approved Output by Product</div>
                  <div className="card-subtitle">Net units added to inventory</div>
                </div>
              </div>
              <div className="card-body" style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap', paddingTop:8 }}>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={productPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80}
                      dataKey="value" labelLine={false} label={renderCustomLabel}>
                      {productPieData.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
                    </Pie>
                    <Tooltip content={<PieTooltip />}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex:1, minWidth:120 }}>
                  {productPieData.map(p => (
                    <div key={p.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, gap:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:10, height:10, borderRadius:2, background:p.fill, flexShrink:0 }}/>
                        <span style={{ fontSize:12, fontWeight:600, color:'var(--text-2)' }}>{p.name}</span>
                      </div>
                      <span style={{ fontSize:12, fontWeight:800, color:'var(--brand)' }}>{p.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Rejection Rate Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Quality Report — All Entries</div>
                <div className="card-subtitle">Rejection rates per production entry</div>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Worker</th><th>Machine</th><th>Product</th><th>Produced</th><th>Rejected</th><th>Net</th><th>Rej %</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {entries.map(e => {
                    const net = e.quantityProduced - e.quantityRejected;
                    const rejPct = e.quantityProduced ? ((e.quantityRejected/e.quantityProduced)*100).toFixed(1) : 0;
                    return (
                      <tr key={e.id}>
                        <td style={{ fontWeight:700 }}>{e.workerName}</td>
                        <td><span className="badge badge-purple">{e.machineId}</span></td>
                        <td style={{ color:'var(--text-2)', fontSize:13 }}>{e.productType}</td>
                        <td style={{ fontWeight:700 }}>{e.quantityProduced.toLocaleString()}</td>
                        <td style={{ fontWeight:700, color:'var(--red)' }}>{e.quantityRejected}</td>
                        <td style={{ fontWeight:800, color:'var(--brand)' }}>{net.toLocaleString()}</td>
                        <td>
                          <span style={{ fontWeight:800, padding:'3px 10px', borderRadius:20, fontSize:12,
                            background: Number(rejPct)>10?'var(--red-bg)':Number(rejPct)>5?'var(--orange-bg)':'var(--green-bg)',
                            color:      Number(rejPct)>10?'var(--red-text)':Number(rejPct)>5?'var(--orange-text)':'var(--green-text)',
                          }}>
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
      )}

      {/* ── INVENTORY TAB ── */}
      {activeTab === 'inventory' && (
        <>
          <div className="grid-2 mb-24">
            {/* Stock Bar */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Stock Levels by Product</div>
                  <div className="card-subtitle">Current units available</div>
                </div>
              </div>
              <div className="card-body" style={{ paddingTop:8 }}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={inventory.map((item,i) => ({ name: item.productType.replace(' inch','″'), Stock: item.quantity, fill: item.quantity < 500 ? COLORS.orange : PIE_PALETTE[i % PIE_PALETTE.length] }))}
                    margin={{ top:5, right:10, left:-10, bottom:0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fontSize:10, fontWeight:700, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Bar dataKey="Stock" radius={[8,8,0,0]}>
                      {inventory.map((item, i) => (
                        <Cell key={i} fill={item.quantity < 500 ? COLORS.orange : PIE_PALETTE[i % PIE_PALETTE.length]}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radial / Pie */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Stock Distribution</div>
                  <div className="card-subtitle">Share of total inventory per product</div>
                </div>
              </div>
              <div className="card-body" style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap', paddingTop:8 }}>
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={inventory.map((item,i) => ({ name:item.productType, value:item.quantity, fill:PIE_PALETTE[i%PIE_PALETTE.length], pct: totalStock ? ((item.quantity/totalStock)*100).toFixed(1) : 0 }))}
                      cx="50%" cy="50%" innerRadius={50} outerRadius={85}
                      dataKey="value" labelLine={false} label={renderCustomLabel}>
                      {inventory.map((_, i) => <Cell key={i} fill={PIE_PALETTE[i%PIE_PALETTE.length]}/>)}
                    </Pie>
                    <Tooltip content={<PieTooltip />}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex:1, minWidth:140 }}>
                  {inventory.map((item, i) => (
                    <div key={item.productType} style={{ marginBottom:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:10, height:10, borderRadius:2, background:PIE_PALETTE[i%PIE_PALETTE.length], flexShrink:0 }}/>
                          <span style={{ fontSize:12, fontWeight:600, color:'var(--text-2)' }}>{item.productType}</span>
                        </div>
                        <span style={{ fontSize:12, fontWeight:800, color: item.quantity < 500 ? 'var(--orange)' : 'var(--brand)' }}>
                          {item.quantity.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ height:5, background:'#F4F7FE', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${totalStock?(item.quantity/totalStock)*100:0}%`, background:PIE_PALETTE[i%PIE_PALETTE.length], borderRadius:3 }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stock Table */}
          <div className="card">
            <div className="card-header"><div className="card-title">Inventory Detail</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Product</th><th>Stock</th><th>Status</th><th>% of Total</th><th>Last Updated</th></tr></thead>
                <tbody>
                  {inventory.map(item => {
                    const pct = totalStock ? ((item.quantity/totalStock)*100).toFixed(1) : 0;
                    return (
                      <tr key={item.productType}>
                        <td style={{ fontWeight:700 }}>{item.productType}</td>
                        <td style={{ fontWeight:800, color:'var(--brand)', fontSize:15 }}>{item.quantity.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${item.quantity < 500 ? 'badge-orange' : item.quantity < 1000 ? 'badge-blue' : 'badge-green'}`}>
                            {item.quantity < 500 ? 'Low Stock' : item.quantity < 1000 ? 'Moderate' : 'Healthy'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ height:6, width:80, background:'#F4F7FE', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${pct}%`, background:'var(--brand)', borderRadius:3 }}/>
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color:'var(--text-3)' }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ fontSize:12, color:'var(--text-3)' }}>{new Date(item.lastUpdated).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── SALES TAB ── */}
      {activeTab === 'sales' && (
        <>
          <div className="grid-2 mb-24">
            {/* Revenue by Customer */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Revenue by Customer</div>
                  <div className="card-subtitle">Billed vs received per customer</div>
                </div>
              </div>
              <div className="card-body" style={{ paddingTop:8 }}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={customerData} margin={{ top:5, right:10, left:-10, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F7FE" vertical={false}/>
                    <XAxis dataKey="name" tick={{ fontSize:11, fontWeight:700, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:11, fill:'#A3AED0' }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip />}/>
                    <Legend wrapperStyle={{ fontSize:12, fontWeight:700, paddingTop:12 }}/>
                    <Bar dataKey="Revenue"  fill={COLORS.primary} radius={[4,4,0,0]}/>
                    <Bar dataKey="Received" fill={COLORS.green}   radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Status Pie */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">Payment Status</div>
                  <div className="card-subtitle">Invoice breakdown by status</div>
                </div>
              </div>
              <div className="card-body" style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap', paddingTop:8 }}>
                {(() => {
                  const paid    = invoices.filter(i => i.paymentStatus === 'paid').length;
                  const partial = invoices.filter(i => i.paymentStatus === 'partial').length;
                  const unpaid  = invoices.filter(i => i.paymentStatus === 'unpaid').length;
                  const pieData = [
                    { name:'Paid',    value: paid,    fill: COLORS.green,  pct: invoices.length ? ((paid/invoices.length)*100).toFixed(0) : 0 },
                    { name:'Partial', value: partial, fill: COLORS.orange, pct: invoices.length ? ((partial/invoices.length)*100).toFixed(0) : 0 },
                    { name:'Unpaid',  value: unpaid,  fill: COLORS.red,    pct: invoices.length ? ((unpaid/invoices.length)*100).toFixed(0) : 0 },
                  ].filter(d => d.value > 0);
                  return (
                    <>
                      <ResponsiveContainer width={180} height={180}>
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80}
                            dataKey="value" labelLine={false} label={renderCustomLabel}>
                            {pieData.map((entry, i) => <Cell key={i} fill={entry.fill}/>)}
                          </Pie>
                          <Tooltip content={<PieTooltip />}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ flex:1 }}>
                        {pieData.map(p => (
                          <div key={p.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div style={{ width:12, height:12, borderRadius:3, background:p.fill }}/>
                              <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{p.name}</span>
                            </div>
                            <div style={{ textAlign:'right' }}>
                              <div style={{ fontSize:16, fontWeight:800, color:p.fill }}>{p.value}</div>
                              <div style={{ fontSize:11, color:'var(--text-3)' }}>{p.pct}%</div>
                            </div>
                          </div>
                        ))}
                        <div style={{ paddingTop:12, borderTop:'1px solid var(--border)', marginTop:4 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-2)', marginBottom:4 }}>
                            <span style={{ fontWeight:600 }}>Total Billed</span>
                            <span style={{ fontWeight:800, color:'var(--brand)' }}>₹{totalRevenue.toLocaleString()}</span>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-2)' }}>
                            <span style={{ fontWeight:600 }}>Collected</span>
                            <span style={{ fontWeight:800, color:'var(--green)' }}>₹{totalReceived.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Invoice Table */}
          <div className="card">
            <div className="card-header"><div className="card-title">All Invoices</div></div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Invoice #</th><th>Customer</th><th>Total</th><th>Received</th><th>Balance</th><th>Status</th><th>Created By</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {invoices.map(inv => {
                    const rec = inv.amountReceived || 0;
                    const bal = inv.total - rec;
                    const pct = Math.round((rec / inv.total) * 100);
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight:800, color:'var(--brand)', fontSize:13 }}>{inv.invoiceNumber}</td>
                        <td style={{ fontWeight:700 }}>{inv.customerName}</td>
                        <td style={{ fontWeight:800 }}>₹{inv.total.toLocaleString()}</td>
                        <td>
                          <div style={{ fontWeight:700, color:'var(--green)' }}>₹{rec.toLocaleString()}</div>
                          <div style={{ height:4, width:56, background:'#E0E5F2', borderRadius:3, marginTop:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background: pct>=100?'var(--green)':'var(--orange)', borderRadius:3 }}/>
                          </div>
                        </td>
                        <td style={{ fontWeight:700, color: bal > 0 ? 'var(--red)' : 'var(--green)' }}>
                          {bal > 0 ? `₹${bal.toLocaleString()}` : '✓ Settled'}
                        </td>
                        <td><span className={`badge ${inv.paymentStatus==='paid'?'badge-green':inv.paymentStatus==='partial'?'badge-blue':'badge-red'}`}>{inv.paymentStatus}</span></td>
                        <td style={{ fontSize:12, color:'var(--text-3)' }}>{inv.createdBy}</td>
                        <td style={{ fontSize:12, color:'var(--text-3)' }}>{new Date(inv.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
