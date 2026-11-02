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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let instance: WorksheetInstance[] | null = null;
    let destroy: (() => void) | null = null;
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
              tableHeight: '100%'
            }
          ]
        });
        destroy = () => mod.default.destroy(host as Parameters<typeof mod.default.destroy>[0]);
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
            }
          };
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      });

    return () => {
      alive = false;
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
