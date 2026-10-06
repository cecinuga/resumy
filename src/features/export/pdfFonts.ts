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

export function registerPdfFonts(resolve: FontFileResolver): void {
  if (registered) return
  for (const font of RESUME_FONTS) {
    const packageName = PACKAGES[font.id].name
    for (const subset of subsetsOf(font)) {
      // Registering only maps names to files; nothing is fetched until a document uses the family.
      Font.register({
        family: subsetFamily(font, subset),
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
