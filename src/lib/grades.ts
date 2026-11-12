export type LetterGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F'

export interface GradeBand {
  min: number
  letter: LetterGrade
}

/**
 * Ethiopian high-school grading scale.
 * Sorted from highest min to lowest. First band whose min is <= pct wins.
 */
export const ETHIOPIAN_GRADE_BANDS: GradeBand[] = [
  { min: 90, letter: 'A+' },
  { min: 85, letter: 'A' },
  { min: 80, letter: 'A-' },
  { min: 75, letter: 'B+' },
  { min: 70, letter: 'B' },
  { min: 65, letter: 'B-' },
  { min: 60, letter: 'C+' },
  { min: 55, letter: 'C' },
  { min: 50, letter: 'C-' },
  { min: 40, letter: 'D' },
  { min: 0,  letter: 'F' },
]

export function computeLetterGrade(
  percentage: number | null | undefined,
  bands: GradeBand[] = ETHIOPIAN_GRADE_BANDS,
): LetterGrade | null {
  if (percentage === null || percentage === undefined) return null
  if (!Number.isFinite(percentage)) return null
  for (const band of bands) {
    if (percentage >= band.min) return band.letter
  }
  return 'F'
}
