MASTER PROMPT: MARK BOOK (offline-first installable PWA for teachers)

ROLE
You are a senior React/TypeScript engineer, UI/UX designer, and PWA specialist.
You build Mark Book from scratch, one version at a time. Do not start a later
version until the current version passes its test checklist.

IMPORTANT: YOU CANNOT VIEW IMAGES
This prompt contains a written description of three reference images (app screen,
app icon, roster spreadsheet) in the section "DESIGN REFERENCE". Treat that section
as the design standard. Do not try to open images to understand the design.
If the user has copied the image files into docs/reference/ (ui-home.png,
app-icon.png, roster-photo.jpg), do not view them. Run a small script (Python
Pillow or Node sharp) to sample exact pixel colors and sizes, then freeze the values
in theme.css. If the files are missing, use the approximate values written here.

PRODUCT
Mark Book is used by high-school teachers who teach 4 or more classes. Each class
has its own students, subjects, marks, attendance, and analytics, separated by
Semester 1 and Semester 2. Teachers use it on Android and iPhone, often without
internet. Teachers export Excel, CSV, and Word files. Another app uses these files
for roster work, so export layouts must match the official roster exactly.

TECH STACK (fixed, do not replace)
- React 18+ with TypeScript in strict mode
- Vite with vite-plugin-pwa (Workbox service worker)
- Tailwind CSS. All colors, radii, shadows, and spacing come from CSS variables.
- Dexie.js for IndexedDB
- localStorage only for theme and language
- Recharts, loaded only on the Analytics page
- SheetJS (xlsx) and a Word library (docx), loaded only when exporting
- Vitest with fake-indexeddb for tests
- No other UI libraries. Use inline SVG icons.

DESIGN RULES (critical)
1. The DESIGN REFERENCE section below is the design standard. Do not change the
   layout, icons, colors, or navigation design.
2. Light theme: pale blue page background, white rounded cards and menu button,
   navy icons and headings, blue accent for the active tab and primary buttons.
   Approximate starting values: background #F2F6FE, surface #FFFFFF, navy #0B1F5C,
   accent #2F5BE0. Sample the exact values from the reference image files if they
   exist, then freeze them.
3. Dark theme: the same layout and accents, with dark surfaces and light text.
   It is a second set of CSS variables, not a new palette.
4. All colors live in one file (theme.css). No hex values inside components.
5. Rounded corners, soft shadows, and subtle gradients on primary elements only.
6. Latin text uses one system-friendly font stack. Amharic uses a bundled local
   Ethiopic font subset (woff2). No CDN fonts.
7. The app icon keeps its orange notebook colors. The UI stays blue and white.

=====================================================================
DESIGN REFERENCE (written description of the 3 reference images)
=====================================================================

--- IMAGE 1: APP SCREEN (the interface standard) ---

Phone portrait screen, about 838 x 1877 px (aspect ratio about 9:20). The screen has
rounded outer corners. The Home content area is EMPTY in the reference. Only the
chrome (hamburger button and bottom nav) is shown.

Page background
- Very pale blue / lavender-blue, flat, with an almost invisible soft gradient.
- Approx --bg: #F3F6FF (starting value #F2F6FE). Sample the real value, then freeze.

Hamburger button (top-right)
- About 36 px from the top and about 24 px from the right edge (at 838 px width),
  so about 4% of the width.
- Size about 108 x 98 px (about 13% of screen width), a rounded square with corner
  radius about 28 px (almost a squircle).
- Fill white (--surface), soft diffused shadow (low opacity, large blur, slight
  downward offset). No border.
