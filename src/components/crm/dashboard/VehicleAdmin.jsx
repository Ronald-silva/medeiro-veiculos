import { useState, useEffect } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  TruckIcon,
  PhotoIcon
} from '@heroicons/react/24/outline'
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from '../../../lib/supabase'
import ImageUpload from '../ImageUpload'

const VEHICLE_TYPES = [
  { value: 'car', label: 'Carro' },
  { value: 'suv', label: 'SUV' },
  { value: 'pickup', label: 'Picape' },
  { value: 'motorcycle', label: 'Moto' }
]

const FUEL_TYPES = [
  { value: 'flex', label: 'Flex' },
  { value: 'gasoline', label: 'Gasolina' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Elétrico' }
]

const TRANSMISSION_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'automatic', label: 'Automático' },
  { value: 'cvt', label: 'CVT' }
]

const STATUS_OPTIONS = [
  { value: 'available', label: 'Disponível', color: 'bg-green-100 text-green-800' },
  { value: 'reserved', label: 'Reservado', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'sold', label: 'Vendido', color: 'bg-red-100 text-red-800' }
]

const emptyVehicle = {
  brand: '',
  model: '',
  version: '',
  year: new Date().getFullYear(),
  price: '',
  mileage: '',
  color: '',
  type: 'car',
  fuel: 'flex',
  transmission: 'manual',
  seats: 5,
  description: '',
  features: '',
  images: [],
  status: 'available'
}

