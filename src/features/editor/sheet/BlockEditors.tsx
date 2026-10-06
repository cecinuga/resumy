import { rectSortingStrategy, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, X } from 'lucide-react'
import { memo, useMemo, useRef, useState } from 'react'
import { Button } from '../../../components/Button/Button'
import { splitList } from '../../../lib/text'
import { createItem } from '../../resume/model/factories'
import type { Block, BlockTextField, EntryBlock, ListBlock, TagsBlock, TextItem } from '../../resume/model/types'
import { useResumeActions, type ResumeActions } from '../../resume/state/context'
import { useBackspace } from './backspace'
import { DragHandle } from './dnd'
import { useDropZone, useSortableNode, useStableIds } from './sortable'
import { EditableText } from './EditableText'
import { adjacentField, fieldIds, focusField } from './focus'
import { excerpt } from './labels'
import styles from './Sheet.module.css'

/** Memoized: a block's fields only change with the block, not with the drag-and-drop state around it. */
export const BlockEditor = memo(function BlockEditor({ block, datesRight }: { block: Block; datesRight: boolean }) {
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
})

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

/** Adds bullets after `afterId` (at the end without one), as one undo step, and focuses the last of them. */
function addBullets(
  dispatch: ResumeActions['dispatch'],
  blockId: string,
  afterId: string | undefined,
  texts: readonly string[] = [''],
): void {
  const items = texts.map((text) => createItem(text))
  dispatch({ type: 'item/addMany', blockId, items, afterId })
  const last = items.at(-1)
  if (last) focusField(fieldIds.item(last.id))
}

/**
 * Removes a bullet. The focus moves first, to the bullet above or else the
 * field before it, so it is never left on a field that is going away.
 */
function removeBullet(dispatch: ResumeActions['dispatch'], blockId: string, id: string, previousId: string | undefined): void {
  const field = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(fieldIds.item(id))}"]`)
  const before = previousId ? fieldIds.item(previousId) : field && adjacentField(field, -1)?.dataset.field
  if (before) focusField(before)
  dispatch({ type: 'item/remove', blockId, id })
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
  const label = item.text ? `bullet “${excerpt(item.text)}”` : 'empty bullet'
  const { nodeProps, handleProps } = useSortableNode(item.id, { level: 'bullet', containerId: blockId, label })

  // dnd-kit re-renders every bullet while something is dragged; the field only changes with the bullet.
  const field = useMemo(
    () => (
      <EditableText
        className={styles.bulletText}
        value={item.text}
        onChange={(text) => dispatch({ type: 'item/set', blockId, id: item.id, text })}
        label="Bullet point"
        placeholder="Describe an achievement, ideally with a number"
        fieldId={fieldIds.item(item.id)}
        onEnter={() => addBullets(dispatch, blockId, item.id)}
        onDeleteEmpty={() => removeBullet(dispatch, blockId, item.id, previousId)}
        onPasteLines={(lines) => addBullets(dispatch, blockId, item.id, lines)}
      />
    ),
    [dispatch, blockId, item.id, item.text, previousId],
  )

  return (
    <li {...nodeProps} className={`${styles.bullet} ${styles.bulletRow}`}>
      <div className={styles.tools}>
        <DragHandle {...handleProps} label={`Move ${label}`} />
      </div>
      {field}
      {/* At the end of the bullet, clear of the tools of its entry. */}
      <div className={`${styles.tools} ${styles.bulletEnd}`}>
        <button
          type="button"
          className={styles.iconTool}
          onClick={() => removeBullet(dispatch, blockId, item.id, previousId)}
          aria-label={`Remove ${label}`}
          title="Remove bullet"
        >
          <X aria-hidden />
        </button>
      </div>
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
    // "Go, Rust, Zig" pasted at once is one undo step.
    dispatch({ type: 'item/addMany', blockId: block.id, items: splitList(text).map((value) => createItem(value)) })
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
  const { nodeProps, handleProps } = useSortableNode(item.id, { level: 'tag', containerId: blockId, label })

  // Like bullets: the field and its remove button only change with the tag.
  const content = useMemo(() => {
    const inputId = fieldIds.tagInput(blockId)
    const remove = () => {
      dispatch({ type: 'item/remove', blockId, id: item.id })
      focusField(inputId)
    }
    return (
      <>
        <EditableText
          value={item.text}
          onChange={(text) => dispatch({ type: 'item/set', blockId, id: item.id, text })}
          label="Item"
          placeholder="Item"
          fieldId={fieldIds.item(item.id)}
          onEnter={() => focusField(inputId)}
          onDeleteEmpty={remove}
        />
        <button type="button" className={styles.iconTool} onClick={remove} aria-label={`Remove ${label}`} title="Remove">
          <X aria-hidden />
        </button>
      </>
    )
  }, [dispatch, blockId, item.id, item.text, label])

  return (
    <span {...nodeProps} className={styles.chip}>
      <DragHandle {...handleProps} label={`Move ${label}`} />
      {content}
    </span>
  )
})
