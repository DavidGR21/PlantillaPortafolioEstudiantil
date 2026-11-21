import { useState } from 'react'
import { CircleAlert, CircleCheck, FolderOpen, Plus, RefreshCw, X } from 'lucide-react'
import { AppHeader } from '../../components/layout/AppHeader.jsx'
import { DeletePortfolioModal } from '../../components/portfolio/DeletePortfolioModal.jsx'
import { useAuth } from '../../hooks/useAuth.js'
import { useMyPortfolios } from '../../hooks/useMyPortfolios.js'
import { CreatePortfolioModal } from './CreatePortfolioModal.jsx'
import { PortfolioCard } from './PortfolioCard.jsx'
import folderIllustration from '../../assets/illustrations/folder-documents.svg'
import './DashboardPage.css'

/** Medidor de uso: «2 de 3 portafolios» con segmentos (o barra si el límite es alto). */
function UsageMeter({ count, limit }) {
  const segmented = limit <= 8
  return (
    <div className="usage" aria-label={`${count} de ${limit} portafolios usados`}>
      <span className="usage__text">
        <strong>{count}</strong> de {limit} portafolios
      </span>
      {segmented ? (
        <span className="usage__segments" aria-hidden="true">
          {Array.from({ length: limit }, (_, i) => (
            <span key={i} className={`usage__segment${i < count ? ' usage__segment--used' : ''}`} />
          ))}
        </span>
      ) : (
        <span className="usage__bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (count / limit) * 100)}%` }} />
        </span>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { portfolios, count, limit, isLoading, error, reload } = useMyPortfolios()
  const [isCreating, setIsCreating] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [notice, setNotice] = useState('')

  const atLimit = count >= limit
  const firstName = user.fullName.trim().split(/\s+/)[0]

  function openCreate() {
    setNotice('')
    setIsCreating(true)
  }

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
      <main className="dash">
        <header className="dash__header">
          <div>
            <p className="dash__greeting">Hola, {firstName}</p>
            <h1 className="dash__title">Mis portafolios</h1>
            <p className="dash__lead">Crea, edita y comparte tus portafolios académicos.</p>
          </div>

          {!isLoading && !error && limit > 0 && (
            <div className="dash__header-side">
              <UsageMeter count={count} limit={limit} />
              <button
                type="button"
                className="btn btn--primary dash__new"
                onClick={openCreate}
                disabled={atLimit}
                title={atLimit ? 'Alcanzaste el máximo de portafolios' : undefined}
              >
                <Plus size={18} aria-hidden="true" />
                Nuevo portafolio
              </button>
            </div>
          )}
        </header>

        {notice && (
          <p className="dash__notice" role="status">
            <CircleCheck size={18} aria-hidden="true" />
            <span>{notice}</span>
            <button type="button" className="dash__notice-close" onClick={() => setNotice('')} aria-label="Cerrar aviso">
              <X size={16} />
            </button>
          </p>
        )}

        {/* Cargando: tarjetas esqueleto con la misma forma */}
        {isLoading && (
          <div className="dash__grid" aria-busy="true">
            <span className="visually-hidden" role="status">
              Cargando portafolios…
            </span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="pcard pcard--skeleton" aria-hidden="true">
                <div className="pcard__cover" />
                <div className="pcard__body">
                  <span className="sk sk--title" />
                  <span className="sk sk--text" />
                  <span className="sk sk--link" />
                  <span className="sk sk--stats" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="dash__state dash__state--error" role="alert">
            <CircleAlert size={28} aria-hidden="true" />
            <h2>No se pudieron cargar tus portafolios</h2>
            <p>{error.message}</p>
            <button type="button" className="btn btn--ghost" onClick={reload}>
              <RefreshCw size={17} aria-hidden="true" />
              Reintentar
            </button>
          </div>
        )}

        {!isLoading && !error && limit === 0 && portfolios.length === 0 && (
          <div className="dash__state">
            <FolderOpen size={32} aria-hidden="true" />
            <h2>Tu cuenta no tiene portafolios habilitados</h2>
            <p>
              {user.role === 'admin'
                ? 'Tu límite de portafolios es 0. Puedes aumentarlo desde la gestión de usuarios.'
                : 'Si necesitas uno, pídeselo al administrador.'}
            </p>
          </div>
        )}

        {!isLoading && !error && limit > 0 && portfolios.length === 0 && (
          <div className="dash__empty">
            <img src={folderIllustration} alt="" width="420" height="340" />
            <div>
              <h2>Aún no tienes portafolios</h2>
              <p>
                Crea tu primer portafolio para publicar tus trabajos académicos organizados por
                materias y parciales. Puedes tener hasta {limit}.
              </p>
              <button type="button" className="btn btn--primary" onClick={openCreate}>
                <Plus size={18} aria-hidden="true" />
                Crear mi primer portafolio
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && portfolios.length > 0 && (
          <div className="dash__grid">
            {portfolios.map((portfolio) => (
              <PortfolioCard key={portfolio.id} portfolio={portfolio} onDelete={setToDelete} />
            ))}

            {/* Casilla para crear otro (si queda espacio) */}
            {!atLimit ? (
              <button type="button" className="dash__add" onClick={openCreate}>
                <span className="dash__add-icon" aria-hidden="true">
                  <Plus size={26} />
                </span>
                <span className="dash__add-title">Crear portafolio</span>
                <span className="dash__add-text">
                  Te queda{limit - count === 1 ? '' : 'n'} {limit - count} de {limit}
                </span>
              </button>
            ) : (
              <div className="dash__add dash__add--full">
                <span className="dash__add-icon" aria-hidden="true">
                  <CircleCheck size={26} />
                </span>
                <span className="dash__add-title">Límite alcanzado</span>
                <span className="dash__add-text">Elimina un portafolio para crear otro.</span>
              </div>
            )}
          </div>
        )}
      </main>

      {isCreating && <CreatePortfolioModal onClose={() => setIsCreating(false)} onCreated={handleCreated} />}
      {toDelete && (
        <DeletePortfolioModal portfolio={toDelete} onClose={() => setToDelete(null)} onDeleted={handleDeleted} />
      )}
    </>
  )
}
