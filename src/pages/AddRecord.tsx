import { useEffect, useRef, useState } from 'react';
import HamburgerButton from '../components/HamburgerButton';
import Sheet from '../components/Sheet';
import ClassForm from '../components/ClassForm';
import {
  ChevronDownIcon,
  PeopleIcon,
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
import { formatClassDisplayName } from '../db/repositories/classes';
import { setSelectedClassId, setSelectedSemester } from '../state/selection';
import SpreadsheetGrid, { type CellValue } from '../sheet/SpreadsheetGrid';
import { useWorkbook, type GridSelection } from '../sheet/useWorkbook';
import {
  CellBar,
  EditButtons,
  KeyboardPill,
  SelectionToolbar,
  InsertMenu,
  DeleteMenu,
  FormatPanel,
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
  const confirmEditRef = useRef(confirmEdit);
  confirmEditRef.current = confirmEdit;
  const cancelEditRef = useRef(cancelEdit);
  cancelEditRef.current = cancelEdit;

  // Enter and Escape are handled here, in the capture phase, so they go through
  // the same closeEditor path as the on-screen X and check buttons.
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        confirmEditRef.current();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelEditRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [editing]);
  const [classSheetOpen, setClassSheetOpen] = useState(false);
  const [newSheetOpen, setNewSheetOpen] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);
  const [panel, setPanel] = useState<'insert' | 'delete' | 'format' | 'search' | 'more' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMissed, setSearchMissed] = useState(false);
  const [colWidthDraft, setColWidthDraft] = useState('88');
  const [rowHeightDraft, setRowHeightDraft] = useState('34');
  const [sheetMenuOpen, setSheetMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [sheetNameDraft, setSheetNameDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

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
                ? `${formatClassDisplayName(wb.classRow)} - ${wb.semester === 1 ? 'I' : 'II'}`
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
        <button type="button" aria-label={tr.spreadsheet.search} className={iconButton} onClick={() => setPanel('search')}>
          <SearchIcon width={22} height={22} />
        </button>
        <button type="button" aria-label={tr.spreadsheet.moreOptions} className={iconButton} onClick={() => setPanel('more')}>
          <MoreIcon width={22} height={22} />
        </button>
      </div>

      {wb.rosterHeaderMissing && (
        <div className="mx-3 mt-2 flex flex-col gap-2 rounded-card border border-line bg-surface p-3 text-xs text-navy shadow-soft sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1">{tr.spreadsheet.headerMissingBanner}</p>
          <button
            type="button"
            onClick={() => void wb.writeRosterHeaders()}
            className="shrink-0 rounded-btn bg-accent px-3 py-2 font-semibold text-surface"
          >
            {tr.spreadsheet.addHeaders}
          </button>
        </div>
      )}

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
          <SelectionToolbar
            tr={tr}
            gridRef={wb.gridRef}
            onFormat={() => setPanel('format')}
            onInsert={() => setPanel('insert')}
            onDelete={() => setPanel('delete')}
          />
        </div>
      )}

      {wb.classRow && wb.activeSheet && editing && (
        <div className="px-2" style={{ marginBottom: keyboardOffset }}>
          <KeyboardPill tr={tr} gridRef={wb.gridRef} />
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
              onClick={() => {
                if (active) {
                  setSheetMenuOpen(true);
                } else {
                  void wb.openSheet(s);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setSheetMenuOpen(true);
              }}
              aria-current={active ? 'true' : undefined}
              aria-label={s.isStudentList ? `${s.name} - ${tr.spreadsheet.studentListBadge}` : s.name}
              className={`flex shrink-0 items-center gap-1 rounded-btn px-3 py-2 text-xs ${
                active ? 'bg-surface font-semibold text-navy shadow-soft' : 'text-muted'
              }`}
            >
              {s.isStudentList && <PeopleIcon width={14} height={14} />}
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

      {sheetMenuOpen && (
        <Sheet title={tr.spreadsheet.sheetMenu} onClose={() => setSheetMenuOpen(false)}>
          {renaming ? (
            <div className="space-y-3">
              <label className="block text-sm text-navy">
                {tr.spreadsheet.sheetName}
                <input
                  className="mt-1 w-full rounded-btn border border-line bg-surface px-3 py-2 text-sm text-navy"
                  value={sheetNameDraft}
                  onChange={(e) => setSheetNameDraft(e.target.value)}
                  autoFocus
                />
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRenaming(false)}
                  className="flex-1 rounded-btn border border-line py-3 text-sm font-medium text-navy"
                >
                  {tr.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = sheetNameDraft.trim();
                    if (name) void wb.renameActiveSheet(name);
                    setRenaming(false);
                    setSheetMenuOpen(false);
                  }}
                  className="flex-1 rounded-btn bg-accent py-3 text-sm font-semibold text-surface"
                >
                  {tr.common.save}
                </button>
              </div>
            </div>
          ) : confirmDelete ? (
            <div className="space-y-3">
              <p className="text-sm text-navy">{tr.spreadsheet.deleteSheetConfirm}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-btn border border-line py-3 text-sm font-medium text-navy"
                >
                  {tr.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void wb.archiveActiveSheet();
                    setConfirmDelete(false);
                    setSheetMenuOpen(false);
                  }}
                  className="flex-1 rounded-btn bg-danger py-3 text-sm font-semibold text-surface"
                >
                  {tr.spreadsheet.deleteSheet}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                type="button"
                className="w-full rounded-btn px-4 py-3 text-left text-sm text-navy hover:bg-header-bg"
                onClick={() => {
                  setSheetNameDraft(wb.activeSheet?.name ?? '');
                  setRenaming(true);
                }}
              >
                {tr.spreadsheet.renameSheet}
              </button>
              <button
                type="button"
                className="w-full rounded-btn px-4 py-3 text-left text-sm text-navy hover:bg-header-bg"
                onClick={() => {
                  void wb.duplicateActiveSheet();
                  setSheetMenuOpen(false);
                }}
              >
                {tr.spreadsheet.duplicateSheet}
              </button>
              {!wb.activeSheet?.isStudentList && (
                <button
                  type="button"
                  className="w-full rounded-btn px-4 py-3 text-left text-sm text-navy hover:bg-header-bg"
                  onClick={() => {
                    void wb.markAsStudentList();
                    setSheetMenuOpen(false);
                  }}
                >
                  {tr.spreadsheet.useAsStudentList}
                </button>
              )}
              <button
                type="button"
                className="w-full rounded-btn px-4 py-3 text-left text-sm text-danger hover:bg-header-bg"
                onClick={() => setConfirmDelete(true)}
              >
                {tr.spreadsheet.deleteSheet}
              </button>
            </div>
          )}
        </Sheet>
      )}

      {panel === 'search' && (
        <Sheet title={tr.spreadsheet.searchInSheet} onClose={() => setPanel(null)}>
          <div className="space-y-3">
            <input
              className="w-full rounded-btn border border-line bg-surface px-3 py-2 text-sm text-navy"
              placeholder={tr.spreadsheet.searchPlaceholder}
              aria-label={tr.spreadsheet.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchMissed && <p className="text-sm text-danger">{tr.spreadsheet.searchNoMatches}</p>}
            <button
              type="button"
              className="w-full rounded-btn bg-accent py-3 text-sm font-semibold text-surface"
              onClick={() => {
                const query = searchQuery.trim();
                if (!query) return;
                const found = wb.gridRef.current?.search?.(query) ?? false;
                setSearchMissed(!found);
              }}
            >
              {tr.spreadsheet.searchNext}
            </button>
          </div>
        </Sheet>
      )}

      {panel === 'more' && (
        <Sheet title={tr.spreadsheet.moreOptions} onClose={() => setPanel(null)}>
          <div className="space-y-3">
            <button
              type="button"
              className="w-full rounded-btn border border-line py-3 text-sm font-medium text-navy"
              onClick={() => wb.gridRef.current?.freezeFirstRow?.()}
            >
              {tr.spreadsheet.freezeHeaderRow}
            </button>
            <label className="block text-sm text-navy">
              {tr.spreadsheet.columnWidth}
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  min={30}
                  className="min-w-0 flex-1 rounded-btn border border-line bg-surface px-3 py-2 text-sm text-navy"
                  value={colWidthDraft}
                  onChange={(e) => setColWidthDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-btn bg-accent px-4 text-sm font-semibold text-surface"
                  onClick={() => wb.gridRef.current?.setColumnWidth?.(Number(colWidthDraft) || 88)}
                >
                  {tr.spreadsheet.apply}
                </button>
              </div>
            </label>
            <label className="block text-sm text-navy">
              {tr.spreadsheet.rowHeight}
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  min={16}
                  className="min-w-0 flex-1 rounded-btn border border-line bg-surface px-3 py-2 text-sm text-navy"
                  value={rowHeightDraft}
                  onChange={(e) => setRowHeightDraft(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-btn bg-accent px-4 text-sm font-semibold text-surface"
                  onClick={() => wb.gridRef.current?.setRowHeight?.(Number(rowHeightDraft) || 34)}
                >
                  {tr.spreadsheet.apply}
                </button>
              </div>
            </label>
          </div>
        </Sheet>
      )}

      {panel === 'insert' && (
        <Sheet title={tr.spreadsheet.insert} onClose={() => setPanel(null)}>
          <InsertMenu tr={tr} gridRef={wb.gridRef} onClose={() => setPanel(null)} />
        </Sheet>
      )}

      {panel === 'delete' && (
        <Sheet title={tr.spreadsheet.deleteCells} onClose={() => setPanel(null)}>
          <DeleteMenu tr={tr} gridRef={wb.gridRef} onClose={() => setPanel(null)} />
        </Sheet>
      )}

      {panel === 'format' && (
        <Sheet title={tr.spreadsheet.formatCells} onClose={() => setPanel(null)}>
          <FormatPanel tr={tr} gridRef={wb.gridRef} onClose={() => setPanel(null)} />
        </Sheet>
      )}

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
                      {formatClassDisplayName(c)}
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
