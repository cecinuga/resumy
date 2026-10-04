import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { Id } from '../../resume/model/types'

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
