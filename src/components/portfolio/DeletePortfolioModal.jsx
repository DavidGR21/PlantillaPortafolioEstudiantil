import { useState } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { deletePortfolio } from '../../services/portfolioService.js'
import { formatBytes, pluralize } from '../../utils/format.js'

/**
 * Confirmación fuerte: hay que escribir la dirección del portafolio para eliminarlo.
 * - onDelete(id): función que borra (por defecto, la del dueño; el admin pasa la suya).
 * - ownerName: si se indica, se muestra de quién es (vista de administración).
 */
export function DeletePortfolioModal({ portfolio, ownerName, onDelete = deletePortfolio, onClose, onDeleted }) {
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
      await onDelete(portfolio.id)
      onDeleted(portfolio)
    } catch (err) {
      setError(err.message)
      setIsDeleting(false)
    }
  }

  const files = portfolio.filesCount !== undefined
    ? ` y ${pluralize(portfolio.filesCount, 'archivo', 'archivos')} (${formatBytes(portfolio.filesSize ?? 0)})`
    : ' y todos sus archivos'

  return (
    <Modal title="Eliminar portafolio" onClose={onClose} dismissible={!isDeleting} size="sm">
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <p className="alert alert--error">
          Se eliminará <strong>{portfolio.title}</strong>
          {ownerName && <> de <strong>{ownerName}</strong></>} con{' '}
          {pluralize(portfolio.sectionsCount ?? 0, 'apartado', 'apartados')},{' '}
          {pluralize(portfolio.postsCount ?? 0, 'publicación', 'publicaciones')}
          {files}. <strong>Esta acción no se puede deshacer.</strong>
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
