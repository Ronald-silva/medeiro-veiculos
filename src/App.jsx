import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './contexts/AuthContext'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import VehicleCatalog from './components/VehicleCatalog'
import Testimonials from './components/Testimonials'
import Footer from './components/Footer'
import ConversationalLeadForm from './components/ConversationalLeadForm/ConversationalLeadForm'
import TrustSignals from './components/conversion/TrustSignals'
import CatalogPage from './pages/CatalogPage'
import CRMLogin from './pages/crm/Login'
import CRMDashboard from './pages/crm/Dashboard'
import ExecutiveReport from './pages/crm/ExecutiveReport'
import ProtectedRoute from './components/crm/ProtectedRoute'

function HomePage() {
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleCtaClick = () => {
    setIsChatOpen(true)
  }

  const handleChatClose = () => {
    setIsChatOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onChatOpen={() => setIsChatOpen(true)} />
      <main>
        <HeroSection onCtaClick={handleCtaClick} />
        <TrustSignals />
        <VehicleCatalog onVehicleInterest={(carName) => setIsChatOpen(true)} />
        <Testimonials />
      </main>
      <Footer />

      {/* Chat Conversacional */}
      <ConversationalLeadForm
        isOpen={isChatOpen}
        onClose={handleChatClose}
      />
    </div>
  )
}

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Página principal */}
            <Route path="/" element={<HomePage />} />

            {/* Catálogo de Veículos */}
            <Route path="/catalogo" element={<CatalogPage />} />

            {/* CRM - Login */}
            <Route path="/crm/login" element={<CRMLogin />} />

            {/* CRM - Dashboard (Protegido) */}
            <Route
              path="/crm"
              element={
                <ProtectedRoute>
                  <CRMDashboard />
                </ProtectedRoute>
              }
            />

            {/* CRM - Relatório Executivo (Protegido) */}
            <Route
              path="/crm/relatorio"
              element={
                <ProtectedRoute>
                  <ExecutiveReport />
                </ProtectedRoute>
              }
            />

            {/* Rota 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  )
}

export default App 