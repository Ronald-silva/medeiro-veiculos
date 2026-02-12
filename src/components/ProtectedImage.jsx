/**
 * ProtectedImage - Componente de imagem com proteção anti-download
 *
 * Medidas de segurança:
 * - Overlay transparente impede "Salvar imagem como..."
 * - Bloqueia right-click, drag & drop
 * - Desabilita seleção de imagem
 * - Marca d'água via CSS
 */
export default function ProtectedImage({ src, alt, className = '', containerClassName = '', loading, onClick }) {
  const handleContextMenu = (e) => {
    e.preventDefault()
    return false
  }

  const handleDragStart = (e) => {
    e.preventDefault()
    return false
  }

  return (
    <div
      className={`protected-image-container ${containerClassName}`}
      onContextMenu={handleContextMenu}
    >
      <img
        src={src}
        alt={alt}
        className={`protected-image ${className}`}
        loading={loading}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        draggable={false}
      />
      {/* Overlay transparente - impede salvar imagem via click direito */}
      <div
        className="protected-image-overlay"
        onContextMenu={handleContextMenu}
        onClick={onClick}
      />
    </div>
  )
}
