import { motion } from 'framer-motion'
import ConsultoraAvatar from './ConsultoraAvatar'

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

      <div className="container relative z-10 text-white text-center pt-20">
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
          className="flex justify-center"
        >
          <button
            onClick={onCtaClick}
            className="btn btn-primary text-lg px-8 py-4 shadow-2xl hover:shadow-accent/50 transition-all duration-300 flex items-center gap-3"
          >
            <ConsultoraAvatar size="sm" className="w-10 h-10 border-white/50" />
            <span className="font-semibold">Fale com a Camila</span>
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
      </div>
    </section>
  )
} 