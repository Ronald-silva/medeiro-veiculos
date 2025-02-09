import { motion } from 'framer-motion'

const cars = [
  {
    id: 1,
    name: 'Honda HR-V EXL 2022',
    price: 'R$ 145.900',
    image: '/cars/hrv.png'
  },
  {
    id: 2,
    name: 'Toyota Corolla XEI 2023',
    price: 'R$ 139.900',
    image: '/cars/corolla.png'
  },
  {
    id: 3,
    name: 'Jeep Compass Limited 2022',
    price: 'R$ 169.900',
    image: '/cars/compass.png'
  }
]

export default function CarShowcase() {
  const handleWhatsApp = (carName) => {
    const message = encodeURIComponent(`Olá! Gostaria de saber mais sobre o ${carName}`)
    window.open(`https://wa.me/5585988852900?text=${message}`, '_blank')
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-center mb-12"
        >
          Veículos em Destaque
        </motion.h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cars.map((car, index) => (
            <motion.div
              key={car.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                <img
                  src={car.image}
                  alt={car.name}
                  className="object-cover w-full h-full"
                  loading="lazy"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{car.name}</h3>
                <p className="text-2xl font-bold text-primary mb-4">{car.price}</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleWhatsApp(car.name)}
                  className="w-full btn btn-primary"
                >
                  <i className="fab fa-whatsapp mr-2"></i>
                  Saiba Mais
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
} 