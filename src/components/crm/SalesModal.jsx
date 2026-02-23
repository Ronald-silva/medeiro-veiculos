import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { createSale } from '../../lib/supabase'
import { formatCurrency } from '../../utils/calculations'

// COMISSÕES FIXAS POR VENDA
const RONALD_COMMISSION = 300.00   // Ronald (você)
const ADEL_COMMISSION   = 500.00   // Adel (vendedor)
const TOTAL_COMMISSION  = RONALD_COMMISSION + ADEL_COMMISSION  // R$ 800

// Veículos populares pré-configurados
const POPULAR_VEHICLES = [
  { name: 'Toyota Corolla 2023', avgPrice: 135000 },
  { name: 'Honda Civic 2023', avgPrice: 145000 },
  { name: 'Honda HR-V 2022', avgPrice: 140000 },
  { name: 'Toyota Hilux 2023', avgPrice: 280000 },
  { name: 'Jeep Compass 2022', avgPrice: 170000 },
  { name: 'Chevrolet Onix 2023', avgPrice: 75000 },
  { name: 'Volkswagen T-Cross 2023', avgPrice: 125000 },
  { name: 'Hyundai Creta 2023', avgPrice: 130000 },
  { name: 'Fiat Toro 2023', avgPrice: 145000 },
  { name: 'Volkswagen Polo 2023', avgPrice: 85000 }
]

export default function SalesModal({ leads = [], onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    lead_id: '',
    vehicle_name: '',
    sale_price: '',
    payment_method: 'à vista',
    down_payment: '',
    installments: '',
    seller_name: 'Adel',
    sale_date: new Date().toISOString().split('T')[0]
  })

  const [showVehicleSuggestions, setShowVehicleSuggestions] = useState(false)
  const [filteredVehicles, setFilteredVehicles] = useState(POPULAR_VEHICLES)

  const [valorMedeiros, setValorMedeiros] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Medeiros recebe = valor da venda - comissão Ronald - comissão Adel
  useEffect(() => {
    const price = Number(formData.sale_price) || 0
    setValorMedeiros(price - TOTAL_COMMISSION)
  }, [formData.sale_price])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validações
      if (!formData.vehicle_name || !formData.sale_price) {
        throw new Error('Preencha os campos obrigatórios')
      }

      const saleData = {
        ...formData,
        lead_id: formData.lead_id ? Number(formData.lead_id) : null,
        sale_price: Number(formData.sale_price),
        down_payment: formData.down_payment ? Number(formData.down_payment) : null,
        installments: formData.installments ? Number(formData.installments) : null,
        commission_value: TOTAL_COMMISSION,
        ronald_commission_value: RONALD_COMMISSION,
        adel_commission_value: ADEL_COMMISSION,
        commission_paid: false,
        ronald_paid: false,
        adel_paid: false
      }

      await createSale(saleData)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Erro ao registrar venda')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Registrar Nova Venda</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase">Informações da Venda</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Veículo Vendido *
                </label>
                <input
                  type="text"
                  required
                  value={formData.vehicle_name}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData({ ...formData, vehicle_name: value })

                    // Filtra sugestões
                    if (value.length > 0) {
                      const filtered = POPULAR_VEHICLES.filter(v =>
                        v.name.toLowerCase().includes(value.toLowerCase())
                      )
                      setFilteredVehicles(filtered)
                      setShowVehicleSuggestions(true)
                    } else {
                      setFilteredVehicles(POPULAR_VEHICLES)
                      setShowVehicleSuggestions(false)
                    }
                  }}
                  onFocus={() => setShowVehicleSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowVehicleSuggestions(false), 200)}
                  placeholder="Digite ou selecione um veículo..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoComplete="off"
                />

                {/* Sugestões de veículos */}
                {showVehicleSuggestions && filteredVehicles.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredVehicles.map((vehicle, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            vehicle_name: vehicle.name,
                            sale_price: vehicle.avgPrice.toString()
                          })
                          setShowVehicleSuggestions(false)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">{vehicle.name}</span>
                          <span className="text-sm text-gray-500">
                            ≈ R$ {vehicle.avgPrice.toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  💡 Digite para buscar ou selecione da lista
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data da Venda *
                </label>
                <input
                  type="date"
                  required
                  value={formData.sale_date}
                  onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendedor
                </label>
                <input
                  type="text"
                  value={formData.seller_name}
                  onChange={(e) => setFormData({ ...formData, seller_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente (Lead)
                </label>
                <select
                  value={formData.lead_id}
                  onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione (opcional)</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} - {lead.whatsapp}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Valores */}
          <div className="space-y-4 bg-blue-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase">Valores</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor da Venda (R$) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                  placeholder="50000.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="col-span-2">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-semibold text-green-900">💰 Comissões Fixas por Venda</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">Ronald (você):</span>
                    <span className="font-bold text-green-600">R$ 300,00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-purple-700">Adel (vendedor):</span>
                    <span className="font-bold text-purple-600">R$ 500,00</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-green-200 pt-2">
                    <span className="text-gray-700 font-semibold">Total saindo:</span>
                    <span className="font-bold text-gray-800">R$ 800,00</span>
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forma de Pagamento
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="à vista">À Vista</option>
                  <option value="financiamento">Financiamento</option>
                  <option value="consórcio">Consórcio</option>
                  <option value="outros">Outros</option>
                </select>
              </div>

              {formData.payment_method === 'financiamento' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entrada (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.down_payment}
                      onChange={(e) => setFormData({ ...formData, down_payment: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Parcelas
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.installments}
                      onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Resumo Financeiro */}
            <div className="mt-4 pt-4 border-t border-blue-200 space-y-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">📊 Resumo Financeiro</h4>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Valor da Venda:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(formData.sale_price)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-green-700">Comissão Ronald (você):</span>
                <span className="font-semibold text-green-600">- {formatCurrency(RONALD_COMMISSION)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-purple-700">Comissão Adel:</span>
                <span className="font-semibold text-purple-600">- {formatCurrency(ADEL_COMMISSION)}</span>
              </div>

              <div className="flex justify-between text-lg pt-2 border-t border-blue-300">
                <span className="font-bold text-gray-900">🏪 Medeiros Recebe:</span>
                <span className="font-bold text-blue-600">{formatCurrency(valorMedeiros)}</span>
              </div>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registrando...' : 'Registrar Venda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
