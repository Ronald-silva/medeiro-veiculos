import { motion } from 'framer-motion';

export default function Rating({ score = 4.9, reviews = 127, source = "Google Reviews", showSource = true }) {
  const stars = [];
  const fullStars = Math.floor(score);
  const hasHalfStar = score % 1 >= 0.5;

  // Gera estrelas cheias
  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <i key={`full-${i}`} className="fas fa-star text-yellow-400"></i>
    );
  }

  // Adiciona meia estrela se necessário
  if (hasHalfStar) {
    stars.push(
      <i key="half" className="fas fa-star-half-alt text-yellow-400"></i>
    );
  }

  // Completa com estrelas vazias
  const remainingStars = 5 - stars.length;
  for (let i = 0; i < remainingStars; i++) {
    stars.push(
      <i key={`empty-${i}`} className="far fa-star text-yellow-400"></i>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-2"
    >
      <div className="flex gap-0.5">
        {stars}
      </div>
      <div className="flex items-center gap-1 text-sm">
        <span className="font-bold text-gray-900">{score}</span>
        <span className="text-gray-600">({reviews})</span>
      </div>
      {showSource && (
        <span className="text-xs text-gray-500">{source}</span>
      )}
    </motion.div>
  );
}
