import { useState } from 'react'
import { formatCurrency } from '../../../utils/calculations'
import { markRonaldAsPaid, markAdelAsPaid } from '../../../lib/supabase'

export default function SalesTable({ sales, showAll = false, onUpdate }) {
  const [paying, setPaying] = useState({})
  const displaySales = showAll ? sales : sales.slice(0, 10)

  const handleMarkPaid = async (saleId, type, fn) => {
    const key = `${saleId}-${type}`
    if (paying[key]) return
    setPaying(p => ({ ...p, [key]: true }))
    try {
      await fn(saleId)
      onUpdate?.()
    } catch (err) {
      alert('Erro ao marcar pagamento: ' + (err.message || 'Tente novamente'))
    } finally {
      setPaying(p => { const n = { ...p }; delete n[key]; return n })
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          {showAll ? 'Todas as Vendas' : 'Últimas Vendas'}
        </h2>
      </div>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Data</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Veículo</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Cliente</th>
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Valor Venda</th>
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-green-600 uppercase whitespace-nowrap">Ronald</th>
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-purple-600 uppercase whitespace-nowrap">Adel</th>
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Medeiros Recebe</th>
              <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displaySales.map((sale) => {
              const ronaldComissao = Number(sale.ronald_commission_value || 0)
              const adelComissao = Number(sale.adel_commission_value || 0)
              const valorDono = Number(sale.sale_price) - ronaldComissao - adelComissao
              return (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                    {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                    {sale.vehicle_name}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                    {sale.lead?.name || 'N/A'}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-right text-gray-900">
                    {formatCurrency(sale.sale_price)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-right text-green-600">
                    {formatCurrency(ronaldComissao)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-right text-purple-600">
                    {formatCurrency(adelComissao)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-right text-blue-600">
                    {formatCurrency(valorDono)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                    <div className="flex flex-col gap-1 items-center">
                      <button
                        onClick={() => handleMarkPaid(sale.id, 'ronald', markRonaldAsPaid)}
                        disabled={sale.ronald_paid || paying[`${sale.id}-ronald`]}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sale.ronald_paid
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : paying[`${sale.id}-ronald`]
                            ? 'bg-gray-100 text-gray-500 cursor-wait'
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer'
                        }`}
                      >
                        Ronald {sale.ronald_paid ? '✓' : paying[`${sale.id}-ronald`] ? '...' : 'Pendente'}
                      </button>
                      <button
                        onClick={() => handleMarkPaid(sale.id, 'adel', markAdelAsPaid)}
                        disabled={sale.adel_paid || paying[`${sale.id}-adel`]}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sale.adel_paid
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : paying[`${sale.id}-adel`]
                            ? 'bg-gray-100 text-gray-500 cursor-wait'
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200 cursor-pointer'
                        }`}
                      >
                        Adel {sale.adel_paid ? '✓' : paying[`${sale.id}-adel`] ? '...' : 'Pendente'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {sales.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhuma venda registrada ainda
        </div>
      )}
    </div>
  )
}
