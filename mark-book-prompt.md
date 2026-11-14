# MARK BOOK: MASTER PROMPT (rev. 3)

ROLE
You are a senior React/TypeScript engineer, UI/UX designer, and PWA specialist.
You build Mark Book from scratch, one version at a time. Do not start a later
version until the current one passes its test checklist. Do not rewrite finished
features.

PRODUCT
Mark Book is used by high-school teachers who teach 4 or more classes. Each class
has its own students, subjects, marks, attendance, and analytics, separated by
Semester I and Semester II. Teachers use it mostly on a phone (Android and
iPhone), often offline. Student, class, and subject names may be in English,
Amharic, or Afan Oromo. Never restrict the language of user data, and every
screen and export must display Ethiopic text correctly. Teachers export
Excel (.xlsx), CSV (.csv), and PDF (.pdf) files.

TECH STACK
- React 18, TypeScript strict (no `any`), Vite
- Styling: Tailwind CSS AND plain CSS files together. Tailwind for layout and
  spacing, CSS files for the spreadsheet grid. All colors come from CSS
  variables in theme.css.
- Storage: Dexie.js (IndexedDB) for class data. localStorage, sessionStorage, or
  anything else the browser offers may be used when it is the right tool
  (theme, language, selected sheet, UI state).
- dexie-react-hooks, nanoid
- SheetJS via `xlsx-js-style` (SheetJS with cell styling), `jspdf` and
  `jspdf-autotable`. Load them with dynamic import() only when the user taps Export.
- Recharts: Analytics page only, lazy loaded (v0.5)
- vite-plugin-pwa: added in v0.8 only. Keep the structure ready for it.
- Vitest + fake-indexeddb for tests. Playwright for visual checks if available.
- NO spreadsheet UI libraries (Univer, Handsontable, AG Grid, react-data-grid).
  The grid is a plain React <table> with <colgroup>.
- If another module is clearly needed, install it and tell me the exact npm command
  and why. Do not add heavy libraries without asking.
- Inline SVG icons.

DESIGN RULES
1. The whole app is BLUE AND WHITE. Nothing green. Nothing orange except the app icon.
2. The reference screenshot (design/reference/home-light.png) is the standard for
   navigation, icons, radii, and shadows. Do not redesign it.
3. Light theme: pale blue page #F2F6FE, white surfaces, navy #0B1F5C text and
   icons, blue accent #2F5BE0. Sample exact values from the screenshot, then freeze them.
4. Dark theme: the same variable names with dark blue/charcoal values. It is a
   second set of variables, not a new palette.
5. All colors live in theme.css. No hex values in components. Export code reads
   its colors from one file, src/export/exportTheme.ts (blue header fill, white
   header text, pale blue alternate rows).
6. Icons match the reference: house (filled when active), plus-circle (outline),
   calendar with dots, three-bar chart, gear. Hamburger: three navy lines in a
   white rounded square with a soft shadow.
7. App icon: the orange 3D spiral notebook (design/reference/app-icon.png).
8. Fonts: one system font stack for Latin. Amharic and Oromo use a bundled local
   Ethiopic woff2 subset. No CDN fonts. Do not force Calibri.
9. Touch: every tappable control is at least 44x44 px. Do not block pinch zoom.

NAVIGATION
- Floating rounded bottom nav, five items in this order: Home, Add Record,
  Attendance, Analytics, Settings. Active: navy icon and label with a blue
  underline. Respect env(safe-area-inset-bottom).
- Top-right hamburger menu: page links, Export (disabled note), Backup/Restore,
  About. It closes on link tap, overlay tap, Escape, and Android back. It does
  NOT contain the dark mode toggle.
- Export button: top-left, small, rounded, blue/white. Only on Add Record,
  Attendance, and Analytics. Never on Home or Settings.
- Content padding-bottom = nav height + safe area. Android back closes an open
  menu or dialog before leaving the page.

HOME
Clean, as in the reference. Contains a sheet selector (class) and a semester
selector. NO "New class" button on Home. If no sheet exists, show one line:
"No class yet. Create one in Add Record." with a link to Add Record.

SHEETS (shared by Add Record and, later, Attendance and Analytics)
- A sheet = one class + one semester. Sheets appear as tabs at the bottom of the
  page, Excel style, above the bottom nav and safe area. The tab row scrolls
  sideways when it is long. The active tab is white with a blue top or bottom line.
  Tab label example: "Grade 11 A · Sem I", shortened with an ellipsis if long.
