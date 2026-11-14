import type { StudentRow } from '../../db/db'

export interface RosterSubject {
  id: number
  name: string
  maxScore: number
}

export interface RosterStudentRow {
  studentId: number
  serialNo: number
  name: string
  sex: string
  age: number | string
  scores: Record<number, number | null>
  total: number
  maxTotal: number
  average: number | null  // percentage of maxTotal, one decimal
  rank: number | null
  remark: string
}

export interface ScoreMatrixLike {
  [studentId: number]: { [subjectId: number]: number | string | null }
}

/**
 * Computes roster rows for one class + semester.
 *
 * - Total = raw sum of entered scores (blank = 0).
 * - Average = total / maxTotal * 100, where maxTotal = sum of ALL subject maxes.
 *   Blank scores count as 0 in the denominator — standard for official transcripts.
 * - Rank = competition style (1, 2, 2, 4) by average descending.
 *   Only students with at least one entered score participate.
 * - Remark comes from the passed-in remarks map (per-semester remark).
 */
export function computeRosterRows(
  students: StudentRow[],
  subjects: RosterSubject[],
  scores: ScoreMatrixLike,
  remarks?: Record<number, string | null>,
): RosterStudentRow[] {
  const activeStudents = students.filter((s) => !s.archivedAt && s.id != null)

  const rows: RosterStudentRow[] = activeStudents.map((student, idx) => {
    const sid = student.id as number
    const scoreRow = scores[sid] ?? {}
    const rowScores: Record<number, number | null> = {}
    let total = 0
    let maxTotal = 0
    let hasAnyScore = false

    for (const subject of subjects) {
      maxTotal += subject.maxScore
      const raw = scoreRow[subject.id]
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        rowScores[subject.id] = raw
        total += raw
        hasAnyScore = true
      } else {
        rowScores[subject.id] = null
      }
    }

    const average =
      hasAnyScore && maxTotal > 0
        ? Math.round((total / maxTotal) * 1000) / 10
        : null

    return {
      studentId: sid,
      serialNo: idx + 1,
      name: student.fullName,
      sex: student.sex ?? '',
      age: student.age ?? '',
      scores: rowScores,
      total,
      maxTotal,
      average,
      rank: null,
      remark: remarks?.[sid] ?? '',
    }
  })

  // Rank by average descending (competition style)
  const withScores = rows.filter((r) => Object.values(r.scores).some((v) => v !== null))
  const sorted = [...withScores].sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
  const rankMap = new Map<number, number>()
  let currentRank = 0
  let prevAverage = Number.POSITIVE_INFINITY
  for (let i = 0; i < sorted.length; i += 1) {
    const row = sorted[i]
    const avg = row.average ?? 0
    if (avg !== prevAverage) {
      currentRank = i + 1
      prevAverage = avg
    }
    rankMap.set(row.studentId, currentRank)
  }

  return rows.map((row) => ({
    ...row,
    rank: rankMap.get(row.studentId) ?? null,
  }))
}
