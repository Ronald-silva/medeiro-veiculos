import { useState } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import VehicleCatalog from './components/VehicleCatalog'
import Testimonials from './components/Testimonials'
import Footer from './components/Footer'
import ConversationalLeadForm from './components/ConversationalLeadForm/ConversationalLeadForm'
import TrustSignals from './components/conversion/TrustSignals'

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleCtaClick = () => {
    setIsChatOpen(true)
  }

  const handleChatClose = () => {
    setIsChatOpen(false)
  }

  return (
    <HelmetProvider>
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
    </HelmetProvider>
  )
}

export default App 