import { useState } from 'react'
import { AppHeader } from '../../components/layout/AppHeader.jsx'
import { Spinner } from '../../components/ui/Spinner.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useMyPortfolios } from '../../hooks/useMyPortfolios.js'
import { CreatePortfolioModal } from './CreatePortfolioModal.jsx'
import { DeletePortfolioModal } from './DeletePortfolioModal.jsx'
import { PortfolioCard } from './PortfolioCard.jsx'
import './DashboardPage.css'

export default function DashboardPage() {
  const { user } = useAuth()
  const { portfolios, count, limit, isLoading, error, reload } = useMyPortfolios()
  const [isCreating, setIsCreating] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [notice, setNotice] = useState('')

  const atLimit = count >= limit

  function handleCreated(portfolio) {
    setIsCreating(false)
    setNotice(`Se creó «${portfolio.title}». Ya puedes empezar a editarlo.`)
    reload()
  }

  function handleDeleted(portfolio) {
    setToDelete(null)
    setNotice(`Se eliminó «${portfolio.title}».`)
    reload()
  }

  return (
    <>
      <AppHeader />
      <main className="page dashboard">
        <header className="dashboard__header">
          <div>
            <h1 className="dashboard__title">Mis portafolios</h1>
            <p className="text-muted">Hola, {user.fullName}.</p>
          </div>

          {!isLoading && !error && limit > 0 && (
            <div className="dashboard__create">
              <span className="dashboard__counter" aria-label={`${count} de ${limit} portafolios usados`}>
                {count} de {limit}
              </span>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  setNotice('')
                  setIsCreating(true)
                }}
                disabled={atLimit}
                title={atLimit ? 'Alcanzaste el máximo de portafolios' : undefined}
              >
                + Nuevo portafolio
              </button>
            </div>
          )}
        </header>

        {notice && (
          <p className="alert alert--success dashboard__notice" role="status">
            {notice}
            <button type="button" className="alert__close" onClick={() => setNotice('')} aria-label="Cerrar aviso">
              ×
            </button>
          </p>
        )}

        {isLoading && (
          <div className="dashboard__loading">
            <Spinner label="Cargando portafolios…" />
          </div>
        )}

        {error && (
          <div className="alert alert--error dashboard__error" role="alert">
            <span>No se pudieron cargar tus portafolios: {error.message}</span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
              Reintentar
            </button>
          </div>
        )}

        {!isLoading && !error && limit === 0 && portfolios.length === 0 && (
          <div className="empty-state">
            <h2>Tu cuenta no tiene portafolios habilitados</h2>
            <p className="text-muted">
              {user.role === 'admin'
                ? 'Tu límite de portafolios es 0. Puedes aumentarlo desde la gestión de usuarios.'
                : 'Si necesitas uno, pídeselo al administrador.'}
            </p>
          </div>
        )}

        {!isLoading && !error && limit > 0 && portfolios.length === 0 && (
          <div className="empty-state">
            <h2>Aún no tienes portafolios</h2>
            <p className="text-muted">
              Crea tu primer portafolio para publicar tus trabajos académicos. Puedes tener hasta{' '}
              {limit}.
            </p>
            <button type="button" className="btn btn--primary" onClick={() => setIsCreating(true)}>
              Crear mi primer portafolio
            </button>
          </div>
        )}

        {portfolios.length > 0 && (
          <>
            {atLimit && (
              <p className="text-muted dashboard__limit-note">
                Alcanzaste el máximo de {limit} portafolios. Elimina uno para crear otro.
              </p>
            )}
            <div className="dashboard__grid">
              {portfolios.map((portfolio) => (
                <PortfolioCard key={portfolio.id} portfolio={portfolio} onDelete={setToDelete} />
              ))}
            </div>
          </>
        )}
      </main>

      {isCreating && (
        <CreatePortfolioModal onClose={() => setIsCreating(false)} onCreated={handleCreated} />
      )}
      {toDelete && (
        <DeletePortfolioModal
          portfolio={toDelete}
          onClose={() => setToDelete(null)}
          onDeleted={handleDeleted}
        />
      )}
    </>
  )
}
