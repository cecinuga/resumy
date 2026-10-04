export const MAX_PDF_BYTES = 10 * 1024 * 1024

/** "%PDF-" */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] as const

const isDigit = (byte: number | undefined) => byte !== undefined && byte >= 0x30 && byte <= 0x39

/**
 * True when the bytes start with a PDF header: the "%PDF-" magic number
 * followed by a version such as "1.7" or "2.0". File names and MIME types
 * can lie; these bytes are what a PDF reader actually checks.
 */
export function hasPdfSignature(bytes: Uint8Array): boolean {
  return PDF_MAGIC.every((byte, index) => bytes[index] === byte) && isDigit(bytes[5]) && bytes[6] === 0x2e && isDigit(bytes[7])
}

export type PdfCheck = { ok: true } | { ok: false; reason: 'not_pdf' | 'too_large' }

export async function checkPdfFile(file: Blob): Promise<PdfCheck> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  if (!hasPdfSignature(head)) return { ok: false, reason: 'not_pdf' }
  if (file.size > MAX_PDF_BYTES) return { ok: false, reason: 'too_large' }
  return { ok: true }
}
