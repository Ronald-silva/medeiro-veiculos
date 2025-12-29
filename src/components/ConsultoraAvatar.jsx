import React from 'react';

/**
 * Avatar da Consultora Camila
 * Componente reutilizável com foto real profissional
 * Alinhado ao nicho automotivo
 */
export default function ConsultoraAvatar({ size = 'md', className = '' }) {
  // Tamanhos aumentados 2x para telas Retina (maior nitidez)
  const sizes = {
    sm: 'w-10 h-10',  // era 8, agora 10 (25% maior)
    md: 'w-14 h-14',  // era 12, agora 14 (17% maior)
    lg: 'w-20 h-20',  // era 16, agora 20 (25% maior)
    xl: 'w-24 h-24'   // era 20, agora 24 (20% maior)
  };

  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden border-2 border-white shadow-lg ${className}`}>
      <img
        src="/perfil-camila.png"
        alt="Consultora Camila - Medeiros Veículos"
        className="w-full h-full object-cover"
        style={{
          imageRendering: 'crisp-edges',
          imageRendering: '-webkit-optimize-contrast',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          WebkitFontSmoothing: 'antialiased'
        }}
        loading="eager"
      />
    </div>
  );
}
