import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { ResumeActionsContext, ResumeStateContext, type ResumeActions, type ResumeState } from './context'
import { loadDraft, saveDraft } from './draftStorage'
import { createEditorState, editorReducer } from './history'

const SAVE_DELAY_MS = 400

/**
 * Owns the resume being edited. The draft lives only in this browser:
 * it is restored on load and saved shortly after every change.
 */
export function ResumeProvider({ children }: { children: ReactNode }) {
  const [initialDraft] = useState(loadDraft)
  const [editor, send] = useReducer(editorReducer, initialDraft?.resume ?? null, createEditorState)
  const [saveStatus, setSaveStatus] = useState({ savedAt: initialDraft?.savedAt ?? null, failed: false })

  const persisted = useRef(editor.resume)
  const latest = useRef(editor.resume)

  useEffect(() => {
    latest.current = editor.resume
    if (editor.resume === persisted.current) return
    const timer = window.setTimeout(() => {
      const savedAt = Date.now()
      const ok = saveDraft(editor.resume, savedAt)
      persisted.current = editor.resume
      setSaveStatus((previous) => ({ savedAt: ok ? savedAt : previous.savedAt, failed: !ok }))
    }, SAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [editor.resume])

  // Never lose the last keystrokes when the tab is closed or backgrounded.
  useEffect(() => {
    const flush = () => {
      if (latest.current === persisted.current) return
      saveDraft(latest.current)
      persisted.current = latest.current
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const actions = useMemo<ResumeActions>(
    () => ({
      dispatch: (action) => send({ type: 'edit', action, at: Date.now() }),
      load: (resume) => send({ type: 'load', resume }),
      undo: () => send({ type: 'undo' }),
      redo: () => send({ type: 'redo' }),
    }),
    [],
  )

  const state = useMemo<ResumeState>(
    () => ({
      resume: editor.resume,
      canUndo: editor.past.length > 0,
      canRedo: editor.future.length > 0,
      savedAt: saveStatus.savedAt,
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
