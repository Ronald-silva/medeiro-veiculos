import { useState, useEffect, lazy, Suspense } from 'react'
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

// Lazy load - carrega apenas quando necessário
const CatalogPage = lazy(() => import('./pages/CatalogPage'))
const CRMLogin = lazy(() => import('./pages/crm/Login'))
const CRMDashboard = lazy(() => import('./pages/crm/Dashboard'))
const ExecutiveReport = lazy(() => import('./pages/crm/ExecutiveReport'))
const ProtectedRoute = lazy(() => import('./components/crm/ProtectedRoute'))

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

// Loading fallback simples
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
  </div>
)

function App() {
  // Proteção global contra download de imagens de veículos
  useEffect(() => {
    // Bloqueia Ctrl+S (salvar página) e Ctrl+P (imprimir) nas páginas públicas
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'p')) {
        // Permite em páginas do CRM
        if (window.location.pathname.startsWith('/crm')) return
        e.preventDefault()
      }
    }

    // Bloqueia right-click em imagens protegidas
    const handleContextMenu = (e) => {
      if (e.target.closest('.protected-image-container')) {
        e.preventDefault()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('contextmenu', handleContextMenu)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [])

  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Página principal - carrega direto */}
            <Route path="/" element={<HomePage />} />

            {/* Rotas lazy-loaded */}
            <Route path="/catalogo" element={
              <Suspense fallback={<PageLoader />}>
                <CatalogPage />
              </Suspense>
            } />

            <Route path="/crm/login" element={
              <Suspense fallback={<PageLoader />}>
                <CRMLogin />
              </Suspense>
            } />

            <Route path="/crm" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute>
                  <CRMDashboard />
                </ProtectedRoute>
              </Suspense>
            } />

            <Route path="/crm/relatorio" element={
              <Suspense fallback={<PageLoader />}>
                <ProtectedRoute>
                  <ExecutiveReport />
                </ProtectedRoute>
              </Suspense>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  )
}

export default App 