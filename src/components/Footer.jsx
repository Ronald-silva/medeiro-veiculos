import { motion } from 'framer-motion'

export default function Footer() {
  const handleWhatsApp = () => {
    const message = encodeURIComponent('Olá! Gostaria de saber mais sobre os carros disponíveis.')
    window.open(`https://wa.me/5585988852900?text=${message}`, '_blank')
  }

  return (
    <footer className="bg-gray-900 text-white">
      {/* CTA Section */}
      <div className="bg-primary">
        <div className="container py-12">
          <div className="text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-2xl md:text-3xl font-bold mb-4"
            >
              Estoque Limitado!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-lg mb-6"
            >
              Entre em contato agora e garanta as melhores condições
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleWhatsApp}
              className="btn btn-accent"
            >
              <i className="fab fa-whatsapp mr-2"></i>
              Fale Conosco
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
          {/* Contato */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contato</h3>
            <ul className="space-y-3">
              <li>
                <a href="tel:+5585988852900" className="hover:text-accent">
                  <i className="fas fa-phone mr-2"></i>
                  (85) 98885-2900
                </a>
              </li>
              <li>
                <a 
                  href="https://maps.google.com/?q=Av. Américo Barreira, 909 - Loja 03, Fortaleza - CE" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-accent"
                >
                  <i className="fas fa-map-marker-alt mr-2"></i>
                  Av. Américo Barreira, 909 - Loja 03
                </a>
              </li>
            </ul>
          </div>

          {/* Horário de Funcionamento */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Horário de Funcionamento</h3>
            <ul className="space-y-3">
              <li>
                <i className="far fa-clock mr-2"></i>
                Segunda a Sexta: 08h às 18h
              </li>
              <li>
                <i className="far fa-clock mr-2"></i>
                Sábado: 08h às 13h
              </li>
            </ul>
          </div>

          {/* Redes Sociais */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Redes Sociais</h3>
            <div className="flex justify-center space-x-4">
              <a 
                href="https://instagram.com/medeiroveiculos" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-2xl hover:text-accent"
              >
                <i className="fab fa-instagram"></i>
              </a>
              <a 
                href="https://facebook.com/medeiroveiculos" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-2xl hover:text-accent"
              >
                <i className="fab fa-facebook"></i>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} Medeiro Veículos. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
} 