- Icon: three horizontal navy lines (--navy, about #0B1F5C), thick (about 7 px),
  rounded caps, equal length (about 48 px), evenly spaced (about 18 px apart),
  centered in the button.

Bottom navigation (floating pill)
- A floating bar, not attached to the screen edges. Full width minus about 8 px
  margin on each side. Height about 130 px (about 7% of screen height). Fully
  rounded ends (pill shape).
- About 65 px above the screen bottom, plus the safe-area inset.
- Fill white, very slightly translucent. Soft large light shadow.
- Exactly five items, equal width, icon above label, in this order:
  1. Home (ACTIVE by default)
  2. Add Record
  3. Attendance
  4. Analytics
  5. Settings
- Icon about 48 px (at 838 px width). Label about 24 px, about 6 px below the icon.
- Label font: clean geometric sans-serif (Inter-like). Active label medium/semibold,
  inactive labels regular.

Nav icons (inline SVG, 24x24 viewBox, shown at 24 to 26 px in CSS)
All icons share one style: simple, rounded, friendly. Stroke icons use about 2 px
stroke with round caps and joins.
1. Home: FILLED solid house (pitched roof), with a small rounded door cut-out at
   the bottom center.
2. Add Record: OUTLINED circle (about 2 px stroke) with a plus sign inside, plus
   has rounded ends. Not filled.
3. Attendance: OUTLINED calendar. Rounded rectangle body, a thicker header band
   across the top, two small binder tabs sticking up on the top edge, and two or
   three small dots / small squares in the lower left of the body (marked days).
4. Analytics: FILLED bar chart with three vertical rounded bars, ascending in height
   left to right (short, medium, tall).
5. Settings: FILLED gear / cog with 8 teeth and a round hole in the center.

Nav colors
- Active item (Home): icon AND label navy (--navy, about #0B1F5C).
- Inactive items: medium blue-indigo (--nav-inactive, about #2D50A8) for icon and
  label. Clearly lighter than the active navy.
- Active underline: a short, thick, fully rounded bar in the accent blue (--accent,
  about #2F5BE0; a slightly brighter blue like #2F66F0 is acceptable if sampling
  shows it). Width about 90 px, thickness about 7 px, sitting under the active item
  at the very bottom edge of the pill, centered under that item. Only the active
  item has it.

Rules for this screen
- Same visual language everywhere: white rounded cards on the pale blue page, navy
  text and headings, blue accent for primary buttons and the active tab, generous
  padding, big radii (cards 20 to 28 px), soft shadows.
- The Export button (top-left, only on Add Record, Attendance, Analytics) matches the
  hamburger button style: small white rounded square, soft shadow, navy icon. The
  hamburger stays top-right on every page.
- Page content gets bottom padding = nav height + bottom gap + safe-area inset.
- Dark theme = same layout, a second set of variables (dark navy/charcoal page and
  surfaces, light text, same blue accent, underline stays accent blue).

--- IMAGE 2: APP ICON (orange notebook) ---

A glossy 3D-rendered spiral notebook, tilted about 10 to 15 degrees clockwise,
viewed from the front-left, on a transparent / plain white background.
- Cover: rounded rectangle (large corner radius), warm amber-orange with a soft
  gradient: lighter yellow-orange (#FBD27A to #F9C25E) at top-left, deeper orange
  (#F5A62E to #F29A1F) toward bottom-right. Soft highlights, plastic-like bevel.
- Spiral binding: SIX silver / chrome metal rings along the LEFT edge, evenly spaced
  vertically. Each ring is a thick glossy tube looping from behind the cover to over
  the left edge, entering a small rounded darker-orange eyelet on the cover.
- Label: a white rounded-rectangle label near the top of the cover (upper-right
  half), soft bevel. Inside are FOUR purple/indigo (#5B4FC9 to #6B5BD6) rounded text
  bars: row 1 has two bars (one short, one longer), row 2 one long bar, row 3 one
  medium-long bar.
- Bottom-right of the cover: one small pale peach / light cream rounded pill bar.
- Pages: a thin stack of white / light-gray page edges along the left and bottom
  edges, with a darker orange back cover peeking out below.

How to use it
- The user will place the file at public/icon-source.png (or docs/reference/app-icon.png).
  Generate from it, with sharp or an equivalent script: pwa-192x192.png,
  pwa-512x512.png, pwa-maskable-512x512.png (icon scaled to about 70% inside the 512
  canvas for the safe zone, on a solid light background), apple-touch-icon.png
  (180x180, no transparency, solid background), and favicon.png (48x48).
- If the source file is not there, make a temporary placeholder SVG icon (orange
  rounded square, white label, purple bars) and tell the user to supply the real
  PNG. Do NOT redraw the notebook from imagination and call it final.

--- IMAGE 3: ROSTER SPREADSHEET (the export layout to match exactly) ---

A photo of LibreOffice Calc, file "2018 ec 11th roster -.xlsx", sheet like
"A roster" (sibling sheets: "A student name", "B name", "A 1st", "A2nd", "A ave",
"B roster"). Font: Times New Roman, 8 pt body. This is the official layout that the
export (v0.6) must reproduce exactly.

Title block (top)
- A merged cell across the table width:
  <School> secondary school roster for grade 11 sec "A"  academic year 2016E.C/2024G.C.
  In the app, build it from class data:
  "<School> roster for <Grade> sec <Section> academic year <Year>".

Table header row (tall, about 4 normal rows high)
Columns, left to right:
NO | Students name | Sex | Age | Semester | English | Maths | Physics | Biology |
Chemistry | IT | Agriculture | Total | Average | Rank | Conduct | Absents | Remark
- Subject headers, NO, Sex, Age, Semester, Total, Average, Rank, Conduct, and
  Absents are written VERTICALLY (rotated 90 degrees, reading bottom to top),
  centered in narrow columns. "Students name" and "Remark" are horizontal.
- Header cells have thin black borders and an autofilter dropdown arrow.
- NOTE: the photo shows an "Absents" column after Conduct, but this prompt says
  "Attendance" in that position. Keep "Attendance" and ask the user (open question)
  which label to use. Keep the header label as one constant so it is a one-line change.

Data rows: three rows per student
- Row 1: Semester I. Row 2: Semester II. Row 3: Semester AV.
- NO, Students name, Sex, and Age cells are MERGED vertically across the three rows
  of one student. Name is left-aligned, NO is centered. Sex shows M or F.
- Semester cell shows I, II, or AV (centered, plain).
- Subject cells hold numbers: whole numbers or one decimal (for example 49.5, 61.5).
  Centered. Show up to one decimal and hide trailing zeros on whole numbers.
- Total: the sum of the subject scores for that semester row.
- Average: for rows I and II it is Total divided by the number of subjects, one
  decimal (for example total 343 over 7 subjects shows 49.0). For the AV row it is
  the mean of the two semester averages.
- AV row subject cells: the mean of Semester I and II for each subject (for example
  52 and 47 give 49.5). Total and Average on AV follow the same idea.
- Rank: whole number per row, per semester (the AV row gets its own rank).
- Conduct, Absents, and Remark cells are usually blank but bordered.
- All cells have thin black borders. No colored fills. White background. The AV row
  is the last row of each student block and has a slightly thicker bottom border.

Sample data seen in the photo (use ONLY in tests and fixtures)
Students: Abdrhamen Hassen Mohamed (M), Abriham Arjama Ando (M), Adagn Kamel
Gerahegn (M), Ageritu Ayele Abebe (F), Akililu Asefa Chimaki (M), Akililu Hamusu
Tsebe (M).
Student 1 example: I = 47, 45, 28, 70, 53, 52, 48, total 343, average 49.0, rank 17.
II = 52, 45, 50, 59, 70, 64, 57, total 397, average 56.7, rank 29.
AV = 49.5, 45, 39, 64.5, 61.5, 58, 52.5, total 370, average 52.9, rank 20.
(The photo is angled and blurry. Use these numbers only as rough fixtures.)

In the app versus the export
- Add Record stays the compact spreadsheet defined below (NO, name, sex, age,
  subjects, total). The three-row I / II / AV block layout, vertical headers, merged
  cells, Average, Rank, Conduct, and Absents belong to the EXPORT only (v0.6) and to
  later versions for Average, Rank, and Conduct.
- Use SheetJS merges (!merges) for the vertical NO / name / Sex / Age cells and cell
  style alignment.textRotation = 90 for the rotated headers. If the free SheetJS
  build does not write styles, document this limit and ask the user before adding a
  style-capable writer (in the export module only).
- Word export: same table, landscape, Ethiopic-safe font, vertical header text using
  textDirection BOTTOM_TO_TOP_LEFT_TO_RIGHT in the docx library.

=====================================================================
END OF DESIGN REFERENCE
=====================================================================

NAVIGATION
- Bottom nav: a rounded floating bar with exactly five items, in this order:
  Home, Add Record, Attendance, Analytics, Settings. Home is the default.
  Active item: navy icon and label with a blue underline. Respect the bottom
  safe area.
- Top-right: rounded white hamburger button with three navy lines. It opens a
  menu with: page links, Export, Backup/Restore, About. The menu does NOT contain
  the dark mode toggle.
- Export button: small rounded button in the top-left corner. It appears ONLY on
  Add Record, Attendance, and Analytics, never on Home or Settings. It opens a small
  menu: Excel (.xlsx), CSV (.csv), Word (.docx), Word (.doc). PDF comes later.
- Content never sits under the bottom nav. Add padding equal to the nav height plus
  the safe area.
- Android back button closes an open menu or dialog before leaving the page.

HOME
Clean, as in the reference image. Shows a class selector, a semester selector
(I / II), and a "New class" button. Add no other content without asking.

GLOBAL CONTEXT
Class and semester selectors appear on Add Record, Attendance, and Analytics. The
selection is saved in localStorage.

Creating a class asks for: class name, grade, section, academic year (text, for
example "2018 EC"), school name, and teacher name.

ADD RECORD (spreadsheet)
- Fixed columns, in order: NO | Students name | Sex | Age | Subject columns... | Total
- Average, Rank, and Conduct are reserved. Do not calculate or display them yet.
- Sex: dropdown with Male (M) or Female (F).
- Age: whole number, range check 5 to 30.
- Teacher can add and remove student rows and subject columns. Removing either asks
  for confirmation and archives the data (soft delete). It never erases marks silently.
- Each subject has a maximum score (default 100, editable).
- Scores are numbers from 0 to the maximum. A blank cell is NOT zero.
- Total = sum of the entered raw scores for that student and semester. Blank cells
  are ignored. Show nothing if no scores are entered.
- Keyboard: arrow keys, Tab, and Enter move between cells.
- Copy and paste from Excel (tab-separated text) works.
- Undo for the last 50 actions.
- A Remark column (free text) per student per semester.
- Auto-save to IndexedDB, debounced about 300 ms, with a "Saved" indicator.
- Stays smooth with 80 students and 10 subjects. Memoize rows. Recalculate only the
  changed row. Keep the spreadsheet scroll inside its own container, with the NO and
  name columns sticky.

ATTENDANCE
- Taken per date, per period (1 to 8), per subject, per class.
- Shows the same students, in the same order, as Add Record.
- Statuses: Present (P), Absent (A), Late (L), Excused (E). Empty means not recorded.
- Attendance % = present days / recorded days. Default rule (until the teacher
  confirms): Late counts as present, and Excused is removed from the total.
- Conduct is NOT calculated yet.

ANALYTICS
- Recharts loads only when this page opens.
- Default content: bar chart of subject scores, a status-count chart for attendance,
  a line chart of attendance over time, and a student summary table (name, sex,
  total, attendance %).
- Filters: semester and subject. Class comes from the global selector.
- Charts sit inside fixed-height containers to prevent layout shifts.

SETTINGS (full version in v0.7)
- Dark mode toggle. Only here.
- Language selector: English, Amharic (አማርኛ), Afan Oromo.
- Backup and Restore: download all data as a JSON file. Restore reads that file
  only after a preview (counts per table) and confirmation. Automatically export
  current data before any restore.
- About: app name, version, and an offline note.
- Storage status: shows whether persistent storage is granted (navigator.storage.persist).
- Later: grade cutoffs and optional Google Drive backup.

EXPORT (v0.6)
- Export values, not formulas.
- Header rows: school name, title line "<School> roster for <Grade> sec <Section>
  academic year <Year>", class, semester, export date.
- Table columns in this exact order:
  NO | Students name | Sex | Age | Semester | <subjects in order> | Total | Average | Rank | Conduct | Attendance | Remark
- Each student has three rows: Semester I (I), Semester II (II), and AV. The AV row
  stays blank until the average version.
- Match the visual layout in "IMAGE 3: ROSTER SPREADSHEET" (merged cells, vertical
  headers, borders, Times New Roman).
- File name: <ClassName>_<Semester>_<YYYY-MM-DD>.xlsx (or .csv, .docx, .doc).
- Word export: same table, landscape, with Ethiopic-safe font.
- Libraries load only when the user taps Export.

DATA MODEL (Dexie)
classes:           ++id, name, academicYear, schoolName, teacherName, createdAt, archivedAt
subjects:          ++id, classId, name, maxScore, order, archivedAt
students:          ++id, classId, serialNo, fullName, sex, age, order, archivedAt
studentSemesters:  [studentId+semester], remark, (conduct reserved for later)
scores:            [studentId+semester+subjectId], value (number or null)
attendanceSessions: ++id, classId, date, period, subjectId
attendanceRecords: [sessionId+studentId], status (P | A | L | E)
settings:          key, value
- Do NOT store Total as a field. Calculate it.
- semester is 1 or 2.
- Average and Rank will be added later as calculated values, with no schema change.

MIGRATIONS AND DATA SAFETY
- Dexie version numbers only increase. Never edit an old version block.
- Never drop a table or a field that holds user data. Archive instead.
- Keep a fixture database for each schema version in the tests. Every new version
  must open all old fixtures with no data loss.
- Pages never call Dexie directly. Use repository files.

PWA (v0.8)
- Manifest: name "Mark Book", short_name "Mark Book", display "standalone",
  start_url "/", scope "/", theme and background colors from the light palette.
- Icons: 192x192 and 512x512 PNG, plus a 512x512 maskable icon with safe-zone padding
  (generated from the app icon described in IMAGE 2).
- Add apple-touch-icon and the iOS meta tags.
- Service worker (vite-plugin-pwa), registerType "prompt". Precache the app shell,
  fonts, icons, and all lazy chunks, so the app works offline from first install.
  Report the precache size. Keep it under about 1.5 MB gzipped.
- Update: show an "Update available" banner. Never auto-reload while the user is
  typing. Never clear IndexedDB or localStorage during an update.
- Install: a custom "Install Mark Book" button on Android and desktop
  (beforeinstallprompt). On iPhone, show a one-time hint: Share, then Add to Home Screen.

RESPONSIVE
Test these sizes: 360x780 (small Android), 393x852 (common Android), 390x844
(iPhone), 768x1024 (tablet), 1280x800 (desktop).
No horizontal page scroll. Respect safe areas. The spreadsheet scrolls only inside
its container.

PERFORMANCE
- Keep the initial shell small (target under 200 KB gzipped JavaScript).
- Lazy-load only Analytics, export libraries, and the Ethiopic font if possible.
- Use indexes for class, semester, and date lookups.
- Remove event listeners and cancel in-flight exports on unmount.
- No console errors or warnings.

LANGUAGE (i18n)
- All UI text comes from translation files: en, am, om. No hard-coded text in components.
- Digits are 0 to 9 in all languages.
- Put Amharic and Oromo strings that need native review in translations-review.md.

WORKING METHOD
1. Before coding, list the files you will create or change, and the data changes for this version.
2. Build only the current version. Do not rewrite finished features.
3. At the end, provide: changed files, how to run, a pass/fail test checklist, and open questions.

START NOW WITH v0.1 (the app shell only)
1. Reply in one short message: confirm you read the DESIGN REFERENCE, and list any
   value you could not determine.
2. Create src/styles/theme.css with the light and dark token sets: --bg, --surface,
   --navy, --accent, --nav-inactive, --shadow-soft, --radius-card, --radius-pill,
   --radius-btn, and so on.
3. Create the inline SVG icon components: Home, AddRecord, Attendance, Analytics,
   Settings, Menu, Export.
4. Build the shell first (hamburger button and floating bottom nav). Match the
   numbers above at 390 x 844 before building any page content.
5. Stop at the end of v0.1 and give the checklist. Do not start v0.2 until the user
   says the checklist passed.

OPEN QUESTIONS TO ASK THE USER
- Export header: "Attendance" or "Absents"?
- Is the public icon file ready at public/icon-source.png?

TESTING (every version)
- All five tabs work. The hamburger menu opens and closes.
- Data survives closing and reopening the installed app.
- Airplane mode: every page still works.
- Existing data survives an update and a migration.
- No console errors.
MASTER PROMPT: MARK BOOK (offline-first installable PWA for teachers)

ROLE
You are a senior React/TypeScript engineer, UI/UX designer, and PWA specialist.
You build Mark Book from scratch, one version at a time. Do not start a later
version until the current version passes its test checklist.

IMPORTANT: YOU CANNOT VIEW IMAGES
This prompt contains a written description of three reference images (app screen,
app icon, roster spreadsheet) in the section "DESIGN REFERENCE". Treat that section
as the design standard. Do not try to open images to understand the design.
If the user has copied the image files into docs/reference/ (ui-home.png,
app-icon.png, roster-photo.jpg), do not view them. Run a small script (Python
Pillow or Node sharp) to sample exact pixel colors and sizes, then freeze the values
in theme.css. If the files are missing, use the approximate values written here.

PRODUCT
Mark Book is used by high-school teachers who teach 4 or more classes. Each class
has its own students, subjects, marks, attendance, and analytics, separated by
Semester 1 and Semester 2. Teachers use it on Android and iPhone, often without
internet. Teachers export Excel, CSV, and Word files. Another app uses these files
for roster work, so export layouts must match the official roster exactly.

TECH STACK (fixed, do not replace)
- React 18+ with TypeScript in strict mode
- Vite with vite-plugin-pwa (Workbox service worker)
- Tailwind CSS. All colors, radii, shadows, and spacing come from CSS variables.
- Dexie.js for IndexedDB
- localStorage only for theme and language
- Recharts, loaded only on the Analytics page
- SheetJS (xlsx) and a Word library (docx), loaded only when exporting
- Vitest with fake-indexeddb for tests
- No other UI libraries. Use inline SVG icons.

DESIGN RULES (critical)
1. The DESIGN REFERENCE section below is the design standard. Do not change the
   layout, icons, colors, or navigation design.
2. Light theme: pale blue page background, white rounded cards and menu button,
   navy icons and headings, blue accent for the active tab and primary buttons.
   Approximate starting values: background #F2F6FE, surface #FFFFFF, navy #0B1F5C,
   accent #2F5BE0. Sample the exact values from the reference image files if they
   exist, then freeze them.
3. Dark theme: the same layout and accents, with dark surfaces and light text.
   It is a second set of CSS variables, not a new palette.
4. All colors live in one file (theme.css). No hex values inside components.
5. Rounded corners, soft shadows, and subtle gradients on primary elements only.
6. Latin text uses one system-friendly font stack. Amharic uses a bundled local
   Ethiopic font subset (woff2). No CDN fonts.
7. The app icon keeps its orange notebook colors. The UI stays blue and white.

=====================================================================
DESIGN REFERENCE (written description of the 3 reference images)
=====================================================================

--- IMAGE 1: APP SCREEN (the interface standard) ---

Phone portrait screen, about 838 x 1877 px (aspect ratio about 9:20). The screen has
rounded outer corners. The Home content area is EMPTY in the reference. Only the
chrome (hamburger button and bottom nav) is shown.

Page background
- Very pale blue / lavender-blue, flat, with an almost invisible soft gradient.
- Approx --bg: #F3F6FF (starting value #F2F6FE). Sample the real value, then freeze.

Hamburger button (top-right)
- About 36 px from the top and about 24 px from the right edge (at 838 px width),
  so about 4% of the width.
- Size about 108 x 98 px (about 13% of screen width), a rounded square with corner
  radius about 28 px (almost a squircle).
- Fill white (--surface), soft diffused shadow (low opacity, large blur, slight
  downward offset). No border.
- Icon: three horizontal navy lines (--navy, about #0B1F5C), thick (about 7 px),
  rounded caps, equal length (about 48 px), evenly spaced (about 18 px apart),
  centered in the button.

Bottom navigation (floating pill)
- A floating bar, not attached to the screen edges. Full width minus about 8 px
  margin on each side. Height about 130 px (about 7% of screen height). Fully
  rounded ends (pill shape).
- About 65 px above the screen bottom, plus the safe-area inset.
- Fill white, very slightly translucent. Soft large light shadow.
- Exactly five items, equal width, icon above label, in this order:
  1. Home (ACTIVE by default)
  2. Add Record
  3. Attendance
  4. Analytics
  5. Settings
- Icon about 48 px (at 838 px width). Label about 24 px, about 6 px below the icon.
- Label font: clean geometric sans-serif (Inter-like). Active label medium/semibold,
  inactive labels regular.

Nav icons (inline SVG, 24x24 viewBox, shown at 24 to 26 px in CSS)
All icons share one style: simple, rounded, friendly. Stroke icons use about 2 px
stroke with round caps and joins.
1. Home: FILLED solid house (pitched roof), with a small rounded door cut-out at
   the bottom center.
2. Add Record: OUTLINED circle (about 2 px stroke) with a plus sign inside, plus
   has rounded ends. Not filled.
3. Attendance: OUTLINED calendar. Rounded rectangle body, a thicker header band
   across the top, two small binder tabs sticking up on the top edge, and two or
   three small dots / small squares in the lower left of the body (marked days).
4. Analytics: FILLED bar chart with three vertical rounded bars, ascending in height
   left to right (short, medium, tall).
5. Settings: FILLED gear / cog with 8 teeth and a round hole in the center.

Nav colors
- Active item (Home): icon AND label navy (--navy, about #0B1F5C).
- Inactive items: medium blue-indigo (--nav-inactive, about #2D50A8) for icon and
  label. Clearly lighter than the active navy.
- Active underline: a short, thick, fully rounded bar in the accent blue (--accent,
  about #2F5BE0; a slightly brighter blue like #2F66F0 is acceptable if sampling
  shows it). Width about 90 px, thickness about 7 px, sitting under the active item
  at the very bottom edge of the pill, centered under that item. Only the active
  item has it.

Rules for this screen
- Same visual language everywhere: white rounded cards on the pale blue page, navy
  text and headings, blue accent for primary buttons and the active tab, generous
  padding, big radii (cards 20 to 28 px), soft shadows.
- The Export button (top-left, only on Add Record, Attendance, Analytics) matches the
  hamburger button style: small white rounded square, soft shadow, navy icon. The
  hamburger stays top-right on every page.
- Page content gets bottom padding = nav height + bottom gap + safe-area inset.
- Dark theme = same layout, a second set of variables (dark navy/charcoal page and
  surfaces, light text, same blue accent, underline stays accent blue).

--- IMAGE 2: APP ICON (orange notebook) ---

A glossy 3D-rendered spiral notebook, tilted about 10 to 15 degrees clockwise,
viewed from the front-left, on a transparent / plain white background.
- Cover: rounded rectangle (large corner radius), warm amber-orange with a soft
  gradient: lighter yellow-orange (#FBD27A to #F9C25E) at top-left, deeper orange
  (#F5A62E to #F29A1F) toward bottom-right. Soft highlights, plastic-like bevel.
- Spiral binding: SIX silver / chrome metal rings along the LEFT edge, evenly spaced
  vertically. Each ring is a thick glossy tube looping from behind the cover to over
  the left edge, entering a small rounded darker-orange eyelet on the cover.
- Label: a white rounded-rectangle label near the top of the cover (upper-right
  half), soft bevel. Inside are FOUR purple/indigo (#5B4FC9 to #6B5BD6) rounded text
  bars: row 1 has two bars (one short, one longer), row 2 one long bar, row 3 one
  medium-long bar.
- Bottom-right of the cover: one small pale peach / light cream rounded pill bar.
- Pages: a thin stack of white / light-gray page edges along the left and bottom
  edges, with a darker orange back cover peeking out below.

How to use it
- The user will place the file at public/icon-source.png (or docs/reference/app-icon.png).
  Generate from it, with sharp or an equivalent script: pwa-192x192.png,
  pwa-512x512.png, pwa-maskable-512x512.png (icon scaled to about 70% inside the 512
  canvas for the safe zone, on a solid light background), apple-touch-icon.png
  (180x180, no transparency, solid background), and favicon.png (48x48).
- If the source file is not there, make a temporary placeholder SVG icon (orange
  rounded square, white label, purple bars) and tell the user to supply the real
  PNG. Do NOT redraw the notebook from imagination and call it final.

--- IMAGE 3: ROSTER SPREADSHEET (the export layout to match exactly) ---

A photo of LibreOffice Calc, file "2018 ec 11th roster -.xlsx", sheet like
"A roster" (sibling sheets: "A student name", "B name", "A 1st", "A2nd", "A ave",
"B roster"). Font: Times New Roman, 8 pt body. This is the official layout that the
export (v0.6) must reproduce exactly.

Title block (top)
- A merged cell across the table width:
  <School> secondary school roster for grade 11 sec "A"  academic year 2016E.C/2024G.C.
  In the app, build it from class data:
  "<School> roster for <Grade> sec <Section> academic year <Year>".

Table header row (tall, about 4 normal rows high)
Columns, left to right:
NO | Students name | Sex | Age | Semester | English | Maths | Physics | Biology |
Chemistry | IT | Agriculture | Total | Average | Rank | Conduct | Absents | Remark
- Subject headers, NO, Sex, Age, Semester, Total, Average, Rank, Conduct, and
  Absents are written VERTICALLY (rotated 90 degrees, reading bottom to top),
  centered in narrow columns. "Students name" and "Remark" are horizontal.
- Header cells have thin black borders and an autofilter dropdown arrow.
- NOTE: the photo shows an "Absents" column after Conduct, but this prompt says
  "Attendance" in that position. Keep "Attendance" and ask the user (open question)
  which label to use. Keep the header label as one constant so it is a one-line change.

Data rows: three rows per student
- Row 1: Semester I. Row 2: Semester II. Row 3: Semester AV.
- NO, Students name, Sex, and Age cells are MERGED vertically across the three rows
  of one student. Name is left-aligned, NO is centered. Sex shows M or F.
- Semester cell shows I, II, or AV (centered, plain).
- Subject cells hold numbers: whole numbers or one decimal (for example 49.5, 61.5).
  Centered. Show up to one decimal and hide trailing zeros on whole numbers.
- Total: the sum of the subject scores for that semester row.
- Average: for rows I and II it is Total divided by the number of subjects, one
  decimal (for example total 343 over 7 subjects shows 49.0). For the AV row it is
  the mean of the two semester averages.
- AV row subject cells: the mean of Semester I and II for each subject (for example
  52 and 47 give 49.5). Total and Average on AV follow the same idea.
- Rank: whole number per row, per semester (the AV row gets its own rank).
- Conduct, Absents, and Remark cells are usually blank but bordered.
- All cells have thin black borders. No colored fills. White background. The AV row
  is the last row of each student block and has a slightly thicker bottom border.

Sample data seen in the photo (use ONLY in tests and fixtures)
Students: Abdrhamen Hassen Mohamed (M), Abriham Arjama Ando (M), Adagn Kamel
Gerahegn (M), Ageritu Ayele Abebe (F), Akililu Asefa Chimaki (M), Akililu Hamusu
Tsebe (M).
Student 1 example: I = 47, 45, 28, 70, 53, 52, 48, total 343, average 49.0, rank 17.
II = 52, 45, 50, 59, 70, 64, 57, total 397, average 56.7, rank 29.
AV = 49.5, 45, 39, 64.5, 61.5, 58, 52.5, total 370, average 52.9, rank 20.
(The photo is angled and blurry. Use these numbers only as rough fixtures.)

In the app versus the export
- Add Record stays the compact spreadsheet defined below (NO, name, sex, age,
  subjects, total). The three-row I / II / AV block layout, vertical headers, merged
  cells, Average, Rank, Conduct, and Absents belong to the EXPORT only (v0.6) and to
  later versions for Average, Rank, and Conduct.
- Use SheetJS merges (!merges) for the vertical NO / name / Sex / Age cells and cell
  style alignment.textRotation = 90 for the rotated headers. If the free SheetJS
  build does not write styles, document this limit and ask the user before adding a
  style-capable writer (in the export module only).
- Word export: same table, landscape, Ethiopic-safe font, vertical header text using
  textDirection BOTTOM_TO_TOP_LEFT_TO_RIGHT in the docx library.

=====================================================================
END OF DESIGN REFERENCE
=====================================================================

NAVIGATION
- Bottom nav: a rounded floating bar with exactly five items, in this order:
  Home, Add Record, Attendance, Analytics, Settings. Home is the default.
  Active item: navy icon and label with a blue underline. Respect the bottom
  safe area.
- Top-right: rounded white hamburger button with three navy lines. It opens a
  menu with: page links, Export, Backup/Restore, About. The menu does NOT contain
  the dark mode toggle.
- Export button: small rounded button in the top-left corner. It appears ONLY on
  Add Record, Attendance, and Analytics, never on Home or Settings. It opens a small
  menu: Excel (.xlsx), CSV (.csv), Word (.docx), Word (.doc). PDF comes later.
- Content never sits under the bottom nav. Add padding equal to the nav height plus
  the safe area.
- Android back button closes an open menu or dialog before leaving the page.

HOME
Clean, as in the reference image. Shows a class selector, a semester selector
(I / II), and a "New class" button. Add no other content without asking.

GLOBAL CONTEXT
Class and semester selectors appear on Add Record, Attendance, and Analytics. The
selection is saved in localStorage.

Creating a class asks for: class name, grade, section, academic year (text, for
example "2018 EC"), school name, and teacher name.

ADD RECORD (spreadsheet)
- Fixed columns, in order: NO | Students name | Sex | Age | Subject columns... | Total
- Average, Rank, and Conduct are reserved. Do not calculate or display them yet.
- Sex: dropdown with Male (M) or Female (F).
- Age: whole number, range check 5 to 30.
- Teacher can add and remove student rows and subject columns. Removing either asks
  for confirmation and archives the data (soft delete). It never erases marks silently.
- Each subject has a maximum score (default 100, editable).
- Scores are numbers from 0 to the maximum. A blank cell is NOT zero.
- Total = sum of the entered raw scores for that student and semester. Blank cells
  are ignored. Show nothing if no scores are entered.
- Keyboard: arrow keys, Tab, and Enter move between cells.
- Copy and paste from Excel (tab-separated text) works.
- Undo for the last 50 actions.
- A Remark column (free text) per student per semester.
- Auto-save to IndexedDB, debounced about 300 ms, with a "Saved" indicator.
- Stays smooth with 80 students and 10 subjects. Memoize rows. Recalculate only the
  changed row. Keep the spreadsheet scroll inside its own container, with the NO and
  name columns sticky.

ATTENDANCE
- Taken per date, per period (1 to 8), per subject, per class.
- Shows the same students, in the same order, as Add Record.
- Statuses: Present (P), Absent (A), Late (L), Excused (E). Empty means not recorded.
- Attendance % = present days / recorded days. Default rule (until the teacher
  confirms): Late counts as present, and Excused is removed from the total.
- Conduct is NOT calculated yet.

ANALYTICS
- Recharts loads only when this page opens.
- Default content: bar chart of subject scores, a status-count chart for attendance,
  a line chart of attendance over time, and a student summary table (name, sex,
  total, attendance %).
- Filters: semester and subject. Class comes from the global selector.
- Charts sit inside fixed-height containers to prevent layout shifts.

SETTINGS (full version in v0.7)
- Dark mode toggle. Only here.
- Language selector: English, Amharic (አማርኛ), Afan Oromo.
- Backup and Restore: download all data as a JSON file. Restore reads that file
  only after a preview (counts per table) and confirmation. Automatically export
  current data before any restore.
- About: app name, version, and an offline note.
- Storage status: shows whether persistent storage is granted (navigator.storage.persist).
- Later: grade cutoffs and optional Google Drive backup.

EXPORT (v0.6)
- Export values, not formulas.
- Header rows: school name, title line "<School> roster for <Grade> sec <Section>
  academic year <Year>", class, semester, export date.
- Table columns in this exact order:
  NO | Students name | Sex | Age | Semester | <subjects in order> | Total | Average | Rank | Conduct | Attendance | Remark
- Each student has three rows: Semester I (I), Semester II (II), and AV. The AV row
  stays blank until the average version.
- Match the visual layout in "IMAGE 3: ROSTER SPREADSHEET" (merged cells, vertical
  headers, borders, Times New Roman).
- File name: <ClassName>_<Semester>_<YYYY-MM-DD>.xlsx (or .csv, .docx, .doc).
- Word export: same table, landscape, with Ethiopic-safe font.
- Libraries load only when the user taps Export.

DATA MODEL (Dexie)
classes:           ++id, name, academicYear, schoolName, teacherName, createdAt, archivedAt
subjects:          ++id, classId, name, maxScore, order, archivedAt
students:          ++id, classId, serialNo, fullName, sex, age, order, archivedAt
studentSemesters:  [studentId+semester], remark, (conduct reserved for later)
scores:            [studentId+semester+subjectId], value (number or null)
attendanceSessions: ++id, classId, date, period, subjectId
attendanceRecords: [sessionId+studentId], status (P | A | L | E)
settings:          key, value
- Do NOT store Total as a field. Calculate it.
- semester is 1 or 2.
- Average and Rank will be added later as calculated values, with no schema change.

MIGRATIONS AND DATA SAFETY
- Dexie version numbers only increase. Never edit an old version block.
- Never drop a table or a field that holds user data. Archive instead.
- Keep a fixture database for each schema version in the tests. Every new version
  must open all old fixtures with no data loss.
- Pages never call Dexie directly. Use repository files.

PWA (v0.8)
- Manifest: name "Mark Book", short_name "Mark Book", display "standalone",
  start_url "/", scope "/", theme and background colors from the light palette.
- Icons: 192x192 and 512x512 PNG, plus a 512x512 maskable icon with safe-zone padding
  (generated from the app icon described in IMAGE 2).
- Add apple-touch-icon and the iOS meta tags.
- Service worker (vite-plugin-pwa), registerType "prompt". Precache the app shell,
  fonts, icons, and all lazy chunks, so the app works offline from first install.
  Report the precache size. Keep it under about 1.5 MB gzipped.
- Update: show an "Update available" banner. Never auto-reload while the user is
  typing. Never clear IndexedDB or localStorage during an update.
- Install: a custom "Install Mark Book" button on Android and desktop
  (beforeinstallprompt). On iPhone, show a one-time hint: Share, then Add to Home Screen.

RESPONSIVE
Test these sizes: 360x780 (small Android), 393x852 (common Android), 390x844
(iPhone), 768x1024 (tablet), 1280x800 (desktop).
No horizontal page scroll. Respect safe areas. The spreadsheet scrolls only inside
its container.

PERFORMANCE
- Keep the initial shell small (target under 200 KB gzipped JavaScript).
- Lazy-load only Analytics, export libraries, and the Ethiopic font if possible.
- Use indexes for class, semester, and date lookups.
- Remove event listeners and cancel in-flight exports on unmount.
- No console errors or warnings.

LANGUAGE (i18n)
- All UI text comes from translation files: en, am, om. No hard-coded text in components.
- Digits are 0 to 9 in all languages.
- Put Amharic and Oromo strings that need native review in translations-review.md.

WORKING METHOD
1. Before coding, list the files you will create or change, and the data changes for this version.
2. Build only the current version. Do not rewrite finished features.
3. At the end, provide: changed files, how to run, a pass/fail test checklist, and open questions.

START NOW WITH v0.1 (the app shell only)
1. Reply in one short message: confirm you read the DESIGN REFERENCE, and list any
   value you could not determine.
2. Create src/styles/theme.css with the light and dark token sets: --bg, --surface,
   --navy, --accent, --nav-inactive, --shadow-soft, --radius-card, --radius-pill,
   --radius-btn, and so on.
3. Create the inline SVG icon components: Home, AddRecord, Attendance, Analytics,
   Settings, Menu, Export.
4. Build the shell first (hamburger button and floating bottom nav). Match the
   numbers above at 390 x 844 before building any page content.
5. Stop at the end of v0.1 and give the checklist. Do not start v0.2 until the user
   says the checklist passed.

OPEN QUESTIONS TO ASK THE USER
- Export header: "Attendance" or "Absents"?
- Is the public icon file ready at public/icon-source.png?

TESTING (every version)
- All five tabs work. The hamburger menu opens and closes.
- Data survives closing and reopening the installed app.
- Airplane mode: every page still works.
- Existing data survives an update and a migration.
- No console errors.
Work only on the ADD RECORD page now. Do not touch icons, theme, or Home.
Read fix-v0.3-add-record-prompt.md, STEP 2, in this folder. It describes the
page like the mobile Excel app.

The reference screenshots are in docs/reference/ (01 to 04). Try to read them
only if your tool can open images. If it cannot, use only the written
description in STEP 2. Do not guess beyond it.

Build the Add Record page exactly as STEP 2 says: top bar and icon row, Excel-style
grid, selected cell with handles, cell bar, floating toolbar, edit mode with the
X and check buttons, the toolbar above the keyboard, and the numeric keypad for
scores and age. Keep the master prompt's data model and rules.

When done: run typecheck and build, give the pass/fail checklist, run
git add -A && git commit -m "Add Record page", then stop.
