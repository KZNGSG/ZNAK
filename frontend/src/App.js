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
import KnowledgeBasePage from './pages/KnowledgeBasePage';
import ArticlePage from './pages/ArticlePage';
import QuotePage from './pages/QuotePage';
import TimelinePage from './pages/TimelinePage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PartnersPage from './pages/PartnersPage';
import AboutPage from './pages/AboutPage';
import TrainingPage from './pages/TrainingPage';

// Client cabinet pages
import ClientLayout from './components/cabinet/ClientLayout';
import ClientRoute from './components/cabinet/ClientRoute';
import ClientDashboard from './pages/cabinet/ClientDashboard';
import ClientContracts from './pages/cabinet/ClientContracts';
import ClientQuotes from './pages/cabinet/ClientQuotes';
import ClientServices from './pages/cabinet/ClientServices';
import ClientProfile from './pages/cabinet/ClientProfile';

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
import EmployeeContractCreate from './pages/employee/EmployeeContractCreate';
import EmployeeQuotes from './pages/employee/EmployeeQuotes';
import EmployeeContracts from './pages/employee/EmployeeContracts';
import EmployeeDocuments from './pages/employee/EmployeeDocuments';
import EmployeeStaff from './pages/employee/EmployeeStaff';
import SuperadminDashboard from './pages/employee/SuperadminDashboard';
import EmployeeSettings from './pages/employee/EmployeeSettings';
import EmployeeRoute from './components/employee/EmployeeRoute';
import EmployeeLayout from './components/employee/EmployeeLayout';
import EmployeePartners from './pages/employee/EmployeePartners';
import EmployeeEducation from './pages/employee/EmployeeEducation';
import EmployeeTasks from './pages/employee/EmployeeTasks';

// Partner pages
import { PartnerAuthProvider } from './context/PartnerAuthContext';
import PartnerRoute from './components/partner/PartnerRoute';
import PartnerLayout from './components/partner/PartnerLayout';
import PartnerLoginPage from './pages/partner/PartnerLoginPage';
import PartnerDashboard from './pages/partner/PartnerDashboard';
import PartnerLeads from './pages/partner/PartnerLeads';
import PartnerCalculator from './pages/partner/PartnerCalculator';
import PartnerMaterials from './pages/partner/PartnerMaterials';
import PartnerSettings from './pages/partner/PartnerSettings';
import AcceptInvitePage from './pages/partner/AcceptInvitePage';
import PartnerEducation from './pages/partner/PartnerEducation';
import PartnerCourseView from './pages/partner/PartnerCourseView';
import PartnerChapterView from './pages/partner/PartnerChapterView';

