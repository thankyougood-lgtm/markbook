import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassRow, Semester, SheetRow, SheetTemplate } from '../db/schema';
import { getClass, listClasses } from '../db/repositories/classes';
import {
  archiveSheet,
  createSheet,
  duplicateSheet,
  listSheets,
  loadSheetData,
  renameSheet,
  saveSheetData,
  setStudentList
} from '../db/repositories/sheets';
import { getSelectedClassId, getSelectedSemester } from '../state/selection';
import type { CellValue } from './SpreadsheetGrid';

export type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

/** The little bit of the grid the save path needs. */
export interface GridSelection {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface GridApi {
  getData: () => CellValue[][];
  undo?: () => void;
  redo?: () => void;
  getSelection?: () => GridSelection | null;
  getValue?: (x: number, y: number) => CellValue;
  setValue?: (x: number, y: number, value: CellValue) => void;
  openEditorAt?: (x: number, y: number) => void;
  getCellElement?: (x: number, y: number) => HTMLElement | null;
  confirmEdit?: () => void;
  cancelEdit?: () => void;
  moveSelection?: (direction: 'up' | 'down' | 'left' | 'right') => void;
  setKeyboardMode?: (mode: 'text' | 'number') => void;
  hideKeyboard?: () => void;
  insertRow?: (before: boolean) => void;
  insertColumn?: (before: boolean) => void;
  deleteRow?: () => void;
  deleteColumn?: () => void;
  clearContents?: () => void;
  copy?: (cut?: boolean) => void;
  pasteText?: (text: string) => void;
  pasteFromClipboard?: () => Promise<void>;
  applyStyle?: (style: Record<string, string>) => void;
  mergeSelection?: () => void;
  search?: (query: string) => boolean;
  resetSearch?: () => void;
  freezeFirstRow?: () => void;
  setColumnWidth?: (width: number) => void;
  setRowHeight?: (height: number) => void;
}

const SAVE_DELAY_MS = 300;

// Owns the class/semester context, the sheet list and the debounced auto-save.
// Pages stay presentational and never touch Dexie themselves.
export function useWorkbook() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classRow, setClassRow] = useState<ClassRow | null>(null);
  const [semester, setSemester] = useState<Semester>(() => getSelectedSemester());
  const [sheets, setSheets] = useState<SheetRow[]>([]);
  const [activeSheet, setActiveSheet] = useState<SheetRow | null>(null);
  const [data, setData] = useState<CellValue[][] | null>(null);
  const [dimensions, setDimensions] = useState({ rowCount: 100, colCount: 26 });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  const gridRef = useRef<GridApi | null>(null);
  const activeSheetRef = useRef<SheetRow | null>(null);
  activeSheetRef.current = activeSheet;
  const timerRef = useRef<number | null>(null);

  const flush = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const sheet = activeSheetRef.current;
    const grid = gridRef.current;
    if (!sheet || !grid) return;
    setSaveState('saving');
    try {
      const values = grid.getData();
      const rowCount = Math.max(values.length, 1);
      const colCount = Math.max(values.reduce((max, row) => Math.max(max, row.length), 0), 1);
      await saveSheetData(sheet.id, values, rowCount, colCount);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, []);

  const markDirty = useCallback(() => {
    setSaveState('unsaved');
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
  }, [flush]);

  const openSheet = useCallback(async (sheet: SheetRow) => {
    setLoading(true);
    setActiveSheet(sheet);
    const stored = await loadSheetData(sheet.id);
    setData((stored?.data as CellValue[][] | null) ?? null);
    setDimensions({
      rowCount: stored?.rowCount ?? 100,
      colCount: stored?.colCount ?? 26
    });
    setSaveState('saved');
    setLoading(false);
  }, []);

  // Load classes, then the sheets of the selected class + semester. A class that
  // has no sheet yet gets its first blank one, as the prompt requires.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const rows = await listClasses();
      if (!alive) return;
      setClasses(rows);
      const wanted = getSelectedClassId();
      const current = rows.find((c) => c.id === wanted) ?? rows[0] ?? null;
      setClassRow(current);
      if (!current) {
        setLoading(false);
        return;
      }
      const existing = await listSheets(current.id, semester);
      const list = existing.length ? existing : [await createSheet({ classId: current.id, semester })];
      if (!alive) return;
      setSheets(list);
      await openSheet(list[0]!);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semester]);

  // Auto-save must not lose the last keystrokes when the page goes away.
  useEffect(() => {
    const onHide = () => {
      if (timerRef.current !== null) void flush();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [flush]);

  const addSheet = useCallback(
    async (template: SheetTemplate) => {
      if (!classRow) return null;
      const created = await createSheet({ classId: classRow.id, semester, template });
      setSheets((list) => [...list, created]);
      await openSheet(created);
      return created;
    },
    [classRow, semester, openSheet]
  );

  const reloadSheets = useCallback(async () => {
    if (!classRow) return;
    setSheets(await listSheets(classRow.id, semester));
  }, [classRow, semester]);

  const renameActiveSheet = useCallback(
    async (name: string) => {
      if (!activeSheet) return;
      await renameSheet(activeSheet.id, name);
      await reloadSheets();
    },
    [activeSheet, reloadSheets]
  );

  const duplicateActiveSheet = useCallback(async () => {
    if (!activeSheet) return;
    const copy = await duplicateSheet(activeSheet.id);
    await reloadSheets();
    await openSheet(copy);
  }, [activeSheet, reloadSheets, openSheet]);

  const archiveActiveSheet = useCallback(async () => {
    if (!activeSheet) return;
    await archiveSheet(activeSheet.id);
    const remaining = (await listSheets(activeSheet.classId, activeSheet.semester)).filter(
      (s) => s.id !== activeSheet.id
    );
    setSheets(remaining);
    setActiveSheet(null);
    setData(null);
    if (remaining[0]) await openSheet(remaining[0]);
  }, [activeSheet, openSheet]);

  const markAsStudentList = useCallback(async () => {
    if (!activeSheet) return;
    await setStudentList(activeSheet.id);
    await reloadSheets();
  }, [activeSheet, reloadSheets]);

  const refreshClass = useCallback(async (classId: number | null) => {
    if (classId === null) {
      setClassRow(null);
      return;
    }
    setClassRow((await getClass(classId)) ?? null);
  }, []);

  return {
    classes,
    classRow,
    semester,
    setSemester,
    sheets,
    activeSheet,
    data,
    dimensions,
    loading,
    saveState,
    gridRef,
    markDirty,
    flush,
    openSheet,
    addSheet,
    renameActiveSheet,
    duplicateActiveSheet,
    archiveActiveSheet,
    markAsStudentList,
    refreshClass
  };
}
