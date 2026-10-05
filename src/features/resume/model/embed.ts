import { appendPrivateData, readPrivateData } from '../../../lib/pdfPrivateData'
import { normalizeResume } from './normalize'
import { printableResume } from './printable'
import type { Resume } from './types'

/**
 * The resume, stored inside every PDF Resumy exports, so that uploading the
 * PDF again brings it back exactly instead of being guessed from the layout.
 * It holds what the PDF prints and nothing more (hidden sections and empty
 * fields are left out), plus the design.
 */

const OWNER = 'Resumy'
const FORMAT = 1
/** Far above any real resume, photo included: a guard against a malicious file that inflates without end. */
const MAX_BYTES = 5 * 1024 * 1024

interface Payload {
  format: typeof FORMAT
  /** Fingerprint of the printed text (see textFingerprint), to notice a PDF edited elsewhere. */
  text: string
  resume: Resume
}

/** Every piece of text the PDF prints, in any order. */
function printedText({ basics, sections }: Resume): string {
  const parts = [basics.name, basics.headline, basics.email, basics.phone, basics.location, ...basics.links.map((link) => link.text)]
  for (const section of sections) {
    parts.push(section.title)
    for (const block of section.blocks) {
      if (block.type === 'entry') parts.push(block.title, block.subtitle, block.date, block.location)
      if (block.type === 'text') parts.push(block.text)
      if (block.type === 'tags') parts.push(block.label)
      if (block.type !== 'text') parts.push(...block.items.map((item) => item.text))
    }
  }
  return parts.join('\n')
}

/**
 * The letters and digits of a text, counted. Line breaks, hyphenation,
 * separators and upper-cased headings don't change it, so the text a PDF
 * prints and the text read back from it give the same fingerprint.
 */
export function textFingerprint(text: string): string {
  const counts = new Map<string, number>()
  for (const char of text.toUpperCase()) {
    if (/[\p{L}\p{N}]/u.test(char)) counts.set(char, (counts.get(char) ?? 0) + 1)
  }
  const canonical = [...counts]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([char, count]) => `${char}${count}`)
    .join('')
  // FNV-1a: a short, stable digest of that list.
  let hash = 0x811c9dc5
  for (let index = 0; index < canonical.length; index += 1) {
    hash = Math.imul(hash ^ canonical.charCodeAt(index), 0x01000193) >>> 0
  }
  return `${canonical.length}-${hash.toString(16)}`
}

/** Runs bytes through a (de)compression stream; null past `limit` bytes. */
async function pipe(
  bytes: Uint8Array<ArrayBuffer>,
  transform: CompressionStream | DecompressionStream,
  limit: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    },
  })
  const reader = source.pipeThrough(transform).getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    length += value.length
    if (length > limit) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result
}

const canCompress = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function'

/** The PDF with the resume stored inside it; the PDF unchanged if that isn't possible. */
export async function embedResume(pdf: Uint8Array<ArrayBuffer>, resume: Resume): Promise<Uint8Array<ArrayBuffer>> {
  try {
    const printable = printableResume(resume)
    const payload: Payload = { format: FORMAT, text: textFingerprint(printedText(printable)), resume: printable }
    const json = new TextEncoder().encode(JSON.stringify(payload))
    // Compressed, the data is opaque to tools that scan a PDF's raw bytes for words.
    const compressed = canCompress() ? await pipe(json, new CompressionStream('deflate'), Infinity) : null
    const data = compressed ? { bytes: compressed, filter: 'FlateDecode' } : { bytes: json }
    return appendPrivateData(pdf, OWNER, data) ?? pdf
  } catch {
    return pdf
  }
}

export interface EmbeddedResume {
  resume: Resume
  /** Whether the PDF still prints this text, i.e. nobody edited it after Resumy made it. */
  matches: (printed: string) => boolean
}

/** The resume stored in a PDF made by Resumy, or null for any other PDF. */
export async function readEmbeddedResume(pdf: Uint8Array): Promise<EmbeddedResume | null> {
  try {
    const data = readPrivateData(pdf, OWNER)
    if (!data) return null
    let json: Uint8Array<ArrayBuffer> | null = null
    if (!data.filter) json = data.bytes.length <= MAX_BYTES ? data.bytes : null
    else if (data.filter === 'FlateDecode' && canCompress()) json = await pipe(data.bytes, new DecompressionStream('deflate'), MAX_BYTES)
    if (!json) return null

    const payload = JSON.parse(new TextDecoder().decode(json)) as Partial<Payload> | null
    if (payload?.format !== FORMAT || typeof payload.text !== 'string') return null
    const resume = normalizeResume(payload.resume)
    if (!resume) return null
    const fingerprint = payload.text
    return { resume, matches: (printed) => textFingerprint(printed) === fingerprint }
  } catch {
    return null
  }
}