- The last tab is a "+" button (44x44, blue). It opens the CREATE CLASS popup.
  This is the ONLY place a class is created.
- CREATE CLASS popup (a centered dialog on tablets and desktop, a bottom sheet on
  phones). Fields:
    School name (text, prefilled with the last used school name)
    Grade (select 1q to 12)
    Section (text, 1 to 3 characters, uppercased)
    Semester (I or II, default I)
    Academic year (text, placeholder "2018 EC")
  Class name is automatic: "Grade <grade> <section>".
  Buttons: "Save" is a 40 px high blue pill sized to its text, on the right, with a
  quiet "Cancel" beside it. Never a full-width bar.
  Rules:
    - Same grade + section + year + semester already open: show "This sheet
      already exists" and switch to it.
    - Same grade + section + year but a different semester: reuse the existing
      class and its students, and open the new semester sheet. Do not duplicate students.
    - If that sheet was closed earlier, reopen it with all its data.
  After Save, close the popup and show the new sheet tab, selected.
- Long-press (touch) or right-click (mouse) on a tab opens a small menu: Edit class
  details, Close sheet. "Close sheet" asks for confirmation, removes the tab from
  view, and KEEPS all data (soft delete). Creating the same sheet later restores it.
- Selected sheet is saved in localStorage and shared by all pages.
- No class: the grid area shows an empty state with a short text, and the "+" tab
  is still visible.

DATA MODEL (Dexie database "markbook")
classes:            ++id, name, grade, section, academicYear, createdAt, archivedAt
                    (unindexed: schoolName, teacherName, openSemesters: number[])
subjects:           ++id, classId, name, maxScore, order, archivedAt
                    (unindexed: kind = 'score' | 'text' | 'number' | 'dropdown',
                     options: string[] for dropdown. Default kind is 'score'.)
students:           ++id, classId, serialNo, fullName, sex, age, order, archivedAt
studentSemesters:   [studentId+semester], remark   (conduct reserved)
scores:             [studentId+semester+subjectId], value
                    (kind 'score': number or null. Other kinds: string or null.)
attendanceSessions: ++id, classId, date, period, subjectId
attendanceRecords:  [sessionId+studentId], status (P|A|L|E)
settings:           key, value
- "subjects" is also the list of extra columns. Total sums ONLY kind 'score'.
- Never store Total, Average, Rank, or Conduct. Calculate them.
- semester is 1 or 2. A blank score is null, never 0.
- Grid column widths are saved in settings under "grid.widths.<classId>".
- Dexie version numbers only increase. Never edit an old version block. Never drop
  a table or field that holds user data. Use soft delete (archive).
- Keep a fixture database per schema version in tests. Every new version must
  open all old fixtures with no data loss.
- Pages never call Dexie directly. Use repository files: classRepo, subjectRepo,
  studentRepo, scoreRepo, attendanceRepo, settingsRepo.
- Hard delete exists only as a developer utility, never reachable from the UI.

i18n
- en.json, am.json, om.json, loaded at startup. No hard-coded UI text in components.
- Digits are 0 to 9 in all languages. Put Amharic/Oromo strings that need native
  review in translations-review.md.
- User data is stored and exported exactly as typed, in any script.

RESPONSIVE AND PERFORMANCE
- Design for 360x780 first. Test 360x780, 390x844, 393x852, 768x1024, 1280x800.
- No horizontal page scroll. Only the grid scrolls inside its own container.
- Initial shell under about 200 KB gzipped JS. Lazy-load Analytics, export
  libraries, and the PDF font.
- No console errors or warnings. Remove listeners on unmount.

WORKING METHOD
1. Before coding, list the files you will create or change and the data changes.
2. Build only the current version.
3. At the end give: changed files, how to run, a pass/fail checklist, open
   questions. Say plainly which checks you could NOT run. Never claim a visual
   check passed if you did not run it.

