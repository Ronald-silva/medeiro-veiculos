/**
 * Avatar da Consultora Camila
 * Imagem 200x200 WebP (~10-15KB)
 */
export default function ConsultoraAvatar({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden border-2 border-white shadow-lg ${className}`}>
      <img
        src="/perfil-camila-lg.webp"
        alt="Consultora Camila - Medeiros Veículos"
        className="w-full h-full object-cover"
        width="200"
        height="200"
        loading="eager"
      />
    </div>
  );
}
