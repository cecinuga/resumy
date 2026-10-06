import { describe, expect, it } from 'vitest'
import { getResumeFont } from '../resume/design/fonts'
import { fontThatPrints, pdfFontFamilies, unsupportedCharacters } from './fontCoverage'

const inter = getResumeFont('inter')
const nunito = getResumeFont('nunito-sans')

describe('pdfFontFamilies', () => {
  it('only lists the scripts the text uses', () => {
    expect(pdfFontFamilies(inter, 'Giulia Rossi – Milan')).toEqual(['Inter'])
    expect(pdfFontFamilies(inter, 'Łukasz Żółć')).toEqual(['Inter', 'Inter latin-ext'])
    expect(pdfFontFamilies(inter, 'Олена Шевченко\nΓιώργος\nNguyễn Thị Hương')).toEqual([
      'Inter',
      'Inter latin-ext',
      'Inter vietnamese',
      'Inter cyrillic',
      'Inter greek',
    ])
  })

  it('skips scripts the font has no file for', () => {
    expect(pdfFontFamilies(nunito, 'Γιώργος')).toEqual(['Nunito Sans'])
  })
})

describe('unsupportedCharacters', () => {
  it('finds each character the font cannot print, once', () => {
    expect(unsupportedCharacters(inter, 'Олена Γιώργος Nguyễn Łukasz • – €')).toEqual([])
    expect(unsupportedCharacters(inter, '王伟 王 🚀')).toEqual(['王', '伟', '🚀'])
    expect(unsupportedCharacters(nunito, 'Γιώργος')).toEqual(['Γ', 'ι', 'ώ', 'ρ', 'γ', 'ο', 'ς'])
  })
})

describe('fontThatPrints', () => {
  it('suggests a font that covers every character, if there is one', () => {
    expect(fontThatPrints('Γιώργος')?.id).toBe('source-sans')
    expect(fontThatPrints('王伟')).toBeUndefined()
  })
})
