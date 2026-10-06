import { Font } from '@react-pdf/renderer'
import { RESUME_FONTS } from '../resume/design/fonts'
import { PACKAGES, subsetFamily, subsetsOf } from './fontCoverage'

/**
 * Fonts are embedded in the PDF (subsetted to the glyphs used) so the text
 * extracts exactly, which is what ATS software reads. Every script file of
 * every font is registered here; a document lists (and so downloads) only the
 * ones its text uses (see pdfFontFamilies).
 */

/** Maps a font file name such as "inter-latin-400-normal.woff" to a loadable source. */
export type FontFileResolver = (fileName: string, packageName: string) => string

const FACES = [
  { weight: 400, style: 'normal' },
  { weight: 400, style: 'italic' },
  { weight: 700, style: 'normal' },
  { weight: 700, style: 'italic' },
] as const

let registered = false
/** The families registered below, whose loaded files can be released. */
const families: string[] = []

export function registerPdfFonts(resolve: FontFileResolver): void {
  if (registered) return
  for (const font of RESUME_FONTS) {
    const packageName = PACKAGES[font.id].name
    for (const subset of subsetsOf(font)) {
      // Registering only maps names to files; nothing is fetched until a document uses the family.
      const family = subsetFamily(font, subset)
      families.push(family)
      Font.register({
        family,
        fonts: FACES.map(({ weight, style }) => ({
          src: resolve(`${packageName}-${subset}-${weight}-${style}.woff`, packageName),
          fontWeight: weight,
          fontStyle: style,
        })),
      })
    }
  }
  // Hyphenated words come out split in two when the PDF text is extracted.
  Font.registerHyphenationCallback((word) => [word])
  registered = true
}

/**
 * Lets go of the font files loaded for the last PDF. react-pdf keeps every
 * parsed font for good, megabytes that a resume builder only needs during a
 * download; the next PDF loads them again, from the browser cache. Font.reset()
 * can't be used: it keeps the finished load, so the fonts would never come back.
 */
export function releasePdfFonts(): void {
  const loaded = Font.getRegisteredFonts()
  for (const family of families) {
    for (const source of loaded[family]?.sources ?? []) {
      source.data = null
      source.loadResultPromise = null
    }
  }
}
