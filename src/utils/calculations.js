/**
 * Calcula o valor da parcela usando a Tabela Price
 * @param {number} principal - Valor financiado
 * @param {number} months - Número de parcelas
 * @param {number} annualRate - Taxa de juros anual (%)
 * @returns {number} Valor da parcela mensal
 */
export function calculateInstallment(principal, months, annualRate = 24) {
  const monthlyRate = annualRate / 12 / 100;

  if (monthlyRate === 0) {
    return principal / months;
  }

  const installment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
                     (Math.pow(1 + monthlyRate, months) - 1);

  return Math.round(installment * 100) / 100;
}

/**
 * Calcula valores totais do financiamento com taxa mensal
 * @param {number} vehiclePrice - Preço do veículo
 * @param {number} downPayment - Valor da entrada
 * @param {number} months - Número de parcelas
 * @param {number} monthlyRate - Taxa de juros mensal (%) - ex: 2.49
 * @returns {object} { installment, total, totalInterest, financedAmount }
 */
export function calculateFinancing(vehiclePrice, downPayment, months, monthlyRate = 2.49) {
  const financedAmount = vehiclePrice - downPayment;

  // Converte taxa mensal para decimal
  const rate = monthlyRate / 100;

  if (rate === 0) {
    const installment = financedAmount / months;
    return {
      installment: Math.round(installment * 100) / 100,
      total: Math.round(financedAmount * 100) / 100,
      totalInterest: 0,
      financedAmount
    };
  }

  // Fórmula da Tabela Price
  const installment = financedAmount * (rate * Math.pow(1 + rate, months)) /
                     (Math.pow(1 + rate, months) - 1);

  const total = installment * months;
  const totalInterest = total - financedAmount;

  return {
    installment: Math.round(installment * 100) / 100,
    total: Math.round(total * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    financedAmount
  };
}

/**
 * Formata valor para Real brasileiro
 * @param {number} value - Valor a formatar
 * @returns {string} Valor formatado (ex: "R$ 1.234,56")
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

/**
 * Parse de string de preço para número
 * @param {string} priceString - String com preço (ex: "R$ 145.900")
 * @returns {number} Valor numérico
 */
export function parsePrice(priceString) {
  return parseFloat(priceString.replace(/[^\d,]/g, '').replace(',', '.'));
}
