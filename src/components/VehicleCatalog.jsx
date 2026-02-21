import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFeaturedVehicles, formatPrice as formatPriceUtil } from '../hooks/useVehicles';
import Badge from './ui/Badge';
import ConsultoraAvatar from './ConsultoraAvatar';
import ProtectedImage from './ProtectedImage';

export default function VehicleCatalog({ onVehicleInterest }) {
  const { vehicles: allVehicles, loading } = useFeaturedVehicles(); // Busca do Supabase
  // Ordena: destaques primeiro, depois os demais
  const vehicles = [...allVehicles].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  const [selectedType, setSelectedType] = useState('Todos');
  const [selectedBrand, setSelectedBrand] = useState('Todas');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 300000 });

  // Labels legíveis para cada categoria
  const categoryLabels = {
    'hatch': 'Hatch',
    'sedan': 'Sedan',
    'suv': 'SUV',
    'pickup': 'Picape',
    'motorcycle': 'Moto',
  }

  // Get unique types and brands for filters (filter out undefined/null to avoid duplicate keys)
  const types = ['Todos', ...new Set(vehicles.map(v => v.category).filter(Boolean))];
  const brands = ['Todas', ...new Set(vehicles.map(v => v.brand).filter(Boolean))];

  // Filter vehicles
  const filteredVehicles = vehicles.filter(vehicle => {
    const typeMatch = selectedType === 'Todos' || vehicle.category === selectedType;
    const brandMatch = selectedBrand === 'Todas' || vehicle.brand === selectedBrand;
    const priceMatch = vehicle.price >= priceRange.min && vehicle.price <= priceRange.max;
    return typeMatch && brandMatch && priceMatch;
  });

  const formatPrice = formatPriceUtil;

  if (loading) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="container text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Carregando veículos...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="section-title">Nosso Catálogo</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {filteredVehicles.length} veículo{filteredVehicles.length !== 1 ? 's' : ''} disponível{filteredVehicles.length !== 1 ? 'eis' : ''} • Todos com garantia de 3 meses
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Veículo
                </label>
                <div className="flex flex-wrap gap-2">
                  {types.map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedType === type
                          ? 'bg-primary text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type === 'Todos' ? 'Todos' : (categoryLabels[type] || type)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Filter */}
              <div>
                <label htmlFor="brand-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Marca
                </label>
                <select
                  id="brand-filter"
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {brands.map(brand => (
                    <option key={brand} value={brand}>{brand}</option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label htmlFor="price-range" className="block text-sm font-medium text-gray-700 mb-2">
                  Faixa de Preço (até {formatPrice(priceRange.max)})
                </label>
                <input
                  id="price-range"
                  type="range"
                  min="0"
                  max="200000"
                  step="5000"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange({ ...priceRange, max: Number(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  aria-valuemin={0}
                  aria-valuemax={200000}
                  aria-valuenow={priceRange.max}
                />
              </div>
            </div>

            {/* Active Filters Summary */}
            {(selectedType !== 'Todos' || selectedBrand !== 'Todas' || priceRange.max < 200000) && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-gray-600">Filtros ativos:</span>
                {selectedType !== 'Todos' && (
                  <Badge variant="primary">{categoryLabels[selectedType] || selectedType}</Badge>
                )}
                {selectedBrand !== 'Todas' && (
                  <Badge variant="primary">{selectedBrand}</Badge>
                )}
                {priceRange.max < 200000 && (
                  <Badge variant="primary">Até {formatPrice(priceRange.max)}</Badge>
                )}
                <button
                  onClick={() => {
                    setSelectedType('Todos');
                    setSelectedBrand('Todas');
                    setPriceRange({ min: 0, max: 200000 });
                  }}
                  className="text-sm text-primary hover:underline ml-2"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Vehicle Grid */}
        {filteredVehicles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Nenhum veículo encontrado com os filtros selecionados.</p>
            <button
              onClick={() => {
                setSelectedType('Todos');
                setSelectedBrand('Todas');
                setPriceRange({ min: 0, max: 200000 });
              }}
              className="mt-4 text-primary hover:underline"
            >
              Ver todos os veículos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {filteredVehicles.map((vehicle, index) => (
                <motion.div
                  key={vehicle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-2xl transition-all duration-300"
                >
                  {/* Vehicle Image */}
                  <div className="relative h-64 bg-gray-900 overflow-hidden">
                    <ProtectedImage
                      src={vehicle.images[0]}
                      alt={vehicle.name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />

                    {/* Badge Overlay - Se em destaque */}
                    {vehicle.featured && (
                      <div className="absolute top-3 right-3">
                        <Badge variant="limited" icon="⭐" animate>
                          Em Destaque
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Vehicle Info */}
                  <div className="p-6">
                    {/* Category Badge */}
                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-3 capitalize">
                      {vehicle.category === 'pickup' ? 'Picape' :
                       vehicle.category === 'suv' ? 'SUV' :
                       vehicle.category === 'hatch' ? 'Hatch' :
                       vehicle.category === 'motorcycle' ? 'Moto' :
                       vehicle.category}
                    </span>

                    {/* Brand & Name */}
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        {vehicle.brand}
                      </p>
                      <h3 className="text-xl font-bold text-gray-900 mt-1">
                        {vehicle.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{vehicle.version}</p>
                    </div>

                    {/* Specs */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <i className="fas fa-calendar mr-2 text-primary"></i>
                        {vehicle.year}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <i className="fas fa-gas-pump mr-2 text-primary"></i>
                        {vehicle.fuel}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <i className="fas fa-cog mr-2 text-primary"></i>
                        {vehicle.transmission}
                      </div>
                    </div>

                    {/* Features */}
                    {vehicle.features && vehicle.features.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {vehicle.features.slice(0, 3).map((feature, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {feature}
                          </span>
                        ))}
                        {vehicle.features.length > 3 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            +{vehicle.features.length - 3} mais
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price */}
                    <div className="border-t pt-4">
                      <p className="text-3xl font-bold text-primary mb-4">
                        {formatPrice(vehicle.price)}
                      </p>

                      {/* Action Button - Consultora Camila */}
                      <button
                        onClick={() => {
                          if (onVehicleInterest) onVehicleInterest(vehicle.name);
                        }}
                        className="w-full btn btn-primary flex items-center justify-center gap-2"
                      >
                        <ConsultoraAvatar size="sm" className="w-7 h-7 border-white/50" />
                        <span>Falar com a Camila</span>
                      </button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Consultora especializada • Atendimento 24/7
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-12 space-y-4"
        >
          <a
            href="/catalogo"
            className="inline-block btn btn-primary"
          >
            <i className="fas fa-car mr-2"></i>
            Ver Catálogo Completo com Todas as Fotos
          </a>

          <p className="text-gray-600">
            Ou fale diretamente com nossa consultora
          </p>

          <button
            onClick={() => {
              if (onVehicleInterest) onVehicleInterest('Catálogo Completo');
            }}
            className="btn btn-accent flex items-center justify-center gap-2 mx-auto"
          >
            <ConsultoraAvatar size="sm" className="w-8 h-8 border-white/50" />
            <span>Converse com a Camila</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
