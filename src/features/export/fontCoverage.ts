import { RESUME_FONTS, type ResumeFont } from '../resume/design/fonts'

/**
 * Which characters each resume font can print in the PDF. @fontsource splits
 * every font into one file per script; the PDF registers the Latin file as
 * the family itself and each other script as a fallback family. Kept apart
 * from the react-pdf code so the editor can check a resume before loading it.
 */

/** The characters in each @fontsource file (its CSS unicode-range), in fallback order. */
const SUBSET_RANGES = {
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext':
    'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  vietnamese:
    'U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB',
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116',
  'cyrillic-ext': 'U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F',
  greek: 'U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF',
  'greek-ext': 'U+1F00-1FFF',
} as const

export type Subset = keyof typeof SUBSET_RANGES

const SUBSETS = Object.keys(SUBSET_RANGES) as Subset[]

const RANGES = Object.fromEntries(
  SUBSETS.map((subset) => [
    subset,
    SUBSET_RANGES[subset].split(',').map((range) => {
      const [start, end] = range.slice(2).split('-') as [string, string?]
      return [parseInt(start, 16), parseInt(end ?? start, 16)] as const
    }),
  ]),
) as Record<Subset, (readonly [number, number])[]>

/** The @fontsource package of each resume font, and the scripts it has no file for. */
export const PACKAGES: Record<ResumeFont['id'], { name: string; missing?: Subset[] }> = {
  'source-sans': { name: 'source-sans-3' },
  inter: { name: 'inter' },
  'nunito-sans': { name: 'nunito-sans', missing: ['greek', 'greek-ext'] },
  'source-serif': { name: 'source-serif-4', missing: ['greek-ext'] },
  'eb-garamond': { name: 'eb-garamond' },
}

export function subsetsOf(font: ResumeFont): Subset[] {
  const missing = PACKAGES[font.id].missing ?? []
  return SUBSETS.filter((subset) => !missing.includes(subset))
}

export function subsetFamily(font: ResumeFont, subset: Subset): string {
  return subset === 'latin' ? font.family : `${font.family} ${subset}`
}

/** The first of the font's files that has the character, if any. */
function subsetFor(font: ResumeFont, char: string): Subset | undefined {
  const code = char.codePointAt(0)!
  return subsetsOf(font).find((subset) => RANGES[subset].some(([start, end]) => code >= start && code <= end))
}

/**
 * The families a document needs to print `text` in this font: the Latin one,
 * then a fallback for each other script the text uses.
 */
export function pdfFontFamilies(font: ResumeFont, text: string): string[] {
  const used = new Set<Subset>(['latin'])
  for (const char of new Set(text)) {
    const subset = subsetFor(font, char)
    if (subset) used.add(subset)
  }
  return subsetsOf(font)
    .filter((subset) => used.has(subset))
    .map((subset) => subsetFamily(font, subset))
}

/** The characters of `text` this font cannot print (Chinese, Arabic, emoji…), each once. */
export function unsupportedCharacters(font: ResumeFont, text: string): string[] {
  return [...new Set(text)].filter((char) => !subsetFor(font, char))
}

/** The first resume font that can print all of `text`, if any. */
export function fontThatPrints(text: string): ResumeFont | undefined {
  return RESUME_FONTS.find((font) => unsupportedCharacters(font, text).length === 0)
}