// Admin education
import AdminEducation from './pages/admin/AdminEducation';

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
          <PartnerAuthProvider>
            <Router>
            <div className="App">
              <Toaster position="top-right" richColors />
              <Routes>
                {/* Main site routes */}
                <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
                <Route path="/check" element={<MainLayout><CheckProductPage /></MainLayout>} />
                <Route path="/import" element={<MainLayout><ImportPage /></MainLayout>} />
                <Route path="/equipment" element={<MainLayout><EquipmentPage /></MainLayout>} />
                <Route path="/training" element={<MainLayout><TrainingPage /></MainLayout>} />
                <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
                <Route path="/quote" element={<MainLayout><QuotePage /></MainLayout>} />
                <Route path="/consultation" element={<MainLayout><ConsultationPage /></MainLayout>} />
                <Route path="/checklist" element={<MainLayout><ChecklistPage /></MainLayout>} />
                <Route path="/scanner" element={<MainLayout><ScannerPage /></MainLayout>} />
                <Route path="/knowledge" element={<MainLayout><KnowledgeBasePage /></MainLayout>} />
                <Route path="/knowledge/:articleId" element={<MainLayout><ArticlePage /></MainLayout>} />
                <Route path="/timeline" element={<MainLayout><TimelinePage /></MainLayout>} />
                <Route path="/login" element={<MainLayout><LoginPage /></MainLayout>} />
                <Route path="/verify-email" element={<MainLayout><VerifyEmailPage /></MainLayout>} />
                <Route path="/forgot-password" element={<MainLayout><ForgotPasswordPage /></MainLayout>} />
                <Route path="/reset-password" element={<MainLayout><ResetPasswordPage /></MainLayout>} />
                <Route path="/partners" element={<MainLayout><PartnersPage /></MainLayout>} />
                <Route path="/about" element={<MainLayout><AboutPage /></MainLayout>} />

                {/* Client cabinet routes */}
                <Route path="/cabinet" element={
                  <ClientRoute>
                    <ClientLayout><ClientDashboard /></ClientLayout>
                  </ClientRoute>
                } />
                <Route path="/cabinet/contracts" element={
                  <ClientRoute>
                    <ClientLayout><ClientContracts /></ClientLayout>
                  </ClientRoute>
                } />
                <Route path="/cabinet/quotes" element={
                  <ClientRoute>
                    <ClientLayout><ClientQuotes /></ClientLayout>
                  </ClientRoute>
                } />
                <Route path="/cabinet/services" element={
                  <ClientRoute>
                    <ClientLayout><ClientServices /></ClientLayout>
                  </ClientRoute>
                } />
                <Route path="/cabinet/profile" element={
                  <ClientRoute>
                    <ClientLayout><ClientProfile /></ClientLayout>
                  </ClientRoute>
                } />

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
                <Route path="/admin/education" element={
                  <AdminRoute>
                    <AdminLayout><AdminEducation /></AdminLayout>
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
                <Route path="/employee/clients/:id/contract/new" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeContractCreate /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/quote/new" element={
                  <EmployeeRoute>
                    <EmployeeLayout><QuotePage /></EmployeeLayout>
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
                <Route path="/employee/documents" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeDocuments /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/settings" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeSettings /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/partners" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeePartners /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/education" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeEducation /></EmployeeLayout>
                  </EmployeeRoute>
                } />
                <Route path="/employee/tasks" element={
                  <EmployeeRoute>
                    <EmployeeLayout><EmployeeTasks /></EmployeeLayout>
                  </EmployeeRoute>
                } />

                {/* Partner routes */}
                <Route path="/partner/login" element={<PartnerLoginPage />} />
                <Route path="/partner/accept-invite" element={<AcceptInvitePage />} />
                <Route path="/partner" element={
                  <PartnerRoute>
                    <PartnerLayout><PartnerDashboard /></PartnerLayout>
                  </PartnerRoute>
                } />
                <Route path="/partner/leads" element={
                  <PartnerRoute>
                    <PartnerLayout><PartnerLeads /></PartnerLayout>
                  </PartnerRoute>
                } />
                <Route path="/partner/calculator" element={
                  <PartnerRoute>
                    <PartnerLayout><PartnerCalculator /></PartnerLayout>
                  </PartnerRoute>
                } />
                <Route path="/partner/materials" element={
                  <PartnerRoute>
                    <PartnerLayout><PartnerMaterials /></PartnerLayout>
                  </PartnerRoute>
                } />
                <Route path="/partner/settings" element={
                  <PartnerRoute>
                    <PartnerLayout><PartnerSettings /></PartnerLayout>
                  </PartnerRoute>
                } />
                <Route path="/partner/education" element={
                  <PartnerRoute>
                    <PartnerLayout><PartnerEducation /></PartnerLayout>
                  </PartnerRoute>
                } />
                <Route path="/partner/education/:courseId" element={
                  <PartnerRoute>
                    <PartnerLayout><PartnerCourseView /></PartnerLayout>
                  </PartnerRoute>
                } />
                <Route path="/partner/education/:courseId/:chapterId" element={
                  <PartnerRoute>
                    <PartnerLayout><PartnerChapterView /></PartnerLayout>
                  </PartnerRoute>
                } />
              </Routes>
            </div>
            </Router>
          </PartnerAuthProvider>
        </EmployeeAuthProvider>
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
