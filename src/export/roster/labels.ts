export const ROSTER_LABELS = {
  NO: 'NO',
  NAME: 'Students name',
  SEX: 'Sex',
  AGE: 'Age',
  SEMESTER: 'Semester',
  TOTAL: 'Total',
  AVERAGE: 'Average',
  RANK: 'Rank',
  CONDUCT: 'Conduct',
  ABSENTS: 'Absents',
  REMARK: 'Remark',
} as const

export const SEM_LABELS = {
  I: 'I',
  II: 'II',
  AV: 'AV',
} as const

export const RESERVED_HEADERS = [
  'no', 'students name', 'name', 'sex', 'age', 'semester', 'total', 'average',
  'avg', 'avg %', 'rank', 'conduct', 'absents', 'attendance', 'remark', 'remarks'
]
