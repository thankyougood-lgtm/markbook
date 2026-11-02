import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type jspreadsheet from 'jspreadsheet-ce';
import { loadGrid } from './loadGrid';
import type { GridApi } from './useWorkbook';

type WorksheetInstance = ReturnType<typeof jspreadsheet>[number];

type CellValue = string | number | boolean | null;

export interface SpreadsheetGridProps {
  /** Bumped whenever a different sheet should be shown in the same container. */
  sheetKey: number;
  data: CellValue[][] | null;
  rowCount: number;
  colCount: number;
  gridRef?: MutableRefObject<GridApi | null>;
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
  onDirty,
  loadingLabel,
  failedLabel
}: SpreadsheetGridProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const dirtyRef = useRef(onDirty);
  dirtyRef.current = onDirty;
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
          worksheets: [
            {
              data: (data as jspreadsheet.CellValue[][] | null) ?? undefined,
              minDimensions: [colCount, rowCount],
              tableOverflow: true,
              tableHeight: '100%'
            }
          ]
        });
        destroy = () => mod.default.destroy(host as Parameters<typeof mod.default.destroy>[0]);
        if (gridRef) {
          gridRef.current = {
            getData: () => instance?.[0]?.getData() ?? [],
            undo: () => instance?.[0]?.undo(),
            redo: () => instance?.[0]?.redo()
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
