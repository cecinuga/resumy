/**
 * Private application data inside a PDF, stored where the PDF standard
 * provides for it (ISO 32000-1, 14.5): a data dictionary under the document
 * catalog's /PieceInfo, pointing to a stream. Viewers and text extractors
 * ignore it, so the pages read exactly the same.
 *
 * The data is added as an incremental update: the original bytes are kept
 * as they are, followed by the new objects, a cross-reference section for
 * them and a trailer that points back to the original one.
 */

export interface PrivateData {
  bytes: Uint8Array<ArrayBuffer>
  /** The stream filter, e.g. "FlateDecode" for zlib-compressed bytes. */
  filter?: string
}

/** The bytes as a string of one character per byte, so offsets in the string are offsets in the file. */
function binaryString(bytes: Uint8Array): string {
  let text = ''
  for (let start = 0; start < bytes.length; start += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(start, start + 0x8000))
  }
  return text
}

/** "(D:20261005213000Z)" */
function pdfDate(date: Date): string {
  return `(D:${date.toISOString().replace(/[-:T]/g, '').slice(0, 14)}Z)`
}

const pad = (value: number, width: number) => String(value).padStart(width, '0')

/** The inverse of binaryString. */
const bytesOf = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0))

/**
 * Appends `data` to a PDF under the name `owner` (letters only). Returns
 * null when the file isn't laid out the way this expects (a single classic
 * cross-reference table, no encryption, no existing /PieceInfo): the caller
 * then keeps the PDF unchanged.
 */
export function appendPrivateData(pdf: Uint8Array, owner: string, data: PrivateData): Uint8Array<ArrayBuffer> | null {
  const text = binaryString(pdf)
  const tail = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(text.slice(-1024))
  if (!tail) return null
  const previousXref = Number(tail[1])
  if (!text.startsWith('xref', previousXref)) return null

  const trailerStart = text.indexOf('trailer', previousXref)
  const trailerEnd = text.indexOf('startxref', trailerStart)
  if (trailerStart === -1 || trailerEnd === -1) return null
  const trailer = text.slice(trailerStart, trailerEnd)
  const size = /\/Size\s+(\d+)/.exec(trailer)
  const root = /\/Root\s+(\d+)\s+(\d+)\s+R/.exec(trailer)
  if (!size || !root || /\/Encrypt\b/.test(trailer)) return null
  const info = /\/Info\s+\d+\s+\d+\s+R/.exec(trailer)?.[0]
  const id = /\/ID\s*\[[^\]]*\]/.exec(trailer)?.[0]

  // The catalog's offset, from the cross-reference table.
  const rootNumber = Number(root[1])
  const rootGeneration = Number(root[2])
  let catalogOffset = -1
  let next = 0
  for (const line of text.slice(previousXref + 4, trailerStart).split(/\r\n|\r|\n/)) {
    const subsection = /^\s*(\d+)\s+\d+\s*$/.exec(line)
    const entry = /^(\d{10}) (\d{5}) ([nf])/.exec(line)
    if (entry) {
      if (next === rootNumber && entry[3] === 'n') catalogOffset = Number(entry[1])
      next += 1
    } else if (subsection) {
      next = Number(subsection[1])
    }
  }
  if (catalogOffset === -1 || !text.startsWith(`${rootNumber} ${rootGeneration} obj`, catalogOffset)) return null
  const catalogEnd = text.indexOf('endobj', catalogOffset)
  const catalog = text.slice(text.indexOf('obj', catalogOffset) + 3, catalogEnd).trim()
  if (!catalog.startsWith('<<') || !catalog.endsWith('>>') || catalog.includes('/PieceInfo')) return null

  const dataNumber = Number(size[1])
  const parts: Uint8Array[] = [pdf]
  let length = pdf.length
  const write = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? bytesOf(part) : part
    parts.push(bytes)
    length += bytes.length
  }

  write('\n')
  const dataOffset = length
  write(`${dataNumber} 0 obj\n<<\n/Length ${data.bytes.length}${data.filter ? `\n/Filter /${data.filter}` : ''}\n>>\nstream\n`)
  write(data.bytes)
  write('\nendstream\nendobj\n')

  const newCatalogOffset = length
  const pieceInfo = `/PieceInfo <<\n/${owner} <<\n/LastModified ${pdfDate(new Date())}\n/Private ${dataNumber} 0 R\n>>\n>>`
  write(`${rootNumber} ${rootGeneration} obj\n${catalog.slice(0, -2).trimEnd()}\n${pieceInfo}\n>>\nendobj\n`)

  const xrefOffset = length
  write(
    [
      'xref',
      `${rootNumber} 1`,
      // Entries are exactly 20 bytes, ending in a space and a line feed.
      `${pad(newCatalogOffset, 10)} ${pad(rootGeneration, 5)} n `,
      `${dataNumber} 1`,
      `${pad(dataOffset, 10)} 00000 n `,
      'trailer',
      '<<',
      `/Size ${dataNumber + 1}`,
      `/Root ${rootNumber} ${rootGeneration} R`,
      ...(info ? [info] : []),
      ...(id ? [id] : []),
      `/Prev ${previousXref}`,
      '>>',
      'startxref',
      String(xrefOffset),
      '%%EOF\n',
    ].join('\n'),
  )

  const result = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

/** Reads back the data stored under `owner`, or null when there is none. */
export function readPrivateData(pdf: Uint8Array, owner: string): PrivateData | null {
  const text = binaryString(pdf)
  const references = [...text.matchAll(new RegExp(`/${owner}\\s*<<[^>]*?/Private\\s+(\\d+)\\s+(\\d+)\\s+R`, 'g'))]
  const reference = references.at(-1)
  if (!reference) return null

  // The latest definition of that object wins, as in any incremental update.
  const objects = [...text.matchAll(new RegExp(`(?:^|[\\r\\n])${reference[1]}\\s+${reference[2]}\\s+obj\\s*<<([\\s\\S]*?)>>\\s*stream\\r?\\n`, 'g'))]
  const object = objects.at(-1)
  if (!object || object.index === undefined) return null
  const dictionary = object[1] ?? ''
  const streamLength = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(dictionary)
  if (!streamLength) return null
  const start = object.index + object[0].length
  const end = start + Number(streamLength[1])
  if (end > pdf.length) return null
  const filter = /\/Filter\s*\/(\w+)/.exec(dictionary)?.[1]
  return { bytes: pdf.slice(start, end), ...(filter && { filter }) }
}
