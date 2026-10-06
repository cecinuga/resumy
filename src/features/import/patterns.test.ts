import { describe, expect, it } from 'vitest'
import { splitList } from '../../lib/text'
import { EMAIL, findDateRange, findPhone, isBullet, isLocation, stripBullet, toNameCase, toSentenceCase } from './patterns'

describe('findDateRange', () => {
  it.each([
    ['Engineer  Jan 2020 – Present', 'Jan 2020 – Present'],
    ['September 2018 - March 2021', 'September 2018 - March 2021'],
    ['Sept. 2019 – Aug. 2020', 'Sept. 2019 – Aug. 2020'],
    ['03/2017 - 12/2019', '03/2017 - 12/2019'],
    ['2015 to 2017', '2015 to 2017'],
    ['Gen 2021 – Oggi', 'Gen 2021 – Oggi'],
    ['dal 2019 ad oggi', 'dal 2019 ad oggi'],
    ['Developer (2019-2021)', '2019-2021'],
  ])('finds the range in %j', (text, range) => {
    expect(findDateRange(text)).toBe(range)
  })

  it.each(['Grew revenue by 2020 units', 'Marketing 2020', 'Summary'])('finds no range in %j', (text) => {
    expect(findDateRange(text)).toBeNull()
  })
})

describe('findPhone', () => {
  it.each(['+39 333 123 4567', '(555) 123-4567', '0039 02 1234 5678', '+44 20 7946 0958'])('finds %j', (phone) => {
    expect(findPhone(`Phone: ${phone}`)).toBe(phone)
  })

  it.each(['2019 - 2021', 'Room 12', '42'])('ignores %j', (text) => {
    expect(findPhone(text)).toBeNull()
  })
})

describe('isLocation', () => {
  it.each(['Milan, Italy', 'Austin, TX', 'San Francisco, CA', 'Roma (RM)', 'Remote'])('accepts %j', (text) => {
    expect(isLocation(text)).toBe(true)
  })

  it.each(['Software Engineer, Backend', 'Bachelor of Science, Computer Science', 'Politecnico di Milano', '20121 Milano'])(
    'rejects %j',
    (text) => {
      expect(isLocation(text)).toBe(false)
    },
  )
})

describe('text helpers', () => {
  it('recognises bullets, including symbol-font glyphs, but not hyphenated words', () => {
    expect(isBullet('• Led a team')).toBe(true)
    expect(isBullet('- Led a team')).toBe(true)
    expect(isBullet('\uF0B7 Led a team')).toBe(true)
    expect(isBullet('1. Led a team')).toBe(true)
    expect(isBullet('Self-taught developer')).toBe(false)
    expect(stripBullet('▪ Led a team')).toBe('Led a team')
  })

  it('fixes all-caps names and headings, and leaves mixed case alone', () => {
    expect(toNameCase("JEAN-LUC O'NEIL")).toBe("Jean-Luc O'Neil")
    expect(toNameCase('Anna McKenzie')).toBe('Anna McKenzie')
    expect(toSentenceCase('WORK EXPERIENCE')).toBe('Work experience')
    expect(toSentenceCase('Work Experience')).toBe('Work Experience')
  })

  it('splits lists without breaking parentheses', () => {
    expect(splitList('English (C1, fluent), Italian; Spanish · German.')).toEqual([
      'English (C1, fluent)',
      'Italian',
      'Spanish',
      'German',
    ])
  })
})

describe('EMAIL', () => {
  it('finds addresses but scans a long run of letters without one quickly', () => {
    expect(EMAIL.exec('Write to jane.doe@example.com today')?.[0]).toBe('jane.doe@example.com')
    const start = performance.now()
    expect(EMAIL.test('a'.repeat(50_000))).toBe(false)
    expect(performance.now() - start).toBeLessThan(200)
  })
})
