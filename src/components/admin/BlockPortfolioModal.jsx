import { useState } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Spinner } from '../ui/Spinner.jsx'

const REASON_MAX = 500

/** Bloquear un portafolio indicando el motivo (lo verá su dueño). onSubmit(reason) es async. */
export function BlockPortfolioModal({ portfolio, onSubmit, onClose }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const canSubmit = reason.trim().length >= 3 && !isSaving

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setError('')
    setIsSaving(true)
    try {
      await onSubmit(reason.trim())
    } catch (err) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <Modal title="Bloquear portafolio" onClose={onClose} dismissible={!isSaving} size="sm">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <p className="confirm-dialog__body">
          <strong>{portfolio.title}</strong> (de {portfolio.owner.fullName}) dejará de verse públicamente. Su dueño
          podrá seguir editándolo y verá el motivo. Podrás desbloquearlo cuando quieras.
        </p>

        <div className="field">
          <label htmlFor="block-reason">Motivo *</label>
          <textarea
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={REASON_MAX}
            rows={3}
            placeholder="Ej. Contenido que no corresponde a trabajos académicos."
            autoFocus
          />
          <p className="field__hint field__hint--right">
            {reason.length}/{REASON_MAX}
          </p>
        </div>

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--danger" disabled={!canSubmit}>
            {isSaving ? <Spinner size="sm" label="Bloqueando…" /> : 'Bloquear'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
