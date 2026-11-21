import { useId, useState } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { Spinner } from '../ui/Spinner.jsx'

/**
 * Lista ordenable y editable (apartados, parciales...): seleccionar, agregar,
 * renombrar, subir/bajar y eliminar con confirmación.
 *
 * Las operaciones (onCreate, onRename, onReorder, onDelete) llaman a la API;
 * después se ejecuta onChanged() (recargar datos) y se espera a que termine.
 */
export function EditableList({
  title,
  titleTag: TitleTag = 'h2',
  noun, // "apartado", "parcial"
  items,
  max,
  selectedId,
  onSelect,
  emptyText,
  addPlaceholder,
  deleteWarning, // (item) => texto/JSX del diálogo de eliminación
  onCreate,
  onRename,
  onReorder,
  onDelete,
  onChanged,
  className = '',
}) {
  const inputId = useId()
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(null) // 'create' | 'rename' | 'move'
  const [error, setError] = useState('')

  const atLimit = items.length >= max
  const isBusy = busy !== null

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

  function move(index, delta) {
    const ids = items.map((i) => i.id)
    const target = index + delta
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    run('move', () => onReorder(ids))
  }

  async function handleDelete() {
    // Si falla, ConfirmDialog muestra el error y sigue abierto.
    await onDelete(toDelete.id)
    setToDelete(null)
    onChanged().catch((err) => setError(err.message))
  }

  return (
    <div className={`editable-list ${className}`}>
      <header className="editor-panel__header">
        <TitleTag className="editor-panel__title">{title}</TitleTag>
        <span className="text-muted editor-panel__count">
          {items.length}/{max}
        </span>
      </header>

      {items.length === 0 ? (
        <p className="text-muted editable-list__empty">{emptyText}</p>
      ) : (
        <ol className="editable-list__items">
          {items.map((item, index) => {
            const isSelected = item.id === selectedId
            const isEditing = item.id === editingId

            return (
              <li key={item.id} className={`list-row${isSelected ? ' list-row--selected' : ''}`}>
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
                      className="list-row__select"
                      onClick={() => onSelect(item.id)}
                      aria-current={isSelected ? 'true' : undefined}
                    >
                      <span className="list-row__index">{index + 1}</span>
                      <span className="list-row__name">{item.title}</span>
                    </button>

                    <div className="list-row__actions">
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => move(index, -1)}
                        disabled={isBusy || index === 0}
                        aria-label={`Subir «${item.title}»`}
                        title="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => move(index, 1)}
                        disabled={isBusy || index === items.length - 1}
                        aria-label={`Bajar «${item.title}»`}
                        title="Bajar"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => startRename(item)}
                        disabled={isBusy}
                        aria-label={`Renombrar «${item.title}»`}
                        title="Renombrar"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        onClick={() => setToDelete(item)}
                        disabled={isBusy}
                        aria-label={`Eliminar «${item.title}»`}
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
        <button type="submit" className="btn btn--primary btn--sm" disabled={atLimit || !newTitle.trim() || isBusy}>
          {busy === 'create' ? <Spinner size="sm" label="Agregando…" /> : 'Agregar'}
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
