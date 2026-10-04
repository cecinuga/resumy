import { storage } from '../../../lib/storage'
import { normalizeResume } from '../model/normalize'
import type { Resume } from '../model/types'

const DRAFT_KEY = 'resumy:draft'

export interface Draft {
  resume: Resume
  savedAt: number
}

/** Reads the draft kept in this browser, if any and if still valid. */
export function loadDraft(): Draft | null {
  const raw = storage.get(DRAFT_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null
    const { resume, savedAt } = parsed as { resume?: unknown; savedAt?: unknown }
    const normalized = normalizeResume(resume)
    return normalized ? { resume: normalized, savedAt: typeof savedAt === 'number' ? savedAt : Date.now() } : null
  } catch {
    return null
  }
}

/** Stores (or, for null, deletes) the draft. Returns false if the browser refused. */
export function saveDraft(resume: Resume | null, savedAt = Date.now()): boolean {
  if (!resume) {
    storage.remove(DRAFT_KEY)
    return true
  }
  return storage.set(DRAFT_KEY, JSON.stringify({ savedAt, resume }))
}
