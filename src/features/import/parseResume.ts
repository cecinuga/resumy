import {
  createDefaultDesign,
  createEntry,
  createItem,
  createListBlock,
  createSection,
  createTagsBlock,
  createTextBlock,
} from '../resume/model/factories'
import type { Basics, Block, Design, EntryBlock, Resume, Section } from '../resume/model/types'
import { matchHeading, type HeadingKind } from './headings'
import {
  EMAIL,
  findDateRange,
  findPhone,
  hasDate,
  isBullet,
  isLocation,
  isUpperCase,
  SINGLE_DATE,
  stripBullet,
  toNameCase,
  toSentenceCase,
  URL_PATTERN,
  wordCount,
} from './patterns'
import { splitList } from '../../lib/text'
import type { TextLine } from './textLines'

/**
 * Maps the lines of a resume PDF to a Resume. Resumes have no fixed
 * structure, so this works on cues ATS software also relies on: known
 * section headings and their typography, dates, bullets and contact
 * patterns. Anything it cannot place still ends up in the document, so
 * nothing the person wrote is lost.
 */
export function parseResume(input: readonly TextLine[], design: Design = createDefaultDesign()): Resume {
  const lines = input.filter((line) => line.text.trim())
  const layout = measureLayout(lines)
  const headings = findHeadings(lines, layout)

  const headerEnd = headings[0]?.index ?? headerLength(lines)
  const header = parseHeader(lines.slice(0, headerEnd))
  const sections: Section[] = []
  if (header.summary) sections.push(createSection('Summary', [createTextBlock(header.summary)]))

  if (headings.length === 0 && headerEnd < lines.length) {
    const rest = lines.slice(headerEnd)
    const kind: HeadingKind = rest.some((line) => findDateRange(line.text)) ? 'experience' : 'summary'
    sections.push(createSection(kind === 'experience' ? 'Experience' : 'Details', parseBody(kind, rest, layout)))
  }

  headings.forEach((heading, position) => {
    const body = lines.slice(heading.index + 1, headings[position + 1]?.index ?? lines.length)
    if (heading.kind === 'contact') {
      for (const line of body) for (const token of contactTokens(line)) takeContact(token, header.basics)
      return
    }
    const blocks = parseBody(heading.kind, body, layout)
    const title = toSentenceCase(heading.text.replace(/[:\s]+$/, ''))
    if (blocks.length > 0) sections.push(createSection(title, blocks))
  })

  return { version: 1, basics: header.basics, sections, design }
}

/* ---------- Layout ---------- */

interface Layout {
  /** Right edge reached by full-width lines; wrapped lines end near it. */
  right: number
  /** The most common font size, by characters. */
  bodySize: number
}

