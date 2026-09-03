export function calcHours(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 1440;
  return +(mins / 60).toFixed(1);
}

export function toDateStr(date = new Date()) {
  return date.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

export function daysAgoStr(n) {
  return toDateStr(new Date(Date.now() - n * 86400000));
}

export function isToday(dateStr)    { return dateStr === toDateStr(); }
export function isThisWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  return d >= start;
}
export function isThisMonth(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function fmtHours(h) {
  if (h === 0) return '0h';
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
