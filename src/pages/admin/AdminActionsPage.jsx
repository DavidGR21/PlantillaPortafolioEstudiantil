import { useState } from 'react'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { useAdminActions } from '../../hooks/useAdminActions.js'
import { ACTION_LABELS, ACTION_TONE, ACTIONS_BY_TYPE, describeAction } from '../../utils/audit.js'
import { formatDateTime } from '../../utils/format.js'

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todo' },
  { value: 'user', label: 'Usuarios' },
  { value: 'portfolio', label: 'Portafolios' },
]

/** /admin/bitacora: historial de acciones de los administradores. */
export default function AdminActionsPage() {
  const [targetType, setTargetType] = useState('all')
  const [action, setAction] = useState('all')
  const [search, setSearch] = useState('')
  const { actions, hasMore, isLoading, isFiltering, isLoadingMore, error, loadMore } = useAdminActions({
    targetType,
    action,
    search,
  })

  function changeType(value) {
    setTargetType(value)
    // Si la acción elegida no pertenece al nuevo tipo, se vuelve a «todas».
    if (action !== 'all' && !ACTIONS_BY_TYPE[value].includes(action)) setAction('all')
  }

  const hasFilters = targetType !== 'all' || action !== 'all' || search.trim()

  return (
    <section className="admin-section" aria-labelledby="actions-title">
      <header className="admin-section__header">
        <div>
          <h2 id="actions-title" className="admin-section__title">
            Bitácora
          </h2>
          <p className="text-muted">Registro de todas las acciones de los administradores. No se puede modificar.</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="segmented" role="group" aria-label="Filtrar por tipo">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`segmented__option${targetType === option.value ? ' segmented__option--active' : ''}`}
              aria-pressed={targetType === option.value}
              onClick={() => changeType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label htmlFor="action-filter" className="visually-hidden">
          Filtrar por acción
        </label>
        <select
          id="action-filter"
          className="admin-toolbar__select"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="all">Todas las acciones</option>
          {ACTIONS_BY_TYPE[targetType].map((value) => (
            <option key={value} value={value}>
              {ACTION_LABELS[value]}
            </option>
          ))}
        </select>

        <label htmlFor="action-search" className="visually-hidden">
          Buscar en la bitácora
        </label>
        <input
          id="action-search"
          type="search"
          className="admin-toolbar__search"
          placeholder="Buscar correo, portafolio, motivo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isFiltering && <Spinner size="sm" label="Filtrando…" />}
      </div>

      {isLoading ? (
        <div className="admin-loading">
          <Spinner label="Cargando bitácora…" />
        </div>
      ) : actions.length === 0 && !error ? (
        <p className="text-muted admin-empty">
          {hasFilters ? 'Ninguna acción coincide con el filtro.' : 'Todavía no hay acciones registradas.'}
        </p>
      ) : (
        <ol className="audit-list">
          {actions.map((entry) => {
            const { summary, details } = describeAction(entry)
            return (
              <li key={entry.id} className="audit-item">
                <div className="audit-item__head">
                  <span className={`badge badge--${ACTION_TONE[entry.action] ?? 'neutral'}`}>
                    {ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <time className="audit-item__time" dateTime={entry.createdAt}>
                    {formatDateTime(entry.createdAt)}
                  </time>
                </div>
                <p className="audit-item__summary">{summary}</p>
                {details.length > 0 && (
                  <ul className="audit-item__details">
                    {details.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                <p className="audit-item__by">
                  Por {entry.admin ? `${entry.admin.fullName} (${entry.admin.email})` : 'un administrador eliminado'}
                </p>
              </li>
            )
          })}
        </ol>
      )}

      {error && (
        <p className="alert alert--error" role="alert">
          No se pudo cargar la bitácora: {error.message}
        </p>
      )}

      {hasMore && (
        <div className="audit-more">
          <button type="button" className="btn btn--ghost" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? <Spinner size="sm" label="Cargando…" /> : 'Cargar más'}
          </button>
        </div>
      )}
    </section>
  )
}
