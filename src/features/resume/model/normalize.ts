import { createId } from '../../../lib/id'
import { isFontId } from '../design/fonts'
import { isTemplateId } from '../design/templates'
import { createDefaultDesign } from './factories'
import type { Basics, Block, Design, Resume, Section, TextItem } from './types'

/**
 * Turns untrusted data (e.g. a draft read back from localStorage) into a
 * valid Resume, dropping whatever does not fit. Returns null when nothing
 * usable is left. Duplicate ids are replaced so React keys and drag-and-drop
 * targets stay unique.
 */
export function normalizeResume(raw: unknown): Resume | null {
  if (!isRecord(raw) || raw.version !== 1 || !isRecord(raw.basics)) return null
  const seen = new Set<string>()
  const id = (value: unknown): string => {
    const candidate = typeof value === 'string' && value && !seen.has(value) ? value : createId()
    seen.add(candidate)
    return candidate
  }

  const items = (value: unknown): TextItem[] =>
    asArray(value)
      .filter(isRecord)
      .map((item) => ({ id: id(item.id), text: asString(item.text) }))

  const block = (value: unknown): Block | null => {
    if (!isRecord(value)) return null
    switch (value.type) {
      case 'entry':
        return {
          id: id(value.id),
          type: 'entry',
          title: asString(value.title),
          subtitle: asString(value.subtitle),
          date: asString(value.date),
          location: asString(value.location),
          items: items(value.items),
        }
      case 'text':
        return { id: id(value.id), type: 'text', text: asString(value.text) }
      case 'list':
        return { id: id(value.id), type: 'list', items: items(value.items) }
      case 'tags':
        return { id: id(value.id), type: 'tags', label: asString(value.label), items: items(value.items) }
      default:
        return null
    }
  }

  const sections: Section[] = asArray(raw.sections)
    .filter(isRecord)
    .map((section) => ({
      id: id(section.id),
      title: asString(section.title),
      hidden: section.hidden === true,
      blocks: asArray(section.blocks)
        .map(block)
        .filter((value): value is Block => value !== null),
    }))

  const basics: Basics = {
    name: asString(raw.basics.name),
    headline: asString(raw.basics.headline),
    email: asString(raw.basics.email),
    phone: asString(raw.basics.phone),
    location: asString(raw.basics.location),
    links: items(raw.basics.links),
    photo: isImageDataUrl(raw.basics.photo) ? raw.basics.photo : null,
  }

  return { version: 1, basics, sections, design: normalizeDesign(raw.design) }
}

function normalizeDesign(raw: unknown): Design {
  const fallback = createDefaultDesign()
  if (!isRecord(raw)) return fallback
  return {
    template: isTemplateId(raw.template) ? raw.template : fallback.template,
    font: isFontId(raw.font) ? raw.font : fallback.font,
    accent: typeof raw.accent === 'string' && /^#[0-9a-f]{6}$/i.test(raw.accent) ? raw.accent : fallback.accent,
    textSize: raw.textSize === 'small' || raw.textSize === 'large' ? raw.textSize : 'medium',
    paper: raw.paper === 'a4' || raw.paper === 'letter' ? raw.paper : fallback.paper,
  }
}

/** Only inline raster images: a remote URL would leak a request when shown. */
export function isImageDataUrl(value: unknown): value is string {
  return typeof value === 'string' && /^data:image\/(jpeg|png);base64,[a-z0-9+/]+=*$/i.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}
