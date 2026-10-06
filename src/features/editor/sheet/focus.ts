/**
 * Focus management for the inline editor. Fields are found by their
 * `data-field` id. A field that doesn't exist yet (it is being added) takes
 * the focus itself as it mounts (see claimFocus), so the next keystroke
 * already lands in it, however fast the person types.
 */

/** The field asked for before it existed. */
let pending: string | null = null

const find = (fieldId: string) => document.querySelector<HTMLElement>(`[data-field="${CSS.escape(fieldId)}"]`)

function focusElement(element: HTMLElement): void {
  element.focus()
  if (element.isContentEditable) placeCaretAtEnd(element)
}

export function focusField(fieldId: string): void {
  const element = find(fieldId)
  if (element) {
    pending = null
    focusElement(element)
    return
  }
  pending = fieldId
  // Fields that don't claim the focus themselves (the tag input) are found once they are on the page.
  window.requestAnimationFrame(() => {
    if (pending !== fieldId) return
    pending = null
    const later = find(fieldId)
    if (later) focusElement(later)
  })
}

/** Called by a field as it mounts: takes the focus if it was asked for. */
export function claimFocus(fieldId: string, element: HTMLElement): void {
  if (pending !== fieldId) return
  pending = null
  focusElement(element)
}

export function placeCaretAtEnd(element: HTMLElement): void {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

/** The next (or previous) editable field on the sheet, in reading order. */
export function adjacentField(from: HTMLElement, direction: 1 | -1 = 1): HTMLElement | null {
  const fields = [...document.querySelectorAll<HTMLElement>('[data-field]')]
  return fields[fields.indexOf(from) + direction] ?? null
}

/** Moves focus to the next (or previous) editable field on the sheet, like Tab. */
export function focusAdjacentField(from: HTMLElement, direction: 1 | -1 = 1): void {
  const next = adjacentField(from, direction)
  if (next) focusElement(next)
}

export const fieldIds = {
  basics: (field: string) => `basics:${field}`,
  link: (id: string) => `link:${id}`,
  section: (id: string) => `section:${id}`,
  block: (id: string, field: string) => `block:${id}:${field}`,
  item: (id: string) => `item:${id}`,
  tagInput: (blockId: string) => `tag-input:${blockId}`,
}
