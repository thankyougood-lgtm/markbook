import { db, type Semester, type SheetDataRow, type SheetRow, type SheetTemplate } from '../schema';

// Row 1 of the Class roster template. Subject columns, Total and Remark are left
// for the teacher to type, so the template only fixes the four leading headers.
export const ROSTER_HEADERS = ['NO', 'Students name', 'Sex', 'Age'];

export const DEFAULT_ROW_COUNT = 100;
export const DEFAULT_COL_COUNT = 26;


export interface NewSheetInput {
  classId: number;
  semester: Semester;
  name?: string;
  template?: SheetTemplate;
}

export async function listSheets(classId: number, semester: Semester): Promise<SheetRow[]> {
  const rows = await db.sheets.where('classId').equals(classId).toArray();
  return rows
    .filter((s) => s.semester === semester && s.archivedAt === null)
    .sort((a, b) => a.order - b.order);
}

export async function getSheet(id: number): Promise<SheetRow | undefined> {
  return db.sheets.get(id);
}

// Row 1 of the roster template; every other cell starts blank, exactly as the
// grid library wants it (a 2D array of values).
function initialPayload(template: SheetTemplate): string[][] | null {
  return template === 'roster' ? [[...ROSTER_HEADERS]] : null;
}

export async function createSheet(input: NewSheetInput): Promise<SheetRow> {
  const existing = await listSheets(input.classId, input.semester);
  const order = existing.length ? Math.max(...existing.map((s) => s.order)) + 1 : 0;
  const template = input.template ?? 'blank';
  const name = input.name ?? `Sheet${existing.length + 1}`;
  const id = await db.sheets.add({
    classId: input.classId,
    semester: input.semester,
    name,
    order,
    template,
    createdAt: Date.now(),
    archivedAt: null
  } as SheetRow);
  await db.sheetData.put({
    sheetId: id,
    data: initialPayload(template),
    rowCount: DEFAULT_ROW_COUNT,
    colCount: DEFAULT_COL_COUNT,
    updatedAt: Date.now()
  } as SheetDataRow);
  return (await db.sheets.get(id)) as SheetRow;
}

export async function renameSheet(id: number, name: string): Promise<void> {
  await db.sheets.update(id, { name });
}

export async function duplicateSheet(id: number): Promise<SheetRow> {
  const source = await db.sheets.get(id);
  if (!source) throw new Error(`Sheet ${id} not found`);
  const siblings = await listSheets(source.classId, source.semester);
  const order = siblings.length ? Math.max(...siblings.map((s) => s.order)) + 1 : 0;
  const newId = await db.sheets.add({
    ...source,
    id: undefined,
    name: `${source.name} copy`,
    order,
    createdAt: Date.now()
  } as unknown as SheetRow);
  const data = await db.sheetData.get(id);
  if (data) {
    await db.sheetData.put({ ...data, sheetId: newId, updatedAt: Date.now() });
  }
  return (await db.sheets.get(newId)) as SheetRow;
}

// Sheets are archived, never erased, so a mistaken delete stays recoverable.
export async function archiveSheet(id: number): Promise<void> {
  await db.sheets.update(id, { archivedAt: Date.now() });
}

export async function loadSheetData(sheetId: number): Promise<SheetDataRow | undefined> {
  return db.sheetData.get(sheetId);
}

export async function saveSheetData(
  sheetId: number,
  data: unknown,
  rowCount: number,
  colCount: number
): Promise<void> {
  await db.sheetData.put({ sheetId, data, rowCount, colCount, updatedAt: Date.now() });
}
