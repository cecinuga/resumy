import type { Block, BlockType } from '../../resume/model/types'

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  entry: 'entry',
  text: 'paragraph',
  list: 'bullet list',
  tags: 'tag group',
}

/** The start of a text for a label: at most `max` characters, cut between words, with "…" when cut. */
export function excerpt(text: string, max = 40): string {
  const value = text.trim().replace(/\s+/g, ' ')
  if (value.length <= max) return value
  const cut = value.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:.–—-]+$/, '')}…`
}

/** A short spoken name for a block, e.g. "entry Senior engineer". */
export function describeBlock(block: Block): string {
  const text =
    block.type === 'entry'
      ? block.title || block.subtitle
      : block.type === 'text'
        ? excerpt(block.text)
        : block.type === 'tags'
          ? block.label
          : excerpt(block.items[0]?.text ?? '')
  return text ? `${BLOCK_TYPE_LABELS[block.type]} “${text.trim()}”` : BLOCK_TYPE_LABELS[block.type]
}
