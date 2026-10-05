import { rectSortingStrategy, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, X } from 'lucide-react'
import { memo, useRef, useState } from 'react'
import { Button } from '../../../components/Button/Button'
import { splitList } from '../../../lib/text'
import { createItem } from '../../resume/model/factories'
import type { Block, BlockTextField, EntryBlock, ListBlock, TagsBlock, TextItem } from '../../resume/model/types'
import { useResumeActions, type ResumeActions } from '../../resume/state/context'
import { useBackspace } from './backspace'
import { DragHandle } from './dnd'
import { useDropZone, useSortableNode, useStableIds } from './sortable'
import { EditableText } from './EditableText'
import { fieldIds, focusField } from './focus'
import styles from './Sheet.module.css'

export function BlockEditor({ block, datesRight }: { block: Block; datesRight: boolean }) {
  switch (block.type) {
    case 'entry':
      return <EntryEditor entry={block} datesRight={datesRight} />
    case 'text':
      return <TextEditor block={block} />
    case 'list':
      return <BulletsEditor block={block} />
    case 'tags':
      return <TagsEditor block={block} />
  }
}

function useBlockField(blockId: string) {
  const { dispatch } = useResumeActions()
  return (field: BlockTextField) => (value: string) => dispatch({ type: 'block/set', id: blockId, field, value })
}

function EntryEditor({ entry, datesRight }: { entry: EntryBlock; datesRight: boolean }) {
  const set = useBlockField(entry.id)
  const field = (
    name: 'title' | 'subtitle' | 'date' | 'location',
    label: string,
    placeholder: string,
    className: string | undefined,
  ) => (
    <EditableText
      as={datesRight || name === 'date' || name === 'location' ? 'span' : 'div'}
      className={className}
      value={entry[name]}
      onChange={set(name)}
      label={label}
      placeholder={placeholder}
      fieldId={fieldIds.block(entry.id, name)}
    />
  )
  const meta = datesRight ? styles.entryMeta : undefined
  const title = field('title', 'Title', 'Job title, degree or project', styles.entryTitle)
  const subtitle = field('subtitle', 'Organization', 'Company or school', styles.entrySubtitle)
  const date = field('date', 'Dates', 'Jan 2022 – Present', meta)
  const location = field('location', 'Location', 'City or remote', meta)

  return (
    <div className={styles.entry}>
      {datesRight ? (
        <>
          <div className={styles.entryRow}>
            {title}
            {date}
          </div>
          <div className={styles.entryRow}>
            {subtitle}
            {location}
          </div>
        </>
      ) : (
        <>
          {title}
          {subtitle}
          <div className={styles.entryMetaLine}>
            {date}
            <span aria-hidden>&nbsp;·&nbsp;</span>
            {location}
          </div>
        </>
      )}
      <BulletsEditor block={entry} />
    </div>
  )
}

function TextEditor({ block }: { block: Extract<Block, { type: 'text' }> }) {
  const set = useBlockField(block.id)
  return (
    <EditableText
      as="p"
      multiline
      className={styles.paragraph}
      value={block.text}
      onChange={set('text')}
      label="Paragraph"
      placeholder="Write a few sentences about yourself, your strengths and what you're looking for."
      fieldId={fieldIds.block(block.id, 'text')}
    />
  )
}

/** Adds bullets after `afterId` (at the end without one) and focuses the last of them. */
function addBullets(
  dispatch: ResumeActions['dispatch'],
  blockId: string,
  afterId: string | undefined,
  texts: readonly string[] = [''],
): void {
  let previous = afterId
  let last: TextItem | null = null
  for (const text of texts) {
    last = createItem(text)
    dispatch({ type: 'item/add', blockId, item: last, afterId: previous })
    previous = last.id
  }
  if (last) focusField(fieldIds.item(last.id))
}

/** Bullets of an entry or a list: editable, reorderable, movable to other lists. */
function BulletsEditor({ block }: { block: EntryBlock | ListBlock }) {
  const { dispatch } = useResumeActions()
  const zone = useDropZone('bullet', block.id, 'this list')
  const itemIds = useStableIds(block.items)

  return (
    <div {...zone} className={styles.dropZone}>
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <ul className={styles.bullets}>
          {block.items.map((item, index) => (
            <BulletEditor key={item.id} item={item} blockId={block.id} previousId={block.items[index - 1]?.id} />
          ))}
        </ul>
      </SortableContext>
      <div className={styles.addRow}>
        <Button variant="page" size="sm" icon={Plus} onClick={() => addBullets(dispatch, block.id, block.items.at(-1)?.id)}>
          Add bullet
        </Button>
      </div>
    </div>
  )
}

