import { createContext, useContext } from 'react'
import type { ImportSource } from '../import/importResume'
import type { Block, EntryBlock, Id, Resume } from '../resume/model/types'

/**
 * What the editor points out right after an upload. A PDF made by Resumy
 * comes back exactly; any other PDF is read from its layout, and entries
 * that look misread are marked for a second look until they are edited.
 */
export interface ImportReview {
  source: ImportSource
  /** Entries to check, as they were imported: once edited, the mark goes. */
  flagged: ReadonlyMap<Id, Block>
}

const sentenceWords = 10

/** An entry that reads oddly: a sentence as its title, a lone title, or bullets with no title at all. */
function looksMisread(entry: EntryBlock): boolean {
  const title = entry.title.trim()
  const words = title.split(/\s+/).filter(Boolean).length
  const sentenceTitle = words > sentenceWords || /[.!?]$/.test(title) || /^\p{Ll}/u.test(title)
  const loneTitle = Boolean(title) && !entry.subtitle && !entry.date && !entry.location && entry.items.length === 0
  const untitled = !title && !entry.subtitle && entry.items.length > 0
  return sentenceTitle || loneTitle || untitled
}

export function reviewImport(resume: Resume, source: ImportSource): ImportReview {
  const flagged = new Map<Id, Block>()
  if (source === 'layout') {
    for (const section of resume.sections) {
      for (const block of section.blocks) if (block.type === 'entry' && looksMisread(block)) flagged.set(block.id, block)
    }
  }
  return { source, flagged }
}

/** Handed from the upload to the editor that opens next. */
let latest: ImportReview | null = null

export function announceImport(review: ImportReview | null): void {
  latest = review
}

/** The review for the editor that just opened (read in a state initializer: it stays until clearImportReview). */
export function peekImportReview(): ImportReview | null {
  return latest
}

export function clearImportReview(): void {
  latest = null
}

/** The entries to mark on the sheet. */
export const ReviewContext = createContext<ReadonlyMap<Id, Block>>(new Map())

export function useNeedsReview(block: Block): boolean {
  return useContext(ReviewContext).get(block.id) === block
}
