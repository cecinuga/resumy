import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * Backspace stops at the edge of a field. Presses closer together than this
 * (a held key, quick taps) form one burst: a burst that empties a field stops
 * there, and one that left an empty field (removing it, or moving back) does
 * not go on to delete the text of the field that gets the focus. A new press
 * leaves the empty field, or deletes in the field the focus moved to.
 */
const BURST_GAP_MS = 500

/** What a Backspace press does: delete as usual, leave the empty field, or nothing. */
export type BackspaceAction = 'delete' | 'leave' | 'stop'

let lastPress = Number.NEGATIVE_INFINITY
let leftField = false

export function backspaceAction(isEmpty: boolean, canLeave: boolean, now = performance.now()): BackspaceAction {
  const continuesBurst = now - lastPress < BURST_GAP_MS
  lastPress = now
  if (!continuesBurst) leftField = false
  if (isEmpty) {
    if (!canLeave || continuesBurst) return 'stop'
    leftField = true
    return 'leave'
  }
  return continuesBurst && leftField ? 'stop' : 'delete'
}

interface BackspaceOptions {
  isEmpty: () => boolean
  /** Backspace in the empty field: remove it, or move back. Without it, the field is never left. */
  onLeave?: () => void
}

/** Applies the Backspace rule above to a text field. */
export function useBackspace(ref: RefObject<HTMLElement | null>, options: BackspaceOptions): void {
  const latest = useRef(options)
  useLayoutEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    const element = ref.current
    if (!element) return
    let sawBackspaceKey = false

    const press = (event: Event) => {
      const { isEmpty, onLeave } = latest.current
      const action = backspaceAction(isEmpty(), onLeave !== undefined)
      if (action === 'delete') return
      event.preventDefault()
      if (action === 'leave') onLeave?.()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      sawBackspaceKey = event.key === 'Backspace'
      if (sawBackspaceKey && !event.isComposing) press(event)
    }
    // Soft keyboards often send no Backspace key, only the deletion.
    const onBeforeInput = (event: InputEvent) => {
      if (!sawBackspaceKey && /^delete\w*Backward$/.test(event.inputType)) press(event)
    }

    element.addEventListener('keydown', onKeyDown)
    element.addEventListener('beforeinput', onBeforeInput)
    return () => {
      element.removeEventListener('keydown', onKeyDown)
      element.removeEventListener('beforeinput', onBeforeInput)
    }
  }, [ref])
}
