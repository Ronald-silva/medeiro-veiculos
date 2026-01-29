/**
 * Avatar da Consultora Camila
 * Componente reutilizável com foto real profissional
 * Usa imagens responsivas para melhor performance
 */
export default function ConsultoraAvatar({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-10 h-10',  // 40px
    md: 'w-14 h-14',  // 56px
    lg: 'w-20 h-20',  // 80px
    xl: 'w-24 h-24'   // 96px
  };

  // Mapeia tamanho do componente para imagem otimizada
  const imageMap = {
    sm: { src: '/perfil-camila-sm.webp', width: 80 },
    md: { src: '/perfil-camila-md.webp', width: 112 },
    lg: { src: '/perfil-camila-lg.webp', width: 160 },
    xl: { src: '/perfil-camila-lg.webp', width: 192 }
  };

  const image = imageMap[size] || imageMap.md;

  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden border-2 border-white shadow-lg ${className}`}>
      <img
        src={image.src}
        alt="Consultora Camila - Medeiros Veículos"
        className="w-full h-full object-cover"
        width={image.width}
        height={image.width}
        loading="eager"
      />
    </div>
  );
}
