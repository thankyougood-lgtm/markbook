TASK C: SIMPLER CLASS FORM AND SMALL PROFESSIONAL BUTTONS

Read AGENTS.md first and follow it exactly (current feature branch, never main, never
push, no co-author lines, do not change git config). Do ONLY this task. Do not touch
the spreadsheet, Attendance logic, Export, Analytics, Settings, or the PWA.

---------------------------------------------------------------------
1. NEW CLASS FORM: ONLY 4 FIELDS

Remove "Class name", "School name", and "Teacher name" from the New class form and the
Edit class form. The form has exactly these fields, in this order:
1. Grade (required). A short text or number, for example 9, 10, 11, 12.
   Use inputMode "numeric" if grades are numbers only; otherwise a text field. Max 10
   characters.
2. Section (required). Short text, for example A, B, C. Max 6 characters. Show it
   uppercase.
3. Semester (required). A two-option segmented control "I" and "II", default "I".
4. Academic year (required). Text, for example "2018 EC". Max 12 characters.
   Placeholder "2018 EC". Do not guess a default year.

Behavior:
- The class display name is generated automatically from Grade and Section, for example
  "11 A" (store it in the existing `name` field so no schema change is needed).
  Everywhere the class name is shown (title bar, class list in the title sheet,
  Attendance, Analytics), show it as "Grade 11 A" built from i18n text, with the
  academic year and the semester in the small subtitle, for example
  "2018 EC - Sem I - Saved". Long text is cut with an ellipsis.
- The Semester field is the semester that opens first for the new class and sets the
  global semester selection. It does not limit the class: the class still holds
  records for both semesters, and the teacher can switch I / II from the title sheet.
- Reject a duplicate (same grade + section + academic year, ignoring case) with a clear
  inline message. Required fields show a short message under the field. Save stays
  disabled until the form is valid.
- Existing classes created earlier keep their stored name and data. For old classes
  that have a custom name, show that name; only new classes use the generated name.
  Old fields schoolName and teacherName stay in the database, untouched. Do NOT change
  the Dexie schema, and never delete data.
- School name and teacher name will be asked once in Settings later, for the export
  header. Do not build that now.
- Edit class uses the same four fields. Archive class stays as it is (soft delete with
  confirmation).
- All text goes in en, am, om and translations-review.md. Remove keys only used by the
  deleted fields.

---------------------------------------------------------------------
2. SMALL PROFESSIONAL BUTTONS

The "Create class" (Save) button in the form is currently long and full width. And the
"New class" button is also too big. Fix both, and apply one consistent button style:
- Primary button: auto width (fits its text), height 40 px, horizontal padding 20 px,
  fully rounded (pill), text 14 px semibold, white text on the app blue (--accent) with
  a very subtle gradient and a soft shadow (use theme variables only). A pressed state
  (slightly darker, scale 0.98), a clear focus ring, and a disabled state (lighter,
  no shadow). Touch target stays at least 44 px high through padding on the hit area.
- In the form footer: the primary "Create class" button sits on the RIGHT, auto width,
  and a quiet text button "Cancel" sits next to it on the left of it. Edit mode says
  "Save". No full-width buttons anywhere in this form.
- "New class" in the title sheet: a small secondary button (outlined or light-blue fill,
  pill, height 36 px, a small plus icon and the text), auto width, not full width.
- Put the shared styles in one reusable class or component (for example Button with
  variants primary, secondary, quiet) and use it for these buttons, so other pages can
  reuse it later. Colors only from theme.css. Do not restyle other buttons in this task.

---------------------------------------------------------------------
3. TESTS AND CHECKS
- Vitest: the form shows exactly four fields; Save is disabled until valid; the
  generated name is "11 A"; a duplicate grade + section + year is rejected; the chosen
  semester becomes the global selection; an old class with a custom name still loads and
  shows its name; edit keeps the data.
- Playwright at 390x844 and 360x780: open the title sheet, tap New class, take a
  screenshot of the empty form, the filled form, and the title bar after saving; assert
  the Create class button is NOT full width (its width is less than 60 percent of the
  form width) and is at least 44 px high including the hit area. Save screenshots to
  docs/screenshots/class-form/ and describe honestly what you see.
- npm run typecheck && npm test && npm run build must pass. No console errors.

---------------------------------------------------------------------
HOW TO FINISH
Small commits (owner as author, no co-author lines). Do NOT push. Report: files changed,
what the form and the title bar now show, the results of the checks, what is not done, a
short manual test checklist for the owner, and a ready-to-paste Pull Request description.
Stop and wait.
