import type { Block, BlockType } from '../../resume/model/types'

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  entry: 'entry',
  text: 'paragraph',
  list: 'bullet list',
  tags: 'tag group',
}

/** A short spoken name for a block, e.g. "entry Senior engineer". */
export function describeBlock(block: Block): string {
  const text =
    block.type === 'entry'
      ? block.title || block.subtitle
      : block.type === 'text'
        ? block.text.slice(0, 40)
        : block.type === 'tags'
          ? block.label
          : block.items[0]?.text.slice(0, 40)
  return text ? `${BLOCK_TYPE_LABELS[block.type]} “${text.trim()}”` : BLOCK_TYPE_LABELS[block.type]
}
