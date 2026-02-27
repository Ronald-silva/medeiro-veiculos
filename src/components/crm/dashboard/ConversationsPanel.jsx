import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowPathIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import { isToday, isYesterday, format, differenceInMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─────────────────────────────────────────────────────────────
// Helpers de formatação
// ─────────────────────────────────────────────────────────────

function formatPhone(phone) {
  if (!phone) return 'Desconhecido'
  const c = phone.replace(/\D/g, '')
  if (c.length === 13) return `+${c.slice(0, 2)} (${c.slice(2, 4)}) ${c.slice(4, 9)}-${c.slice(9)}`
  if (c.length === 11) return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`
  return phone
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMins = Math.floor((now - date) / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}min`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays}d`
  return format(date, 'dd/MM', { locale: ptBR })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Retorna "Hoje", "Ontem" ou "DD/MM/YYYY"
function formatDateLabel(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isToday(date)) return 'Hoje'
  if (isYesterday(date)) return 'Ontem'
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

// Verifica se dois timestamps são do mesmo dia
function isSameDay(a, b) {
  if (!a || !b) return false
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
}

// True se a mensagem pode ser agrupada com a anterior (mesmo remetente, < 2 min)
function canGroupWithPrevious(msg, prev) {
  if (!prev) return false
  if (msg.role !== prev.role) return false
  return differenceInMinutes(new Date(msg.created_at), new Date(prev.created_at)) < 2
}

// Iniciais do nome para o avatar
function getInitials(name) {
  if (!name) return 'C'
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// ─────────────────────────────────────────────────────────────
// Componente: Separador de data
// ─────────────────────────────────────────────────────────────

function DateSeparator({ label }) {
  return (
    <div className="flex items-center gap-3 my-4 select-none">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-[11px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full whitespace-nowrap font-medium">
        {label}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Componente: Balão de mensagem
// ─────────────────────────────────────────────────────────────

function MessageBubble({ message, isGrouped }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-start' : 'justify-end'} ${isGrouped ? 'mt-0.5' : 'mt-3'}`}>
      <div className={`flex flex-col max-w-[78%] ${isUser ? 'items-start' : 'items-end'}`}>
        {/* Balão */}
        <div
          className={`px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed break-words ${
            isUser
              ? 'bg-white text-gray-800 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100'
              : 'bg-amber-500 text-white rounded-2xl rounded-tr-sm shadow-sm'
          }`}
        >
          {message.content}
        </div>

        {/* Metadados: timestamp + tool (apenas na última do grupo) */}
        {!isGrouped && (
          <div className={`flex items-center gap-1.5 mt-0.5 ${isUser ? 'pl-1' : 'pr-1'}`}>
            {message.tool_name && (
              <span className="text-[10px] text-gray-400 italic">
                {message.tool_name}
              </span>
            )}
            <span className="text-[10px] text-gray-400">
              {formatTime(message.created_at)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Componente: Item da lista de conversas
// ─────────────────────────────────────────────────────────────

function ConversationListItem({ conversation, isSelected, onClick }) {
  const leadName = conversation.leads?.name || 'Cliente'
  const initials = getInitials(leadName)
  const phone = formatPhone(conversation.whatsapp)
  const lastTime = formatRelativeDate(conversation.last_message_at)

  // Usa última mensagem como preview (API já retorna last_message)
  const preview = conversation.last_message || conversation.first_user_message || 'Sem mensagens'
  const previewRole = conversation.last_message_role

  const statusBadge = conversation.resulted_in_appointment
    ? { bg: 'bg-green-100', text: 'text-green-700', label: '✓ Agendou' }
    : conversation.status === 'ativa'
    ? { bg: 'bg-blue-100', text: 'text-blue-700', label: '● Ativa' }
    : { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Encerrada' }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors
        flex items-start gap-3 hover:bg-amber-50/40
        ${isSelected
          ? 'bg-amber-50 border-l-[3px] border-l-amber-500'
          : 'border-l-[3px] border-l-transparent'
        }`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex-shrink-0
        flex items-center justify-center text-sm font-bold select-none">
        {initials}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-1">
          <span className="font-semibold text-gray-900 truncate text-sm">{leadName}</span>
          <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">{lastTime}</span>
        </div>

        <div className="flex items-center gap-1.5 mt-px">
          <span className={`text-[10px] font-medium px-1.5 py-px rounded-full flex-shrink-0 ${statusBadge.bg} ${statusBadge.text}`}>
            {statusBadge.label}
          </span>
          <span className="text-[11px] text-gray-400 truncate">{phone}</span>
        </div>

        <p className="text-xs text-gray-500 truncate mt-1">
          {previewRole === 'assistant' && <span className="text-amber-600 font-medium">Camila: </span>}
          {preview}
        </p>
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Componente: Estado vazio (nenhuma conversa selecionada)
// ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 p-8">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-3xl">
        💬
      </div>
      <div className="text-center">
        <p className="font-medium text-gray-500">Selecione uma conversa</p>
        <p className="text-sm mt-1">Escolha uma conversa na lista para ver o histórico</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────

export default function ConversationsPanel() {
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [filter, setFilter] = useState('all')
  // Controla qual painel está visível no mobile
  const [mobilePanel, setMobilePanel] = useState('list') // 'list' | 'messages'

  const messagesEndRef = useRef(null)

  // Auto-scroll para a última mensagem sempre que messages muda
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const fetchConversations = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/conversations?limit=50'
      if (filter === 'appointment') url += '&withAppointment=true'
      else if (filter === 'active') url += '&status=ativa'

      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.success) setConversations(data.conversations || [])
    } catch (error) {
      console.error('Erro ao buscar conversas:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  async function fetchMessages(conversationId) {
    setLoadingMessages(true)
    setMessages([])
    try {
      const response = await fetch(`/api/conversations?conversationId=${conversationId}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (data.success) setMessages(data.messages || [])
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  function handleSelectConversation(conversation) {
    setSelectedConversation(conversation)
    fetchMessages(conversation.id)
    setMobilePanel('messages') // no mobile, muda para o painel de mensagens
  }

  // Estatísticas para os filtros
  const stats = {
    total: conversations.length,
    withAppointment: conversations.filter(c => c.resulted_in_appointment).length,
    active: conversations.filter(c => c.status === 'ativa').length,
  }

  // Renderiza mensagens com separadores de data e agrupamento
  function renderMessages() {
    if (loadingMessages) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400 gap-2">
          <ArrowPathIcon className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando mensagens...</span>
        </div>
      )
    }

    if (messages.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          Nenhuma mensagem encontrada
        </div>
      )
    }

    return messages.map((msg, index) => {
      const prev = messages[index - 1] || null
      const needsDateSep = !prev || !isSameDay(prev.created_at, msg.created_at)
      const grouped = !needsDateSep && canGroupWithPrevious(msg, prev)

      return (
        <div key={msg.id}>
          {needsDateSep && <DateSeparator label={formatDateLabel(msg.created_at)} />}
          <MessageBubble message={msg} isGrouped={grouped} />
        </div>
      )
    })
  }

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col"
      style={{ height: 'calc(100vh - 280px)', minHeight: '500px', maxHeight: '820px' }}
    >
      {/* ── Header principal com filtros ── */}
      <div className="bg-gray-50 px-4 py-3 border-b flex-shrink-0">
        <div className="flex justify-between items-center gap-3">
          <h3 className="font-semibold text-gray-900 whitespace-nowrap">
            💬 Conversas da Camila
          </h3>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { key: 'all',         label: `Todas (${stats.total})`,              active: 'bg-amber-500 text-white' },
              { key: 'appointment', label: `Agendaram (${stats.withAppointment})`, active: 'bg-green-500 text-white' },
              { key: 'active',      label: `Ativas (${stats.active})`,             active: 'bg-blue-500 text-white' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === f.key ? f.active : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {f.label}
              </button>
            ))}

            {/* Botão de refresh */}
            <button
              onClick={fetchConversations}
              disabled={loading}
              title="Atualizar"
              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-amber-600
                transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-1"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Corpo: dois painéis ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Painel esquerdo: lista de conversas ──
            Desktop: sempre visível (w-72 lg:w-80)
            Mobile:  visível apenas quando mobilePanel === 'list' */}
        <div className={`
          flex-shrink-0 border-r border-gray-100 overflow-y-auto
          w-full md:w-72 lg:w-80
          ${mobilePanel === 'list' ? 'flex flex-col' : 'hidden md:flex md:flex-col'}
        `}>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              <span className="text-sm">Carregando...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <p className="text-sm font-medium mb-1">Nenhuma conversa</p>
              <p className="text-xs">
                {filter !== 'all' ? 'Tente outro filtro.' : 'As conversas aparecerão aqui.'}
              </p>
            </div>
          ) : (
            conversations.map(conv => (
              <ConversationListItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedConversation?.id === conv.id}
                onClick={() => handleSelectConversation(conv)}
              />
            ))
          )}
        </div>

        {/* ── Painel direito: mensagens ──
            Desktop: sempre visível (flex-1)
            Mobile:  visível apenas quando mobilePanel === 'messages' */}
        <div className={`
          flex-1 flex-col min-w-0
          ${mobilePanel === 'messages' ? 'flex' : 'hidden md:flex'}
        `}>
          {selectedConversation ? (
            <>
              {/* Header da conversa selecionada */}
              <div className="bg-gray-50 px-4 py-3 border-b flex-shrink-0 flex items-center gap-3">
                {/* Botão voltar — só aparece no mobile */}
                <button
                  onClick={() => setMobilePanel('list')}
                  className="md:hidden -ml-1 p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
                  aria-label="Voltar para lista"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex-shrink-0
                  flex items-center justify-center text-sm font-bold select-none">
                  {getInitials(selectedConversation.leads?.name || 'C')}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm truncate">
                    {selectedConversation.leads?.name || 'Cliente'}
                  </h4>
                  <p className="text-xs text-gray-500 truncate">
                    {formatPhone(selectedConversation.whatsapp)}
                  </p>
                </div>

                <div className="text-right text-xs text-gray-500 hidden sm:block flex-shrink-0">
                  <p>Início: {formatTime(selectedConversation.started_at)}</p>
                  <p>{selectedConversation.messages_count || 0} mensagens</p>
                </div>
              </div>

              {/* Área de mensagens */}
              <div className="flex-1 overflow-y-auto px-4 py-3 bg-gray-50/60">
                {renderMessages()}
                {/* Âncora de auto-scroll */}
                <div ref={messagesEndRef} />
              </div>

              {/* Footer com métricas */}
              <div className="bg-gray-50 px-4 py-2 border-t flex-shrink-0
                flex items-center justify-between text-xs text-gray-500">
                <span>
                  {selectedConversation.user_messages_count || 0} cliente ·{' '}
                  {selectedConversation.assistant_messages_count || 0} Camila
                </span>
                {selectedConversation.resulted_in_appointment && (
                  <span className="text-green-600 font-medium">✅ Converteu em agendamento</span>
                )}
                {selectedConversation.vehicle_interest && (
                  <span className="text-amber-600 truncate max-w-[140px]" title={selectedConversation.vehicle_interest}>
                    🚗 {selectedConversation.vehicle_interest}
                  </span>
                )}
              </div>
            </>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  )
}
