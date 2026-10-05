import type { getDocument as GetDocument, OPS as PdfOps, PDFPageProxy } from 'pdfjs-dist'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import type { PageViewport } from 'pdfjs-dist/types/src/display/page_viewport'
import { addShapeBullets, groupIntoLines, removePageFurniture, type Shape, type TextFragment, type TextLine } from './textLines'

/** A resume never needs more pages than this; the rest is ignored. */
const MAX_PAGES = 10

const BOLD_FONT = /bold|black|heavy|semibold|demi/i

/** Shapes larger than this (in points) are never bullets; skipping them early keeps the scan cheap. */
const MAX_SHAPE_SIZE = 12

/** The parts of pdf.js this module uses, passed in so the browser can use its worker build and tests the Node build. */
export interface PdfJs {
  getDocument: typeof GetDocument
  OPS: typeof PdfOps
}

/** Extracts positioned lines of text from a PDF. */
export async function extractTextLines(pdfjs: PdfJs, data: Uint8Array): Promise<TextLine[]> {
  const task = pdfjs.getDocument({
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
      lines.push(...groupIntoLines(await readFragments(page, pdfjs.OPS), number))
      page.cleanup()
    }
    return removePageFurniture(lines, pageCount)
  } finally {
    await task.destroy()
  }
}

async function readFragments(page: PDFPageProxy, ops: typeof PdfOps): Promise<TextFragment[]> {
  // Parsing the drawing operations loads the page's fonts, which exposes their names.
  const operators = await page.getOperatorList()
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
  return addShapeBullets(fragments, findSmallShapes(operators, ops, viewport))
}

type Matrix = [number, number, number, number, number, number]

/** The transform `inner` applied first, then `outer`. */
function multiply(outer: Matrix, inner: readonly number[]): Matrix {
  const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = inner
  return [
    outer[0] * a + outer[2] * b,
    outer[1] * a + outer[3] * b,
    outer[0] * c + outer[2] * d,
    outer[1] * c + outer[3] * d,
    outer[0] * e + outer[2] * f + outer[4],
    outer[1] * e + outer[3] * f + outer[5],
  ]
}

/**
 * Small filled shapes and images on the page, where bullets drawn without
 * text are found. Follows the current transform through the drawing
 * operations to place them in page coordinates.
 */
function findSmallShapes(
  { fnArray, argsArray }: { fnArray: number[]; argsArray: unknown[] },
  ops: typeof PdfOps,
  viewport: PageViewport,
): Shape[] {
  const fills = new Set<number>([ops.fill, ops.eoFill, ops.fillStroke, ops.eoFillStroke, ops.closeFillStroke, ops.closeEOFillStroke])
  const images = new Set<number>([ops.paintImageXObject, ops.paintInlineImageXObject, ops.paintImageMaskXObject])
  const shapes: Shape[] = []
  const stack: Matrix[] = []
  let matrix: Matrix = [1, 0, 0, 1, 0, 0]

  const add = (box: readonly number[], transform: Matrix) => {
    const [x1 = 0, y1 = 0, x2 = 0, y2 = 0] = box
    const corners = [
      [x1, y1],
      [x2, y2],
      [x1, y2],
      [x2, y1],
    ].map(([x = 0, y = 0]) =>
      viewport.convertToViewportPoint(transform[0] * x + transform[2] * y + transform[4], transform[1] * x + transform[3] * y + transform[5]),
    )
    const xs = corners.map(([x = 0]) => x)
    const ys = corners.map(([, y = 0]) => y)
    const shape = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
    if (shape.width > 0 && shape.height > 0 && shape.width <= MAX_SHAPE_SIZE && shape.height <= MAX_SHAPE_SIZE) shapes.push(shape)
  }

  fnArray.forEach((fn, index) => {
    const args = argsArray[index] as unknown[] | null
    if (fn === ops.save) stack.push(matrix)
    else if (fn === ops.restore) matrix = stack.pop() ?? matrix
    else if (fn === ops.transform && args) matrix = multiply(matrix, args as number[])
    else if (fn === ops.paintFormXObjectBegin) {
      stack.push(matrix)
      if (Array.isArray(args?.[0])) matrix = multiply(matrix, args[0] as number[])
    } else if (fn === ops.paintFormXObjectEnd) matrix = stack.pop() ?? matrix
    else if (fn === ops.constructPath && args) {
      // [painting operator, path data, bounding box of the path]
      const [paint, , box] = args as [number, unknown, ArrayLike<number> | null]
      if (fills.has(paint) && box) add(Array.from(box), matrix)
    } else if (images.has(fn)) {
      // An image fills the unit square of the current transform.
      add([0, 0, 1, 1], matrix)
    }
  })
  return shapes
}
