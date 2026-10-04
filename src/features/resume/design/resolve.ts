import type { Design } from '../model/types'
import { getResumeFont, type ResumeFont } from './fonts'
import { RESUME_INK } from './palette'
import { PAPER_SIZES, TEXT_SIZES } from './paper'
import { getTemplate, type TemplateSpec } from './templates'

/** Template sizes are drawn for this body size and scale with the chosen text size. */
const REFERENCE_SIZE = TEXT_SIZES.medium.points

/**
 * Every concrete value a renderer needs (sizes in points, colors in hex),
 * computed once from the design so the sheet and the PDF agree.
 */
export interface ResolvedDesign {
  template: TemplateSpec
  font: ResumeFont
  paper: { width: number; height: number }
  margin: number
  lineHeight: number
  sizes: { body: number; small: number; name: number; headline: number; heading: number }
  colors: {
    text: string
    muted: string
    rule: string
    accent: string
    name: string
    headline: string
    heading: string
    subtitle: string
  }
  spacing: TemplateSpec['spacing']
}

export function resolveDesign(design: Design): ResolvedDesign {
  const template = getTemplate(design.template)
  const body = TEXT_SIZES[design.textSize].points
  const scale = body / REFERENCE_SIZE
  const pick = (choice: 'accent' | 'ink' | 'muted') =>
    choice === 'accent' ? design.accent : choice === 'ink' ? RESUME_INK.text : RESUME_INK.muted

  return {
    template,
    font: getResumeFont(design.font),
    paper: PAPER_SIZES[design.paper],
    margin: template.margin,
    lineHeight: template.lineHeight,
    sizes: {
      body,
      small: round(body * 0.94),
      name: round(template.header.nameSize * scale),
      headline: round(body * 1.15),
      heading: round(template.heading.size * scale),
    },
    colors: {
      text: RESUME_INK.text,
      muted: RESUME_INK.muted,
      rule: template.heading.color === 'accent' ? design.accent : RESUME_INK.rule,
      accent: design.accent,
      name: pick(template.header.nameColor),
      headline: pick(template.header.headlineColor),
      heading: pick(template.heading.color),
      subtitle: template.entry.subtitleStyle === 'accent' ? design.accent : RESUME_INK.text,
    },
    spacing: template.spacing,
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
