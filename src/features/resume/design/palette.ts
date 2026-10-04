/**
 * Accent colors offered for the resume itself. These are document content
 * (they are embedded in the exported PDF), not app theme tokens, and all of
 * them keep headings readable on white paper (at least 4.5:1).
 */
export interface AccentPreset {
  name: string
  value: string
}

export const ACCENT_PRESETS: readonly AccentPreset[] = [
  { name: 'Moss', value: '#3F5B45' },
  { name: 'Ink', value: '#2B2B26' },
  { name: 'Navy', value: '#2F4A6D' },
  { name: 'Teal', value: '#2E6B6B' },
  { name: 'Plum', value: '#5E4B8B' },
  { name: 'Burgundy', value: '#7A2E3A' },
  { name: 'Terracotta', value: '#A84E2B' },
  { name: 'Slate', value: '#4A5560' },
]

/** Neutral inks shared by every template. */
export const RESUME_INK = {
  text: '#26262A',
  muted: '#555B61',
  rule: '#C9CCCF',
  paper: '#FFFFFF',
} as const
