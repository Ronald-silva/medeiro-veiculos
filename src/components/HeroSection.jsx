import { motion } from 'framer-motion'

export default function HeroSection({ onCtaClick }) {
  return (
    <section className="relative min-h-screen flex items-center py-20">
      {/* Background com gradiente */}
      <div 
        className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-90"
        style={{
          backgroundImage: 'url("/hero-bg.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div>
      </div>

      <div className="container relative z-10 text-white text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-6xl font-bold mb-6 mt-16"
        >
          Carros Seminovos Premium em Fortaleza
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto"
        >
          Financiamento facilitado com as melhores taxas do mercado
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCtaClick}
          className="btn btn-accent text-lg mx-auto"
        >
          Quero Financiar
        </motion.button>

        {/* Grid de benefícios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
          {[
            {
              icon: 'fa-car',
              title: 'Carros Revisados',
              description: 'Todos os veículos passam por rigorosa inspeção'
            },
            {
              icon: 'fa-money-bill-wave',
              title: 'Financiamento Facilitado',
              description: 'As melhores taxas do mercado'
            },
            {
              icon: 'fa-check-circle',
              title: 'Aprovação Rápida',
              description: 'Crédito aprovado em até 24h'
            },
            {
              icon: 'fa-clock',
              title: 'Estoque Limitado',
              description: 'Aproveite as ofertas disponíveis'
            }
          ].map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
              className="text-center bg-black/30 p-6 rounded-lg"
            >
              <i className={`fas ${benefit.icon} text-4xl mb-4 text-accent`}></i>
              <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
              <p className="text-gray-300">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
} 