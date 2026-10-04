/** WCAG 2.x contrast helpers. */

export type Rgb = readonly [red: number, green: number, blue: number]

/** Parses `#rgb` or `#rrggbb`; returns null for anything else. */
export function parseHex(color: string): Rgb | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!match?.[1]) return null
  const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1]
  const channel = (offset: number) => Number.parseInt(hex.slice(offset, offset + 2), 16)
  return [channel(0), channel(2), channel(4)]
}

function channelLuminance(value: number): number {
  const srgb = value / 255
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b)
}

/** Contrast ratio between two colors, from 1 (none) to 21 (black on white). */
export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  const [light, dark] = a > b ? [a, b] : [b, a]
  return (light + 0.05) / (dark + 0.05)
}

/** Contrast ratio between two hex colors; 1 when either cannot be parsed. */
export function hexContrast(foreground: string, background: string): number {
  const fg = parseHex(foreground)
  const bg = parseHex(background)
  return fg && bg ? contrastRatio(fg, bg) : 1
}

/** Minimum ratios from WCAG 2.x level AA. */
export const AA_TEXT = 4.5
export const AA_NON_TEXT = 3
