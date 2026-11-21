import { useState } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { Spinner } from '../ui/Spinner.jsx'
import * as contentService from '../../services/contentService.js'

const MAX_SECTIONS = 20

/**
 * Lista editable de apartados del menú: agregar, renombrar, mover y eliminar.
 * Tras cada cambio llama a onChanged() para recargar el portafolio.
 */
export function SectionsManager({ portfolioId, sections, selectedId, onSelect, onChanged }) {
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(null) // 'create' | 'rename' | 'move'
  const [error, setError] = useState('')

  const atLimit = sections.length >= MAX_SECTIONS

  async function run(kind, action) {
    setError('')
    setBusy(kind)
    try {
      const result = await action()
      await onChanged()
      return result
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setBusy(null)
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    const section = await run('create', () => contentService.createSection(portfolioId, title))
    if (section) {
      setNewTitle('')
      onSelect(section.id)
    }
  }

  function startRename(section) {
    setError('')
    setEditingId(section.id)
    setEditTitle(section.title)
  }

  async function handleRename(event) {
    event.preventDefault()
    const title = editTitle.trim()
    const original = sections.find((s) => s.id === editingId)
    if (!title || title === original?.title) {
      setEditingId(null)
      return
    }
    const saved = await run('rename', () => contentService.renameSection(editingId, title))
    if (saved) setEditingId(null)
  }

  function move(index, delta) {
    const ids = sections.map((s) => s.id)
    const target = index + delta
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    run('move', () => contentService.reorderSections(portfolioId, ids))
  }

  async function handleDelete() {
    // Si falla, ConfirmDialog muestra el error y sigue abierto.
    await contentService.deleteSection(toDelete.id)
    setToDelete(null)
    onChanged().catch((err) => setError(err.message))
  }

  const isBusy = busy !== null

  return (
    <section className="editor-panel sections-manager" aria-labelledby="sections-title">
      <header className="editor-panel__header">
        <h2 id="sections-title" className="editor-panel__title">
          Apartados del menú
        </h2>
        <span className="text-muted editor-panel__count">
          {sections.length}/{MAX_SECTIONS}
        </span>
      </header>

      {sections.length === 0 ? (
        <p className="text-muted sections-manager__empty">
          Aún no hay apartados. Crea el primero (por ejemplo «Tareas» o «Proyectos»).
        </p>
      ) : (
        <ol className="sections-manager__list">
          {sections.map((section, index) => {
            const isSelected = section.id === selectedId
            const isEditing = section.id === editingId

            return (
              <li
                key={section.id}
                className={`section-row${isSelected ? ' section-row--selected' : ''}`}
              >
                {isEditing ? (
                  <form className="section-row__rename" onSubmit={handleRename}>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                      maxLength={100}
                      aria-label="Nuevo nombre del apartado"
                      autoFocus
                      disabled={busy === 'rename'}
                    />
                    <button type="submit" className="btn btn--primary btn--sm" disabled={busy === 'rename'}>
                      {busy === 'rename' ? <Spinner size="sm" label="Guardando…" /> : 'Guardar'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => setEditingId(null)}
                      disabled={busy === 'rename'}
                    >
                      Cancelar
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className="section-row__select"
                      onClick={() => onSelect(section.id)}
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      <span className="section-row__index">{index + 1}</span>
                      <span className="section-row__name">{section.title}</span>
                    </button>

                    <div className="section-row__actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => move(index, -1)}
                        disabled={isBusy || index === 0}
                        aria-label={`Subir «${section.title}»`}
                        title="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => move(index, 1)}
                        disabled={isBusy || index === sections.length - 1}
                        aria-label={`Bajar «${section.title}»`}
                        title="Bajar"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => startRename(section)}
                        disabled={isBusy}
                        aria-label={`Renombrar «${section.title}»`}
                        title="Renombrar"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        onClick={() => setToDelete(section)}
                        disabled={isBusy}
                        aria-label={`Eliminar «${section.title}»`}
                        title="Eliminar"
                      >
                        🗑
                      </button>
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      <form className="sections-manager__add" onSubmit={handleCreate}>
        <label htmlFor="new-section" className="visually-hidden">
          Nombre del nuevo apartado
        </label>
        <input
          id="new-section"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={atLimit ? 'Límite de apartados alcanzado' : 'Nuevo apartado…'}
          maxLength={100}
          disabled={atLimit || busy === 'create'}
        />
        <button
          type="submit"
          className="btn btn--primary btn--sm"
          disabled={atLimit || !newTitle.trim() || isBusy}
        >
          {busy === 'create' ? <Spinner size="sm" label="Agregando…" /> : 'Agregar'}
        </button>
      </form>

      {toDelete && (
        <ConfirmDialog
          title="Eliminar apartado"
          confirmLabel="Eliminar apartado"
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
        >
          <p>
            Se eliminará <strong>«{toDelete.title}»</strong> con todos sus parciales, publicaciones
            y archivos. <strong>Esta acción no se puede deshacer.</strong>
          </p>
        </ConfirmDialog>
      )}
    </section>
  )
}