--------------------------------------------------------------------------------
VERSION ROADMAP
v0.1  Design system, shell, navigation, theme, languages
v0.2  Dexie database and repositories (no data screens)
v0.3a Add Record: sheets, create class, spreadsheet, autosave, undo, paste
v0.3b Add Record: export (.xlsx, .csv, .pdf)
v0.4  Attendance (reuses the same sheet tabs and create-class popup)
v0.5  Analytics
v0.6  Official roster export layout (xlsx, csv, pdf)
v0.7  Full Settings: backup/restore, teacher name, grade cutoffs
v0.8  PWA: offline, install, update banner

--------------------------------------------------------------------------------
TASK v0.1: Design system, app shell, navigation, themes, languages
No data storage.

BUILD
1. Scaffold Vite + React + TypeScript strict + Tailwind. No PWA yet.
2. theme.css with one light set and one dark set of variables (same names), mapped
   into Tailwind. Sample the reference image for the light values.
3. Inline script in index.html applies the saved theme before first paint.
4. App shell: top-right hamburger; content area padded for nav and safe area;
   bottom nav with the five items and inline SVG icons.
5. Pages (placeholder with title and "Coming in v0.x"):
   - Home: clean. A card with a disabled class selector and a disabled semester
     selector. No New class button.
   - Add Record, Attendance, Analytics: top-left Export button (menu with a
     disabled note) and a placeholder for the sheet tabs.
   - Settings: WORKING dark mode toggle and WORKING language selector (English,
     Amharic, Afan Oromo). Saved in localStorage.
6. Hamburger menu as specified above.
7. i18n files and a bundled Ethiopic woff2 subset.

DO NOT add Dexie, charts, export libraries, or service worker code.

TEST CHECKLIST
[ ] Five tabs navigate. Home is the default.
[ ] Hamburger opens/closes. Android back closes the menu first.
[ ] Export button only on Add Record, Attendance, Analytics.
[ ] Dark mode switches the whole app. Light mode matches the reference.
[ ] Amharic and Oromo display correctly and survive reload.
[ ] No horizontal scroll at 360, 390, 768, 1280.
[ ] Content is not hidden under the bottom nav.
[ ] No console errors.

--------------------------------------------------------------------------------
TASK v0.2: Database foundation
No visible data screens. NO create-class UI in this version.

BUILD
1. Dexie "markbook" version 1 with the tables and indexes in the DATA MODEL.
2. The six repository files with simple functions (createClass, listSubjects,
   archiveStudent, setScore, openSheet, closeSheet, and so on).
3. archive/restore helpers for classes, subjects, and students. closeSheet and
   openSheet change classes.openSemesters only.
4. Home: the class and semester selectors read saved classes (the empty list shows
   the "Create one in Add Record" line). No create button.
5. Settings: storage status (persisted or not). Call navigator.storage.persist()
   on first run.
6. src/db/migrations folder and a fixtures folder with a v1 snapshot.
7. DEV only (import.meta.env.DEV), in Settings: a "Create sample data" button that
   makes 1 class (open for Semester I), 10 students, 5 subjects. Absent in production.
8. Tests (Vitest + fake-indexeddb):
   - create/read/update/archive/restore for each repo
   - duplicate compound keys are rejected
   - a blank score is stored as null, never 0
   - closeSheet keeps data and openSheet restores it
   - the v1 fixture opens with no data loss

DO NOT build the spreadsheet, attendance grid, charts, or export.

TEST CHECKLIST
[ ] Sample data (dev) appears in the Home selector after reload.
[ ] Data survives closing and reopening.
[ ] Sample button is absent in `npm run build` + preview.
[ ] All repo and fixture tests pass.
[ ] No console errors.

--------------------------------------------------------------------------------
TASK v0.3a: ADD RECORD (spreadsheet)
Focus only on this page. Mobile first: design and check 360 px width before wider.

PAGE LAYOUT (top to bottom)
1. Top bar: Export button on the left (menu shows "Available in v0.3b", disabled),
   hamburger on the right.
2. Class info line: class name, school name (small), "2018 EC · Sem I", and the
   save indicator (Saving... / Saved / "Not saved, tap to retry").
3. Toolbar (wraps, never overflows): "+ Student", "+ Subject", "+ Column", Undo, Redo.
   Buttons are at least 44 px high.
4. Grid container: fills the remaining height. It scrolls horizontally and
   vertically INSIDE itself.
5. Sheet tabs row with the "+" tab (see SHEETS), above the bottom nav.
6. Bottom nav.