function measureLayout(lines: readonly TextLine[]): Layout {
  const rights = lines.map((line) => line.right).sort((a, b) => a - b)
  const right = rights[Math.floor((rights.length - 1) * 0.95)] ?? 0
  const sizes = new Map<number, number>()
  for (const line of lines) sizes.set(line.fontSize, (sizes.get(line.fontSize) ?? 0) + line.text.length)
  const bodySize = [...sizes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10
  return { right, bodySize }
}

/* ---------- Headings ---------- */

interface Heading {
  index: number
  kind: HeadingKind
  text: string
}

function looksLikeHeading(line: TextLine): boolean {
  const words = wordCount(line.text)
  return (
    line.segments.length === 1 &&
    words >= 1 &&
    words <= 5 &&
    line.text.length <= 45 &&
    /\p{L}/u.test(line.text) &&
    !/[\d@]/.test(line.text) &&
    !/[.,;]$/.test(line.text) &&
    !isBullet(line.text)
  )
}

/** Visual style of a line: headings of one resume all share it. */
function styleOf(line: TextLine): { key: string; prominence: number } {
  const size = Math.round(line.fontSize)
  const upper = isUpperCase(line.text)
  return {
    key: `${size}|${line.bold}|${upper}`,
    prominence: size + (line.bold ? 1 : 0) + (upper ? 1 : 0),
  }
}

function findHeadings(lines: readonly TextLine[], layout: Layout): Heading[] {
  const shaped = lines.flatMap((line, index) => (looksLikeHeading(line) ? [{ line, index }] : []))
  const known = shaped.flatMap(({ line, index }) => {
    const kind = matchHeading(line.text)
    return kind ? [{ line, index, kind }] : []
  })

  if (known.length === 0) {
    // No familiar heading: fall back to short, clearly emphasized lines.
    return shaped
      .filter(({ line, index }) => index > 2 && (isUpperCase(line.text) || line.fontSize >= layout.bodySize * 1.2))
      .map(({ line, index }) => ({ index, kind: 'custom' as const, text: line.text }))
  }

  // The style most dictionary hits share is the heading style. A hit drawn
  // less prominently (a "Tools" label inside Skills) is content, not a heading.
  const counts = new Map<string, number>()
  for (const { line } of known) counts.set(styleOf(line).key, (counts.get(styleOf(line).key) ?? 0) + 1)
  const headingStyle = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]![0]
  const reference = known.find(({ line }) => styleOf(line).key === headingStyle)!.line
  const minProminence = styleOf(reference).prominence - 0.5
  const firstKnown = known[0]!.index

  const headings: Heading[] = known
    .filter(({ line }) => styleOf(line).prominence >= minProminence)
    .map(({ line, index, kind }) => ({ index, kind, text: line.text }))

  // Unfamiliar headings drawn exactly like the familiar ones become custom
  // sections, provided that style stands out: bold alone is often also the
  // style of job titles.
  const distinctive = isUpperCase(reference.text) || reference.fontSize >= layout.bodySize * 1.15
  if (distinctive) {
    for (const { line, index } of shaped) {
      const isKnown = headings.some((heading) => heading.index === index)
      if (!isKnown && (index > 2 || index > firstKnown) && styleOf(line).key === headingStyle) {
        headings.push({ index, kind: 'custom', text: line.text })
      }
    }
  }
  return headings.sort((a, b) => a.index - b.index)
}

/** Without headings, the header runs until the first bullet, date or paragraph. */
function headerLength(lines: readonly TextLine[]): number {
  const end = lines.findIndex(
    (line, index) => index > 0 && (isBullet(line.text) || hasDate(line.text) || wordCount(line.text) > 14),
  )
  return Math.min(end === -1 ? lines.length : end, 6)
}

/* ---------- Header: name, headline and contact details ---------- */

const DOCUMENT_TITLE = /^(curriculum(\s+vitae)?|resume|résumé|cv)$/i
const NAME_SEPARATOR = /\s*,\s*|\s+[-–—]\s+/
/** "Email:", "Tel." and the like; "linkedin.com" is a link, not a label. */
const CONTACT_LABEL =
  /^(?:e-?mail|mail|phone|tel|telephone|telefono|mobile|mob|cell(?:ulare|phone)?|linkedin|github|gitlab|website|web|sito(?:\s+web)?|portfolio|address|indirizzo|location|citt[àa]|residenza|domicilio)\s*(?::|\.(?=\s))\s*/i

interface Header {
  basics: Basics
  summary: string
}

function parseHeader(lines: readonly TextLine[]): Header {
  const basics: Basics = { name: '', headline: '', email: '', phone: '', location: '', links: [], photo: null }
  const nameLine = pickNameLine(lines)
  const nameIndex = nameLine ? lines.indexOf(nameLine) : -1
  const prose: string[] = []

  lines.forEach((line, index) => {
    if (DOCUMENT_TITLE.test(line.text)) return
    const tokens = contactTokens(line)
    if (line === nameLine) {
      // "Jane Doe, Software Engineer": the name ends at the first separator.
      const [first = '', ...others] = tokens
      const separator = NAME_SEPARATOR.exec(first)
      basics.name = toNameCase(separator ? first.slice(0, separator.index) : first)
      const role = separator ? first.slice(separator.index + separator[0].length) : ''
      tokens.splice(0, tokens.length, ...(role ? [role] : []), ...others)
    }
    for (const token of tokens) {
      const leftover = takeContact(token, basics)
      if (!leftover) continue
      const nearName = nameIndex === -1 ? index <= 1 : index <= nameIndex + 2
      if (!basics.headline && nearName && wordCount(leftover) <= 12 && !/[.!?]$/.test(leftover)) {
        basics.headline = leftover
      } else if (wordCount(line.text) >= 6) {
        prose.push(leftover)
      }
    }
  })

  const summary = joinLines(prose)
  return { basics, summary: wordCount(summary) >= 12 ? summary : '' }
}