export default function VehicleAdmin() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [formData, setFormData] = useState(emptyVehicle)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadVehicles()
  }, [])

  const loadVehicles = async () => {
    setLoading(true)
    try {
      const data = await getVehicles()
      setVehicles(data || [])
    } catch (error) {
      console.error('Erro ao carregar veículos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle)
      setFormData({
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        version: vehicle.version || '',
        year: vehicle.year || new Date().getFullYear(),
        price: vehicle.price || '',
        mileage: vehicle.mileage || '',
        color: vehicle.color || '',
        type: vehicle.type || 'car',
        fuel: vehicle.fuel || 'flex',
        transmission: vehicle.transmission || 'manual',
        seats: vehicle.seats || 5,
        description: vehicle.description || '',
        features: vehicle.features || '',
        images: Array.isArray(vehicle.images) ? vehicle.images : (vehicle.images ? [vehicle.images] : []),
        status: vehicle.status || 'available'
      })
    } else {
      setEditingVehicle(null)
      setFormData(emptyVehicle)
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingVehicle(null)
    setFormData(emptyVehicle)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      const vehicleData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        mileage: parseInt(formData.mileage) || 0,
        year: parseInt(formData.year) || new Date().getFullYear(),
        seats: parseInt(formData.seats) || 5,
        images: Array.isArray(formData.images) ? formData.images : []
      }

      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, vehicleData)
      } else {
        await createVehicle(vehicleData)
      }

      handleCloseModal()
      await loadVehicles()
    } catch (error) {
      console.error('Erro ao salvar veículo:', error)
      alert('Erro ao salvar veículo. Verifique os dados e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (vehicle) => {
    if (window.confirm(`Tem certeza que deseja excluir ${vehicle.brand} ${vehicle.model}?`)) {
      try {
        await deleteVehicle(vehicle.id)
        await loadVehicles()
      } catch (error) {
        console.error('Erro ao excluir veículo:', error)
        alert('Erro ao excluir veículo.')
      }
    }
  }

  const handleStatusChange = async (vehicle, newStatus) => {
    try {
      await updateVehicle(vehicle.id, { status: newStatus })
      await loadVehicles()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
    }
  }

  const filteredVehicles = filter === 'all'
    ? vehicles
    : vehicles.filter(v => v.status === filter)

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(price)
  }

  const formatMileage = (km) => {
    return new Intl.NumberFormat('pt-BR').format(km) + ' km'
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Carregando veículos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-blue-600" />
              Catálogo de Veículos
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {vehicles.filter(v => v.status === 'available').length} disponíveis | {vehicles.filter(v => v.status === 'reserved').length} reservados | {vehicles.filter(v => v.status === 'sold').length} vendidos
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm w-full sm:w-auto justify-center"
          >
            <PlusIcon className="w-5 h-5" />
            Novo Veículo
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({vehicles.length})
          </button>
          {STATUS_OPTIONS.map(status => (
            <button
              key={status.value}
              onClick={() => setFilter(status.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === status.value ? status.color : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status.label} ({vehicles.filter(v => v.status === status.value).length})
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Veículos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <TruckIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Nenhum veículo encontrado</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Adicionar primeiro veículo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Veículo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ano/Km
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preço
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVehicles.map(vehicle => (
                  <tr key={vehicle.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {vehicle.images && vehicle.images.length > 0 ? (
                          <img
                            src={vehicle.images[0]}
                            alt={`${vehicle.brand} ${vehicle.model}`}
                            className="w-16 h-12 object-cover rounded-lg bg-gray-100"
                          />
                        ) : (
                          <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <PhotoIcon className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {vehicle.brand} {vehicle.model}
                          </p>
                          <p className="text-sm text-gray-500">{vehicle.version}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-gray-900">{vehicle.year}</p>
                      <p className="text-xs text-gray-500">{formatMileage(vehicle.mileage)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-green-600">{formatPrice(vehicle.price)}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-600 capitalize">
                        {VEHICLE_TYPES.find(t => t.value === vehicle.type)?.label || vehicle.type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={vehicle.status}
                        onChange={(e) => handleStatusChange(vehicle, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${
                          STATUS_OPTIONS.find(s => s.value === vehicle.status)?.color || 'bg-gray-100'
                        }`}
                      >
                        {STATUS_OPTIONS.map(status => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(vehicle)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Adicionar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Marca e Modelo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marca *
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Toyota"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modelo *
                  </label>
                  <input
                    type="text"
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Hilux SW4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Versão e Ano */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Versão
                  </label>
                  <input
                    type="text"
                    name="version"
                    value={formData.version}
                    onChange={handleChange}
                    placeholder="Ex: SRV 4x4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ano *
                  </label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    required
                    min="1990"
                    max={new Date().getFullYear() + 1}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Preço e KM */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço (R$) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="100"
                    placeholder="Ex: 135000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quilometragem
                  </label>
                  <input
                    type="number"
                    name="mileage"
                    value={formData.mileage}
                    onChange={handleChange}
                    min="0"
                    placeholder="Ex: 85000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Tipo e Cor */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {VEHICLE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor
                  </label>
                  <input
                    type="text"
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    placeholder="Ex: Prata"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Combustível e Câmbio */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Combustível
                  </label>
                  <select
                    name="fuel"
                    value={formData.fuel}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {FUEL_TYPES.map(fuel => (
                      <option key={fuel.value} value={fuel.value}>{fuel.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Câmbio
                  </label>
                  <select
                    name="transmission"
                    value={formData.transmission}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {TRANSMISSION_TYPES.map(trans => (
                      <option key={trans.value} value={trans.value}>{trans.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lugares e Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lugares
                  </label>
                  <input
                    type="number"
                    name="seats"
                    value={formData.seats}
                    onChange={handleChange}
                    min="1"
                    max="15"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Descrição detalhada do veículo..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Características/Opcionais
                </label>
                <textarea
                  name="features"
                  value={formData.features}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Ex: Ar condicionado, Direção hidráulica, Vidros elétricos..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Upload de Imagens */}
              <ImageUpload
                images={formData.images}
                onChange={(newImages) => setFormData(prev => ({ ...prev, images: newImages }))}
                vehicleId={editingVehicle?.id}
                maxImages={5}
              />

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <CheckIcon className="w-4 h-4" />
                  )}
                  {editingVehicle ? 'Salvar Alterações' : 'Cadastrar Veículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
