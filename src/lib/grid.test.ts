import { describe, expect, it } from 'vitest';
import { calcTotal, parseAge, parseScore } from './grid';

describe('calcTotal', () => {
  it('ignores blank cells', () => {
    expect(calcTotal([47, null, 45, undefined, 28])).toBe(120);
  });
  it('shows nothing when no scores are entered', () => {
    expect(calcTotal([null, null])).toBeNull();
    expect(calcTotal([])).toBeNull();
  });
  it('keeps one decimal', () => {
    expect(calcTotal([49.5, 45, 0.25, 0.25])).toBe(95);
    expect(calcTotal([0.1, 0.2])).toBe(0.3);
  });
  it('counts zero as an entered score', () => {
    expect(calcTotal([0, null])).toBe(0);
  });
});

describe('parseScore', () => {
  it('accepts blanks as no score', () => {
    expect(parseScore('', 100)).toEqual({ ok: true, value: null });
  });
  it('accepts values within range', () => {
    expect(parseScore('49.5', 100)).toEqual({ ok: true, value: 49.5 });
    expect(parseScore('0', 100)).toEqual({ ok: true, value: 0 });
    expect(parseScore('100', 100)).toEqual({ ok: true, value: 100 });
  });
  it('rejects values outside the subject maximum', () => {
    expect(parseScore('101', 100)).toEqual({ ok: false, error: 'invalidScore' });
    expect(parseScore('-1', 100)).toEqual({ ok: false, error: 'invalidScore' });
    expect(parseScore('abc', 100)).toEqual({ ok: false, error: 'invalidScore' });
  });
});

describe('parseAge', () => {
  it('accepts whole numbers 5 to 30', () => {
    expect(parseAge('16')).toEqual({ ok: true, value: 16 });
    expect(parseAge('5')).toEqual({ ok: true, value: 5 });
    expect(parseAge('30')).toEqual({ ok: true, value: 30 });
  });
  it('rejects out of range or fractional ages', () => {
    expect(parseAge('4')).toEqual({ ok: false, error: 'invalidAge' });
    expect(parseAge('31')).toEqual({ ok: false, error: 'invalidAge' });
    expect(parseAge('16.5')).toEqual({ ok: false, error: 'invalidAge' });
  });
});