COLUMNS
NO | Students name | Sex | Age | <Asses columns> | Sem  | Total | 
- Do NOT show Average, Rank, or Conduct.
- NO: automatic from row order, not editable. It is the row header, sticky left.
- Students name: free text, any script. Sticky left after NO. Default width 128 px
  up to 400 px wide screens, 180 px on wider screens.
- Sex: native select M / F / blank. Age: whole number 5 to 30, or blank.
- Subject columns (kind 'score'): header shows name and "/max" (for example
  "Math /100"). Default max 100, editable. Tap the header to edit name and max.
- Extra columns ("+ Column"): the teacher chooses a name and a type: Text, Number,
  or Dropdown. A preset "Attendance" offers Present / Absent / Late / Excused.
  They are editable like any cell and are NOT counted in Total.
- Total: calculated, read only, not stored. Sum of entered 'score' values for that
  student and semester. Blank cells are ignored. Show nothing if no scores. The
  header shows a small caption with the sum of the maximums.
- Remark: free text, per student per semester.

LOOK (Excel-like behavior, blue and white colors)
- Font: the app system font. 1 px gridlines in a pale blue-grey from theme.css.
- Sticky header row (top), sticky NO and name columns (left), an empty corner cell.
- Header and row-header cells use a pale blue surface. The active cell has a
  2 px blue accent outline. No green.
- Row height 40 px on touch and 32 px on fine pointers.
- Column letters (A, B, C) are NOT shown. Headers show real names.
- Everything uses theme variables, so dark mode works on the grid.

BEHAVIOR
1. Add student: a new empty row at the end. Pasting a list of names adds many.
2. Add subject: small dialog (name, max score). Reject duplicate names in the same
   class (case-insensitive).
3. Editing: only the active cell mounts an input (keeps 80x10 fast). Tap selects,
   a second tap or typing edits. Enter commits and moves down, Tab moves right,
   arrows move, Esc cancels. Blur commits. Score cells use inputmode="decimal".
4. Validation: a score must be a number from 0 to the subject's max. An invalid
   value is not saved, the cell shows an error outline, and a short translated
   message appears. A blank is saved as null, never 0. If a teacher lowers a max
   below existing scores, warn with the count and keep the data.
5. Column resize: a drag handle on each header edge, Pointer Events with
   touch-action: none. Minimum width 50 px. Widths saved per class.
6. Delete row or column: a small "×" on the row header (NO cell) and on the column
   header. On fine pointers it appears on hover or selection. On touch it appears
   after a long-press (about 500 ms). The Delete key also works on a selected row.
   Tapping "×" asks for confirmation, then ARCHIVES the data (never erases) and
   shows a 6-second snackbar with Undo.
7. Undo/redo: the last 50 actions (cell edit, paste as ONE action, add/archive
   student, add/archive/edit column). Buttons plus Ctrl/Cmd+Z. The stack clears
   when the sheet changes.
8. Paste from Excel: tab-separated text on the active cell fills right and down.
   Skips NO and Total. Pasting past the last row creates students. Extra columns
   are ignored with a notice. An invalid value is skipped. An empty pasted cell
   clears the target. Finish with a toast, for example "Pasted 38 cells, 2 skipped".
9. Autosave: debounced about 300 ms, writing only changed cells through the
   repositories. Flush pending writes on visibilitychange (hidden) and pagehide.
10. Sheets: switching tabs loads that class and semester. A Semester II sheet of a
    class shows the same students and columns with its own marks and remarks.
11. State: load the sheet into memory when it opens. Do not re-render from a live
    query during editing. Memoize rows. Recalculate Total only for the changed row.
12. Accessibility: role="grid", labelled cells, visible focus.

CODE STRUCTURE
src/pages/AddRecord/AddRecordPage.tsx
src/components/Sheets/ (SheetTabs.tsx, CreateClassDialog.tsx, TabMenu.tsx)
src/components/Grid/ (Grid.tsx, Cell.tsx, ColumnResizer.tsx, ColumnDialog.tsx)
src/lib/grid/ (total.ts, validate.ts, parsePaste.ts, undoStack.ts) as pure
functions with unit tests.

