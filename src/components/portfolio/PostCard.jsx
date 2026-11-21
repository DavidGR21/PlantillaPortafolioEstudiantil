import { formatDate } from '../../utils/format.js'
import { FileList } from './FileList.jsx'

export function PostCard({ post }) {
  return (
    <article className="pf-post">
      <header className="pf-post__header">
        <h3 className="pf-post__title">{post.title}</h3>
        <time className="pf-post__date" dateTime={post.createdAt}>
          {formatDate(post.createdAt)}
        </time>
      </header>
      {post.description && <p className="pf-post__description">{post.description}</p>}
      <FileList files={post.files} />
    </article>
  )
}
