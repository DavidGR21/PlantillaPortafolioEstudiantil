import { useEffect, useRef } from 'react'
import { formatBytes } from '../../utils/format.js'
import './FileViewer.css'

const SWIPE_THRESHOLD = 50 // px

/**
 * Visor a pantalla completa para los archivos de una publicación.
 * - Imágenes ampliadas y PDF incrustado.
 * - Flechas ← → (teclado, botones o deslizar en móvil) para pasar de archivo.
 * - Esc o × para cerrar.
 * Se abre al montarse: {abierto && <FileViewer ... />}
 */
export function FileViewer({ files, index, onIndexChange, onClose }) {
  const dialogRef = useRef(null)
  const touchStartX = useRef(null)
  const file = files[index]
  const hasMany = files.length > 1

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  const go = (delta) => onIndexChange((index + delta + files.length) % files.length)

  function handleKeyDown(event) {
    // En el PDF (iframe) las flechas desplazan el documento; aquí solo llegan si el foco está fuera.
    if (!hasMany) return
    if (event.key === 'ArrowRight') go(1)
    if (event.key === 'ArrowLeft') go(-1)
  }

  function handleCancel(event) {
    event.preventDefault() // Esc
    onClose()
  }

  function handleTouchStart(event) {
    touchStartX.current = event.touches[0].clientX
  }

  function handleTouchEnd(event) {
    if (touchStartX.current === null || !hasMany || file.kind !== 'image') return
    const delta = event.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD) go(delta < 0 ? 1 : -1)
    touchStartX.current = null
  }

  return (
    <dialog
      ref={dialogRef}
      className="viewer"
      aria-label={`Visor de archivos: ${file.name}`}
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
    >
      <header className="viewer__bar">
        <div className="viewer__title">
          <span className="viewer__name" title={file.name}>
            {file.name}
          </span>
          <span className="viewer__meta">
            {hasMany && `${index + 1} de ${files.length} · `}
            {formatBytes(Number(file.size))}
          </span>
        </div>
        <div className="viewer__actions">
          <a className="viewer__btn" href={file.url} target="_blank" rel="noreferrer" title="Abrir en una pestaña nueva">
            <span aria-hidden="true">↗</span>
            <span className="viewer__btn-label">Abrir</span>
          </a>
          {file.downloadUrl && (
            <a className="viewer__btn" href={file.downloadUrl} title="Descargar">
              <span aria-hidden="true">⬇</span>
              <span className="viewer__btn-label">Descargar</span>
            </a>
          )}
          <button type="button" className="viewer__btn viewer__close" onClick={onClose} aria-label="Cerrar visor" autoFocus>
            ×
          </button>
        </div>
      </header>

      <div className="viewer__stage" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {hasMany && (
          <button type="button" className="viewer__nav viewer__nav--prev" onClick={() => go(-1)} aria-label="Archivo anterior">
            ‹
          </button>
        )}

        {file.kind === 'image' ? (
          // key: fuerza a recargar al cambiar de archivo (evita ver la imagen anterior)
          <img key={file.id} className="viewer__image" src={file.url} alt={file.name} />
        ) : (
          <div className="viewer__pdf">
            <iframe key={file.id} className="viewer__frame" src={file.url} title={`PDF: ${file.name}`} />
            <p className="viewer__fallback">
              ¿No se ve el documento? En algunos móviles el PDF no se muestra aquí:{' '}
              <a href={file.url} target="_blank" rel="noreferrer">
                ábrelo en una pestaña nueva
              </a>
              {file.downloadUrl && (
                <>
                  {' '}o <a href={file.downloadUrl}>descárgalo</a>
                </>
              )}
              .
            </p>
          </div>
        )}

        {hasMany && (
          <button type="button" className="viewer__nav viewer__nav--next" onClick={() => go(1)} aria-label="Archivo siguiente">
            ›
          </button>
        )}
      </div>
    </dialog>
  )
}
