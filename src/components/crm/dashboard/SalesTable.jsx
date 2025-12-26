import { formatCurrency } from '../../../utils/calculations'

export default function SalesTable({ sales, showAll = false }) {
  const displaySales = showAll ? sales : sales.slice(0, 10)

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
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Comissão</th>
              <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Medeiros Recebe</th>
              <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displaySales.map((sale) => {
              const valorDono = Number(sale.sale_price) - Number(sale.commission_value)
              return (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                    {new Date(sale.sale_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                    {sale.vehicle_name}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                    {sale.lead?.nome || 'N/A'}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-right text-gray-900">
                    {formatCurrency(sale.sale_price)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-right text-purple-600">
                    {formatCurrency(sale.commission_value)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold text-right text-blue-600">
                    {formatCurrency(valorDono)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
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
      </div>
      {sales.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhuma venda registrada ainda
        </div>
      )}
    </div>
  )
}
