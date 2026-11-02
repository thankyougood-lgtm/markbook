import type { MutableRefObject } from 'react';
import type { Dict } from '../i18n';
import type { CellValue } from './SpreadsheetGrid';
import type { GridApi, GridSelection } from './useWorkbook';
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BoldIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  DeleteIcon,
  FormatIcon,
  HideKeyboardIcon,
  ItalicIcon,
  MergeIcon,
  PasteIcon,
  PlusIcon,
  RedoIcon,
  ScissorsIcon,
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
  gridRef,
  onFormat,
  onInsert,
  onDelete
}: {
  tr: Dict;
  gridRef: MutableRefObject<GridApi | null>;
  onFormat: () => void;
  onInsert: () => void;
  onDelete: () => void;
}) {
  // Only actions that actually work are rendered, so the toolbar never shows a
  // dead button.
  return (
    <div className={pill} role="toolbar" aria-label={tr.spreadsheet.more}>
      <button type="button" aria-label={tr.spreadsheet.undo} className={pillButton} onClick={() => gridRef.current?.undo?.()}>
        <UndoIcon width={24} height={24} />
      </button>
      <button type="button" aria-label={tr.spreadsheet.redo} className={pillButton} onClick={() => gridRef.current?.redo?.()}>
        <RedoIcon width={24} height={24} />
      </button>
      <button type="button" aria-label={tr.spreadsheet.copy} className={pillButton} onClick={() => gridRef.current?.copy?.()}>
        <CopyIcon width={24} height={24} />
      </button>
      <button type="button" aria-label={tr.spreadsheet.cut} className={pillButton} onClick={() => gridRef.current?.copy?.(true)}>
        <ScissorsIcon width={24} height={24} />
      </button>
      <button
        type="button"
        aria-label={tr.spreadsheet.paste}
        className={pillButton}
        onClick={() => {
          void gridRef.current?.pasteFromClipboard?.().catch(() => undefined);
        }}
      >
        <PasteIcon width={24} height={24} />
      </button>
      <button type="button" aria-label={tr.spreadsheet.formatCells} className={pillButton} onClick={onFormat}>
        <FormatIcon width={24} height={24} />
      </button>
      <button type="button" aria-label={tr.spreadsheet.insert} className={pillButton} onClick={onInsert}>
        <PlusIcon width={24} height={24} />
      </button>
      <button type="button" aria-label={tr.spreadsheet.deleteCells} className={pillButton} onClick={onDelete}>
        <DeleteIcon width={24} height={24} />
      </button>
      <button type="button" aria-label={tr.spreadsheet.mergeCells} className={pillButton} onClick={() => gridRef.current?.mergeSelection?.()}>
        <MergeIcon width={24} height={24} />
      </button>
    </div>
  );
}

export function InsertMenu({
  tr,
  gridRef,
  onClose
}: {
  tr: Dict;
  gridRef: MutableRefObject<GridApi | null>;
  onClose: () => void;
}) {
  const run = (action: () => void) => {
    action();
    onClose();
  };
  const item =
    'w-full rounded-btn px-4 py-3 text-left text-sm text-navy hover:bg-header-bg';
  return (
    <div className="space-y-1">
      <button type="button" className={item} onClick={() => run(() => gridRef.current?.insertRow?.(true))}>
        {tr.spreadsheet.rowAbove}
      </button>
      <button type="button" className={item} onClick={() => run(() => gridRef.current?.insertRow?.(false))}>
        {tr.spreadsheet.rowBelow}
      </button>
      <button type="button" className={item} onClick={() => run(() => gridRef.current?.insertColumn?.(true))}>
        {tr.spreadsheet.columnLeft}
      </button>
      <button type="button" className={item} onClick={() => run(() => gridRef.current?.insertColumn?.(false))}>
        {tr.spreadsheet.columnRight}
      </button>
    </div>
  );
}

export function DeleteMenu({
  tr,
  gridRef,
  onClose
}: {
  tr: Dict;
  gridRef: MutableRefObject<GridApi | null>;
  onClose: () => void;
}) {
  const run = (action: () => void) => {
    action();
    onClose();
  };
  const item =
    'w-full rounded-btn px-4 py-3 text-left text-sm text-navy hover:bg-header-bg';
  return (
    <div className="space-y-1">
      <button type="button" className={item} onClick={() => run(() => gridRef.current?.deleteRow?.())}>
        {tr.spreadsheet.deleteRow}
      </button>
      <button type="button" className={item} onClick={() => run(() => gridRef.current?.deleteColumn?.())}>
        {tr.spreadsheet.deleteColumn}
      </button>
      <button type="button" className={item} onClick={() => run(() => gridRef.current?.clearContents?.())}>
        {tr.spreadsheet.clearContents}
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

const FILLS = ['#fff59d', '#b2dfdb', '#bbdefb', '#f8bbd0', ''];

export function FormatPanel({
  tr,
  gridRef,
  onClose
}: {
  tr: Dict;
  gridRef: MutableRefObject<GridApi | null>;
  onClose: () => void;
}) {
  const apply = (style: Record<string, string>) => gridRef.current?.applyStyle?.(style);
  const row = 'flex items-center gap-1 flex-wrap';
  const btn = 'flex h-10 w-10 items-center justify-center rounded-btn text-navy hover:bg-header-bg';

  return (
    <div className="space-y-3">
      <div className={row}>
        <button type="button" aria-label={tr.spreadsheet.bold} className={btn} onClick={() => apply({ 'font-weight': 'bold' })}>
          <BoldIcon width={22} height={22} />
        </button>
        <button type="button" aria-label={tr.spreadsheet.italic} className={btn} onClick={() => apply({ 'font-style': 'italic' })}>
          <ItalicIcon width={22} height={22} />
        </button>
        <button type="button" aria-label={tr.spreadsheet.alignLeft} className={btn} onClick={() => apply({ 'text-align': 'left' })}>
          <AlignLeftIcon width={22} height={22} />
        </button>
        <button type="button" aria-label={tr.spreadsheet.alignCenter} className={btn} onClick={() => apply({ 'text-align': 'center' })}>
          <AlignCenterIcon width={22} height={22} />
        </button>
        <button type="button" aria-label={tr.spreadsheet.alignRight} className={btn} onClick={() => apply({ 'text-align': 'right' })}>
          <AlignRightIcon width={22} height={22} />
        </button>
      </div>

      <div className={row} role="group" aria-label={tr.spreadsheet.fillColor}>
        {FILLS.map((color) => (
          <button
            key={color || 'none'}
            type="button"
            aria-label={`${tr.spreadsheet.fillColor} ${color || tr.spreadsheet.formatGeneral}`}
            onClick={() => apply({ 'background-color': color })}
            className="h-9 w-9 rounded-btn border border-line"
            style={{ backgroundColor: color || 'transparent' }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full rounded-btn border border-line py-3 text-sm font-medium text-navy"
      >
        {tr.common.done}
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
