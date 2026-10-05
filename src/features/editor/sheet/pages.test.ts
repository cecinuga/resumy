import { describe, expect, it } from 'vitest'
import { paginate, type BreakRule, type PageUnit } from './pages'

/** Units stacked from the top, each `[height, rule]`, with a 10px gap after each. */
function stack(...parts: [number, BreakRule][]): PageUnit[] {
  let top = 0
  return parts.map(([height, rule], index) => {
    const unit = { top, bottom: top + height, rule, lineHeight: 20, field: `f${index}` }
    top += height + 10
    return unit
  })
}

describe('paginate', () => {
  it('finds no break when everything fits on one page', () => {
    expect(paginate(stack([100, 'keep'], [200, 'lines'], [180, 'keep']), 500, 60)).toEqual([])
  })

  it('moves a bullet that does not fit to the next page, whole', () => {
    // The third unit spans 440–490 on a 480px page.
    const breaks = paginate(stack([200, 'keep'], [220, 'keep'], [50, 'keep']), 480, 60)
    expect(breaks).toEqual([{ at: 440, field: 'f2', offset: 0 }])
  })

  it('breaks a paragraph between lines, keeping two lines on each side', () => {
    // Lines of 20px from 210: the page ends at 300, so 4 lines fit and 6 move on.
    expect(paginate(stack([200, 'keep'], [200, 'lines']), 300, 60)).toEqual([{ at: 290, field: 'f1', offset: 80 }])
    // Only one line would fit: the whole paragraph moves.
    expect(paginate(stack([200, 'keep'], [200, 'lines']), 230, 60)[0]).toEqual({ at: 210, field: 'f1', offset: 0 })
  })

  it('moves a heading with too little room under it', () => {
    // The heading ends at 450 on a 500px page, but needs 60px below it.
    const breaks = paginate(stack([420, 'keep'], [20, 'heading'], [30, 'keep']), 500, 60)
    expect(breaks).toEqual([{ at: 430, field: 'f1', offset: 0 }])
  })

  it('counts every page of a long resume, carrying moved content along', () => {
    const units = stack(...Array.from({ length: 12 }, () => [90, 'keep'] as [number, BreakRule]))
    const breaks = paginate(units, 250, 60)
    // Two 90px units fit on each 250px page (the third would end at 290).
    expect(breaks.map((pageBreak) => pageBreak.field)).toEqual(['f2', 'f4', 'f6', 'f8', 'f10'])
  })
})
