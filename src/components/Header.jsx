import { useState } from 'react'
import { motion } from 'framer-motion'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleWhatsApp = () => {
    const message = encodeURIComponent('Olá! Gostaria de saber mais sobre os carros disponíveis.')
    window.open(`https://wa.me/5585988852900?text=${message}`, '_blank')
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <a href="/" className="text-2xl font-bold text-primary">
              Medeiro Veículos
            </a>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="tel:+5585988852900" className="text-gray-600 hover:text-primary">
              <i className="fas fa-phone mr-2"></i>
              (85) 98885-2900
            </a>
            <a 
              href="https://maps.google.com/?q=Av. Américo Barreira, 909 - Loja 03, Fortaleza - CE" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-primary"
            >
              <i className="fas fa-map-marker-alt mr-2"></i>
              Av. Américo Barreira, 909
            </a>
            <button
              onClick={handleWhatsApp}
              className="btn btn-primary"
            >
              <i className="fab fa-whatsapp mr-2"></i>
              WhatsApp
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-600 hover:text-primary"
          >
            <i className={`fas fa-${isMenuOpen ? 'times' : 'bars'} text-2xl`}></i>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden mt-4 pb-4"
          >
            <div className="flex flex-col space-y-4">
              <a href="tel:+5585988852900" className="text-gray-600 hover:text-primary">
                <i className="fas fa-phone mr-2"></i>
                (85) 98885-2900
              </a>
              <a 
                href="https://maps.google.com/?q=Av. Américo Barreira, 909 - Loja 03, Fortaleza - CE" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-primary"
              >
                <i className="fas fa-map-marker-alt mr-2"></i>
                Av. Américo Barreira, 909
              </a>
              <button
                onClick={handleWhatsApp}
                className="btn btn-primary w-full"
              >
                <i className="fab fa-whatsapp mr-2"></i>
                WhatsApp
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  )
} 