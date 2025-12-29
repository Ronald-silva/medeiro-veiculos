import { motion } from 'framer-motion'
import ConsultoraAvatar from '../ConsultoraAvatar'

export default function ChatMessage({ message, isUser }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start items-end'} mb-4 gap-2`}
    >
      {/* Avatar da Camila (só em mensagens dela, estilo WhatsApp) */}
      {!isUser && (
        <ConsultoraAvatar size="sm" className="flex-shrink-0" />
      )}

      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary text-white rounded-br-none'
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <span className={`text-xs mt-1 block ${isUser ? 'text-white/70' : 'text-gray-500'}`}>
          {new Date(message.timestamp || Date.now()).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </motion.div>
  )
}
