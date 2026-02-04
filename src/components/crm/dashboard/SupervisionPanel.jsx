import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function SupervisionPanel() {
  const [logs, setLogs] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, valid, invalid

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Busca logs de supervisão
      const { data: logsData, error: logsError } = await supabase
        .from('supervision_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (logsError) throw logsError
      setLogs(logsData || [])

      // Busca métricas
      const { data: metricsData, error: metricsError } = await supabase
        .from('supervision_metrics')
        .select('*')
        .order('day', { ascending: false })
        .limit(7)

      if (!metricsError) {
        setMetrics(metricsData)
      }
    } catch (error) {
      console.error('Erro ao carregar dados de supervisão:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcula métricas locais se não tiver a view
  const calculateLocalMetrics = () => {
    const total = logs.length
    const valid = logs.filter(l => l.is_valid).length
    const invalid = total - valid
    const accuracy = total > 0 ? ((valid / total) * 100).toFixed(1) : 0

    return { total, valid, invalid, accuracy }
  }

  const localMetrics = calculateLocalMetrics()

  // Filtra logs
  const filteredLogs = logs.filter(log => {
    if (filter === 'valid') return log.is_valid
    if (filter === 'invalid') return !log.is_valid
    return true
  })

  // Formata data
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="mt-4 text-gray-600">Carregando dados de supervisão...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Supervisão da Camila</h2>
            <p className="text-sm text-gray-600">Monitoramento de qualidade das respostas</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Atualizar
        </button>
      </div>

      {/* Métricas Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Validações</p>
              <p className="text-2xl font-bold text-gray-900">{localMetrics.total}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Respostas OK</p>
              <p className="text-2xl font-bold text-green-600">{localMetrics.valid}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Com Erros</p>
              <p className="text-2xl font-bold text-red-600">{localMetrics.invalid}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircleIcon className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Precisão</p>
              <p className="text-2xl font-bold text-purple-600">{localMetrics.accuracy}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Todas ({logs.length})
        </button>
        <button
          onClick={() => setFilter('valid')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'valid'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          OK ({localMetrics.valid})
        </button>
        <button
          onClick={() => setFilter('invalid')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'invalid'
              ? 'bg-red-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Com Erros ({localMetrics.invalid})
        </button>
      </div>

      {/* Lista de Logs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShieldCheckIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum log de supervisão encontrado</p>
              <p className="text-sm mt-2">Os logs aparecem quando a Camila responde mensagens</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data/Hora
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Resposta
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Erros/Avisos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.is_valid ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="w-4 h-4" />
                          OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircleIcon className="w-4 h-4" />
                          Erro
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                      <p className="truncate" title={log.response_text}>
                        {log.response_text?.substring(0, 100)}
                        {log.response_text?.length > 100 ? '...' : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {log.errors?.length > 0 && (
                        <div className="space-y-1">
                          {log.errors.map((error, i) => (
                            <p key={i} className="text-red-600 text-xs flex items-start gap-1">
                              <XCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              {error}
                            </p>
                          ))}
                        </div>
                      )}
                      {log.warnings?.length > 0 && (
                        <div className="space-y-1 mt-1">
                          {log.warnings.map((warning, i) => (
                            <p key={i} className="text-amber-600 text-xs flex items-start gap-1">
                              <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                              {warning}
                            </p>
                          ))}
                        </div>
                      )}
                      {(!log.errors || log.errors.length === 0) && (!log.warnings || log.warnings.length === 0) && (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Dica */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-purple-900">Como funciona a supervisão?</h4>
            <p className="text-sm text-purple-700 mt-1">
              A cada resposta da Camila, o sistema valida automaticamente:
            </p>
            <ul className="text-sm text-purple-700 mt-2 space-y-1 list-disc list-inside">
              <li>Se os veículos mencionados existem no estoque</li>
              <li>Se os preços estão corretos</li>
              <li>Se o tom da resposta está adequado</li>
              <li>Se está avançando na qualificação (BANT)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
