import { useId, useState } from 'react'
import { ArrowDown, ArrowUp, Check, GripVertical, LoaderCircle, Pencil, Plus, Trash2, X } from 'lucide-react'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { useEditorBusy } from './busyContext.js'
import { SortableList } from './SortableList.jsx'

/**
 * Lista vertical editable y reordenable (apartados del menú): seleccionar,
 * agregar, renombrar, arrastrar o mover con flechas, y eliminar con confirmación.
 *
 * onCreate / onRename / onReorder / onDelete llaman a la API; después se
 * ejecuta onChanged() (recargar) y se espera a que termine. Reordenar bloquea
 * el editor con una pantalla de carga hasta que el orden queda guardado.
 */
export function EditableList({
  title,
  titleTag: TitleTag = 'h2',
  noun,
  items,
  max,
  selectedId,
  onSelect,
  emptyText,
  addPlaceholder,
  deleteWarning,
  onCreate,
  onRename,
  onReorder,
  onDelete,
  onChanged,
  className = '',
}) {
  const inputId = useId()
  const { runBlocking } = useEditorBusy()
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(null) // 'create' | 'rename'
  const [error, setError] = useState('')

  const atLimit = items.length >= max

  async function run(kind, action) {
    setError('')
    setBusy(kind)
    try {
      const result = await action()
      await onChanged()
      return result ?? true
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setBusy(null)
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    const value = newTitle.trim()
    if (!value) return
    const created = await run('create', () => onCreate(value))
    if (created) {
      setNewTitle('')
      if (created.id) onSelect(created.id)
    }
  }

  function startRename(item) {
    setError('')
    setEditingId(item.id)
    setEditTitle(item.title)
  }

  async function handleRename(event) {
    event.preventDefault()
    const value = editTitle.trim()
    const original = items.find((i) => i.id === editingId)
    if (!value || value === original?.title) {
      setEditingId(null)
      return
    }
    if (await run('rename', () => onRename(editingId, value))) setEditingId(null)
  }

  /** Guarda el orden bloqueando el editor; si falla, muestra el error. */
  async function reorder(ids) {
    setError('')
    try {
      await runBlocking('Guardando el nuevo orden…', async () => {
        await onReorder(ids)
        await onChanged()
      })
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function handleDelete() {
    await onDelete(toDelete.id)
    setToDelete(null)
    onChanged().catch((err) => setError(err.message))
  }

  return (
    <div className={`editable-list ${className}`}>
      <header className="editable-list__header">
        <TitleTag className="editable-list__title">{title}</TitleTag>
        <span className="editable-list__count">
          {items.length}/{max}
        </span>
      </header>

      {items.length === 0 ? (
        <p className="editable-list__empty">{emptyText}</p>
      ) : (
        <SortableList
          items={items}
          onReorder={reorder}
          className="editable-list__items"
          renderItem={(item, { handle, index, isDragging, move, count }) => {
            const isSelected = item.id === selectedId
            const isEditing = item.id === editingId
            return (
              <div className={`list-row${isSelected ? ' list-row--selected' : ''}${isDragging ? ' list-row--dragging' : ''}`}>
                <button type="button" className="drag-handle" {...handle} aria-label={`Arrastrar «${item.title}» para reordenar`} title="Arrastrar para reordenar">
                  <GripVertical size={16} aria-hidden="true" />
                </button>

                {isEditing ? (
                  <form className="list-row__rename" onSubmit={handleRename}>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Escape' && setEditingId(null)}
                      maxLength={100}
                      aria-label={`Nuevo nombre del ${noun}`}
                      autoFocus
                      disabled={busy === 'rename'}
                    />
                    <button type="submit" className="icon-btn icon-btn--primary" disabled={busy === 'rename'} aria-label="Guardar nombre" title="Guardar">
                      {busy === 'rename' ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                    </button>
                    <button type="button" className="icon-btn" onClick={() => setEditingId(null)} disabled={busy === 'rename'} aria-label="Cancelar" title="Cancelar">
                      <X size={16} />
                    </button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      className="list-row__select"
                      onClick={() => onSelect(item.id)}
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      <span className="list-row__index">{index + 1}</span>
                      <span className="list-row__name">{item.title}</span>
                    </button>

                    <div className="list-row__actions">
                      <button type="button" className="icon-btn" onClick={() => move(-1).catch(() => {})} disabled={index === 0} aria-label={`Subir «${item.title}»`} title="Subir">
                        <ArrowUp size={15} />
                      </button>
                      <button type="button" className="icon-btn" onClick={() => move(1).catch(() => {})} disabled={index === count - 1} aria-label={`Bajar «${item.title}»`} title="Bajar">
                        <ArrowDown size={15} />
                      </button>
                      <button type="button" className="icon-btn" onClick={() => startRename(item)} aria-label={`Renombrar «${item.title}»`} title="Renombrar">
                        <Pencil size={15} />
                      </button>
                      <button type="button" className="icon-btn icon-btn--danger" onClick={() => setToDelete(item)} aria-label={`Eliminar «${item.title}»`} title="Eliminar">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          }}
        />
      )}

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      <form className="editable-list__add" onSubmit={handleCreate}>
        <label htmlFor={inputId} className="visually-hidden">
          Nombre del nuevo {noun}
        </label>
        <input
          id={inputId}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder={atLimit ? `Límite de ${noun}s alcanzado` : addPlaceholder}
          maxLength={100}
          disabled={atLimit || busy === 'create'}
        />
        <button
          type="submit"
          className="btn btn--primary btn--icon"
          disabled={atLimit || !newTitle.trim() || busy !== null}
          aria-label={`Agregar ${noun}`}
          title={`Agregar ${noun}`}
        >
          {busy === 'create' ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}
        </button>
      </form>

      {toDelete && (
        <ConfirmDialog
          title={`Eliminar ${noun}`}
          confirmLabel={`Eliminar ${noun}`}
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
        >
          <p>{deleteWarning(toDelete)}</p>
        </ConfirmDialog>
      )}
    </div>
  )
}
