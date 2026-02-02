// Circuit Breaker - Proteção contra falhas em cascata
// Implementação simples e eficiente para APIs externas

const circuits = new Map();

const STATES = {
  CLOSED: 'CLOSED',     // Normal - requisições passam
  OPEN: 'OPEN',         // Bloqueado - requisições falham imediatamente
  HALF_OPEN: 'HALF_OPEN' // Testando - permite 1 requisição
};

const DEFAULT_OPTIONS = {
  failureThreshold: 3,    // Falhas antes de abrir
  resetTimeout: 30000,    // 30s antes de tentar novamente
  halfOpenRequests: 1     // Requisições para testar
};

/**
 * Obtém ou cria circuit para um serviço
 */
function getCircuit(name, options = {}) {
  if (!circuits.has(name)) {
    circuits.set(name, {
      name,
      state: STATES.CLOSED,
      failures: 0,
      lastFailure: null,
      successesInHalfOpen: 0,
      options: { ...DEFAULT_OPTIONS, ...options }
    });
  }
  return circuits.get(name);
}

/**
 * Verifica se pode fazer requisição
 */
function canRequest(circuit) {
  const now = Date.now();

  if (circuit.state === STATES.CLOSED) {
    return true;
  }

  if (circuit.state === STATES.OPEN) {
    // Verifica se passou tempo suficiente para tentar novamente
    if (now - circuit.lastFailure >= circuit.options.resetTimeout) {
      circuit.state = STATES.HALF_OPEN;
      circuit.successesInHalfOpen = 0;
      console.log(`🔄 Circuit [${circuit.name}] mudou para HALF_OPEN`);
      return true;
    }
    return false;
  }

  if (circuit.state === STATES.HALF_OPEN) {
    // Permite apenas 1 requisição de teste
    return circuit.successesInHalfOpen < circuit.options.halfOpenRequests;
  }

  return false;
}

/**
 * Registra sucesso
 */
function recordSuccess(circuit) {
  if (circuit.state === STATES.HALF_OPEN) {
    circuit.successesInHalfOpen++;
    if (circuit.successesInHalfOpen >= circuit.options.halfOpenRequests) {
      circuit.state = STATES.CLOSED;
      circuit.failures = 0;
      console.log(`✅ Circuit [${circuit.name}] fechou - serviço recuperado`);
    }
  } else {
    circuit.failures = 0;
  }
}

/**
 * Registra falha
 */
function recordFailure(circuit) {
  circuit.failures++;
  circuit.lastFailure = Date.now();

  if (circuit.state === STATES.HALF_OPEN) {
    circuit.state = STATES.OPEN;
    console.log(`❌ Circuit [${circuit.name}] abriu - teste falhou`);
  } else if (circuit.failures >= circuit.options.failureThreshold) {
    circuit.state = STATES.OPEN;
    console.log(`❌ Circuit [${circuit.name}] abriu - ${circuit.failures} falhas consecutivas`);
  }
}

/**
 * Executa função com proteção de circuit breaker
 * @param {string} name - Nome do serviço
 * @param {Function} fn - Função async a executar
 * @param {Object} options - Opções do circuit
 * @returns {Promise} Resultado da função ou erro
 */
export async function withCircuitBreaker(name, fn, options = {}) {
  const circuit = getCircuit(name, options);

  if (!canRequest(circuit)) {
    const waitTime = Math.ceil((circuit.options.resetTimeout - (Date.now() - circuit.lastFailure)) / 1000);
    const error = new Error(`Circuit [${name}] está ABERTO. Tente novamente em ${waitTime}s`);
    error.code = 'CIRCUIT_OPEN';
    error.retryAfter = waitTime;
    throw error;
  }

  try {
    const result = await fn();
    recordSuccess(circuit);
    return result;
  } catch (error) {
    recordFailure(circuit);
    throw error;
  }
}

/**
 * Obtém status de todos os circuits
 */
export function getCircuitsStatus() {
  const status = {};
  for (const [name, circuit] of circuits.entries()) {
    status[name] = {
      state: circuit.state,
      failures: circuit.failures,
      lastFailure: circuit.lastFailure ? new Date(circuit.lastFailure).toISOString() : null
    };
  }
  return status;
}

/**
 * Reset manual de um circuit (para admin)
 */
export function resetCircuit(name) {
  const circuit = circuits.get(name);
  if (circuit) {
    circuit.state = STATES.CLOSED;
    circuit.failures = 0;
    circuit.lastFailure = null;
    console.log(`🔧 Circuit [${name}] resetado manualmente`);
    return true;
  }
  return false;
}

export default {
  withCircuitBreaker,
  getCircuitsStatus,
  resetCircuit
};
