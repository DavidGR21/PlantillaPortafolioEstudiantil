import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, ExternalLink, FolderPlus, Layers, Settings, ShieldAlert } from 'lucide-react'
import { AppHeader } from '../../components/layout/AppHeader.jsx'
import { EditorBusyProvider } from '../../components/editor/EditorBusy.jsx'
import { PortfolioSettingsModal } from '../../components/editor/PortfolioSettingsModal.jsx'
import { PostsManager } from '../../components/editor/PostsManager.jsx'
import { SectionsManager } from '../../components/editor/SectionsManager.jsx'
import { SubsectionsManager } from '../../components/editor/SubsectionsManager.jsx'
import { FullPageLoader } from '../../components/ui/Spinner.jsx'
import { StatusMessage } from '../../components/ui/StatusMessage.jsx'
import { usePublicPortfolio } from '../../hooks/usePublicPortfolio.js'
import { pluralize } from '../../utils/format.js'
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
  const postsInSection = selected?.subsections.reduce((n, s) => n + s.posts.length, 0) ?? 0

  return (
    <>
      <AppHeader />
      <EditorBusyProvider>
        <main className="editor" style={themeToStyle(portfolio.theme)}>
          {/* ---------- Encabezado ---------- */}
          <header className="editor__header">
            <div className="editor__heading">
              <nav className="editor__crumbs" aria-label="Ruta">
                <Link to="/dashboard">Mis portafolios</Link>
                <ChevronRight size={14} aria-hidden="true" />
                <span aria-current="page">Editar</span>
              </nav>
              <h1 className="editor__title">{portfolio.title}</h1>
            </div>
            <div className="editor__header-actions">
              <button type="button" className="btn btn--ghost" onClick={() => setIsSettingsOpen(true)}>
                <Settings size={17} aria-hidden="true" />
                Configuración
              </button>
              <a className="btn btn--primary" href={`/p/${portfolio.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink size={17} aria-hidden="true" />
                Ver portafolio
              </a>
            </div>
          </header>

          {portfolio.status === 'blocked' && (
            <p className="editor__blocked" role="note">
              <ShieldAlert size={18} aria-hidden="true" />
              Un administrador bloqueó este portafolio: puedes editarlo, pero no es visible públicamente.
            </p>
          )}

          <div className="editor__layout">
            {/* ---------- Columna: apartados ---------- */}
            <SectionsManager
              portfolioId={portfolio.id}
              sections={sections}
              selectedId={selected?.id}
              onSelect={setSelectedId}
              onChanged={reload}
            />

            {/* ---------- Panel principal ---------- */}
            <section className="editor-card editor-main" aria-live="polite">
              {selected ? (
                <>
                  <header className="section-head">
                    <div>
                      <p className="section-head__eyebrow">
                        <Layers size={14} aria-hidden="true" />
                        Apartado
                      </p>
                      <h2 className="section-head__title">{selected.title}</h2>
                      <p className="section-head__meta">
                        {pluralize(selected.subsections.length, 'parcial', 'parciales')} ·{' '}
                        {pluralize(postsInSection, 'publicación', 'publicaciones')}
                      </p>
                    </div>
                    <a
                      className="section-head__link"
                      href={`/p/${portfolio.slug}/${selected.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Ver este apartado publicado"
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      /p/{portfolio.slug}/{selected.slug}
                    </a>
                  </header>

                  <SubsectionsManager
                    section={selected}
                    selectedId={selectedSub?.id}
                    onSelect={setSelectedSubId}
                    onChanged={reload}
                  />

                  {selectedSub ? (
                    <PostsManager key={selectedSub.id} subsection={selectedSub} onChanged={reload} />
                  ) : (
                    <div className="editor-empty">
                      <Layers size={28} aria-hidden="true" />
                      <h3>Crea el primer parcial</h3>
                      <p>
                        Los parciales organizan las publicaciones de este apartado (por ejemplo «Parcial 1»).
                        Usa el botón <strong>+ Parcial</strong>.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="editor-empty">
                  <FolderPlus size={30} aria-hidden="true" />
                  <h3>Empieza creando un apartado</h3>
                  <p>
                    Los apartados forman el menú de tu portafolio (por ejemplo «Tareas» o «Proyectos»).
                    Escribe su nombre en el panel <strong>Apartados del menú</strong>.
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>
      </EditorBusyProvider>

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
