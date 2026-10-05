/**
 * Turns positioned text fragments (as pdf.js reports them) into lines of
 * text. Kept free of pdf.js itself so it can be tested with plain data.
 */

/** A run of text drawn at one position. Coordinates are in points, from the page's top-left corner. */
export interface TextFragment {
  text: string
  x: number
  /** Baseline, measured from the top of the page. */
  y: number
  width: number
  fontSize: number
  bold: boolean
  /** pdf.js marks the last fragment of a visual line. */
  endsLine: boolean
}

export interface TextLine {
  /** The whole line, segments joined by a space. */
  text: string
  /**
   * Parts of the line separated by wide gaps, e.g. a job title and its
   * right-aligned dates. A line without such gaps has one segment.
   */
  segments: string[]
  page: number
  x: number
  /** Right edge of the last fragment. */
  right: number
  /** Baseline from the top of the page. */
  y: number
  fontSize: number
  bold: boolean
}

/** Gaps wider than this many font sizes split a line into segments. */
const SEGMENT_GAP = 1.8
/** Gaps wider than this get a space if the text has none. */
const WORD_GAP = 0.12
/** Baselines closer than this (in font sizes) belong to the same line. */
const BASELINE_TOLERANCE = 0.45

interface Run {
  fragments: TextFragment[]
  page: number
}

/** A filled shape or small image on the page, in the same coordinates as fragments (top of the box in `y`). */
export interface Shape {
  x: number
  y: number
  width: number
  height: number
}

/** A bullet is a dot or square between these sizes, in font sizes of its text. */
const BULLET_SIZE = { min: 0.15, max: 0.7 }
/** Widest gap between a bullet and its text, in font sizes. */
const BULLET_GAP = 2.5

/**
 * Bullets drawn as shapes (web pages printed to PDF, some Word files) carry
 * no text. A small dot or square just before the first text of a line
 * becomes a "•" fragment, so the line reads as a bullet like any other.
 * Several dots on one line are icons or rating dots, not bullets.
 */
export function addShapeBullets(fragments: readonly TextFragment[], shapes: readonly Shape[]): TextFragment[] {
  const visible = fragments.filter((fragment) => fragment.text.trim())
  const sameLine = (a: TextFragment, b: TextFragment) =>
    Math.abs(a.y - b.y) <= Math.max(a.fontSize, b.fontSize) * BASELINE_TOLERANCE

  // Each dot, with the text right after it.
  const dots: { shape: Shape; text: TextFragment }[] = []
  for (const shape of shapes) {
    const centerY = shape.y + shape.height / 2
    const right = shape.x + shape.width
    let text: TextFragment | null = null
    for (const fragment of visible) {
      const size = fragment.fontSize
      const isDot =
        Math.min(shape.width, shape.height) >= size * BULLET_SIZE.min &&
        Math.max(shape.width, shape.height) <= size * BULLET_SIZE.max &&
        Math.max(shape.width, shape.height) <= Math.min(shape.width, shape.height) * 2
      // Bullets sit between the baseline and the top of lowercase letters.
      const onLine = centerY <= fragment.y + size * 0.1 && centerY >= fragment.y - size * 0.8
      const gap = fragment.x - right
      if (isDot && onLine && gap >= -0.5 && gap <= size * BULLET_GAP && (!text || gap < text.x - right)) text = fragment
    }
    if (text) dots.push({ shape, text })
  }

  const bullets = new Map<TextFragment, Shape>()
  for (const { shape, text } of dots) {
    const alone = dots.filter((dot) => sameLine(dot.text, text)).length === 1
    // Text just before the dot means it sits inside a line rather than starting it.
    const startsLine = !visible.some(
      (fragment) => sameLine(fragment, text) && fragment.x < shape.x && fragment.x > shape.x - text.fontSize * 3,
    )
    if (alone && startsLine) bullets.set(text, shape)
  }

  return fragments.flatMap((fragment) => {
    const shape = bullets.get(fragment)
    if (!shape) return [fragment]
    const bullet: TextFragment = { ...fragment, text: '•', x: shape.x, width: shape.width, bold: false, endsLine: false }
    return [bullet, fragment]
  })
}

/**
 * Groups fragments into lines, keeping the content-stream order, which is
 * the reading order for virtually every resume generator. A new line starts
 * when the baseline moves or the text jumps back to the left.
 */
