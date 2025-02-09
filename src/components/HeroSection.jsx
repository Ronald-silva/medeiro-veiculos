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
        <div className="absolute inset-0 bg-black opacity-60"></div>
      </div>

      <div className="container relative z-10 text-white text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 mt-16"
        >
          <span className="inline-block bg-accent text-white px-6 py-3 rounded-full text-lg md:text-xl font-bold shadow-lg">
            🔥 Condições Imperdíveis
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl md:text-6xl font-bold mb-6"
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-12 flex justify-center"
        >
          <button
            onClick={onCtaClick}
            className="btn btn-accent text-lg group relative overflow-hidden w-64 py-3"
          >
            <span className="relative z-10">Quero Financiar</span>
            <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
          </button>
        </motion.div>

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
              className="text-center bg-black/30 p-6 rounded-lg backdrop-blur-sm hover:bg-black/40 transition-all duration-300"
            >
              <div className="bg-accent/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className={`fas ${benefit.icon} text-3xl text-accent`}></i>
              </div>
              <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
              <p className="text-gray-300">{benefit.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Botão Falar com Consultor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="mt-12"
        >
          <a
            href="https://api.whatsapp.com/send?phone=5585988852900&text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20os%20carros%20disponíveis!"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-whatsapp text-lg animate-pulse-slow w-64 py-3"
          >
            <i className="fab fa-whatsapp mr-2"></i>
            Falar com Consultor
          </a>
        </motion.div>
      </div>
    </section>
  )
} 