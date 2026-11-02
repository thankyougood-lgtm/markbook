CORRECTION PROMPT: FIX HOME AND REBUILD ADD RECORD (v0.3)

You made mistakes in v0.3. Stop. Do not build anything new yet.
You cannot view images. Everything you need is written below. Follow the MASTER
PROMPT and DESIGN REFERENCE already given; this prompt overrides v0.3 only.

---------------------------------------------------------------------
STEP 0: AUDIT FIRST (no code changes)
Compare the current v0.3 code with the MASTER PROMPT. Reply with a short list:
- every place where you added something that was not asked for
- every place where the code differs from the master data model, navigation, or
  design rules
Then wait for the list to be fixed in the steps below. Do not touch the
schema, the repositories that already pass tests, the theme tokens, or the bottom nav.

---------------------------------------------------------------------
STEP 1: HOME PAGE MUST BE CLEAN (mistake 1)
Home is the default tab. It must look like the reference screen: pale blue page,
hamburger button at the top-right, floating bottom nav (DO NOT remove or change
the bottom nav).

Home contains ONLY these three things, inside one white rounded card
(--surface, --radius-card, --shadow-soft), placed near the top under the
hamburger row, with generous padding:
1. Class selector (a rounded dropdown showing the selected class name, or a
   placeholder "Select class").
2. Semester selector: a two-option segmented control "I" and "II". The active
   option uses the blue accent.
3. A primary button "New class" (blue accent, rounded).

Remove from Home: class cards, class lists, counts, headings or paragraphs that
describe the page, the Create Class form shown inline, any extra buttons, any
statistics, and any empty-state illustration.
- "New class" opens the Create Class form as a bottom sheet / dialog (modal) over
  the page. The form is NOT part of the Home page content. Fields: class name,
  grade, section, academic year, school name, teacher name. After Save, the sheet
  closes and the new class is selected in the class selector.
- The Android back button closes the sheet before leaving the page.
- If there are no classes, the selector shows the placeholder, and nothing else changes.
- Selected class and semester persist in localStorage.
Acceptance: Home shows the card with 3 controls, the hamburger, and the bottom
nav. Nothing else.

---------------------------------------------------------------------
STEP 2: ADD RECORD PAGE LOOKS AND WORKS LIKE A MOBILE EXCEL APP
Reference: the mobile Excel app (phone version). Copy its LAYOUT and BEHAVIOR,
not its branding. Do not use the Excel logo, name, or green colors. Mark Book
colors stay blue and white (selection border and handles use --accent blue).
Do not change the fixed columns or rules from the MASTER PROMPT "ADD RECORD".

2.1 Page layout, top to bottom
a) Top bar (one row, white page background):
   - Left: the Export button (small white rounded square, as per the master prompt).
   - Center: the title, for example "<Class name> - Semester I", small subtitle
     "Saved" / "Saving..." indicator under it.
   - Right: the hamburger button.
   - Under it, a slim action row of icon buttons (no text), like Excel's top icons:
     Undo, Redo, Search student, Add student, Add subject, More (...). Icons are
     inline SVG, navy, 24 px, round touch targets 44 px.
b) The grid (takes all remaining height, scrolls inside its own container only):
   - Looks like an Excel sheet: thin light-gray grid lines on every cell, white cells,
     a header row in light gray-blue with bold navy column names:
     NO | Students name | Sex | Age | <subjects...> | Total | Remark
   - Header row is sticky at the top. The NO and Students name columns are sticky on
     the left. Total is a calculated, read-only cell (slightly tinted).
   - Subject headers show the subject name and, below it in small text, the max score
     (for example "Maths / 100"). Tapping a subject header opens a small menu: Rename,
     Change max score, Remove (with confirmation, archives data).
   - Student rows: tapping the NO cell opens a menu: Insert above, Insert below,
     Remove (with confirmation, archives data).
   - Row height about 44 px, minimum font 14 px, so cells are easy to tap.
