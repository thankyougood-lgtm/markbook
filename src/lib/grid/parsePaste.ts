export function parsePaste(input: string): string[][] {
  const normalized = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const rows = normalized.split('\n')

  const cleaned = rows.filter((row, index) => {
    if (row === '' && index === rows.length - 1) {
      return false
    }
    return true
  })

  return cleaned.map((row) => row.split('\t').map((cell) => cell))
}
