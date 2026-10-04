import { describe, expect, it } from 'vitest'
import { sampleResume } from '../../../test/sampleResume'
import { isResumeEmpty, resumeFileName } from './inspect'
import { createEmptyResume } from './factories'
import { normalizeResume } from './normalize'
import { printableResume } from './printable'

describe('normalizeResume', () => {
  it('round-trips a valid resume through JSON', () => {
    const resume = sampleResume()
    expect(normalizeResume(JSON.parse(JSON.stringify(resume)))).toEqual(resume)
  })

  it('rejects data that is not a resume', () => {
    expect(normalizeResume(null)).toBeNull()
    expect(normalizeResume({ version: 2, basics: {} })).toBeNull()
    expect(normalizeResume('{"version":1}')).toBeNull()
  })

  it('repairs what it can and drops the rest', () => {
    const raw = {
      version: 1,
      basics: { name: 42, photo: 'https://tracker.example/pixel.png', links: [{ id: 'a', text: 'x.com' }] },
      sections: [
        { id: 'a', title: 'Mixed', blocks: [{ type: 'video' }, { id: 'b', type: 'text', text: 'Hi' }] },
        'junk',
      ],
      design: { template: 'neon', accent: 'red', textSize: 'huge', paper: 'a4' },
    }
    const resume = normalizeResume(raw)!
    expect(resume.basics.name).toBe('')
    // A remote image would make a request every time the resume is shown.
    expect(resume.basics.photo).toBeNull()
    expect(resume.sections).toHaveLength(1)
    expect(resume.sections[0]!.blocks).toEqual([{ id: 'b', type: 'text', text: 'Hi' }])
    expect(resume.design).toMatchObject({ template: 'professional', textSize: 'medium', paper: 'a4' })
    expect(resume.design.accent).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('replaces duplicate ids so every element stays addressable', () => {
    const resume = normalizeResume({
      version: 1,
      basics: { links: [{ id: 'same', text: 'a.com' }] },
      sections: [{ id: 'same', title: 'A', blocks: [] }],
    })!
    expect(resume.sections[0]!.id).not.toBe(resume.basics.links[0]!.id)
  })
})

describe('printableResume', () => {
  it('leaves out hidden sections, empty fields and empty blocks', () => {
    const resume = createEmptyResume()
    resume.basics.name = '  Ada  '
    resume.sections[1]!.hidden = true
    const printable = printableResume(resume)
    expect(printable.basics.name).toBe('Ada')
    expect(printable.sections).toEqual([])
  })
})

describe('inspect helpers', () => {
  it('knows when a resume has no content yet', () => {
    expect(isResumeEmpty(createEmptyResume())).toBe(true)
    expect(isResumeEmpty(sampleResume())).toBe(false)
  })

  it('names the PDF after the person, in plain ASCII', () => {
    const resume = sampleResume()
    resume.basics.name = 'Łukasz Kowalski-Ferrè'
    expect(resumeFileName(resume)).toBe('Lukasz-Kowalski-Ferre-Resume.pdf')
    resume.basics.name = ''
    expect(resumeFileName(resume)).toBe('Resume.pdf')
  })
})
