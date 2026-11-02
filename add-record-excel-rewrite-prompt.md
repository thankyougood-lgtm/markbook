ADD RECORD REWRITE: A REAL MOBILE SPREADSHEET (like the Excel phone app)

This file REPLACES every earlier Add Record rule (STEP 2 of fix-v0.3-add-record-prompt.md,
the "direct typing" message, and the fixed-column design). The current Add Record
page does not look or work like the reference. Stop patching it. Rebuild it.
Do not touch Home, the theme tokens, the bottom nav, the hamburger menu, or the
other pages. You cannot view images; everything needed is written here.
The reference screenshots are in docs/reference/ (01 to 04, mobile Excel). Use them
only if your tool can open images.

---------------------------------------------------------------------
0. WHAT WENT WRONG (the current build vs the reference)
- The current page is a styled HTML table with an app-style header. The reference
  is a spreadsheet: gray column letters (A, B, C...) across the top, gray row
  numbers (1, 2, 3...) down the left, thin gray grid lines, a selected cell with a
  border and two round handles, a formula bar, a floating icon toolbar, and sheet tabs.
- The current "+" is a column. In the reference workflow "+" adds a new SHEET.
- The current page forces fixed columns (NO, name, Sex, Age...). The teacher must be
  free to build any table: short or long, any headers, any number of columns and rows.
- The Sex picker floated in the middle of the page. Pickers must appear next to the
  edited cell or above the keyboard, as in the reference.

---------------------------------------------------------------------
1. THE PRODUCT FLOW
1. The teacher taps the "Add Record" tab in the bottom nav.
2. The spreadsheet opens full screen: a workbook with sheets, exactly like a
   phone spreadsheet app. There is no form, no "Add student" button, no dialog for data.
3. At the bottom, a row of SHEET TABS: "Sheet1", "Sheet2", ... and a "+" button at the end.
   Tapping "+" asks (small menu): Blank sheet, or Class roster template
   (row 1 prefilled with: NO, Students name, Sex, Age, then empty cells for subjects,
   Total, Remark). The new sheet is added and opened.
4. Tapping the active tab again opens a menu: Rename, Duplicate, Delete (confirmation;
   archive, never erase; the data stays recoverable).
5. The teacher types anything in any cell. The sheet grows as needed: start with
   26 columns (A to Z) and 100 rows; when the teacher scrolls near the end or types in
   the last row or column, add more automatically. The sheet may be very short or very long.
6. Everything auto-saves (debounce about 300 ms) with a "Saved" indicator.
7. A workbook belongs to one class and one semester (the global context, see 2.2).

---------------------------------------------------------------------
2. SCREEN LAYOUT, TOP TO BOTTOM (phone portrait, same order as the reference)

2.1 Top bar (white or page background, no extra card)
- Left: the Export button (small white rounded square, soft shadow, navy icon).
  Only on Add Record, Attendance, Analytics (existing rule).
- Center: the title, for example "Class 11A - Semester I" with a small down arrow.
  Under it, in small text: "Saved" / "Saving...".
- Right: the hamburger button (existing rule).

2.2 Class and semester (global context, no extra row on the page)
- Tapping the title opens a bottom sheet with: class list (select), semester
  segmented control I / II, "New class" button, and per class: Edit, Archive.
  "New class" opens the same form (class name, grade, section, academic year, school
  name, teacher name). After Save, the new class is selected and gets a first
  empty workbook ("Sheet1").
- If no class exists: the spreadsheet area shows a card "Create a class to start"
  with a button that opens the same sheet. Nothing else.

2.3 Icon row (one slim row of icon-only buttons, 44 px touch targets, navy)
Like the reference top row: Undo (gray when nothing to undo), Redo,
Format (an "A" with a small pen), Search, More (three dots).
- Format opens a small panel: bold, italic, text color, fill color, align left/center/right,
  wrap text, number format (General, Number, 0 decimals, 1 decimal, 2 decimals).
- Search finds text in the current sheet and jumps between matches.
- More: Find and replace, Freeze header row, Column width, Row height, Clear sheet.

2.4 The grid (fills the remaining height)
- Top-left corner cell: a small gray triangle (select all).
- Column header row: gray background, letters A, B, C... centered. Row header column:
  gray background, numbers 1, 2, 3... centered, narrow.
