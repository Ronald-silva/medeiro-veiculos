import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import TypingIndicator from './TypingIndicator'
import QuickReplies from './QuickReplies'
import ConsultoraAvatar from '../ConsultoraAvatar'
import {
  sendMessage,
  getConversationHistory,
  saveMessageToLocal,
  generateConversationId
} from '../../services/chatService'

export default function ConversationalLeadForm({ isOpen, onClose, initialContext = {} }) {
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const [quickReplies, setQuickReplies] = useState([])
  const messagesEndRef = useRef(null)
  const chatContainerRef = useRef(null)

  // Inicializa conversa
  useEffect(() => {
    if (isOpen && !conversationId) {
      const convId = generateConversationId()
      setConversationId(convId)

      // Carrega histórico se existir
      const history = getConversationHistory(convId)
      if (history.length > 0) {
        setMessages(history)
      } else {
        // Primeira mensagem de saudação do bot (seguindo o prompt)
        const welcomeMessage = {
          role: 'assistant',
          content: 'E aí! Bem-vindo à Medeiros Veículos 🚗\nTô aqui pra te ajudar a achar o carro ideal. Qual tipo de veículo você curte mais?',
          timestamp: new Date().toISOString()
        }
        setMessages([welcomeMessage])
        saveMessageToLocal(convId, welcomeMessage)

        // Quick replies iniciais
        setQuickReplies([
          'SUV',
          'Sedan',
          'Hatch',
          'Picape'
        ])
      }
    }
  }, [isOpen, conversationId])

  // Scroll automático para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  // Handler de envio de mensagem
  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || !conversationId) return

    // Limpa quick replies após primeira interação
    setQuickReplies([])

    // Adiciona mensagem do usuário
    const userMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    saveMessageToLocal(conversationId, userMessage)

    // Mostra indicador de digitação
    setIsTyping(true)

    try {
      // Envia para API
      const response = await sendMessage(messageText, conversationId, initialContext)

      // Remove indicador de digitação
      setIsTyping(false)

      if (response.success && response.message) {
        const assistantMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date().toISOString()
        }

        setMessages(prev => [...prev, assistantMessage])
        saveMessageToLocal(conversationId, assistantMessage)

        // Se a IA retornou quick replies, mostra elas
        // (isso pode ser expandido no futuro)
        if (response.quickReplies) {
          setQuickReplies(response.quickReplies)
        }
      } else {
        // Mensagem de erro
        const errorMessage = {
          role: 'assistant',
          content: response.message || 'Desculpe, ocorreu um erro. Tente novamente.',
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      setIsTyping(false)
      console.error('Error in handleSendMessage:', error)

      const errorMessage = {
        role: 'assistant',
        content: 'Desculpe, estou com problemas técnicos. Por favor, entre em contato pelo WhatsApp: (85) 92002-1150',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  // Handler de quick reply
  const handleQuickReply = (option) => {
    handleSendMessage(option)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-secondary p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <ConsultoraAvatar size="lg" className="bg-white/20" />
                <div>
                  <h3 className="text-xl font-bold">Consultora Camila</h3>
                  <p className="text-sm text-white/80">Medeiros Veículos • Online</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 bg-gray-50"
            style={{ scrollBehavior: 'smooth' }}
          >
            {messages.map((msg, index) => (
              <ChatMessage
                key={index}
                message={msg}
                isUser={msg.role === 'user'}
              />
            ))}

            {isTyping && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {quickReplies.length > 0 && !isTyping && (
            <QuickReplies options={quickReplies} onSelect={handleQuickReply} />
          )}

          {/* Input */}
          <ChatInput onSend={handleSendMessage} disabled={isTyping} />

          {/* Footer */}
          <div className="bg-gray-100 px-6 py-3 text-center text-xs text-gray-600">
            <i className="fas fa-lock mr-2"></i>
            Suas informações estão seguras e protegidas
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
