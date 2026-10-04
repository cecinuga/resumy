import { describe, expect, it } from 'vitest'
import { full, heading, lines } from '../../test/lines'
import type { Block, EntryBlock, Resume } from '../resume/model/types'
import { parseResume } from './parseResume'

const entries = (resume: Resume, title: string): EntryBlock[] =>
  (resume.sections.find((section) => section.title === title)?.blocks ?? []).filter(
    (block): block is EntryBlock => block.type === 'entry',
  )

const texts = (block: Block | undefined): string[] =>
  block && block.type !== 'text' ? block.items.map((item) => item.text) : []

describe('parseResume: an Italian resume with uppercase headings', () => {
  const resume = parseResume(
    lines(
      ['MARIO BIANCHI', { size: 20, bold: true }],
      ['Sviluppatore Backend', { size: 12 }],
      'mario.bianchi@email.it | +39 347 555 1234 | Torino (TO) | linkedin.com/in/mariobianchi',
      heading('PROFILO'),
      full('Sviluppatore con sei anni di esperienza nella progettazione di API scalabili e sistemi'),
      'distribuiti per il settore bancario.',
      heading('ESPERIENZE LAVORATIVE'),
      ['Backend Developer presso Banca Sella', { bold: true, aside: 'Gen 2020 – Oggi' }],
      'Torino (TO)',
      full('• Progettato microservizi in Go per i pagamenti istantanei, riducendo la latenza del 40% e'),
      ["l'affidabilità del sistema.", { x: 62 }],
      '• Introdotto test di contratto tra i team.',
      ['Junior Developer presso Reply', { bold: true, aside: '03/2017 - 12/2019' }],
      '• Sviluppato servizi REST in Java.',
      heading('ISTRUZIONE'),
      ['Laurea Magistrale in Informatica', { bold: true, aside: '2015 – 2017' }],
      'Università di Torino',
      'Tesi: Algoritmi di consenso per sistemi distribuiti',
      heading('COMPETENZE'),
      'Linguaggi: Go, Java, Python',
      'Strumenti: Docker, Kubernetes, PostgreSQL',
      heading('LINGUE'),
      'Italiano (madrelingua), Inglese (C1)',
    ),
  )

  it('reads the contact header', () => {
    expect(resume.basics).toMatchObject({
      name: 'Mario Bianchi',
      headline: 'Sviluppatore Backend',
      email: 'mario.bianchi@email.it',
      phone: '+39 347 555 1234',
      location: 'Torino (TO)',
    })
    expect(resume.basics.links.map((link) => link.text)).toEqual(['linkedin.com/in/mariobianchi'])
  })

  it('keeps section names, in sentence case', () => {
    expect(resume.sections.map((section) => section.title)).toEqual([
      'Profilo',
      'Esperienze lavorative',
      'Istruzione',
      'Competenze',
      'Lingue',
    ])
  })

  it('joins a wrapped paragraph', () => {
    expect(resume.sections[0]?.blocks[0]).toMatchObject({
      type: 'text',
      text: 'Sviluppatore con sei anni di esperienza nella progettazione di API scalabili e sistemi distribuiti per il settore bancario.',
    })
  })

  it('splits jobs into title, company, dates, place and bullets', () => {
    const jobs = entries(resume, 'Esperienze lavorative')
    expect(jobs).toHaveLength(2)
    expect(jobs[0]).toMatchObject({
      title: 'Backend Developer',
      subtitle: 'Banca Sella',
      date: 'Gen 2020 – Oggi',
      location: 'Torino (TO)',
    })
    expect(texts(jobs[0])).toEqual([
      "Progettato microservizi in Go per i pagamenti istantanei, riducendo la latenza del 40% e l'affidabilità del sistema.",
      'Introdotto test di contratto tra i team.',
    ])
    expect(jobs[1]).toMatchObject({ title: 'Junior Developer', subtitle: 'Reply', date: '03/2017 - 12/2019' })
  })

  it('keeps labelled details of a degree as bullets', () => {
    const [degree] = entries(resume, 'Istruzione')
    expect(degree).toMatchObject({ title: 'Laurea Magistrale in Informatica', subtitle: 'Università di Torino', date: '2015 – 2017' })
    expect(texts(degree)).toEqual(['Tesi: Algoritmi di consenso per sistemi distribuiti'])
  })

  it('turns skills into labelled tag groups and languages into tags', () => {
    const [skills, languages] = [resume.sections[3]!, resume.sections[4]!]
    expect(skills.blocks).toMatchObject([
      { type: 'tags', label: 'Linguaggi', items: [{ text: 'Go' }, { text: 'Java' }, { text: 'Python' }] },
      { type: 'tags', label: 'Strumenti', items: [{ text: 'Docker' }, { text: 'Kubernetes' }, { text: 'PostgreSQL' }] },
    ])
    expect(texts(languages.blocks[0])).toEqual(['Italiano (madrelingua)', 'Inglese (C1)'])
  })
})

