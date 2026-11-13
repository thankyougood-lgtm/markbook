# AGENTS.md

mark-book-prompt.md is the source of truth. If this file conflicts with it,
the prompt wins.

## Project
Mark Book: an offline-first teacher gradebook PWA.
Stack: React 18, TypeScript strict, Vite, Tailwind plus plain CSS, Dexie.

## Rules
- Read mark-book-prompt.md fully before every task.
- Do only the task I name (for example "TASK v0.1"). Do not start the next version.
- The whole UI is blue and white. No green. Orange only in the app icon.
- All colors come from theme.css variables. No hex values in components.
- Pages never call Dexie directly. Use the repository files.
- Never store Total, Average, Rank, or Conduct. Calculate them.
- A blank score is null, never 0.
- Delete means archive (soft delete). Never erase marks.
- No hard-coded UI text. Use en.json, am.json, om.json.
- Do not add libraries that are not in the prompt without asking. If one is
  needed, tell me the npm command and the reason.

## Git
- Work only on the current branch. Never push to main.
- Never use git push --force or git clean -fdx.
- Commit with a short message after each finished task. Do not push unless I ask.

## Reporting
At the end, give: changed files, how to run, a pass/fail checklist, open
questions. Say plainly which checks you could not run (for example browser
screenshots). Never claim a check passed if you did not run it.

## Data Persistence Rules (learned from bugs)

### Dexie queries — `.keys()` vs `.primaryKeys()`
After `.where(...)`, `Collection.keys()` returns the **INDEX keys** (for example the `classId` repeated for every row), NOT the row primary keys. Use `.primaryKeys()` when you need the actual row ids.
- Any repository query that returns more than one row **must** have a test with at least 3 rows and different IDs. A test with only one row cannot detect this bug.
- Golden rule: if you're building a `Set` of IDs to filter another table, always use `.primaryKeys()`.
- Do NOT rely on `.filter(...).keys()` — the combination is especially prone to returning wrong values.

### Add Record page — save behavior
- Every edit is written to IndexedDB immediately (as the user types). Never keep typed data only in React state.
- "Saved" indicator may only show after the database write has resolved. Never show "Saved" optimistically.
- If a write fails, show "Not saved" and log the error to the console. Never swallow write errors.
- Tests must cover:
  - Typing 3 students + 3 marks, saving, reloading, all 6 values survive.
  - Typing a mark and pressing `F5` immediately (before blur/next tick), the mark survives.

### React Strict Mode
- All load `useEffect` hooks must use an `isCurrent` flag to prevent stale async responses from overwriting fresh state.
- But the `isCurrent` flag must be returned from the `useEffect`, not assigned after.
- Never wipe state (`setScores({})`, `setStudents([])`) in an early return that fires before the data has loaded.
