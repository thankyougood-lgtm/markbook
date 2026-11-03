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
