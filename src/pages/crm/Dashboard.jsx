import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon,
  BanknotesIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline'
import { getSales, getLeads, getDashboardMetrics } from '../../lib/supabase'
import SalesModal from '../../components/crm/SalesModal'
import LeadsTable from '../../components/crm/LeadsTable'

export default function CRMDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sales, setSales] = useState([])
  const [leads, setLeads] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard, sales, leads

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [salesData, leadsData, metricsData] = await Promise.all([
        getSales(),
        getLeads(),
        getDashboardMetrics().catch(() => null) // Pode não ter a view ainda
      ])

      setSales(salesData || [])
      setLeads(leadsData || [])
      setMetrics(metricsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cálculos financeiros locais (caso a view não esteja disponível)
  const calculateMetrics = () => {
    const totalVendido = sales.reduce((sum, sale) => sum + Number(sale.sale_price || 0), 0)
    const totalComissao = sales.reduce((sum, sale) => sum + Number(sale.commission_value || 0), 0)

    // Medeiros (dono) fica com o valor da venda menos a comissão
    const medeirosRecebe = totalVendido - totalComissao

    // Comissões de Ronald e Adel
    const ronaldComissaoTotal = sales.reduce((sum, sale) => sum + Number(sale.ronald_commission_value || 0), 0)
    const adelComissaoTotal = sales.reduce((sum, sale) => sum + Number(sale.adel_commission_value || 0), 0)

    // Comissões pagas/pendentes Ronald
    const ronaldComissaoPaga = sales
      .filter(s => s.ronald_paid)
      .reduce((sum, sale) => sum + Number(sale.ronald_commission_value || 0), 0)
    const ronaldComissaoPendente = ronaldComissaoTotal - ronaldComissaoPaga

    // Comissões pagas/pendentes Adel
    const adelComissaoPaga = sales
      .filter(s => s.adel_paid)
      .reduce((sum, sale) => sum + Number(sale.adel_commission_value || 0), 0)
    const adelComissaoPendente = adelComissaoTotal - adelComissaoPaga

    return {
      totalVendas: sales.length,
      totalVendido,
      totalComissao,
      medeirosRecebe,
      ronaldComissaoTotal,
      ronaldComissaoPaga,
      ronaldComissaoPendente,
      adelComissaoTotal,
      adelComissaoPaga,
      adelComissaoPendente,
      totalLeads: leads.length,
      leadsNovos: leads.filter(l => l.status === 'novo').length
    }
  }

  const stats = metrics || calculateMetrics()

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Medeiros Veículos - CRM
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Bem-vindo, {user?.username || 'Admin'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/crm/relatorio')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                <DocumentChartBarIcon className="w-5 h-5" />
                Relatório para o Dono
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'sales'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Vendas ({sales.length})
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'leads'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Leads ({leads.length})
            </button>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Carregando dados...</p>
          </div>
        ) : (
          <>
            {/* DASHBOARD TAB */}
            {activeTab === 'dashboard' && (
              <>
                {/* Cards de Métricas Financeiras */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Medeiros (Dono) Recebe */}
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="w-full">
                        <p className="text-sm font-medium text-blue-100">🏪 Medeiros Recebe</p>
                        <p className="text-3xl font-bold mt-2">
                          {formatCurrency(stats.medeirosRecebe || stats.medeiros_recebe)}
                        </p>
                        <p className="text-xs text-blue-100 mt-1">
                          Dono da loja (líquido)
                        </p>
                        <div className="mt-3 pt-3 border-t border-blue-400">
                          <p className="text-xs text-blue-100">
                            De R$ {formatCurrency(stats.totalVendido || stats.receita_total)} vendidos
                          </p>
                        </div>
                      </div>
                      <div className="p-3 bg-blue-400 bg-opacity-30 rounded-lg">
                        <BanknotesIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Comissão Total (Ronald + Adel) */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">💰 Comissão Total</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">
                          {formatCurrency(stats.totalComissao || stats.comissao_total)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Ronald + Adel ({stats.totalVendas || stats.total_vendas || 0} vendas)
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <CurrencyDollarIcon className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                  </div>

                  {/* Ronald Recebe (SUA PARTE) */}
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="w-full">
                        <p className="text-sm font-medium text-green-100">💵 Ronald Recebe</p>
                        <p className="text-3xl font-bold mt-2">
                          {formatCurrency(stats.ronaldComissaoTotal || stats.ronald_comissao_total)}
                        </p>
                        <p className="text-xs text-green-100 mt-1">
                          Sua parte da comissão
                        </p>
                        <div className="mt-3 pt-3 border-t border-green-400 space-y-1">
                          <p className="text-xs text-green-100">
                            ✓ Pago: {formatCurrency(stats.ronaldComissaoPaga || stats.ronald_comissao_paga)}
                          </p>
                          <p className="text-xs text-green-100">
                            ⏳ Pendente: {formatCurrency(stats.ronaldComissaoPendente || stats.ronald_comissao_pendente)}
                          </p>
                        </div>
                      </div>
                      <div className="p-3 bg-green-400 bg-opacity-30 rounded-lg">
                        <ChartBarIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Adel Recebe (PARTE DELE) */}
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="w-full">
                        <p className="text-sm font-medium text-purple-100">🤝 Adel Recebe</p>
                        <p className="text-3xl font-bold mt-2">
                          {formatCurrency(stats.adelComissaoTotal || stats.adel_comissao_total)}
                        </p>
                        <p className="text-xs text-purple-100 mt-1">
                          Parte do Adel da comissão
                        </p>
                        <div className="mt-3 pt-3 border-t border-purple-400 space-y-1">
                          <p className="text-xs text-purple-100">
                            ✓ Pago: {formatCurrency(stats.adelComissaoPaga || stats.adel_comissao_paga)}
                          </p>
                          <p className="text-xs text-purple-100">
                            ⏳ Pendente: {formatCurrency(stats.adelComissaoPendente || stats.adel_comissao_pendente)}
                          </p>
                        </div>
                      </div>
                      <div className="p-3 bg-purple-400 bg-opacity-30 rounded-lg">
                        <UserGroupIcon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total de Leads - Card separado abaixo */}
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-100">📊 Total de Leads Capturados</p>
                      <p className="text-3xl font-bold mt-2">
                        {stats.totalLeads || stats.total_leads || 0}
                      </p>
                      <p className="text-sm text-indigo-100 mt-1">
                        🔥 {stats.leadsNovos || stats.leads_novos || 0} novos aguardando contato
                      </p>
                    </div>
                    <div className="p-4 bg-indigo-400 bg-opacity-30 rounded-lg">
                      <UserGroupIcon className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>

                {/* Ação Rápida */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Registrar Nova Venda</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Adicione uma venda e o sistema calculará automaticamente a comissão
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSalesModal(true)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      <PlusIcon className="w-5 h-5" />
                      Nova Venda
                    </button>
                  </div>
                </div>

                {/* Últimas Vendas */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Últimas Vendas</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veículo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Venda</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comissão (3%)</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Você Recebe</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sales.slice(0, 10).map((sale) => {
                          const valorDono = Number(sale.sale_price) - Number(sale.commission_value)
                          return (
                            <tr key={sale.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-900">
                                {sale.vehicle_name}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {sale.lead?.nome || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900">
                                {formatCurrency(sale.sale_price)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600">
                                {formatCurrency(sale.commission_value)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-blue-600">
                                {formatCurrency(valorDono)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {sale.commission_paid ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    Pago
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    Pendente
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                    {sales.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        Nenhuma venda registrada ainda
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* SALES TAB */}
            {activeTab === 'sales' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Todas as Vendas</h2>
                  <button
                    onClick={() => setShowSalesModal(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Nova Venda
                  </button>
                </div>
                {/* Mesma tabela do dashboard, mas completa */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veículo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor Venda</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Comissão</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Você Recebe</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {sales.map((sale) => {
                        const valorDono = Number(sale.sale_price) - Number(sale.commission_value)
                        return (
                          <tr key={sale.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{sale.vehicle_name}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{sale.lead?.nome || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right text-gray-900">
                              {formatCurrency(sale.sale_price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600">
                              {formatCurrency(sale.commission_value)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-blue-600">
                              {formatCurrency(valorDono)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {sale.commission_paid ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Pago
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  Pendente
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {sales.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      Nenhuma venda registrada
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LEADS TAB */}
            {activeTab === 'leads' && (
              <LeadsTable leads={leads} onUpdate={loadData} />
            )}
          </>
        )}
      </main>

      {/* Modal de Nova Venda */}
      {showSalesModal && (
        <SalesModal
          leads={leads}
          onClose={() => setShowSalesModal(false)}
          onSuccess={() => {
            setShowSalesModal(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}