/** The most prominent of the first lines that reads like a person's name. */
function pickNameLine(lines: readonly TextLine[]): TextLine | null {
  const candidates = lines
    .filter((line) => !DOCUMENT_TITLE.test(line.text))
    .slice(0, 3)
    .filter((line) => {
      const name = contactTokens(line)[0]?.split(NAME_SEPARATOR)[0] ?? ''
      return /^[\p{L}][\p{L}'’.\s-]*$/u.test(name) && wordCount(name) <= 5 && !EMAIL.test(name)
    })
  return candidates.reduce<TextLine | null>(
    (best, line) => (!best || line.fontSize > best.fontSize + 0.5 ? line : best),
    null,
  )
}

/** Splits a header line into tokens at separators such as "|" or "·". */
function contactTokens(line: TextLine): string[] {
  return line.segments
    .flatMap((segment) => segment.split(/\s+[|•·⋅∙◦▪♦]\s+|\s*[|]\s*|\s{2,}/))
    .map((token) => token.replace(/[\uE000-\uF8FF]/g, '').trim())
    .filter(Boolean)
}

/** Moves any contact detail found in the token into `basics`; returns what is left. */
function takeContact(token: string, basics: Basics): string {
  const label = CONTACT_LABEL.exec(token)?.[0].toLowerCase() ?? ''
  let rest = token.slice(label.length).trim()

  const email = EMAIL.exec(rest)?.[0]
  if (email) {
    basics.email ||= email
    rest = rest.replace(email, '')
  }
  for (const url of rest.match(URL_PATTERN) ?? []) {
    const link = url.replace(/[).]+$/, '')
    if (!basics.links.some((existing) => existing.text === link)) basics.links.push(createItem(link))
    rest = rest.replace(url, '')
  }
  // "LinkedIn: jane-doe" names a profile without spelling out its address.
  const handle = rest.trim()
  if (/^[\w.-]{2,40}$/.test(handle) && /linkedin|github/.test(label)) {
    basics.links.push(createItem(label.startsWith('linkedin') ? `linkedin.com/in/${handle}` : `github.com/${handle}`))
    rest = ''
  }
  const phone = findPhone(rest)
  if (phone) {
    basics.phone ||= phone
    rest = rest.replace(phone, '')
  }
  rest = rest.replace(/^[\s,;:|/–—-]+|[\s,;:|/–—-]+$/g, '').trim()
  if (rest && !basics.location && isLocation(rest)) {
    basics.location = rest
    rest = ''
  }
  return rest
}

/* ---------- Section bodies ---------- */

function parseBody(kind: HeadingKind, lines: readonly TextLine[], layout: Layout): Block[] {
  switch (kind) {
    case 'summary':
      return parseProse(lines, layout)
    case 'experience':
    case 'education':
    case 'projects':
    case 'volunteering':
    case 'certifications':
      return parseEntries(lines, layout)
    case 'skills':
    case 'interests':
      return parseTags(lines, true)
    case 'languages':
      return parseTags(lines, false)
    default: {
      if (lines.some((line) => findDateRange(line.text))) return parseEntries(lines, layout)
      const listLike = lines.every((line) => isBullet(line.text) || wordCount(line.text) <= 8)
      return listLike ? parseList(lines, layout) : parseProse(lines, layout)
    }
  }
}

interface OpenItem {
  /** First line of the item; for bullets it carries the marker. */
  start: TextLine
  last: TextLine
  bullet: boolean
}

/** Whether `line` is the wrapped continuation of the item above it. */
function continuesItem(line: TextLine, open: OpenItem, layout: Layout): boolean {
  if (isBullet(line.text) || (line.bold && !open.last.bold)) return false
  if (findDateRange(line.text) && !findDateRange(open.last.text)) return false
  if (Math.abs(line.fontSize - open.last.fontSize) > 0.75) return false
  if (/^\p{Ll}/u.test(line.text)) return true
  const indented = open.bullet ? line.x > open.start.x + 1 : line.x >= open.start.x - 1
  const previousFilledLine = open.last.right >= layout.right - open.last.fontSize * 2.5
  return indented && previousFilledLine
}

