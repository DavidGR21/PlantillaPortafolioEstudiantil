import { useState } from 'react'
import { BlockPortfolioModal } from '../../components/admin/BlockPortfolioModal.jsx'
import { DeletePortfolioModal } from '../../components/portfolio/DeletePortfolioModal.jsx'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { useAdminPortfolios } from '../../hooks/useAdminPortfolios.js'
import * as adminService from '../../services/adminService.js'
import { formatBytes, formatDate, pluralize } from '../../utils/format.js'

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Publicados' },
  { value: 'blocked', label: 'Bloqueados' },
]

/** /admin/portafolios: ver, bloquear, desbloquear y eliminar cualquier portafolio. */
export default function AdminPortfoliosPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const { portfolios, isLoading, isSearching, error, reload } = useAdminPortfolios(search, status)

  const [dialog, setDialog] = useState(null) // { type: 'block' | 'unblock' | 'delete', portfolio }
  const [notice, setNotice] = useState('')
  const close = () => setDialog(null)

  async function afterChange(message) {
    close()
    setNotice(message)
    await reload().catch(() => {})
  }

  async function handleBlock(reason) {
    await adminService.blockPortfolio(dialog.portfolio.id, reason)
    await afterChange(`Se bloqueó «${dialog.portfolio.title}».`)
  }

  async function handleUnblock() {
    await adminService.unblockPortfolio(dialog.portfolio.id)
    await afterChange(`Se desbloqueó «${dialog.portfolio.title}»: vuelve a ser público.`)
  }

  return (
    <section className="admin-section" aria-labelledby="portfolios-title">
      <header className="admin-section__header">
        <div>
          <h2 id="portfolios-title" className="admin-section__title">
            Portafolios
          </h2>
          <p className="text-muted">Revisa el contenido publicado y modera lo que no corresponda.</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <label htmlFor="portfolio-search" className="visually-hidden">
          Buscar portafolios
        </label>
        <input
          id="portfolio-search"
          type="search"
          className="admin-toolbar__search"
          placeholder="Buscar por título, dirección o estudiante…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="segmented" role="group" aria-label="Filtrar por estado">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`segmented__option${status === filter.value ? ' segmented__option--active' : ''}`}
              aria-pressed={status === filter.value}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        {isSearching && <Spinner size="sm" label="Buscando…" />}
      </div>

      {notice && (
        <p className="alert alert--success admin-notice" role="status">
          {notice}
          <button type="button" className="alert__close" onClick={() => setNotice('')} aria-label="Cerrar aviso">
            ×
          </button>
        </p>
      )}

      {isLoading ? (
        <div className="admin-loading">
          <Spinner label="Cargando portafolios…" />
        </div>
      ) : error ? (
        <p className="alert alert--error" role="alert">
          No se pudieron cargar los portafolios: {error.message}
        </p>
      ) : portfolios.length === 0 ? (
        <p className="text-muted admin-empty">
          {search.trim() || status !== 'all' ? 'Ningún portafolio coincide con el filtro.' : 'Aún no hay portafolios.'}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Portafolio</th>
                <th scope="col">Estudiante</th>
                <th scope="col">Estado</th>
                <th scope="col">Contenido</th>
                <th scope="col">Actualizado</th>
                <th scope="col">
                  <span className="visually-hidden">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {portfolios.map((p) => {
                const isBlocked = p.status === 'blocked'
                const hiddenByOwner = !p.owner.isActive
                return (
                  <tr key={p.id}>
                    <td data-label="Portafolio">
                      <div className="user-cell">
                        <strong>{p.title}</strong>
                        <a className="text-muted" href={`/p/${p.slug}`} target="_blank" rel="noreferrer">
                          /p/{p.slug}
                        </a>
                      </div>
                    </td>
                    <td data-label="Estudiante">
                      <div className="user-cell">
                        <span>{p.owner.fullName}</span>
                        <span className="text-muted">{p.owner.email}</span>
                      </div>
                    </td>
                    <td data-label="Estado">
                      <div className="status-cell">
                        <span className={`badge ${isBlocked ? 'badge--danger' : hiddenByOwner ? 'badge--neutral' : 'badge--success'}`}>
                          {isBlocked ? 'Bloqueado' : hiddenByOwner ? 'Oculto' : 'Publicado'}
                        </span>
                        {isBlocked && (
                          <span className="status-cell__reason" title={p.blockedReason}>
                            {p.blockedReason}
                            {p.blockedByName && ` · por ${p.blockedByName}, ${formatDate(p.blockedAt)}`}
                          </span>
                        )}
                        {!isBlocked && hiddenByOwner && (
                          <span className="status-cell__reason">El estudiante está desactivado</span>
                        )}
                      </div>
                    </td>
                    <td data-label="Contenido">
                      <span className="content-cell">
                        {pluralize(p.postsCount, 'publicación', 'publicaciones')} ·{' '}
                        {pluralize(p.filesCount, 'archivo', 'archivos')}
                        {p.filesCount > 0 && ` (${formatBytes(p.filesSize)})`}
                      </span>
                    </td>
                    <td data-label="Actualizado">{formatDate(p.updatedAt)}</td>
                    <td className="admin-table__actions">
                      <a className="btn btn--ghost btn--sm" href={`/p/${p.slug}`} target="_blank" rel="noreferrer">
                        Ver ↗
                      </a>
                      {isBlocked ? (
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDialog({ type: 'unblock', portfolio: p })}>
                          Desbloquear
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm btn--text-danger"
                          onClick={() => setDialog({ type: 'block', portfolio: p })}
                        >
                          Bloquear
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm btn--text-danger"
                        onClick={() => setDialog({ type: 'delete', portfolio: p })}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog?.type === 'block' && (
        <BlockPortfolioModal portfolio={dialog.portfolio} onSubmit={handleBlock} onClose={close} />
      )}
      {dialog?.type === 'unblock' && (
        <ConfirmDialog
          title="Desbloquear portafolio"
          confirmLabel="Desbloquear"
          busyLabel="Desbloqueando…"
          variant="primary"
          onConfirm={handleUnblock}
          onClose={close}
        >
          <p>
            <strong>{dialog.portfolio.title}</strong> volverá a ser visible públicamente. Motivo del bloqueo actual:{' '}
            <em>{dialog.portfolio.blockedReason}</em>
          </p>
        </ConfirmDialog>
      )}
      {dialog?.type === 'delete' && (
        <DeletePortfolioModal
          portfolio={dialog.portfolio}
          ownerName={dialog.portfolio.owner.fullName}
          onDelete={adminService.deletePortfolioAsAdmin}
          onClose={close}
          onDeleted={(p) => afterChange(`Se eliminó «${p.title}» de ${p.owner.fullName}.`)}
        />
      )}
    </section>
  )
}
