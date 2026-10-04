import type { Resume } from '../model/types'
import { coalesceKey, resumeReducer, type ResumeAction } from './reducer'

const HISTORY_LIMIT = 100
/** Pauses shorter than this keep typing in one undo step. */
const COALESCE_WINDOW_MS = 1000

export interface EditorState {
  resume: Resume | null
  past: Resume[]
  future: Resume[]
  lastEdit: { key: string; at: number } | null
}

export type EditorAction =
  | { type: 'edit'; action: ResumeAction; at: number }
  | { type: 'load'; resume: Resume | null }
  | { type: 'undo' }
  | { type: 'redo' }

export function createEditorState(resume: Resume | null): EditorState {
  return { resume, past: [], future: [], lastEdit: null }
}

/** Wraps the resume reducer with an undo/redo history. */
export function editorReducer(state: EditorState, event: EditorAction): EditorState {
  switch (event.type) {
    case 'load':
      return createEditorState(event.resume)

    case 'edit': {
      if (!state.resume) return state
      const next = resumeReducer(state.resume, event.action)
      if (next === state.resume) return state
      const key = coalesceKey(event.action)
      const continues =
        key !== null && state.lastEdit?.key === key && event.at - state.lastEdit.at < COALESCE_WINDOW_MS
      return {
        resume: next,
        past: continues ? state.past : [...state.past, state.resume].slice(-HISTORY_LIMIT),
        future: [],
        lastEdit: key === null ? null : { key, at: event.at },
      }
    }

    case 'undo': {
      const previous = state.past.at(-1)
      if (!previous || !state.resume) return state
      return {
        resume: previous,
        past: state.past.slice(0, -1),
        future: [state.resume, ...state.future],
        lastEdit: null,
      }
    }

    case 'redo': {
      const [next, ...rest] = state.future
      if (!next || !state.resume) return state
      return { resume: next, past: [...state.past, state.resume], future: rest, lastEdit: null }
    }
  }
}
