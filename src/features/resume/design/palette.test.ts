import { describe, expect, it } from 'vitest'
import { AA_TEXT, hexContrast } from '../../../lib/contrast'
import { ACCENT_PRESETS, RESUME_INK } from './palette'
import { TEMPLATES } from './templates'

describe('resume colors', () => {
  it.each(ACCENT_PRESETS)('accent $name is readable on paper', ({ value }) => {
    expect(hexContrast(value, RESUME_INK.paper)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(TEMPLATES)('default accent of the $name template is readable on paper', ({ defaults }) => {
    expect(hexContrast(defaults.accent, RESUME_INK.paper)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it('keeps body and secondary text readable on paper', () => {
    expect(hexContrast(RESUME_INK.text, RESUME_INK.paper)).toBeGreaterThanOrEqual(AA_TEXT)
    expect(hexContrast(RESUME_INK.muted, RESUME_INK.paper)).toBeGreaterThanOrEqual(AA_TEXT)
  })
})