interface BulletEditorProps {
  item: TextItem
  blockId: string
  /** The bullet above, which gets the focus when this one is removed. */
  previousId: string | undefined
}

/** One bullet. Memoized: typing in a bullet leaves the others alone. */
const BulletEditor = memo(function BulletEditor({ item, blockId, previousId }: BulletEditorProps) {
  const { dispatch } = useResumeActions()
  const label = item.text ? `bullet “${item.text.slice(0, 40)}”` : 'empty bullet'
  const { nodeProps, handleProps } = useSortableNode(item.id, { level: 'bullet', containerId: blockId, label })

  const remove = () => {
    dispatch({ type: 'item/remove', blockId, id: item.id })
    if (previousId) focusField(fieldIds.item(previousId))
  }

  return (
    <li {...nodeProps} className={`${styles.bullet} ${styles.bulletRow}`}>
      <div className={styles.tools}>
        <DragHandle {...handleProps} label={`Move ${label}`} />
      </div>
      <EditableText
        className={styles.bulletText}
        value={item.text}
        onChange={(text) => dispatch({ type: 'item/set', blockId, id: item.id, text })}
        label="Bullet point"
        placeholder="Describe an achievement, ideally with a number"
        fieldId={fieldIds.item(item.id)}
        onEnter={() => addBullets(dispatch, blockId, item.id)}
        onDeleteEmpty={remove}
        onPasteLines={(lines) => addBullets(dispatch, blockId, item.id, lines)}
      />
    </li>
  )
})

/** Tag groups ("Languages: Go, Rust"): chips that can move between groups. */
function TagsEditor({ block }: { block: TagsBlock }) {
  const { dispatch } = useResumeActions()
  const set = useBlockField(block.id)
  const zone = useDropZone('tag', block.id, block.label || 'this group')
  const itemIds = useStableIds(block.items)
  const [draft, setDraft] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const inputId = fieldIds.tagInput(block.id)
  const lastItem = block.items.at(-1)
  useBackspace(input, {
    isEmpty: () => !input.current?.value,
    // Back to the last item, like an empty field moves to the previous one.
    onLeave: lastItem && (() => focusField(fieldIds.item(lastItem.id))),
  })

  const commit = (text: string) => {
    let previous = block.items.at(-1)?.id
    for (const value of splitList(text)) {
      const item = createItem(value)
      dispatch({ type: 'item/add', blockId: block.id, item, afterId: previous })
      previous = item.id
    }
    setDraft('')
  }

  return (
    <div className={styles.tagsEditable}>
      <EditableText
        className={styles.tagLabelField}
        value={block.label}
        onChange={set('label')}
        label="Group label"
        placeholder="Label (optional)"
        fieldId={fieldIds.block(block.id, 'label')}
      />
      <div {...zone} className={`${styles.chips} ${styles.dropZone}`}>
        <SortableContext items={itemIds} strategy={rectSortingStrategy}>
          {block.items.map((item) => (
            <TagChip key={item.id} item={item} blockId={block.id} />
          ))}
        </SortableContext>
        <input
          ref={input}
          className={styles.tagInput}
          value={draft}
          placeholder="Add item"
          aria-label={`Add to ${block.label || 'this group'}`}
          data-field={inputId}
          enterKeyHint="done"
          onChange={(event) => {
            const value = event.target.value
            // Typing a comma completes the item.
            if (/[,;]/.test(value)) commit(value)
            else setDraft(value)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault()
              commit(draft)
            }
          }}
          onBlur={() => draft.trim() && commit(draft)}
        />
      </div>
    </div>
  )
}

/** One tag. Memoized, like bullets. */
const TagChip = memo(function TagChip({ item, blockId }: { item: TextItem; blockId: string }) {
  const { dispatch } = useResumeActions()
  const label = item.text ? `“${item.text}”` : 'empty item'
  const inputId = fieldIds.tagInput(blockId)
  const { nodeProps, handleProps } = useSortableNode(item.id, { level: 'tag', containerId: blockId, label })

  const onRemove = () => {
    dispatch({ type: 'item/remove', blockId, id: item.id })
    focusField(inputId)
  }
  return (
    <span {...nodeProps} className={styles.chip}>
      <DragHandle {...handleProps} label={`Move ${label}`} />
      <EditableText
        value={item.text}
        onChange={(text) => dispatch({ type: 'item/set', blockId, id: item.id, text })}
        label="Item"
        placeholder="Item"
        fieldId={fieldIds.item(item.id)}
        onEnter={() => focusField(inputId)}
        onDeleteEmpty={onRemove}
      />
      <button type="button" className={styles.iconTool} onClick={onRemove} aria-label={`Remove ${label}`} title="Remove">
        <X aria-hidden />
      </button>
    </span>
  )
})
