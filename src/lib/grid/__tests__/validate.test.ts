import { describe, expect, it } from 'vitest'

import { isValidAge, isValidScore, isValidSex } from '../validate'

describe('validate', () => {
  it('accepts valid score ranges and rejects out-of-range values', () => {
    expect(isValidScore(45, 100)).toBe(true)
    expect(isValidScore(101, 100)).toBe(false)
    expect(isValidScore(-1, 100)).toBe(false)
  })

  it('accepts only valid ages and sexes', () => {
    expect(isValidAge(17)).toBe(true)
    expect(isValidAge(4)).toBe(false)
    expect(isValidSex('M')).toBe(true)
    expect(isValidSex('X')).toBe(false)
  })
})
