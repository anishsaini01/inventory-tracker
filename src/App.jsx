import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './components/Login.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ProductionEntry from './pages/ProductionEntry.jsx';
import MyEntries from './pages/MyEntries.jsx';
import Approvals from './pages/Approvals.jsx';
import Inventory from './pages/Inventory.jsx';
import Invoices from './pages/Invoices.jsx';
import CreateInvoice from './pages/CreateInvoice.jsx';
import Reports from './pages/Reports.jsx';
import Customers from './pages/Customers.jsx';
import WorkerStats from './pages/WorkerStats.jsx';

function Guard({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<Guard><Layout /></Guard>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="production-entry" element={<Guard roles={['worker','admin']}><ProductionEntry /></Guard>} />
        <Route path="my-entries"       element={<Guard roles={['worker']}><MyEntries /></Guard>} />
        <Route path="approvals"        element={<Guard roles={['supervisor','admin']}><Approvals /></Guard>} />
        <Route path="inventory"        element={<Guard roles={['inventory','supervisor','admin']}><Inventory /></Guard>} />
        <Route path="invoices"         element={<Guard roles={['sales','admin']}><Invoices /></Guard>} />
        <Route path="invoices/new"     element={<Guard roles={['sales','admin']}><CreateInvoice /></Guard>} />
        <Route path="customers"        element={<Guard roles={['sales','admin']}><Customers /></Guard>} />
        <Route path="reports"          element={<Guard roles={['admin']}><Reports /></Guard>} />
        <Route path="worker-stats"     element={<Guard roles={['admin']}><WorkerStats /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
