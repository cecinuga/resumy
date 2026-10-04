import { pdf } from '@react-pdf/renderer'
import type { Resume } from '../resume/model/types'
import { registerPdfFonts } from './pdfFonts'
import { ResumeDocument } from './ResumeDocument'

// Font files are emitted by Vite as hashed assets; this maps file names to their URLs.
const FONT_URLS = import.meta.glob<string>(
  '/node_modules/@fontsource/{source-sans-3,inter,nunito-sans,source-serif-4,eb-garamond}/files/*-{latin,latin-ext}-{400,700}-{normal,italic}.woff',
  { query: '?url', import: 'default', eager: true },
)

function fontUrl(fileName: string, packageName: string): string {
  const url = FONT_URLS[`/node_modules/@fontsource/${packageName}/files/${fileName}`]
  if (!url) throw new Error(`Missing font file ${fileName}`)
  return url
}

/** Renders the resume to a PDF blob. Loaded on demand: react-pdf is large. */
export async function renderResumePdf(resume: Resume): Promise<Blob> {
  registerPdfFonts(fontUrl)
  return pdf(<ResumeDocument resume={resume} />).toBlob()
}
