import { matchHeading } from '../import/headings'
import { SECTION_PRESETS, type SectionPreset } from '../resume/model/sectionPresets'
import type { Section } from '../resume/model/types'

/**
 * The sections that can still be added: one of each kind, so a resume that
 * has its Experience (or "Esperienza", hidden or not) isn't offered another.
 * A new custom section is always on offer.
 */
export function addableSections(sections: readonly Section[]): SectionPreset[] {
  const present = new Set(sections.map((section) => matchHeading(section.title)))
  return SECTION_PRESETS.filter((preset) => preset.id === 'custom' || !present.has(preset.id))
}
