import type { FontId, TemplateId } from '../model/types'

/**
 * A template is pure data: both renderers (the editable sheet and the PDF)
 * read the same spec, which keeps the preview and the download in step.
 * Every template is a single column with real text, so applicant tracking
 * systems read it in the right order. Sizes are in points.
 */
export interface TemplateSpec {
  id: TemplateId
  name: string
  description: string
  defaults: { font: FontId; accent: string }
  margin: number
  lineHeight: number
  header: {
    align: 'left' | 'center'
    nameSize: number
    nameColor: 'accent' | 'ink'
    headlineColor: 'accent' | 'muted'
    divider: boolean
  }
  heading: {
    size: number
    color: 'accent' | 'ink'
    uppercase: boolean
    /** rule: full-width line below; bar: accent bar on the left; underline: short accent stroke. */
    decoration: 'rule' | 'bar' | 'underline' | 'none'
  }
  entry: {
    datePlacement: 'right' | 'below'
    subtitleStyle: 'italic' | 'regular' | 'accent'
  }
  spacing: { section: number; block: number; item: number }
  photoShape: 'circle' | 'rounded'
}

export const TEMPLATES: readonly TemplateSpec[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Clear headings in your accent color. A safe choice for any role.',
    defaults: { font: 'source-sans', accent: '#3F5B45' },
    margin: 42,
    lineHeight: 1.4,
    header: { align: 'left', nameSize: 24, nameColor: 'accent', headlineColor: 'muted', divider: false },
    heading: { size: 12, color: 'accent', uppercase: false, decoration: 'rule' },
    entry: { datePlacement: 'right', subtitleStyle: 'regular' },
    spacing: { section: 16, block: 10, item: 2 },
    photoShape: 'circle',
  },
  {
    id: 'classic',
    name: 'Classic',
    description: 'Centered header and serif type, in the tradition of printed resumes.',
    defaults: { font: 'source-serif', accent: '#2B2B26' },
    margin: 48,
    lineHeight: 1.4,
    header: { align: 'center', nameSize: 24, nameColor: 'ink', headlineColor: 'muted', divider: true },
    heading: { size: 11, color: 'ink', uppercase: true, decoration: 'rule' },
    entry: { datePlacement: 'right', subtitleStyle: 'italic' },
    spacing: { section: 16, block: 10, item: 2 },
    photoShape: 'rounded',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'A bold name and accent bars that guide the eye down the page.',
    defaults: { font: 'inter', accent: '#2F4A6D' },
    margin: 42,
    lineHeight: 1.45,
    header: { align: 'left', nameSize: 28, nameColor: 'accent', headlineColor: 'accent', divider: false },
    heading: { size: 12, color: 'accent', uppercase: false, decoration: 'bar' },
    entry: { datePlacement: 'right', subtitleStyle: 'accent' },
    spacing: { section: 18, block: 11, item: 2 },
    photoShape: 'circle',
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Tighter spacing that fits a long career on fewer pages.',
    defaults: { font: 'inter', accent: '#4A5560' },
    margin: 34,
    lineHeight: 1.3,
    header: { align: 'left', nameSize: 20, nameColor: 'ink', headlineColor: 'muted', divider: true },
    heading: { size: 10.5, color: 'accent', uppercase: true, decoration: 'rule' },
    entry: { datePlacement: 'right', subtitleStyle: 'italic' },
    spacing: { section: 11, block: 7, item: 1 },
    photoShape: 'rounded',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Generous whitespace and refined serif type.',
    defaults: { font: 'eb-garamond', accent: '#7A2E3A' },
    margin: 54,
    lineHeight: 1.45,
    header: { align: 'center', nameSize: 28, nameColor: 'ink', headlineColor: 'accent', divider: false },
    heading: { size: 13, color: 'accent', uppercase: false, decoration: 'underline' },
    entry: { datePlacement: 'below', subtitleStyle: 'italic' },
    spacing: { section: 18, block: 11, item: 2 },
    photoShape: 'circle',
  },
]

export function getTemplate(id: TemplateId): TemplateSpec {
  return TEMPLATES.find((template) => template.id === id) ?? TEMPLATES[0]!
}

export function isTemplateId(value: unknown): value is TemplateId {
  return TEMPLATES.some((template) => template.id === value)
}
