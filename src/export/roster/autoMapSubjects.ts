import type { SubjectRow } from '../../db/db'

export interface StudentMark {
  studentId: number
  subjectId: number
  value: number | null
}

export interface RosterSubjectMap {
  key: string
  label: string
  sem1SubjectId: number | null
  sem2SubjectId: number | null
}

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\/\d+$/, '').replace(/[^a-z0-9]/g, '')
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) matrix[i][j] = matrix[i - 1][j - 1]
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
    }
  }
  return matrix[a.length][b.length]
}

function areSimilar(a: string, b: string): boolean {
  const na = normalizeLabel(a)
  const nb = normalizeLabel(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.length >= 5 && nb.length >= 5 && levenshtein(na, nb) <= 2) return true
  if (na.length >= 4 && nb.length >= 4 && (na.startsWith(nb) || nb.startsWith(na))) return true
  return false
}

export function autoMapSubjects(
  sem1Subjects: SubjectRow[],
  sem2Subjects: SubjectRow[],
  _sem1Marks: StudentMark[],
  _sem2Marks: StudentMark[]
): RosterSubjectMap[] {
  const result: RosterSubjectMap[] = []
  const sem1Mapped = new Set<number>()
  const sem2Mapped = new Set<number>()

  // 1. Exact matches
  for (const s1 of sem1Subjects) {
    if (!s1.id) continue
    const s2 = sem2Subjects.find(x => x.id && normalizeLabel(x.name) === normalizeLabel(s1.name))
    if (s2 && s2.id) {
      result.push({
        key: `merged-${s1.id}-${s2.id}`,
        label: s1.name,
        sem1SubjectId: s1.id,
        sem2SubjectId: s2.id,
      })
      sem1Mapped.add(s1.id)
      sem2Mapped.add(s2.id)
    }
  }

  // 2. Similar matches (typos)
  for (const s1 of sem1Subjects) {
    if (!s1.id || sem1Mapped.has(s1.id)) continue
    for (const s2 of sem2Subjects) {
      if (!s2.id || sem2Mapped.has(s2.id)) continue
      if (areSimilar(s1.name, s2.name)) {
        result.push({
          key: `merged-${s1.id}-${s2.id}`,
          label: s1.name,
          sem1SubjectId: s1.id,
          sem2SubjectId: s2.id,
        })
        sem1Mapped.add(s1.id)
        sem2Mapped.add(s2.id)
        break
      }
    }
  }

  // 3. Remaining Sem 1 only
  for (const s1 of sem1Subjects) {
    if (s1.id && !sem1Mapped.has(s1.id)) {
      result.push({ key: `sem1-${s1.id}`, label: s1.name, sem1SubjectId: s1.id, sem2SubjectId: null })
    }
  }

  // 4. Remaining Sem 2 only
  for (const s2 of sem2Subjects) {
    if (s2.id && !sem2Mapped.has(s2.id)) {
      result.push({ key: `sem2-${s2.id}`, label: s2.name, sem1SubjectId: null, sem2SubjectId: s2.id })
    }
  }

  return result
}
