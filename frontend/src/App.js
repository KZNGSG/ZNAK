import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import ScannerPage from './pages/ScannerPage';
import KnowledgePage from './pages/KnowledgePage';
import AccountPage from './pages/AccountPage';
import QuotePage from './pages/QuotePage';
import LoginPage from './pages/LoginPage';
import CabinetPage from './pages/CabinetPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster position="top-right" richColors />
          <Header />
          <main className="min-h-screen">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/check" element={<CheckProductPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/quote" element={<QuotePage />} />
              <Route path="/consultation" element={<ConsultationPage />} />
              <Route path="/checklist" element={<ChecklistPage />} />
              <Route path="/scanner" element={<ScannerPage />} />
              <Route path="/knowledge" element={<KnowledgePage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/cabinet" element={<CabinetPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
