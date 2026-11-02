import type jspreadsheet from 'jspreadsheet-ce';

type JspreadsheetModule = { default: typeof jspreadsheet };

let pending: Promise<JspreadsheetModule> | null = null;

// The grid is only ever needed on Add Record, so it is kept out of the main
// bundle and fetched (with its stylesheet) the first time that route opens.
export function loadGrid(): Promise<JspreadsheetModule> {
  pending ??= Promise.all([import('jspreadsheet-ce'), import('jspreadsheet-ce/dist/jspreadsheet.css')]).then(
    ([mod]) => mod as JspreadsheetModule
  );
  return pending;
}
