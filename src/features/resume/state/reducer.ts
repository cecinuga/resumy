import { getTemplate } from '../design/templates'
import type {
  BasicsTextField,
  Block,
  BlockTextField,
  Design,
  Id,
  Resume,
  Section,
  TemplateId,
  TextItem,
} from '../model/types'
import {
  insertAfter,
  insertAt,
  moveBlock,
  moveItem,
  moveSection,
  updateBlock,
  updateItems,
  updateSection,
} from './operations'

/**
 * Every change to a resume is one of these actions. New nodes are created
 * (with their ids) by the caller, which keeps the reducer pure.
 */
export type ResumeAction =
  | { type: 'basics/set'; field: BasicsTextField; value: string }
  | { type: 'basics/photo'; photo: string | null }
  | { type: 'link/add'; item: TextItem }
  | { type: 'link/set'; id: Id; text: string }
  | { type: 'link/remove'; id: Id }
  | { type: 'section/add'; section: Section; index?: number }
  | { type: 'section/rename'; id: Id; title: string }
  | { type: 'section/toggle'; id: Id }
  | { type: 'section/remove'; id: Id }
  | { type: 'section/move'; id: Id; toIndex: number }
  | { type: 'block/add'; sectionId: Id; block: Block; afterId?: Id; index?: number }
  | { type: 'block/set'; id: Id; field: BlockTextField; value: string }
  | { type: 'block/remove'; id: Id }
  | { type: 'block/move'; id: Id; toSectionId: Id; toIndex: number }
  | { type: 'item/add'; blockId: Id; item: TextItem; afterId?: Id }
  | { type: 'item/set'; blockId: Id; id: Id; text: string }
  | { type: 'item/remove'; blockId: Id; id: Id }
  | { type: 'item/move'; id: Id; toBlockId: Id; toIndex: number }
  | { type: 'design/set'; patch: Partial<Design> }
  | { type: 'design/template'; template: TemplateId }

export function resumeReducer(resume: Resume, action: ResumeAction): Resume {
  switch (action.type) {
    case 'basics/set':
      return { ...resume, basics: { ...resume.basics, [action.field]: action.value } }
    case 'basics/photo':
      return { ...resume, basics: { ...resume.basics, photo: action.photo } }

    case 'link/add':
      return { ...resume, basics: { ...resume.basics, links: [...resume.basics.links, action.item] } }
    case 'link/set':
      return {
        ...resume,
        basics: {
          ...resume.basics,
          links: resume.basics.links.map((link) => (link.id === action.id ? { ...link, text: action.text } : link)),
        },
      }
    case 'link/remove':
      return {
        ...resume,
        basics: { ...resume.basics, links: resume.basics.links.filter((link) => link.id !== action.id) },
      }

    case 'section/add':
      return { ...resume, sections: insertAt(resume.sections, action.index ?? resume.sections.length, action.section) }
    case 'section/rename':
      return updateSection(resume, action.id, (section) => ({ ...section, title: action.title }))
    case 'section/toggle':
      return updateSection(resume, action.id, (section) => ({ ...section, hidden: !section.hidden }))
    case 'section/remove':
      return { ...resume, sections: resume.sections.filter((section) => section.id !== action.id) }
    case 'section/move':
      return moveSection(resume, action.id, action.toIndex)

    case 'block/add':
      return updateSection(resume, action.sectionId, (section) => ({
        ...section,
        blocks:
          action.index === undefined
            ? insertAfter(section.blocks, action.afterId, action.block)
            : insertAt(section.blocks, action.index, action.block),
      }))
    case 'block/set':
      return updateBlock(resume, action.id, (block) =>
        action.field in block ? ({ ...block, [action.field]: action.value } as Block) : block,
      )
    case 'block/remove':
      return {
        ...resume,
        sections: resume.sections.map((section) => ({
          ...section,
          blocks: section.blocks.filter((block) => block.id !== action.id),
        })),
      }
    case 'block/move':
      return moveBlock(resume, action.id, action.toSectionId, action.toIndex)

    case 'item/add':
      return updateItems(resume, action.blockId, (items) => insertAfter(items, action.afterId, action.item))
    case 'item/set':
      return updateItems(resume, action.blockId, (items) =>
        items.map((item) => (item.id === action.id ? { ...item, text: action.text } : item)),
      )
    case 'item/remove':
      return updateItems(resume, action.blockId, (items) => items.filter((item) => item.id !== action.id))
    case 'item/move':
      return moveItem(resume, action.id, action.toBlockId, action.toIndex)

    case 'design/set':
      return { ...resume, design: { ...resume.design, ...action.patch } }
    case 'design/template': {
      // A template comes with its own font and color; both stay adjustable.
      const { id, defaults } = getTemplate(action.template)
      return { ...resume, design: { ...resume.design, template: id, font: defaults.font, accent: defaults.accent } }
    }
  }
}

/**
 * Text edits to the same field are grouped into a single undo step.
 * Returns null for actions that always get their own step.
 */
export function coalesceKey(action: ResumeAction): string | null {
  switch (action.type) {
    case 'basics/set':
      return `basics:${action.field}`
    case 'link/set':
    case 'section/rename':
    case 'item/set':
      return `${action.type}:${action.id}`
    case 'block/set':
      return `block:${action.id}:${action.field}`
    case 'design/set':
      // Dragging across a color picker is one change, not hundreds.
      return `design:${Object.keys(action.patch).sort().join(',')}`
    default:
      return null
  }
}
