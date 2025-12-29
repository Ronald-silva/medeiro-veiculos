import React from 'react';

/**
 * Avatar da Consultora Camila
 * Componente reutilizável com foto real profissional
 * Alinhado ao nicho automotivo
 */
export default function ConsultoraAvatar({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden border-2 border-white shadow-lg ${className}`}>
      <img
        src="/perfil-camila.png"
        alt="Consultora Camila - Medeiros Veículos"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
