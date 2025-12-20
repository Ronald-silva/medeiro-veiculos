import { motion } from 'framer-motion'

export default function QuickReplies({ options, onSelect }) {
  if (!options || options.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-4 px-4">
      {options.map((option, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: index * 0.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(option)}
          className="px-4 py-2 bg-white border-2 border-primary text-primary rounded-full text-sm font-medium hover:bg-primary hover:text-white transition-colors duration-200"
        >
          {option}
        </motion.button>
      ))}
    </div>
  )
}
