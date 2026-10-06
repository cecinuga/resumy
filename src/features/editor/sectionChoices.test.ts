import { describe, expect, it } from 'vitest'
import { createSection } from '../resume/model/factories'
import { addableSections } from './sectionChoices'

describe('addableSections', () => {
  it('leaves out the kinds of section already there, in any language, hidden or not', () => {
    const sections = [createSection('Summary'), createSection('Esperienza'), { ...createSection('Skills'), hidden: true }]
    const ids = addableSections(sections).map((preset) => preset.id)
    expect(ids).not.toContain('summary')
    expect(ids).not.toContain('experience')
    expect(ids).not.toContain('skills')
    expect(ids).toContain('education')
    expect(ids).toContain('custom')
  })
})
