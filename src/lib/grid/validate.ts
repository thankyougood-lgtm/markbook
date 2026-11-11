export function isValidScore(value: number | string | null | undefined, max: number): boolean {
  if (value === null || value === undefined || value === '') {
    return true
  }

  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= max
}

export function isValidAge(value: number | string | null | undefined): boolean {
  if (value === null || value === undefined || value === '') {
    return true
  }

  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(numeric) && numeric >= 5 && numeric <= 30
}

export function isValidSex(value: string | null | undefined): boolean {
  return value === null || value === undefined || value === '' || value === 'M' || value === 'F'
}
