import { useState } from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { restrictToHorizontalAxis, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { CSS } from '@dnd-kit/utilities'

// Textos en español para lectores de pantalla (arrastrar con teclado).
const accessibility = {
  screenReaderInstructions: {
    draggable:
      'Para reordenar, pulsa Espacio o Intro, usa las flechas para mover el elemento y vuelve a pulsar Espacio o Intro para soltarlo. Esc cancela.',
  },
  announcements: {
    onDragStart: () => 'Elemento tomado.',
    onDragOver: ({ over }) => (over ? 'Movido a una nueva posición.' : 'Fuera de la lista.'),
    onDragEnd: ({ over }) => (over ? 'Elemento soltado. Guardando el nuevo orden.' : 'Elemento soltado.'),
    onDragCancel: () => 'Se canceló el movimiento.',
  },
}

/**
 * Lista reordenable con arrastrar y soltar (ratón, táctil y teclado).
 *
 * - items: [{ id, ... }]  ·  renderItem(item, { handle, index, isDragging, move })
 * - onReorder(ids) async: guarda el nuevo orden. Mientras tanto se muestra el
 *   orden nuevo (optimista); si falla, vuelve al anterior y se relanza el error.
 * - `handle` son las props para el asa de arrastre; `move(delta)` mueve con flechas.
 */
export function SortableList({ items, onReorder, renderItem, direction = 'vertical', className = '', as: Tag = 'ol' }) {
  const itemsKey = items.map((i) => i.id).join(',')
  const [optimistic, setOptimistic] = useState(null) // { base, ids }
  const ids = optimistic?.base === itemsKey ? optimistic.ids : items.map((i) => i.id)
  const ordered = ids.map((id) => items.find((i) => i.id === id)).filter(Boolean)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function commit(newIds) {
    if (newIds.join(',') === ids.join(',')) return
    setOptimistic({ base: itemsKey, ids: newIds })
    try {
      await onReorder(newIds)
    } catch (error) {
      setOptimistic(null) // vuelve al orden anterior
      throw error
    }
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(active.id)
    const to = ids.indexOf(over.id)
    commit(arrayMove(ids, from, to)).catch(() => {}) // el error lo muestra quien llama
  }

  const move = (index, delta) => commit(arrayMove(ids, index, index + delta))

  const horizontal = direction === 'horizontal'
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[horizontal ? restrictToHorizontalAxis : restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      accessibility={accessibility}
    >
      <SortableContext items={ids} strategy={horizontal ? horizontalListSortingStrategy : verticalListSortingStrategy}>
        <Tag className={className}>
          {ordered.map((item, index) => (
            <SortableItem key={item.id} id={item.id}>
              {(handle, isDragging) =>
                renderItem(item, { handle, index, isDragging, move: (delta) => move(index, delta), count: ordered.length })
              }
            </SortableItem>
          ))}
        </Tag>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    attributes: { roleDescription: 'elemento reordenable' },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 5 : undefined,
    position: 'relative',
  }

  // Props para el asa (botón con el icono de puntos).
  const handle = { ref: setActivatorNodeRef, ...attributes, ...listeners }

  return (
    <li ref={setNodeRef} style={style} className={isDragging ? 'is-dragging' : undefined}>
      {children(handle, isDragging)}
    </li>
  )
}
