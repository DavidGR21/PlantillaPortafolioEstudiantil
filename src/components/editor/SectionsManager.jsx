import { EditableList } from './EditableList.jsx'
import * as contentService from '../../services/contentService.js'

/** Apartados del menú del portafolio (columna lateral del editor). */
export function SectionsManager({ portfolioId, sections, selectedId, onSelect, onChanged }) {
  return (
    <section className="editor-card editor-sidebar" aria-label="Apartados del menú">
      <EditableList
        title="Apartados del menú"
        noun="apartado"
        items={sections}
        max={20}
        selectedId={selectedId}
        onSelect={onSelect}
        emptyText="Aún no hay apartados. Crea el primero, por ejemplo «Tareas» o «Proyectos»."
        addPlaceholder="Nuevo apartado…"
        deleteWarning={(section) => (
          <>
            Se eliminará <strong>«{section.title}»</strong> con todos sus parciales, publicaciones
            y archivos. <strong>Esta acción no se puede deshacer.</strong>
          </>
        )}
        onCreate={(title) => contentService.createSection(portfolioId, title)}
        onRename={(id, title) => contentService.renameSection(id, title)}
        onReorder={(ids) => contentService.reorderSections(portfolioId, ids)}
        onDelete={(id) => contentService.deleteSection(id)}
        onChanged={onChanged}
      />
    </section>
  )
}
