import { describe, expect, it } from 'vitest'

import { parsePaste } from '../parsePaste'

describe('parsePaste', () => {
  it('splits tab and newline delimiters while preserving empty cells', () => {
    expect(parsePaste('Alice\t90\nBob\t\nCharlie\t85')).toEqual([
      ['Alice', '90'],
      ['Bob', ''],
      ['Charlie', '85'],
    ])
  })

  it('supports Windows line endings and ragged rows', () => {
    expect(parsePaste('A\tB\r\nC\nD\tE\tF')).toEqual([
      ['A', 'B'],
      ['C'],
      ['D', 'E', 'F'],
    ])
  })

  it('drops trailing empty rows from a final newline', () => {
    expect(parsePaste('1\t2\n')).toEqual([['1', '2']])
  })
})
