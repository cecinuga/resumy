import { printableResume } from '../resume/model/printable'
import type { Resume } from '../resume/model/types'

/**
 * What a recruiter would miss in the PDF and the person probably didn't mean
 * to leave out. Empty fields are simply skipped in the PDF, so only the gaps
 * worth a second look are listed: no name, no way to get in touch, an entry
 * without its title, a section that ends up empty.
 */
export function findGaps(resume: Resume): string[] {
  const { basics } = resume
  const gaps: string[] = []
  if (!basics.name.trim()) gaps.push('Your name is empty.')
  if (![basics.email, basics.phone, ...basics.links.map((link) => link.text)].some((value) => value.trim())) {
    gaps.push('There is no email, phone number or link to contact you.')
  }

  const printed = new Set(printableResume(resume).sections.map((section) => section.id))
  for (const section of resume.sections) {
    if (section.hidden) continue
    const title = section.title.trim() || 'A section without a title'
    if (!printed.has(section.id)) {
      if (section.title.trim()) gaps.push(`“${title}” is empty, so it's left out.`)
      continue
    }
    const untitled = section.blocks.filter(
      (block) => block.type === 'entry' && !block.title.trim() && (block.subtitle.trim() || block.date.trim() || block.items.some((item) => item.text.trim())),
    ).length
    if (untitled === 1) gaps.push(`An entry in “${title}” has no title.`)
    if (untitled > 1) gaps.push(`${untitled} entries in “${title}” have no title.`)
  }
  return gaps
}
