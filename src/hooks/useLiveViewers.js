import { useState, useEffect } from 'react';

/**
 * Hook para simular visualizações ao vivo
 * Adiciona flutuação realista baseada em um número base
 * @param {number} baseCount - Número base de visualizadores
 * @param {number} fluctuation - Variação máxima (+/-)
 * @returns {number} Número atual de visualizadores
 */
export default function useLiveViewers(baseCount = 20, fluctuation = 5) {
  const [viewers, setViewers] = useState(baseCount);

  useEffect(() => {
    // Atualiza a cada 5-15 segundos com variação aleatória
    const updateViewers = () => {
      const randomChange = Math.floor(Math.random() * (fluctuation * 2 + 1)) - fluctuation;
      const newCount = Math.max(1, baseCount + randomChange);
      setViewers(newCount);
    };

    // Atualização inicial
    updateViewers();

    // Intervalo aleatório entre 5 e 15 segundos
    const randomInterval = 5000 + Math.random() * 10000;
    const timer = setInterval(updateViewers, randomInterval);

    return () => clearInterval(timer);
  }, [baseCount, fluctuation]);

  return viewers;
}
