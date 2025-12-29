import React from 'react';

/**
 * Avatar da Consultora Camila
 * Componente reutilizável com SVG ilustração profissional feminina
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
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center overflow-hidden ${className}`}>
      {/* SVG Ilustração Feminina Profissional */}
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Fundo */}
        <circle cx="50" cy="50" r="50" fill="#F0F4F8"/>

        {/* Cabelo longo (feminino) */}
        <path
          d="M 25 35 Q 25 20, 40 18 Q 50 16, 60 18 Q 75 20, 75 35 L 75 60 Q 70 65, 65 68 L 65 45 Q 60 35, 50 35 Q 40 35, 35 45 L 35 68 Q 30 65, 25 60 Z"
          fill="#2D3748"
        />

        {/* Rosto */}
        <ellipse cx="50" cy="45" rx="18" ry="22" fill="#F4C7A0"/>

        {/* Olhos */}
        <circle cx="43" cy="42" r="2" fill="#2D3748"/>
        <circle cx="57" cy="42" r="2" fill="#2D3748"/>

        {/* Sorriso profissional */}
        <path
          d="M 43 52 Q 50 56, 57 52"
          stroke="#2D3748"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Blusa profissional (cor primária) */}
        <path
          d="M 32 68 Q 35 65, 40 64 L 40 95 L 30 95 Z M 68 68 Q 65 65, 60 64 L 60 95 L 70 95 Z"
          fill="#E53E3E"
        />

        {/* Pescoço */}
        <rect x="44" y="60" width="12" height="10" fill="#F4C7A0"/>

        {/* Colar delicado (toque feminino) */}
        <circle cx="50" cy="68" r="2.5" fill="#FFD700" opacity="0.8"/>
      </svg>
    </div>
  );
}
