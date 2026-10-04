import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { extractTextLines } from './pdfExtract'
import type { TextLine } from './textLines'

// This module is imported lazily, so pdf.js only loads once a PDF is chosen.
GlobalWorkerOptions.workerSrc = workerUrl

export function readPdfLines(data: Uint8Array): Promise<TextLine[]> {
  return extractTextLines(getDocument, data)
}
