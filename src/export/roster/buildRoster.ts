
export interface RosterSubject {
  id: number | string
  label: string
}

export interface RosterStudent {
  id: number
  fullName: string
  sex: 'M' | 'F' | null
  age: number | null
}

export interface StudentMark {
  studentId: number
  subjectLabel: string
  value: number | null
}

export interface BuildRosterInput {
  students: RosterStudent[]
  subjects: RosterSubject[]
  sem1Marks: StudentMark[]
  sem2Marks: StudentMark[]
  attendanceAbsents: Record<number, number | null>
  conduct: Record<number, string>
  remarks: Record<number, string>
}

export interface RosterRow {
  semester: 'I' | 'II' | 'AV'
  subjectValues: Record<string, number | null>
  total: number | null
  average: number | null
  rank: number | null
  conduct: string
  absents: number | null
  remark: string
}

export interface RosterStudentBlock {
  no: number
  studentId: number
  name: string
  sex: string
  age: string
  rows: [RosterRow, RosterRow, RosterRow]
}

export interface RosterModel {
  subjects: string[]
  students: RosterStudentBlock[]
  warnings: {
    textInSubjectCells: number
    unmatchedRows: number
  }
}

const AV_MISSING_AS_BLANK = true

function indexMarks(marks: StudentMark[]): Record<number, Record<string, number | null>> {
  const out: Record<number, Record<string, number | null>> = {}
  for (const m of marks) {
    if (!out[m.studentId]) out[m.studentId] = {}
    if (typeof m.value === 'number' && Number.isFinite(m.value)) {
      out[m.studentId][m.subjectLabel] = m.value
    } else {
      out[m.studentId][m.subjectLabel] = null
    }
  }
  return out
}

function buildRow(
  semester: 'I' | 'II' | 'AV',
  subjectLabels: string[],
  valsForRow: Record<string, number | null>,
  conductValue: string,
  absentsValue: number | null,
  remarkValue: string,
): RosterRow {
  const subjectValues: Record<string, number | null> = {}
  let total = 0
  let hasMarks = false
  let enteredSubjects = 0

  for (const sub of subjectLabels) {
    const v = valsForRow[sub]
    if (typeof v === 'number' && Number.isFinite(v)) {
      const rounded = Math.round(v * 100) / 100
      subjectValues[sub] = rounded
      total += rounded
      hasMarks = true
      enteredSubjects++
    } else {
      subjectValues[sub] = null
    }
  }

  const average = hasMarks && enteredSubjects > 0
    ? Math.round(total / enteredSubjects)
    : null

  return {
    semester,
    subjectValues,
    total: hasMarks ? total : null,
    average,
    rank: null,
    conduct: conductValue,
    absents: absentsValue,
    remark: remarkValue,
  }
}

export function buildRoster(input: BuildRosterInput): RosterModel {
  const subjectLabels = input.subjects.map((s) => s.label)
  const warnings = { textInSubjectCells: 0, unmatchedRows: 0 }

  const sem1Map = indexMarks(input.sem1Marks)
  const sem2Map = indexMarks(input.sem2Marks)

  const blocks: RosterStudentBlock[] = input.students.map((student, index) => {
    const s1 = sem1Map[student.id] || {}
    const s2 = sem2Map[student.id] || {}

    // I row uses s1 directly
    const rowI = buildRow(
      'I',
      subjectLabels,
      s1,
      input.conduct[student.id] || '',
      null,
      '',
    )

    // II row uses s2 directly
    const rowII = buildRow(
      'II',
      subjectLabels,
      s2,
      input.conduct[student.id] || '',
      null,
      '',
    )

    // AV row: per-subject average of I and II
    const avVals: Record<string, number | null> = {}
    for (const sub of subjectLabels) {
      const v1 = s1[sub]
      const v2 = s2[sub]
      if (typeof v1 === 'number' && typeof v2 === 'number') {
        avVals[sub] = (v1 + v2) / 2
      } else if (!AV_MISSING_AS_BLANK && (typeof v1 === 'number' || typeof v2 === 'number')) {
        avVals[sub] = ((v1 ?? 0) + (v2 ?? 0)) / 2
      } else {
        avVals[sub] = null
      }
    }
    const rowAV = buildRow(
      'AV',
      subjectLabels,
      avVals,
      '', // conduct blank on AV
      input.attendanceAbsents[student.id] ?? null,
      input.remarks[student.id] || '',
    )

    return {
      no: index + 1,
      studentId: student.id,
      name: student.fullName,
      sex: student.sex || '',
      age: student.age != null ? String(student.age) : '',
      rows: [rowI, rowII, rowAV],
    }
  })

  // Ranks per semester type
  const types: ('I' | 'II' | 'AV')[] = ['I', 'II', 'AV']
  for (const type of types) {
    const averages = blocks
      .map((b) => {
        const r = b.rows.find((row) => row.semester === type)
        return { studentId: b.studentId, average: r?.average ?? null }
      })
      .filter((x): x is { studentId: number; average: number } => x.average !== null)
      .sort((a, b) => b.average - a.average)

    let currentRank = 1
    for (let i = 0; i < averages.length; i++) {
      if (i > 0 && averages[i].average !== averages[i - 1].average) {
        currentRank = i + 1
      }
      const block = blocks.find((b) => b.studentId === averages[i].studentId)
      const row = block?.rows.find((r) => r.semester === type)
      if (row) row.rank = currentRank
    }
  }

  return {
    subjects: subjectLabels,
    students: blocks,
    warnings,
  }
}
