import { useState } from 'react'
import type { AttendanceSessionRow, SubjectRow } from '../../db/db'

type SessionWithId = AttendanceSessionRow & { id: number }

interface SessionDialogProps {
  mode: 'add' | 'edit'
  session?: SessionWithId
  subjects: SubjectRow[]
  t: (key: string) => string
  onSave: (data: { date: string; period: number | null; subjectId: number | null }) => void
  onDelete?: () => void
  onCancel: () => void
}

function todayISO(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function SessionDialog({ mode, session, subjects, t, onSave, onDelete, onCancel }: SessionDialogProps) {
  const [date, setDate] = useState<string>(session?.date ?? todayISO())
  const [period, setPeriod] = useState<number | ''>(session?.period ?? '')
  const [subjectId, setSubjectId] = useState<number | null>(session?.subjectId ?? null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!date) return
    onSave({
      date,
      period: period === '' ? null : Number(period),
      subjectId,
    })
  }

  const activeSubjects = subjects.filter((s) => !s.archivedAt && s.id != null)

  return (
    <div className="session-dialog-backdrop" onClick={onCancel} role="presentation">
      <form
        className="session-dialog"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
      >
        <h3>
          {mode === 'add' ? t('attendance.addSession') : t('attendance.sessionDate')}
        </h3>

        <label>
          <span>{t('attendance.sessionDate')}</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>

        <label>
          <span>{t('attendance.sessionPeriod')}</span>
          <input
            type="number"
            min={1}
            max={8}
            placeholder="1-8"
            value={period}
            onChange={(event) => setPeriod(event.target.value === '' ? '' : Number(event.target.value))}
          />
        </label>

        <label>
          <span>{t('attendance.sessionSubject')}</span>
          <select
            value={subjectId ?? ''}
            onChange={(event) => setSubjectId(event.target.value === '' ? null : Number(event.target.value))}
          >
            <option value="">{t('attendance.sessionNone')}</option>
            {activeSubjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </label>

        <div className="dialog-actions">
          {mode === 'edit' && onDelete && (
            <button
              type="button"
              className="toolbar-button danger-button ghost-danger"
              onClick={() => setConfirmDelete(true)}
            >
              {t('attendance.deleteSession')}
            </button>
          )}
          <button type="button" className="toolbar-button" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="toolbar-button primary-button">
            {t('common.save')}
          </button>
        </div>

        {confirmDelete && (
          <div className="session-confirm-delete">
            <p>{t('attendance.confirmDelete')}</p>
            <div className="dialog-actions">
              <button type="button" className="toolbar-button" onClick={() => setConfirmDelete(false)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="toolbar-button danger-button"
                onClick={() => {
                  onDelete?.()
                  setConfirmDelete(false)
                }}
              >
                {t('attendance.deleteSession')}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
