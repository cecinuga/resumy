// @vitest-environment node
import { renderToBuffer } from '@react-pdf/renderer'
import path from 'node:path'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { sampleDesign, sampleResume } from '../../test/sampleResume'
import { createEmptyResume, createEntry, createSection } from '../resume/model/factories'
import { parseResume } from '../import/parseResume'
import { extractTextLines } from '../import/pdfExtract'
import type { Resume } from '../resume/model/types'
import { registerPdfFonts } from './pdfFonts'
import { ResumeDocument } from './ResumeDocument'

beforeAll(async () => {
  // In Node, pdf.js runs its worker on the main thread.
  const worker: unknown = await import('pdfjs-dist/legacy/build/pdf.worker.mjs')
  Object.assign(globalThis, { pdfjsWorker: worker })
  registerPdfFonts((fileName, packageName) => path.resolve('node_modules/@fontsource', packageName, 'files', fileName))
})

async function renderAndRead(resume: Resume) {
  const buffer = await renderToBuffer(<ResumeDocument resume={resume} />)
  return extractTextLines(pdfjs.getDocument, new Uint8Array(buffer))
}

describe('exported PDF', () => {
  it('contains real, selectable text in reading order', async () => {
    const text = (await renderAndRead(sampleResume())).map((line) => line.text).join('\n')
    const expectedOrder = [
      'Giulia Rossi',
      'Senior Frontend Engineer',
      'giulia.rossi@example.com',
      'Summary',
      'Experience',
      'Fintech Labs',
      'Led the migration of a 200k-line codebase',
      'ShopFast',
      'Education',
      'Politecnico di Milano',
      'Skills',
      'Languages: TypeScript, JavaScript, CSS, HTML',
    ]
    let cursor = -1
    for (const fragment of expectedOrder) {
      const index = text.indexOf(fragment, cursor + 1)
      expect(index, `"${fragment}" after position ${cursor}`).toBeGreaterThan(cursor)
      cursor = index
    }
    // No ligature glyphs or hyphenation artefacts.
    expect(text).not.toMatch(/[\uFB00-\uFB06]/)
    expect(text).toContain('Reduced page load time by 1.2 seconds on mobile by optimizing images and fonts.')
  })

  it.each(['professional', 'classic', 'modern', 'compact', 'elegant'] as const)(
    'round-trips through the importer with the %s template',
    async (template) => {
      const original = sampleResume({ template })
      const imported = parseResume(await renderAndRead(original))

      expect(imported.basics).toMatchObject({
        name: 'Giulia Rossi',
        headline: 'Senior Frontend Engineer',
        email: 'giulia.rossi@example.com',
        phone: '+39 333 123 4567',
        location: 'Milan, Italy',
      })
      expect(imported.basics.links.map((link) => link.text)).toEqual([
        'linkedin.com/in/giuliarossi',
        'github.com/giuliarossi',
      ])
      expect(imported.sections.map((section) => section.title.toLowerCase())).toEqual([
        'summary',
        'experience',
        'education',
        'skills',
        'certifications',
        'languages',
      ])

      const experience = imported.sections[1]!.blocks
      expect(experience).toHaveLength(2)
      expect(experience[0]).toMatchObject({
        type: 'entry',
        title: 'Senior Frontend Engineer',
        subtitle: 'Fintech Labs',
        date: 'Mar 2021 – Present',
        location: 'Milan, Italy',
      })
      const originalJob = original.sections[1]!.blocks[0]
      if (experience[0]?.type !== 'entry' || originalJob?.type !== 'entry') throw new Error('expected entries')
      expect(experience[0].items.map((item) => item.text)).toEqual(originalJob.items.map((item) => item.text))

      const skills = imported.sections[3]!.blocks
      expect(skills).toMatchObject([
        { type: 'tags', label: 'Languages', items: [{ text: 'TypeScript' }, { text: 'JavaScript' }, { text: 'CSS' }, { text: 'HTML' }] },
        { type: 'tags', label: 'Tools', items: [{ text: 'React' }, { text: 'Vite' }, { text: 'Node.js' }, { text: 'Playwright' }] },
      ])
    },
  )

  it('renders sparse resumes without stray text nodes', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const resume = createEmptyResume(sampleDesign)
    resume.sections = [createSection('Experience', [createEntry({ title: 'Engineer' }, ['Built things'])])]
    for (const template of ['professional', 'elegant'] as const) {
      await renderToBuffer(<ResumeDocument resume={{ ...resume, design: { ...sampleDesign, template } }} />)
    }
    expect(warn.mock.calls.flat().join('\n')).not.toContain('string child')
  })
})
