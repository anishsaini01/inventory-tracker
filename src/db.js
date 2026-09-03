import { calcHours } from './utils.js';

const DB_KEY = 'manutrack_db';

function d(n) { return new Date(Date.now() - n * 86400000).toLocaleDateString('en-CA'); }

function makeSeed() {
  const today = d(0), y1 = d(1), y2 = d(2), y3 = d(3), y4 = d(4), y5 = d(5), y6 = d(6);
  return {
    users: [
      { id: 'w1', name: 'Ramesh Kumar',   role: 'worker',     username: 'ramesh',  password: 'pass123',  machineId: 'M01' },
      { id: 'w2', name: 'Suresh Singh',   role: 'worker',     username: 'suresh',  password: 'pass123',  machineId: 'M02' },
      { id: 'w3', name: 'Mohan Lal',      role: 'worker',     username: 'mohan',   password: 'pass123',  machineId: 'M05' },
      { id: 's1', name: 'Amit Sharma',    role: 'supervisor', username: 'amit',    password: 'pass123' },
      { id: 's2', name: 'Priya Patel',    role: 'supervisor', username: 'priya',   password: 'pass123' },
      { id: 'i1', name: 'Rajesh Gupta',   role: 'inventory',  username: 'rajesh',  password: 'pass123' },
      { id: 'sa1',name: 'Neha Verma',     role: 'sales',      username: 'neha',    password: 'pass123' },
      { id: 'a1', name: 'Admin User',     role: 'admin',      username: 'admin',   password: 'admin123' },
    ],
    productionEntries: [
      // ── Ramesh (w1 / M01) ──
      { id:'pe1',  workerId:'w1', workerName:'Ramesh Kumar', machineId:'M01', shift:'Morning', startTime:'08:00', endTime:'16:00', productionDate: y2, productType:'Cup 200ml',    quantityProduced:1200, quantityRejected:50,  remarks:'', status:'approved', supervisorId:'s1', supervisorName:'Amit Sharma', supervisorNote:'Verified physically.', submittedAt:new Date(Date.now()-2*86400000).toISOString(), reviewedAt:new Date(Date.now()-2*86400000+7200000).toISOString() },
      { id:'pe5',  workerId:'w1', workerName:'Ramesh Kumar', machineId:'M01', shift:'Morning', startTime:'08:00', endTime:'16:00', productionDate: y3, productType:'Cup 100ml',    quantityProduced:1800, quantityRejected:60,  remarks:'', status:'approved', supervisorId:'s1', supervisorName:'Amit Sharma', supervisorNote:'Good batch.',          submittedAt:new Date(Date.now()-3*86400000).toISOString(), reviewedAt:new Date(Date.now()-3*86400000+3600000).toISOString() },
      { id:'pe6',  workerId:'w1', workerName:'Ramesh Kumar', machineId:'M01', shift:'Morning', startTime:'08:00', endTime:'16:00', productionDate: y5, productType:'Plate 8 inch', quantityProduced:900,  quantityRejected:30,  remarks:'', status:'approved', supervisorId:'s2', supervisorName:'Priya Patel',  supervisorNote:'Checked.',             submittedAt:new Date(Date.now()-5*86400000).toISOString(), reviewedAt:new Date(Date.now()-5*86400000+3600000).toISOString() },
      { id:'pe4',  workerId:'w1', workerName:'Ramesh Kumar', machineId:'M01', shift:'Morning', startTime:'08:00', endTime:'16:00', productionDate: today, productType:'Plate 8 inch', quantityProduced:600,  quantityRejected:20, remarks:'', status:'pending', supervisorId:null, supervisorName:null, supervisorNote:'', submittedAt:new Date(Date.now()-1800000).toISOString(), reviewedAt:null },
      // ── Suresh (w2 / M02) ──
      { id:'pe2',  workerId:'w2', workerName:'Suresh Singh', machineId:'M02', shift:'Evening', startTime:'16:00', endTime:'00:00', productionDate: y1, productType:'Plate 6 inch', quantityProduced:850,  quantityRejected:40,  remarks:'Machine vibration for 30 min', status:'approved', supervisorId:'s2', supervisorName:'Priya Patel', supervisorNote:'Counted. Slight defect noted.', submittedAt:new Date(Date.now()-86400000).toISOString(), reviewedAt:new Date(Date.now()-86400000+3600000).toISOString() },
      { id:'pe7',  workerId:'w2', workerName:'Suresh Singh', machineId:'M02', shift:'Evening', startTime:'16:00', endTime:'00:00', productionDate: y4, productType:'Cup 200ml',    quantityProduced:1050, quantityRejected:55,  remarks:'', status:'approved', supervisorId:'s1', supervisorName:'Amit Sharma', supervisorNote:'OK.',                  submittedAt:new Date(Date.now()-4*86400000).toISOString(), reviewedAt:new Date(Date.now()-4*86400000+3600000).toISOString() },
      { id:'pe8',  workerId:'w2', workerName:'Suresh Singh', machineId:'M02', shift:'Evening', startTime:'16:00', endTime:'00:00', productionDate: y6, productType:'Plate 6 inch', quantityProduced:780,  quantityRejected:25,  remarks:'', status:'approved', supervisorId:'s1', supervisorName:'Amit Sharma', supervisorNote:'Good.',                submittedAt:new Date(Date.now()-6*86400000).toISOString(), reviewedAt:new Date(Date.now()-6*86400000+3600000).toISOString() },
      // ── Mohan (w3 / M05) ──
      { id:'pe3',  workerId:'w3', workerName:'Mohan Lal',    machineId:'M05', shift:'Morning', startTime:'08:00', endTime:'16:00', productionDate: today, productType:'Cup 100ml',    quantityProduced:2000, quantityRejected:80, remarks:'', status:'pending', supervisorId:null, supervisorName:null, supervisorNote:'', submittedAt:new Date(Date.now()-3600000).toISOString(), reviewedAt:null },
      { id:'pe9',  workerId:'w3', workerName:'Mohan Lal',    machineId:'M05', shift:'Night',   startTime:'00:00', endTime:'08:00', productionDate: y2, productType:'Plate 10 inch', quantityProduced:450,  quantityRejected:15,  remarks:'', status:'approved', supervisorId:'s2', supervisorName:'Priya Patel', supervisorNote:'Verified.',            submittedAt:new Date(Date.now()-2*86400000).toISOString(), reviewedAt:new Date(Date.now()-2*86400000+3600000).toISOString() },
      { id:'pe10', workerId:'w3', workerName:'Mohan Lal',    machineId:'M05', shift:'Morning', startTime:'08:00', endTime:'16:00', productionDate: y4, productType:'Cup 100ml',    quantityProduced:1600, quantityRejected:90,  remarks:'New mold installed', status:'approved', supervisorId:'s1', supervisorName:'Amit Sharma', supervisorNote:'High rejection — noted.', submittedAt:new Date(Date.now()-4*86400000).toISOString(), reviewedAt:new Date(Date.now()-4*86400000+3600000).toISOString() },
    ],
    inventory: [
      { productType:'Cup 100ml',    quantity:3200, lastUpdated:new Date().toISOString() },
      { productType:'Cup 200ml',    quantity:2450, lastUpdated:new Date().toISOString() },
      { productType:'Plate 6 inch', quantity:1800, lastUpdated:new Date().toISOString() },
      { productType:'Plate 8 inch', quantity: 980, lastUpdated:new Date().toISOString() },
      { productType:'Plate 10 inch',quantity: 560, lastUpdated:new Date().toISOString() },
    ],
    stockLog: [],
    customers: [
      { id:'c1', name:'Sharma Traders',     phone:'9876543210', email:'sharma@traders.com', address:'Connaught Place, Delhi',  creditLimit:50000 },
      { id:'c2', name:'Patel Enterprises',  phone:'9123456789', email:'patel@ent.com',       address:'Andheri West, Mumbai',    creditLimit:100000 },
      { id:'c3', name:'Gupta & Sons',       phone:'9988776655', email:'gupta@sons.com',       address:'MI Road, Jaipur',         creditLimit:75000 },
      { id:'c4', name:'Verma Distributors', phone:'9765432109', email:'verma@dist.com',       address:'Hazratganj, Lucknow',     creditLimit:60000 },
    ],
    invoices: [
      { id:'inv1', invoiceNumber:'MFG-2024-001', customerId:'c1', customerName:'Sharma Traders',    items:[{ productType:'Cup 200ml',    quantity:500,  rate:2.5, amount:1250 },{ productType:'Plate 6 inch', quantity:200, rate:3.0, amount:600  }], subtotal:1850, tax:333, total:2183, paymentStatus:'paid',    createdAt:new Date(Date.now()-3*86400000).toISOString(), createdBy:'Neha Verma' },
      { id:'inv2', invoiceNumber:'MFG-2024-002', customerId:'c2', customerName:'Patel Enterprises', items:[{ productType:'Cup 100ml',    quantity:1000, rate:1.5, amount:1500 }],                                                                   subtotal:1500, tax:270, total:1770, paymentStatus:'unpaid',  createdAt:new Date(Date.now()-86400000).toISOString(),   createdBy:'Neha Verma' },
      { id:'inv3', invoiceNumber:'MFG-2024-003', customerId:'c3', customerName:'Gupta & Sons',      items:[{ productType:'Plate 8 inch', quantity:300,  rate:4.0, amount:1200 },{ productType:'Cup 200ml',    quantity:200, rate:2.5, amount:500  }], subtotal:1700, tax:306, total:2006, paymentStatus:'partial', createdAt:new Date(Date.now()-43200000).toISOString(),   createdBy:'Neha Verma' },
    ],
    invoiceCounter: 4,
  };
}

