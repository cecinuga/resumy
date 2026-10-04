import type { Basics, Block, Resume, Section } from './types'

/**
 * The resume as it is printed: hidden sections, empty fields, empty items
 * and empty blocks removed, text trimmed. The preview and the PDF both
 * render this, so they always show the same content.
 */
export function printableResume(resume: Resume): Resume {
  const sections: Section[] = resume.sections
    .filter((section) => !section.hidden)
    .map((section) => ({
      ...section,
      title: section.title.trim(),
      blocks: section.blocks.map(printableBlock).filter((block): block is Block => block !== null),
    }))
    .filter((section) => section.blocks.length > 0)

  return { ...resume, basics: printableBasics(resume.basics), sections }
}

function printableBasics(basics: Basics): Basics {
  return {
    ...basics,
    name: basics.name.trim(),
    headline: basics.headline.trim(),
    email: basics.email.trim(),
    phone: basics.phone.trim(),
    location: basics.location.trim(),
    links: trimItems(basics.links),
  }
}

function printableBlock(block: Block): Block | null {
  switch (block.type) {
    case 'entry': {
      const entry = {
        ...block,
        title: block.title.trim(),
        subtitle: block.subtitle.trim(),
        date: block.date.trim(),
        location: block.location.trim(),
        items: trimItems(block.items),
      }
      const isEmpty = !entry.title && !entry.subtitle && !entry.date && !entry.location && !entry.items.length
      return isEmpty ? null : entry
    }
    case 'text': {
      const text = block.text.trim()
      return text ? { ...block, text } : null
    }
    case 'list': {
      const items = trimItems(block.items)
      return items.length ? { ...block, items } : null
    }
    case 'tags': {
      const items = trimItems(block.items)
      return items.length ? { ...block, label: block.label.trim(), items } : null
    }
  }
}

function trimItems<T extends { text: string }>(items: readonly T[]): T[] {
  return items.map((item) => ({ ...item, text: item.text.trim() })).filter((item) => item.text)
}

/** Contact details in display order, with the link each one opens. */
export function contactEntries(basics: Basics): { key: string; text: string; href?: string }[] {
  const entries: { key: string; text: string; href?: string }[] = []
  if (basics.email) entries.push({ key: 'email', text: basics.email, href: `mailto:${basics.email}` })
  if (basics.phone) entries.push({ key: 'phone', text: basics.phone, href: `tel:${basics.phone.replace(/[^\d+]/g, '')}` })
  if (basics.location) entries.push({ key: 'location', text: basics.location })
  for (const link of basics.links) {
    entries.push({ key: link.id, text: link.text, href: toHref(link.text) })
  }
  return entries
}

/** "linkedin.com/in/jane" -> "https://linkedin.com/in/jane"; anything odd gets no link. */
export function toHref(text: string): string | undefined {
  const value = text.trim()
  if (/^https?:\/\//i.test(value)) return value
  return /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value) ? `https://${value}` : undefined
}
