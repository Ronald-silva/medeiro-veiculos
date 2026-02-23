import { useState, useEffect } from 'react'

// Formata telefone para exibição
function formatPhone(phone) {
  if (!phone) return 'Desconhecido'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 13) {
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
  }
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

// Formata data relativa
function formatRelativeDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}min atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays} dias atrás`

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// Formata hora
function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Componente de mensagem individual
function Message({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'} mb-2`}>
      <div
        className={`max-w-[80%] p-3 rounded-lg ${
          isUser
            ? 'bg-gray-100 text-gray-800'
            : 'bg-amber-500 text-white'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs opacity-70">
            {isUser ? '👤' : '🤖'} {formatTime(message.created_at)}
          </span>
          {message.tool_name && (
            <span className="text-xs bg-black/20 px-1 rounded">
              {message.tool_name}
            </span>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  )
}

// Componente de item da lista de conversas
function ConversationItem({ conversation, isSelected, onClick }) {
  const leadName = conversation.leads?.name || 'Cliente'
  const phone = formatPhone(conversation.whatsapp)
  const lastTime = formatRelativeDate(conversation.last_message_at)
  const preview = conversation.first_user_message?.slice(0, 50) || 'Sem mensagens'

  return (
    <div
      onClick={onClick}
      className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-medium text-gray-900 truncate">
          {leadName}
        </span>
        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
          {lastTime}
        </span>
      </div>
      <div className="text-xs text-gray-500 mb-1">{phone}</div>
      <div className="flex items-center gap-2">
        {conversation.resulted_in_appointment && (
          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
            ✅ Agendou
          </span>
        )}
        {conversation.status === 'ativa' && !conversation.resulted_in_appointment && (
          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
            ⏳ Ativa
          </span>
        )}
        {conversation.status === 'encerrada' && !conversation.resulted_in_appointment && (
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
            Encerrada
          </span>
        )}
        <span className="text-xs text-gray-400">
          {conversation.messages_count || 0} msgs
        </span>
      </div>
      <p className="text-sm text-gray-600 truncate mt-1">
        {conversation.first_user_message ? `${preview}...` : preview}
      </p>
    </div>
  )
}

// Componente principal
export default function ConversationsPanel() {
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [filter, setFilter] = useState('all') // all, appointment, active

  // Busca conversas
  useEffect(() => {
    fetchConversations()
  }, [filter])

  async function fetchConversations() {
    setLoading(true)
    try {
      let url = '/api/conversations?limit=50'

      if (filter === 'appointment') {
        url += '&withAppointment=true'
      } else if (filter === 'active') {
        url += '&status=ativa'
      }

      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      if (data.success) {
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Erro ao buscar conversas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Busca mensagens de uma conversa
  async function fetchMessages(conversationId) {
    setLoadingMessages(true)
    try {
      const response = await fetch(`/api/conversations?conversationId=${conversationId}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()

      if (data.success) {
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  // Seleciona conversa
  function handleSelectConversation(conversation) {
    setSelectedConversation(conversation)
    fetchMessages(conversation.id)
  }

  // Calcula estatísticas
  const stats = {
    total: conversations.length,
    withAppointment: conversations.filter(c => c.resulted_in_appointment).length,
    active: conversations.filter(c => c.status === 'ativa').length
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">
            💬 Conversas da Camila
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'all'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todas ({stats.total})
            </button>
            <button
              onClick={() => setFilter('appointment')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'appointment'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Agendaram ({stats.withAppointment})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === 'active'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Ativas ({stats.active})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex h-[500px]">
        {/* Lista de conversas */}
        <div className="w-1/3 border-r overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              Carregando conversas...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <p className="mb-2">Nenhuma conversa encontrada</p>
              <p className="text-xs">
                As conversas aparecerão aqui após a migração do banco de dados
              </p>
            </div>
          ) : (
            conversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedConversation?.id === conv.id}
                onClick={() => handleSelectConversation(conv)}
              />
            ))
          )}
        </div>

        {/* Detalhes da conversa */}
        <div className="w-2/3 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header da conversa */}
              <div className="bg-gray-50 px-4 py-3 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {selectedConversation.leads?.name || 'Cliente'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {formatPhone(selectedConversation.whatsapp)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p>Início: {formatRelativeDate(selectedConversation.started_at)} às {formatTime(selectedConversation.started_at)}</p>
                    <p>{selectedConversation.messages_count} mensagens</p>
                  </div>
                </div>
              </div>

              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                {loadingMessages ? (
                  <div className="text-center text-gray-500">
                    Carregando mensagens...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500">
                    Nenhuma mensagem encontrada
                  </div>
                ) : (
                  messages.map(msg => (
                    <Message key={msg.id} message={msg} />
                  ))
                )}
              </div>

              {/* Footer com métricas */}
              <div className="bg-gray-50 px-4 py-2 border-t text-xs text-gray-500 flex justify-between">
                <span>
                  {selectedConversation.user_messages_count || 0} msgs cliente |{' '}
                  {selectedConversation.assistant_messages_count || 0} msgs Camila
                </span>
                {selectedConversation.resulted_in_appointment && (
                  <span className="text-green-600 font-medium">
                    ✅ Converteu em agendamento
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-4xl mb-2">💬</p>
                <p>Selecione uma conversa para ver os detalhes</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
