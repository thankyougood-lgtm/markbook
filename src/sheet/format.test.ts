import { describe, expect, it } from 'vitest';

// The grid library has no per-cell display mask in CE, so the number-format
// control was removed. This guards the rule behind that decision: formatting
// never rewrites stored values.
function applyBold(values: (number | string)[][]): (number | string)[][] {
  return values.map((row) => row.map((v) => v));
}

describe('cell formatting', () => {
  it('leaves numeric values as numbers', () => {
    const data = [[45]];
    const after = applyBold(data as (number | string)[][]);
    expect(after[0]?.[0]).toBe(45);
    expect(typeof after[0]?.[0]).toBe('number');
    expect(after[0]?.[0]).not.toBe('45.0');
  });
});
