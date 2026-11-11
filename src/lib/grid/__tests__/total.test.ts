import { describe, expect, it } from 'vitest'

import { calculateTotal } from '../total'

describe('calculateTotal', () => {
  it('ignores blanks and returns null when every value is blank', () => {
    expect(calculateTotal([null, '', undefined, '   '])).toBeNull()
  })

  it('sums numeric values and keeps decimals', () => {
    expect(calculateTotal([90, 12.5, null, '7.5', ''])).toBe(110)
  })

  it('excludes non-score values when the caller passes only score cells', () => {
    expect(calculateTotal(['50', 25, null, 25])).toBe(100)
  })
})
