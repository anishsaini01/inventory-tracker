import { jsPDF } from 'jspdf';

export function generateInvoicePDF(invoice) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, margin = 18;
  let y = 0;

  // ── helpers ──
  const col  = (hex) => { const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16); return [r,g,b]; };
  const line  = (x1,y1,x2,y2,color='#e2e8f0',lw=0.3) => { doc.setDrawColor(...col(color)); doc.setLineWidth(lw); doc.line(x1,y1,x2,y2); };
  const rect  = (x,y,w,h,fill) => { doc.setFillColor(...col(fill)); doc.rect(x,y,w,h,'F'); };
  const text  = (str, x, yy, opts={}) => {
    doc.setFontSize(opts.size||10);
    doc.setFont('helvetica', opts.style||'normal');
    doc.setTextColor(...col(opts.color||'#1e293b'));
    if (opts.align) doc.text(str, x, yy, { align: opts.align });
    else doc.text(str, x, yy);
  };

  // ── HEADER BAND ──
  rect(0, 0, W, 42, '#1e3799');
  // Company name
  text('ManuTrack', margin, 17, { size:22, style:'bold', color:'#ffffff' });
  text('Manufacturing Management System', margin, 24, { size:9, color:'#93c5fd' });
  text('www.manutrack.in  |  support@manutrack.in', margin, 30, { size:8, color:'#93c5fd' });

  // Invoice label box
  rect(W - 72, 8, 56, 26, '#0c2461');
  text('INVOICE', W - 44, 18, { size:14, style:'bold', color:'#ffffff', align:'center' });
  text(invoice.invoiceNumber, W - 44, 26, { size:10, color:'#93c5fd', align:'center' });

  // Payment status badge
  const statusColor = invoice.paymentStatus === 'paid' ? '#10b981' : invoice.paymentStatus === 'partial' ? '#3b82f6' : '#ef4444';
  rect(W - 72, 36, 56, 8, statusColor);
  text(invoice.paymentStatus.toUpperCase(), W - 44, 41.5, { size:8, style:'bold', color:'#ffffff', align:'center' });

  y = 52;

  // ── DATE & DETAILS ROW ──
  text('Invoice Date:', margin, y, { size:8, color:'#94a3b8' });
  text(new Date(invoice.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' }), margin + 24, y, { size:9, style:'bold' });

  text('Created By:', W/2, y, { size:8, color:'#94a3b8' });
  text(invoice.createdBy, W/2 + 20, y, { size:9, style:'bold' });
  y += 6;

  text('Invoice No:', margin, y, { size:8, color:'#94a3b8' });
  text(invoice.invoiceNumber, margin + 24, y, { size:9, style:'bold', color:'#1e3799' });
  y += 10;

  line(margin, y, W - margin, y);
  y += 8;

  // ── BILL TO ──
  rect(margin, y, (W - margin*2) / 2 - 6, 28, '#f8fafc');
  text('BILL TO', margin + 4, y + 6, { size:7, style:'bold', color:'#94a3b8' });
  text(invoice.customerName, margin + 4, y + 13, { size:11, style:'bold' });

  const customer = invoice._customer || {};
  if (customer.phone) text('📞 ' + customer.phone, margin + 4, y + 20, { size:8, color:'#475569' });
  if (customer.address) text('📍 ' + customer.address, margin + 4, y + 26, { size:8, color:'#475569' });

  // Payment summary box (right)
  const boxX = W/2 + 4;
  rect(boxX, y, W - margin - boxX, 28, '#eff6ff');
  text('PAYMENT SUMMARY', boxX + 4, y + 6, { size:7, style:'bold', color:'#94a3b8' });
  text('₹' + invoice.total.toLocaleString('en-IN'), boxX + 4, y + 16, { size:16, style:'bold', color:'#1e3799' });
  text('Total Amount Due', boxX + 4, y + 22, { size:8, color:'#64748b' });

  y += 38;

  // ── LINE ITEMS TABLE ──
  // Header
  rect(margin, y, W - margin*2, 9, '#1e3799');
  const cols = [margin+2, margin+72, margin+100, margin+128, margin+155];
  text('#',              cols[0], y+6, { size:8, style:'bold', color:'#ffffff' });
  text('Product',        cols[1]-40, y+6, { size:8, style:'bold', color:'#ffffff' });
  text('Qty',            cols[1]+10, y+6, { size:8, style:'bold', color:'#ffffff', align:'right' });
  text('Rate (₹)',       cols[2]+10, y+6, { size:8, style:'bold', color:'#ffffff', align:'right' });
  text('Amount (₹)',     W-margin-2, y+6, { size:8, style:'bold', color:'#ffffff', align:'right' });
  y += 9;

  // Rows
  invoice.items.forEach((item, i) => {
    const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    rect(margin, y, W - margin*2, 9, rowBg);
    line(margin, y, W-margin, y, '#e2e8f0', 0.2);

    text(String(i+1).padStart(2,'0'), cols[0], y+6, { size:8, color:'#94a3b8' });
    text(item.productType,             cols[1]-40, y+6, { size:9, style:'bold' });
    text(item.quantity.toLocaleString('en-IN'), cols[1]+10, y+6, { size:9, align:'right' });
    text('₹' + item.rate.toFixed(2),   cols[2]+10, y+6, { size:9, align:'right' });
    text('₹' + item.amount.toLocaleString('en-IN'), W-margin-2, y+6, { size:9, style:'bold', align:'right' });
    y += 9;
  });

  line(margin, y, W-margin, y, '#1e3799', 0.5);
  y += 6;

  // ── TOTALS ──
  const totX = W - margin - 70;
  const valX = W - margin - 2;

  const totRow = (label, val, bold=false, big=false, bgColor=null) => {
    if (bgColor) rect(totX-4, y-4, 74, 8, bgColor);
    text(label, totX, y, { size: big?10:9, style: bold?'bold':'normal', color: bold?'#1e293b':'#475569' });
    text(val, valX, y, { size: big?11:9, style: bold?'bold':'normal', align:'right', color: bold?'#1e3799':'#1e293b' });
    y += 7;
  };

  totRow('Subtotal:', '₹' + invoice.subtotal.toLocaleString('en-IN'));
  totRow('GST (18%):', '₹' + invoice.tax.toLocaleString('en-IN'));
  line(totX-4, y-2, W-margin, y-2, '#1e3799', 0.5);
  y += 2;
  totRow('TOTAL AMOUNT:', '₹' + invoice.total.toLocaleString('en-IN'), true, true, '#eff6ff');
  y += 6;

  // ── NOTES / TERMS ──
  line(margin, y, W-margin, y);
  y += 8;
  text('Terms & Conditions', margin, y, { size:8, style:'bold', color:'#94a3b8' });
  y += 5;
  text('1. Payment is due within 30 days of invoice date.', margin, y, { size:7, color:'#64748b' }); y += 4;
  text('2. Please quote the invoice number in all correspondence.', margin, y, { size:7, color:'#64748b' }); y += 4;
  text('3. Goods once sold will not be taken back without prior approval.', margin, y, { size:7, color:'#64748b' });

  // ── FOOTER ──
  const footY = 285;
  rect(0, footY, W, 12, '#1e3799');
  text('Thank you for your business!', W/2, footY+5, { size:9, style:'bold', color:'#ffffff', align:'center' });
  text('ManuTrack | Manufacturing Management System | Generated on ' + new Date().toLocaleDateString('en-IN'), W/2, footY+9.5, { size:7, color:'#93c5fd', align:'center' });

  // ── WATERMARK if unpaid ──
  if (invoice.paymentStatus === 'unpaid') {
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(52);
    doc.setFont('helvetica', 'bold');
    doc.setGState(doc.GState({ opacity: 0.08 }));
    doc.text('UNPAID', W/2, 160, { align:'center', angle:35 });
    doc.setGState(doc.GState({ opacity: 1 }));
  }

  doc.save(`${invoice.invoiceNumber}.pdf`);
}
