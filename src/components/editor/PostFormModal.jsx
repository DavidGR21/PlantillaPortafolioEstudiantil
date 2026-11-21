import { useState } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { Spinner } from '../ui/Spinner.jsx'

const TITLE_MAX = 200
const DESCRIPTION_MAX = 10000

/**
 * Formulario de publicación (crear o editar).
 * - post: publicación a editar, o null para crear una nueva.
 * - onSubmit({ title, description }): async; si lanza, se muestra el error.
 */
export function PostFormModal({ post, subsectionTitle, onSubmit, onClose }) {
  const isEdit = Boolean(post)
  const [title, setTitle] = useState(post?.title ?? '')
  const [description, setDescription] = useState(post?.description ?? '')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const unchanged = isEdit && title.trim() === post.title && description.trim() === (post.description ?? '')
  const canSubmit = title.trim() && !unchanged && !isSaving

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setError('')
    setIsSaving(true)
    try {
      await onSubmit({ title: title.trim(), description: description.trim() })
    } catch (err) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <Modal
      title={isEdit ? 'Editar publicación' : `Nueva publicación en ${subsectionTitle}`}
      onClose={onClose}
      dismissible={!isSaving}
    >
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="post-title">Título *</label>
          <input
            id="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={TITLE_MAX}
            placeholder="Ej. Tarea 1: Algoritmos básicos"
            required
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="post-description">Descripción (opcional)</label>
          <textarea
            id="post-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={6}
            placeholder="Explica brevemente de qué trata el trabajo, qué aprendiste, etc."
          />
          <p className="field__hint field__hint--right">
            {description.length.toLocaleString('es')}/{DESCRIPTION_MAX.toLocaleString('es')}
          </p>
        </div>

        {!isEdit && (
          <p className="field__hint">
            Después de crearla podrás adjuntar sus PDF e imágenes desde la lista de publicaciones.
          </p>
        )}

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={isSaving}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
            {isSaving ? (
              <Spinner size="sm" label="Guardando…" />
            ) : isEdit ? (
              'Guardar cambios'
            ) : (
              'Crear publicación'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
