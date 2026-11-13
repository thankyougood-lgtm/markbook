import { useEffect, useMemo, useRef, useState } from 'react'
import { SheetTabs } from '../../components/Sheets/SheetTabs'
import type {
  AttendanceSessionRow,
  MarkBookClass,
  Semester,
  StudentRow,
  SubjectRow,
} from '../../db/db'
import * as attendanceRepo from '../../db/repositories/attendanceRepo'
import * as classRepo from '../../db/repositories/classRepo'
import * as studentRepo from '../../db/repositories/studentRepo'
import * as subjectRepo from '../../db/repositories/subjectRepo'
import { exportAttendanceData } from '../../export/attendanceExport'
import en from '../../i18n/en.json'
import am from '../../i18n/am.json'
import om from '../../i18n/om.json'
import { SessionDialog } from './SessionDialog'
import './AttendancePage.css'

const dictionaries = {
  en: en as Record<string, string>,
  am: am as Record<string, string>,
  om: om as Record<string, string>,
}
type Locale = keyof typeof dictionaries

function getLocale(): Locale {
  const saved = localStorage.getItem('markbook-language')
  return saved === 'am' || saved === 'om' ? saved : 'en'
}
function getText(key: string): string {
  return dictionaries[getLocale()][key] ?? key
}

type SheetTab = { id: number; label: string; active?: boolean }
type Status = 'P' | 'A' | 'L' | 'E'
type AttendanceSummary = { P: number; A: number; L: number; E: number }
type SessionWithId = AttendanceSessionRow & { id: number }
type SessionDialogState = { mode: 'add' } | { mode: 'edit'; session: SessionWithId } | null

const STATUS_CYCLE: Status[] = ['P', 'A', 'L', 'E']
const SESSIONS_LIMIT = 60

function readSelectedSheet(): { classId: number | null; semester: Semester } {
  const saved = localStorage.getItem('markbook-selected-sheet')
  if (!saved) return { classId: null, semester: 1 }
  const [classPart, semPart] = saved.split('-')
  const classId = Number(classPart)
  const sem = Number(semPart) === 2 ? 2 : 1
  return { classId: Number.isFinite(classId) && classId > 0 ? classId : null, semester: sem }
}

