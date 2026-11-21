import { useEffect, useId, useRef } from 'react'
import './Modal.css'

/**
 * Ventana modal basada en <dialog> (accesible: foco atrapado, Esc para cerrar).
 * Se abre al montarse: el padre la muestra con {abierto && <Modal ... />}.
 * Con dismissible=false (p. ej. mientras se guarda) no se cierra con Esc ni clic fuera.
 */
export function Modal({ title, onClose, dismissible = true, size = 'md', children }) {
  const dialogRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    return () => dialog.close()
  }, [])

  function handleCancel(event) {
    // Evento "cancel" = tecla Esc
    event.preventDefault()
    if (dismissible) onClose()
  }

  function handleClick(event) {
    // Clic en el fondo (fuera del contenido)
    if (event.target === dialogRef.current && dismissible) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className={`modal modal--${size}`}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClick={handleClick}
    >
      <div className="modal__content">
        <header className="modal__header">
          <h2 id={titleId} className="modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            disabled={!dismissible}
            aria-label="Cerrar"
          >
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
