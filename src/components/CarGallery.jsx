import { useState } from 'react'
import { motion } from 'framer-motion'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Thumbs, Zoom } from 'swiper/modules'
import ProtectedImage from './ProtectedImage'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/thumbs'
import 'swiper/css/zoom'

const carGallery = {
  hrv: [
    { id: 1, url: '/cars/gallery/hrv-1.png', alt: 'Honda HR-V EXL 2022 - Frente' },
    { id: 2, url: '/cars/gallery/hrv-2.png', alt: 'Honda HR-V EXL 2022 - Lateral' },
    { id: 3, url: '/cars/gallery/hrv-3.png', alt: 'Honda HR-V EXL 2022 - Interior' },
    { id: 4, url: '/cars/gallery/hrv-4.png', alt: 'Honda HR-V EXL 2022 - Traseira' }
  ],
  corolla: [
    { id: 1, url: '/cars/gallery/corolla-1.png', alt: 'Toyota Corolla XEI 2023 - Frente' },
    { id: 2, url: '/cars/gallery/corolla-2.png', alt: 'Toyota Corolla XEI 2023 - Lateral' },
    { id: 3, url: '/cars/gallery/corolla-3.png', alt: 'Toyota Corolla XEI 2023 - Interior' },
    { id: 4, url: '/cars/gallery/corolla-4.png', alt: 'Toyota Corolla XEI 2023 - Traseira' }
  ],
  compass: [
    { id: 1, url: '/cars/gallery/compass-1.png', alt: 'Jeep Compass Limited 2022 - Frente' },
    { id: 2, url: '/cars/gallery/compass-2.png', alt: 'Jeep Compass Limited 2022 - Lateral' },
    { id: 3, url: '/cars/gallery/compass-3.png', alt: 'Jeep Compass Limited 2022 - Interior' },
    { id: 4, url: '/cars/gallery/compass-4.png', alt: 'Jeep Compass Limited 2022 - Traseira' }
  ]
}

export default function CarGallery({ carId }) {
  const [thumbsSwiper, setThumbsSwiper] = useState(null)
  const [isZoomed, setIsZoomed] = useState(false)

  const images = carGallery[carId] || []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative bg-black rounded-lg overflow-hidden"
    >
      {/* Galeria Principal */}
      <Swiper
        modules={[Navigation, Pagination, Thumbs, Zoom]}
        navigation
        pagination={{ clickable: true }}
        thumbs={{ swiper: thumbsSwiper }}
        zoom={{
          maxRatio: 2,
          minRatio: 1
        }}
        className="aspect-w-16 aspect-h-9"
        onZoomChange={(swiper, scale) => setIsZoomed(scale !== 1)}
      >
        {images.map((image) => (
          <SwiperSlide key={image.id} className="bg-gray-900">
            <div className="swiper-zoom-container">
              <ProtectedImage
                src={image.url}
                alt={image.alt}
                className={`w-full h-full object-contain transition-transform duration-300 ${
                  isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                loading="lazy"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Miniaturas */}
      <div className="mt-4">
        <Swiper
          onSwiper={setThumbsSwiper}
          modules={[Navigation, Thumbs]}
          watchSlidesProgress
          slidesPerView={4}
          spaceBetween={10}
          className="thumbs-swiper"
        >
          {images.map((image) => (
            <SwiperSlide key={image.id} className="cursor-pointer">
              <div className="aspect-w-16 aspect-h-9">
                <ProtectedImage
                  src={image.url}
                  alt={image.alt}
                  className="w-full h-full object-cover rounded-lg opacity-50 hover:opacity-100 transition-opacity duration-200"
                  loading="lazy"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Instruções de Zoom */}
      <div className="absolute top-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
        <i className="fas fa-search-plus mr-2"></i>
        Clique para zoom
      </div>
    </motion.div>
  )
} 