function formatSessionDate(dateISO: string): string {
  try {
    const d = new Date(dateISO + 'T00:00:00')
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return dateISO
  }
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function AttendancePage() {
  const initial = useMemo(() => readSelectedSheet(), [])

  const [classes, setClasses] = useState<MarkBookClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<number | null>(initial.classId)
  const [semester, setSemester] = useState<Semester>(initial.semester)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [sessions, setSessions] = useState<SessionWithId[]>([])
  const [records, setRecords] = useState<Record<string, Status>>({})
  const [createClassOpen, setCreateClassOpen] = useState(false)
  const [sessionDialog, setSessionDialog] = useState<SessionDialogState>(null)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'retry'>('saved')
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null)
  const [createClassState, setCreateClassState] = useState({
    schoolName: '',
    grade: 11,
    section: 'A',
    semester: 1 as Semester,
    academicYear: getText('addRecord.defaultYear'),
  })

  const gridRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  const activeClass = classes.find((c) => c.id === selectedClassId) ?? null

  // Persist sheet selection (shared with Add Record)
  useEffect(() => {
    if (selectedClassId != null) {
      localStorage.setItem('markbook-selected-sheet', selectedClassId + '-' + semester)
    }
  }, [selectedClassId, semester])

  // Load classes once
  useEffect(() => {
    void (async () => {
      const items = await classRepo.listClasses()
      setClasses(items)
      if (!items.length) {
        setSelectedClassId(null)
        return
      }
      const savedExists = selectedClassId != null && items.some((i) => i.id === selectedClassId)
      const nextSelected = savedExists ? selectedClassId : (items[0]?.id ?? null)
      setSelectedClassId(nextSelected)
      const nextClass = items.find((i) => i.id === nextSelected) ?? items[0]
      if (nextClass && nextClass.openSemesters.length) {
        const allowed = nextClass.openSemesters.map((n) => Number(n))
        if (!allowed.includes(semester)) {
          setSemester((allowed[0] as Semester) || 1)
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load data when active class or semester changes
  useEffect(() => {
    if (!activeClass?.id) {
      setStudents([])
      setSubjects([])
      setSessions([])
      setRecords({})
      return
    }
    const classId = activeClass.id
    void (async () => {
      try {
        const [nextStudents, nextSubjects, nextSessions] = await Promise.all([
          studentRepo.listStudents(classId),
          subjectRepo.listSubjects(classId),
          attendanceRepo.listAttendanceSessions(classId),
        ])
        const nextRecords = await attendanceRepo.listAttendanceRecords(
          nextSessions.map((s) => s.id),
        )
        setStudents(nextStudents)
        setSubjects(nextSubjects)
        setSessions(nextSessions)
        const recMap: Record<string, Status> = {}
        for (const r of nextRecords) {
          recMap[`${r.sessionId}:${r.studentId}`] = r.status
        }
        setRecords(recMap)
      } catch (error) {
        console.error('Failed to load attendance:', error, (error as { inner?: unknown }).inner)
      }
    })()
  }, [activeClass?.id, semester])

  // Reset active cell when sheet changes
  useEffect(() => {
    setActiveCell(null)
  }, [selectedClassId, semester])

  // Summary
  const summary = useMemo(() => {
    const map: Record<number, AttendanceSummary> = {}
    for (const s of students) {
      if (s.id == null) continue
      map[s.id] = { P: 0, A: 0, L: 0, E: 0 }
    }
    const sessionIds = new Set(sessions.filter((s) => !s.archivedAt).map((s) => s.id))
    for (const [key, status] of Object.entries(records)) {
      const [sidStr, stidStr] = key.split(':')
      const sid = Number(sidStr)
      const stid = Number(stidStr)
      if (!map[stid]) continue
      if (!sessionIds.has(sid)) continue
      map[stid][status as Status]++
    }
    return map
  }, [students, sessions, records])

  // Sheet tabs
  const sheetTabs = useMemo<SheetTab[]>(() => {
    const tabs: SheetTab[] = []
    for (const item of classes) {
      const sems =
        Array.isArray(item.openSemesters) && item.openSemesters.length ? item.openSemesters : [1]
      for (const sem of sems) {
        const label = `${item.name} · ${
          Number(sem) === 1 ? getText('semester.short.i') : getText('semester.short.ii')
        }`
        tabs.push({
          id: (item.id ?? 0) * 10 + Number(sem),
          label,
          active: item.id === selectedClassId && Number(sem) === semester,
        })
      }
    }
    return tabs
  }, [classes, selectedClassId, semester])

  const activeStudents = useMemo(
    () => students.filter((s) => !s.archivedAt && s.id != null),
    [students],
  )
  const allActiveSessions = useMemo(() => sessions.filter((s) => !s.archivedAt), [sessions])
  const activeSessions = useMemo(
    () => allActiveSessions.slice(0, SESSIONS_LIMIT),
    [allActiveSessions],
  )
  const truncatedSessions = allActiveSessions.length > SESSIONS_LIMIT

  const subjectsById = useMemo(() => {
    const m = new Map<number, SubjectRow>()
    for (const s of subjects) if (s.id != null) m.set(s.id, s)
    return m
  }, [subjects])

  const cycleCell = async (sessionId: number, studentId: number) => {
    const key = `${sessionId}:${studentId}`
    const current = records[key]
    const nextIndex = current ? STATUS_CYCLE.indexOf(current) + 1 : 0
    const next: Status | null = nextIndex >= STATUS_CYCLE.length ? null : STATUS_CYCLE[nextIndex]

    setSaveState('saving')
    try {
      await attendanceRepo.setAttendanceRecord(sessionId, studentId, next)
      setRecords((prev) => {
        const copy = { ...prev }
        if (next === null) delete copy[key]
        else copy[key] = next
        return copy
      })
      setSaveState('saved')
    } catch (error) {
      console.error('Failed to save attendance:', error, (error as { inner?: unknown }).inner)
      setSaveState('retry')
    }
  }

  const handleTabSelect = (tabId: number) => {
    const nextClassId = Math.floor(tabId / 10)
    const nextSem = (tabId % 10) as Semester
    if (!Number.isFinite(nextClassId) || (nextSem !== 1 && nextSem !== 2)) return
    setSelectedClassId(nextClassId)
    setSemester(nextSem)
  }

  const saveSession = async (data: { date: string; period: number | null; subjectId: number | null }) => {
    if (!activeClass?.id) return
    try {
      if (sessionDialog?.mode === 'edit') {
        await attendanceRepo.updateAttendanceSession(sessionDialog.session.id, data)
        setSessions((prev) =>
          prev
            .map((s) => (s.id === sessionDialog.session.id ? { ...s, ...data } : s))
            .sort((a, b) => {
              const dateCmp = a.date.localeCompare(b.date)
              return dateCmp !== 0 ? dateCmp : a.id - b.id
            }),
        )
      } else {
        const created = await attendanceRepo.createAttendanceSession({
          classId: activeClass.id,
          ...data,
        })
        setSessions((prev) =>
          [...prev, created].sort((a, b) => {
            const dateCmp = a.date.localeCompare(b.date)
            return dateCmp !== 0 ? dateCmp : a.id - b.id
          }),
        )
      }
      setSessionDialog(null)
    } catch (error) {
      console.error('Failed to save session:', error, (error as { inner?: unknown }).inner)
    }
  }

  const deleteSession = async () => {
    if (sessionDialog?.mode !== 'edit') return
    const id = sessionDialog.session.id
    try {
      await attendanceRepo.archiveAttendanceSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
      setRecords((prev) => {
        const next: Record<string, Status> = {}
        for (const [k, v] of Object.entries(prev)) {
          if (!k.startsWith(`${id}:`)) next[k] = v
        }
        return next
      })
      setSessionDialog(null)
    } catch (error) {
      console.error('Failed to archive session:', error, (error as { inner?: unknown }).inner)
    }
  }

  const createClass = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const section = (createClassState.section.trim() || 'A').toUpperCase()
    const year = createClassState.academicYear.trim() || getText('addRecord.defaultYear')
    const name = `Grade ${createClassState.grade} ${section}`
    try {
      const created = await classRepo.createClass({
        name,
        grade: createClassState.grade,
        section,
        academicYear: year,
        schoolName: createClassState.schoolName.trim(),
        semester: createClassState.semester,
        allowDuplicate: true,
      })
      await classRepo.openSheet(created.id ?? 0, createClassState.semester)
      setClasses((prev) => {
        const idx = prev.findIndex((c) => c.id === created.id)
        if (idx >= 0) return prev.map((c) => (c.id === created.id ? created : c))
        return [...prev, created]
      })
      setSelectedClassId(created.id ?? null)
      setSemester(createClassState.semester)
      setCreateClassOpen(false)
      setCreateClassState({
        schoolName: '',
        grade: 11,
        section: 'A',
        semester: 1,
        academicYear: getText('addRecord.defaultYear'),
      })
    } catch (error) {
      console.error('Failed to create class:', error)
      window.alert(getText('addRecord.classExists'))
    }
  }

  // ── Export ───────────────────────────────────────────────────────────
  const exportCurrentSheet = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!activeClass?.id) return

    if (abortControllerRef.current) abortControllerRef.current.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    window.dispatchEvent(new CustomEvent('markbook:export-status', { detail: { exporting: true } }))

    try {
      const sessionHeaders = activeSessions.map((s) => {
        const parts: string[] = [s.date]
        if (s.period != null) parts.push(`P${s.period}`)
        return parts.join(' ')
      })

      const exportStudents = activeStudents.map((student, idx) => {
        const studentId = student.id as number
        const statuses = activeSessions.map(
          (s) => (records[`${s.id}:${studentId}`] ?? '') as 'P' | 'A' | 'L' | 'E' | '',
        )
        const sum = summary[studentId] ?? { P: 0, A: 0, L: 0, E: 0 }
        return {
          serialNo: idx + 1,
          name: student.fullName,
          statuses,
          summary: { P: sum.P, A: sum.A, L: sum.L, E: sum.E },
        }
      })

      await exportAttendanceData(
        format,
        {
          schoolName: activeClass.schoolName,
          className: activeClass.name,
          semester: semester === 2 ? 2 : 1,
          academicYear: activeClass.academicYear,
          dateStr: todayISO(),
          sessionHeaders,
          students: exportStudents,
        },
        abortController.signal,
      )
    } catch (error) {
      if (abortController.signal.aborted) return
      console.error('Attendance export failed', error)
      window.alert('Export failed. Please try again.')
    } finally {
      if (isMountedRef.current) {
        window.dispatchEvent(
          new CustomEvent('markbook:export-status', { detail: { exporting: false } }),
        )
      }
    }
  }

  useEffect(() => {
    const handleExport = (event: Event) => {
      const ce = event as CustomEvent<{ format?: 'csv' | 'xlsx' | 'pdf' }>
      const format = ce.detail?.format
      if (!format) return
      void exportCurrentSheet(format)
    }
    window.addEventListener('markbook:export', handleExport)
    return () => window.removeEventListener('markbook:export', handleExport)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClass?.id, activeStudents, activeSessions, records, summary, semester])

  // ── Keyboard navigation ──────────────────────────────────────────────
  useEffect(() => {
    if (!activeCell) return
    const cell = gridRef.current?.querySelector<HTMLElement>(
      `[data-cell="${activeCell.row}-${activeCell.col}"]`,
    )
    cell?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeCell])

  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (activeSessions.length === 0 || activeStudents.length === 0) return

    if (!activeCell) {
      if (event.key.startsWith('Arrow') || event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        setActiveCell({ row: 0, col: 0 })
      }
      return
    }

    const maxRow = activeStudents.length - 1
    const maxCol = activeSessions.length - 1

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        setActiveCell({ row: Math.max(0, activeCell.row - 1), col: activeCell.col })
        break
      case 'ArrowDown':
        event.preventDefault()
        setActiveCell({ row: Math.min(maxRow, activeCell.row + 1), col: activeCell.col })
        break
      case 'ArrowLeft':
        event.preventDefault()
        setActiveCell({ row: activeCell.row, col: Math.max(0, activeCell.col - 1) })
        break
      case 'ArrowRight':
        event.preventDefault()
        setActiveCell({ row: activeCell.row, col: Math.min(maxCol, activeCell.col + 1) })
        break
      case ' ':
      case 'Enter': {
        event.preventDefault()
        const student = activeStudents[activeCell.row]
        const session = activeSessions[activeCell.col]
        if (student?.id != null && session) {
          void cycleCell(session.id, student.id)
        }
        break
      }
      case 'Escape':
        setActiveCell(null)
        break
    }
  }

  const saveLabel =
    saveState === 'saved'
      ? getText('attendance.saved')
      : saveState === 'saving'
      ? getText('attendance.saving')
      : getText('attendance.retry')

  const createClassDialogNode = createClassOpen ? (
    <div className="class-dialog-backdrop" onClick={() => setCreateClassOpen(false)}>
      <form className="class-dialog" onClick={(e) => e.stopPropagation()} onSubmit={createClass}>
        <h3>{getText('addRecord.classDialogTitle')}</h3>
        <label>
          <span>{getText('addRecord.school')}</span>
          <input
            value={createClassState.schoolName}
            onChange={(e) => setCreateClassState((c) => ({ ...c, schoolName: e.target.value }))}
          />
        </label>
        <div className="dialog-two-col">
          <label>
            <span>{getText('addRecord.grade')}</span>
            <select
              value={createClassState.grade}
              onChange={(e) =>
                setCreateClassState((c) => ({ ...c, grade: Number(e.target.value) }))
              }
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{getText('addRecord.section')}</span>
            <input
              value={createClassState.section}
              maxLength={3}
              onChange={(e) =>
                setCreateClassState((c) => ({ ...c, section: e.target.value.toUpperCase() }))
              }
            />
          </label>
        </div>
        <div className="dialog-two-col">
          <label>
            <span>{getText('addRecord.semester')}</span>
            <select
              value={createClassState.semester}
              onChange={(e) =>
                setCreateClassState((c) => ({ ...c, semester: Number(e.target.value) as Semester }))
              }
            >
              <option value={1}>I</option>
              <option value={2}>II</option>
            </select>
          </label>
          <label>
            <span>{getText('addRecord.year')}</span>
            <input
              value={createClassState.academicYear}
              onChange={(e) =>
                setCreateClassState((c) => ({ ...c, academicYear: e.target.value }))
              }
            />
          </label>
        </div>
        <div className="dialog-actions">
          <button type="button" className="toolbar-button" onClick={() => setCreateClassOpen(false)}>
            {getText('common.cancel')}
          </button>
          <button type="submit" className="toolbar-button primary-button">
            {getText('common.save')}
          </button>
        </div>
      </form>
    </div>
  ) : null

  const sessionCountText = activeSessions.length
    ? getText('attendance.sessionCount').replace('{n}', String(activeSessions.length))
    : ''

  return (
    <section className="attendance-page">
      <div className="add-record-header">
        <div className="record-meta-block">
          <div className="record-class-name">
            {activeClass?.name ?? getText('page.attendance')}
          </div>
          <div className="record-school-name">{activeClass?.schoolName ?? ''}</div>
          <div className="record-semester">
            {activeClass?.academicYear ?? getText('addRecord.defaultYear')} ·{' '}
            {semester === 1 ? getText('semester.short.i') : getText('semester.short.ii')}
          </div>
        </div>
        <div className="save-indicator">{saveLabel}</div>
      </div>

      {!activeClass ? (
        <div className="attendance-grid-wrapper">
          <div className="grid-empty-state">
            <p>{getText('attendance.empty')}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="record-toolbar" aria-label="Attendance actions">
            <button
              type="button"
              className="toolbar-button primary-button icon-button"
              onClick={() => setSessionDialog({ mode: 'add' })}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>{getText('attendance.addSession')}</span>
            </button>
            {sessionCountText && <span className="session-count-badge">{sessionCountText}</span>}
          </div>

          {activeSessions.length === 0 ? (
            <div className="attendance-grid-wrapper">
              <div className="empty-sessions-banner">{getText('attendance.noSessions')}</div>
              <table
                className="attendance-grid-table"
                role="grid"
                aria-label="Attendance grid"
              >
                <colgroup>
                  <col className="att-col-no" />
                  <col className="att-col-name" />
                  <col className="att-col-sum" />
                  <col className="att-col-sum" />
                  <col className="att-col-sum" />
                  <col className="att-col-sum" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="att-no att-header">NO</th>
                    <th className="att-name att-header">{getText('addRecord.studentName')}</th>
                    <th className="att-summary att-p att-header">{getText('attendance.present')}</th>
                    <th className="att-summary att-a att-header">{getText('attendance.absent')}</th>
                    <th className="att-summary att-l att-header">{getText('attendance.late')}</th>
                    <th className="att-summary att-e att-header">{getText('attendance.excused')}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudents.map((student, index) => (
                    <tr key={student.id}>
                      <td className="att-no">{index + 1}</td>
                      <td className="att-name">
                      <input
                        className="inline-grid-input"
                        value={student.fullName}
                        onChange={(e) => {
                          const newName = e.target.value
                          setStudents((prev) =>
                            prev.map((s) => (s.id === student.id ? { ...s, fullName: newName } : s))
                          )
                        }}
                        onBlur={async (e) => {
                          if (student.id) {
                            await studentRepo.updateStudent({ ...student, fullName: e.target.value })
                          }
                        }}
                      />
                    </td>
                      <td className="att-summary att-p">0</td>
                      <td className="att-summary att-a">0</td>
                      <td className="att-summary att-l">0</td>
                      <td className="att-summary att-e">0</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="attendance-grid-wrapper"
              ref={gridRef}
              tabIndex={0}
              onKeyDown={handleGridKeyDown}
              aria-label="Attendance grid"
            >
              <table
                className="attendance-grid-table"
                role="grid"
                aria-label="Attendance grid"
              >
                <colgroup>
                  <col className="att-col-no" />
                  <col className="att-col-name" />
                  {activeSessions.map((s) => (
                    <col key={s.id} className="att-col-session" />
                  ))}
                  {truncatedSessions && <col className="att-col-ellipsis" />}
                  <col className="att-col-sum" />
                  <col className="att-col-sum" />
                  <col className="att-col-sum" />
                  <col className="att-col-sum" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="att-no att-header">NO</th>
                    <th className="att-name att-header">{getText('addRecord.studentName')}</th>
                    {activeSessions.map((session, colIdx) => {
                      const subj =
                        session.subjectId != null ? subjectsById.get(session.subjectId) : undefined
                      const parts: string[] = []
                      if (session.period != null) parts.push(`P${session.period}`)
                      if (subj) parts.push(subj.name.slice(0, 6))
                      const isActiveCol = activeCell?.col === colIdx
                      return (
                        <th
                          key={session.id}
                          className={`att-session att-header att-session-clickable ${
                            isActiveCol ? 'is-active-col' : ''
                          }`}
                          onClick={() => setSessionDialog({ mode: 'edit', session })}
                          title={session.date}
                        >
                          <div className="att-session-date">{formatSessionDate(session.date)}</div>
                          {parts.length > 0 && (
                            <div className="att-session-detail">{parts.join(' ')}</div>
                          )}
                        </th>
                      )
                    })}
                    {truncatedSessions && (
                      <th className="att-ellipsis att-header" title="Additional sessions hidden">
                        …
                      </th>
                    )}
                    <th className="att-summary att-p att-header">{getText('attendance.present')}</th>
                    <th className="att-summary att-a att-header">{getText('attendance.absent')}</th>
                    <th className="att-summary att-l att-header">{getText('attendance.late')}</th>
                    <th className="att-summary att-e att-header">{getText('attendance.excused')}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudents.map((student, rowIdx) => {
                    const studentId = student.id as number
                    const sum = summary[studentId] ?? { P: 0, A: 0, L: 0, E: 0 }
                    return (
                      <tr key={studentId}>
                        <td className="att-no">{rowIdx + 1}</td>
                        <td className="att-name">
                      <input
                        className="inline-grid-input"
                        value={student.fullName}
                        onChange={(e) => {
                          const newName = e.target.value
                          setStudents((prev) =>
                            prev.map((s) => (s.id === student.id ? { ...s, fullName: newName } : s))
                          )
                        }}
                        onBlur={async (e) => {
                          if (student.id) {
                            await studentRepo.updateStudent({ ...student, fullName: e.target.value })
                          }
                        }}
                      />
                    </td>
                        {activeSessions.map((session, colIdx) => {
                          const status = records[`${session.id}:${studentId}`]
                          const isActiveCol = activeCell?.col === colIdx
                          const isActiveCell =
                            activeCell?.row === rowIdx && activeCell?.col === colIdx
                          return (
                            <td
                              key={session.id}
                              className={`att-session-cell status-${status ?? 'none'} ${
                                isActiveCol ? 'is-active-col' : ''
                              } ${isActiveCell ? 'is-active-cell' : ''}`}
                              data-cell={`${rowIdx}-${colIdx}`}
                              onClick={() => {
                                gridRef.current?.focus()
                                setActiveCell({ row: rowIdx, col: colIdx })
                                void cycleCell(session.id, studentId)
                              }}
                              role="gridcell"
                              aria-label={`${student.fullName} ${session.date}: ${
                                status ?? 'not taken'
                              }`}
                            >
                              {status ?? '–'}
                            </td>
                          )
                        })}
                        {truncatedSessions && <td className="att-ellipsis">…</td>}
                        <td className="att-summary att-p">{sum.P}</td>
                        <td className="att-summary att-a">{sum.A}</td>
                        <td className="att-summary att-l">{sum.L}</td>
                        <td className="att-summary att-e">{sum.E}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <SheetTabs
        tabs={sheetTabs.length ? sheetTabs : [{ id: 0, label: '+', active: true }]}
        onSelect={handleTabSelect}
        onAdd={() => setCreateClassOpen(true)}
      />

      {sessionDialog && (
        <SessionDialog
          mode={sessionDialog.mode}
          session={sessionDialog.mode === 'edit' ? sessionDialog.session : undefined}
          subjects={subjects}
          t={getText}
          onSave={saveSession}
          onDelete={sessionDialog.mode === 'edit' ? deleteSession : undefined}
          onCancel={() => setSessionDialog(null)}
        />
      )}

      {createClassDialogNode}
    </section>
  )
}
