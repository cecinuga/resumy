import { closestCenter, DndContext, type DragEndEvent, type Modifier } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, EyeOff, GripVertical, Plus, Trash2 } from 'lucide-react'
import { memo } from 'react'
import { Button } from '../../../components/Button/Button'
import { useToast } from '../../../components/Toast/toast'
import { createSectionFromPreset } from '../../resume/model/factories'
import type { SectionPresetId } from '../../resume/model/sectionPresets'
import { addableSections } from '../sectionChoices'
import type { Section } from '../../resume/model/types'
import { useResumeActions } from '../../resume/state/context'
import { fieldIds, focusField } from '../sheet/focus'
import { useDragSensors, useStableIds } from '../sheet/sortable'
import styles from './Panels.module.css'

const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 })
const MODIFIERS = [restrictToVerticalAxis]

interface SectionsPanelProps {
  sections: readonly Section[]
  onSectionAdded?: () => void
}

/** Order, show, hide, remove and add sections. */
export const SectionsPanel = memo(function SectionsPanel({ sections, onSectionAdded }: SectionsPanelProps) {
  const { dispatch } = useResumeActions()
  const sensors = useDragSensors()
  const sectionIds = useStableIds(sections)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const toIndex = sections.findIndex((section) => section.id === over.id)
    if (toIndex !== -1) dispatch({ type: 'section/move', id: String(active.id), toIndex })
  }

  const addSection = (presetId: SectionPresetId) => {
    const section = createSectionFromPreset(presetId)
    dispatch({ type: 'section/add', section })
    onSectionAdded?.()
    focusField(fieldIds.section(section.id))
  }

  return (
    <div className={styles.panel}>
      <div className={styles.fieldset}>
        <h3 className={styles.legend}>Order and visibility</h3>
        <p className={styles.hint}>Drag to reorder. Hidden sections stay saved but are left out of the PDF.</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={MODIFIERS} onDragEnd={onDragEnd}>
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            <ul className={styles.sectionList}>
              {sections.map((section, index) => (
                <SectionRow key={section.id} section={section} index={index} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>

      <div className={styles.fieldset}>
        <h3 className={styles.legend}>Add a section</h3>
        <div className={styles.presets}>
          {addableSections(sections).map((preset) => (
            <Button key={preset.id} size="sm" variant="secondary" icon={Plus} onClick={() => addSection(preset.id)}>
              {preset.title}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
})

/** One row; only the section that changed re-renders. */
const SectionRow = memo(function SectionRow({ section, index }: { section: Section; index: number }) {
  const { dispatch } = useResumeActions()
  const toast = useToast()
  const title = section.title.trim() || 'Untitled section'
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  })

  const remove = () => {
    dispatch({ type: 'section/remove', id: section.id })
    toast({
      message: `Removed “${title}”.`,
      action: { label: 'Undo', onClick: () => dispatch({ type: 'section/add', section, index }) },
    })
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={styles.sectionRow}
      data-dragging={isDragging || undefined}
      data-hidden={section.hidden || undefined}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className={styles.grip}
        aria-label={`Move “${title}”`}
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden />
      </button>
      <span className={styles.sectionTitle}>
        {title}
        {section.hidden && <span className="visually-hidden"> (hidden)</span>}
      </span>
      <Button
        variant="quiet"
        size="sm"
        iconOnly
        icon={section.hidden ? EyeOff : Eye}
        aria-pressed={!section.hidden}
        onClick={() => dispatch({ type: 'section/toggle', id: section.id })}
        title={section.hidden ? 'Show in the resume' : 'Hide from the resume'}
      >
        {`Show “${title}” in the resume`}
      </Button>
      <Button variant="quiet" size="sm" iconOnly icon={Trash2} onClick={remove}>
        {`Remove “${title}”`}
      </Button>
    </li>
  )
})
