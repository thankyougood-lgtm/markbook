import { useEffect, useState } from 'react';
import HamburgerButton from '../components/HamburgerButton';
import Sheet from '../components/Sheet';
import ClassForm from '../components/ClassForm';
import {
  ChevronDownIcon,
  ExportIcon,
  FormatIcon,
  MoreIcon,
  PlusIcon,
  RedoIcon,
  SearchIcon,
  UndoIcon
} from '../components/icons';
import { t } from '../i18n';
import type { Semester, SheetTemplate } from '../db/schema';
import { setSelectedClassId, setSelectedSemester } from '../state/selection';
import SpreadsheetGrid, { type CellValue } from '../sheet/SpreadsheetGrid';
import { useWorkbook, type GridSelection } from '../sheet/useWorkbook';
import {
  CellBar,
  EditButtons,
  KeyboardPill,
  SelectionToolbar,
  cellLabel
} from '../sheet/SheetChrome';

const iconButton =
  'flex h-11 w-11 items-center justify-center rounded-btn text-navy disabled:opacity-40';

export default function AddRecord({
  onOpenMenu,
  onEditingChange
}: {
  onOpenMenu: () => void;
  onEditingChange?: (editing: boolean) => void;
}) {
  const tr = t();
  const wb = useWorkbook();
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const [cellValue, setCellValue] = useState<CellValue>(null);
  const [editing, setEditing] = useState(false);
  const [numberMode, setNumberMode] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Hide the bottom nav while editing, and lift the editing chrome above the
  // on-screen keyboard (Android shrinks the layout, iOS does not).
  useEffect(() => {
    onEditingChange?.(editing);
  }, [editing, onEditingChange]);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => setKeyboardOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    sync();
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, []);

  const handleSelection = (next: GridSelection) => {
    setSelection(next);
    setCellValue(wb.gridRef.current?.getValue?.(next.left, next.top) ?? null);
  };

  const handleEditing = (next: boolean) => {
    setEditing(next);
    const s = wb.gridRef.current?.getSelection?.();
    if (next && s) setCellValue(wb.gridRef.current?.getValue?.(s.left, s.top) ?? null);
  };

  const confirmEdit = () => {
    wb.gridRef.current?.confirmEdit?.();
    wb.gridRef.current?.moveSelection?.('down');
    setEditing(false);
  };

  const cancelEdit = () => {
    wb.gridRef.current?.cancelEdit?.();
    setEditing(false);
  };
  const [classSheetOpen, setClassSheetOpen] = useState(false);
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);

  const saveLabel =
    wb.saveState === 'saving'
      ? tr.spreadsheet.saving
      : wb.saveState === 'unsaved'
        ? tr.spreadsheet.unsaved
        : wb.saveState === 'error'
          ? tr.spreadsheet.saveFailed
          : tr.spreadsheet.saved;

  const chooseClass = async (id: number) => {
    setSelectedClassId(id);
    await wb.refreshClass(id);
    setClassSheetOpen(false);
  };

  const chooseSemester = (s: Semester) => {
    setSelectedSemester(s);
    wb.setSemester(s);
    setClassSheetOpen(false);
  };

  const createSheetWith = async (template: SheetTemplate) => {
    setNewSheetOpen(false);
    await wb.addSheet(template);
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: 'calc(100vh - var(--nav-height) - var(--nav-gap) * 2 - var(--safe-bottom))' }}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        <button
          type="button"
          aria-label={tr.spreadsheet.export}
          className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-surface text-navy shadow-soft"
        >
          <ExportIcon width={22} height={22} />
        </button>

        <button
          type="button"
          onClick={() => setClassSheetOpen(true)}
          aria-label={tr.spreadsheet.classSheetTitle}
          className="flex min-w-0 flex-1 flex-col items-center leading-tight"
        >
          <span className="flex max-w-full items-center gap-1 text-sm font-semibold text-navy">
            <span className="truncate">
              {wb.classRow
                ? `${wb.classRow.name} - ${wb.semester === 1 ? 'I' : 'II'}`
                : tr.spreadsheet.noClassTitle}
            </span>
            <ChevronDownIcon width={16} height={16} className="shrink-0" />
          </span>
          <span className="text-[11px] text-muted" role="status">
            {saveLabel}
          </span>
        </button>

        <HamburgerButton onOpen={onOpenMenu} />
      </div>

      <div
        className={`mt-1 flex items-center justify-around px-2 ${editing ? 'hidden' : ''}`}
        role="toolbar"
        aria-label={tr.spreadsheet.more}
      >
        <button type="button" aria-label={tr.spreadsheet.undo} className={iconButton} onClick={() => wb.gridRef.current?.undo?.()}>
          <UndoIcon width={22} height={22} />
        </button>
        <button type="button" aria-label={tr.spreadsheet.redo} className={iconButton} onClick={() => wb.gridRef.current?.redo?.()}>
          <RedoIcon width={22} height={22} />
        </button>
        <button type="button" aria-label={tr.spreadsheet.format} className={iconButton}>
          <FormatIcon width={22} height={22} />
        </button>
        <button type="button" aria-label={tr.spreadsheet.search} className={iconButton}>
          <SearchIcon width={22} height={22} />
        </button>
        <button type="button" aria-label={tr.spreadsheet.more} className={iconButton}>
          <MoreIcon width={22} height={22} />
        </button>
      </div>

      <div className="mt-1 min-h-0 flex-1 border-t border-line bg-surface">
        {!wb.classRow ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm text-muted">{tr.spreadsheet.createClassToStart}</p>
            <button
              type="button"
              onClick={() => setClassSheetOpen(true)}
              className="rounded-btn bg-accent px-5 py-3 text-sm font-semibold text-surface"
            >
              {tr.home.newClass}
            </button>
          </div>
        ) : wb.activeSheet ? (
          <SpreadsheetGrid
            sheetKey={wb.activeSheet.id}
            data={wb.data}
            rowCount={wb.dimensions.rowCount}
            colCount={wb.dimensions.colCount}
            gridRef={wb.gridRef}
            onDirty={wb.markDirty}
            onSelectionChange={handleSelection}
            onEditingChange={handleEditing}
            loadingLabel={tr.spreadsheet.loadingGrid}
            failedLabel={tr.spreadsheet.gridFailed}
          />
        ) : null}
      </div>

      {wb.classRow && wb.activeSheet && (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <CellBar
              tr={tr}
              value={cellValue}
              editing={editing}
              onStartEdit={() => {
                const s = wb.gridRef.current?.getSelection?.();
                if (s) wb.gridRef.current?.openEditorAt?.(s.left, s.top);
              }}
              onChange={(next) => {
                setCellValue(next);
                const s = selection ?? wb.gridRef.current?.getSelection?.();
                if (s) wb.gridRef.current?.setValue?.(s.left, s.top, next);
              }}
            />
          </div>
          {editing && <EditButtons tr={tr} onConfirm={confirmEdit} onCancel={cancelEdit} />}
        </div>
      )}

      {wb.classRow && wb.activeSheet && !editing && (
        <div className="px-2 pb-1">
          <SelectionToolbar tr={tr} gridRef={wb.gridRef} />
        </div>
      )}

      {wb.classRow && wb.activeSheet && editing && (
        <div className="px-2" style={{ marginBottom: keyboardOffset }}>
          <KeyboardPill
            tr={tr}
            gridRef={wb.gridRef}
            numberMode={numberMode}
            onToggleKeyboard={() => setNumberMode((n) => !n)}
          />
        </div>
      )}

      {selection && (
        <span className="sr-only" role="status">
          {cellLabel(selection)}
        </span>
      )}

      <div className="flex items-center gap-1 overflow-x-auto bg-header-bg px-2 py-1">
        {wb.sheets.map((s) => {
          const active = s.id === wb.activeSheet?.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => void wb.openSheet(s)}
              aria-current={active ? 'true' : undefined}
              className={`shrink-0 rounded-btn px-3 py-2 text-xs ${
                active ? 'bg-surface font-semibold text-navy shadow-soft' : 'text-muted'
              }`}
            >
              {s.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setNewSheetOpen(true)}
          aria-label={tr.spreadsheet.addSheet}
          className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-btn text-navy"
        >
          <PlusIcon width={20} height={20} />
        </button>
      </div>

      {newSheetOpen && (
        <Sheet title={tr.spreadsheet.newSheet} onClose={() => setNewSheetOpen(false)}>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => void createSheetWith('blank')}
              className="w-full rounded-btn border border-line py-3 text-sm font-medium text-navy"
            >
              {tr.spreadsheet.blankSheet}
            </button>
            <button
              type="button"
              onClick={() => void createSheetWith('roster')}
              className="w-full rounded-btn border border-line py-3 text-sm font-medium text-navy"
            >
              {tr.spreadsheet.rosterSheet}
            </button>
          </div>
        </Sheet>
      )}

      {classSheetOpen && (
        <Sheet title={tr.spreadsheet.classSheetTitle} onClose={() => setClassSheetOpen(false)}>
          {creatingClass ? (
            <ClassForm
              onCancel={() => setCreatingClass(false)}
              onCreated={(created) => {
                void chooseClass(created.id);
                setCreatingClass(false);
              }}
            />
          ) : (
            <div className="space-y-3">
              <label className="block text-sm text-navy" htmlFor="add-record-class">
                {tr.home.selectClass}
                <select
                  id="add-record-class"
                  value={wb.classRow?.id ?? ''}
                  onChange={(e) => void chooseClass(Number(e.target.value))}
                  className="mt-1 w-full rounded-btn border border-line bg-surface px-3 py-3 text-sm font-medium text-navy"
                >
                  {wb.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <span className="block text-xs font-medium text-muted">{tr.home.semester}</span>
              <div className="flex rounded-pill bg-header-bg p-1" role="group" aria-label={tr.home.semester}>
                {([1, 2] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={wb.semester === s}
                    onClick={() => chooseSemester(s)}
                    className={`flex-1 rounded-pill py-2 text-sm font-semibold ${
                      wb.semester === s ? 'bg-accent text-surface' : 'text-navy'
                    }`}
                  >
                    {s === 1 ? 'I' : 'II'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setCreatingClass(true)}
                className="w-full rounded-btn bg-accent py-3 text-sm font-semibold text-surface"
              >
                {tr.home.newClass}
              </button>
            </div>
          )}
        </Sheet>
      )}
    </div>
  );
}
