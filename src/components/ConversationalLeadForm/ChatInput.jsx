import { useState } from 'react'
import { motion } from 'framer-motion'

export default function ChatInput({ onSend, disabled }) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            placeholder="Digite sua mensagem..."
            rows={1}
            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            style={{
              minHeight: '48px',
              maxHeight: '120px'
            }}
            onInput={(e) => {
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
          />
        </div>
        <motion.button
          type="submit"
          disabled={!message.trim() || disabled}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn btn-primary rounded-full w-12 h-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fas fa-paper-plane"></i>
        </motion.button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Pressione Enter para enviar, Shift+Enter para nova linha
      </p>
    </form>
  )
}