describe('parseResume: an English resume with dates on their own line', () => {
  const resume = parseResume(
    lines(
      ['Jane Doe, Product Designer', { size: 22, bold: true }],
      'Email: jane@doe.design · Phone: (555) 123-4567 · Austin, TX · GitHub: janedoe',
      heading('EXPERIENCE'),
      ['2019 – Present', { size: 9 }],
      ['Lead Designer — Acme', { bold: true }],
      '• Shipped a design system adopted by 30 teams.',
      ['2016 – 2019', { size: 9 }],
      ['Designer at Initech', { bold: true }],
      '• Redesigned onboarding, raising activation by 12%.',
      heading('SKILLS'),
      ['Tools', { bold: true }],
      'Figma, Sketch, Framer',
      heading('OPEN SOURCE'),
      '• Maintainer of a colour contrast checker with 2k stars',
    ),
  )

  it('separates the name from a title on the same line and reads labelled contacts', () => {
    expect(resume.basics).toMatchObject({
      name: 'Jane Doe',
      headline: 'Product Designer',
      email: 'jane@doe.design',
      phone: '(555) 123-4567',
      location: 'Austin, TX',
    })
    expect(resume.basics.links.map((link) => link.text)).toEqual(['github.com/janedoe'])
  })

  it('starts a new entry at each date line', () => {
    expect(entries(resume, 'Experience')).toMatchObject([
      { date: '2019 – Present', title: 'Lead Designer', subtitle: 'Acme' },
      { date: '2016 – 2019', title: 'Designer', subtitle: 'Initech' },
    ])
  })

  it('treats a bold label inside Skills as a label, not a section', () => {
    expect(resume.sections.find((section) => section.title === 'Skills')?.blocks).toMatchObject([
      { type: 'tags', label: 'Tools', items: [{ text: 'Figma' }, { text: 'Sketch' }, { text: 'Framer' }] },
    ])
  })

  it('keeps an unfamiliar heading drawn like the others as its own section', () => {
    const openSource = resume.sections.find((section) => section.title === 'Open source')
    expect(openSource?.blocks).toMatchObject([
      { type: 'list', items: [{ text: 'Maintainer of a colour contrast checker with 2k stars' }] },
    ])
  })
})

describe('parseResume: other layouts', () => {
  it('moves a contact block into the header', () => {
    const resume = parseResume(
      lines(
        ['Luca Verdi', { size: 20, bold: true }],
        heading('CONTATTI'),
        'luca.verdi@example.com',
        '+39 02 1234 5678',
        heading('ESPERIENZA'),
        ['Data Analyst', { bold: true, aside: '2021 – 2024' }],
        'Unicredit',
      ),
    )
    expect(resume.basics).toMatchObject({ name: 'Luca Verdi', email: 'luca.verdi@example.com', phone: '+39 02 1234 5678' })
    expect(resume.sections.map((section) => section.title)).toEqual(['Esperienza'])
  })

  it('still captures everything when no heading is recognised', () => {
    const resume = parseResume(
      lines(
        ['Ada Lovelace', { size: 20, bold: true }],
        'ada@example.org',
        ['Analyst', { bold: true, aside: '2019 – 2021' }],
        '• Wrote the first published algorithm.',
      ),
    )
    expect(resume.basics).toMatchObject({ name: 'Ada Lovelace', email: 'ada@example.org' })
    expect(resume.sections).toHaveLength(1)
    expect(resume.sections[0]?.blocks[0]).toMatchObject({ type: 'entry', title: 'Analyst', date: '2019 – 2021' })
  })

  it('makes plain bullets with no job around them a list', () => {
    const resume = parseResume(lines(['Sam Roe', { size: 18 }], heading('CERTIFICATIONS'), '• AWS Developer', '• CKA'))
    expect(resume.sections[0]?.blocks).toMatchObject([{ type: 'list', items: [{ text: 'AWS Developer' }, { text: 'CKA' }] }])
  })
})
