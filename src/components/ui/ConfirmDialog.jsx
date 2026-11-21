import { useState } from 'react'
import { Modal } from './Modal.jsx'
import { Spinner } from './Spinner.jsx'

/**
 * Diálogo de confirmación (por defecto, para acciones destructivas).
 * onConfirm puede ser async: mientras se ejecuta, el diálogo queda bloqueado;
 * si lanza un error, se muestra dentro del diálogo.
 * variant: 'danger' (rojo) | 'primary' (acciones no destructivas, p. ej. activar).
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel = 'Eliminar',
  busyLabel = 'Eliminando…',
  variant = 'danger',
  onConfirm,
  onClose,
}) {
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setError('')
    setIsBusy(true)
    try {
      await onConfirm()
    } catch (err) {
      setError(err.message)
      setIsBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={onClose} dismissible={!isBusy} size="sm">
      <div className="modal__form">
        <div className="confirm-dialog__body">{children}</div>

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={isBusy}>
            Cancelar
          </button>
          <button type="button" className={`btn btn--${variant}`} onClick={handleConfirm} disabled={isBusy}>
            {isBusy ? <Spinner size="sm" label={busyLabel} /> : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
