import { useState } from 'react'
import { Modal } from '../../components/ui/Modal.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { deletePortfolio } from '../../services/portfolioService.js'
import { pluralize } from '../../utils/format.js'

/** Confirmación fuerte: hay que escribir la dirección del portafolio para eliminarlo. */
export function DeletePortfolioModal({ portfolio, onClose, onDeleted }) {
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const matches = confirmation.trim().toLowerCase() === portfolio.slug

  async function handleSubmit(event) {
    event.preventDefault()
    if (!matches || isDeleting) return
    setError('')
    setIsDeleting(true)
    try {
      await deletePortfolio(portfolio.id)
      onDeleted(portfolio)
    } catch (err) {
      setError(err.message)
      setIsDeleting(false)
    }
  }

  return (
    <Modal title="Eliminar portafolio" onClose={onClose} dismissible={!isDeleting} size="sm">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <p className="alert alert--error">
          Se eliminará <strong>{portfolio.title}</strong> con{' '}
          {pluralize(portfolio.sectionsCount ?? 0, 'apartado', 'apartados')},{' '}
          {pluralize(portfolio.postsCount ?? 0, 'publicación', 'publicaciones')} y todos sus
          archivos. <strong>Esta acción no se puede deshacer.</strong>
        </p>

        <div className="field">
          <label htmlFor="delete-confirm">
            Escribe <code>{portfolio.slug}</code> para confirmar
          </label>
          <input
            id="delete-confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            autoFocus
          />
        </div>

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--danger" disabled={!matches || isDeleting}>
            {isDeleting ? <Spinner size="sm" label="Eliminando…" /> : 'Eliminar definitivamente'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
