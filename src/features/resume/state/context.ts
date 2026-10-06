import { createContext, useContext } from 'react'
import type { Resume } from '../model/types'
import type { ResumeAction } from './reducer'

export interface ResumeState {
  resume: Resume | null
  canUndo: boolean
  canRedo: boolean
  /** When the draft was last written to this browser's storage. */
  savedAt: number | null
  /** True from an edit until it is written to storage (a short pause after typing stops). */
  saving: boolean
  /** True when the browser refused to store the draft (private mode, quota). */
  saveFailed: boolean
}

export interface ResumeActions {
  dispatch: (action: ResumeAction) => void
  /** Replaces the whole resume (new, imported, or null to discard) and resets history. */
  load: (resume: Resume | null) => void
  undo: () => void
  redo: () => void
}

// State and actions live in separate contexts so components that only
// dispatch do not re-render on every keystroke.
export const ResumeStateContext = createContext<ResumeState | null>(null)
export const ResumeActionsContext = createContext<ResumeActions | null>(null)

export function useResumeState(): ResumeState {
  const value = useContext(ResumeStateContext)
  if (!value) throw new Error('useResumeState must be used inside <ResumeProvider>')
  return value
}

export function useResumeActions(): ResumeActions {
  const value = useContext(ResumeActionsContext)
  if (!value) throw new Error('useResumeActions must be used inside <ResumeProvider>')
  return value
}

/** The resume being edited; only for components rendered while one exists. */
export function useResume(): Resume {
  const { resume } = useResumeState()
  if (!resume) throw new Error('useResume needs a loaded resume')
  return resume
}
