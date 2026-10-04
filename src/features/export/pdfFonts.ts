import { Font } from '@react-pdf/renderer'
import { RESUME_FONTS, type ResumeFont } from '../resume/design/fonts'

/**
 * Fonts are embedded in the PDF (subsetted to the glyphs used) so the text
 * extracts exactly, which is what ATS software reads. Each family is split by
 * @fontsource into a Latin and a Latin Extended file; the second is
 * registered as a fallback family so names like "Łukasz" render too.
 */

/** Maps a font file name such as "inter-latin-400-normal.woff" to a loadable source. */
export type FontFileResolver = (fileName: string, packageName: string) => string

const FACES = [
  { weight: 400, style: 'normal' },
  { weight: 400, style: 'italic' },
  { weight: 700, style: 'normal' },
  { weight: 700, style: 'italic' },
] as const

const SUBSETS = ['latin', 'latin-ext'] as const

/** The @fontsource package of each resume font. */
const PACKAGES: Record<ResumeFont['id'], string> = {
  'source-sans': 'source-sans-3',
  inter: 'inter',
  'nunito-sans': 'nunito-sans',
  'source-serif': 'source-serif-4',
  'eb-garamond': 'eb-garamond',
}

export function extendedFamily(font: ResumeFont): string {
  return `${font.family} Extended`
}

let registered = false

export function registerPdfFonts(resolve: FontFileResolver): void {
  if (registered) return
  for (const font of RESUME_FONTS) {
    const packageName = PACKAGES[font.id]
    SUBSETS.forEach((subset) => {
      Font.register({
        family: subset === 'latin' ? font.family : extendedFamily(font),
        fonts: FACES.map(({ weight, style }) => ({
          src: resolve(`${packageName}-${subset}-${weight}-${style}.woff`, packageName),
          fontWeight: weight,
          fontStyle: style,
        })),
      })
    })
  }
  // Hyphenated words come out split in two when the PDF text is extracted.
  Font.registerHyphenationCallback((word) => [word])
  registered = true
}
