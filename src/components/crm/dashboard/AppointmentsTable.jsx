import { CalendarDaysIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function AppointmentsTable({ appointments, onUpdateStatus, onDelete }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Todos os Agendamentos</h2>
      </div>
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Data</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Horário</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Cliente</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Telefone</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Veículo</th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Tipo</th>
              <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
              <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {appointments.map((appointment) => (
              <tr key={appointment.id} className="hover:bg-gray-50">
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                  {new Date(appointment.scheduled_date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                  {appointment.scheduled_time}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                  {appointment.lead?.name || appointment.customer_name || 'N/A'}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                  {appointment.lead?.whatsapp || appointment.customer_phone || '-'}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                  {appointment.vehicle_interest || '-'}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-600">
                  {appointment.visit_type === 'test_drive' ? '🏁 Test Drive' :
                   appointment.visit_type === 'negotiation' ? '💰 Negociação' : '👋 Visita'}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                  {appointment.status === 'confirmado' && (
                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Confirmado
                    </span>
                  )}
                  {appointment.status === 'compareceu' && (
                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Compareceu
                    </span>
                  )}
                  {appointment.status === 'faltou' && (
                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Faltou
                    </span>
                  )}
                  {appointment.status === 'remarcado' && (
                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Remarcado
                    </span>
                  )}
                  {appointment.status === 'cancelado' && (
                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Cancelado
                    </span>
                  )}
                  {appointment.status === 'pendente' && (
                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Pendente
                    </span>
                  )}
                </td>
                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                  <div className="flex items-center gap-2 justify-center">
                    <select
                      value={appointment.status}
                      onChange={(e) => onUpdateStatus(appointment.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pendente">Pendente</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="compareceu">Compareceu</option>
                      <option value="faltou">Faltou</option>
                      <option value="remarcado">Remarcado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                    <button
                      onClick={() => onDelete(
                        appointment.id,
                        appointment.lead?.name || appointment.customer_name || 'este agendamento'
                      )}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Deletar agendamento"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {appointments.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p>Nenhum agendamento registrado ainda</p>
          <p className="text-sm text-gray-400 mt-1">
            Os agendamentos feitos pelo chat aparecerão aqui
          </p>
        </div>
      )}
    </div>
  )
}
