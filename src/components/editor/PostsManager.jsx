import { useState } from 'react'
import { ArrowDown, ArrowUp, CalendarDays, GripVertical, Paperclip, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { useEditorBusy } from './busyContext.js'
import { PostComposer } from './PostComposer.jsx'
import { PostFiles } from './PostFiles.jsx'
import { PostFormModal } from './PostFormModal.jsx'
import { SortableList } from './SortableList.jsx'
import * as contentService from '../../services/contentService.js'
import { formatDate, pluralize } from '../../utils/format.js'

const MAX_POSTS = 100

/** Publicaciones de un parcial: crear (con archivos), editar, reordenar y eliminar. */
export function PostsManager({ subsection, onChanged }) {
  const { posts } = subsection
  const { runBlocking } = useEditorBusy()
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function reorder(ids) {
    setError('')
    try {
      await runBlocking('Guardando el nuevo orden…', async () => {
        await contentService.reorderPosts(subsection.id, ids)
        await onChanged()
      })
    } catch (err) {
      setError(err.message)
      throw err
    }
  }

  async function handlePublished(post, failures) {
    setNotice(failures === 0 ? `Se publicó «${post.title}».` : '')
    await onChanged()
  }

  async function handleEdit(data) {
    const changes = {}
    if (data.title !== editing.title) changes.title = data.title
    if (data.description !== (editing.description ?? '')) changes.description = data.description
    await contentService.updatePost(editing.id, changes)
    setEditing(null)
    onChanged().catch((err) => setError(err.message))
  }

  async function handleDelete() {
    await contentService.deletePost(toDelete.id)
    setToDelete(null)
    onChanged().catch((err) => setError(err.message))
  }

  return (
    <section className="posts" aria-labelledby="posts-title">
      <header className="posts__header">
        <h3 id="posts-title" className="posts__title">
          Publicaciones
        </h3>
        <span className="posts__count">{pluralize(posts.length, 'publicación', 'publicaciones')}</span>
      </header>

      {notice && (
        <p className="alert alert--success posts__notice" role="status">
          {notice}
        </p>
      )}

      {posts.length < MAX_POSTS && (
        <PostComposer
          key={subsection.id}
          subsection={subsection}
          startOpen={posts.length === 0}
          onPublished={handlePublished}
        />
      )}

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      {posts.length > 0 && (
        <SortableList
          items={posts}
          onReorder={reorder}
          className="post-list"
          renderItem={(post, { handle, index, isDragging, move, count }) => (
            <article className={`post-card${isDragging ? ' post-card--dragging' : ''}`}>
              <div className="post-card__head">
                <button type="button" className="drag-handle" {...handle} aria-label={`Arrastrar «${post.title}» para reordenar`} title="Arrastrar para reordenar">
                  <GripVertical size={16} aria-hidden="true" />
                </button>
                <div className="post-card__main">
                  <h4 className="post-card__title">{post.title}</h4>
                  <p className="post-card__meta">
                    <span>
                      <CalendarDays size={13} aria-hidden="true" />
                      {formatDate(post.createdAt)}
                    </span>
                    <span>
                      <Paperclip size={13} aria-hidden="true" />
                      {pluralize(post.files.length, 'archivo', 'archivos')}
                    </span>
                  </p>
                </div>
                <div className="post-card__actions">
                  <button type="button" className="icon-btn" onClick={() => move(-1).catch(() => {})} disabled={index === 0} aria-label={`Subir «${post.title}»`} title="Subir">
                    <ArrowUp size={15} />
                  </button>
                  <button type="button" className="icon-btn" onClick={() => move(1).catch(() => {})} disabled={index === count - 1} aria-label={`Bajar «${post.title}»`} title="Bajar">
                    <ArrowDown size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => {
                      setError('')
                      setEditing(post)
                    }}
                    aria-label={`Editar «${post.title}»`}
                    title="Editar título y descripción"
                  >
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="icon-btn icon-btn--danger" onClick={() => setToDelete(post)} aria-label={`Eliminar «${post.title}»`} title="Eliminar publicación">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {post.description && <p className="post-card__description">{post.description}</p>}

              <PostFiles post={post} onChanged={onChanged} />
            </article>
          )}
        />
      )}

      {editing && (
        <PostFormModal post={editing} subsectionTitle={subsection.title} onSubmit={handleEdit} onClose={() => setEditing(null)} />
      )}

      {toDelete && (
        <ConfirmDialog title="Eliminar publicación" confirmLabel="Eliminar publicación" onConfirm={handleDelete} onClose={() => setToDelete(null)}>
          <p>
            Se eliminará <strong>«{toDelete.title}»</strong>
            {toDelete.files.length > 0 && ` con ${pluralize(toDelete.files.length, 'archivo', 'archivos')}`}.{' '}
            <strong>Esta acción no se puede deshacer.</strong>
          </p>
        </ConfirmDialog>
      )}
    </section>
  )
}
