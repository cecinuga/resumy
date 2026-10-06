import {
  closestCenter,
  DndContext,
  DragOverlay,
  type Announcements,
  type Collision,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { forwardRef, memo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { hasItems, type Id, type Resume } from '../../resume/model/types'
import { useResumeActions } from '../../resume/state/context'
import { findBlock, findItem, moveBlock, moveItem } from '../../resume/state/operations'
import { GripVertical } from './icons'
import styles from './Sheet.module.css'
import { useDragSensors, type DragData, type DragLevel } from './sortable'

interface Position {
  containerId: Id
  index: number
}

function locate(resume: Resume, level: DragLevel, id: Id): Position | null {
  if (level === 'block') {
    const found = findBlock(resume, id)
    return found ? { containerId: found.section.id, index: found.section.blocks.indexOf(found.block) } : null
  }
  const found = findItem(resume, id)
  return found ? { containerId: found.block.id, index: found.index } : null
}

function sizeOf(resume: Resume, level: DragLevel, containerId: Id): number {
  if (level === 'block') return resume.sections.find((section) => section.id === containerId)?.blocks.length ?? 0
  const block = findBlock(resume, containerId)?.block
  return block && hasItems(block) ? block.items.length : 0
}

function move(resume: Resume, level: DragLevel, id: Id, to: Position): Resume {
  return level === 'block'
    ? moveBlock(resume, id, to.containerId, to.index)
    : moveItem(resume, id, to.containerId, to.index)
}

const dataOf = (entry: { data: { current?: unknown } } | null | undefined) =>
  entry?.data.current as DragData | undefined

const distance = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)

/**
 * dnd-kit's pointerWithin, with the same results but cheaper. Each edge of
 * its rects re-reads the scroll position of the page, and every pointer move
 * checks a hundred or more targets. The vertical test comes first, so most
 * targets cost one read instead of eight.
 */
const pointerWithin: CollisionDetection = ({ droppableContainers, droppableRects, pointerCoordinates }) => {
  if (!pointerCoordinates) return []
  const { x, y } = pointerCoordinates
  const hits: { collision: Collision; value: number }[] = []
  for (const droppableContainer of droppableContainers) {
    const rect = droppableRects.get(droppableContainer.id)
    if (!rect) continue
    const top = rect.top
    const bottom = top + rect.height
    if (y < top || y > bottom) continue
    const left = rect.left
    const right = left + rect.width
    if (x < left || x > right) continue
    // Ordered like dnd-kit's: by the mean distance from the pointer to the corners.
    const corners = distance(x, y, left, top) + distance(x, y, right, top) + distance(x, y, left, bottom) + distance(x, y, right, bottom)
    const value = Number((corners / 4).toFixed(4))
    hits.push({ collision: { id: droppableContainer.id, data: { droppableContainer, value } }, value })
  }
  return hits.sort((a, b) => a.value - b.value).map(({ collision }) => collision)
}

/** Only targets of the dragged kind count; a precise hit beats a container hit. */
const collisionDetection: CollisionDetection = (args) => {
  const level = dataOf(args.active)?.level
  const droppableContainers = args.droppableContainers.filter((container) => dataOf(container)?.level === level)
  const scoped = { ...args, droppableContainers }
  const hits = pointerWithin(scoped)
  if (hits.length === 0) return closestCenter(scoped)
  const precise = hits.filter((hit) => !dataOf(hit.data?.droppableContainer)?.isContainer)
  return precise.length > 0 ? precise : hits
}

const label = (entry: { data: { current?: unknown } } | null | undefined) => dataOf(entry)?.label ?? 'item'

const announcements: Announcements = {
  onDragStart: ({ active }) => `Picked up ${label(active)}.`,
  onDragOver: ({ active, over }) =>
    over ? `${label(active)} is over ${label(over)}.` : `${label(active)} is no longer over a drop area.`,
  onDragEnd: ({ active, over }) =>
    over ? `${label(active)} was dropped over ${label(over)}.` : `${label(active)} was dropped.`,
  onDragCancel: ({ active }) => `Moving ${label(active)} was cancelled.`,
}

const ACCESSIBILITY = { announcements }

interface SheetDndProps {
  resume: Resume
  /** Renders the sheet; while dragging it receives the live preview. */
  children: (resume: Resume) => ReactNode
}

export function SheetDnd({ resume, children }: SheetDndProps) {
  const { dispatch } = useResumeActions()
  const [preview, setPreview] = useState<Resume | null>(null)
  const [active, setActive] = useState<{ id: Id; data: DragData } | null>(null)
  const sensors = useDragSensors()

  const reset = () => {
    setPreview(null)
    setActive(null)
  }

  const onDragStart = ({ active: dragged }: DragStartEvent) => {
    const data = dataOf(dragged)
    if (!data) return
    setActive({ id: String(dragged.id), data })
    setPreview(resume)
  }

  // Crossing into another container moves the element there right away,
  // so the target makes room for it.
  const onDragOver = ({ active: dragged, over }: DragOverEvent) => {
    const data = dataOf(dragged)
    const target = dataOf(over)
    if (!over || !data || !target || target.level !== data.level) return
    setPreview((state) => {
      if (!state) return state
      const id = String(dragged.id)
      const from = locate(state, data.level, id)
      if (!from || from.containerId === target.containerId) return state
      let index = sizeOf(state, data.level, target.containerId)
      if (!target.isContainer) {
        const overIndex = locate(state, data.level, String(over.id))?.index ?? index
        const draggedRect = dragged.rect.current.translated
        const isBelow = draggedRect !== null && draggedRect.top > over.rect.top + over.rect.height / 2
        index = overIndex + (isBelow ? 1 : 0)
      }
      return move(state, data.level, id, { containerId: target.containerId, index })
    })
  }

  const onDragEnd = ({ active: dragged, over }: DragEndEvent) => {
    const data = dataOf(dragged)
    const target = dataOf(over)
    const id = String(dragged.id)
    let result = preview ?? resume
    if (data && over && target?.level === data.level && !target.isContainer && over.id !== dragged.id) {
      const from = locate(result, data.level, id)
      const to = locate(result, data.level, String(over.id))
      if (from && to && from.containerId === to.containerId) result = move(result, data.level, id, to)
    }
    const before = data && locate(resume, data.level, id)
    const after = data && locate(result, data.level, id)
    if (data && before && after && (before.containerId !== after.containerId || before.index !== after.index)) {
      dispatch(
        data.level === 'block'
          ? { type: 'block/move', id, toSectionId: after.containerId, toIndex: after.index }
          : { type: 'item/move', id, toBlockId: after.containerId, toIndex: after.index },
      )
    }
    reset()
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
      accessibility={ACCESSIBILITY}
    >
      {children(preview ?? resume)}
      <DragOverlay dropAnimation={null}>
        {active && (
          <div className={styles.dragGhost} data-level={active.data.level}>
            <GripVertical aria-hidden />
            <span>{active.data.label}</span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

interface DragHandleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  className?: string
}

/**
 * The grip that starts a drag, by pointer or keyboard (Space, arrows, Space).
 * Memoized: dnd-kit re-renders every sortable while something is dragged.
 */
export const DragHandle = memo(
  forwardRef<HTMLButtonElement, DragHandleProps>(function DragHandle({ label: handleLabel, className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={[styles.handle, className].filter(Boolean).join(' ')}
        aria-label={handleLabel}
        title={handleLabel}
        {...rest}
      >
        <GripVertical aria-hidden />
      </button>
    )
  }),
)
