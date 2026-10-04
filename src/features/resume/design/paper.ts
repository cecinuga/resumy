import type { PaperSize, TextSize } from '../model/types'

/** Page sizes in PDF points (1/72 inch). */
export const PAPER_SIZES: Record<PaperSize, { label: string; width: number; height: number }> = {
  a4: { label: 'A4', width: 595.28, height: 841.89 },
  letter: { label: 'US Letter', width: 612, height: 792 },
}

/** Body font size in points. */
export const TEXT_SIZES: Record<TextSize, { label: string; points: number }> = {
  small: { label: 'Small', points: 9.5 },
  medium: { label: 'Medium', points: 10.5 },
  large: { label: 'Large', points: 11.5 },
}

/** North America prints on Letter; most of the world uses A4. */
export function defaultPaperSize(locale: string): PaperSize {
  return /-(US|CA|MX)$/i.test(locale) ? 'letter' : 'a4'
}
