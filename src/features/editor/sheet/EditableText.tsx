import { useLayoutEffect, useRef, type ClipboardEvent, type KeyboardEvent, type RefObject } from 'react'
import { focusAdjacentField } from './focus'
import styles from './Sheet.module.css'

type Tag = 'span' | 'div' | 'p' | 'h2' | 'h3'

interface EditableTextProps {
  value: string
  onChange: (value: string) => void
  /** Accessible name of the field, e.g. "Job title". */
  label: string
  placeholder: string
  /** Stable id used to move focus to this field (see focus.ts). */
  fieldId: string
  as?: Tag
  className?: string
  /** Allows line breaks (paragraphs). */
  multiline?: boolean
  /** Enter in a single-line field; by default focus moves to the next field. */
  onEnter?: () => void
  /** Backspace in an empty field, e.g. to delete a bullet. */
  onDeleteEmpty?: () => void
  /** Pasting several lines: the first goes here, the rest is handed over. */
  onPasteLines?: (lines: string[]) => void
}

const supportsPlaintextOnly = (() => {
  if (typeof document === 'undefined') return false
  try {
    const probe = document.createElement('div')
    probe.contentEditable = 'plaintext-only'
    // Environments without real editing support (e.g. jsdom) just store the value.
    return 'isContentEditable' in probe && probe.contentEditable === 'plaintext-only'
  } catch {
    return false
  }
})()

function readText(element: HTMLElement, multiline: boolean): string {
  // innerText turns <br> into line breaks; jsdom only has textContent.
  const raw = (element.innerText ?? element.textContent ?? '').replace(/\u00a0/g, ' ')
  const text = multiline ? raw.replace(/\n$/, '') : raw.replace(/\s*\n\s*/g, ' ')
  return text.trim() ? text : ''
}

function insertPlainText(text: string): void {
  // execCommand keeps the browser's own undo history for the field.
  if (document.execCommand('insertText', false, text)) return
  const selection = window.getSelection()
  if (!selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  range.insertNode(document.createTextNode(text))
  range.collapse(false)
}

/**
 * A field edited in place on the resume sheet. The DOM owns the text while
 * the person types; React only writes to it when the value changes from
 * elsewhere (undo, import), so the caret never jumps.
 */
export function EditableText({
  value,
  onChange,
  label,
  placeholder,
  fieldId,
  as = 'span',
  className,
  multiline = false,
  onEnter,
  onDeleteEmpty,
  onPasteLines,
}: EditableTextProps) {
  const ref = useRef<HTMLElement>(null)
  /** The last value this field reported (null before the first render). */
  const emitted = useRef<string | null>(null)

  // Writes the text on mount and when the value changes from elsewhere.
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || value === emitted.current) return
    emitted.current = value
    if (readText(element, multiline) !== value) element.textContent = value
  }, [value, multiline])

  const emit = () => {
    const element = ref.current
    if (!element) return
    const text = readText(element, multiline)
    // Browsers leave a stray <br> behind when a field is emptied; clear it so the placeholder shows.
    if (!text && element.childNodes.length) element.replaceChildren()
    if (text === emitted.current) return
    emitted.current = text
    onChange(text)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const element = event.currentTarget
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter' && !multiline) {
      event.preventDefault()
      if (onEnter) onEnter()
      else focusAdjacentField(element)
    } else if (event.key === 'Backspace' && onDeleteEmpty && !readText(element, multiline)) {
      event.preventDefault()
      onDeleteEmpty()
    } else if ((event.metaKey || event.ctrlKey) && ['b', 'i', 'u'].includes(event.key.toLowerCase())) {
      // Resumes are plain text: no bold or italic from shortcuts.
      event.preventDefault()
    }
  }

  const onPaste = (event: ClipboardEvent<HTMLElement>) => {
    event.preventDefault()
    const text = event.clipboardData.getData('text/plain').replace(/\r\n?/g, '\n')
    if (multiline) {
      insertPlainText(text)
      return
    }
    const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
    if (lines.length > 1 && onPasteLines) {
      insertPlainText(lines[0] ?? '')
      emit()
      onPasteLines(lines.slice(1))
    } else {
      insertPlainText(lines.join(' '))
    }
  }

  // All supported tags share the HTMLElement API this component uses.
  const Tag = as as 'span'
  return (
    <Tag
      ref={ref as RefObject<HTMLSpanElement>}
      className={[styles.editable, className].filter(Boolean).join(' ')}
      contentEditable={supportsPlaintextOnly ? 'plaintext-only' : 'true'}
      suppressContentEditableWarning
      role="textbox"
      aria-label={label}
      aria-multiline={multiline || undefined}
      data-placeholder={placeholder}
      data-field={fieldId}
      spellCheck
      onInput={emit}
      onBlur={emit}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
    />
  )
}