export const db = {
  init() {
    if (!localStorage.getItem(DB_KEY)) {
      localStorage.setItem(DB_KEY, JSON.stringify(makeSeed()));
    }
  },
  reset() { localStorage.setItem(DB_KEY, JSON.stringify(makeSeed())); },
  _get() { return JSON.parse(localStorage.getItem(DB_KEY)); },
  _set(data) { localStorage.setItem(DB_KEY, JSON.stringify(data)); },

  getUsers() { return this._get().users; },
  findUser(username, password) {
    return this.getUsers().find(u => u.username === username && u.password === password) || null;
  },

  getProductionEntries() { return this._get().productionEntries; },
  addProductionEntry(entry) {
    const data = this._get();
    data.productionEntries.unshift(entry);
    this._set(data);
  },

  approveEntry(entryId, supervisor, note) {
    const data = this._get();
    const idx = data.productionEntries.findIndex(e => e.id === entryId);
    if (idx === -1) return;
    const entry = data.productionEntries[idx];
    const net = entry.quantityProduced - entry.quantityRejected;
    data.productionEntries[idx] = { ...entry, status:'approved', supervisorId:supervisor.id, supervisorName:supervisor.name, supervisorNote:note, reviewedAt:new Date().toISOString() };
    const invIdx = data.inventory.findIndex(i => i.productType === entry.productType);
    if (invIdx !== -1) { data.inventory[invIdx].quantity += net; data.inventory[invIdx].lastUpdated = new Date().toISOString(); }
    data.stockLog.unshift({ action:'IN', productType:entry.productType, quantity:net, ref:`Entry ${entryId}`, by:supervisor.name, at:new Date().toISOString() });
    this._set(data);
  },

  rejectEntry(entryId, supervisor, note) {
    const data = this._get();
    const idx = data.productionEntries.findIndex(e => e.id === entryId);
    if (idx === -1) return;
    data.productionEntries[idx] = { ...data.productionEntries[idx], status:'rejected', supervisorId:supervisor.id, supervisorName:supervisor.name, supervisorNote:note, reviewedAt:new Date().toISOString() };
    this._set(data);
  },

  getInventory() { return this._get().inventory; },
  getStockLog()  { return this._get().stockLog; },

  getCustomers() { return this._get().customers; },
  addCustomer(customer) {
    const data = this._get();
    data.customers.unshift(customer);
    this._set(data);
  },

  getInvoices() { return this._get().invoices; },
  createInvoice(invoiceData) {
    const data = this._get();
    const invoiceNumber = `MFG-2024-${String(data.invoiceCounter).padStart(3, '0')}`;
    const newInvoice = { ...invoiceData, id:`inv${data.invoiceCounter}`, invoiceNumber };
    data.invoices.unshift(newInvoice);
    invoiceData.items.forEach(item => {
      const i = data.inventory.findIndex(x => x.productType === item.productType);
      if (i !== -1) { data.inventory[i].quantity -= item.quantity; data.inventory[i].lastUpdated = new Date().toISOString(); }
      data.stockLog.unshift({ action:'OUT', productType:item.productType, quantity:item.quantity, ref:invoiceNumber, by:invoiceData.createdBy, at:new Date().toISOString() });
    });
    data.invoiceCounter++;
    this._set(data);
    return newInvoice;
  },
  updatePaymentStatus(id, status) {
    const data = this._get();
    const idx = data.invoices.findIndex(i => i.id === id);
    if (idx !== -1) data.invoices[idx].paymentStatus = status;
    this._set(data);
  },
};
