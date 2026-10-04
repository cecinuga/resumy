// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { checkPdfFile, hasPdfSignature, MAX_PDF_BYTES } from './validatePdf'

const bytes = (text: string) => new TextEncoder().encode(text)

describe('hasPdfSignature', () => {
  it.each(['%PDF-1.4\n', '%PDF-1.7', '%PDF-2.0'])('accepts %j', (header) => {
    expect(hasPdfSignature(bytes(header))).toBe(true)
  })

  it.each([
    ['an HTML page', '<html><body>'],
    ['a ZIP or DOCX file', 'PK\u0003\u0004....'],
    ['a header without a version', '%PDF-x.y'],
    ['a header that does not start the file', ' %PDF-1.7'],
    ['an empty file', ''],
  ])('rejects %s', (_, header) => {
    expect(hasPdfSignature(bytes(header))).toBe(false)
  })
})

describe('checkPdfFile', () => {
  it('trusts the bytes, not the name or MIME type', async () => {
    const disguised = new File([bytes('GIF89a...')], 'resume.pdf', { type: 'application/pdf' })
    await expect(checkPdfFile(disguised)).resolves.toEqual({ ok: false, reason: 'not_pdf' })
    const unnamed = new File([bytes('%PDF-1.7\n%âãÏÓ')], 'download', { type: '' })
    await expect(checkPdfFile(unnamed)).resolves.toEqual({ ok: true })
  })

  it('rejects PDFs over the size limit', async () => {
    const large = new Blob([bytes('%PDF-1.7\n'), new Uint8Array(MAX_PDF_BYTES)])
    await expect(checkPdfFile(large)).resolves.toEqual({ ok: false, reason: 'too_large' })
  })
})
