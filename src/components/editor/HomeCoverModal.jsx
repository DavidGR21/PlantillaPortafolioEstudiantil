import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, LoaderCircle, Plus, Trash2 } from 'lucide-react'
import { Modal } from '../ui/Modal.jsx'
import { CoverImageField } from './CoverImageField.jsx'
import * as fileService from '../../services/fileService.js'
import { updatePortfolio } from '../../services/portfolioService.js'

const MAX_FIELDS = 12
// Punto de partida si la carátula está vacía (como en una carátula académica habitual).
const SUGGESTED_FIELDS = ['Nombre', 'Docente', 'Curso', 'Paralelo']
let nextRowId = 0
const row = (label = '', value = '') => ({ rowId: ++nextRowId, label, value })

/** Portada del inicio (imagen) y datos de la carátula del portafolio. */
export function HomeCoverModal({ portfolio, onChanged, onClose }) {
  const info = portfolio.coverInfo ?? {}
  const [institution, setInstitution] = useState(info.institution ?? '')
  const [subtitle, setSubtitle] = useState(info.subtitle ?? '')
  const [fields, setFields] = useState(() =>
    info.fields?.length ? info.fields.map((f) => row(f.label, f.value)) : SUGGESTED_FIELDS.map((label) => row(label)),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (rowId, key, value) => setFields((list) => list.map((f) => (f.rowId === rowId ? { ...f, [key]: value } : f)))
  const move = (index, delta) =>
    setFields((list) => {
      const copy = [...list]
      ;[copy[index], copy[index + delta]] = [copy[index + delta], copy[index]]
      return copy
    })

  async function handleSave(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    try {
      await updatePortfolio(portfolio.id, {
        coverInfo: {
          institution: institution.trim(),
          subtitle: subtitle.trim(),
          fields: fields.map((f) => ({ label: f.label.trim(), value: f.value.trim() })).filter((f) => f.label || f.value),
        },
      })
      await onChanged()
      onClose()
    } catch (err) {
      setError(err.message)
      setIsSaving(false)
    }
  }

  return (
    <Modal title="Portada y carátula del inicio" onClose={onClose} dismissible={!isSaving} size="lg">
      <form className="modal__form home-cover" onSubmit={handleSave} noValidate>
        <CoverImageField
          label="Imagen de portada del inicio"
          hint="Es lo primero que se ve al abrir tu portafolio. Se guarda al subirla. JPG, PNG, WEBP o GIF hasta 10 MB."
          imageUrl={portfolio.coverUrl}
          onUpload={async (file, onProgress) => {
            await fileService.uploadCover('portfolio', portfolio.id, file, { onProgress })
            await onChanged()
          }}
          onRemove={async () => {
            await fileService.removeCover('portfolio', portfolio.id)
            await onChanged()
          }}
        />

        <fieldset className="home-cover__caratula">
          <legend>Carátula</legend>
          <p className="field__hint">Se muestra debajo de la portada, como en la primera hoja de un trabajo impreso.</p>

          <div className="field">
            <label htmlFor="cover-institution">Institución</label>
            <input id="cover-institution" value={institution} onChange={(e) => setInstitution(e.target.value)} maxLength={150} placeholder="Ej. Universidad Técnica de Ambato" />
          </div>
          <div className="field">
            <label htmlFor="cover-subtitle">Facultad o carrera</label>
            <input id="cover-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={200} placeholder="Ej. Contabilidad y Auditoría" />
          </div>

          <div className="home-cover__fields">
            <div className="home-cover__fields-head" aria-hidden="true">
              <span>Dato</span>
              <span>Valor</span>
            </div>
            {fields.map((f, index) => (
              <div key={f.rowId} className="home-cover__row">
                <input value={f.label} onChange={(e) => update(f.rowId, 'label', e.target.value)} maxLength={40} placeholder="Ej. Docente" aria-label={`Dato ${index + 1}`} />
                <input value={f.value} onChange={(e) => update(f.rowId, 'value', e.target.value)} maxLength={150} placeholder="Ej. Claudio Hidalgo" aria-label={`Valor ${index + 1}`} />
                <div className="home-cover__row-actions">
                  <button type="button" className="icon-btn" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir" title="Subir">
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => move(index, 1)} disabled={index === fields.length - 1} aria-label="Bajar" title="Bajar">
                    <ArrowDown size={15} />
                  </button>
                  <button type="button" className="icon-btn icon-btn--danger" onClick={() => setFields((l) => l.filter((x) => x.rowId !== f.rowId))} aria-label={`Quitar dato ${index + 1}`} title="Quitar">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn--ghost btn--sm home-cover__add" onClick={() => setFields((l) => [...l, row()])} disabled={fields.length >= MAX_FIELDS}>
              <Plus size={15} aria-hidden="true" />
              Agregar dato
            </button>
          </div>
        </fieldset>

        {error && (
          <p className="alert alert--error" role="alert">
            {error}
          </p>
        )}

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={isSaving}>
            Cerrar
          </button>
          <button type="submit" className="btn btn--primary" disabled={isSaving}>
            {isSaving ? <LoaderCircle className="spin" size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
            Guardar carátula
          </button>
        </div>
      </form>
    </Modal>
  )
}
