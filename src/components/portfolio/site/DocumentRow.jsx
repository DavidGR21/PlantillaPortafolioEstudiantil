import { CalendarDays, Paperclip } from 'lucide-react'
import { DocumentViewer } from '../viewer/DocumentViewer.jsx'
import { formatDate, pluralize } from '../../../utils/format.js'

/**
 * Bloque de una publicación: visor de documentos a un lado y título,
 * fecha y descripción al otro (como las páginas de Google Sites, pero más cuidado).
 */
export function DocumentRow({ post, index }) {
  const hasFiles = post.files.length > 0
  const number = String(index + 1).padStart(2, '0')

  return (
    <article className={`doc-row${index % 2 === 1 ? ' doc-row--alt' : ''}${hasFiles ? '' : ' doc-row--text'}`} aria-labelledby={`post-${post.id}`}>
      <div className="doc-row__inner">
        <div className="doc-row__info">
          <p className="doc-row__number">Publicación {number}</p>
          <h2 id={`post-${post.id}`} className="doc-row__title">
            {post.title}
          </h2>
          <p className="doc-row__meta">
            <span>
              <CalendarDays size={14} aria-hidden="true" />
              {formatDate(post.createdAt)}
            </span>
            {hasFiles && (
              <span>
                <Paperclip size={14} aria-hidden="true" />
                {pluralize(post.files.length, 'archivo', 'archivos')}
              </span>
            )}
          </p>
          {post.description && <p className="doc-row__description">{post.description}</p>}
        </div>

        {hasFiles && (
          <div className="doc-row__viewer">
            <DocumentViewer files={post.files} />
          </div>
        )}
      </div>
    </article>
  )
}
