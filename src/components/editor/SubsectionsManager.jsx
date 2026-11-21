import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, GripVertical, LoaderCircle, Pencil, Plus, Trash2, X } from 'lucide-react'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { useEditorBusy } from './busyContext.js'
import { SortableList } from './SortableList.jsx'
import * as contentService from '../../services/contentService.js'
import { pluralize } from '../../utils/format.js'

const MAX_SUBSECTIONS = 20

/**
 * Parciales de un apartado como pestañas: se seleccionan con un clic, se
 * reordenan arrastrándolas (o con las flechas de la barra) y se crean con «+ Parcial».
 */
export function SubsectionsManager({ section, selectedId, onSelect, onChanged }) {
  const subsections = section.subsections
  const { runBlocking } = useEditorBusy()
  const [isAdding, setIsAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameTitle, setRenameTitle] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(null) // 'create' | 'rename'
  const [error, setError] = useState('')

  const selectedIndex = subsections.findIndex((s) => s.id === selectedId)
  const selected = subsections[selectedIndex] ?? null
  const atLimit = subsections.length >= MAX_SUBSECTIONS

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

  async function reorder(ids) {
    setError('')
    try {
      await runBlocking('Guardando el nuevo orden…', async () => {
        await contentService.reorderSubsections(section.id, ids)
        await onChanged()
      })
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function handleCreate(event) {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    const created = await run('create', () => contentService.createSubsection(section.id, title))
    if (created) {
      setNewTitle('')
      setIsAdding(false)
      onSelect(created.id)
    }
  }

  async function handleRename(event) {
    event.preventDefault()
    const title = renameTitle.trim()
    if (!title || title === selected.title) {
      setIsRenaming(false)
      return
    }
    if (await run('rename', () => contentService.renameSubsection(selected.id, title))) setIsRenaming(false)
  }

  function moveSelected(delta) {
    const ids = subsections.map((s) => s.id)
    const target = selectedIndex + delta
    ;[ids[selectedIndex], ids[target]] = [ids[target], ids[selectedIndex]]
    reorder(ids).catch(() => {})
  }

  async function handleDelete() {
    await contentService.deleteSubsection(toDelete.id)
    setToDelete(null)
    onChanged().catch((err) => setError(err.message))
  }

  return (
    <div className="sub-tabs">
      <div className="sub-tabs__bar">
        {subsections.length > 0 && (
          <SortableList
            items={subsections}
            onReorder={reorder}
            direction="horizontal"
            as="ul"
            className="sub-tabs__list"
            renderItem={(sub, { handle, isDragging }) => {
              const active = sub.id === selectedId
              return (
                <div className={`sub-tab${active ? ' sub-tab--active' : ''}${isDragging ? ' sub-tab--dragging' : ''}`}>
                  <button type="button" className="sub-tab__grip" {...handle} aria-label={`Arrastrar «${sub.title}» para reordenar`} title="Arrastrar para reordenar">
                    <GripVertical size={14} aria-hidden="true" />
                  </button>
                  <button type="button" className="sub-tab__label" onClick={() => onSelect(sub.id)} aria-current={active ? 'true' : undefined}>
                    {sub.title}
                    <span className="sub-tab__count" aria-label={pluralize(sub.posts.length, 'publicación', 'publicaciones')}>
                      {sub.posts.length}
                    </span>
                  </button>
                </div>
              )
            }}
          />
        )}

        {isAdding ? (
          <form className="sub-tabs__add-form" onSubmit={handleCreate}>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setIsAdding(false)}
              placeholder={`Ej. Parcial ${subsections.length + 1}`}
              maxLength={100}
              aria-label="Nombre del nuevo parcial"
              autoFocus
              disabled={busy === 'create'}
            />
            <button type="submit" className="icon-btn icon-btn--primary" disabled={!newTitle.trim() || busy === 'create'} aria-label="Crear parcial" title="Crear">
              {busy === 'create' ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
            </button>
            <button type="button" className="icon-btn" onClick={() => setIsAdding(false)} aria-label="Cancelar" title="Cancelar">
              <X size={16} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="sub-tabs__add"
            onClick={() => {
              setError('')
              setIsAdding(true)
            }}
            disabled={atLimit}
            title={atLimit ? `Máximo ${MAX_SUBSECTIONS} parciales` : 'Agregar un parcial'}
          >
            <Plus size={16} aria-hidden="true" />
            Parcial
          </button>
        )}
      </div>

      {/* Barra del parcial seleccionado */}
      {selected && (
        <div className="sub-tabs__toolbar">
          {isRenaming ? (
            <form className="sub-tabs__rename" onSubmit={handleRename}>
              <input
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Escape' && setIsRenaming(false)}
                maxLength={100}
                aria-label="Nuevo nombre del parcial"
                autoFocus
                disabled={busy === 'rename'}
              />
              <button type="submit" className="icon-btn icon-btn--primary" disabled={busy === 'rename'} aria-label="Guardar nombre" title="Guardar">
                {busy === 'rename' ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
              </button>
              <button type="button" className="icon-btn" onClick={() => setIsRenaming(false)} aria-label="Cancelar" title="Cancelar">
                <X size={16} />
              </button>
            </form>
          ) : (
            <span className="sub-tabs__toolbar-label">
              Parcial seleccionado: <strong>{selected.title}</strong>
            </span>
          )}
          <div className="sub-tabs__toolbar-actions">
            <button type="button" className="icon-btn" onClick={() => moveSelected(-1)} disabled={selectedIndex <= 0} aria-label="Mover a la izquierda" title="Mover a la izquierda">
              <ArrowLeft size={15} />
            </button>
            <button type="button" className="icon-btn" onClick={() => moveSelected(1)} disabled={selectedIndex >= subsections.length - 1} aria-label="Mover a la derecha" title="Mover a la derecha">
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setRenameTitle(selected.title)
                setIsRenaming(true)
              }}
              aria-label={`Renombrar «${selected.title}»`}
              title="Renombrar"
            >
              <Pencil size={15} />
            </button>
            <button type="button" className="icon-btn icon-btn--danger" onClick={() => setToDelete(selected)} aria-label={`Eliminar «${selected.title}»`} title="Eliminar parcial">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      {toDelete && (
        <ConfirmDialog title="Eliminar parcial" confirmLabel="Eliminar parcial" onConfirm={handleDelete} onClose={() => setToDelete(null)}>
          <p>
            Se eliminará <strong>«{toDelete.title}»</strong> con{' '}
            {pluralize(toDelete.posts?.length ?? 0, 'publicación', 'publicaciones')} y sus archivos.{' '}
            <strong>Esta acción no se puede deshacer.</strong>
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}
