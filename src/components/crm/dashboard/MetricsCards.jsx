import {
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '../../../utils/calculations'

export default function MetricsCards({ stats = {} }) {
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
    totalLeads: stats.totalLeads ?? stats.total_leads ?? 0,
    leadsNovos: stats.leadsNovos ?? stats.leads_novos ?? 0,
  }

  return (
    <>
      {/* Cards de Métricas Financeiras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
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

      {/* Total de Leads - Card separado abaixo */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-4 sm:p-6 text-white mb-6 sm:mb-8">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-indigo-100">📊 Total de Leads Capturados</p>
            <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2">
              {safeStats.totalLeads}
            </p>
            <p className="text-xs sm:text-sm text-indigo-100 mt-1">
              🔥 {safeStats.leadsNovos} novos aguardando contato
            </p>
          </div>
          <div className="p-3 sm:p-4 bg-indigo-400 bg-opacity-30 rounded-lg flex-shrink-0">
            <UserGroupIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
        </div>
      </div>
    </>
  )
}