- Cells: white, thin light-gray grid lines, text 16 px, left-aligned text, right-aligned
  numbers. Default column width about 88 px, row height about 34 px, so cells are easy
  to tap. Column and row sizes can be resized by dragging the header edges.
- Header row and header column stay fixed while scrolling (frozen panes), and the sheet
  scrolls smoothly in both directions inside its own container only. No page scroll.
- Selection: tapping a cell selects it with a 2 px border in --sheet-accent and
  highlights its column letter and row number (darker gray). Two small round handles
  (white fill, --sheet-accent border, about 14 px) at the top-left and bottom-right
  corners. Dragging a handle extends the selection to a range. Range is used for
  Copy, Cut, Paste, Clear, fill color, and so on.
- Colors for the grid live in theme.css as variables: --sheet-accent (green, as in the
  reference: selection border, handles, check button), --sheet-grid-line,
  --sheet-header-bg, --sheet-header-bg-active, --danger (orange-red for the X button),
  --success (green for the check button). The rest of the app stays blue and white.
  If the user later wants blue, only --sheet-accent changes.

2.5 Cell bar (formula bar), above the toolbar
- Left: an italic "fx" icon. Next to it a rounded field (white, light border, rounded
  corners) showing the selected cell's content. A chevron on the right expands it
  (for long text such as Remarks).
- Tapping the field starts editing the selected cell.

2.6 Sheet tabs row, between the grid and the toolbar area
- Horizontally scrollable tabs: the active tab is white with bold text and a colored
  underline (--sheet-accent); inactive tabs are gray. The "+" button at the right end.

2.7 Floating toolbar (white rounded pill, soft shadow, icons only, scrolls sideways)
Browse mode, in this order (icons are inline SVG, outline style, navy):
Copy | Format cells | Sort | Insert (+) | Filter | Fill color | Decrease decimals |
Increase decimals | Delete (rows/columns/cells) | Merge cells.
- Insert (+) opens a small menu: Row above, Row below, Column left, Column right.
- Delete opens: Delete row, Delete column, Clear contents.
- It sits just above the bottom nav.

---------------------------------------------------------------------
3. EDIT MODE (like the reference)
- Start editing: double-tap a cell, tap the cell bar, or just start typing (desktop).
- While editing:
  - The selected cell shows a text cursor.
  - Two round buttons appear at the right, just above the cell bar: an orange-red circle
    with an X (cancel, restores the old value, --danger) and a green circle with a check
    mark (confirm, --success).
  - The cell bar border becomes --sheet-accent.
  - A second floating pill appears just above the keyboard, icons only, in this order:
    Paste (clipboard) | Previous cell (left arrow, gray when none) | Next cell (right arrow)
    | Keyboard type toggle (123 keyboard icon: switch number keypad / text keyboard) |
    Date picker (small calendar with dots) | Undo | More (two dots) | Hide keyboard.
  - The bottom nav and the first floating toolbar are HIDDEN while editing, so nothing
    overlaps. Use the visualViewport API so the cell, the cell bar, and the pill stay
    visible above the keyboard on Android and iPhone.
- Confirm (check button or Enter) saves and moves down one row (Excel behavior).
  Tab or the Next arrow moves right. Cancel (X or Escape) discards.
- Keyboard type: number keypad when the cell holds a number, otherwise normal text.
  The toggle button switches it manually.
- Suggestions: none. Autocomplete off.

---------------------------------------------------------------------
4. SPREADSHEET BEHAVIORS
- Typed numbers become numbers; everything else is text. A blank cell is blank, never zero.
- Basic formulas are supported if the chosen library supports them: =SUM(), =AVERAGE(),
  =MIN(), =MAX(), =COUNT(), cell references, + - * /. Formulas are a nice-to-have;
  do not spend steps on them before everything else works. Export writes VALUES, not formulas.
- Copy, cut, paste inside the sheet, and paste from Excel or WhatsApp (tab/newline text).
- Undo and redo for at least 50 actions.
- Row and column insert, delete, and resize. Freeze the first row (More menu).
- Data validation is NOT forced. The teacher may type anything anywhere.
  (Optional later: a column type for score columns with a 0 to max check.)
- Smooth with 100 columns x 300 rows (virtualized rendering, only visible cells drawn).
- Works offline (service worker) and on a 360 x 780 screen.

