import { motion } from 'framer-motion'

export default function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2 p-4">
      <div className="flex space-x-1">
        <motion.div
          className="w-2 h-2 bg-primary rounded-full"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="w-2 h-2 bg-primary rounded-full"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2
          }}
        />
        <motion.div
          className="w-2 h-2 bg-primary rounded-full"
          animate={{
            y: [0, -8, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4
          }}
        />
      </div>
      <span className="text-sm text-gray-500">Consultor está digitando...</span>
    </div>
  )
}
