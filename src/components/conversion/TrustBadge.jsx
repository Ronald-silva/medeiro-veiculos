import { motion } from 'framer-motion';

export default function TrustBadge({ icon, number, label, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="flex flex-col items-center text-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-3xl font-bold text-primary mb-1">{number}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </motion.div>
  );
}
