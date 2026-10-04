import type { BlockType } from './types'

export type SectionPresetId =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'volunteering'
  | 'awards'
  | 'publications'
  | 'interests'
  | 'custom'

export interface SectionPreset {
  id: SectionPresetId
  title: string
  /** The kind of block a new section of this type starts with. */
  blockType: BlockType
}

/** Standard section names: ATS software looks for these exact headings. */
export const SECTION_PRESETS: readonly SectionPreset[] = [
  { id: 'summary', title: 'Summary', blockType: 'text' },
  { id: 'experience', title: 'Experience', blockType: 'entry' },
  { id: 'education', title: 'Education', blockType: 'entry' },
  { id: 'skills', title: 'Skills', blockType: 'tags' },
  { id: 'projects', title: 'Projects', blockType: 'entry' },
  { id: 'certifications', title: 'Certifications', blockType: 'entry' },
  { id: 'languages', title: 'Languages', blockType: 'tags' },
  { id: 'volunteering', title: 'Volunteering', blockType: 'entry' },
  { id: 'awards', title: 'Awards', blockType: 'list' },
  { id: 'publications', title: 'Publications', blockType: 'list' },
  { id: 'interests', title: 'Interests', blockType: 'tags' },
  { id: 'custom', title: 'New section', blockType: 'list' },
]

export function getSectionPreset(id: SectionPresetId): SectionPreset {
  return SECTION_PRESETS.find((preset) => preset.id === id) ?? SECTION_PRESETS[SECTION_PRESETS.length - 1]!
}
