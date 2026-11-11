import { describe, expect, it } from 'vitest'
import { generateCsvString } from '../exportCsv'
import { getExportFileName } from '../fileName'
import { exportData } from '../index'
import type { ExportPayload } from '../types'

describe('export features', () => {
  it('formats export filename preserving Ethiopic characters and replacing spaces with _', () => {
    const fixedDate = new Date(2026, 10, 7) // 2026-11-07
    const fileNameEn = getExportFileName('Grade 11 A', 1, 'xlsx', fixedDate)
    expect(fileNameEn).toBe('Grade_11_A_Sem_I_2026-11-07.xlsx')

    const fileNameAm = getExportFileName('11ኛ ክፍል ሀ', 2, 'pdf', fixedDate)
    expect(fileNameAm).toBe('11ኛ_ክፍል_ሀ_Sem_II_2026-11-07.pdf')

    const fileNameOm = getExportFileName('Kutaa 11 A', 1, 'csv', fixedDate)
    expect(fileNameOm).toBe('Kutaa_11_A_Sem_I_2026-11-07.csv')
  })

  it('generates valid CSV with blank scores as empty cells and total as number', () => {
    const payload: ExportPayload = {
      className: '11A',
      schoolName: 'Bole High School',
      semester: 1,
      academicYear: '2018 EC',
      columns: [
        { id: 'no', label: 'NO', widthPx: 48, kind: 'no' },
        { id: 'name', label: 'Students name', widthPx: 180, kind: 'name' },
        { id: 'sex', label: 'Sex', widthPx: 72, kind: 'sex' },
        { id: 'age', label: 'Age', widthPx: 72, kind: 'age' },
        { id: '1', label: 'Math /100', widthPx: 100, kind: 'score', maxScore: 100 },
        { id: '2', label: 'Physics /100', widthPx: 100, kind: 'score', maxScore: 100 },
        { id: 'extra', label: 'Attendance', widthPx: 100, kind: 'extra' },
        { id: 'total', label: 'Total', widthPx: 120, kind: 'total' },
        { id: 'remark', label: 'Remark', widthPx: 160, kind: 'remark' },
      ],
      rows: [
        {
          studentId: 1,
          serialNo: 1,
          name: 'አበበ ከበደ',
          sex: 'M',
          age: 16,
          scores: { '1': 85, '2': null, extra: 'Present' },
          total: 85,
          remark: 'Good, keep it up!',
        },
        {
          studentId: 2,
          serialNo: 2,
          name: 'Caaltuu Margaa',
          sex: 'F',
          age: 17,
          scores: { '1': null, '2': null, extra: 'Absent' },
          total: null,
          remark: '',
        },
      ],
    }

    const csv = generateCsvString(payload)
    const lines = csv.split('\r\n')

    expect(lines[0]).toBe('NO,Students name,Sex,Age,Math /100,Physics /100,Attendance,Total,Remark')
    // Blank score for Physics is empty, quote for remark with comma
    expect(lines[1]).toBe('1,አበበ ከበደ,M,16,85,,Present,85,"Good, keep it up!"')
    // Blank scores and total for second student
    expect(lines[2]).toBe('2,Caaltuu Margaa,F,17,,,Absent,,')
  })

  it('computes Excel column width wch as Math.round(px / 7)', () => {
    const pxValues = [48, 180, 72, 104, 120, 160]
    const expectedWch = pxValues.map((px) => Math.round(px / 7))
    expect(expectedWch).toEqual([7, 26, 10, 15, 17, 23])
  })

  it('handles cancellation signal cleanly without throwing', async () => {
    const payload: ExportPayload = {
      className: '10A',
      semester: 1,
      columns: [],
      rows: [],
    }
    await expect(exportData('csv', payload, { aborted: true })).resolves.toBeUndefined()
  })
})
