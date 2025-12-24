import { useState } from 'react'
import { motion } from 'framer-motion'
import Rating from './ui/Rating'

export default function Header({ onChatOpen }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
            <a href="/" className="flex items-center">
              <h1 className="text-2xl md:text-3xl font-bold text-primary">
                Medeiros Veículos
              </h1>
            </a>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-6">
            <a
              href="/catalogo"
              className="text-gray-700 hover:text-primary font-medium transition-colors"
            >
              <i className="fas fa-car mr-2"></i>
              Nossos Veículos
            </a>
            <Rating score={4.9} reviews={127} showSource={false} />
            <button
              onClick={onChatOpen}
              className="btn btn-primary shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <i className="fas fa-robot mr-2"></i>
              Consultor IA 24/7
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
            className="lg:hidden mt-4 pb-4"
          >
            <div className="flex flex-col space-y-4">
              <a
                href="/catalogo"
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-700 hover:text-primary text-center font-medium py-2"
              >
                <i className="fas fa-car mr-2"></i>
                Nossos Veículos
              </a>
              <div className="text-center py-2">
                <Rating score={4.9} reviews={127} showSource={false} />
              </div>
              <button
                onClick={() => {
                  onChatOpen();
                  setIsMenuOpen(false);
                }}
                className="btn btn-primary w-full"
              >
                <i className="fas fa-robot mr-2"></i>
                Consultor IA 24/7
              </button>
              <a href="tel:+5585988852900" className="text-gray-600 hover:text-primary text-center">
                <i className="fas fa-phone mr-2"></i>
                (85) 98885-2900
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  )
} 