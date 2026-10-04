import type { UploadOutcome } from '../../lib/analytics'
import type { Resume } from '../resume/model/types'
import { parseResume } from './parseResume'
import { checkPdfFile } from './validatePdf'

export type ImportFailure = Exclude<UploadOutcome, 'success'>

export type ImportResult = { ok: true; resume: Resume } | { ok: false; reason: ImportFailure }

export const IMPORT_ERROR_MESSAGES: Record<ImportFailure, string> = {
  not_pdf: "That file isn't a PDF. Please choose a .pdf file.",
  too_large: 'That PDF is larger than 10 MB. Please choose a smaller file.',
  no_text: "We couldn't find any text in that PDF. It may be a scanned image; you can start from scratch instead.",
  protected: 'That PDF is password protected. Remove the password and try again.',
  unreadable: "We couldn't read that PDF. It may be damaged; try exporting it again.",
}

/**
 * Reads a resume PDF entirely in the browser: validates its signature,
 * extracts the text with pdf.js (loaded on demand) and maps it to a resume.
 */
export async function importResumeFromFile(file: Blob): Promise<ImportResult> {
  const check = await checkPdfFile(file)
  if (!check.ok) return check

  try {
    const { readPdfLines } = await import('./pdfText')
    const lines = await readPdfLines(new Uint8Array(await file.arrayBuffer()))
    if (!lines.some((line) => /\p{L}{2,}/u.test(line.text))) return { ok: false, reason: 'no_text' }
    return { ok: true, resume: parseResume(lines) }
  } catch (error) {
    const isLocked = error instanceof Error && error.name === 'PasswordException'
    return { ok: false, reason: isLocked ? 'protected' : 'unreadable' }
  }
}
