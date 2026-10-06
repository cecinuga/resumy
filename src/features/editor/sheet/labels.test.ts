import { describe, expect, it } from 'vitest'
import { excerpt } from './labels'

describe('excerpt', () => {
  it('keeps short text as it is', () => {
    expect(excerpt('Led the migration')).toBe('Led the migration')
  })

  it('cuts long text between words and marks the cut', () => {
    expect(excerpt('Shipped the new checkout to all markets in 18 months, on budget')).toBe('Shipped the new checkout to all markets…')
  })
})