TESTS (Vitest)
- total: blanks ignored, all blank returns nothing, decimals, extra columns excluded
- validate: score range, age 5 to 30, sex M/F
- parsePaste: tabs/newlines, ragged rows, Windows line endings
- undoStack: limit 50, undo/redo order, paste is one action
- create class: name "Grade 11 A", duplicate sheet rejected, other semester reuses
  students, closed sheet reopens with data

DO NOT
- No create-class button on Home.
- No formulas that recalculate in the UI except Total.
- No charts, no attendance grid, no Average/Rank/Conduct.
- No export logic yet (v0.3b).

TEST CHECKLIST
[ ] Tap "+": the popup asks school name, grade, section, semester, year. Save
    creates a new tab "Grade 11 A · Sem I", selected.
[ ] Create the same class with Semester II: a second tab, same students.
[ ] The same sheet twice shows "This sheet already exists".
[ ] "Save" is a small pill, not full width, at 360 px.
[ ] Close a sheet: the tab disappears, the data stays. Recreating restores it.
[ ] Add 5 students and 3 subjects. Total updates for that row only.
[ ] "+ Column" adds an Attendance dropdown. It is not part of Total.
[ ] A blank cell stays blank, never 0. A score above max is rejected.
[ ] Resize a column by touch. Reload. The width is kept.
[ ] Long-press the NO cell on a phone: "×" appears, confirm, row archived,
    Undo restores it. Same for column headers.
[ ] Paste 20 rows x 5 columns from Excel. One Undo removes the whole paste.
[ ] 80 students x 10 subjects scrolls smoothly. NO and name stay sticky.
[ ] Amharic and Oromo names display correctly. Dark mode works on the grid.
[ ] No green anywhere. The colors are blue and white.
[ ] Airplane mode: everything works. Reload keeps all data.
[ ] No horizontal page scroll at 360, 390, 768, 1280. Nothing under the bottom nav.
[ ] Android back closes the popup or menu first.
[ ] No console errors.

--------------------------------------------------------------------------------
TASK v0.3b: EXPORT of the Add Record screen
Export what is on screen for the active sheet. The official roster layout comes in v0.6.

BUILD
1. Export menu on Add Record: Excel (.xlsx), CSV (.csv), PDF (.pdf), all enabled.
   There is no Word option.
2. Load libraries with dynamic import() only on tap. Show a loading state. Cancel
   in-flight work on unmount.
3. Columns, header labels, row order, and widths must match the screen: NO |
   Students name | Sex | Age | Asses |  sem | Total |  for the
   active class and semester. Archived rows and columns are excluded.
4. Values, not formulas. A blank score is an empty cell, never 0. Total is a number.
5. File name: <ClassName>_<Semester>_<YYYY-MM-DD>.<ext>, spaces replaced by "_",
   Ethiopic characters kept.
6. Colors come from src/export/exportTheme.ts: BLUE header fill, white header text,
   pale blue alternate rows. No green.

.xlsx (src/export/exportXlsx.ts, xlsx-js-style)
- Row 1 is the header: bold, white text, blue fill, centered.
- ws['!cols'] = widths with wch = Math.round(px / 7).
- Add a 3-line comment explaining px to wch (about 7 px per Excel character).
- Sheet name "Sem I" or "Sem II".

.csv (src/export/exportCsv.ts)
- UTF-8 with BOM so Excel opens Amharic correctly.

.pdf (src/export/exportPdf.ts, jspdf + jspdf-autotable)~
- A4. Portrait if 5 columns or fewer, landscape if more.
- Title: "<School> - <Class> - <Sem> - <Date>".
- columnStyles use each screen width scaled so the sum fits the printable width.
  Add a 3-line comment explaining this mapping.
- Blue header row with white text, repeated on every page. Alternating row
  shading. "Page X of Y" at the bottom. Nothing is cut off.
- Embed a bundled Ethiopic TTF subset with addFileToVFS/addFont, loaded only during
  PDF export, so Amharic and Oromo names print correctly. (jsPDF cannot use woff2.)

Also give: the npm install command, and one sentence on why xlsx-js-style is used
instead of plain xlsx.

TEST CHECKLIST
[ ] Each of the three files opens correctly with the same columns and order.
[ ] Column widths in Excel and PDF resemble the screen.
[ ] Amharic names are correct in .xlsx, .csv (opened in Excel), and .pdf.
[ ] A 40-student class prints on A4 with repeated header and page numbers.
[ ] Blank scores are empty cells, not 0.
[ ] Header color is blue in xlsx and pdf.
[ ] Export libraries are not in the initial bundle.
[ ] No console errors.

