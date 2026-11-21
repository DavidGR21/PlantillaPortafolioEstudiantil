import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Maximize2 } from 'lucide-react'
import { FileViewer } from '../FileViewer.jsx'

const SWIPE_THRESHOLD = 50

/** Galería de imágenes integrada: imagen grande, flechas, miniaturas y pantalla completa. */
export function ImageGallery({ images }) {
  const [index, setIndex] = useState(0)
  const [fullscreenIndex, setFullscreenIndex] = useState(null)
  const touchX = useRef(null)
  const current = images[Math.min(index, images.length - 1)]
  const many = images.length > 1

  const go = (delta) => setIndex((i) => (i + delta + images.length) % images.length)

  function handleKeyDown(event) {
    if (!many) return
    if (event.key === 'ArrowRight') go(1)
    if (event.key === 'ArrowLeft') go(-1)
  }

  return (
    <div className="gallery" role="region" aria-label={`Galería de imágenes (${images.length})`} tabIndex={0} onKeyDown={handleKeyDown}>
      <div className="gallery__toolbar">
        <span className="gallery__counter">
          {many ? `Imagen ${index + 1} de ${images.length}` : 'Imagen'}
          <span className="gallery__name" title={current.name}>
            {current.name}
          </span>
        </span>
        <div className="gallery__actions">
          <button type="button" className="pdfv__btn" onClick={() => setFullscreenIndex(index)} aria-label="Ver en pantalla completa" title="Pantalla completa">
            <Maximize2 size={17} />
          </button>
          {current.downloadUrl && (
            <a className="pdfv__btn" href={current.downloadUrl} aria-label={`Descargar ${current.name}`} title="Descargar">
              <Download size={17} />
            </a>
          )}
        </div>
      </div>

      <div
        className="gallery__stage"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null || !many) return
          const delta = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(delta) > SWIPE_THRESHOLD) go(delta < 0 ? 1 : -1)
          touchX.current = null
        }}
      >
        <button type="button" className="gallery__image-btn" onClick={() => setFullscreenIndex(index)} aria-label={`Ampliar ${current.name}`}>
          <img key={current.id} src={current.url} alt={current.name} />
        </button>
        {many && (
          <>
            <button type="button" className="gallery__nav gallery__nav--prev" onClick={() => go(-1)} aria-label="Imagen anterior">
              <ChevronLeft size={22} />
            </button>
            <button type="button" className="gallery__nav gallery__nav--next" onClick={() => go(1)} aria-label="Imagen siguiente">
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {many && (
        <div className="gallery__thumbs" role="tablist" aria-label="Miniaturas">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`gallery__thumb${i === index ? ' gallery__thumb--active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Ver ${image.name}`}
            >
              <img src={image.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {fullscreenIndex !== null && (
        <FileViewer files={images} index={fullscreenIndex} onIndexChange={setFullscreenIndex} onClose={() => setFullscreenIndex(null)} />
      )}
    </div>
  )
}
