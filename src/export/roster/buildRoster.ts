import type { RosterSubjectMap } from './autoMapSubjects'

export interface RosterStudent {
  id: number
  fullName: string
  sex: 'M' | 'F' | null
  age: number | null
}

export interface StudentMark {
  studentId: number
  subjectId: number
  value: number | null
}

export interface BuildRosterInput {
  students: RosterStudent[]
  rosterSubjects: RosterSubjectMap[]
  sem1Marks: StudentMark[]
  sem2Marks: StudentMark[]
  attendanceAbsents: Record<number, number | null>
  conduct: Record<number, string>
  remarks: Record<number, string>
}

export interface RosterRow {
  semester: 'I' | 'II' | 'AV'
  subjectValues: Record<string, number | null> // keyed by rosterSubject.key
  total: number | null
  average: number | null
  rank: number | null
  conduct: string | null
  absents: number | null
  remark: string | null
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
  subjects: RosterSubjectMap[]
  students: RosterStudentBlock[]
}

const AV_MISSING_AS_BLANK = true

export function buildRoster(input: BuildRosterInput): RosterModel {
  // 1. Index marks by studentId -> subjectId -> value
  const sem1Index: Record<number, Record<number, number | null>> = {}
  for (const m of input.sem1Marks) {
    sem1Index[m.studentId] ??= {}
    sem1Index[m.studentId][m.subjectId] = m.value
  }
  const sem2Index: Record<number, Record<number, number | null>> = {}
  for (const m of input.sem2Marks) {
    sem2Index[m.studentId] ??= {}
    sem2Index[m.studentId][m.subjectId] = m.value
  }

  // 2. Build rows
  const blocks: RosterStudentBlock[] = input.students.map((student, index) => {
    const s1 = sem1Index[student.id] || {}
    const s2 = sem2Index[student.id] || {}

    const buildRow = (type: 'I' | 'II' | 'AV'): RosterRow => {
      const subjectValues: Record<string, number | null> = {}
      let total = 0
      let hasMarks = false
      let enteredSubjects = 0

      for (const sub of input.rosterSubjects) {
        let val: number | null = null
        
        if (type === 'I' && sub.sem1SubjectId) {
          val = s1[sub.sem1SubjectId] ?? null
        } else if (type === 'II' && sub.sem2SubjectId) {
          val = s2[sub.sem2SubjectId] ?? null
        } else if (type === 'AV') {
          const v1 = sub.sem1SubjectId ? s1[sub.sem1SubjectId] : null
          const v2 = sub.sem2SubjectId ? s2[sub.sem2SubjectId] : null
          if (typeof v1 === 'number' && typeof v2 === 'number') {
            val = (v1 + v2) / 2
          } else if (!AV_MISSING_AS_BLANK) {
            // ... (not doing this as per prompt)
          }
        }

        if (val !== null) {
          val = Math.round(val * 100) / 100
          subjectValues[sub.key] = val
          total += val
          hasMarks = true
          enteredSubjects++
        } else {
          subjectValues[sub.key] = null
        }
      }

      return {
        semester: type,
        subjectValues,
        total: hasMarks ? total : null,
        average: hasMarks && enteredSubjects > 0 ? Math.round(total / enteredSubjects) : null,
        rank: null, // calculated later
        conduct: type === 'AV' ? null : (input.conduct[student.id] || null),
        absents: type === 'AV' ? (input.attendanceAbsents[student.id] ?? null) : null,
        remark: type === 'AV' ? (input.remarks[student.id] || null) : null
      }
    }

    return {
      no: index + 1,
      studentId: student.id,
      name: student.fullName,
      sex: student.sex || '',
      age: student.age != null ? String(student.age) : '',
      rows: [buildRow('I'), buildRow('II'), buildRow('AV')]
    }
  })

  // 3. Calculate ranks (strictly greater unrounded average)
  const types: ('I' | 'II' | 'AV')[] = ['I', 'II', 'AV']
  for (const type of types) {
    const withMarks = blocks.filter(b => {
      const r = b.rows.find(row => row.semester === type)
      return r && r.total !== null && r.average !== null // we have a mark
    })

    // Sort by unrounded average (total / entered)
    // Actually, we must use the precise unrounded average.
    // Since `average` is rounded, we need to recompute it from the subject values.
    const avgs = withMarks.map(b => {
      const r = b.rows.find(row => row.semester === type)!
      let sum = 0
      let count = 0
      for (const sub of input.rosterSubjects) {
        const v = r.subjectValues[sub.key]
        if (typeof v === 'number') {
          sum += v
          count++
        }
      }
      const unrounded = sum / count
      return { block: b, unrounded }
    })

    avgs.sort((a, b) => b.unrounded - a.unrounded)

    let currentRank = 1
    for (let i = 0; i < avgs.length; i++) {
      if (i > 0 && Math.abs(avgs[i].unrounded - avgs[i-1].unrounded) > 1e-9) {
        currentRank = i + 1
      }
      const row = avgs[i].block.rows.find(r => r.semester === type)!
      row.rank = currentRank
    }
  }

  return {
    subjects: input.rosterSubjects,
    students: blocks
  }
}
