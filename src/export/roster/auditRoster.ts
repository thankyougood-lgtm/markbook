import type { RosterModel } from './buildRoster'

export interface AuditIssue {
  severity: 'error' | 'warning'
  message: string
}

export interface AuditExpected {
  sem1Marks?: number
  sem2Marks?: number
}

export function auditRoster(model: RosterModel, _expected: AuditExpected = {}): AuditIssue[] {
  const issues: AuditIssue[] = []
  const err = (message: string) => issues.push({ severity: 'error', message })

  // 1. NO order check
  model.students.forEach((st, idx) => {
    if (st.no !== idx + 1) {
      err(`Student NO ${st.no} should be ${idx + 1}`)
    }
  })

  // 2. Row calculation checks
  for (const student of model.students) {
    for (let k = 0; k < 3; k++) {
      const row = student.rows[k]
      let sum = 0
      let count = 0
      for (const sub of model.subjects) {
        const v = row.subjectValues[sub.key]
        if (typeof v === 'number') {
          sum += v
          count++
        }
      }

      if (count === 0) {
        if (row.total !== null) err(`${student.name} ${row.semester}: total should be null`)
        if (row.average !== null) err(`${student.name} ${row.semester}: avg should be null`)
      } else {
        if (row.total !== null && Math.abs(row.total - sum) > 0.01) {
          err(`${student.name} ${row.semester}: total ${row.total} != sum ${sum}`)
        }
        if (row.average !== null && count > 0) {
          const expectedAvg = Math.round(sum / count)
          if (row.average !== expectedAvg) {
            err(`${student.name} ${row.semester}: avg ${row.average} != ${expectedAvg}`)
          }
        }
      }
    }
  }

  return issues
}
