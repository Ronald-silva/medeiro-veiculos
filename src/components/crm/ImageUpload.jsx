import { useState, useRef } from 'react'
import {
  PhotoIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { uploadVehicleImage } from '../../lib/supabase'

export default function ImageUpload({ images = [], onChange, vehicleId = null, maxImages = 5 }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return

    setError(null)
    setUploading(true)

    const newImages = [...images]

    for (const file of files) {
      // Verifica limite
      if (newImages.length >= maxImages) {
        setError(`Máximo de ${maxImages} imagens permitido`)
        break
      }

      // Verifica tipo
      if (!file.type.startsWith('image/')) {
        setError('Apenas imagens são permitidas')
        continue
      }

      // Verifica tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Imagem muito grande (máx 5MB)')
        continue
      }

      try {
        const result = await uploadVehicleImage(file, vehicleId)

        if (result.success) {
          newImages.push(result.url)
        } else {
          setError(result.error || 'Erro ao fazer upload')
        }
      } catch (err) {
        setError('Erro ao fazer upload: ' + err.message)
      }
    }

    setUploading(false)
    onChange(newImages)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleRemoveImage = (index) => {
    const newImages = images.filter((_, i) => i !== index)
    onChange(newImages)
  }

  const handleAddUrl = () => {
    const url = prompt('Cole a URL da imagem:')
    if (url && url.trim()) {
      if (images.length >= maxImages) {
        setError(`Máximo de ${maxImages} imagens permitido`)
        return
      }
      onChange([...images, url.trim()])
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Imagens ({images.length}/{maxImages})
      </label>

      {/* Preview das imagens */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Imagem ${index + 1}`}
                className="w-full h-20 object-cover rounded-lg border border-gray-200"
                onError={(e) => {
                  e.target.src = '/placeholder-car.svg'
                  e.target.className = 'w-full h-20 object-contain rounded-lg border border-gray-200 bg-gray-100 p-2'
                }}
              />
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Área de upload */}
      {images.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          {uploading ? (
            <div className="py-2">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto" />
              <p className="text-sm text-gray-500 mt-2">Enviando...</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                {dragOver ? (
                  <ArrowUpTrayIcon className="w-8 h-8 text-blue-500" />
                ) : (
                  <PhotoIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Arraste imagens aqui ou <span className="text-blue-600">clique para selecionar</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG até 5MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Botão para adicionar URL manualmente */}
      {images.length < maxImages && (
        <button
          type="button"
          onClick={handleAddUrl}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          + Adicionar URL de imagem
        </button>
      )}

      {/* Mensagem de erro */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  )
}
