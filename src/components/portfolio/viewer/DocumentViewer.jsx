import { useState } from 'react'
import { FileText, Images } from 'lucide-react'
import { ImageGallery } from './ImageGallery.jsx'
import { PdfViewer } from './PdfViewer.jsx'

/**
 * Visor de los archivos de una publicación. Cada PDF es una pestaña y todas
 * las imágenes juntas forman una galería. Con un solo elemento no hay pestañas.
 */
export function DocumentViewer({ files }) {
  const pdfs = files.filter((f) => f.kind === 'pdf')
  const images = files.filter((f) => f.kind === 'image')
  const items = [
    ...pdfs.map((file) => ({ key: file.id, type: 'pdf', label: file.name, file })),
    ...(images.length > 0
      ? [{ key: 'gallery', type: 'gallery', label: images.length === 1 ? 'Imagen' : `Galería · ${images.length} imágenes` }]
      : []),
  ]
  const [activeKey, setActiveKey] = useState(items[0]?.key)
  const active = items.find((i) => i.key === activeKey) ?? items[0]

  if (!active) return null

  return (
    <div className="docv">
      {items.length > 1 && (
        <div className="docv__tabs" role="tablist" aria-label="Documentos de la publicación">
          {items.map((item) => {
            const Icon = item.type === 'pdf' ? FileText : Images
            const selected = item.key === active.key
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`docv__tab${selected ? ' docv__tab--active' : ''}`}
                onClick={() => setActiveKey(item.key)}
                title={item.label}
              >
                <Icon size={15} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {active.type === 'pdf' ? (
        <PdfViewer key={active.file.id} url={active.file.url} downloadUrl={active.file.downloadUrl} name={active.file.name} />
      ) : (
        <ImageGallery images={images} />
      )}
    </div>
  )
}
