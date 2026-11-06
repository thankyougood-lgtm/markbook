import { describe, expect, it } from 'vitest'

import { buildGradebookRows, toCsv } from '../index'

describe('gradebook export', () => {
  it('builds rows and csv for a semester sheet', () => {
    const rows = buildGradebookRows({
      className: 'Grade 11 A',
      semester: 1,
      academicYear: '2018 EC',
      schoolName: 'Bole Secondary',
      students: [
        { id: 1, fullName: 'Alice', sex: 'F', age: 17 },
        { id: 2, fullName: 'Bob', sex: 'M', age: 18 },
      ],
      subjects: [
        { id: 10, name: 'Math', maxScore: 100, kind: 'score' },
        { id: 11, name: 'Attendance', maxScore: 100, kind: 'dropdown' },
      ],
      scores: {
        1: { 10: 90, 11: 'Present' },
        2: { 10: 80, 11: 'Absent' },
      },
      remarks: { 1: 'Good work', 2: 'Needs support' },
    })

    expect(rows[0]).toEqual(['NO', 'Student name', 'Sex', 'Age', 'Math /100', 'Attendance /100', 'Total', 'Remark'])
    expect(rows[1][1]).toBe('Alice')
    expect(rows[2][4]).toBe(80)

    const csv = toCsv(rows)
    expect(csv).toContain('Math /100')
    expect(csv).toContain('Good work')
    expect(csv).toContain('Alice')
  })
})
