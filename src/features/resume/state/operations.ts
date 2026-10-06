import type { Block, Id, ItemBlock, Resume, Section, TextItem } from '../model/types'
import { hasItems, itemKind } from '../model/types'

/**
 * Pure, immutable helpers over a Resume. The reducer and the drag-and-drop
 * preview both build on these, so a move looks the same while dragging and
 * after dropping.
 */

/** Maps a list, returning the original when no element changed (so no-op edits stay no-ops). */
function mapPreserving<T>(list: T[], fn: (value: T) => T): T[] {
  let changed = false
  const next = list.map((value) => {
    const mapped = fn(value)
    if (mapped !== value) changed = true
    return mapped
  })
  return changed ? next : list
}

export function mapSections(resume: Resume, fn: (section: Section) => Section): Resume {
  const sections = mapPreserving(resume.sections, fn)
  return sections === resume.sections ? resume : { ...resume, sections }
}

export function mapBlocks(resume: Resume, fn: (block: Block) => Block): Resume {
  return mapSections(resume, (section) => {
    const blocks = mapPreserving(section.blocks, fn)
    return blocks === section.blocks ? section : { ...section, blocks }
  })
}

export function updateSection(resume: Resume, id: Id, fn: (section: Section) => Section): Resume {
  return mapSections(resume, (section) => (section.id === id ? fn(section) : section))
}

export function updateBlock(resume: Resume, id: Id, fn: (block: Block) => Block): Resume {
  return mapBlocks(resume, (block) => (block.id === id ? fn(block) : block))
}

export function updateItems(resume: Resume, blockId: Id, fn: (items: TextItem[]) => TextItem[]): Resume {
  return updateBlock(resume, blockId, (block) => {
    if (!hasItems(block)) return block
    const items = fn(block.items)
    return items === block.items ? block : { ...block, items }
  })
}

/** Removes the element with `id`, returning the original list when there is none. */
export function removeById<T extends { id: Id }>(list: T[], id: Id): T[] {
  return list.some((entry) => entry.id === id) ? list.filter((entry) => entry.id !== id) : list
}

export function insertAt<T>(list: readonly T[], index: number, value: T): T[] {
  const clamped = Math.max(0, Math.min(index, list.length))
  return [...list.slice(0, clamped), value, ...list.slice(clamped)]
}

/** Inserts after the element with `afterId`, or at the end when there is none. */
export function insertAfter<T extends { id: Id }>(list: readonly T[], afterId: Id | undefined, ...values: T[]): T[] {
  const index = list.findIndex((entry) => entry.id === afterId)
  const at = index === -1 ? list.length : index + 1
  return [...list.slice(0, at), ...values, ...list.slice(at)]
}

export function moveWithin<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  const [moved] = next.splice(from, 1)
  if (moved !== undefined) next.splice(Math.max(0, Math.min(to, next.length)), 0, moved)
  return next
}

/* ---------- Lookups ---------- */

export function findBlock(resume: Resume, id: Id): { block: Block; section: Section } | null {
  for (const section of resume.sections) {
    const block = section.blocks.find((candidate) => candidate.id === id)
    if (block) return { block, section }
  }
  return null
}

export function findItem(resume: Resume, id: Id): { item: TextItem; block: ItemBlock; index: number } | null {
  for (const section of resume.sections) {
    for (const block of section.blocks) {
      if (!hasItems(block)) continue
      const index = block.items.findIndex((item) => item.id === id)
      if (index !== -1) return { item: block.items[index]!, block, index }
    }
  }
  return null
}

/* ---------- Moves (drag and drop) ---------- */

/** Moves a block to `toIndex` within the section `toSectionId` (possibly another section). */
export function moveBlock(resume: Resume, blockId: Id, toSectionId: Id, toIndex: number): Resume {
  const found = findBlock(resume, blockId)
  if (!found || !resume.sections.some((section) => section.id === toSectionId)) return resume
  if (found.section.id === toSectionId) {
    const from = found.section.blocks.indexOf(found.block)
    return updateSection(resume, toSectionId, (section) => ({
      ...section,
      blocks: moveWithin(section.blocks, from, toIndex),
    }))
  }
  return mapSections(resume, (section) => {
    if (section.id === found.section.id) {
      return { ...section, blocks: section.blocks.filter((block) => block.id !== blockId) }
    }
    if (section.id === toSectionId) return { ...section, blocks: insertAt(section.blocks, toIndex, found.block) }
    return section
  })
}

/**
 * Moves an item (bullet or tag) to `toIndex` within the block `toBlockId`.
 * Bullets only travel between bullet blocks and tags between tag blocks.
 */
export function moveItem(resume: Resume, itemId: Id, toBlockId: Id, toIndex: number): Resume {
  const found = findItem(resume, itemId)
  const target = findBlock(resume, toBlockId)?.block
  if (!found || !target || !hasItems(target) || itemKind(target) !== itemKind(found.block)) return resume
  if (found.block.id === toBlockId) {
    return updateItems(resume, toBlockId, (items) => moveWithin(items, found.index, toIndex))
  }
  return mapBlocks(resume, (block) => {
    if (!hasItems(block)) return block
    if (block.id === found.block.id) return { ...block, items: block.items.filter((item) => item.id !== itemId) }
    if (block.id === toBlockId) return { ...block, items: insertAt(block.items, toIndex, found.item) }
    return block
  })
}

export function moveSection(resume: Resume, sectionId: Id, toIndex: number): Resume {
  const from = resume.sections.findIndex((section) => section.id === sectionId)
  return from === -1 ? resume : { ...resume, sections: moveWithin(resume.sections, from, toIndex) }
}
