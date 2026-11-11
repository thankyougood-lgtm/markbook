export function calculateTotal(values: Array<number | string | null | undefined>): number | null {
  const numericValues = values.filter((value) => {
    if (typeof value === 'number') {
      return Number.isFinite(value)
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      return trimmed !== '' && Number.isFinite(Number(trimmed))
    }

    return false
  })

  if (numericValues.length === 0) {
    return null
  }

  const total = numericValues.reduce<number>((sum, value) => sum + Number(value), 0)
  return total
}
