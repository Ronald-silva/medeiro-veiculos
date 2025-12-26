import {
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '../../../utils/calculations'

export default function MetricsCards({ stats }) {
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
                {formatCurrency(stats.medeirosRecebe || stats.medeiros_recebe)}
              </p>
              <p className="text-xs text-blue-100 mt-1">
                Dono da loja (líquido)
              </p>
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-blue-400">
                <p className="text-xs text-blue-100 truncate">
                  De {formatCurrency(stats.totalVendido || stats.receita_total)} vendidos
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
                {formatCurrency(stats.totalComissao || stats.comissao_total)}
              </p>
              <p className="text-xs text-gray-500 mt-1 truncate">
                Ronald + Adel ({stats.totalVendas || stats.total_vendas || 0} vendas)
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
                {formatCurrency(stats.ronaldComissaoTotal || stats.ronald_comissao_total)}
              </p>
              <p className="text-xs text-green-100 mt-1">
                Sua parte da comissão
              </p>
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-green-400 space-y-1">
                <p className="text-xs text-green-100 truncate">
                  ✓ Pago: {formatCurrency(stats.ronaldComissaoPaga || stats.ronald_comissao_paga)}
                </p>
                <p className="text-xs text-green-100 truncate">
                  ⏳ Pendente: {formatCurrency(stats.ronaldComissaoPendente || stats.ronald_comissao_pendente)}
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
                {formatCurrency(stats.adelComissaoTotal || stats.adel_comissao_total)}
              </p>
              <p className="text-xs text-purple-100 mt-1">
                Parte do Adel da comissão
              </p>
              <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-purple-400 space-y-1">
                <p className="text-xs text-purple-100 truncate">
                  ✓ Pago: {formatCurrency(stats.adelComissaoPaga || stats.adel_comissao_paga)}
                </p>
                <p className="text-xs text-purple-100 truncate">
                  ⏳ Pendente: {formatCurrency(stats.adelComissaoPendente || stats.adel_comissao_pendente)}
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
              {stats.totalLeads || stats.total_leads || 0}
            </p>
            <p className="text-xs sm:text-sm text-indigo-100 mt-1">
              🔥 {stats.leadsNovos || stats.leads_novos || 0} novos aguardando contato
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
