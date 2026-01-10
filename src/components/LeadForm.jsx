import { useState } from 'react'
import { motion } from 'framer-motion'

export default function LeadForm() {
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    tipoCarro: '',
    orcamento: '',
    pagamento: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    
    // Formata o número do WhatsApp
    if (name === 'whatsapp') {
      const numbers = value.replace(/\D/g, '')
      const match = numbers.match(/^(\d{0,2})(\d{0,5})(\d{0,4})$/)
      const formatted = match
        ? `${match[1]}${match[1] ? ' ' : ''}${match[2]}${match[2] ? '-' : ''}${match[3]}`
        : value
      setFormData(prev => ({ ...prev, [name]: formatted }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Salva os dados no localStorage
    localStorage.setItem('leadData', JSON.stringify(formData))
    
    // Prepara a mensagem para o WhatsApp
    const message = encodeURIComponent(
      `Olá! Me chamo ${formData.nome}.\n\n` +
      `Tenho interesse em um ${formData.tipoCarro}.\n` +
      `Meu orçamento é de ${formData.orcamento}\n` +
      `Forma de pagamento: ${formData.pagamento}`
    )
    
    // Abre o WhatsApp com a mensagem
    window.open(`https://wa.me/5585992002115?text=${message}`, '_blank')
  }

  return (
    <section className="py-16 bg-white">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-3xl font-bold text-center mb-8">
            Solicite uma Cotação
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
                Nome Completo
              </label>
              <input
                type="text"
                id="nome"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700">
                WhatsApp
              </label>
              <input
                type="tel"
                id="whatsapp"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="85 98888-8888"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="tipoCarro" className="block text-sm font-medium text-gray-700">
                Tipo de Carro
              </label>
              <select
                id="tipoCarro"
                name="tipoCarro"
                value={formData.tipoCarro}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              >
                <option value="">Selecione...</option>
                <option value="SUV">SUV</option>
                <option value="Sedan">Sedan</option>
                <option value="Hatch">Hatch</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>

            <div>
              <label htmlFor="orcamento" className="block text-sm font-medium text-gray-700">
                Orçamento
              </label>
              <select
                id="orcamento"
                name="orcamento"
                value={formData.orcamento}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              >
                <option value="">Selecione...</option>
                <option value="Até R$ 50.000">Até R$ 50.000</option>
                <option value="R$ 50.000 a R$ 80.000">R$ 50.000 a R$ 80.000</option>
                <option value="R$ 80.000 a R$ 120.000">R$ 80.000 a R$ 120.000</option>
                <option value="Acima de R$ 120.000">Acima de R$ 120.000</option>
              </select>
            </div>

            <div>
              <label htmlFor="pagamento" className="block text-sm font-medium text-gray-700">
                Forma de Pagamento
              </label>
              <select
                id="pagamento"
                name="pagamento"
                value={formData.pagamento}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              >
                <option value="">Selecione...</option>
                <option value="À Vista">À Vista</option>
                <option value="Financiamento">Financiamento</option>
                <option value="Consórcio">Consórcio</option>
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full btn btn-primary"
            >
              Solicitar Cotação
            </motion.button>
          </form>
        </motion.div>
      </div>
    </section>
  )
} 