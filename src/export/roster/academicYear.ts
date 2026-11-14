export function formatAcademicYear(yearText: string): string {
  if (!yearText) return ''
  const clean = yearText.trim()
  
  // Extract the first 4-digit number
  const match = clean.match(/(\d{4})/)
  if (!match) return clean

  const ethYear = parseInt(match[1], 10)
  if (isNaN(ethYear)) return clean

  const gregYear = ethYear + 8
  return `${ethYear}E.C/${gregYear}G.C.`
}
