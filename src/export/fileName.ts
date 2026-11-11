export function getExportFileName(
  className: string,
  semester: 1 | 2,
  extension: string,
  date?: Date,
): string {
  const d = date ?? new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`

  const semStr = semester === 1 ? 'Sem_I' : 'Sem_II'
  const cleanClassName = className.trim().replace(/\s+/g, '_').replace(/[/\\:*?"<>|]/g, '')

  return `${cleanClassName}_${semStr}_${dateStr}.${extension}`
}

