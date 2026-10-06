import { pdf } from '@react-pdf/renderer'
import { embedResume } from '../resume/model/embed'
import type { Resume } from '../resume/model/types'
import { registerPdfFonts } from './pdfFonts'
import { ResumeDocument } from './ResumeDocument'

// Font files are emitted by Vite as hashed assets; this maps file names to their URLs.
// Only the Latin ones are precached; other scripts are fetched (then cached) when a resume uses them.
const FONT_URLS = import.meta.glob<string>(
  '/node_modules/@fontsource/{source-sans-3,inter,nunito-sans,source-serif-4,eb-garamond}/files/*-{latin,latin-ext,vietnamese,cyrillic,cyrillic-ext,greek,greek-ext}-{400,700}-{normal,italic}.woff',
  { query: '?url', import: 'default', eager: true },
)

function fontUrl(fileName: string, packageName: string): string {
  const url = FONT_URLS[`/node_modules/@fontsource/${packageName}/files/${fileName}`]
  if (!url) throw new Error(`Missing font file ${fileName}`)
  return url
}

/**
 * Renders the resume to a PDF blob, with the resume itself stored inside so
 * that uploading the PDF again restores it exactly. Loaded on demand:
 * react-pdf is large.
 */
export async function renderResumePdf(resume: Resume): Promise<Blob> {
  registerPdfFonts(fontUrl)
  const rendered = await pdf(<ResumeDocument resume={resume} />).toBlob()
  const bytes = await embedResume(new Uint8Array(await rendered.arrayBuffer()), resume)
  return new Blob([bytes], { type: 'application/pdf' })
}
