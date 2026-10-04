// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AA_NON_TEXT, AA_TEXT, hexContrast } from '../lib/contrast'

const tokensCss = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

/** Reads `--name: #hex` declarations from the first block matching `selector`. */
function readTokens(selector: string): Record<string, string> {
  const start = tokensCss.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`No ${selector} block in tokens.css`)
  const block = tokensCss.slice(start, tokensCss.indexOf('\n}', start))
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,6})\b/gi)].map(([, name, value]) => [name!, value!]))
}

const light = readTokens(':root')
const themes = {
  light,
  // The dark theme overrides some tokens; the rest (such as the page) are inherited.
  dark: { ...light, ...readTokens(":root[data-theme='dark']") },
}

/** Every text color drawn on a background in the interface: [text, background, where]. */
const TEXT_PAIRS = [
  ['text', 'bg', 'body text'],
  ['text', 'surface', 'cards, panels, menus'],
  ['text', 'surface-quiet', 'nav rail labels, selected options'],
  ['text-muted', 'bg', 'secondary text'],
  ['text-muted', 'surface', 'hints in cards and panels'],
  ['structure', 'bg', 'headings'],
  ['structure', 'surface', 'headings in cards, secondary buttons'],
  ['accent-strong', 'bg', 'text links'],
  ['accent-strong', 'surface', 'text links in cards'],
  ['on-accent', 'accent-strong', 'primary button'],
  ['on-github', 'github', 'GitHub button'],
  ['bg', 'text', 'toasts (inverted)'],
  ['page-ink', 'page', 'inputs drawn on the sheet'],
  ['page-muted', 'page', 'placeholders on the sheet'],
  ['page-muted', 'page-hover', 'placeholders under the pointer'],
  ['page-control', 'page', 'buttons on the sheet'],
  ['page-control', 'page-hover', 'hovered buttons on the sheet'],
] as const

/** Icons, focus rings and control outlines need 3:1 (WCAG 1.4.11). */
const NON_TEXT_PAIRS = [
  ['structure', 'bg', 'focus ring, icons'],
  ['structure', 'surface', 'focus ring, icons in cards'],
  ['structure', 'surface-quiet', 'nav rail icons'],
  ['control-border', 'bg', 'input outlines'],
  ['control-border', 'surface', 'input outlines in panels'],
  ['accent-strong', 'surface', 'alert icons'],
] as const

describe.each(Object.entries(themes))('%s theme', (_, tokens) => {
  const color = (name: string) => {
    const value = tokens[name]
    if (!value) throw new Error(`Token --${name} is not defined`)
    return value
  }

  it.each(TEXT_PAIRS)('--%s on --%s (%s) reaches WCAG AA for text', (text, background) => {
    expect(hexContrast(color(text), color(background))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(NON_TEXT_PAIRS)('--%s on --%s (%s) reaches 3:1', (foreground, background) => {
    expect(hexContrast(color(foreground), color(background))).toBeGreaterThanOrEqual(AA_NON_TEXT)
  })
})

describe('tokens file', () => {
  it('keeps the page color identical in every theme', () => {
    expect(themes.dark.page).toBe(themes.light.page)
  })
})
