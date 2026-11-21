import { Link } from 'react-router-dom'
import './StatusMessage.css'

/** Pantalla simple para 404, 403, etc. */
export function StatusMessage({ code, title, message, actionTo = '/', actionLabel = 'Ir al inicio' }) {
  return (
    <main className="status-message">
      {code && <p className="status-message__code">{code}</p>}
      <h1 className="status-message__title">{title}</h1>
      {message && <p className="status-message__text">{message}</p>}
      <Link className="btn btn--primary" to={actionTo}>
        {actionLabel}
      </Link>
    </main>
  )
}
