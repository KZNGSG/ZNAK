import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { Toaster } from './components/ui/sonner';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CheckProductPage from './pages/CheckProductPage';
import ImportPage from './pages/ImportPage';
import EquipmentPage from './pages/EquipmentPage';
import ContactPage from './pages/ContactPage';

function App() {
  return (
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
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
