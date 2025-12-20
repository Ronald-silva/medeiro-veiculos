import { motion } from 'framer-motion';
import TrustBadge from './TrustBadge';

export default function TrustSignals() {
  const signals = [
    {
      icon: '🏆',
      number: '500+',
      label: 'Clientes Satisfeitos'
    },
    {
      icon: '⭐',
      number: '4.9/5',
      label: 'Avaliação Google'
    },
    {
      icon: '🚗',
      number: '100%',
      label: 'Carros Revisados'
    },
    {
      icon: '📋',
      number: 'DETRAN',
      label: 'Procedência Garantida'
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-4"
        >
          Por que escolher a <span className="text-primary">Medeiros Veículos</span>?
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="text-center text-gray-600 mb-12 max-w-2xl mx-auto"
        >
          Mais de 10 anos no mercado com transparência, qualidade e atendimento excepcional
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {signals.map((signal, index) => (
            <TrustBadge
              key={index}
              icon={signal.icon}
              number={signal.number}
              label={signal.label}
              index={index}
            />
          ))}
        </div>

        {/* Garantias adicionais */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center"
        >
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <i className="fas fa-shield-alt text-3xl text-green-500 mb-2"></i>
            <h3 className="font-semibold text-gray-900 mb-1">3 Meses de Garantia</h3>
            <p className="text-sm text-gray-600">Motor e câmbio protegidos</p>
          </div>

          <div className="p-4 bg-white rounded-lg shadow-sm">
            <i className="fas fa-tools text-3xl text-blue-500 mb-2"></i>
            <h3 className="font-semibold text-gray-900 mb-1">Revisão Completa</h3>
            <p className="text-sm text-gray-600">Entregamos 100% revisado</p>
          </div>

          <div className="p-4 bg-white rounded-lg shadow-sm">
            <i className="fas fa-handshake text-3xl text-purple-500 mb-2"></i>
            <h3 className="font-semibold text-gray-900 mb-1">Financiamento Facilitado</h3>
            <p className="text-sm text-gray-600">Até 100% do valor</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