---------------------------------------------------------------------
5. LIBRARY DECISION (you may download a library)
Building a spreadsheet engine from scratch is slow and is why the last build failed.
The user allows downloading a library. Before writing the page, do a SMALL SPIKE
(time-box it; do not write the final page yet):
1. Evaluate these candidates in a throwaway route or folder, in this order:
   a) Univer (open source, Excel-like sheets, formulas, mobile support)
   b) FortuneSheet (MIT, Excel-like)
   c) Jspreadsheet CE (MIT)
   d) react-datasheet-grid or a similar light grid (only if a-c are unusable on a phone)
   e) Your own virtualized grid (last resort)
2. For each, check and report in a short table: license (MIT/Apache only, no
   non-commercial or paid features), bundle size gzipped, can it be lazy-loaded
   only on the Add Record route, works offline, touch behavior on a 390 x 844 viewport
   (tap select, double-tap edit, drag handles, pinch or scroll), supports multiple
   sheets and sheet tabs, can be themed with CSS variables, and whether the toolbar
   and cell bar can be replaced with our own UI.
3. The service worker precache total must stay under about 1.5 MB gzipped. If a library
   breaks that budget, say so and show the number.
4. Recommend ONE with a reason in 5 lines, and then STOP and wait for the user to
   say "go". Do not install more than the candidates needed for the spike, and
   remove the ones you do not choose.
After approval: install the chosen library, lazy-load it on the Add Record route only,
and style it with our theme variables (section 2) so it looks like the reference,
using our own top bar, icon row, cell bar, tabs, and toolbars around it.
If the library ships its own toolbar or UI that does not match section 2, hide it and
build ours on top of its API.

---------------------------------------------------------------------
6. DATA (do not edit the released schema)
- Never edit Dexie version 1. Add Dexie version 2 with NEW tables only, and keep a
  v1 fixture test proving old data still opens.
  Suggested new tables:
    sheets:     ++id, classId, semester, name, order, template, createdAt, archivedAt
    sheetData:  sheetId (primary key), data (the whole sheet as one object/JSON from the
                library, plus rowCount, colCount, updatedAt)
  Store one record per sheet (not one record per cell), so saving a big sheet is fast.
- Add repository files for sheets (list, create, rename, duplicate, archive, load data,
  save data). Pages never call Dexie directly.
- Keep the existing tables (classes, subjects, students, studentSemesters, scores,
  attendance*, settings) and their repositories and tests. Do NOT delete them.
  Add Record no longer writes to students, subjects, or scores for now.
- Auto-save writes the sheet data debounced about 300 ms and on page hide.
- In your final report, propose (do not build) how Attendance, Analytics and Export will
  read the roster from a "Class roster" sheet (for example: a header row
  mapping NO / Students name / Sex / Age / subjects, detected by the template).
  The export layout rules from the MASTER PROMPT stay the target.

---------------------------------------------------------------------
7. i18n, ACCESSIBILITY, QUALITY
- All new text goes in en, am, om, and translations-review.md. No hard-coded text.
- Buttons have labels (aria-label). Touch targets are at least 44 px.
- No console errors. Keep the ErrorBoundary so a crash shows the error on screen.
- Add Vitest tests where practical: sheet repository (create, rename, archive,
  save and load data, v1 fixture still opens), and a render test of the Add Record
  page that fails on thrown errors or console errors.

---------------------------------------------------------------------
8. HOW TO WORK (your step budget is limited: do one stage per turn)
Commit after each stage with: git add -A && git commit -m "<stage name>".
Stage 0: Audit + spike (section 5). Report the table and recommendation, then STOP.
Stage 1: Install the chosen library, Dexie v2 + sheets repository + tests.
Stage 2: Page shell: top bar, title sheet (class/semester), icon row, library grid
         styled like the reference, sheet tabs with "+", saving and loading.
Stage 3: Selection handles, cell bar, floating toolbar, edit mode with X and check,
         keyboard pill, hide the bottom nav while editing.
Stage 4: Insert/delete/resize rows and columns, copy/cut/paste, undo/redo, Format panel.
Stage 5: Templates (Blank / Class roster), sheet menu (rename, duplicate, delete),
         search, freeze row, polish at 360x780, 390x844, 768x1024.
After each stage: npm run typecheck && npm test && npm run build. Report in 5 lines
what works and what does not, and STOP. Do not start the next stage unless the user
says "go".
