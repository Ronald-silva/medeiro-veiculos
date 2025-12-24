import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import {
  carsInventory,
  carFilters,
  formatPrice,
  filterCars
} from '../data/carsInventory'

export default function CatalogPage() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({
    category: 'all',
    priceRange: 'all',
    year: 'all',
    fuel: 'all',
    search: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCar, setSelectedCar] = useState(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const filteredCars = filterCars(carsInventory, filters)

  const handleFilterChange = (filterName, value) => {
    setFilters({ ...filters, [filterName]: value })
  }

  const openCarModal = (car) => {
    setSelectedCar(car)
    setCurrentImageIndex(0)
  }

  const closeCarModal = () => {
    setSelectedCar(null)
    setCurrentImageIndex(0)
  }

  const nextImage = () => {
    if (selectedCar) {
      setCurrentImageIndex((prev) =>
        prev === selectedCar.images.length - 1 ? 0 : prev + 1
      )
    }
  }

  const prevImage = () => {
    if (selectedCar) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? selectedCar.images.length - 1 : prev - 1
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nossos Veículos</h1>
              <p className="text-sm text-gray-600 mt-1">
                {filteredCars.length} {filteredCars.length === 1 ? 'veículo disponível' : 'veículos disponíveis'}
              </p>
            </div>

            <button
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Voltar ao início
            </button>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 sticky top-[73px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por marca, modelo..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Toggle Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <FunnelIcon className="w-5 h-5" />
              Filtros
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {carFilters.categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preço
                </label>
                <select
                  value={filters.priceRange}
                  onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {carFilters.priceRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ano
                </label>
                <select
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {carFilters.years.map((year) => (
                    <option key={year.value} value={year.value}>
                      {year.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fuel Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Combustível
                </label>
                <select
                  value={filters.fuel}
                  onChange={(e) => handleFilterChange('fuel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {carFilters.fuels.map((fuel) => (
                    <option key={fuel.value} value={fuel.value}>
                      {fuel.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cars Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredCars.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              Nenhum veículo encontrado com os filtros selecionados.
            </p>
            <button
              onClick={() => setFilters({ category: 'all', priceRange: 'all', year: 'all', fuel: 'all', search: '' })}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCars.map((car) => (
              <div
                key={car.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
                onClick={() => openCarModal(car)}
              >
                {/* Car Image */}
                <div className="relative h-48 bg-gray-200 overflow-hidden">
                  <img
                    src={car.images[0]}
                    alt={car.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  {car.featured && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      DESTAQUE
                    </div>
                  )}
                  {car.status === 'sold' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">VENDIDO</span>
                    </div>
                  )}
                </div>

                {/* Car Info */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900">{car.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{car.version}</p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {car.year}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {car.mileage}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {car.fuel}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatPrice(car.price)}
                      </p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                      Ver detalhes →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Car Detail Modal */}
      {selectedCar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={closeCarModal}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedCar.name}</h2>
                <p className="text-sm text-gray-600">{selectedCar.version}</p>
              </div>
              <button
                onClick={closeCarModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Image Gallery */}
            <div className="relative h-96 bg-gray-900">
              <img
                src={selectedCar.images[currentImageIndex]}
                alt={`${selectedCar.name} - ${currentImageIndex + 1}`}
                className="w-full h-full object-contain"
              />

              {/* Navigation Arrows */}
              {selectedCar.images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 p-2 rounded-full transition-all"
                  >
                    <ChevronLeftIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-800 p-2 rounded-full transition-all"
                  >
                    <ChevronRightIcon className="w-6 h-6" />
                  </button>

                  {/* Image Counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {selectedCar.images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {selectedCar.images.length > 1 && (
              <div className="px-6 py-4 border-b border-gray-200 overflow-x-auto">
                <div className="flex gap-2">
                  {selectedCar.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        currentImageIndex === index
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Car Details */}
            <div className="p-6 space-y-6">
              {/* Price */}
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Preço</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {formatPrice(selectedCar.price)}
                </p>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Ano</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedCar.year}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Km</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedCar.mileage}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Cor</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedCar.color}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Câmbio</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedCar.transmission}</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Descrição</h3>
                <p className="text-gray-700 leading-relaxed">{selectedCar.description}</p>
              </div>

              {/* Features */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Características</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedCar.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Button */}
              <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-200">
                <a
                  href={`https://wa.me/5585988852900?text=Olá! Tenho interesse no ${selectedCar.name} ${selectedCar.year}. Poderia me passar mais informações?`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-green-600 hover:bg-green-700 text-white text-center px-6 py-4 rounded-lg font-bold text-lg transition-colors"
                >
                  💬 Falar com Vendedor no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
