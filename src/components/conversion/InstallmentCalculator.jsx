import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateFinancing, formatCurrency } from '../../utils/calculations';

export default function InstallmentCalculator({ price, carName, onConsultClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const [downPayment, setDownPayment] = useState(price * 0.3); // 30% padrão (mais realista)
  const [months, setMonths] = useState(48); // 48 meses padrão
  const [interestRate] = useState(2.49); // 2,49% a.m. (taxa média mercado)

  const vehiclePrice = typeof price === 'string'
    ? parseFloat(price.replace(/[^\d,]/g, '').replace(',', '.'))
    : price;

  const downPaymentPercent = Math.round((downPayment / vehiclePrice) * 100);
  const financing = calculateFinancing(vehiclePrice, downPayment, months, interestRate);

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full btn btn-primary py-2 text-sm flex items-center justify-center gap-2"
      >
        <i className="fas fa-calculator"></i>
        {isOpen ? 'Fechar Simulação' : 'Simular Financiamento'}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
              {/* Resultado Principal */}
              <div className="text-center mb-6">
                <p className="text-sm text-gray-600 mb-1">Parcelas de</p>
                <motion.p
                  key={financing.installment}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  className="text-4xl font-bold text-green-600"
                >
                  {formatCurrency(financing.installment)}
                </motion.p>
                <p className="text-sm text-gray-600 mt-1">
                  em {months}x (Taxa {interestRate}% a.m.)
                </p>
              </div>

              {/* Slider Entrada */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Entrada ({downPaymentPercent}%)
                  </label>
                  <span className="text-sm font-bold text-gray-900">
                    {formatCurrency(downPayment)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={vehiclePrice * 0.5}
                  step={1000}
                  value={downPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Sem entrada</span>
                  <span>50% entrada</span>
                </div>
              </div>

              {/* Slider Prazo */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Prazo
                  </label>
                  <span className="text-sm font-bold text-gray-900">
                    {months} meses
                  </span>
                </div>
                <input
                  type="range"
                  min={12}
                  max={60}
                  step={12}
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>12 meses</span>
                  <span>60 meses</span>
                </div>
              </div>

              {/* Resumo */}
              <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor do veículo:</span>
                  <span className="font-semibold">{formatCurrency(vehiclePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Entrada:</span>
                  <span className="font-semibold text-green-600">
                    - {formatCurrency(downPayment)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Valor financiado:</span>
                  <span className="font-semibold">{formatCurrency(financing.financedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total de juros:</span>
                  <span className="font-semibold text-orange-600">
                    + {formatCurrency(financing.totalInterest)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Total a pagar:</span>
                  <span className="text-lg">{formatCurrency(financing.total + downPayment)}</span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-4 text-center">
                <p className="text-xs text-gray-600 mb-3">
                  💡 <strong>Simulação aproximada.</strong> Taxas e condições podem variar.
                </p>
                {onConsultClick && (
                  <button
                    onClick={onConsultClick}
                    className="btn btn-primary w-full py-2 text-sm"
                  >
                    <i className="fas fa-robot mr-2"></i>
                    Consultar Condições Reais
                  </button>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Fale com nosso consultor especializado
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
