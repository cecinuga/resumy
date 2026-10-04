import type { TextLine } from '../features/import/textLines'

interface LineOptions {
  size?: number
  bold?: boolean
  x?: number
  /** Right edge; defaults to a rough width for the text. */
  right?: number
  /** Extra parts separated by wide gaps, e.g. a right-aligned date. */
  aside?: string
  /** Vertical distance from the previous line. */
  gap?: number
}

/** The right margin of the fake page; full lines reach it. */
export const PAGE_RIGHT = 540

/** Builds the lines of a fake one-page PDF, top to bottom. */
export function lines(...specs: (string | [string, LineOptions])[]): TextLine[] {
  let y = 40
  return specs.map((spec) => {
    const [text, options] = typeof spec === 'string' ? [spec, {}] : spec
    const size = options.size ?? 10
    y += options.gap ?? size * 1.5
    const segments = options.aside ? [text, options.aside] : [text]
    const x = options.x ?? 50
    return {
      text: segments.join(' '),
      segments,
      page: 1,
      x,
      right: options.aside ? PAGE_RIGHT : (options.right ?? Math.min(PAGE_RIGHT, x + text.length * size * 0.48)),
      y,
      fontSize: size,
      bold: options.bold ?? false,
    }
  })
}

export const heading = (text: string): [string, LineOptions] => [text, { size: 12, bold: true, gap: 26 }]
export const full = (text: string, options: LineOptions = {}): [string, LineOptions] => [text, { ...options, right: PAGE_RIGHT }]
