export type CellError = 'invalidAge' | 'invalidScore';

export type ParsedNumber = { ok: true; value: number | null } | { ok: false; error: CellError };

const BLANK = /^\s*$/;

/** Age: whole number 5..30. Blank is allowed (null). */
export function parseAge(raw: string): ParsedNumber {
  if (BLANK.test(raw)) return { ok: true, value: null };
  const n = Number(raw.trim());
  if (!Number.isInteger(n) || n < 5 || n > 30) return { ok: false, error: 'invalidAge' };
  return { ok: true, value: n };
}

/** Score: number 0..max. Blank is NOT zero, it means "no score". */
export function parseScore(raw: string, max: number): ParsedNumber {
  if (BLANK.test(raw)) return { ok: true, value: null };
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 0 || n > max) return { ok: false, error: 'invalidScore' };
  return { ok: true, value: n };
}

/** Total = sum of entered scores. Blank cells are ignored; null when nothing entered. */
export function calcTotal(values: ReadonlyArray<number | null | undefined>): number | null {
  let sum = 0;
  let any = false;
  for (const v of values) {
    if (v === null || v === undefined) continue;
    sum += v;
    any = true;
  }
  return any ? Math.round(sum * 10) / 10 : null;
}
