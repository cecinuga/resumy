import { createId } from '../../../lib/id'
import { defaultPaperSize } from '../design/paper'
import { getTemplate } from '../design/templates'
import { getSectionPreset, type SectionPresetId } from './sectionPresets'
import type {
  Block,
  BlockType,
  Design,
  EntryBlock,
  ListBlock,
  Resume,
  Section,
  TagsBlock,
  TextBlock,
  TextItem,
} from './types'

export function createItem(text = ''): TextItem {
  return { id: createId(), text }
}

type EntryFields = Partial<Pick<EntryBlock, 'title' | 'subtitle' | 'date' | 'location'>>

export function createEntry(fields: EntryFields = {}, items: string[] = ['']): EntryBlock {
  return {
    id: createId(),
    type: 'entry',
    title: fields.title ?? '',
    subtitle: fields.subtitle ?? '',
    date: fields.date ?? '',
    location: fields.location ?? '',
    items: items.map(createItem),
  }
}

export function createTextBlock(text = ''): TextBlock {
  return { id: createId(), type: 'text', text }
}

export function createListBlock(items: string[] = ['']): ListBlock {
  return { id: createId(), type: 'list', items: items.map(createItem) }
}

export function createTagsBlock(label = '', items: string[] = []): TagsBlock {
  return { id: createId(), type: 'tags', label, items: items.map(createItem) }
}

export function createBlock(type: BlockType): Block {
  switch (type) {
    case 'entry':
      return createEntry()
    case 'text':
      return createTextBlock()
    case 'list':
      return createListBlock()
    case 'tags':
      return createTagsBlock()
  }
}

export function createSection(title: string, blocks: Block[] = []): Section {
  return { id: createId(), title, hidden: false, blocks }
}

export function createSectionFromPreset(presetId: SectionPresetId): Section {
  const preset = getSectionPreset(presetId)
  return createSection(preset.title, [createBlock(preset.blockType)])
}

export function createDefaultDesign(locale = navigator.language): Design {
  const template = getTemplate('professional')
  return {
    template: template.id,
    font: template.defaults.font,
    accent: template.defaults.accent,
    textSize: 'medium',
    paper: defaultPaperSize(locale),
  }
}

/** A blank resume with the four sections nearly everyone needs. */
export function createEmptyResume(design: Design = createDefaultDesign()): Resume {
  return {
    version: 1,
    basics: { name: '', headline: '', email: '', phone: '', location: '', links: [], photo: null },
    sections: (['summary', 'experience', 'education', 'skills'] as const).map(createSectionFromPreset),
    design,
  }
}
