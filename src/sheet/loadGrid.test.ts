import { describe, expect, it } from 'vitest';
import { loadGrid } from './loadGrid';

describe('loadGrid', () => {
  it('resolves the grid library on demand and reuses one promise', async () => {
    const first = loadGrid();
    const second = loadGrid();
    expect(second).toBe(first);
    const mod = await first;
    expect(typeof mod.default).toBe('function');
  });
});
