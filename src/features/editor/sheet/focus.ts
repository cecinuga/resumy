/**
 * Focus management for the inline editor. Fields are found by their
 * `data-field` id after React has committed the change that created them.
 */
export function focusField(fieldId: string): void {
  window.requestAnimationFrame(() => {
    const element = document.querySelector<HTMLElement>(`[data-field="${CSS.escape(fieldId)}"]`)
    if (!element) return
    element.focus()
    if (element.isContentEditable) placeCaretAtEnd(element)
  })
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

/** Moves focus to the next (or previous) editable field on the sheet, like Tab. */
export function focusAdjacentField(from: HTMLElement, direction: 1 | -1 = 1): void {
  const fields = [...document.querySelectorAll<HTMLElement>('[data-field]')]
  const next = fields[fields.indexOf(from) + direction]
  if (!next) return
  next.focus()
  if (next.isContentEditable) placeCaretAtEnd(next)
}

export const fieldIds = {
  basics: (field: string) => `basics:${field}`,
  link: (id: string) => `link:${id}`,
  section: (id: string) => `section:${id}`,
  block: (id: string, field: string) => `block:${id}:${field}`,
  item: (id: string) => `item:${id}`,
  tagInput: (blockId: string) => `tag-input:${blockId}`,
}
