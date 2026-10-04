import { describe, expect, it } from 'vitest'
import { contrastRatio, hexContrast, parseHex } from './contrast'

describe('contrast', () => {
  it('parses short and long hex colors', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255])
    expect(parseHex('#3F5B45')).toEqual([63, 91, 69])
    expect(parseHex('red')).toBeNull()
  })

  it('matches the WCAG reference values', () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
    expect(hexContrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
    expect(hexContrast('#ffffff', '#ffffff')).toBe(1)
  })

  it('is symmetric', () => {
    expect(hexContrast('#A84E2B', '#F3F0E3')).toBeCloseTo(hexContrast('#F3F0E3', '#A84E2B'), 10)
  })
})
