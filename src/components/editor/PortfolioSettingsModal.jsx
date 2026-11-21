import { useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '../ui/Modal.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import { useSlugAvailability } from '../../hooks/useSlugAvailability.js'
import { updatePortfolio } from '../../services/portfolioService.js'
import { publicPortfolioUrl, SLUG_MAX_LENGTH } from '../../utils/slug.js'
import {
  contrastWithWhite,
  DEFAULT_PRIMARY,
  isHexColor,
  THEME_PRESETS,
  themeToStyle,
} from '../../utils/theme.js'

/**
 * Datos generales del portafolio: título, subtítulo, descripción, dirección y color.
 * onSaved(portfolio) recibe el portafolio actualizado (el slug puede haber cambiado).
 */
export function PortfolioSettingsModal({ portfolio, onSaved, onClose }) {
  const initialColor = isHexColor(portfolio.theme?.primary) ? portfolio.theme.primary : DEFAULT_PRIMARY
  const [title, setTitle] = useState(portfolio.title)
  const [subtitle, setSubtitle] = useState(portfolio.subtitle ?? '')
  const [description, setDescription] = useState(portfolio.description ?? '')
  const [slug, setSlug] = useState(portfolio.slug)
  const [color, setColor] = useState(initialColor)
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const slugChanged = slug !== portfolio.slug
  const slugStatus = useSlugAvailability(slug, { excludeId: portfolio.id, skip: !slugChanged })
  const lowContrast = contrastWithWhite(color) < 4.5

  // Solo se envía lo que cambió.
  const changes = {}
  if (title.trim() !== portfolio.title) changes.title = title.trim()
  if (subtitle.trim() !== (portfolio.subtitle ?? '')) changes.subtitle = subtitle.trim()
  if (description.trim() !== (portfolio.description ?? '')) changes.description = description.trim()
  if (slugChanged) changes.slug = slug
  if (color !== initialColor) changes.theme = { ...portfolio.theme, primary: color }

  const hasChanges = Object.keys(changes).length > 0
  const slugOk = !slugChanged || slugStatus.status === 'available'
  const canSubmit = title.trim() && hasChanges && slugOk && !isSaving

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    setError('')
    setIsSaving(true)
    try {
      onSaved(await updatePortfolio(portfolio.id, changes))
    } catch (err) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <Modal title="Configuración del portafolio" onClose={onClose} dismissible={!isSaving}>
      <form className="modal__form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="cfg-title">Título *</label>
          <input id="cfg-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required />
        </div>

        <div className="field">
          <label htmlFor="cfg-subtitle">Subtítulo</label>
          <input
            id="cfg-subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            maxLength={255}
            placeholder="Ej. Juan Pérez · Ingeniería de Sistemas · 3er semestre"
          />
        </div>

        <div className="field">
          <label htmlFor="cfg-description">Presentación</label>
          <textarea
            id="cfg-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            rows={4}
            placeholder="Una breve presentación que aparece en la cabecera del portafolio."
          />
        </div>

        <div className="field">
          <label htmlFor="cfg-slug">Dirección pública</label>
          <div className="field__prefixed">
            <span className="field__prefix">/p/</span>
            <input
              id="cfg-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').slice(0, SLUG_MAX_LENGTH))}
              maxLength={SLUG_MAX_LENGTH}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          {slugChanged ? (
            <p className={`field__hint field__hint--${slugStatus.status}`} aria-live="polite">
              {slugStatus.message}
              {slugStatus.status === 'available' &&
                ' · El enlace anterior dejará de funcionar: actualízalo donde lo hayas compartido.'}
            </p>
          ) : (
            <p className="field__hint">{publicPortfolioUrl(portfolio.slug)}</p>
          )}
        </div>

        <fieldset className="field color-picker">
          <legend>Color del portafolio</legend>
          <div className="color-picker__swatches">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                className={`color-swatch${color === preset.value ? ' color-swatch--active' : ''}`}
                style={{ background: preset.value }}
                onClick={() => setColor(preset.value)}
                aria-label={preset.name}
                aria-pressed={color === preset.value}
                title={preset.name}
              >
                {color === preset.value && <Check size={15} strokeWidth={3} aria-hidden="true" />}
              </button>
            ))}
            <label className="color-swatch color-swatch--custom" title="Elegir otro color">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Elegir otro color"
              />
            </label>
          </div>
          {/* Vista previa con las mismas variables que usa la vista pública */}
          <div className="color-preview" style={themeToStyle({ primary: color })}>
            <span className="color-preview__title">{title.trim() || 'Título'}</span>
            <span className="color-preview__tab">Tareas</span>
            <span className="btn btn--primary btn--sm">Botón</span>
          </div>
          {lowContrast && (
            <p className="field__hint field__hint--invalid">
              Este color es muy claro: el texto blanco sobre él será difícil de leer.
            </p>
          )}
        </fieldset>

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
            {isSaving ? <Spinner size="sm" label="Guardando…" /> : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
