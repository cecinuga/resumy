import { describe, expect, it } from 'vitest'
import { sampleResume } from '../../test/sampleResume'
import { createEmptyResume, createEntry, createSection } from '../resume/model/factories'
import { findGaps } from './beforeDownload'

describe('findGaps', () => {
  it('finds nothing to point out in a complete resume', () => {
    expect(findGaps(sampleResume())).toEqual([])
  })

  it('points out a missing name and contact, untitled entries and empty sections', () => {
    const resume = createEmptyResume()
    resume.sections = [
      createSection('Experience', [createEntry({ subtitle: 'Acme' }, ['Shipped things']), createEntry({ title: 'Engineer' })]),
      createSection('Projects', [createEntry()]),
      { ...createSection('Notes', []), hidden: true },
    ]
    expect(findGaps(resume)).toEqual([
      'Your name is empty.',
      'There is no email, phone number or link to contact you.',
      'An entry in “Experience” has no title.',
      '“Projects” is empty, so it\'s left out.',
    ])
  })
})
