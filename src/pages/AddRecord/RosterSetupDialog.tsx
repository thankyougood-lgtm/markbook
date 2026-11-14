import { useState } from 'react'
import type { Semester } from '../../db/db'

interface SheetOption {
  id: number
  name: string
  semester: Semester
}

interface RosterSetupDialogProps {
  sheetOptions: SheetOption[]
  t: (key: string) => string
  onExport: (format: 'xlsx' | 'csv', sem1SheetId: number | null, sem2SheetId: number | null) => void
  onCancel: () => void
}

export function RosterSetupDialog({ sheetOptions, t, onExport, onCancel }: RosterSetupDialogProps) {
  const sem1Options = sheetOptions.filter(o => o.semester === 1)
  const sem2Options = sheetOptions.filter(o => o.semester === 2)

  // Auto-select the first available sheet for both semesters
  const [sem1SheetId, setSem1SheetId] = useState<number | null>(sem1Options[0]?.id ?? null)
  const [sem2SheetId, setSem2SheetId] = useState<number | null>(sem2Options[0]?.id ?? null)

  return (
    <div className="class-dialog-backdrop" onClick={onCancel} role="presentation">
      <form className="class-dialog" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onExport('xlsx', sem1SheetId, sem2SheetId) }}>
        <h3>Roster Setup</h3>
        
        <label>
          <span>Semester I Marks From</span>
          <select value={sem1SheetId ?? ''} onChange={(e) => setSem1SheetId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">– None –</option>
            {sem1Options.map(o => <option key={o.id} value={o.id}>{o.name} (Sem I)</option>)}
          </select>
        </label>

        <label>
          <span>Semester II Marks From</span>
          <select value={sem2SheetId ?? ''} onChange={(e) => setSem2SheetId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">– None –</option>
            {sem2Options.map(o => <option key={o.id} value={o.id}>{o.name} (Sem II)</option>)}
          </select>
        </label>

        <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '8px 0' }}>
          The roster will download as an Excel file matching the official school layout.
        </p>

        <div className="dialog-actions">
          <button type="button" className="toolbar-button" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="button" className="toolbar-button" onClick={() => onExport('csv', sem1SheetId, sem2SheetId)}>
            Roster CSV
          </button>
          <button type="submit" className="toolbar-button primary-button">
            Roster Excel
          </button>
        </div>
      </form>
    </div>
  )
}
