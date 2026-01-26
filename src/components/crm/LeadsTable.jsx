import { useState } from 'react'
import { updateLeadStatus } from '../../lib/supabase'

const STATUS_LABELS = {
  novo: { label: 'Novo', color: 'bg-blue-100 text-blue-800' },
  em_conversa: { label: 'Em Conversa', color: 'bg-yellow-100 text-yellow-800' },
  qualificado: { label: 'Qualificado', color: 'bg-purple-100 text-purple-800' },
  agendado: { label: 'Agendado', color: 'bg-indigo-100 text-indigo-800' },
  visitou: { label: 'Visitou', color: 'bg-pink-100 text-pink-800' },
  negociando: { label: 'Negociando', color: 'bg-orange-100 text-orange-800' },
  proposta: { label: 'Proposta', color: 'bg-cyan-100 text-cyan-800' },
  fechado: { label: 'Fechado', color: 'bg-green-100 text-green-800' },
  perdido: { label: 'Perdido', color: 'bg-red-100 text-red-800' },
  reengajar: { label: 'Reengajar', color: 'bg-amber-100 text-amber-800' }
}

export default function LeadsTable({ leads, onUpdate }) {
  const [filter, setFilter] = useState('all')
  const [updating, setUpdating] = useState(null)

  const handleStatusChange = async (leadId, newStatus) => {
    setUpdating(leadId)
    try {
      await updateLeadStatus(leadId, newStatus)
      onUpdate()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status do lead')
    } finally {
      setUpdating(null)
    }
  }

  const filteredLeads = filter === 'all'
    ? leads
    : leads.filter(lead => lead.status === filter)

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header com Filtros */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Leads</h2>
          <span className="text-sm text-gray-600">{filteredLeads.length} leads</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos ({leads.length})
          </button>
          {Object.entries(STATUS_LABELS).map(([status, { label, color }]) => {
            const count = leads.filter(l => l.status === status).length
            if (count === 0) return null
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === status
                    ? color
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contato</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interesse</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orçamento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{lead.whatsapp}</div>
                  {lead.email && (
                    <div className="text-xs text-gray-500">{lead.email}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{lead.vehicle_type_interest || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {lead.budget_text || (lead.budget_max ? `R$ ${lead.budget_max.toLocaleString('pt-BR')}` : 'N/A')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(lead.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <select
                    value={lead.status || 'novo'}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    disabled={updating === lead.id}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer ${
                      STATUS_LABELS[lead.status || 'novo']?.color || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhum lead encontrado
          </div>
        )}
      </div>
    </div>
  )
}
