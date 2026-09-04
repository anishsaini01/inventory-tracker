import { useState } from 'react';
import { db } from '../db.js';
import { calcHours, isToday, isThisWeek, isThisMonth, fmtHours } from '../utils.js';

function StatPill({ label, value, color = 'var(--primary)' }) {
  return (
    <div style={{ background:'white', border:`2px solid ${color}20`, borderRadius:10, padding:'14px 18px', textAlign:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize:22, fontWeight:800, color }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--text-light)', fontWeight:600, marginTop:2 }}>{label}</div>
    </div>
  );
}

function MedalIcon({ rank }) {
  if (rank === 1) return <span style={{ fontSize:20 }}>🥇</span>;
  if (rank === 2) return <span style={{ fontSize:20 }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize:20 }}>🥉</span>;
  return <span style={{ fontWeight:700, color:'var(--text-light)', fontSize:13 }}>#{rank}</span>;
}

function Bar({ value, max, color }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:8, background:'#e2e8f0', borderRadius:4, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:4 }} />
      </div>
      <span style={{ fontSize:11, fontWeight:700, color, minWidth:30, textAlign:'right' }}>{pct}%</span>
    </div>
  );
}

// Compute hours from entry — if hoursWorked saved use it, else calculate
function getHours(e) {
  return e.hoursWorked ?? calcHours(e.startTime, e.endTime);
}

function getWorkersStats() {
  const entries = db.getProductionEntries();
  const workers = db.getUsers().filter(u => u.role === 'worker');

  return workers.map(w => {
    const mine = entries.filter(e => e.workerId === w.id);

    const totalEntries = mine.length;
    const approved     = mine.filter(e => e.status === 'approved');
    const pending      = mine.filter(e => e.status === 'pending');
    const rejected     = mine.filter(e => e.status === 'rejected');

    const totalProduced = mine.reduce((s, e) => s + e.quantityProduced, 0);
    const totalRejected = mine.reduce((s, e) => s + e.quantityRejected, 0);
    const netApproved   = approved.reduce((s, e) => s + (e.quantityProduced - e.quantityRejected), 0);

    const todayEntries  = mine.filter(e => e.productionDate && isToday(e.productionDate));
    const weekEntries   = mine.filter(e => e.productionDate && isThisWeek(e.productionDate));
    const monthEntries  = mine.filter(e => e.productionDate && isThisMonth(e.productionDate));

    const todayHours  = todayEntries.reduce((s, e) => s + getHours(e), 0);
    const weekHours   = weekEntries.reduce((s, e) => s + getHours(e), 0);
    const monthHours  = monthEntries.reduce((s, e) => s + getHours(e), 0);
    const totalHours  = mine.reduce((s, e) => s + getHours(e), 0);

    const uniqueDays  = new Set(mine.map(e => e.productionDate).filter(Boolean)).size;
    const rejRate     = totalProduced ? +((totalRejected / totalProduced) * 100).toFixed(1) : 0;
    const efficiency  = totalHours > 0 ? Math.round(netApproved / totalHours) : 0;

    const todayQty   = todayEntries.reduce((s, e) => s + e.quantityProduced, 0);
    const weekQty    = weekEntries.reduce((s, e) => s + e.quantityProduced, 0);
    const monthQty   = monthEntries.reduce((s, e) => s + e.quantityProduced, 0);

    return {
      ...w,
      totalEntries, approvedCount: approved.length, pendingCount: pending.length, rejectedCount: rejected.length,
      totalProduced, totalRejected, netApproved,
      todayHours, weekHours, monthHours, totalHours,
      todayQty, weekQty, monthQty,
      uniqueDays, rejRate, efficiency,
    };
  });
}