--------------------------------------------------------------------------------
OPEN QUESTIONS
1. Show a thin A, B, C letter row above the headers like real Excel? (Default: no.)
2. Should one sheet really be class + semester? (Default: yes, students shared.)
3. Should Edit class details also change the school name for the other semester
   sheet of the same class? (Default: yes, it is one class.)


--------------------------------------------------------------------------------
TASK v0.4: ATTENDANCE PAGE
Reuses the same sheet tabs and create-class popup as Add Record.
Mobile first: design and check 360 px width before wider.

BUILD
1. AttendancePage at src/pages/Attendance/AttendancePage.tsx.
   Wire it into App.tsx: replace renderPlaceholderPage('attendance') with
   <AttendancePage />.

2. PAGE LAYOUT (top to bottom, same shell as Add Record):
   a. Top bar: Export button (left, same as Add Record), hamburger (right).
   b. Class info line: class name, school name (small), "2018 EC · Sem I",
      save indicator (Saving... / Saved / "Not saved, tap to retry").
   c. Toolbar: one button "+ Session" (≥44 px high, blue outline style).
      On touch: also shows the session count ("3 sessions").
   d. Attendance grid (fills remaining height, scrolls inside itself).
   e. Sheet tabs row with the same "+" tab (opens the same create-class popup).
   f. Bottom nav (from App).

3. SHEET SELECTION — identical pattern to Add Record:
   - Reads classes from classRepo.listClasses().
   - Builds the same sheetTabs array (classId*10 + semester).
   - Loads the saved sheet from localStorage key "markbook-selected-sheet",
     the same key Add Record uses, so both pages share the active class.
   - The "+" tab opens the create-class dialog (copy the identical dialog
     from Add Record — same fields, same logic, same i18n keys).

4. SESSIONS
   A session is one column in the attendance grid:
   - header: short date (e.g. "Nov 7"), optional period number below it
     (e.g. "P3"), optional subject abbreviation (first 6 chars).
   - Tap header: opens SessionDialog to edit date/period/subject or delete.
   - Delete session: soft-archive via archivedAt on attendanceSessions table
     (requires DB migration, see item 7).
   - Sessions are ordered by date ascending; ties by id ascending.
   - Maximum 60 sessions shown (oldest first, then a "…" indicator if more).

5. ATTENDANCE GRID (Excel-like, blue and white)
   Columns: NO | Student Name | [Session cols …] | P | A | L | E
   - NO: row number, sticky left, 48 px wide.
   - Student Name: sticky left after NO, 150 px default.
   - Session cols: each 56 px wide, centered text. Scrollable.
   - P / A / L / E: summary totals (count), 44 px each, sticky right,
     header blue. Calculated, never stored.
   - Row height 40 px (touch) / 32 px (fine pointer).
   - Sticky header row (top). Active cell: 2 px blue outline.
   - Gridlines: 1 px var(--grid-line) (pale blue-grey).
   - Empty cell: shown as a dash "–" (not stored). Blank status = not taken.

6. CELL INTERACTION
   - Tap a cell: cycles P → A → L → E → blank (empty / not taken).
   - Save immediately on change via attendanceRepo.setAttendanceRecord().
   - No undo for single cell taps (undo is v0.5+ for attendance).
   - Keyboard: Space or Enter cycles the value. Arrow keys navigate cells.
   - The active session column highlights with a faint pale-blue column tint.

7. "+ SESSION" DIALOG  (src/pages/Attendance/SessionDialog.tsx)
   - Centered dialog on tablet/desktop, bottom-sheet on phone (<480 px).
   - Fields:
       Date (type="date", required, default today in ISO format YYYY-MM-DD)
       Period (type="number" min=1 max=8, optional, placeholder "1–8")
       Subject (select from active subjects of the class, optional, "– None –")
   - Buttons: Save pill (blue, 40 px) + quiet Cancel.
   - In edit mode: adds a "Delete session" ghost-red link at the bottom.
   - After Save: session is added, grid gains a new column, scrolled into view.
   - After Delete: session is archived, column removed.

