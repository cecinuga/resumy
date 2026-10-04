import type { FontId } from '../model/types'

export interface ResumeFont {
  id: FontId
  label: string
  /** CSS family name, as declared by @fontsource. */
  family: string
  category: 'sans-serif' | 'serif'
}

export const RESUME_FONTS: readonly ResumeFont[] = [
  { id: 'source-sans', label: 'Source Sans', family: 'Source Sans 3', category: 'sans-serif' },
  { id: 'inter', label: 'Inter', family: 'Inter', category: 'sans-serif' },
  { id: 'nunito-sans', label: 'Nunito Sans', family: 'Nunito Sans', category: 'sans-serif' },
  { id: 'source-serif', label: 'Source Serif', family: 'Source Serif 4', category: 'serif' },
  { id: 'eb-garamond', label: 'EB Garamond', family: 'EB Garamond', category: 'serif' },
]

export function getResumeFont(id: FontId): ResumeFont {
  return RESUME_FONTS.find((font) => font.id === id) ?? RESUME_FONTS[0]!
}

export function isFontId(value: unknown): value is FontId {
  return RESUME_FONTS.some((font) => font.id === value)
}

/** A CSS `font-family` value with a generic fallback. */
export function fontStack(font: ResumeFont): string {
  return `'${font.family}', ${font.category}`
}
