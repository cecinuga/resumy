// @vitest-environment node
import { renderToBuffer } from '@react-pdf/renderer'
import path from 'node:path'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { sampleDesign, sampleResume } from '../../test/sampleResume'
import { createEmptyResume, createEntry, createItem, createListBlock, createSection, createTextBlock } from '../resume/model/factories'
import { parseResume } from '../import/parseResume'
import { embedResume, readEmbeddedResume } from '../resume/model/embed'
import { printableResume } from '../resume/model/printable'
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
  return extractTextLines(pdfjs, new Uint8Array(buffer))
}

/** The PDF as Resumy exports it: rendered, with the resume stored inside. */
async function exportPdf(resume: Resume, printed: Resume = resume) {
  return embedResume(new Uint8Array(await renderToBuffer(<ResumeDocument resume={printed} />)), resume)
}

/** The resume restored from a PDF, if the PDF still prints what was stored. */
async function restore(pdf: Uint8Array) {
  const embedded = await readEmbeddedResume(pdf)
  const lines = await extractTextLines(pdfjs, pdf.slice())
  return embedded?.matches(lines.map((line) => line.text).join('\n')) ? embedded.resume : null
}

/** The addresses the links on the first page open, in reading order. */
async function renderLinks(resume: Resume) {
  const buffer = await renderToBuffer(<ResumeDocument resume={resume} />)
  const page = await (await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise).getPage(1)
  const annotations = (await page.getAnnotations()) as { subtype: string; url?: string }[]
  return annotations.filter((annotation) => annotation.subtype === 'Link').map((annotation) => annotation.url)
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

  it.each(['professional', 'elegant'] as const)(
    'makes web addresses and emails clickable without changing the text (%s)',
    async (template) => {
      const resume = sampleResume({ template })
      resume.sections = [
        createSection('Summary', [createTextBlock('Portfolio at https://giuliarossi.dev/work. Node.js and ASP.NET stay text.')]),
        createSection('Projects', [
          createEntry({ title: 'resumy.app', subtitle: 'Side project' }, ['Cut bundle size by 38% (see github.com/acme/checkout).']),
          createListBlock(['Questions? Write to hello@example.com']),
        ]),
      ]

      expect(await renderLinks(resume)).toEqual([
        'mailto:giulia.rossi@example.com',
        'tel:+393331234567',
        'https://linkedin.com/in/giuliarossi',
        'https://github.com/giuliarossi',
        'https://giuliarossi.dev/work',
        // pdf.js reads a bare host back with a trailing slash.
        'https://resumy.app/',
        'https://github.com/acme/checkout',
        'mailto:hello@example.com',
      ])
      const text = (await renderAndRead(resume)).map((line) => line.text).join('\n')
      expect(text).toContain('Portfolio at https://giuliarossi.dev/work. Node.js and ASP.NET stay text.')
      expect(text).toContain('Cut bundle size by 38% (see github.com/acme/checkout).')
      expect(text).toContain('Questions? Write to hello@example.com')
    },
  )

  it.each(['professional', 'classic', 'elegant'] as const)(
    'wraps a long contact line between contacts, without hyphens (%s)',
    async (template) => {
      const resume = sampleResume({ template })
      resume.basics.email = 'giulia.rossi.portfolio@example.com'
      resume.basics.links = [
        createItem('linkedin.com/in/giuliarossi-frontend'),
        createItem('github.com/giuliarossi'),
        createItem('giuliarossi.dev'),
      ]
      const lines = (await renderAndRead(resume)).map((line) => line.text)
      const contactLines = lines.slice(lines.indexOf('Senior Frontend Engineer') + 1, lines.indexOf('Summary'))

      expect(contactLines.length).toBeGreaterThan(1)
      expect(contactLines.join(' ')).not.toContain('-  ')
      for (const line of contactLines) {
        // The separator ends a line, never starts one, and no hyphen is added after it.
        expect(line).not.toMatch(/^·|·\s*-$/)
      }
      expect(contactLines.join(' ')).toMatch(/linkedin\.com\/in\/giuliarossi-frontend\s+·\s+github\.com\/giuliarossi/)
      expect(await renderLinks(resume)).toContain('https://giuliarossi.dev/')
    },
  )

  it.each(['professional', 'classic', 'modern', 'compact', 'elegant'] as const)(
    'carries the resume inside, so uploading it restores it exactly (%s)',
    async (template) => {
      const original = sampleResume({ template, accent: '#7A2E3A', textSize: 'small' })
      // A bare city, which reading the layout alone would take for part of the company.
      const job = original.sections[1]!.blocks[0]
      if (job?.type === 'entry') job.location = 'Milan'
      original.sections.push({ ...createSection('Hidden notes', [createTextBlock('Not for this application')]), hidden: true })

      const pdf = await exportPdf(original)
      // Still an ordinary PDF with the same text.
      expect((await extractTextLines(pdfjs, pdf.slice())).map((line) => line.text)).toContain('Giulia Rossi')
      // Exactly what the PDF prints: hidden sections stay out of it.
      expect(await restore(pdf)).toEqual(printableResume(original))
    },
  )

  it('reads the layout instead when the PDF was edited after export', async () => {
    const original = sampleResume()
    const edited = sampleResume()
    edited.basics.headline = 'Staff Frontend Engineer'
    expect(await restore(await exportPdf(original, edited))).toBeNull()
  })

  it.each(['source-sans', 'inter', 'nunito-sans', 'source-serif', 'eb-garamond'] as const)(
    'prints Latin Extended, Cyrillic, Greek and Vietnamese text as typed (%s)',
    async (font) => {
      const names = ['Łukasz Żółć', 'Олена Шевченко', 'Nguyễn Thị Hương']
      // Nunito Sans has no Greek letters (the download warns about them instead).
      if (font !== 'nunito-sans') names.push('Γιώργος Παπαδόπουλος')
      const resume = createEmptyResume({ ...sampleDesign, font })
      resume.basics.name = names[0]!
      resume.sections = [createSection('Team', [createListBlock(names.slice(1))])]
      const text = (await renderAndRead(resume)).map((line) => line.text.normalize('NFC')).join('\n')
      for (const name of names) expect(text).toContain(name)
    },
  )

  it('declares the language the resume is written in, for screen readers', async () => {
    const english = Buffer.from(await renderToBuffer(<ResumeDocument resume={sampleResume()} />)).toString('latin1')
    expect(english).toContain('/Lang (en)')
    const italian = sampleResume()
    italian.sections = [createSection('Profilo', [createTextBlock('Sviluppatrice con esperienza nella progettazione di interfacce per la banca e per il settore pubblico.')])]
    expect(Buffer.from(await renderToBuffer(<ResumeDocument resume={italian} />)).toString('latin1')).toContain('/Lang (it)')
  })

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