8. EXPORT (uses the same export infrastructure as Add Record)
   - Export button opens the same 3-item menu: Excel, CSV, PDF.
   - Columns exported: NO | Student Name | [date headers] | P | A | L | E.
   - Date header format: "YYYY-MM-DD" (or "YYYY-MM-DD P<n>" if period set).
   - Cell values: "P", "A", "L", "E", or "" (blank = not taken).
   - File name: <ClassName>_Attendance_<Sem>_<YYYY-MM-DD>.<ext>.
   - Shows loading state; cancels on unmount (same AbortController pattern).
   - Export is lightly styled (same blue header) but no alternating rows for
     attendance (all white rows, cleaner for P/A/L/E data).

9. DB MIGRATION — Dexie version 2:
   - Add archivedAt field to attendanceSessions table (nullable number).
   - Index it: 'archivedAt'.
   - Never edit version(1) block. Add a new version(2) block.
   - attendanceRepo additions:
       listAttendanceSessions(classId) — filters out archivedAt != null
       createAttendanceSession(data) — returns { ...data, id }
       archiveAttendanceSession(id) — sets archivedAt = Date.now()
       listAttendanceRecords(sessionIds: number[]) — bulk fetch
       setAttendanceRecord(sessionId, studentId, status | null) — upsert;
         null removes the record (hard delete is acceptable for a blank cell)
       getAttendanceSummary(studentIds, sessionIds) — returns
         Record<studentId, { P:n, A:n, L:n, E:n }>

10. EMPTY STATE
    No class selected: same empty state card as Add Record with a link to
    "Add Record" to create a class.
    Class selected but no sessions: grid shows only the student rows with
    NO, name, and the P/A/L/E summary columns all zero; a soft "No sessions
    yet. Tap + Session to add one." banner inside the scroll area.

11. CODE STRUCTURE
    src/pages/Attendance/AttendancePage.tsx   — main page
    src/pages/Attendance/SessionDialog.tsx    — add/edit session dialog
    src/db/repositories/attendanceRepo.ts     — expanded (replaces old stub)
    src/db/db.ts                             — version(2) migration

12. i18n — add to en.json, am.json, om.json:
    attendance.addSession      "+ Session"
    attendance.sessionCount    "{n} sessions"
    attendance.noSessions      "No sessions yet. Tap + Session to add one."
    attendance.sessionDate     "Date"
    attendance.sessionPeriod   "Period"
    attendance.sessionSubject  "Subject"
    attendance.sessionNone     "– None –"
    attendance.deleteSession   "Delete session"
    attendance.confirmDelete   "Remove this session?"
    attendance.present         "P"
    attendance.absent          "A"
    attendance.late            "L"
    attendance.excused         "E"
    attendance.saved           "Saved"
    attendance.saving          "Saving..."
    attendance.retry           "Not saved, tap to retry"
    attendance.empty           "No class yet. Create one in Add Record."

TESTS (Vitest)
- attendanceRepo: createSession, archiveSession (not in listSessions after),
  setAttendanceRecord (upsert and null-delete), getAttendanceSummary counts
- DB migration: version(1) fixture opens under version(2) with no data loss

DO NOT
- Do not add average or percentage columns (v0.5).
- Do not add an "Absent streak" highlight (v0.5).
- Do not add filtering by subject (v0.5).
- Do not duplicate the create-class logic; copy the JSX and handlers from
  AddRecordPage, do not abstract it into a shared component in this version.

TEST CHECKLIST
[ ] Sheet tabs appear; "+" opens the create-class dialog with the same fields.
[ ] Creating a class on Attendance page and switching to Add Record shows the
    same class tab (shared localStorage key).
[ ] "+ Session" dialog opens; saving adds a column; cancelling does not.
[ ] Editing a session header updates the column header.
[ ] Deleting a session archives it; the column disappears; reload confirms.
[ ] Tapping a cell cycles P → A → L → E → blank. Reload keeps the state.
[ ] P/A/L/E summary counts are correct after mixed data.
[ ] Blank cell = not taken (empty, not "0" or "–" in export).
[ ] Export produces correct columns/values for all three formats.
[ ] No horizontal page scroll at 360, 390, 768, 1280. Nothing under nav.
[ ] Android back closes the dialog before leaving the page.
[ ] DB migration: old data is not lost (fixture test).
[ ] No console errors.
