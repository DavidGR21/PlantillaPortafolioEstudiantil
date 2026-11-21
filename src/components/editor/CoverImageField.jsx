import { useId, useState } from 'react'
import { ImagePlus, LoaderCircle, RefreshCw, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { detectMimeType, validateFile } from '../../utils/files.js'

/**
 * Campo de imagen de portada: vista previa, subir/cambiar (con progreso) y quitar.
 * La imagen se guarda al subirla. onUpload(file, onProgress) y onRemove() son async.
 */
export function CoverImageField({ imageUrl, onUpload, onRemove, label = 'Imagen de portada', hint }) {
  const inputId = useId()
  const [progress, setProgress] = useState(null) // null | 0..1
  const [error, setError] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)
  const isUploading = progress !== null

  async function handleFile(file) {
    if (!file) return
    setError('')
    const problem = validateFile(file) ?? (detectMimeType(file).startsWith('image/') ? null : 'La portada debe ser una imagen (JPG, PNG, WEBP o GIF).')
    if (problem) {
      setError(problem)
      return
    }
    setProgress(0)
    try {
      await onUpload(file, setProgress)
    } catch (err) {
      setError(err.message)
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="cover-field">
      <span className="cover-field__label">{label}</span>
      <div className={`cover-field__preview${imageUrl ? '' : ' cover-field__preview--empty'}`}>
        {imageUrl ? <img src={imageUrl} alt="" /> : <ImagePlus size={30} aria-hidden="true" />}
        {isUploading && (
          <div className="cover-field__progress" role="status">
            <LoaderCircle className="spin" size={22} aria-hidden="true" />
            Subiendo… {Math.round(progress * 100)}%
          </div>
        )}
      </div>

      <div className="cover-field__actions">
        <label htmlFor={inputId} className={`btn btn--ghost btn--sm${isUploading ? ' is-disabled' : ''}`}>
          {imageUrl ? <RefreshCw size={15} aria-hidden="true" /> : <ImagePlus size={15} aria-hidden="true" />}
          {imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
        </label>
        <input
          id={inputId}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif,image/jpeg,image/png,image/webp,image/gif"
          className="visually-hidden"
          disabled={isUploading}
          onChange={(e) => {
            handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {imageUrl && (
          <button type="button" className="btn btn--ghost btn--sm btn--text-danger" onClick={() => setConfirmRemove(true)} disabled={isUploading}>
            <Trash2 size={15} aria-hidden="true" />
            Quitar
          </button>
        )}
      </div>
      <p className="field__hint">{hint ?? 'JPG, PNG, WEBP o GIF hasta 10 MB. Se recomienda una imagen horizontal.'}</p>
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Quitar imagen de portada"
          confirmLabel="Quitar imagen"
          busyLabel="Quitando…"
          onConfirm={async () => {
            await onRemove()
            setConfirmRemove(false)
          }}
          onClose={() => setConfirmRemove(false)}
        >
          <p>La portada volverá a mostrarse con el color del portafolio.</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
