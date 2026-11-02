import type { MutableRefObject } from 'react';
import type { Dict } from '../i18n';
import type { CellValue } from './SpreadsheetGrid';
import type { GridApi, GridSelection } from './useWorkbook';

const pill =
  'flex items-center gap-1 overflow-x-auto rounded-pill bg-surface px-2 py-1 shadow-nav';

const pillButton =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-navy disabled:opacity-40';

export function CellBar({
  tr,
  value,
  editing,
  onStartEdit,
  onChange
}: {
  tr: Dict;
  value: CellValue;
  editing: boolean;
  onStartEdit: () => void;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1">
      <span className="shrink-0 text-sm italic text-muted" aria-hidden="true">
        fx
      </span>
      <input
        aria-label={tr.spreadsheet.formulaBar}
        className={`min-w-0 flex-1 rounded-pill border bg-surface px-3 py-2 text-sm text-navy outline-none ${
          editing ? 'border-accent' : 'border-line'
        }`}
        value={value === null || value === undefined ? '' : String(value)}
        onFocus={onStartEdit}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  );
}

export function SelectionToolbar({
  tr,
  gridRef
}: {
  tr: Dict;
  gridRef: MutableRefObject<GridApi | null>;
}) {
  const items: { label: string; glyph: string; run?: () => void }[] = [
    { label: tr.spreadsheet.copy, glyph: '⧉' },
    { label: tr.spreadsheet.formatCells, glyph: 'A' },
    { label: tr.spreadsheet.sort, glyph: '↕' },
    { label: tr.spreadsheet.insert, glyph: '+' },
    { label: tr.spreadsheet.filter, glyph: '▽' },
    { label: tr.spreadsheet.fillColor, glyph: '▨' },
    { label: tr.spreadsheet.decreaseDecimals, glyph: '.0' },
    { label: tr.spreadsheet.increaseDecimals, glyph: '.00' },
    { label: tr.spreadsheet.deleteCells, glyph: '⌫' },
    { label: tr.spreadsheet.mergeCells, glyph: '⛶' }
  ];

  return (
    <div className={pill} role="toolbar" aria-label={tr.spreadsheet.more}>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          aria-label={item.label}
          disabled={!item.run}
          onClick={() => {
            item.run?.();
            void gridRef;
          }}
          className={pillButton}
        >
          <span aria-hidden="true" className="text-sm font-semibold">
            {item.glyph}
          </span>
        </button>
      ))}
    </div>
  );
}

export function EditButtons({
  tr,
  onConfirm,
  onCancel
}: {
  tr: Dict;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={tr.spreadsheet.cancelEdit}
        onClick={onCancel}
        className="flex h-10 w-10 items-center justify-center rounded-pill bg-danger text-surface shadow-soft"
      >
        <span aria-hidden="true">✕</span>
      </button>
      <button
        type="button"
        aria-label={tr.spreadsheet.confirmEdit}
        onClick={onConfirm}
        className="flex h-10 w-10 items-center justify-center rounded-pill bg-success text-surface shadow-soft"
      >
        <span aria-hidden="true">✓</span>
      </button>
    </div>
  );
}

export function KeyboardPill({
  tr,
  gridRef,
  numberMode,
  onToggleKeyboard
}: {
  tr: Dict;
  gridRef: MutableRefObject<GridApi | null>;
  numberMode: boolean;
  onToggleKeyboard: () => void;
}) {
  return (
    <div className={pill} role="toolbar" aria-label={tr.spreadsheet.more}>
      <button type="button" aria-label={tr.spreadsheet.paste} className={pillButton} disabled>
        <span aria-hidden="true">📋</span>
      </button>
      <button
        type="button"
        aria-label={tr.spreadsheet.previousCell}
        className={pillButton}
        onClick={() => gridRef.current?.moveSelection?.('left')}
      >
        <span aria-hidden="true">←</span>
      </button>
      <button
        type="button"
        aria-label={tr.spreadsheet.nextCell}
        className={pillButton}
        onClick={() => gridRef.current?.moveSelection?.('right')}
      >
        <span aria-hidden="true">→</span>
      </button>
      <button
        type="button"
        aria-label={numberMode ? tr.spreadsheet.textKeyboard : tr.spreadsheet.numberKeyboard}
        aria-pressed={numberMode}
        className={pillButton}
        onClick={onToggleKeyboard}
      >
        <span aria-hidden="true">123</span>
      </button>
      <button type="button" aria-label={tr.spreadsheet.pickDate} className={pillButton} disabled>
        <span aria-hidden="true">📅</span>
      </button>
      <button
        type="button"
        aria-label={tr.spreadsheet.undo}
        className={pillButton}
        onClick={() => gridRef.current?.undo?.()}
      >
        <span aria-hidden="true">↶</span>
      </button>
      <button
        type="button"
        aria-label={tr.spreadsheet.more}
        className={pillButton}
        onClick={() => gridRef.current?.hideKeyboard?.()}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      <button
        type="button"
        aria-label={tr.spreadsheet.hideKeyboard}
        className={pillButton}
        onClick={() => gridRef.current?.hideKeyboard?.()}
      >
        <span aria-hidden="true">⌨</span>
      </button>
    </div>
  );
}

export function cellLabel(selection: GridSelection): string {
  const col = (n: number) => {
    let s = '';
    let x = n + 1;
    while (x > 0) {
      const r = (x - 1) % 26;
      s = String.fromCharCode(65 + r) + s;
      x = Math.floor((x - 1) / 26);
    }
    return s;
  };
  const start = `${col(selection.left)}${selection.top + 1}`;
  if (selection.left === selection.right && selection.top === selection.bottom) return start;
  return `${start}:${col(selection.right)}${selection.bottom + 1}`;
}
