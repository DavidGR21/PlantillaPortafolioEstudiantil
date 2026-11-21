import { useEffect, useId, useRef, useState } from 'react'
import { Check, CircleAlert, FilePlus2, FileText, Image, LoaderCircle, Paperclip, Send, X } from 'lucide-react'
import * as contentService from '../../services/contentService.js'
import * as fileService from '../../services/fileService.js'
import { formatBytes } from '../../utils/format.js'
import { ACCEPT_ATTRIBUTE, detectMimeType, MAX_FILES_PER_POST, validateFile } from '../../utils/files.js'

const TITLE_MAX = 200
const DESCRIPTION_MAX = 10000
let nextLocalId = 0

/**
 * Crear una publicación en un solo paso: título, descripción y archivos.
 * Cerrado se ve como una tarjeta «Agregar publicación»; al abrirlo, muestra el formulario.
 * Al publicar: crea la publicación y sube los archivos con progreso individual.
 */
export function PostComposer({ subsection, startOpen = false, onPublished }) {
  const titleId = useId()
  const descId = useId()
  const fileInputId = useId()
  const [open, setOpen] = useState(startOpen)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [files, setFiles] = useState([]) // [{ id, file, error, status, progress }]
  const [isDragging, setIsDragging] = useState(false)
  const [phase, setPhase] = useState('idle') // idle | creating | uploading
  const [error, setError] = useState('')
  const abortRef = useRef(null)

  const isWorking = phase !== 'idle'
  const validFiles = files.filter((f) => !f.error)
  const canPublish = title.trim() && !isWorking

  useEffect(() => () => abortRef.current?.abort(), [])

  // Avisar antes de cerrar la pestaña con una publicación en curso.
  useEffect(() => {
    if (!isWorking) return
    const warn = (event) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isWorking])

  function reset() {
    setTitle('')
    setDescription('')
    setFiles([])
    setError('')
    setPhase('idle')
  }

  function addFiles(list) {
    const incoming = Array.from(list ?? [])
    if (incoming.length === 0) return
    setFiles((current) => {
      let slots = MAX_FILES_PER_POST - current.filter((f) => !f.error).length
      const added = incoming.map((file) => {
        const problem = validateFile(file) ?? (slots <= 0 ? `Máximo ${MAX_FILES_PER_POST} archivos por publicación.` : null)
        if (!problem) slots--
        return { id: ++nextLocalId, file, error: problem, status: 'pending', progress: 0 }
      })
      return [...current, ...added]
    })
  }

  const removeFile = (id) => setFiles((current) => current.filter((f) => f.id !== id))
  const updateFile = (id, changes) => setFiles((current) => current.map((f) => (f.id === id ? { ...f, ...changes } : f)))

  async function handlePublish(event) {
    event.preventDefault()
    if (!canPublish) return
    setError('')
    const controller = new AbortController()
    abortRef.current = controller

    // 1) Crear la publicación
    setPhase('creating')
    let post
    try {
      post = await contentService.createPost(subsection.id, { title: title.trim(), description: description.trim() })
    } catch (err) {
      setError(err.message)
      setPhase('idle')
      return
    }

    // 2) Subir los archivos, uno por uno, con progreso
    setPhase('uploading')
    let failures = 0
    for (const item of validFiles) {
      if (controller.signal.aborted) return
      updateFile(item.id, { status: 'uploading' })
      try {
        await fileService.uploadPostFile(post.id, item.file, {
          signal: controller.signal,
          onProgress: (progress) => updateFile(item.id, { progress }),
        })
        updateFile(item.id, { status: 'done', progress: 1 })
      } catch (err) {
        if (err.name === 'AbortError') return
        failures++
        updateFile(item.id, { status: 'error', error: err.message })
      }
    }

    await onPublished(post, failures).catch(() => {})
    if (failures === 0) {
      reset()
      setOpen(false)
    } else {
      // La publicación ya existe: los archivos que fallaron se pueden volver a subir desde ella.
      setError(`Se publicó «${post.title}», pero ${failures} archivo(s) no se pudieron subir. Puedes volver a intentarlo desde la publicación.`)
      setTitle('')
      setDescription('')
      setFiles((current) => current.filter((f) => f.status === 'error'))
      setPhase('idle')
    }
  }

  if (!open) {
    return (
      <button type="button" className="composer-trigger" onClick={() => setOpen(true)}>
        <span className="composer-trigger__icon" aria-hidden="true">
          <FilePlus2 size={22} />
        </span>
        <span className="composer-trigger__text">
          <strong>Agregar publicación a {subsection.title}</strong>
          <span>Título, descripción y tus PDF o imágenes en un solo paso.</span>
        </span>
      </button>
    )
  }

  return (
    <form className="composer" onSubmit={handlePublish} noValidate aria-label={`Nueva publicación en ${subsection.title}`}>
      <header className="composer__header">
        <span className="composer__header-icon" aria-hidden="true">
          <FilePlus2 size={18} />
        </span>
        <h4 className="composer__title">Nueva publicación en {subsection.title}</h4>
        {!isWorking && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              reset()
              setOpen(false)
            }}
            aria-label="Cerrar sin publicar"
            title="Cerrar"
          >
            <X size={18} />
          </button>
        )}
      </header>

      <div className="composer__field">
        <label htmlFor={titleId}>Título *</label>
        <input
          id={titleId}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="Ej. Tarea 1: Algoritmos básicos"
          disabled={isWorking}
          autoFocus
          required
        />
      </div>

      <div className="composer__field">
        <label htmlFor={descId}>
          Descripción <span className="composer__optional">(opcional)</span>
        </label>
        <textarea
          id={descId}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={DESCRIPTION_MAX}
          rows={3}
          placeholder="¿De qué trata el trabajo? ¿Qué aprendiste?"
          disabled={isWorking}
        />
      </div>

      {/* Archivos */}
      <div className="composer__field">
        <span className="composer__label">
          Archivos <span className="composer__optional">(opcional)</span>
        </span>
        <label
          htmlFor={fileInputId}
          className={`composer-drop${isDragging ? ' composer-drop--active' : ''}${isWorking ? ' composer-drop--disabled' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            if (!isWorking) setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            if (!isWorking) addFiles(e.dataTransfer.files)
          }}
        >
          <input
            id={fileInputId}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="visually-hidden"
            disabled={isWorking}
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <Paperclip size={20} aria-hidden="true" />
          <span>
            <strong>Adjuntar archivos</strong> o arrastrarlos aquí
          </span>
          <span className="composer-drop__hint">PDF hasta 50 MB · JPG, PNG, WEBP o GIF hasta 10 MB</span>
        </label>

        {files.length > 0 && (
          <ul className="composer-files">
            {files.map((item) => {
              const isImage = detectMimeType(item.file).startsWith('image/')
              const Icon = isImage ? Image : FileText
              return (
                <li key={item.id} className={`composer-file composer-file--${item.error ? 'error' : item.status}`}>
                  <span className={`composer-file__icon${isImage ? ' composer-file__icon--image' : ''}`} aria-hidden="true">
                    <Icon size={16} />
                  </span>
                  <span className="composer-file__info">
                    <span className="composer-file__name">{item.file.name}</span>
                    <span className="composer-file__meta">
                      {item.error ? (
                        <>
                          <CircleAlert size={13} aria-hidden="true" /> {item.error}
                        </>
                      ) : item.status === 'uploading' ? (
                        `Subiendo… ${Math.round(item.progress * 100)}%`
                      ) : item.status === 'done' ? (
                        <>
                          <Check size={13} aria-hidden="true" /> Subido
                        </>
                      ) : (
                        formatBytes(item.file.size)
                      )}
                    </span>
                    {item.status === 'uploading' && (
                      <progress className="composer-file__bar" value={item.progress} max={1} />
                    )}
                  </span>
                  {!isWorking && (
                    <button type="button" className="icon-btn" onClick={() => removeFile(item.id)} aria-label={`Quitar ${item.file.name}`} title="Quitar">
                      <X size={15} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      <footer className="composer__footer">
        <span className="composer__summary">
          {validFiles.length > 0
            ? `${validFiles.length} archivo${validFiles.length === 1 ? '' : 's'} listo${validFiles.length === 1 ? '' : 's'} para subir`
            : 'Podrás agregar archivos también después.'}
        </span>
        <button type="submit" className="btn btn--primary" disabled={!canPublish}>
          {isWorking ? (
            <>
              <LoaderCircle className="spin" size={17} aria-hidden="true" />
              {phase === 'creating' ? 'Creando…' : 'Subiendo archivos…'}
            </>
          ) : (
            <>
              <Send size={17} aria-hidden="true" />
              Publicar
            </>
          )}
        </button>
      </footer>
    </form>
  )
}
