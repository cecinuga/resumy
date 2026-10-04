import { describe, expect, it } from 'vitest'
import { groupIntoLines, removePageFurniture, type TextFragment, type TextLine } from './textLines'

const fragment = (text: string, x: number, y: number, extra: Partial<TextFragment> = {}): TextFragment => ({
  text,
  x,
  y,
  width: text.length * 5,
  fontSize: 10,
  bold: false,
  endsLine: false,
  ...extra,
})

describe('groupIntoLines', () => {
  it('joins fragments on one baseline and adds missing spaces', () => {
    const [line] = groupIntoLines([fragment('Senior', 50, 100), fragment('Engineer', 85, 100.5)], 1)
    expect(line).toMatchObject({ text: 'Senior Engineer', segments: ['Senior Engineer'], x: 50, page: 1 })
  })

  it('splits a line into segments at wide gaps, such as right-aligned dates', () => {
    const [line] = groupIntoLines([fragment('Engineer', 50, 100), fragment('2020 – 2024', 450, 100)], 1)
    expect(line?.segments).toEqual(['Engineer', '2020 – 2024'])
  })

  it('treats wide whitespace items reported by pdf.js as gaps', () => {
    const [line] = groupIntoLines(
      [fragment('Engineer', 50, 100), fragment(' ', 90, 100, { width: 300 }), fragment('2020', 390, 100)],
      1,
    )
    expect(line?.segments).toEqual(['Engineer', '2020'])
  })

  it('starts a new line when the baseline moves or the text jumps back left', () => {
    const result = groupIntoLines(
      [fragment('First', 50, 100), fragment('Second', 50, 114), fragment('Right', 300, 114), fragment('Left', 50, 114)],
      1,
    )
    expect(result.map((line) => line.text)).toEqual(['First', 'Second Right', 'Left'])
  })

  it('weights size and boldness by characters', () => {
    const [line] = groupIntoLines(
      [fragment('A', 50, 100, { fontSize: 14, bold: true }), fragment('longer body text', 60, 100)],
      1,
    )
    expect(line).toMatchObject({ fontSize: 10, bold: false })
  })
})

describe('removePageFurniture', () => {
  const line = (text: string, page: number): TextLine => ({
    text,
    segments: [text],
    page,
    x: 50,
    right: 200,
    y: 10,
    fontSize: 10,
    bold: false,
  })

  it('drops page numbers and running headers but keeps their first occurrence', () => {
    const result = removePageFurniture(
      [line('Jane Doe', 1), line('Experience', 1), line('Page 1 of 2', 1), line('Jane Doe', 2), line('2 / 2', 2)],
      2,
    )
    expect(result.map((entry) => entry.text)).toEqual(['Jane Doe', 'Experience'])
  })
})
