import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { ResumeActionsContext, ResumeStateContext, type ResumeActions, type ResumeState } from './context'
import { useDismissToasts } from '../../../components/Toast/toast'
import { loadDraft, onDraftChangedElsewhere, readDraft, saveDraft } from './draftStorage'
import { createEditorState, editorReducer } from './history'

const SAVE_DELAY_MS = 400

/**
 * Owns the resume being edited. The draft lives only in this browser:
 * it is restored on load and saved shortly after every change. Tabs share
 * it: when another tab saves, this one picks that draft up, so an old copy
 * never overwrites newer work.
 */
export function ResumeProvider({ children }: { children: ReactNode }) {
  const [initialDraft] = useState(loadDraft)
  const [editor, send] = useReducer(editorReducer, initialDraft?.resume ?? null, createEditorState)
  const [saveStatus, setSaveStatus] = useState({
    savedAt: initialDraft?.savedAt ?? null,
    failed: false,
    /** The resume the last save attempt wrote (or tried to). */
    written: editor.resume,
  })

  const persisted = useRef(editor.resume)
  const latest = useRef(editor.resume)
  /** When the draft in storage that this tab last wrote or read was saved; another value means another tab wrote. */
  const known = useRef(initialDraft?.savedAt ?? null)
  const dismissToasts = useDismissToasts()

  useEffect(() => {
    latest.current = editor.resume
    if (editor.resume === persisted.current) return
    const timer = window.setTimeout(() => {
      const savedAt = Date.now()
      const ok = saveDraft(editor.resume, savedAt)
      persisted.current = editor.resume
      if (ok) known.current = editor.resume ? savedAt : null
      setSaveStatus((previous) => ({ savedAt: ok ? savedAt : previous.savedAt, failed: !ok, written: editor.resume }))
    }, SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [editor.resume])

  // Never lose the last keystrokes when the tab is closed or backgrounded.
  useEffect(() => {
    const flush = () => {
      if (latest.current === persisted.current) return
      const savedAt = Date.now()
      if (saveDraft(latest.current, savedAt)) known.current = latest.current ? savedAt : null
      persisted.current = latest.current
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
      // A frozen or discarded tab can miss storage events: check on return.
      else syncFromStorage()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    const stopListening = onDraftChangedElsewhere(syncFromStorage)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stopListening()
    }
    // syncFromStorage only reads refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Takes over the draft another tab saved. Edits this tab hasn't saved yet
   * win instead: they are written within a moment, and the other tab then
   * takes them over in turn.
   */
  function syncFromStorage() {
    if (latest.current !== persisted.current) return
    const stored = readDraft()
    if (stored === 'invalid') return
    const savedAt = stored === 'none' ? null : stored.savedAt
    if (savedAt === known.current) return
    const resume = stored === 'none' ? null : stored.resume
    known.current = savedAt
    persisted.current = resume
    latest.current = resume
    send({ type: 'load', resume })
    setSaveStatus({ savedAt, failed: false, written: resume })
    dismissToasts()
  }

  const actions = useMemo<ResumeActions>(
    () => ({
      dispatch: (action) => send({ type: 'edit', action, at: Date.now() }),
      load: (resume) => {
        // A toast's "Undo" would bring a part of the previous resume into this one.
        dismissToasts()
        send({ type: 'load', resume })
      },
      undo: () => send({ type: 'undo' }),
      redo: () => send({ type: 'redo' }),
    }),
    [dismissToasts],
  )

  const state = useMemo<ResumeState>(
    () => ({
      resume: editor.resume,
      canUndo: editor.past.length > 0,
      canRedo: editor.future.length > 0,
      savedAt: saveStatus.savedAt,
      saving: editor.resume !== saveStatus.written,
      saveFailed: saveStatus.failed,
    }),
    [editor, saveStatus],
  )

  return (
    <ResumeActionsContext.Provider value={actions}>
      <ResumeStateContext.Provider value={state}>{children}</ResumeStateContext.Provider>
    </ResumeActionsContext.Provider>
  )
}
