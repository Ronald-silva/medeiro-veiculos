import { motion } from 'framer-motion';
import useLiveViewers from '../../hooks/useLiveViewers';

export default function LiveViewers({
  count,
  variant = 'default',
  label = 'pessoas visualizando'
}) {
  // Se count não for fornecido, usa número dinâmico
  const dynamicCount = useLiveViewers(count || 23, 5);
  const viewerCount = count || dynamicCount;

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500 text-white rounded-full text-xs font-medium"
      >
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
        <span>{viewerCount}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={viewerCount} // Re-anima quando muda
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full shadow-md"
    >
      <div className="relative">
        <motion.div
          className="w-3 h-3 bg-white rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute inset-0 w-3 h-3 bg-white rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      <span className="text-sm font-semibold">
        <i className="fas fa-users mr-1"></i>
        {viewerCount} {label}
      </span>
    </motion.div>
  );
}
