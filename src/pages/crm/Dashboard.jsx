import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  ArrowRightOnRectangleIcon,
  PlusIcon,
  DocumentChartBarIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'
import { getSales, getLeads, getDashboardMetrics, getAppointments, updateAppointmentStatus, deleteAppointment } from '../../lib/supabase'
import SalesModal from '../../components/crm/SalesModal'
import LeadsTable from '../../components/crm/LeadsTable'
import MetricsCards from '../../components/crm/dashboard/MetricsCards'
import SalesTable from '../../components/crm/dashboard/SalesTable'
import AppointmentsTable from '../../components/crm/dashboard/AppointmentsTable'
import ConversationsPanel from '../../components/crm/dashboard/ConversationsPanel'
export default function CRMDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sales, setSales] = useState([])
  const [leads, setLeads] = useState([])
  const [appointments, setAppointments] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard, sales, leads, appointments
  useEffect(() => {
    loadData()
  }, [])
  const loadData = async () => {
    setLoading(true)
    try {
      const [salesData, leadsData, appointmentsData, metricsData] = await Promise.all([
        getSales(),
        getLeads(),
        getAppointments(),
        getDashboardMetrics().catch(() => null) // Pode não ter a view ainda
      ])
      setSales(salesData || [])
      setLeads(leadsData || [])
      setAppointments(appointmentsData || [])
      setMetrics(metricsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }
  const handleUpdateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus)
      await loadData()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status do agendamento. Tente novamente.')
    }
  }

  const handleDeleteAppointment = async (appointmentId, customerName) => {
    if (window.confirm(`Tem certeza que deseja deletar o agendamento de ${customerName}?`)) {
      try {
        await deleteAppointment(appointmentId)
        await loadData()
      } catch (error) {
        console.error('Erro ao deletar agendamento:', error)
        alert('Erro ao deletar agendamento. Tente novamente.')
      }
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
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Medeiros Veículos - CRM
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Bem-vindo, {user?.username || 'Admin'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('/crm/relatorio')}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors text-sm flex-1 sm:flex-initial"
              >
                <DocumentChartBarIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Relatório para o Dono</span>
                <span className="sm:hidden">Relatório</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>
      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] sm:top-[89px] z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-4 sm:gap-8 overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'sales'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Vendas ({sales.length})
            </button>
            <button
              onClick={() => setActiveTab('leads')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'leads'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Leads ({leads.length})
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'appointments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Agendamentos ({appointments.length})
            </button>
            <button
              onClick={() => setActiveTab('conversations')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                activeTab === 'conversations'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                Conversas
              </span>
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
                <MetricsCards stats={stats} sales={sales} leads={leads} />
                {/* Ação Rápida */}
                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 mb-6 sm:mb-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Registrar Nova Venda</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Adicione uma venda e o sistema calculará automaticamente a comissão
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSalesModal(true)}
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm w-full sm:w-auto"
                    >
                      <PlusIcon className="w-5 h-5" />
                      Nova Venda
                    </button>
                  </div>
                </div>
                {/* Últimas Vendas */}
                <SalesTable sales={sales} showAll={false} />
              </>
            )}
            {/* SALES TAB */}
            {activeTab === 'sales' && (
              <>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 flex justify-end">
                  <button
                    onClick={() => setShowSalesModal(true)}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm w-full sm:w-auto"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Nova Venda
                  </button>
                </div>
                <SalesTable sales={sales} showAll={true} />
              </>
            )}
            {/* LEADS TAB */}
            {activeTab === 'leads' && (
              <LeadsTable leads={leads} onUpdate={loadData} />
            )}
            {/* APPOINTMENTS TAB */}
            {activeTab === 'appointments' && (
              <div className="space-y-6">
                {/* Agendamentos de Hoje - Card Destacado */}
                {appointments.filter(a => {
                  const today = new Date().toISOString().split('T')[0]
                  return a.scheduled_date === today && a.status === 'confirmado'
                }).length > 0 && (
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
                    <div className="flex items-center gap-3 mb-4">
                      <CalendarDaysIcon className="w-6 h-6" />
                      <h2 className="text-xl font-bold">Agendamentos de Hoje</h2>
                    </div>
                    <div className="grid gap-3">
                      {appointments
                        .filter(a => {
                          const today = new Date().toISOString().split('T')[0]
                          return a.scheduled_date === today && a.status === 'confirmado'
                        })
                        .map(appointment => (
                          <div key={appointment.id} className="bg-white bg-opacity-20 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold text-lg">
                                  {appointment.lead?.name || appointment.customer_name || 'Cliente'}
                                </p>
                                <p className="text-sm text-blue-100">
                                  📞 {appointment.lead?.whatsapp || appointment.phone}
                                </p>
                                <p className="text-sm text-blue-100 mt-1">
                                  🚗 {appointment.vehicle_interest || 'Interesse geral'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold">{appointment.scheduled_time}</p>
                                <p className="text-xs text-blue-100 mt-1">
                                  {appointment.visit_type === 'test_drive' ? '🏁 Test Drive' :
                                   appointment.visit_type === 'negotiation' ? '💰 Negociação' : '👋 Visita'}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                {/* Tabela de Todos os Agendamentos */}
                <AppointmentsTable
                  appointments={appointments}
                  onUpdateStatus={handleUpdateAppointmentStatus}
                  onDelete={handleDeleteAppointment}
                />
              </div>
            )}

            {/* CONVERSATIONS TAB */}
            {activeTab === 'conversations' && (
              <ConversationsPanel />
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
