import { useRef } from 'react'
import { HelmetProvider } from 'react-helmet-async'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import LeadForm from './components/LeadForm'
import CarShowcase from './components/CarShowcase'
import Footer from './components/Footer'

function App() {
  const formRef = useRef(null)

  const handleCtaClick = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>
          <HeroSection onCtaClick={handleCtaClick} />
          <div ref={formRef}>
            <LeadForm />
          </div>
          <CarShowcase />
        </main>
        <Footer />
      </div>
    </HelmetProvider>
  )
}

export default App 