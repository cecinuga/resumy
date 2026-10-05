// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { appendPrivateData, readPrivateData } from './pdfPrivateData'

const latin1 = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1')

/** A minimal one-page PDF laid out like react-pdf's: classic cross-reference table, catalog with nested dictionaries. */
function minimalPdf(): Uint8Array {
  const objects = [
    '<<\n/Type /Catalog\n/Pages 2 0 R\n/ViewerPreferences <<\n/DisplayDocTitle true\n>>\n>>',
    '<<\n/Type /Pages\n/Count 1\n/Kids [3 0 R]\n>>',
    '<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 595 842]\n>>',
    '<<\n/Title (Test)\n>>',
  ]
  let text = '%PDF-1.3\n'
  const offsets = objects.map((body, index) => {
    const offset = text.length
    text += `${index + 1} 0 obj\n${body}\nendobj\n`
    return offset
  })
  const xref = text.length
  text += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  text += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  text += `trailer\n<<\n/Size ${objects.length + 1}\n/Root 1 0 R\n/Info 4 0 R\n>>\nstartxref\n${xref}\n%%EOF\n`
  return Uint8Array.from(Buffer.from(text, 'latin1'))
}

const data = { bytes: Uint8Array.from([0, 1, 2, 250, 255, 10, 13]), filter: 'FlateDecode' }

describe('appendPrivateData', () => {
  it('stores data that readPrivateData gets back unchanged', () => {
    const updated = appendPrivateData(minimalPdf(), 'Resumy', data)
    expect(updated).not.toBeNull()
    expect(readPrivateData(updated!, 'Resumy')).toEqual(data)
  })

  it('keeps the original bytes and appends a valid incremental update', () => {
    const original = minimalPdf()
    const updated = appendPrivateData(original, 'Resumy', data)!
    const text = latin1(updated)
    expect(text.startsWith(latin1(original))).toBe(true)

    const xref = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(text)?.[1])
    expect(text.startsWith('xref\n', xref)).toBe(true)
    const section = text.slice(xref, text.indexOf('trailer', xref))
    // Every entry is 20 bytes and points at the object it names.
    for (const [, first, offset] of section.matchAll(/(\d+) 1\n(\d{10}) 00000 n \n/g)) {
      expect(text.startsWith(`${first} 0 obj`, Number(offset))).toBe(true)
    }
    const trailer = text.slice(text.indexOf('trailer', xref))
    expect(trailer).toContain(`/Prev ${/startxref\n(\d+)/.exec(latin1(original))?.[1]}`)
    expect(trailer).toContain('/Size 6')
    expect(trailer).toContain('/Info 4 0 R')
    // The catalog keeps its entries, nested dictionaries included.
    expect(text).toMatch(/1 0 obj\n<<\n\/Type \/Catalog\n\/Pages 2 0 R\n\/ViewerPreferences <<\n\/DisplayDocTitle true\n>>\n\/PieceInfo <<\n\/Resumy <<\n\/LastModified \(D:\d{14}Z\)\n\/Private 5 0 R\n>>\n>>\n>>\nendobj/)
  })

  it('leaves alone PDFs it cannot update safely', () => {
    const once = appendPrivateData(minimalPdf(), 'Resumy', data)!
    expect(appendPrivateData(once, 'Resumy', data)).toBeNull()
    const encrypted = latin1(minimalPdf()).replace('/Info 4 0 R', '/Info 4 0 R\n/Encrypt 9 0 R')
    expect(appendPrivateData(Uint8Array.from(Buffer.from(encrypted, 'latin1')), 'Resumy', data)).toBeNull()
    expect(appendPrivateData(Uint8Array.from(Buffer.from('%PDF-1.7\nnot really')), 'Resumy', data)).toBeNull()
  })
})

describe('readPrivateData', () => {
  it('finds nothing in a PDF without data, or with data of another owner', () => {
    expect(readPrivateData(minimalPdf(), 'Resumy')).toBeNull()
    expect(readPrivateData(appendPrivateData(minimalPdf(), 'Other', data)!, 'Resumy')).toBeNull()
  })
})
