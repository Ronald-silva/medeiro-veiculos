import {
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '../../../utils/calculations'

export default function MetricsCards({ stats = {}, sales = [], leads = [] }) {
  // Garante valores seguros usando nullish coalescing
  const safeStats = {
    medeirosRecebe: stats.medeirosRecebe ?? stats.medeiros_recebe ?? 0,
    totalVendido: stats.totalVendido ?? stats.receita_total ?? 0,
    totalComissao: stats.totalComissao ?? stats.comissao_total ?? 0,
    totalVendas: stats.totalVendas ?? stats.total_vendas ?? 0,
    ronaldComissaoTotal: stats.ronaldComissaoTotal ?? stats.ronald_comissao_total ?? 0,
    ronaldComissaoPaga: stats.ronaldComissaoPaga ?? stats.ronald_comissao_paga ?? 0,
    ronaldComissaoPendente: stats.ronaldComissaoPendente ?? stats.ronald_comissao_pendente ?? 0,
    adelComissaoTotal: stats.adelComissaoTotal ?? stats.adel_comissao_total ?? 0,
    adelComissaoPaga: stats.adelComissaoPaga ?? stats.adel_comissao_paga ?? 0,
    adelComissaoPendente: stats.adelComissaoPendente ?? stats.adel_comissao_pendente ?? 0,
    totalLeads: stats.totalLeads ?? stats.total_leads ?? leads.length ?? 0,
    leadsNovos: stats.leadsNovos ?? stats.leads_novos ?? 0,
  }

  // Métricas calculadas
  const taxaConversao = safeStats.totalLeads > 0
    ? ((safeStats.totalVendas / safeStats.totalLeads) * 100).toFixed(1)
    : 0

  const ticketMedio = safeStats.totalVendas > 0
    ? safeStats.totalVendido / safeStats.totalVendas
    : 0

  // Vendas do mês atual
  const hoje = new Date()
  const mesAtual = hoje.getMonth()
  const anoAtual = hoje.getFullYear()

  const vendasMesAtual = sales.filter(sale => {
    const dataSale = new Date(sale.sale_date || sale.created_at)
    return dataSale.getMonth() === mesAtual && dataSale.getFullYear() === anoAtual
  })

  const faturamentoMes = vendasMesAtual.reduce((sum, sale) => sum + Number(sale.sale_price || 0), 0)
  const qtdVendasMes = vendasMesAtual.length

  // Meta mensal (configurável - padrão R$ 200.000)
  const metaMensal = 200000
  const progressoMeta = Math.min((faturamentoMes / metaMensal) * 100, 100)

  // Leads por status
  const leadsNovos = leads.filter(l => l.status === 'novo').length
  const leadsEmContato = leads.filter(l => l.status === 'em_conversa' || l.status === 'qualificado').length
  const leadsConvertidos = leads.filter(l => l.status === 'fechado').length

  return (
    <>
      {/* ROW 1: Métricas Financeiras Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        {/* Medeiros (Dono) Recebe */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-blue-100">🏪 Medeiros Recebe</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate">
                {formatCurrency(safeStats.medeirosRecebe)}
              </p>
              <p className="text-xs text-blue-100 mt-1">
                Dono da loja (líquido)
              </p>
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-blue-400">
                <p className="text-xs text-blue-100 truncate">
                  De {formatCurrency(safeStats.totalVendido)} vendidos
                </p>
              </div>
            </div>
            <div className="p-2 sm:p-3 bg-blue-400 bg-opacity-30 rounded-lg flex-shrink-0">
              <BanknotesIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Comissão Total (Ronald + Adel) */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">💰 Comissão Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">
                {formatCurrency(safeStats.totalComissao)}
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                Ronald + Adel ({safeStats.totalVendas} vendas)
              </p>
            </div>
            <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg flex-shrink-0">
              <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Ronald Recebe (SUA PARTE) */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-green-100">💵 Ronald Recebe</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate">
                {formatCurrency(safeStats.ronaldComissaoTotal)}
              </p>
              <p className="text-xs text-green-100 mt-1">
                Sua parte da comissão
              </p>
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-green-400 space-y-1">
                <p className="text-xs text-green-100 truncate">
                  ✓ Pago: {formatCurrency(safeStats.ronaldComissaoPaga)}
                </p>
                <p className="text-xs text-green-100 truncate">
                  ⏳ Pendente: {formatCurrency(safeStats.ronaldComissaoPendente)}
                </p>
              </div>
            </div>
            <div className="p-2 sm:p-3 bg-green-400 bg-opacity-30 rounded-lg flex-shrink-0">
              <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Adel Recebe (PARTE DELE) */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-purple-100">🤝 Adel Recebe</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 truncate">
                {formatCurrency(safeStats.adelComissaoTotal)}
              </p>
              <p className="text-xs text-purple-100 mt-1">
                Parte do Adel da comissão
              </p>
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-purple-400 space-y-1">
                <p className="text-xs text-purple-100 truncate">
                  ✓ Pago: {formatCurrency(safeStats.adelComissaoPaga)}
                </p>
                <p className="text-xs text-purple-100 truncate">
                  ⏳ Pendente: {formatCurrency(safeStats.adelComissaoPendente)}
                </p>
              </div>
            </div>
            <div className="p-2 sm:p-3 bg-purple-400 bg-opacity-30 rounded-lg flex-shrink-0">
              <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2: KPIs de Performance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        {/* Taxa de Conversão */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">📈 Taxa de Conversão</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                {taxaConversao}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Lead → Venda
              </p>
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    taxaConversao >= 20 ? 'bg-green-500' :
                    taxaConversao >= 10 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(taxaConversao, 100)}%` }}
                />
              </div>
            </div>
            <div className={`p-2 sm:p-3 rounded-lg flex-shrink-0 ${
              taxaConversao >= 20 ? 'bg-green-100' :
              taxaConversao >= 10 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <ArrowTrendingUpIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                taxaConversao >= 20 ? 'text-green-600' :
                taxaConversao >= 10 ? 'text-yellow-600' : 'text-red-600'
              }`} />
            </div>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">🎯 Ticket Médio</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 truncate">
                {formatCurrency(ticketMedio)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Por venda fechada
              </p>
              <div className="mt-3 flex items-center gap-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  ticketMedio >= 50000 ? 'bg-green-100 text-green-700' :
                  ticketMedio >= 30000 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {ticketMedio >= 50000 ? '🔥 Excelente' :
                   ticketMedio >= 30000 ? '👍 Bom' : '📊 Em análise'}
                </span>
              </div>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg flex-shrink-0">
              <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Vendas do Mês */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">📅 Vendas do Mês</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
                {qtdVendasMes}
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                {formatCurrency(faturamentoMes)}
              </p>
              <div className="mt-3 flex items-center gap-1">
                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-600">
                  {hoje.toLocaleDateString('pt-BR', { month: 'long' })}
                </span>
              </div>
            </div>
            <div className="p-2 sm:p-3 bg-indigo-100 rounded-lg flex-shrink-0">
              <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Meta Mensal */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-orange-100">🎯 Meta Mensal</p>
              <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">
                {progressoMeta.toFixed(0)}%
              </p>
              <p className="text-xs text-orange-100 mt-1 truncate">
                {formatCurrency(faturamentoMes)} / {formatCurrency(metaMensal)}
              </p>
              <div className="mt-3 h-2 bg-orange-400 bg-opacity-30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${progressoMeta}%` }}
                />
              </div>
            </div>
            <div className="p-2 sm:p-3 bg-orange-400 bg-opacity-30 rounded-lg flex-shrink-0">
              <ArrowTrendingUpIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3: Funil de Leads */}
      <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">📊 Funil de Leads</h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {/* Total Leads */}
          <div className="text-center">
            <div className="w-full bg-indigo-100 rounded-lg p-3 sm:p-4 mb-2">
              <p className="text-xl sm:text-2xl font-bold text-indigo-600">{safeStats.totalLeads}</p>
            </div>
            <p className="text-xs text-gray-600">Total</p>
          </div>

          {/* Novos */}
          <div className="text-center">
            <div className="w-full bg-yellow-100 rounded-lg p-3 sm:p-4 mb-2">
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{leadsNovos}</p>
            </div>
            <p className="text-xs text-gray-600">Novos</p>
          </div>

          {/* Em Contato */}
          <div className="text-center">
            <div className="w-full bg-blue-100 rounded-lg p-3 sm:p-4 mb-2">
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{leadsEmContato}</p>
            </div>
            <p className="text-xs text-gray-600">Em Contato</p>
          </div>

          {/* Convertidos */}
          <div className="text-center">
            <div className="w-full bg-green-100 rounded-lg p-3 sm:p-4 mb-2">
              <p className="text-xl sm:text-2xl font-bold text-green-600">{leadsConvertidos}</p>
            </div>
            <p className="text-xs text-gray-600">Convertidos</p>
          </div>
        </div>

        {/* Barra de Progresso do Funil */}
        <div className="mt-4 flex h-3 rounded-full overflow-hidden">
          <div
            className="bg-yellow-400 transition-all"
            style={{ width: `${safeStats.totalLeads > 0 ? (leadsNovos / safeStats.totalLeads) * 100 : 25}%` }}
          />
          <div
            className="bg-blue-400 transition-all"
            style={{ width: `${safeStats.totalLeads > 0 ? (leadsEmContato / safeStats.totalLeads) * 100 : 25}%` }}
          />
          <div
            className="bg-green-400 transition-all"
            style={{ width: `${safeStats.totalLeads > 0 ? (leadsConvertidos / safeStats.totalLeads) * 100 : 25}%` }}
          />
          <div className="bg-gray-200 flex-1" />
        </div>
      </div>
    </>
  )
}
