import { rectSortingStrategy, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../../components/Button/Button'
import { splitList } from '../../../lib/text'
import { createItem } from '../../resume/model/factories'
import type { Block, BlockTextField, EntryBlock, ListBlock, TagsBlock, TextItem } from '../../resume/model/types'
import { useResumeActions } from '../../resume/state/context'
import { DragHandle } from './dnd'
import { useDropZone, useSortableNode } from './sortable'
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

/** Bullets of an entry or a list: editable, reorderable, movable to other lists. */
function BulletsEditor({ block }: { block: EntryBlock | ListBlock }) {
  const { dispatch } = useResumeActions()
  const zone = useDropZone('bullet', block.id, 'this list')

  const addAfter = (afterId: string | undefined, texts: string[] = ['']) => {
    let previous = afterId
    let last: TextItem | null = null
    for (const text of texts) {
      last = createItem(text)
      dispatch({ type: 'item/add', blockId: block.id, item: last, afterId: previous })
      previous = last.id
    }
    if (last) focusField(fieldIds.item(last.id))
  }

  const remove = (index: number) => {
    const item = block.items[index]
    if (!item) return
    dispatch({ type: 'item/remove', blockId: block.id, id: item.id })
    const previous = block.items[index - 1]
    if (previous) focusField(fieldIds.item(previous.id))
  }

  return (
    <div {...zone} className={styles.dropZone}>
      <SortableContext items={block.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <ul className={styles.bullets}>
          {block.items.map((item, index) => (
            <BulletEditor
              key={item.id}
              item={item}
              blockId={block.id}
              onEnter={() => addAfter(item.id)}
              onRemove={() => remove(index)}
              onPasteLines={(lines) => addAfter(item.id, lines)}
            />
          ))}
        </ul>
      </SortableContext>
      <div className={styles.addRow}>
        <Button variant="page" size="sm" icon={Plus} onClick={() => addAfter(block.items.at(-1)?.id)}>
          Add bullet
        </Button>
      </div>
    </div>
  )
}

interface BulletEditorProps {
  item: TextItem
  blockId: string
  onEnter: () => void
  onRemove: () => void
  onPasteLines: (lines: string[]) => void
}

function BulletEditor({ item, blockId, onEnter, onRemove, onPasteLines }: BulletEditorProps) {
  const { dispatch } = useResumeActions()
  const label = item.text ? `bullet “${item.text.slice(0, 40)}”` : 'empty bullet'
  const { nodeProps, handleProps } = useSortableNode(item.id, { level: 'bullet', containerId: blockId, label })

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
        onEnter={onEnter}
        onDeleteEmpty={onRemove}
        onPasteLines={onPasteLines}
      />
    </li>
  )
}

/** Tag groups ("Languages: Go, Rust"): chips that can move between groups. */
function TagsEditor({ block }: { block: TagsBlock }) {
  const { dispatch } = useResumeActions()
  const set = useBlockField(block.id)
  const zone = useDropZone('tag', block.id, block.label || 'this group')
  const [draft, setDraft] = useState('')
  const inputId = fieldIds.tagInput(block.id)

  const commit = (text: string) => {
    let previous = block.items.at(-1)?.id
    for (const value of splitList(text)) {
      const item = createItem(value)
      dispatch({ type: 'item/add', blockId: block.id, item, afterId: previous })
      previous = item.id
    }
    setDraft('')
  }

  const remove = (item: TextItem) => {
    dispatch({ type: 'item/remove', blockId: block.id, id: item.id })
    focusField(inputId)
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
        <SortableContext items={block.items.map((item) => item.id)} strategy={rectSortingStrategy}>
          {block.items.map((item) => (
            <TagChip key={item.id} item={item} blockId={block.id} onRemove={() => remove(item)} inputId={inputId} />
          ))}
        </SortableContext>
        <input
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
            } else if (event.key === 'Backspace' && !draft && block.items.length) {
              focusField(fieldIds.item(block.items.at(-1)!.id))
            }
          }}
          onBlur={() => draft.trim() && commit(draft)}
        />
      </div>
    </div>
  )
}

interface TagChipProps {
  item: TextItem
  blockId: string
  inputId: string
  onRemove: () => void
}

function TagChip({ item, blockId, inputId, onRemove }: TagChipProps) {
  const { dispatch } = useResumeActions()
  const label = item.text ? `“${item.text}”` : 'empty item'
  const { nodeProps, handleProps } = useSortableNode(item.id, { level: 'tag', containerId: blockId, label })
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
}