function TrendBar({ entries }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const dateStr = d.toLocaleDateString('en-CA');
    const label = d.toLocaleDateString('en-IN', { weekday:'short' });
    const qty = entries.filter(e => e.productionDate === dateStr).reduce((s, e) => s + e.quantityProduced, 0);
    return { label, qty, dateStr };
  });
  const max = Math.max(...days.map(d => d.qty), 1);
  return (
    <div style={{ display:'flex', gap:8, alignItems:'flex-end', height:80, padding:'0 4px' }}>
      {days.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <div style={{ fontSize:9, color:'var(--text-light)', fontWeight:600 }}>{d.qty > 0 ? d.qty : ''}</div>
          <div style={{ width:'100%', height: `${Math.round((d.qty/max)*56)+4}px`, background: isToday(d.dateStr) ? 'var(--primary)' : 'var(--blue-bg)', borderRadius:'3px 3px 0 0', minHeight:4, transition:'height .3s' }} />
          <div style={{ fontSize:9, color:'var(--text-light)', fontWeight:600 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function WorkerStats() {
  const [selectedWorker, setSelectedWorker] = useState('all');
  const [tab, setTab] = useState('hours');
  const workers = getWorkersStats();
  const entries = db.getProductionEntries();

  const filteredWorkers = selectedWorker === 'all' ? workers : workers.filter(w => w.id === selectedWorker);
  const displayWorker = workers.find(w => w.id === selectedWorker);

  // Leaderboard by net approved qty
  const leaderboard = [...workers].sort((a, b) => b.netApproved - a.netApproved);
  const maxQty = leaderboard[0]?.netApproved || 1;

  // Shift breakdown across all entries
  const shiftData = { Morning:0, Evening:0, Night:0 };
  entries.filter(e => e.status === 'approved').forEach(e => {
    if (shiftData[e.shift] !== undefined) shiftData[e.shift] += e.quantityProduced - e.quantityRejected;
  });
  const maxShift = Math.max(...Object.values(shiftData), 1);

  return (
    <>
      <div className="page-head">
        <div><h1>Worker Analytics</h1><p>Hours worked, productivity tracking, and top producer leaderboard</p></div>
        <select
          style={{ padding:'8px 12px', borderRadius:6, border:'1.5px solid var(--border)', fontSize:13, fontWeight:600, color:'var(--text)', background:'white' }}
          value={selectedWorker}
          onChange={e => setSelectedWorker(e.target.value)}
        >
          <option value="all">All Workers</option>
          {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {/* ── TOP PRODUCER LEADERBOARD ── */}
      <div className="card mb-24" style={{ overflow:'visible' }}>
        <div className="card-header">
          <span className="card-title">🏆 Top Producers Leaderboard</span>
          <span style={{ fontSize:12, color:'var(--text-light)' }}>By approved net output (all time)</span>
        </div>
        <div className="card-body">
          {/* Podium visual */}
          <div style={{ display:'flex', justifyContent:'center', alignItems:'flex-end', gap:16, marginBottom:28, paddingTop:8 }}>
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map((w, i) => {
              if (!w) return <div key={i} style={{ width:110 }} />;
              const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
              const heights = { 1:120, 2:90, 3:70 };
              const colors  = { 1:'#f59e0b', 2:'#94a3b8', 3:'#b45309' };
              return (
                <div key={w.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>
                  <div style={{ textAlign:'center', marginBottom:6 }}>
                    <div style={{ fontSize:28 }}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</div>
                    <div style={{ width:48, height:48, borderRadius:'50%', background:colors[rank]+'22', border:`3px solid ${colors[rank]}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:18, color:colors[rank], margin:'4px auto' }}>
                      {w.name.charAt(0)}
                    </div>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--text)' }}>{w.name.split(' ')[0]}</div>
                    <div style={{ fontSize:11, color:'var(--text-light)' }}>{w.machineId}</div>
                    <div style={{ fontSize:15, fontWeight:800, color:colors[rank], marginTop:2 }}>{w.netApproved.toLocaleString()}</div>
                    <div style={{ fontSize:10, color:'var(--text-light)' }}>units</div>
                  </div>
                  <div style={{ width:90, height:`${heights[rank]}px`, background:`${colors[rank]}22`, border:`2px solid ${colors[rank]}`, borderRadius:'6px 6px 0 0', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontWeight:900, fontSize:22, color:colors[rank] }}>#{rank}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full ranking table */}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Rank</th><th>Worker</th><th>Machine</th><th>Net Output</th><th>Productivity</th><th>Hours</th><th>Efficiency</th><th>Rejection%</th></tr></thead>
              <tbody>
                {leaderboard.map((w, i) => (
                  <tr key={w.id} style={{ background: i === 0 ? '#fffbeb' : '' }}>
                    <td><MedalIcon rank={i + 1} /></td>
                    <td>
                      <div style={{ fontWeight:700 }}>{w.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-light)' }}>{w.uniqueDays} days worked</div>
                    </td>
                    <td><span className="badge badge-blue">{w.machineId}</span></td>
                    <td style={{ fontWeight:800, fontSize:15 }}>{w.netApproved.toLocaleString()}</td>
                    <td style={{ minWidth:140 }}><Bar value={w.netApproved} max={maxQty} color={i===0?'#f59e0b':i===1?'#94a3b8':'#b45309'} /></td>
                    <td>{fmtHours(w.totalHours)}</td>
                    <td>
                      <span style={{ fontWeight:700, color: w.efficiency > 150 ? 'var(--green)' : w.efficiency > 100 ? 'var(--blue)' : 'var(--orange)' }}>
                        {w.efficiency} u/h
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight:700, color: w.rejRate > 10 ? 'var(--red)' : w.rejRate > 5 ? 'var(--orange)' : 'var(--green)' }}>
                        {w.rejRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── TABS: Hours | Production | Shift | Trend ── */}
      <div className="tabs">
        <button className={`tab-btn ${tab==='hours'?'active':''}`}      onClick={() => setTab('hours')}>⏱ Hours Breakdown</button>
        <button className={`tab-btn ${tab==='production'?'active':''}`} onClick={() => setTab('production')}>📦 Production Detail</button>
        <button className={`tab-btn ${tab==='shift'?'active':''}`}      onClick={() => setTab('shift')}>🌅 Shift Analysis</button>
        <button className={`tab-btn ${tab==='trend'?'active':''}`}      onClick={() => setTab('trend')}>📈 7-Day Trend</button>
      </div>

      {/* ── HOURS BREAKDOWN ── */}
      {tab === 'hours' && (
        <div className="card">
          <div className="card-header"><span className="card-title">⏱ Hours Worked Breakdown</span><span style={{fontSize:12,color:'var(--text-light)'}}>Based on shift start/end times</span></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Worker</th><th>Machine</th>
                  <th style={{color:'var(--primary)'}}>Today</th>
                  <th style={{color:'var(--blue)'}}>This Week</th>
                  <th style={{color:'var(--green)'}}>This Month</th>
                  <th>Total (All Time)</th>
                  <th>Days Present</th>
                  <th>Avg / Day</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map(w => (
                  <tr key={w.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--blue-bg)', color:'var(--blue)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, flexShrink:0 }}>
                          {w.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight:700 }}>{w.name}</div>
                          <div style={{ fontSize:11, color:'var(--text-light)' }}>{w.totalEntries} entries</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{w.machineId}</span></td>
                    <td>
                      <span style={{ fontWeight:700, color: w.todayHours > 0 ? 'var(--primary)' : 'var(--text-light)' }}>
                        {w.todayHours > 0 ? fmtHours(w.todayHours) : <em style={{opacity:.5}}>—</em>}
                      </span>
                      {w.todayQty > 0 && <div style={{fontSize:10,color:'var(--text-light)'}}>{w.todayQty} units</div>}
                    </td>
                    <td>
                      <span style={{ fontWeight:700, color:'var(--blue)' }}>{fmtHours(w.weekHours)}</span>
                      {w.weekQty > 0 && <div style={{fontSize:10,color:'var(--text-light)'}}>{w.weekQty.toLocaleString()} units</div>}
                    </td>
                    <td>
                      <span style={{ fontWeight:700, color:'var(--green)' }}>{fmtHours(w.monthHours)}</span>
                      {w.monthQty > 0 && <div style={{fontSize:10,color:'var(--text-light)'}}>{w.monthQty.toLocaleString()} units</div>}
                    </td>
                    <td style={{ fontWeight:700, fontSize:15 }}>{fmtHours(w.totalHours)}</td>
                    <td><span className="badge badge-purple">{w.uniqueDays} days</span></td>
                    <td style={{ color:'var(--text-med)', fontWeight:600 }}>
                      {w.uniqueDays > 0 ? fmtHours(+(w.totalHours / w.uniqueDays).toFixed(1)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detailed daily log for single-worker view */}
          {selectedWorker !== 'all' && displayWorker && (
            <div style={{ borderTop:'1px solid var(--border)', padding:20 }}>
              <div style={{ fontWeight:700, marginBottom:12, fontSize:14 }}>📅 Daily Work Log — {displayWorker.name}</div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Machine</th><th>Shift</th><th>Time</th><th>Hours</th><th>Product</th><th>Produced</th><th>Rejected</th><th>Net</th><th>Status</th></tr></thead>
                  <tbody>
                    {entries.filter(e => e.workerId === selectedWorker).map(e => {
                      const hrs = getHours(e);
                      return (
                        <tr key={e.id}>
                          <td style={{ fontWeight:600 }}>
                            {e.productionDate ? new Date(e.productionDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short' }) : '—'}
                            {e.productionDate && isToday(e.productionDate) && <span className="badge badge-blue" style={{marginLeft:4,fontSize:9}}>Today</span>}
                          </td>
                          <td><span className="badge badge-blue">{e.machineId}</span></td>
                          <td>{e.shift}</td>
                          <td style={{ fontSize:12 }}>{e.startTime} – {e.endTime}</td>
                          <td style={{ fontWeight:700, color:'var(--primary)' }}>{fmtHours(hrs)}</td>
                          <td>{e.productType}</td>
                          <td>{e.quantityProduced}</td>
                          <td style={{ color:'var(--red)' }}>{e.quantityRejected}</td>
                          <td style={{ fontWeight:700 }}>{e.quantityProduced - e.quantityRejected}</td>
                          <td><span className={`badge ${e.status==='approved'?'badge-green':e.status==='pending'?'badge-orange':'badge-red'}`}>{e.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRODUCTION DETAIL ── */}
      {tab === 'production' && (
        <div className="card">
          <div className="card-header"><span className="card-title">📦 Production Performance</span></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Worker</th><th>Machine</th>
                  <th>Total Entries</th><th>Approved</th><th>Pending</th><th>Rejected</th>
                  <th>Total Produced</th><th>Total Rejected</th><th>Net Output</th>
                  <th>Rejection %</th><th>Efficiency (u/h)</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.map(w => (
                  <tr key={w.id}>
                    <td style={{ fontWeight:700 }}>{w.name}</td>
                    <td><span className="badge badge-blue">{w.machineId}</span></td>
                    <td style={{ textAlign:'center' }}>{w.totalEntries}</td>
                    <td><span className="badge badge-green">{w.approvedCount}</span></td>
                    <td><span className="badge badge-orange">{w.pendingCount}</span></td>
                    <td><span className="badge badge-red">{w.rejectedCount}</span></td>
                    <td style={{ fontWeight:700 }}>{w.totalProduced.toLocaleString()}</td>
                    <td style={{ color:'var(--red)' }}>{w.totalRejected.toLocaleString()}</td>
                    <td style={{ fontWeight:800, fontSize:15, color:'var(--green)' }}>{w.netApproved.toLocaleString()}</td>
                    <td>
                      <span style={{ fontWeight:700, color: w.rejRate > 10 ? 'var(--red)' : w.rejRate > 5 ? 'var(--orange)' : 'var(--green)' }}>
                        {w.rejRate}%
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight:700, color: w.efficiency > 150 ? 'var(--green)' : w.efficiency > 80 ? 'var(--blue)' : 'var(--orange)' }}>
                        {w.efficiency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SHIFT ANALYSIS ── */}
      {tab === 'shift' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-header"><span className="card-title">🌅 Output by Shift (Net Approved)</span></div>
            <div className="card-body">
              {Object.entries(shiftData).map(([shift, qty]) => (
                <div key={shift} style={{ marginBottom:18 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontWeight:700, fontSize:13 }}>
                      {shift === 'Morning' ? '🌤' : shift === 'Evening' ? '🌆' : '🌙'} {shift} Shift
                    </span>
                    <span style={{ fontWeight:700 }}>{qty.toLocaleString()} units</span>
                  </div>
                  <div style={{ height:12, background:'#e2e8f0', borderRadius:6, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.round((qty/maxShift)*100)}%`, background: shift==='Morning'?'var(--orange)':shift==='Evening'?'var(--primary)':'var(--purple)', borderRadius:6 }} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--text-light)', marginTop:4 }}>{Math.round((qty/Math.max(Object.values(shiftData).reduce((a,b)=>a+b,0),1))*100)}% of total</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">🏅 Quality Champions (Lowest Rejection)</span></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Rank</th><th>Worker</th><th>Rejection %</th><th>Quality</th></tr></thead>
                <tbody>
                  {[...workers].filter(w => w.totalProduced > 0).sort((a,b) => a.rejRate - b.rejRate).map((w, i) => (
                    <tr key={w.id} style={{ background: i===0?'#ecfdf5':'' }}>
                      <td><MedalIcon rank={i+1} /></td>
                      <td style={{ fontWeight:700 }}>{w.name}</td>
                      <td style={{ fontWeight:800, color: w.rejRate < 5 ? 'var(--green)' : w.rejRate < 10 ? 'var(--orange)' : 'var(--red)' }}>
                        {w.rejRate}%
                      </td>
                      <td>
                        {w.rejRate < 3   && <span className="badge badge-green">Excellent</span>}
                        {w.rejRate >= 3  && w.rejRate < 7  && <span className="badge badge-blue">Good</span>}
                        {w.rejRate >= 7  && w.rejRate < 12 && <span className="badge badge-orange">Average</span>}
                        {w.rejRate >= 12 && <span className="badge badge-red">Needs Attention</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 7-DAY TREND ── */}
      {tab === 'trend' && (
        <div style={{ display:'grid', gridTemplateColumns: filteredWorkers.length === 1 ? '1fr' : 'repeat(auto-fill, minmax(420px, 1fr))', gap:20 }}>
          {filteredWorkers.map(w => {
            const workerEntries = entries.filter(e => e.workerId === w.id);
            const isSingle = filteredWorkers.length === 1;
            return (
              <div key={w.id} className="card">
                <div className="card-header">
                  <span className="card-title">📈 {w.name} — Last 7 Days</span>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span className="badge badge-blue">{w.machineId}</span>
                    <span className="badge badge-gray">{w.uniqueDays} days worked</span>
                  </div>
                </div>
                <div className="card-body">
                  <TrendBar entries={workerEntries} />
                  <div style={{ display:'grid', gridTemplateColumns: isSingle ? 'repeat(4,1fr)' : '1fr 1fr', gap:10, marginTop:20 }}>
                    <StatPill label="Today"      value={w.todayQty  > 0 ? w.todayQty.toLocaleString()  : '—'} color="var(--brand)"  />
                    <StatPill label="This Week"  value={w.weekQty   > 0 ? w.weekQty.toLocaleString()   : '—'} color="var(--blue)"   />
                    <StatPill label="This Month" value={w.monthQty  > 0 ? w.monthQty.toLocaleString()  : '—'} color="var(--green)"  />
                    <StatPill label="Efficiency" value={w.efficiency > 0 ? `${w.efficiency} u/h` : '—'}        color="var(--orange)" />
                  </div>
                  {isSingle && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:10 }}>
                      <StatPill label="Total Hours"   value={fmtHours(w.totalHours)}   color="var(--purple)" />
                      <StatPill label="Net Approved"  value={w.netApproved.toLocaleString()} color="var(--green)" />
                      <StatPill label="Rejection %"   value={`${w.rejRate}%`}           color={w.rejRate < 5 ? 'var(--green)' : w.rejRate < 10 ? 'var(--orange)' : 'var(--red)'} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
