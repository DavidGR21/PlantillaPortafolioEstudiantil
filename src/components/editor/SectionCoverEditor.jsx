import { useState } from 'react'
import { Check, ChevronDown, Image, LoaderCircle } from 'lucide-react'
import { CoverImageField } from './CoverImageField.jsx'
import * as contentService from '../../services/contentService.js'
import * as fileService from '../../services/fileService.js'

const TEXT_MAX = 5000

/**
 * «Portada y texto» de un apartado: imagen de cabecera y texto de presentación
 * que se muestran arriba de la página del apartado.
 */
export function SectionCoverEditor({ section, onChanged }) {
  const [open, setOpen] = useState(!section.coverUrl && !section.description ? false : true)
  const [text, setText] = useState(section.description ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const changed = text.trim() !== (section.description ?? '')

  async function saveText(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      await contentService.updateSection(section.id, { description: text.trim() })
      await onChanged()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={`section-cover${open ? ' section-cover--open' : ''}`}>
      <button type="button" className="section-cover__toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="section-cover__toggle-icon" aria-hidden="true">
          <Image size={17} />
        </span>
        <span className="section-cover__toggle-text">
          <strong>Portada y texto del apartado</strong>
          <span>
            {section.coverUrl ? 'Con imagen' : 'Sin imagen'} · {section.description ? 'con texto' : 'sin texto'}
          </span>
        </span>
        <ChevronDown size={18} className="section-cover__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="section-cover__body">
          <CoverImageField
            label="Imagen de portada del apartado"
            imageUrl={section.coverUrl}
            onUpload={async (file, onProgress) => {
              await fileService.uploadCover('section', section.id, file, { onProgress })
              await onChanged()
            }}
            onRemove={async () => {
              await fileService.removeCover('section', section.id)
              await onChanged()
            }}
          />

          <form className="section-cover__text" onSubmit={saveText}>
            <label htmlFor={`section-text-${section.id}`}>Texto de presentación</label>
            <textarea
              id={`section-text-${section.id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={TEXT_MAX}
              rows={5}
              placeholder="Ej. En este apartado se encuentran las lecturas críticas realizadas durante el semestre…"
            />
            <div className="section-cover__text-footer">
              <span className="field__hint">Aparece debajo de la portada, antes de las publicaciones.</span>
              <button type="submit" className="btn btn--primary btn--sm" disabled={!changed || isSaving}>
                {isSaving ? <LoaderCircle className="spin" size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                {saved ? 'Guardado' : 'Guardar texto'}
              </button>
            </div>
            {error && (
              <p className="alert alert--error" role="alert">
                {error}
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
