import type { UploadOutcome } from '../../lib/analytics'
import type { Resume } from '../resume/model/types'
import { parseResume } from './parseResume'
import { checkPdfFile } from './validatePdf'

export type ImportFailure = Exclude<UploadOutcome, 'success'>

/**
 * Where an imported resume came from: restored exactly from the data inside
 * a PDF that Resumy made, or read from the page layout, which deserves a
 * second look.
 */
export type ImportSource = 'resumy' | 'layout'

export type ImportResult = { ok: true; resume: Resume; source: ImportSource } | { ok: false; reason: ImportFailure }

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
 * A PDF that Resumy made carries the resume itself, which is used as long
 * as the PDF still prints the same text.
 */
export async function importResumeFromFile(file: Blob): Promise<ImportResult> {
  const check = await checkPdfFile(file)
  if (!check.ok) return check

  try {
    const [{ readPdfLines }, { readEmbeddedResume }] = await Promise.all([
      import('./pdfText'),
      import('../resume/model/embed'),
    ])
    const bytes = new Uint8Array(await file.arrayBuffer())
    // Before pdf.js, which takes the buffer over.
    const embedded = await readEmbeddedResume(bytes)
    const lines = await readPdfLines(bytes)
    if (!lines.some((line) => /\p{L}{2,}/u.test(line.text))) return { ok: false, reason: 'no_text' }
    if (embedded?.matches(lines.map((line) => line.text).join('\n'))) {
      return { ok: true, resume: embedded.resume, source: 'resumy' }
    }
    return { ok: true, resume: parseResume(lines), source: 'layout' }
  } catch (error) {
    const isLocked = error instanceof Error && error.name === 'PasswordException'
    return { ok: false, reason: isLocked ? 'protected' : 'unreadable' }
  }
}