c) Cell bar (like Excel's formula bar), pinned just above the floating toolbar:
   - A rounded white field with a small label on the left instead of "fx". The label
     shows the selected cell's context in short text, for example "Abebe - Maths".
   - The field shows the current cell value. Tapping it starts editing the cell.
   - A chevron on the right expands it for long text (used for Remark).
d) Floating toolbar (a white rounded pill with soft shadow, icons only, evenly spaced),
   just above the bottom nav, in browse mode: Copy, Paste, Add student, Add subject,
   Clear cell, Undo, Redo. Icons are inline SVG and share the app icon style.

2.2 Selection (like Excel)
- Tapping a cell selects it: a 2 px --accent blue border around the cell, and the
  column header and the row's NO cell are highlighted in a darker gray-blue.
- Two small round handles (white fill, blue border, about 14 px) sit on the top-left
  and bottom-right corners of the selected cell. Dragging a handle extends the
  selection to a range. The range is used for Copy, Clear, and as the Paste target.
  If this is hard, ship the handles as range selection by drag and list any limit
  in the open questions.
- Arrow keys, Tab, Enter move the selection. Shift+Arrow extends the range (desktop).

2.3 Edit mode (like Excel)
- Double-tap a cell, or tap the cell bar, or just start typing on desktop: edit mode.
- While editing, show two round buttons at the right, just above the cell bar:
  a red-orange circle with an X (cancel, restores the old value) and a green circle with
  a check mark (confirm). Use CSS variables for these two colors (--danger, --success).
- The cell shows a text cursor. The cell bar border turns blue.
- On touch devices, the on-screen keyboard opens. Use the right keyboard per column:
  - Score cells and Age: numeric keypad (inputMode "decimal" for scores, "numeric"
    for Age).
  - Students name and Remark: normal text keyboard.
  - Sex: no keyboard; open a small dropdown with Male (M) / Female (F).
- A second floating pill sits just above the keyboard in edit mode, with icons only:
  Previous cell (left arrow), Next cell (right arrow), a keyboard-type toggle
  (switch numeric / text keyboard), Undo, Redo, and Hide keyboard.
  Next cell moves right in the same row, and at the row's end moves to the first
  editable cell of the next row.
- While the keyboard is open, HIDE the bottom nav so nothing overlaps. Show it again
  when editing ends. Use the visualViewport API so the grid, the cell bar and the
  pill stay above the keyboard on Android and iPhone.
- Confirm (check) saves the cell. Enter also confirms and moves down.
- Validation: score must be 0 to the subject maximum (blank is not zero); Age 5 to 30.
  An invalid value shows a red cell border and a short message, and the check button
  stays disabled.

2.4 Behaviors that must still work (from the master prompt)
Auto-save debounced about 300 ms with the "Saved" indicator. Copy and paste of
tab-separated text from Excel. Undo for the last 50 actions. Remark column per
student per semester. Total is calculated, never stored. No Average, Rank, or
Conduct. Smooth with 80 students and 10 subjects (memoized rows, only the changed
row recalculates, sticky columns inside the container).

2.5 Empty state
If no class is selected: a card in the middle of the page says "Select or create a
class on Home" with a button that goes to Home. If the class has no students: show the
empty grid header and an "Add student" button.

2.6 Do not add
No new tables, no new libraries, no charts, no extra pages. No hard-coded text:
all new text goes in the en, am, and om files and translations-review.md.

---------------------------------------------------------------------
STEP 3: VERIFY AND STOP
- Run typecheck, build, and the existing Vitest tests. Add tests for Total
  (blank is ignored, shows nothing when empty) and for score and age validation.
- Check the layout at 360x780, 390x844, and 768x1024. No horizontal page scroll.
- Give a pass/fail checklist for: Home is clean, bottom nav still works, grid looks
  like Excel mobile, selection and handles, edit mode with the X and check buttons,
  numeric keypad on score cells, bottom nav hidden while the keyboard is open,
  auto-save, undo, paste, soft delete, no console errors.
- List open questions. Then stop. Do not start v0.4.
