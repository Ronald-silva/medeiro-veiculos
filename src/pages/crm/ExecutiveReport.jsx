import { useState, useEffect } from 'react'
import { getSales, getLeads } from '../../lib/supabase'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  PrinterIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

export default function ExecutiveReport() {
  const [period, setPeriod] = useState('month') // month, week, all
  const [sales, setSales] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    setLoading(true)
    try {
      const allSales = await getSales()
      const allLeads = await getLeads()

      const now = new Date()
      let startDate = new Date()

      if (period === 'week') {
        startDate.setDate(now.getDate() - 7)
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1)
      } else {
        startDate = new Date('2000-01-01') // All time
      }

      const filteredSales = allSales.filter(s => new Date(s.sale_date) >= startDate)
      const filteredLeads = allLeads.filter(l => new Date(l.created_at) >= startDate)

      setSales(filteredSales)
      setLeads(filteredLeads)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateMetrics = () => {
    const totalVendido = sales.reduce((sum, s) => sum + Number(s.sale_price || 0), 0)
    const totalVendas = sales.length
    const mediaVenda = totalVendas > 0 ? totalVendido / totalVendas : 0

    // Leads
    const totalLeads = leads.length
    const leadsFechados = leads.filter(l => l.status === 'fechado').length
    const leadsPerdidos = leads.filter(l => l.status === 'perdido').length
    const leadsAtivos = totalLeads - leadsFechados - leadsPerdidos

    // Taxa de conversão
    const taxaConversao = totalLeads > 0 ? (leadsFechados / totalLeads) * 100 : 0

    // Tempo médio de venda (aproximado - dias desde lead criado até venda)
    let tempoMedioVenda = 0
    if (sales.length > 0 && leads.length > 0) {
      const vendasComLead = sales.filter(s => s.lead_id)
      if (vendasComLead.length > 0) {
        const tempos = vendasComLead.map(venda => {
          const lead = leads.find(l => l.id === venda.lead_id)
          if (!lead) return 0
          const leadDate = new Date(lead.created_at)
          const saleDate = new Date(venda.sale_date)
          const diff = Math.floor((saleDate - leadDate) / (1000 * 60 * 60 * 24))
          return diff >= 0 ? diff : 0
        })
        tempoMedioVenda = tempos.reduce((a, b) => a + b, 0) / tempos.length
      }
    }

    return {
      totalVendido,
      totalVendas,
      mediaVenda,
      totalLeads,
      leadsFechados,
      leadsPerdidos,
      leadsAtivos,
      taxaConversao,
      tempoMedioVenda
    }
  }

  const metrics = calculateMetrics()

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(value || 0)
  }

  const handlePrint = () => {
    window.print()
  }

  const getPeriodLabel = () => {
    if (period === 'week') return 'Últimos 7 dias'
    if (period === 'month') return 'Último mês'
    return 'Todo período'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 print:shadow-none">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Relatório Executivo</h1>
              <p className="text-gray-600 mt-1">Medeiros Veículos - {getPeriodLabel()}</p>
              <p className="text-sm text-gray-500 mt-1">
                Gerado em: {new Date().toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
            <div className="flex gap-3 print:hidden">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">Últimos 7 dias</option>
                <option value="month">Último mês</option>
                <option value="all">Todo período</option>
              </select>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                <PrinterIcon className="w-5 h-5" />
                Imprimir
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Métricas Principais - Grid 2x2 */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Faturamento */}
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600 uppercase">Faturamento Total</h3>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-2">
                  {formatCurrency(metrics.totalVendido)}
                </p>
                <p className="text-sm text-gray-600">
                  Em {metrics.totalVendas} {metrics.totalVendas === 1 ? 'venda' : 'vendas'}
                </p>
              </div>

              {/* Ticket Médio */}
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600 uppercase">Ticket Médio</h3>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-2">
                  {formatCurrency(metrics.mediaVenda)}
                </p>
                <p className="text-sm text-gray-600">
                  Por venda realizada
                </p>
              </div>

              {/* Taxa de Conversão */}
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600 uppercase">Taxa de Conversão</h3>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">🎯</span>
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-2">
                  {metrics.taxaConversao.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600">
                  {metrics.leadsFechados} de {metrics.totalLeads} leads convertidos
                </p>
              </div>

              {/* Tempo Médio de Venda */}
              <div className="bg-white rounded-lg shadow-sm p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-600 uppercase">Tempo Médio de Venda</h3>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <span className="text-2xl">⏱️</span>
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-2">
                  {Math.round(metrics.tempoMedioVenda)} dias
                </p>
                <p className="text-sm text-gray-600">
                  Do lead até fechar venda
                </p>
              </div>
            </div>

            {/* Performance de Leads */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance de Atendimento</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{metrics.leadsFechados}</p>
                  <p className="text-sm text-gray-600 mt-1">Vendas Fechadas</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-3xl font-bold text-blue-600">{metrics.leadsAtivos}</p>
                  <p className="text-sm text-gray-600 mt-1">Em Atendimento</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-3xl font-bold text-red-600">{metrics.leadsPerdidos}</p>
                  <p className="text-sm text-gray-600 mt-1">Perdidos</p>
                </div>
              </div>
            </div>

            {/* Últimas Vendas */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Últimas Vendas</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veículo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sales.slice(0, 10).map((sale) => (
                      <tr key={sale.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{sale.vehicle_name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-right text-gray-900">
                          {formatCurrency(sale.sale_price)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{sale.payment_method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sales.length === 0 && (
                  <p className="text-center py-8 text-gray-500">Nenhuma venda no período</p>
                )}
              </div>
            </div>

            {/* Conclusão para o Dono */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-8 text-white mt-6 print:bg-blue-600">
              <h3 className="text-2xl font-bold mb-4">📈 Resumo Executivo</h3>
              <div className="space-y-3 text-lg">
                <p>
                  ✅ <strong>{metrics.totalVendas} carros vendidos</strong> gerando {formatCurrency(metrics.totalVendido)}
                </p>
                <p>
                  ✅ <strong>{metrics.taxaConversao.toFixed(0)}% de conversão</strong> - {metrics.leadsFechados} vendas de {metrics.totalLeads} interessados
                </p>
                <p>
                  ✅ <strong>Vendas em média {Math.round(metrics.tempoMedioVenda)} dias</strong> do primeiro contato até fechar
                </p>
                <p>
                  ✅ <strong>Ticket médio de {formatCurrency(metrics.mediaVenda)}</strong> por venda
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:bg-blue-600 { background-color: #2563eb !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}