export function groupIntoLines(fragments: readonly TextFragment[], page: number): TextLine[] {
  const lines: TextLine[] = []
  let run: Run | null = null

  const flush = () => {
    const line = run && buildLine(run)
    if (line) lines.push(line)
    run = null
  }

  for (const fragment of fragments) {
    const previous: TextFragment | undefined = run?.fragments.at(-1)
    if (previous && !continuesLine(previous, fragment)) flush()
    if (!run) {
      if (!fragment.text.trim()) continue
      run = { fragments: [], page }
    }
    run.fragments.push(fragment)
    if (fragment.endsLine) flush()
  }
  flush()
  return lines
}

function continuesLine(previous: TextFragment, next: TextFragment): boolean {
  const size = Math.max(previous.fontSize, next.fontSize, 1)
  const sameBaseline = Math.abs(previous.y - next.y) <= size * BASELINE_TOLERANCE
  const movesBack = next.x < previous.x - size * 0.5
  return sameBaseline && !movesBack
}

function buildLine({ fragments, page }: Run): TextLine | null {
  const visible = fragments.filter((fragment) => fragment.text.trim())
  const first = visible[0]
  if (!first) return null

  const segments: string[] = []
  let segment = ''
  let previous: TextFragment | null = null
  let wideGap = false
  for (const fragment of fragments) {
    const size = Math.max(previous?.fontSize ?? 0, fragment.fontSize, 1)
    if (!fragment.text.trim()) {
      // pdf.js reports tabs and right-aligned gaps as wide whitespace items.
      if (fragment.width > size * SEGMENT_GAP) wideGap = true
      else if (segment && !/\s$/.test(segment)) segment += ' '
      continue
    }
    if (previous) {
      const gap = fragment.x - (previous.x + previous.width)
      if ((wideGap || gap > size * SEGMENT_GAP) && segment.trim()) {
        segments.push(segment)
        segment = ''
      } else if (gap > size * WORD_GAP && !/\s$/.test(segment) && !/^\s/.test(fragment.text)) {
        segment += ' '
      }
    }
    segment += fragment.text
    previous = fragment
    wideGap = false
  }
  segments.push(segment)

  const cleaned = segments.map(cleanText).filter(Boolean)
  if (cleaned.length === 0) return null

  // Font size and weight of the line follow the majority of its characters.
  let boldChars = 0
  let totalChars = 0
  const sizeWeights = new Map<number, number>()
  for (const fragment of visible) {
    const chars = fragment.text.trim().length
    totalChars += chars
    if (fragment.bold) boldChars += chars
    const size = Math.round(fragment.fontSize * 2) / 2
    sizeWeights.set(size, (sizeWeights.get(size) ?? 0) + chars)
  }
  const fontSize = [...sizeWeights.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? first.fontSize
  const last = visible.at(-1) ?? first

  return {
    text: cleaned.join(' '),
    segments: cleaned,
    page,
    x: first.x,
    right: last.x + last.width,
    y: first.y,
    fontSize,
    bold: boldChars * 2 > totalChars,
  }
}

/** Collapses whitespace and drops invisible characters. */
export function cleanText(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const PAGE_NUMBER = /^(?:page\s*)?\d{1,3}(?:\s*(?:of|\/|di)\s*\d{1,3})?$/i

/**
 * Drops page furniture: page numbers, and running headers or footers that
 * repeat on every page (often the name, or "Curriculum vitae").
 */
export function removePageFurniture(lines: readonly TextLine[], pageCount: number): TextLine[] {
  const withoutNumbers = lines.filter((line) => !PAGE_NUMBER.test(line.text))
  if (pageCount < 2) return withoutNumbers

  const pagesByText = new Map<string, Set<number>>()
  for (const line of withoutNumbers) {
    const key = line.text.toLowerCase()
    const pages = pagesByText.get(key) ?? new Set<number>()
    pages.add(line.page)
    pagesByText.set(key, pages)
  }
  const seen = new Set<string>()
  return withoutNumbers.filter((line) => {
    const key = line.text.toLowerCase()
    const repeated = (pagesByText.get(key)?.size ?? 0) === pageCount
    // Keep the first occurrence: on page one it may well be the real name.
    if (!repeated) return true
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
