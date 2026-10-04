import type { getDocument as GetDocument, PDFPageProxy } from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import { groupIntoLines, removePageFurniture, type TextFragment, type TextLine } from './textLines'

/** A resume never needs more pages than this; the rest is ignored. */
const MAX_PAGES = 10

const BOLD_FONT = /bold|black|heavy|semibold|demi/i

/**
 * Extracts positioned lines of text from a PDF. pdf.js is passed in so the
 * browser can use its worker build and tests can use the Node build.
 */
export async function extractTextLines(getDocument: typeof GetDocument, data: Uint8Array): Promise<TextLine[]> {
  const task = getDocument({
    data,
    // Font names (e.g. "Calibri-Bold") tell headings and titles apart.
    fontExtraProperties: true,
    disableFontFace: true,
    useSystemFonts: false,
    verbosity: 0,
  })

  try {
    const pdf = await task.promise
    const pageCount = Math.min(pdf.numPages, MAX_PAGES)
    const lines: TextLine[] = []
    for (let number = 1; number <= pageCount; number += 1) {
      const page = await pdf.getPage(number)
      lines.push(...groupIntoLines(await readFragments(page), number))
      page.cleanup()
    }
    return removePageFurniture(lines, pageCount)
  } finally {
    await task.destroy()
  }
}

async function readFragments(page: PDFPageProxy): Promise<TextFragment[]> {
  // Parsing the drawing operations loads the page's fonts, which exposes their names.
  await page.getOperatorList()
  const content = await page.getTextContent()
  const viewport = page.getViewport({ scale: 1 })
  const boldByFont = new Map<string, boolean>()

  const isBold = (fontName: string): boolean => {
    let bold = boldByFont.get(fontName)
    if (bold === undefined) {
      bold = false
      if (page.commonObjs.has(fontName)) {
        const font = page.commonObjs.get(fontName) as { name?: string; bold?: boolean } | null
        bold = Boolean(font?.bold) || BOLD_FONT.test(font?.name ?? '')
      }
      boldByFont.set(fontName, bold)
    }
    return bold
  }

  const fragments: TextFragment[] = []
  for (const item of content.items) {
    if (!('str' in item)) continue
    const [a, b, c, d, e, f] = (item as TextItem).transform as number[]
    // Skip rotated text, such as vertical labels in the margin.
    if (Math.abs(b ?? 0) > Math.abs(a ?? 0) * 0.1) continue
    const [x = 0, y = 0] = viewport.convertToViewportPoint(e ?? 0, f ?? 0)
    fragments.push({
      text: item.str,
      x,
      y,
      width: item.width,
      fontSize: Math.hypot(c ?? 0, d ?? 0) || Math.hypot(a ?? 0, b ?? 0),
      bold: isBold(item.fontName),
      endsLine: item.hasEOL,
    })
  }
  return fragments
}
