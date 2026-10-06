import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { AlignLeft, Briefcase, EyeOff, List, Plus, Tags, Trash2 } from 'lucide-react'
import { memo } from 'react'
import { Button } from '../../../components/Button/Button'
import { MenuButton, type MenuItem } from '../../../components/Menu/MenuButton'
import { useToast } from '../../../components/Toast/toast'
import { createBlock } from '../../resume/model/factories'
import type { Block, BlockType, Section } from '../../resume/model/types'
import { useResumeActions } from '../../resume/state/context'
import { useNeedsReview } from '../importReview'
import { BlockEditor } from './BlockEditors'
import { DragHandle } from './dnd'
import { useDropZone, useSortableNode, useStableIds } from './sortable'
import { EditableText } from './EditableText'
import { fieldIds, focusField } from './focus'
import { BLOCK_TYPE_LABELS, describeBlock } from './labels'
import styles from './Sheet.module.css'

const BLOCK_ICONS = { entry: Briefcase, text: AlignLeft, list: List, tags: Tags } as const
const BLOCK_HINTS: Record<BlockType, string> = {
  entry: 'A job, degree or project with dates',
  text: 'A short paragraph',
  list: 'A dotted list',
  tags: 'Skills, languages or tools on one line',
}

/** The field to focus first in a newly added block. */
function firstField(block: Block): string {
  switch (block.type) {
    case 'entry':
      return fieldIds.block(block.id, 'title')
    case 'text':
      return fieldIds.block(block.id, 'text')
    case 'list':
      return fieldIds.item(block.items[0]?.id ?? '')
    case 'tags':
      // A new group starts with its name ("Languages"); Enter then moves on to its items.
      return fieldIds.block(block.id, 'label')
  }
}

interface SectionEditorProps {
  section: Section
  /** Position among all sections, hidden ones included (to undo a removal). */
  index: number
  datesRight: boolean
}

export const SectionEditor = memo(function SectionEditor({ section, index, datesRight }: SectionEditorProps) {
  const { dispatch } = useResumeActions()
  const toast = useToast()
  const title = section.title.trim() || 'Untitled section'
  const zone = useDropZone('block', section.id, `section “${title}”`)
  const blockIds = useStableIds(section.blocks)
  const mainType: BlockType = section.blocks[0]?.type ?? 'entry'

  const addBlock = (type: BlockType) => {
    const block = createBlock(type)
    dispatch({ type: 'block/add', sectionId: section.id, block })
    focusField(firstField(block))
  }

  const removeSection = () => {
    dispatch({ type: 'section/remove', id: section.id })
    toast({
      message: `Removed “${title}”.`,
      action: { label: 'Undo', onClick: () => dispatch({ type: 'section/add', section, index }) },
    })
  }

  const menuItems: MenuItem[] = (Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((type) => ({
    id: type,
    label: `Add ${BLOCK_TYPE_LABELS[type]}`,
    hint: BLOCK_HINTS[type],
    icon: BLOCK_ICONS[type],
    onSelect: () => addBlock(type),
  }))

  return (
    <section className={`${styles.section} ${styles.sectionEditable}`} aria-label={title}>
      <div className={styles.headingBox}>
        <div className={styles.headingRow}>
          <EditableText
            as="h3"
            className={styles.heading}
            value={section.title}
            onChange={(value) => dispatch({ type: 'section/rename', id: section.id, title: value })}
            label="Section title"
            placeholder="Section title"
            fieldId={fieldIds.section(section.id)}
          />
          <div className={styles.sectionTools}>
            <button
              type="button"
              className={styles.iconTool}
              onClick={() => dispatch({ type: 'section/toggle', id: section.id })}
              aria-label={`Hide “${title}” from the resume`}
              title="Hide from the resume (show it again from Sections)"
            >
              <EyeOff aria-hidden />
            </button>
            <button
              type="button"
              className={styles.iconTool}
              onClick={removeSection}
              aria-label={`Remove “${title}”`}
              title="Remove section"
            >
              <Trash2 aria-hidden />
            </button>
          </div>
        </div>
      </div>
      <div {...zone} className={styles.dropZone}>
        <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
          {section.blocks.map((block, index) => (
            <SortableBlock key={block.id} block={block} index={index} sectionId={section.id} datesRight={datesRight} />
          ))}
        </SortableContext>
        {section.blocks.length === 0 && <p className={styles.emptyHint}>Empty section: add something or drag content here.</p>}
      </div>
      <div className={styles.addRow}>
        <Button variant="page" size="sm" icon={Plus} onClick={() => addBlock(mainType)}>
          {`Add ${BLOCK_TYPE_LABELS[mainType]}`}
        </Button>
        <MenuButton variant="page" size="sm" label="More" items={menuItems} />
      </div>
    </section>
  )
})

interface SortableBlockProps {
  block: Block
  index: number
  sectionId: string
  datesRight: boolean
}

const SortableBlock = memo(function SortableBlock({ block, index, sectionId, datesRight }: SortableBlockProps) {
  const { dispatch } = useResumeActions()
  const toast = useToast()
  const label = describeBlock(block)
  const { nodeProps, handleProps } = useSortableNode(block.id, { level: 'block', containerId: sectionId, label })
  const needsReview = useNeedsReview(block)

  const remove = () => {
    dispatch({ type: 'block/remove', id: block.id })
    toast({
      message: `Removed ${label}.`,
      action: { label: 'Undo', onClick: () => dispatch({ type: 'block/add', sectionId, block, index }) },
    })
  }

  return (
    <div {...nodeProps} className={styles.block} data-review={needsReview || undefined}>
      {needsReview && <p className={styles.reviewMark}>Check this: it may not have come through cleanly from your PDF.</p>}
      <div className={styles.tools}>
        <DragHandle {...handleProps} label={`Move ${label}`} />
        <button type="button" className={styles.iconTool} onClick={remove} aria-label={`Remove ${label}`} title="Remove">
          <Trash2 aria-hidden />
        </button>
      </div>
      <BlockEditor block={block} datesRight={datesRight} />
    </div>
  )
})
