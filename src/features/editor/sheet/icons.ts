import { createLucideIcon } from 'lucide-react'

/** Lucide's six grip circles (r = 1), as closed arcs of a single path. */
const GRIP_DOTS = [
  [9, 12],
  [9, 5],
  [9, 19],
  [15, 12],
  [15, 5],
  [15, 19],
]
  .map(([x, y]) => `M${x! + 1} ${y}a1 1 0 1 1-2 0a1 1 0 1 1 2 0z`)
  .join('')

/**
 * Lucide's grip-vertical drawn as one <path> instead of six <circle>s: the
 * same attributes and class names, and the same pixels at the sizes the
 * sheet uses. Every block, bullet and tag has a grip, so this alone removes
 * about a third of the sheet's DOM.
 */
export const GripVertical = createLucideIcon({
  name: 'grip-vertical',
  size: 24,
  node: [['path', { d: GRIP_DOTS, key: 'dots' }]],
})
