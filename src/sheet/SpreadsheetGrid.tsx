import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type jspreadsheet from 'jspreadsheet-ce';
import { loadGrid } from './loadGrid';
import type { GridApi, GridSelection } from './useWorkbook';

type WorksheetInstance = ReturnType<typeof jspreadsheet>[number];

type CellValue = string | number | boolean | null;

export interface SpreadsheetGridProps {
  /** Bumped whenever a different sheet should be shown in the same container. */
  sheetKey: number;
  data: CellValue[][] | null;
  rowCount: number;
  colCount: number;
  gridRef?: MutableRefObject<GridApi | null>;
  /** Fires with the current range and active cell whenever the selection moves. */
  onSelectionChange?: (selection: GridSelection) => void;
  /** Fires when a cell editor opens (true) or closes (false). */
  onEditingChange?: (editing: boolean) => void;
  /** Column indexes the user cannot edit. */
  readOnlyColumns?: number[];
  /** Every cell is read-only (used by the Attendance sheet). */
  readOnlyCells?: boolean;
  /** Column indexes pinned to the left. */
  freezeColumns?: number;
  /** Pin the first data row as a header row. */
  freezeFirstRow?: boolean;
  /** Fires on every tap inside the sheet with the cell coordinates. */
  onCellTap?: (x: number, y: number) => void;
  onDirty: () => void;
  loadingLabel: string;
  failedLabel: string;
}

