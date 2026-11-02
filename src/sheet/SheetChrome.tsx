import type { MutableRefObject } from 'react';
import type { Dict } from '../i18n';
import type { CellValue } from './SpreadsheetGrid';
import type { GridApi, GridSelection } from './useWorkbook';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CloseIcon,
  HideKeyboardIcon,
  RedoIcon,
  UndoIcon
} from '../components/icons';

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
  // Only actions that actually work are rendered; the rest arrive with the
  // stage that implements them, so the toolbar never shows a dead button.
  return (
    <div className={pill} role="toolbar" aria-label={tr.spreadsheet.more}>
      <button
        type="button"
        aria-label={tr.spreadsheet.undo}
        className={pillButton}
        onClick={() => gridRef.current?.undo?.()}
      >
        <UndoIcon width={24} height={24} />
      </button>
      <button
        type="button"
        aria-label={tr.spreadsheet.redo}
        className={pillButton}
        onClick={() => gridRef.current?.redo?.()}
      >
        <RedoIcon width={24} height={24} />
      </button>
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
        <CloseIcon width={22} height={22} />
      </button>
      <button
        type="button"
        aria-label={tr.spreadsheet.confirmEdit}
        onClick={onConfirm}
        className="flex h-10 w-10 items-center justify-center rounded-pill bg-success text-surface shadow-soft"
      >
        <CheckIcon width={22} height={22} />
      </button>
    </div>
  );
}

export function KeyboardPill({
  tr,
  gridRef
}: {
  tr: Dict;
  gridRef: MutableRefObject<GridApi | null>;
}) {
  return (
    <div className={pill} role="toolbar" aria-label={tr.spreadsheet.more}>
      <button
        type="button"
        aria-label={tr.spreadsheet.previousCell}
        className={pillButton}
        onClick={() => gridRef.current?.moveSelection?.('left')}
      >
        <ArrowLeftIcon width={24} height={24} />
      </button>
      <button
        type="button"
        aria-label={tr.spreadsheet.nextCell}
        className={pillButton}
        onClick={() => gridRef.current?.moveSelection?.('right')}
      >
        <ArrowRightIcon width={24} height={24} />
      </button>
      <button
        type="button"
        aria-label={tr.spreadsheet.undo}
        className={pillButton}
        onClick={() => gridRef.current?.undo?.()}
      >
        <UndoIcon width={24} height={24} />
      </button>
      <button
        type="button"
        aria-label={tr.spreadsheet.hideKeyboard}
        className={pillButton}
        onClick={() => gridRef.current?.hideKeyboard?.()}
      >
        <HideKeyboardIcon width={24} height={24} />
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
