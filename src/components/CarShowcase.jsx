import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CarGallery from './CarGallery'
import InstallmentCalculator from './conversion/InstallmentCalculator'
import Badge from './ui/Badge'
import LiveViewers from './conversion/LiveViewers'

const cars = [
  {
    id: 1,
    galleryId: 'hrv',
    name: 'Honda HR-V EXL 2022',
    price: 'R$ 145.900',
    image: '/cars/hrv.png',
    type: 'SUV',
    features: ['Automático', 'Flex', 'Completo'],
    km: '35.000',
    status: 'limited', // available, limited, sold
    viewsToday: 87
  },
  {
    id: 2,
    galleryId: 'corolla',
    name: 'Toyota Corolla XEI 2023',
    price: 'R$ 139.900',
    image: '/cars/corolla.png',
    type: 'Sedan',
    features: ['Automático', 'Flex', 'Couro'],
    km: '28.000',
    status: 'available',
    viewsToday: 124
  },
  {
    id: 3,
    galleryId: 'compass',
    name: 'Jeep Compass Limited 2022',
    price: 'R$ 169.900',
    image: '/cars/compass.png',
    type: 'SUV',
    features: ['Automático', 'Diesel', '4x4'],
    km: '42.000',
    status: 'limited',
    viewsToday: 63
  }
]

const filters = ['Todos', 'SUV', 'Sedan', 'Hatch']

export default function CarShowcase() {
  const [activeFilter, setActiveFilter] = useState('Todos')
  const [hoveredCar, setHoveredCar] = useState(null)
  const [selectedCar, setSelectedCar] = useState(null)

  const filteredCars = activeFilter === 'Todos'
    ? cars
    : cars.filter(car => car.type === activeFilter)

  const handleWhatsApp = (carName) => {
    const message = encodeURIComponent(`Olá! Gostaria de saber mais sobre o ${carName}`)
    window.open(`https://api.whatsapp.com/send?phone=5585920021150&text=${message}`, '_blank')
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="section-title"
        >
          Veículos em Destaque
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="section-subtitle"
        >
          Confira nosso estoque de seminovos premium selecionados
        </motion.p>

        {/* Filtros */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-6 py-2 rounded-full transition-all duration-300 ${
                activeFilter === filter
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Grid de Carros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence>
            {filteredCars.map((car, index) => (
              <motion.div
                key={car.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
                onMouseEnter={() => setHoveredCar(car.id)}
                onMouseLeave={() => setHoveredCar(null)}
              >
                <div
                  className="relative aspect-w-16 aspect-h-9 bg-gray-100 cursor-pointer"
                  onClick={() => setSelectedCar(car)}
                >
                  <img
                    src={car.image}
                    alt={car.name}
                    className="object-cover w-full h-full"
                    loading="lazy"
                  />
                  {/* Badges de Status */}
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    {car.status === 'sold' && (
                      <Badge variant="sold" icon="🚫">VENDIDO</Badge>
                    )}
                    {car.status === 'limited' && (
                      <Badge variant="limited" icon="⚡" animate>Última unidade!</Badge>
                    )}
                    {car.viewsToday && (
                      <LiveViewers count={car.viewsToday} variant="compact" />
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{car.name}</h3>
                      <p className="text-2xl font-bold text-primary">{car.price}</p>
                    </div>
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
                      {car.type}
                    </span>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                      <i className="fas fa-tachometer-alt mr-2 text-primary"></i>
                      <span>{car.km} km</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {car.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-4 mt-6">
                      <button
                        onClick={() => handleWhatsApp(car.name)}
                        className="btn btn-whatsapp flex-1 py-2 text-sm"
                      >
                        <i className="fab fa-whatsapp mr-2"></i>
                        Mais Detalhes
                      </button>
                      <button
                        onClick={() => setSelectedCar(car)}
                        className="btn btn-primary flex-1 py-2 text-sm"
                      >
                        <i className="fas fa-images mr-2"></i>
                        Ver Fotos
                      </button>
                    </div>

                    {/* Calculadora de Financiamento */}
                    <InstallmentCalculator
                      price={car.price}
                      carName={car.name}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Modal da Galeria */}
        <AnimatePresence>
          {selectedCar && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            >
              <div className="relative w-full max-w-6xl bg-white rounded-lg p-6">
                <button
                  onClick={() => setSelectedCar(null)}
                  className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>

                <h3 className="text-2xl font-bold mb-6">{selectedCar.name}</h3>
                <CarGallery carId={selectedCar.galleryId} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
} 