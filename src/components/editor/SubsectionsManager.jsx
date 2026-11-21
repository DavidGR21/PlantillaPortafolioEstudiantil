import { EditableList } from './EditableList.jsx'
import * as contentService from '../../services/contentService.js'
import { pluralize } from '../../utils/format.js'

/** Parciales / submódulos de un apartado (Parcial 1, Parcial 2...). */
export function SubsectionsManager({ section, selectedId, onSelect, onChanged }) {
  return (
    <EditableList
      className="subsections-manager"
      title="Parciales"
      titleTag="h3"
      noun="parcial"
      items={section.subsections}
      max={20}
      selectedId={selectedId}
      onSelect={onSelect}
      emptyText="Este apartado aún no tiene parciales. Crea uno, por ejemplo «Parcial 1»."
      addPlaceholder={`Ej. Parcial ${section.subsections.length + 1}`}
      deleteWarning={(sub) => (
        <>
          Se eliminará <strong>«{sub.title}»</strong> con{' '}
          {pluralize(sub.posts?.length ?? 0, 'publicación', 'publicaciones')} y sus archivos.{' '}
          <strong>Esta acción no se puede deshacer.</strong>
        </>
      )}
      onCreate={(title) => contentService.createSubsection(section.id, title)}
      onRename={(id, title) => contentService.renameSubsection(id, title)}
      onReorder={(ids) => contentService.reorderSubsections(section.id, ids)}
      onDelete={(id) => contentService.deleteSubsection(id)}
      onChanged={onChanged}
    />
  )
}