function appendText(text: string, more: string): string {
  // Re-join words hyphenated across lines ("devel-" + "opment").
  if (/\p{L}-$/u.test(text) && /^\p{Ll}/u.test(more)) return text.slice(0, -1) + more
  return `${text} ${more}`
}

function joinLines(texts: readonly string[]): string {
  return texts.reduce((joined, text) => (joined ? appendText(joined, text) : text), '')
}

/** Paragraphs and bullet lists, in reading order. */
function parseProse(lines: readonly TextLine[], layout: Layout): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: string[] = []
  let open: OpenItem | null = null
  let previous: TextLine | null = null

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(createTextBlock(joinLines(paragraph)))
    paragraph = []
  }
  const flushList = () => {
    if (list.length) blocks.push(createListBlock(list))
    list = []
    open = null
  }

  for (const line of lines) {
    if (isBullet(line.text)) {
      flushParagraph()
      list.push(stripBullet(line.text))
      open = { start: line, last: line, bullet: true }
    } else if (open && continuesItem(line, open, layout)) {
      list[list.length - 1] = appendText(list.at(-1) ?? '', line.text)
      open.last = line
    } else {
      flushList()
      const gap = previous && previous.page === line.page ? line.y - previous.y : 0
      if (paragraph.length && gap > previous!.fontSize * 1.75) flushParagraph()
      paragraph.push(line.text)
    }
    previous = line
  }
  flushParagraph()
  flushList()
  return blocks
}

/** A plain list: one item per bullet or per line, with wrapped lines rejoined. */
function parseList(lines: readonly TextLine[], layout: Layout): Block[] {
  const items: string[] = []
  let open: OpenItem | null = null
  for (const line of lines) {
    if (open && continuesItem(line, open, layout)) {
      items[items.length - 1] = appendText(items.at(-1) ?? '', line.text)
      open.last = line
    } else {
      items.push(stripBullet(line.text))
      open = { start: line, last: line, bullet: isBullet(line.text) }
    }
  }
  return items.length ? [createListBlock(items)] : []
}

/** Skills-like content: "Label: a, b, c" lines become labelled tag groups. */
function parseTags(lines: readonly TextLine[], allowLabels: boolean): Block[] {
  // Rejoin lists that wrap: "Python, Go," + "Rust".
  const texts: { text: string; line: TextLine }[] = []
  for (const line of lines) {
    const text = stripBullet(line.segments.join(', '))
    const previous = texts.at(-1)
    if (previous && (/[,;]$/.test(previous.text) || /^\p{Ll}/u.test(text))) previous.text = `${previous.text} ${text}`
    else texts.push({ text, line })
  }

  const blocks: Block[] = []
  let loose: string[] = []
  let pendingLabel = ''
  const flushLoose = () => {
    if (loose.length) blocks.push(createTagsBlock('', loose))
    loose = []
  }

  texts.forEach(({ text, line }, index) => {
    const labelled = allowLabels ? /^([^:]{2,40}):\s*(.+)$/u.exec(text) : null
    const isStandaloneLabel =
      allowLabels && line.bold && wordCount(text) <= 4 && !/[,;]/.test(text) && index < texts.length - 1
    if (labelled) {
      flushLoose()
      blocks.push(createTagsBlock(labelled[1]!.trim(), splitList(labelled[2]!)))
    } else if (isStandaloneLabel) {
      flushLoose()
      pendingLabel = text.replace(/:$/, '')
    } else if (pendingLabel) {
      blocks.push(createTagsBlock(pendingLabel, splitList(text)))
      pendingLabel = ''
    } else {
      loose.push(...splitList(text))
    }
  })
  flushLoose()

  // Whole sentences are not tags: keep them as a list instead.
  const items = blocks.flatMap((block) => (block.type === 'tags' ? block.items : []))
  const averageWords = items.reduce((sum, item) => sum + wordCount(item.text), 0) / Math.max(items.length, 1)
  if (averageWords > 5) return [createListBlock(texts.map(({ text }) => text))]
  return blocks
}

/* ---------- Entries: jobs, degrees, projects ---------- */

