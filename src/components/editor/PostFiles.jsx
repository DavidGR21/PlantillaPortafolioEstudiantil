import { useEffect, useId, useRef, useState } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { FileViewer } from '../portfolio/FileViewer.jsx'
import * as fileService from '../../services/fileService.js'
import { formatBytes } from '../../utils/format.js'
import { ACCEPT_ATTRIBUTE, MAX_FILES_PER_POST, validateFile } from '../../utils/files.js'

let nextUploadId = 0

/**
 * Archivos de una publicación en el editor: lista con miniaturas,
 * subida (botón o arrastrar y soltar) con progreso por archivo, y eliminación.
 */
export function PostFiles({ post, onChanged }) {
  const inputId = useId()
  const [queue, setQueue] = useState([]) // [{ id, name, size, progress, status, error }]
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [viewerIndex, setViewerIndex] = useState(null)
  const [error, setError] = useState('')
  const abortRef = useRef(null)

  const remaining = MAX_FILES_PER_POST - post.files.length

  // Cancelar subidas si el componente desaparece (p. ej. se cambia de parcial).
  useEffect(() => () => abortRef.current?.abort(), [])

  // Avisar antes de cerrar la pestaña con subidas en curso.
  useEffect(() => {
    if (!isUploading) return
    const warn = (event) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isUploading])

  const updateItem = (id, changes) =>
    setQueue((items) => items.map((item) => (item.id === id ? { ...item, ...changes } : item)))

  async function handleFiles(fileList) {
    const selected = Array.from(fileList ?? [])
    if (selected.length === 0 || isUploading) return
    setError('')

    // Valida cada archivo y respeta el máximo por publicación.
    let slots = remaining
    const items = selected.map((file) => {
      const item = { id: ++nextUploadId, file, name: file.name, size: file.size, progress: 0 }
      const problem = validateFile(file) ?? (slots <= 0 ? `Máximo ${MAX_FILES_PER_POST} archivos por publicación.` : null)
      if (problem) return { ...item, status: 'error', error: problem }
      slots--
      return { ...item, status: 'pending' }
    })
    setQueue((current) => [...current.filter((i) => i.status === 'error'), ...items])

    const toUpload = items.filter((i) => i.status === 'pending')
    if (toUpload.length === 0) return

    const controller = new AbortController()
    abortRef.current = controller
    setIsUploading(true)

    for (const item of toUpload) {
      if (controller.signal.aborted) break
      updateItem(item.id, { status: 'uploading' })
      try {
        await fileService.uploadPostFile(post.id, item.file, {
          signal: controller.signal,
          onProgress: (progress) => updateItem(item.id, { progress }),
        })
        updateItem(item.id, { status: 'done', progress: 1 })
      } catch (err) {
        if (err.name === 'AbortError') break
        updateItem(item.id, { status: 'error', error: err.message })
      }
    }

    if (controller.signal.aborted) return
    setIsUploading(false)
    abortRef.current = null
    try {
      await onChanged()
      // Los terminados ya aparecen en la lista de archivos.
      setQueue((items) => items.filter((i) => i.status !== 'done'))
    } catch (err) {
      setError(err.message)
    }
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  async function handleDelete() {
    await fileService.deleteFile(toDelete.id)
    setToDelete(null)
    onChanged().catch((err) => setError(err.message))
  }

  const images = post.files.filter((f) => f.kind === 'image')
  const pdfs = post.files.filter((f) => f.kind === 'pdf')
  const viewerFiles = [...images, ...pdfs]

  return (
    <div className="post-files">
      {images.length > 0 && (
        <ul className="post-files__images">
          {images.map((file, i) => (
            <li key={file.id} className="post-files__thumb">
              <button
                type="button"
                className="post-files__preview"
                onClick={() => setViewerIndex(i)}
                title={file.name}
                aria-label={`Ver ${file.name}`}
              >
                <img src={file.url} alt={file.name} loading="lazy" />
              </button>
              <button
                type="button"
                className="post-files__remove"
                onClick={() => setToDelete(file)}
                aria-label={`Eliminar ${file.name}`}
                title="Eliminar"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {pdfs.length > 0 && (
        <ul className="post-files__docs">
          {pdfs.map((file, i) => (
            <li key={file.id} className="post-files__doc">
              <span className="post-files__badge" aria-hidden="true">
                PDF
              </span>
              <button
                type="button"
                className="post-files__name"
                onClick={() => setViewerIndex(images.length + i)}
                title={`Ver ${file.name}`}
              >
                {file.name}
              </button>
              <span className="post-files__size">{formatBytes(file.size)}</span>
              <button
                type="button"
                className="icon-btn icon-btn--danger"
                onClick={() => setToDelete(file)}
                aria-label={`Eliminar ${file.name}`}
                title="Eliminar"
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}

      {queue.length > 0 && (
        <ul className="upload-queue" aria-live="polite">
          {queue.map((item) => (
            <li key={item.id} className={`upload-item upload-item--${item.status}`}>
              <div className="upload-item__info">
                <span className="upload-item__name">{item.name}</span>
                <span className="upload-item__status">
                  {item.status === 'pending' && 'En espera'}
                  {item.status === 'uploading' && `${Math.round(item.progress * 100)}%`}
                  {item.status === 'done' && 'Subido ✓'}
                  {item.status === 'error' && item.error}
                </span>
              </div>
              {(item.status === 'uploading' || item.status === 'done') && (
                <progress className="upload-item__bar" value={item.progress} max={1} />
              )}
            </li>
          ))}
          {!isUploading && queue.some((i) => i.status === 'error') && (
            <li>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setQueue([])}>
                Limpiar avisos
              </button>
            </li>
          )}
        </ul>
      )}

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      {remaining > 0 ? (
        <label
          htmlFor={inputId}
          className={`dropzone${isDragging ? ' dropzone--active' : ''}${isUploading ? ' dropzone--disabled' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            if (!isUploading) setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            id={inputId}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="visually-hidden"
            disabled={isUploading}
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = '' // permite volver a elegir el mismo archivo
            }}
          />
          {isUploading ? (
            'Subiendo archivos…'
          ) : (
            <>
              <strong>Agregar archivos</strong> o arrastrarlos aquí
              <span className="dropzone__hint">
                PDF (máx. 50 MB) o imágenes JPG, PNG, WEBP, GIF (máx. 10 MB) · quedan {remaining}
              </span>
            </>
          )}
        </label>
      ) : (
        <p className="field__hint">Esta publicación alcanzó el máximo de {MAX_FILES_PER_POST} archivos.</p>
      )}

      {viewerIndex !== null && viewerIndex < viewerFiles.length && (
        <FileViewer
          files={viewerFiles}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar archivo"
          confirmLabel="Eliminar archivo"
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
        >
          <p>
            Se eliminará <strong>«{toDelete.name}»</strong> de esta publicación.{' '}
            <strong>Esta acción no se puede deshacer.</strong>
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}
