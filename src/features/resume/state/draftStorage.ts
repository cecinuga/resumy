import { storage } from '../../../lib/storage'
import { normalizeResume } from '../model/normalize'
import type { Resume } from '../model/types'

const DRAFT_KEY = 'resumy:draft'

export interface Draft {
  resume: Resume
  savedAt: number
}

/**
 * The draft kept in this browser: 'none' when there is none, 'invalid' when
 * what is stored can't be read (corrupt, or from a newer version).
 */
export function readDraft(): Draft | 'none' | 'invalid' {
  const raw = storage.get(DRAFT_KEY)
  if (!raw) return 'none'
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return 'invalid'
    const { resume, savedAt } = parsed as { resume?: unknown; savedAt?: unknown }
    const normalized = normalizeResume(resume)
    return normalized ? { resume: normalized, savedAt: typeof savedAt === 'number' ? savedAt : Date.now() } : 'invalid'
  } catch {
    return 'invalid'
  }
}

/** Reads the draft kept in this browser, if any and if still valid. */
export function loadDraft(): Draft | null {
  const draft = readDraft()
  return typeof draft === 'string' ? null : draft
}

/** Calls `onChange` when another tab writes or deletes the draft. */
export function onDraftChangedElsewhere(onChange: () => void): () => void {
  const listener = (event: StorageEvent) => {
    // A null key means another tab cleared all of storage.
    if (event.key === DRAFT_KEY || event.key === null) onChange()
  }
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}

/** Stores (or, for null, deletes) the draft. Returns false if the browser refused. */
export function saveDraft(resume: Resume | null, savedAt = Date.now()): boolean {
  if (!resume) {
    storage.remove(DRAFT_KEY)
    return true
  }
  return storage.set(DRAFT_KEY, JSON.stringify({ savedAt, resume }))
}
