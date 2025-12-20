import { motion } from 'framer-motion';
import useCountdown from '../../hooks/useCountdown';

export default function CountdownTimer({
  label = "Oferta válida por",
  targetTime = "23:59:59",
  variant = "default"
}) {
  const { hours, minutes, seconds, isExpired } = useCountdown(targetTime);

  if (isExpired) {
    return null; // Ou mostrar mensagem "Oferta encerrada"
  }

  // Destaca em vermelho quando falta menos de 1 hora
  const isUrgent = hours === 0 && minutes < 60;

  return (
    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full ${
      variant === 'hero'
        ? 'bg-red-500 text-white shadow-lg'
        : 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-md'
    }`}>
      <i className="fas fa-clock text-lg"></i>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{label}:</span>
        <div className="flex items-center gap-1">
          <TimeUnit value={hours} label="h" isUrgent={isUrgent} />
          <span className="font-bold">:</span>
          <TimeUnit value={minutes} label="m" isUrgent={isUrgent} />
          <span className="font-bold">:</span>
          <TimeUnit value={seconds} label="s" isUrgent={isUrgent} />
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label, isUrgent }) {
  return (
    <motion.div
      className={`flex flex-col items-center ${isUrgent ? 'animate-pulse' : ''}`}
      animate={isUrgent && value % 2 === 0 ? { scale: [1, 1.1, 1] } : {}}
      transition={{ duration: 0.5 }}
    >
      <span className="text-xl font-bold leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] opacity-75 leading-none">{label}</span>
    </motion.div>
  );
}