function parseEntries(lines: readonly TextLine[], layout: Layout): Block[] {
  const entries: EntryBlock[] = []
  let current: EntryBlock | null = null
  let inBody = false
  let open: OpenItem | null = null

  const startEntry = (): EntryBlock => {
    const entry = createEntry({}, [])
    entries.push(entry)
    inBody = false
    open = null
    return entry
  }

  for (const line of lines) {
    if (isBullet(line.text)) {
      current ??= startEntry()
      current.items.push(createItem(stripBullet(line.text)))
      open = { start: line, last: line, bullet: true }
      inBody = true
      continue
    }
    if (current && open && continuesItem(line, open, layout)) {
      const last = current.items.at(-1)
      if (last) last.text = appendText(last.text, line.text)
      open.last = line
      continue
    }
    if (current && (isDescription(line) || (isHeaderComplete(current) && isLabelledDetail(line)))) {
      current.items.push(createItem(line.text))
      open = { start: line, last: line, bullet: false }
      inBody = true
      continue
    }
    // A place on its own line completes the entry above ("Torino (TO)"), once
    // the entry has a title and an organization: "Acme Corp, Milan" alone is a company.
    if (current && !inBody && current.title && current.subtitle && !current.location && isLocation(line.text)) {
      current.location = line.text
      continue
    }
    if (!current || inBody || isHeaderComplete(current) || (current.date && hasDate(line.text))) {
      current = startEntry()
    }
    addHeaderLine(current, line)
  }

  const filled = entries.filter(
    (entry) => entry.title || entry.subtitle || entry.date || entry.location || entry.items.length,
  )
  // Bullets without any job or school around them are simply a list.
  if (filled.every((entry) => !entry.title && !entry.subtitle && !entry.date)) {
    const items = filled.flatMap((entry) => entry.items.map((item) => item.text))
    return items.length ? [createListBlock(items)] : []
  }
  return filled.map((entry) =>
    !entry.title && entry.subtitle ? { ...entry, title: entry.subtitle, subtitle: '' } : entry,
  )
}

function isHeaderComplete(entry: EntryBlock): boolean {
  return Boolean(entry.title && entry.subtitle && entry.date)
}

/** A sentence about the role rather than a title line. */
function isDescription(line: TextLine): boolean {
  if (line.bold || hasDate(line.text)) return false
  const words = wordCount(line.text)
  return words >= 10 || (words >= 6 && /[.!?]$/.test(line.text))
}

/** "Thesis: ...", "GPA: 3.9", "Technologies: React, Node". */
function isLabelledDetail(line: TextLine): boolean {
  return /^[\p{L} ]{2,30}:\s+\S/u.test(line.text)
}

function removeFragment(text: string, fragment: string): string {
  return text
    .replace(fragment, ' ')
    .replace(/\(\s*\)|\[\s*\]/g, ' ')
    .replace(/^[\s|,;:·•⋅∙◦▪–—-]+|[\s|,;:·•⋅∙◦▪–—-]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** "Software Engineer | Acme", "Engineer at Acme", "Engineer — Acme". */
function splitHeaderParts(text: string): string[] {
  return text
    .split(/\s+[|•·⋅∙◦▪]\s+|\s+[–—]\s+|\s+-\s+(?=\p{Lu})|\s+(?:at|@|presso)\s+(?=\p{Lu})/u)
    .map((part) => part.trim())
    .filter(Boolean)
}

function addHeaderLine(entry: EntryBlock, line: TextLine): void {
  const parts: string[] = []
  for (const segment of line.segments) {
    let text = segment
    const range = entry.date ? null : findDateRange(text)
    if (range) {
      entry.date = range
      text = removeFragment(text, range)
    }
    parts.push(...splitHeaderParts(text))
  }

  const rest: string[] = []
  parts.forEach((part, index) => {
    if (!entry.date && SINGLE_DATE.test(part)) {
      entry.date = part
      return
    }
    // A place is never the first thing on a title line ("Acme, Milan" is a company).
    const canBePlace = index > 0 || Boolean(entry.title && entry.subtitle)
    if (!entry.location && canBePlace && isLocation(part)) {
      entry.location = part
      return
    }
    rest.push(part)
  })

  for (const part of rest) {
    if (!entry.title) entry.title = part
    else if (!entry.subtitle) entry.subtitle = part
    else entry.subtitle = `${entry.subtitle}, ${part}`
  }
}
