import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import './App.css';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CheckProductPage from './pages/CheckProductPage';
import ImportPage from './pages/ImportPage';
import EquipmentPage from './pages/EquipmentPage';
import ContactPage from './pages/ContactPage';
import ConsultationPage from './pages/ConsultationPage';
import ChecklistPage from './pages/ChecklistPage';
import AccountPage from './pages/AccountPage';

// Admin pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminContactsPage from './pages/admin/AdminContactsPage';
import AdminStatsPage from './pages/admin/AdminStatsPage';
import AdminRoute from './components/admin/AdminRoute';

// Layout wrapper to hide header/footer on admin pages
const AppContent = () => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <div className="App">
      <Toaster position="top-right" richColors />
      {!isAdminPage && <Header />}
      <main className={isAdminPage ? '' : 'min-h-screen'}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/check" element={<CheckProductPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/equipment" element={<EquipmentPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/consultation" element={<ConsultationPage />} />
          <Route path="/checklist" element={<ChecklistPage />} />
          <Route path="/account" element={<AccountPage />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          } />
          <Route path="/admin/contacts" element={
            <AdminRoute>
              <AdminContactsPage />
            </AdminRoute>
          } />
          <Route path="/admin/stats" element={
            <AdminRoute>
              <AdminStatsPage />
            </AdminRoute>
          } />
        </Routes>
      </main>
      {!isAdminPage && <Footer />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
