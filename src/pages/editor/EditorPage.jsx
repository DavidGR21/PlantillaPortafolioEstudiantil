import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../../components/layout/AppHeader.jsx'
import { SectionsManager } from '../../components/editor/SectionsManager.jsx'
import { SubsectionsManager } from '../../components/editor/SubsectionsManager.jsx'
import { PostsManager } from '../../components/editor/PostsManager.jsx'
import { FullPageLoader } from '../../components/ui/Spinner.jsx'
import { StatusMessage } from '../../components/ui/StatusMessage.jsx'
import { PortfolioSettingsModal } from '../../components/editor/PortfolioSettingsModal.jsx'
import { usePublicPortfolio } from '../../hooks/usePublicPortfolio.js'
import { themeToStyle } from '../../utils/theme.js'
import '../../components/editor/Editor.css'

/** Modo edición: /p/:slug/editar (solo el dueño). */
export default function EditorPage() {
  const { slug } = useParams()
  const { data, error, isLoading, reload } = usePublicPortfolio(slug)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedSubId, setSelectedSubId] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const navigate = useNavigate()

  async function handleSettingsSaved(updated) {
    setIsSettingsOpen(false)
    // Si cambió la dirección, el editor pasa a la nueva URL (y carga desde ahí).
    if (updated.slug !== slug) navigate(`/p/${updated.slug}/editar`, { replace: true })
    else await reload().catch(() => {})
  }

  if (isLoading) return <FullPageLoader label="Cargando editor…" />

  if (error) {
    return error.status === 404 ? (
      <StatusMessage code="404" title="Portafolio no encontrado" actionTo="/dashboard" actionLabel="Ir a mis portafolios" />
    ) : (
      <StatusMessage title="No se pudo cargar el editor" message={error.message} actionTo="/dashboard" actionLabel="Ir a mis portafolios" />
    )
  }

  const { portfolio, sections, viewer } = data

  // La API ya protege cada cambio; esto evita mostrar un editor inútil.
  if (!viewer.canEdit) {
    return (
      <StatusMessage
        code="403"
        title="Este portafolio no es tuyo"
        message="Solo su dueño puede editarlo. Inicia sesión con la cuenta correcta."
        actionTo={`/p/${portfolio.slug}`}
        actionLabel="Ver portafolio"
      />
    )
  }

  // Si lo seleccionado ya no existe (p. ej. se eliminó o se cambió de apartado), se usa el primero.
  const selected = sections.find((s) => s.id === selectedId) ?? sections[0] ?? null
  const selectedSub =
    selected?.subsections.find((s) => s.id === selectedSubId) ?? selected?.subsections[0] ?? null

  return (
    <>
      <AppHeader />
      <main className="page editor" style={themeToStyle(portfolio.theme)}>
        <header className="editor__header">
          <div>
            <p className="editor__eyebrow">Editando</p>
            <h1 className="editor__title">{portfolio.title}</h1>
          </div>
          <div className="editor__header-actions">
            <Link className="btn btn--ghost btn--sm" to="/dashboard">
              ← Mis portafolios
            </Link>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setIsSettingsOpen(true)}>
              ⚙ Configuración
            </button>
            <a className="btn btn--primary btn--sm" href={`/p/${portfolio.slug}`} target="_blank" rel="noreferrer">
              Ver portafolio ↗
            </a>
          </div>
        </header>

        {portfolio.status === 'blocked' && (
          <p className="alert alert--error editor__notice">
            Un administrador bloqueó este portafolio: puedes editarlo, pero no es visible públicamente.
          </p>
        )}

        <div className="editor__layout">
          <SectionsManager
            portfolioId={portfolio.id}
            sections={sections}
            selectedId={selected?.id}
            onSelect={setSelectedId}
            onChanged={reload}
          />

          <section className="editor-panel editor__detail" aria-live="polite">
            {selected ? (
              <>
                <header className="editor-panel__header">
                  <h2 className="editor-panel__title">{selected.title}</h2>
                  <a
                    className="editor__section-link"
                    href={`/p/${portfolio.slug}/${selected.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    /p/{portfolio.slug}/{selected.slug}
                  </a>
                </header>
                <SubsectionsManager
                  section={selected}
                  selectedId={selectedSub?.id}
                  onSelect={setSelectedSubId}
                  onChanged={reload}
                />

                {selectedSub && (
                  <PostsManager key={selectedSub.id} subsection={selectedSub} onChanged={reload} />
                )}
              </>
            ) : (
              <div className="editor__placeholder">
                Crea un apartado en el menú de la izquierda para empezar a organizar tu portafolio.
              </div>
            )}
          </section>
        </div>
      </main>

      {isSettingsOpen && (
        <PortfolioSettingsModal
          portfolio={portfolio}
          onSaved={handleSettingsSaved}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </>
  )
}
