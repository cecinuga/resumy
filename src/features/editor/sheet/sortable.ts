import { KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import { sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo, type CSSProperties } from 'react'
import type { Id } from '../../resume/model/types'

// dnd-kit memoizes sensors on their options object. A new object on every
// render would give every draggable a new context, so all of them would
// re-render with each keystroke.
const POINTER_OPTIONS = { activationConstraint: { distance: 4 } }
const KEYBOARD_OPTIONS = { coordinateGetter: sortableKeyboardCoordinates }

/** Pointer (after a 4px move, so clicks still work) and keyboard dragging. */
export function useDragSensors() {
  return useSensors(useSensor(PointerSensor, POINTER_OPTIONS), useSensor(KeyboardSensor, KEYBOARD_OPTIONS))
}

const ID_SEPARATOR = '\u0000'

/**
 * The ids of a list, as the same array for as long as they stay the same.
 * SortableContext re-renders every sortable inside it when it gets a new
 * array, so editing one bullet would otherwise re-render all of them.
 */
export function useStableIds(list: readonly { id: Id }[]): Id[] {
  const key = list.map((entry) => entry.id).join(ID_SEPARATOR)
  return useMemo(() => (key ? key.split(ID_SEPARATOR) : []), [key])
}

/**
 * What can be dragged on the sheet: blocks (between sections), bullets
 * (between entries and lists) and tags (between tag groups).
 */
export type DragLevel = 'block' | 'bullet' | 'tag'

export interface DragData {
  level: DragLevel
  /** The section holding a block, or the block holding an item. */
  containerId: Id
  /** Spoken to screen readers and shown while dragging. */
  label: string
  /** True for the drop area of a whole container rather than one element. */
  isContainer?: boolean
}

/** Makes an element sortable; drag starts from its handle only. */
export function useSortableNode(id: Id, data: DragData) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data,
  })
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition }
  return {
    nodeProps: { ref: setNodeRef, style, 'data-dragging': isDragging || undefined },
    handleProps: { ref: setActivatorNodeRef, ...attributes, ...listeners },
  }
}

/** A whole container as a drop target, so empty sections and lists can receive elements. */
export function useDropZone(level: DragLevel, containerId: Id, containerLabel: string) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${level}-zone:${containerId}`,
    data: { level, containerId, label: containerLabel, isContainer: true } satisfies DragData,
  })
  return { ref: setNodeRef, 'data-over': isOver || undefined }
}