// Thin React wrapper around the lazily loaded grid library. It owns nothing but
// the library instance: values live in Dexie through the sheets repository.
export default function SpreadsheetGrid({
  sheetKey,
  data,
  rowCount,
  colCount,
  gridRef,
  onSelectionChange,
  onEditingChange,
  readOnlyColumns,
  readOnlyCells,
  freezeColumns,
  freezeFirstRow,
  onCellTap,
  onDirty,
  loadingLabel,
  failedLabel
}: SpreadsheetGridProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const dirtyRef = useRef(onDirty);
  dirtyRef.current = onDirty;
  const selectionRef = useRef(onSelectionChange);
  selectionRef.current = onSelectionChange;
  const editingRef = useRef(onEditingChange);
  editingRef.current = onEditingChange;
  const cellTapRef = useRef(onCellTap);
  cellTapRef.current = onCellTap;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let instance: WorksheetInstance[] | null = null;
    let destroy: (() => void) | null = null;
    let removeClickListener: (() => void) | null = null;
    const host = hostRef.current;
    if (!host) return;

    void loadGrid()
      .then((mod) => {
        if (!alive) return;
        host.innerHTML = '';
        instance = mod.default(host, {
          tabs: false,
          toolbar: false,
          onchange: () => dirtyRef.current(),
          onselection: (_spreadsheet, left, top, right, bottom) =>
            selectionRef.current?.({ left, top, right, bottom }),
          oneditionstart: () => editingRef.current?.(true),
          oneditionend: () => editingRef.current?.(false),
          worksheets: [
            {
              data: (data as jspreadsheet.CellValue[][] | null) ?? undefined,
              minDimensions: [colCount, rowCount],
              defaultRowHeight: 34,
              tableOverflow: true,
              tableHeight: '100%',
              freezeColumns: freezeColumns ?? 0,
              // Column options are positional, so the array must cover every column.
              // There is no worksheet-level read-only switch, so a fully locked
              // sheet locks each of its columns.
              columns: Array.from({ length: colCount }, (_, index) => ({
                readOnly: readOnlyCells === true || (readOnlyColumns ?? []).includes(index)
              }))
            }
          ]
        });
        destroy = () => mod.default.destroy(host as Parameters<typeof mod.default.destroy>[0]);
        if (freezeFirstRow) {
          const table = host.querySelector('table.jss_worksheet');
          table?.querySelector('tbody > tr')?.classList.add('frozen-row');
        }
        // The library has no per-cell tap event, so translate the click target.
        const onClick = (event: Event) => {
          const target = (event.target as HTMLElement | null)?.closest('td');
          if (!target) return;
          const row = target.parentElement;
          const body = row?.parentElement;
          if (!row || !body || !body.parentElement?.classList.contains('jss_worksheet')) return;
          const y = Array.from(body.children).indexOf(row) - 1;
          const x = Array.from(row.children).indexOf(target) - 1;
          if (x >= 0 && y >= 0) cellTapRef.current?.(x, y);
        };
        host.addEventListener('click', onClick);
        const removeClick = () => host.removeEventListener('click', onClick);
        removeClickListener = removeClick;
        if (gridRef) {
          const ws = () => instance?.[0] ?? null;
          gridRef.current = {
            getData: () => ws()?.getData() ?? [],
            undo: () => ws()?.undo(),
            redo: () => ws()?.redo(),
            getSelection: () => {
              const s = ws()?.getSelection();
              return s ? { left: s[0], top: s[1], right: s[2], bottom: s[3] } : null;
            },
            getValue: (x, y) => ws()?.getValueFromCoords(x, y) ?? null,
            setValue: (x, y, value) => ws()?.setValueFromCoords(x, y, value as jspreadsheet.CellValue, true),
            getCellElement: (x, y) => ws()?.getCellFromCoords(x, y) ?? null,
            openEditorAt: (x, y) => {
              const w = ws();
              const cell = w?.getCellFromCoords(x, y);
              if (w && cell) w.openEditor(cell);
            },
            confirmEdit: () => {
              const w = ws();
              if (!w) return;
              const s = w.getSelection();
              w.closeEditor(w.getCellFromCoords(s[0], s[1]), true);
            },
            cancelEdit: () => {
              const w = ws();
              if (!w) return;
              const s = w.getSelection();
              w.closeEditor(w.getCellFromCoords(s[0], s[1]), false);
            },
            moveSelection: (dir) => {
              const w = ws();
              if (!w) return;
              if (dir === 'up') w.up();
              else if (dir === 'down') w.down();
              else if (dir === 'left') w.left();
              else w.right();
            },
            insertRow: (before) => {
              const w = ws();
              if (w) w.insertRow(1, w.getSelection()[1], before ? 1 : 0);
            },
            insertColumn: (before) => {
              const w = ws();
              if (w) w.insertColumn(1, w.getSelection()[0], before);
            },
            deleteRow: () => {
              const w = ws();
              if (w) w.deleteRow(w.getSelection()[1], 1);
            },
            deleteColumn: () => {
              const w = ws();
              if (w) w.deleteColumn(w.getSelection()[0], 1);
            },
            clearContents: () => {
              const w = ws();
              if (!w) return;
              const [x1, y1, x2, y2] = w.getSelection();
              for (let y = y1; y <= y2; y += 1) {
                for (let x = x1; x <= x2; x += 1) w.setValueFromCoords(x, y, '', true);
              }
            },
            copy: (cut) => ws()?.copy(cut),
            pasteText: (text) => {
              const w = ws();
              if (!w) return;
              const [x, y] = w.getSelection();
              w.paste(x, y, text);
            },
            pasteFromClipboard: async () => {
              const text = await navigator.clipboard.readText();
              const w = ws();
              if (!w || !text) return;
              const [x, y] = w.getSelection();
              w.paste(x, y, text);
            },
            mergeSelection: () => ws()?.setMerge(),
            markInvalidCells: (cells) => {
              const w = ws();
              if (!w) return;
              for (const { x, y, message } of cells) {
                const name = `${String.fromCharCode(65 + x)}${y + 1}`;
                w.setStyle(name, 'border', '2px solid var(--danger)', true);
                const td = w.getCellFromCoords(x, y);
                if (td) {
                  td.setAttribute('title', message);
                  td.setAttribute('data-invalid', 'true');
                }
              }
            },
            search: (query) => {
              const w = ws();
              if (!w || !query) return false;
              w.search(query);
              const rows = w.getSelectedRows();
              return rows.length > 0;
            },
            resetSearch: () => ws()?.resetSearch(),
            freezeFirstRow: () => {
              const table = host.querySelector('table.jss_worksheet');
              const firstBodyRow = table?.querySelector('tbody > tr');
              const header = table?.querySelector('thead');
              if (!firstBodyRow || !header) return;
              header.setAttribute('data-frozen', 'true');
              firstBodyRow.classList.toggle('frozen-row');
            },
            setColumnWidth: (width) => {
              const w = ws();
              if (!w) return;
              const [x1, , x2] = w.getSelection();
              for (let x = x1; x <= x2; x += 1) w.setWidth(x, width);
            },
            setRowHeight: (height) => {
              const w = ws();
              if (!w) return;
              const [, y1, , y2] = w.getSelection();
              for (let y = y1; y <= y2; y += 1) w.setHeight(y, height);
            },
            applyStyle: (style) => {
              const w = ws();
              if (!w) return;
              const [x1, y1, x2, y2] = w.getSelection();
              for (let y = y1; y <= y2; y += 1) {
                for (let x = x1; x <= x2; x += 1) {
                  const name = `${String.fromCharCode(65 + x)}${y + 1}`;
                  for (const [prop, value] of Object.entries(style)) {
                    w.setStyle(name, prop, value, true);
                  }
                }
              }
              dirtyRef.current();
            }
          };
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });

    return () => {
      alive = false;
      removeClickListener?.();
      try {
        destroy?.();
      } catch {
        // the library may already have torn the table down
      }
      host.innerHTML = '';
    };
  }, [sheetKey, data, rowCount, colCount]);

  if (failed) {
    return <p className="p-6 text-sm text-danger">{failedLabel}</p>;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div ref={hostRef} className="sheet-grid h-full w-full" />
      <span className="sr-only" role="status">
        {loadingLabel}
      </span>
    </div>
  );
}

export type { CellValue };
