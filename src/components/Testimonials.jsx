import { motion } from 'framer-motion'

const testimonials = [
  {
    id: 1,
    name: 'João Silva',
    role: 'Empresário',
    image: '/testimonials/joao.jpg',
    content: 'Excelente atendimento! Consegui o carro dos meus sonhos com um financiamento que coube no meu bolso.',
    car: 'Honda HR-V EXL 2022'
  },
  {
    id: 2,
    name: 'Maria Santos',
    role: 'Médica',
    image: '/testimonials/maria.jpg',
    content: 'Super recomendo! Processo rápido e transparente. O carro está impecável, exatamente como anunciado.',
    car: 'Toyota Corolla XEI 2023'
  },
  {
    id: 3,
    name: 'Pedro Costa',
    role: 'Professor',
    image: '/testimonials/pedro.jpg',
    content: 'Melhor experiência na compra de um seminovo. Equipe muito profissional e atenciosa.',
    car: 'Jeep Compass Limited 2022'
  }
]

export default function Testimonials() {
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
          O Que Nossos Clientes Dizem
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="section-subtitle"
        >
          Confira a experiência de quem já realizou o sonho do carro novo com a gente
        </motion.p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-center mb-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-16 h-16 rounded-full object-cover mr-4"
                />
                <div>
                  <h3 className="font-semibold text-lg">{testimonial.name}</h3>
                  <p className="text-gray-600">{testimonial.role}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <i className="fas fa-quote-left text-2xl text-primary opacity-20"></i>
                <p className="mt-2 text-gray-700">{testimonial.content}</p>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <i className="fas fa-car mr-2 text-primary"></i>
                <span>{testimonial.car}</span>
              </div>

              <div className="mt-4 flex text-primary">
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
                <i className="fas fa-star"></i>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
} 