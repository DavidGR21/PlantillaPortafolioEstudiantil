import { useState } from 'react'
import { Modal } from '../../components/ui/Modal.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { useSlugAvailability } from '../../hooks/useSlugAvailability.js'
import { createPortfolio } from '../../services/portfolioService.js'
import { publicPortfolioUrl, SLUG_MAX_LENGTH, slugify } from '../../utils/slug.js'

export function CreatePortfolioModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false) // si el usuario editó la dirección a mano
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const slugStatus = useSlugAvailability(slug)
  const canSubmit = title.trim() && slugStatus.status === 'available' && !isSaving

  function handleTitleChange(event) {
    const value = event.target.value
    setTitle(value)
    // Mientras no toque la dirección, se sugiere a partir del título.
    if (!slugTouched) setSlug(slugify(value))
  }

  function handleSlugChange(event) {
    setSlugTouched(true)
    // Normaliza mientras escribe: minúsculas y espacios -> guiones.
    setSlug(event.target.value.toLowerCase().replace(/\s+/g, '-').slice(0, SLUG_MAX_LENGTH))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setError('')
    setIsSaving(true)
    try {
      const portfolio = await createPortfolio({ title, subtitle, slug })
      onCreated(portfolio)
    } catch (err) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <Modal title="Nuevo portafolio" onClose={onClose} dismissible={!isSaving}>
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="pf-title">Título *</label>
          <input
            id="pf-title"
            value={title}
            onChange={handleTitleChange}
            maxLength={150}
            placeholder="Ej. Portafolio de Programación I"
            required
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="pf-subtitle">Subtítulo</label>
          <input
            id="pf-subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={255}
            placeholder="Ej. Juan Pérez · Ingeniería de Sistemas"
          />
        </div>

        <div className="field">
          <label htmlFor="pf-slug">Dirección pública *</label>
          <div className="field__prefixed">
            <span className="field__prefix">/p/</span>
            <input
              id="pf-slug"
              value={slug}
              onChange={handleSlugChange}
              maxLength={SLUG_MAX_LENGTH}
              placeholder="mi-portafolio"
              aria-describedby="pf-slug-help"
              autoComplete="off"
              spellCheck={false}
              required
            />
          </div>
          <p id="pf-slug-help" className={`field__hint field__hint--${slugStatus.status}`} aria-live="polite">
            {slugStatus.message ||
              'Minúsculas, números y guiones. Se usará en el enlace de tu portafolio.'}
          </p>
          {slugStatus.status === 'available' && (
            <p className="field__hint">
              Tu enlace: <strong>{publicPortfolioUrl(slug)}</strong>
            </p>
          )}
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
          <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
            {isSaving ? <Spinner size="sm" label="Creando…" /> : 'Crear portafolio'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
