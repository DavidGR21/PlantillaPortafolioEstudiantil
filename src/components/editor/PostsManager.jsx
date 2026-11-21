import { useState } from 'react'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { PostFormModal } from './PostFormModal.jsx'
import * as contentService from '../../services/contentService.js'
import { formatDate, pluralize } from '../../utils/format.js'

const MAX_POSTS = 100

/** Publicaciones de un parcial: crear, editar, mover y eliminar. */
export function PostsManager({ subsection, onChanged }) {
  const { posts } = subsection
  const [form, setForm] = useState(null) // null | { post: null } (crear) | { post } (editar)
  const [toDelete, setToDelete] = useState(null)
  const [isMoving, setIsMoving] = useState(false)
  const [error, setError] = useState('')

  const atLimit = posts.length >= MAX_POSTS

  async function handleSubmit(data) {
    if (form.post) {
      // Solo se envía lo que cambió.
      const changes = {}
      if (data.title !== form.post.title) changes.title = data.title
      if (data.description !== (form.post.description ?? '')) changes.description = data.description
      await contentService.updatePost(form.post.id, changes)
    } else {
      await contentService.createPost(subsection.id, data)
    }
    setForm(null)
    onChanged().catch((err) => setError(err.message))
  }

  async function move(index, delta) {
    const ids = posts.map((p) => p.id)
    const target = index + delta
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    setError('')
    setIsMoving(true)
    try {
      await contentService.reorderPosts(subsection.id, ids)
      await onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setIsMoving(false)
    }
  }

  async function handleDelete() {
    await contentService.deletePost(toDelete.id)
    setToDelete(null)
    onChanged().catch((err) => setError(err.message))
  }

  return (
    <div className="posts-manager">
      <header className="editor-panel__header">
        <h3 className="editor-panel__title">Publicaciones de {subsection.title}</h3>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => {
            setError('')
            setForm({ post: null })
          }}
          disabled={atLimit}
          title={atLimit ? `Máximo ${MAX_POSTS} publicaciones por parcial` : undefined}
        >
          + Nueva publicación
        </button>
      </header>

      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}

      {posts.length === 0 ? (
        <div className="editor__placeholder">
          Aún no hay publicaciones en {subsection.title}. Crea la primera con «Nueva publicación».
        </div>
      ) : (
        <ol className="post-list">
          {posts.map((post, index) => (
            <li key={post.id} className="post-item">
              <div className="post-item__body">
                <h4 className="post-item__title">{post.title}</h4>
                {post.description && <p className="post-item__description">{post.description}</p>}
                <p className="post-item__meta">
                  {pluralize(post.files.length, 'archivo', 'archivos')} · {formatDate(post.createdAt)}
                </p>
              </div>

              <div className="post-item__actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => move(index, -1)}
                  disabled={isMoving || index === 0}
                  aria-label={`Subir «${post.title}»`}
                  title="Subir"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => move(index, 1)}
                  disabled={isMoving || index === posts.length - 1}
                  aria-label={`Bajar «${post.title}»`}
                  title="Bajar"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    setError('')
                    setForm({ post })
                  }}
                  disabled={isMoving}
                  aria-label={`Editar «${post.title}»`}
                  title="Editar"
                >
                  ✎
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => setToDelete(post)}
                  disabled={isMoving}
                  aria-label={`Eliminar «${post.title}»`}
                  title="Eliminar"
                >
                  🗑
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {form && (
        <PostFormModal
          post={form.post}
          subsectionTitle={subsection.title}
          onSubmit={handleSubmit}
          onClose={() => setForm(null)}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Eliminar publicación"
          confirmLabel="Eliminar publicación"
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
        >
          <p>
            Se eliminará <strong>«{toDelete.title}»</strong>
            {toDelete.files.length > 0 &&
              ` con ${pluralize(toDelete.files.length, 'archivo', 'archivos')}`}
            . <strong>Esta acción no se puede deshacer.</strong>
          </p>
        </ConfirmDialog>
      )}
    </div>
  )
}
