/**
 * Where the PDF's pages will break. The PDF engine moves to the next page
 * whatever doesn't fit: an entry's title lines and each bullet move whole,
 * a heading moves when too little room is left under it, and paragraphs
 * break between lines. The same rules, applied to the measured preview,
 * give the same page count and the same first element on every page.
 */

/** How a part of the resume behaves at the end of a page (the `data-break` attribute in the preview). */
export type BreakRule = 'keep' | 'heading' | 'lines'

/** A part of the resume, measured in pixels from the top of the content. */
export interface PageUnit {
  top: number
  bottom: number
  rule: BreakRule
  /** Line height, for parts that break between lines. */
  lineHeight: number
  /** The editor field that shows this part (see focus.ts), to mark the break while editing. */
  field: string | null
}

export interface PageBreak {
  /** Where the next page starts, in pixels from the top of the content. */
  at: number
  /** The field of the part the page starts with... */
  field: string | null
  /** ...and how far into that part, when a paragraph breaks between its lines. */
  offset: number
}

/** react-pdf's default: no single line of a paragraph alone on either page. */
const MIN_LINES = 2
/** Rounding slack, in pixels. */
const EPSILON = 0.5

/**
 * The page breaks of content made of `units`, in reading order, on pages
 * that hold `pageHeight` pixels each. A heading needs `headingRoom` pixels
 * of content below it on its page.
 */
export function paginate(units: readonly PageUnit[], pageHeight: number, headingRoom: number): PageBreak[] {
  const breaks: PageBreak[] = []
  // Everything from the last break on has moved down by `shift` to start a new page.
  let shift = 0
  let pageEnd = pageHeight

  for (const unit of units) {
    for (let guard = 0; guard < 100; guard += 1) {
      const top = unit.top + shift
      const bottom = unit.bottom + shift
      const needed = bottom + (unit.rule === 'heading' ? headingRoom : 0)
      if (needed <= pageEnd + EPSILON) break

      let start = top
      if (top >= pageEnd - EPSILON) {
        // Starts in the margin below the page end: the page breaks before it, nothing moves.
        start = pageEnd
      } else if (unit.rule === 'lines' && unit.lineHeight > 0) {
        const total = Math.round((bottom - top) / unit.lineHeight)
        let fit = Math.floor((pageEnd - top + EPSILON) / unit.lineHeight)
        if (total - fit < MIN_LINES) fit = total - MIN_LINES
        if (fit < MIN_LINES) fit = 0
        start = top + fit * unit.lineHeight
      } else if (bottom - top > pageHeight) {
        // Taller than a page: it can't move whole, so it splits at the page end.
        start = pageEnd
      }

      breaks.push({ at: start - shift, field: unit.field, offset: Math.max(0, start - top) })
      shift += pageEnd - start
      pageEnd += pageHeight
    }
  }
  return breaks
}

/**
 * Reads the parts of a rendered preview and their positions: elements with
 * `data-break` (a BreakRule) and `data-for` (the field they show).
 */
export function measureUnits(content: HTMLElement): PageUnit[] {
  const origin = content.getBoundingClientRect().top
  return [...content.querySelectorAll<HTMLElement>('[data-break]')].map((element) => {
    const box = element.getBoundingClientRect()
    return {
      top: box.top - origin,
      bottom: box.bottom - origin,
      rule: element.dataset.break as BreakRule,
      lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight) || 0,
      field: element.dataset.for ?? null,
    }
  })
}
