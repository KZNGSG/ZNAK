import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './context/AuthContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { EmployeeAuthProvider } from './context/EmployeeAuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CheckProductPage from './pages/CheckProductPage';
import ImportPage from './pages/ImportPage';
import EquipmentPage from './pages/EquipmentPage';
import ContactPage from './pages/ContactPage';
import ConsultationPage from './pages/ConsultationPage';
import ChecklistPage from './pages/ChecklistPage';
import ScannerPage from './pages/ScannerPage';
import KnowledgePage from './pages/KnowledgePage';
import AccountPage from './pages/AccountPage';
import QuotePage from './pages/QuotePage';
import LoginPage from './pages/LoginPage';
import CabinetPage from './pages/CabinetPage';
import VerifyEmailPage from './pages/VerifyEmailPage';

// Admin pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminCallbacksPage from './pages/admin/AdminCallbacksPage';
import AdminRoute from './components/admin/AdminRoute';
import AdminLayout from './components/admin/AdminLayout';

// Employee pages
import EmployeeLoginPage from './pages/employee/EmployeeLoginPage';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeInbox from './pages/employee/EmployeeInbox';
import EmployeeClients from './pages/employee/EmployeeClients';
import EmployeeClientCard from './pages/employee/EmployeeClientCard';
import EmployeeClientNew from './pages/employee/EmployeeClientNew';
import EmployeeQuoteCreate from './pages/employee/EmployeeQuoteCreate';
import EmployeeQuotes from './pages/employee/EmployeeQuotes';
import EmployeeContracts from './pages/employee/EmployeeContracts';
import EmployeeStaff from './pages/employee/EmployeeStaff';
import SuperadminDashboard from './pages/employee/SuperadminDashboard';
import EmployeeRoute from './components/employee/EmployeeRoute';
import EmployeeLayout from './components/employee/EmployeeLayout';

// Main layout wrapper
const MainLayout = ({ children }) => (
  <>
    <Header />
    <main className="min-h-screen">
      {children}
    </main>
    <Footer />
  </>
);

function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <EmployeeAuthProvider>
          <Router>
            <div className="App">
              <Toaster position="top-right" richColors />
              <Routes>
                {/* Main site routes */}
                <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
                <Route path="/check" element={<MainLayout><CheckProductPage /></MainLayout>} />
                <Route path="/import" element={<MainLayout><ImportPage /></MainLayout>} />
                <Route path="/equipment" element={<MainLayout><EquipmentPage /></MainLayout>} />
                <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
                <Route path="/quote" element={<MainLayout><QuotePage /></MainLayout>} />
                <Route path="/consultation" element={<MainLayout><ConsultationPage /></MainLayout>} />
                <Route path="/checklist" element={<MainLayout><ChecklistPage /></MainLayout>} />
                <Route path="/scanner" element={<MainLayout><ScannerPage /></MainLayout>} />
                <Route path="/knowledge" element={<MainLayout><KnowledgePage /></MainLayout>} />
                <Route path="/account" element={<MainLayout><AccountPage /></MainLayout>} />
                <Route path="/login" element={<MainLayout><LoginPage /></MainLayout>} />
                <Route path="/cabinet" element={<MainLayout><CabinetPage /></MainLayout>} />
                <Route path="/verify-email" element={<MainLayout><VerifyEmailPage /></MainLayout>} />

                {/* Admin routes */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={
                  <AdminRoute>
                    <AdminLayout><AdminDashboard /></AdminLayout>
                  </AdminRoute>
                } />
                <Route path="/admin/users" element={
                  <AdminRoute>
                    <AdminLayout><AdminUsersPage /></AdminLayout>
                  </AdminRoute>
                } />
                <Route path="/admin/callbacks" element={
                  <AdminRoute>
                    <AdminLayout><AdminCallbacksPage /></AdminLayout>
                  </AdminRoute>
                } />

                {/* Employee routes */}
                <Route path="/employee/login" element={<EmployeeLoginPage />} />
                <Route path="/employee" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeDashboard /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/inbox" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeInbox /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/clients" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeClients /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/clients/new" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeClientNew /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/clients/:id" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeClientCard /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/clients/:id/quote" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeQuoteCreate /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/staff" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeStaff /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/analytics" element={
                  <EmployeeRoute>
                    <EmployeeLayout><SuperadminDashboard /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/quotes" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeQuotes /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/contracts" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeContracts /></EmployeeLayout>
                  </EmployeeRoute>
                } />
              </Routes>
            </div>
          </Router>
        </EmployeeAuthProvider>
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
