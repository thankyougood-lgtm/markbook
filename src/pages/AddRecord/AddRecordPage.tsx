
import { useEffect, useMemo, useRef, useState } from 'react'
import { SheetTabs } from '../../components/Sheets/SheetTabs'
import type { MarkBookClass, Semester, StudentRow, SubjectRow } from '../../db/db'
import * as classRepo from '../../db/repositories/classRepo'
import * as scoreRepo from '../../db/repositories/scoreRepo'
import * as studentRepo from '../../db/repositories/studentRepo'
import * as subjectRepo from '../../db/repositories/subjectRepo'
import * as studentSemesterRepo from '../../db/repositories/studentSemesterRepo'
import { exportData } from '../../export'
import { buildRoster } from '../../export/roster/buildRoster'
import { writeRosterXlsx } from '../../export/roster/writeRosterXlsx'
import { writeRosterCsv } from '../../export/roster/writeRosterCsv'
import { formatAcademicYear } from '../../export/roster/academicYear'
import { RosterSetupDialog } from './RosterSetupDialog'
import * as attendanceRepo from '../../db/repositories/attendanceRepo'
import type { ExportColumn, ExportPayload, ExportStudentRow } from '../../export/types'

import en from '../../i18n/en.json'
import am from '../../i18n/am.json'
import om from '../../i18n/om.json'

const dictionaries = { en: en as Record<string, string>, am: am as Record<string, string>, om: om as Record<string, string> }
type Locale = keyof typeof dictionaries
type SaveState = 'saved' | 'saving' | 'retry'
type CellValue = number | string | null
type ProductSheetTab = { id: number; label: string; active: boolean }

function getLocale(): Locale {
  const saved = localStorage.getItem('markbook-language')
  return saved === 'am' || saved === 'om' ? saved : 'en'
}
function getText(key: string) {
  return dictionaries[getLocale()][key] ?? key
}

export function AddRecordPage() {
  const [classes, setClasses] = useState<MarkBookClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<number | null>(() => {
    const saved = localStorage.getItem('markbook-selected-sheet')
    if (!saved) return null
    const classId = Number(saved.split('-')[0])
    return Number.isFinite(classId) && classId > 0 ? classId : null
  })
  const [semester, setSemester] = useState<Semester>(() => {
    const saved = localStorage.getItem('markbook-selected-sheet')
    if (!saved) return 1
    return Number(saved.split('-')[1]) === 2 ? 2 : 1
  })
  const [students, setStudents] = useState<StudentRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [scores, setScores] = useState<Record<number, Record<number, CellValue>>>({})
  const [remarks, setRemarks] = useState<Record<number, string | null>>({})
  const [saveState, setSaveState] = useState<SaveState>('saved')
  
  const [createClassOpen, setCreateClassOpen] = useState(false)
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)
  const [rosterDialogOpen, setRosterDialogOpen] = useState(false)
  
  const [columnForm, setColumnForm] = useState({
    name: '',
    maxScore: 100,
  })
  const [createClassForm, setCreateClassForm] = useState({
    schoolName: '',
    grade: '',
    section: 'A',
    semester: 1 as Semester,
    academicYear: getText('addRecord.defaultYear'),
  })
    const [columnWidths] = useState<Record<string, number>>({
    no: 48, name: 140, sex: 64, age: 64, sem: 80, total: 88,
  })

  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    // Request persistent storage once on mount
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {})
    }
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  const activeClass = classes.find((item) => item.id === selectedClassId) ?? null

  const sheetTabs = useMemo<ProductSheetTab[]>(() => {
    const tabs: ProductSheetTab[] = []
    for (const item of classes) {
      const semesters = Array.isArray(item.openSemesters) ? item.openSemesters : [1]
      for (const sem of semesters) {
        const label = Number(sem) === 1 ? getText('semester.short.i') : getText('semester.short.ii')
        tabs.push({
          id: (item.id ?? 0) * 10 + Number(sem),
          label: `${item.name} · ${label}`,
          active: item.id === selectedClassId && semester === Number(sem),
        })
      }
    }
    return tabs
  }, [classes, selectedClassId, semester])

  const loadClasses = async () => {
    const items = await classRepo.listClasses()
    setClasses(items)
    if (!items.length) {
      setSelectedClassId(null); setStudents([]); setSubjects([]); setScores({}); setRemarks({})
      return
    }
    const savedExists = selectedClassId != null && items.some((item) => item.id === selectedClassId)
    const nextSelected = savedExists ? selectedClassId : (items[0]?.id ?? null)
    setSelectedClassId(nextSelected)
    const nextClass = items.find((item) => item.id === nextSelected) ?? items[0]
    if (nextClass && nextClass.openSemesters.length) {
      const allowed = nextClass.openSemesters.map((n) => Number(n))
      if (!allowed.includes(semester)) setSemester((allowed[0] as Semester) || 1)
    }
  }

  useEffect(() => { void loadClasses() }, [])

  useEffect(() => {
    if (selectedClassId != null) localStorage.setItem('markbook-selected-sheet', selectedClassId + '-' + semester)
  }, [selectedClassId, semester])

  // Load data ONCE per class/semester switch
  useEffect(() => {
    if (!activeClass?.id) {
      setStudents([]); setSubjects([]); setScores({}); setRemarks({})
      return
    }
    let isCurrent = true
    const classId = activeClass.id

    void (async () => {
      const [nextStudents, nextSubjects, nextScores, nextRemarks] = await Promise.all([
        studentRepo.listStudents(classId),
        subjectRepo.listSubjects(classId),
        scoreRepo.listScoresForSemester(classId, semester),
        studentSemesterRepo.listRemarksForSemester(classId, semester),
      ])
      if (!isCurrent) return // Prevent race condition overwrite
      
      setStudents(nextStudents)
      setSubjects(nextSubjects)
      setScores(nextScores)
      setRemarks(nextRemarks)
    })()

    return () => { isCurrent = false }
  }, [activeClass?.id, semester])

  // ── Save Handlers (Directly await DB write) ──────────────────────────
  const updateStudentField = async (studentId: number, field: 'fullName' | 'sex' | 'age', value: string) => {
    const student = students.find((s) => s.id === studentId)
    if (!student) return

    const next: StudentRow = {
      ...student,
      fullName: field === 'fullName' ? value : student.fullName,
      sex: field === 'sex' ? (value === 'M' || value === 'F' ? value : null) : student.sex ?? null,
      age: field === 'age' ? (value === '' ? null : Number(value)) : student.age ?? null,
    }
    
    setStudents((cur) => cur.map((s) => (s.id === studentId ? next : s)))
    
    setSaveState('saving')
    try {
      await studentRepo.updateStudent(next)
      if (isMountedRef.current) setSaveState('saved')
    } catch (err) {
      console.error('Save failed', err)
      if (isMountedRef.current) setSaveState('retry')
    }
  }

  const updateScoreValue = async (studentId: number, subjectId: number, rawValue: string) => {
    const subject = subjects.find((s) => s.id === subjectId)
    const isBlank = rawValue.trim() === ''
    let next: CellValue
    if (subject && (subject.kind ?? 'score') === 'score') {
      if (isBlank) next = null
      else {
        const n = Number(rawValue)
        if (Number.isNaN(n) || n < 0 || n > subject.maxScore) return
        next = n
      }
    } else {
      next = isBlank ? null : rawValue
    }

    setScores((cur) => {
      const curRow = cur[studentId] ?? {}
      return { ...cur, [studentId]: { ...curRow, [subjectId]: next } }
    })

    setSaveState('saving')
    try {
      await scoreRepo.setScore({ studentId, semester, subjectId, value: next })
      if (isMountedRef.current) setSaveState('saved')
    } catch (err) {
      console.error('Save failed', err)
      if (isMountedRef.current) setSaveState('retry')
    }
  }

  const updateRemarkValue = async (studentId: number, value: string) => {
    const nextValue = value.trim() === '' ? null : value
    setRemarks((cur) => ({ ...cur, [studentId]: nextValue }))

    setSaveState('saving')
    try {
      await studentSemesterRepo.setRemark({ studentId, semester, remark: nextValue })
      if (isMountedRef.current) setSaveState('saved')
    } catch (err) {
      console.error('Save failed', err)
      if (isMountedRef.current) setSaveState('retry')
    }
  }

  const addStudent = async () => {
    if (!activeClass?.id) return
    const nextOrder = students.length
    const next = await studentRepo.createStudent({
      classId: activeClass.id,
      serialNo: nextOrder + 1,
      fullName: `Student ${nextOrder + 1}`,
      order: nextOrder,
    })
    setStudents((cur) => [...cur, next])
  }

  

 

  const saveColumn = async () => {
    if (!activeClass?.id || !columnForm.name.trim()) return
    try {
      const created = await subjectRepo.createSubject({
        classId: activeClass.id,
        name: columnForm.name.trim(),
        maxScore: columnForm.maxScore > 0 ? columnForm.maxScore : 100,
        kind: 'score',
        options: []
      })
      if (created) setSubjects((cur) => [...cur, created])
      setColumnDialogOpen(false)
    } catch { window.alert(getText('addRecord.classExists')) }
  }

  const createClass = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const section = (createClassForm.section.trim() || 'A').toUpperCase()
    const year = createClassForm.academicYear.trim() || getText('addRecord.defaultYear')
    const gradeStr = createClassForm.grade.trim()
    const numericGrade = Number(gradeStr)
    const isNumeric = !Number.isNaN(numericGrade) && numericGrade >= 1 && numericGrade <= 12
    const name = isNumeric ? `Grade ${numericGrade} ${section}` : (gradeStr || 'Class') + ' ' + section
    try {
      const created = await classRepo.createClass({
        name,
        grade: isNumeric ? numericGrade : 0,
        section,
        academicYear: year,
        schoolName: createClassForm.schoolName.trim(),
        semester: createClassForm.semester,
        allowDuplicate: true,
      })
      await classRepo.openSheet(created.id ?? 0, createClassForm.semester)
      setClasses((cur) => {
        const idx = cur.findIndex((c) => c.id === created.id)
        return idx >= 0 ? cur.map((c) => (c.id === created.id ? created : c)) : [...cur, created]
      })
      setSelectedClassId(created.id ?? null)
      setSemester(createClassForm.semester)
      setCreateClassOpen(false)
      setCreateClassForm({ schoolName: '', grade: '', section: 'A', semester: 1, academicYear: getText('addRecord.defaultYear') })
    } catch { window.alert(getText('addRecord.classExists')) }
  }

  const handleTabClick = (tabId: number) => {
    const nextClassId = Math.floor(tabId / 10)
    const nextSem = (tabId % 10) as Semester
    if (!Number.isFinite(nextClassId) || (nextSem !== 1 && nextSem !== 2)) return
    setSelectedClassId(nextClassId)
    setSemester(nextSem)
  }

  // ── Exports (Kept from previous stable version) ──────────────────────
  const defaultColumnWidths = useMemo(() => {
    const widths: Record<string, number> = { no: 48, name: 140, sex: 64, age: 64, sem: 80, total: 88 }
    for (const s of subjects) widths[`subject-${s.id}`] = 88
    return widths
  }, [subjects])

  const getColumnWidth = (key: string) => columnWidths[key] ?? defaultColumnWidths[key] ?? 88

  const exportCurrentSheet = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!activeClass?.id) return
    if (abortControllerRef.current) abortControllerRef.current.abort()
    const ac = new AbortController()
    abortControllerRef.current = ac
    window.dispatchEvent(new CustomEvent('markbook:export-status', { detail: { exporting: true } }))
    try {
      const activeSubjects = subjects.filter((s) => !s.archivedAt)
      const activeStudents = students.filter((s) => !s.archivedAt)
      const columns: ExportColumn[] = [
        { id: 'no', label: 'NO', widthPx: getColumnWidth('no'), kind: 'no' },
        { id: 'name', label: 'Students name', widthPx: getColumnWidth('name'), kind: 'name' },
        { id: 'sex', label: 'Sex', widthPx: getColumnWidth('sex'), kind: 'sex' },
        { id: 'age', label: 'Age', widthPx: getColumnWidth('age'), kind: 'age' },
        ...activeSubjects.map((s) => ({
          id: String(s.id),
          label: s.kind === 'score' || !s.kind ? `${s.name} /${s.maxScore}` : s.name,
          widthPx: getColumnWidth(`subject-${s.id}`),
          kind: (s.kind === 'score' || !s.kind ? 'score' : 'extra') as 'score' | 'extra',
          maxScore: s.maxScore,
        })),
        { id: 'total', label: 'Total', widthPx: getColumnWidth('total'), kind: 'total' },
      ]
      const rows: ExportStudentRow[] = activeStudents.map((student, idx) => {
        const sid = student.id ?? idx + 1
        const row = scores[sid] ?? {}
        const colScores: Record<string, number | string | null> = {}
        const { sum, hasScore } = activeSubjects.reduce(
          (acc, sub) => {
            const subId = sub.id ?? -1
            const val = row[subId]
            colScores[String(subId)] = val !== undefined && val !== null ? val : null
            if (typeof val === 'number' && (sub.kind ?? 'score') === 'score') return { sum: acc.sum + val, hasScore: true }
            return acc
          },
          { sum: 0, hasScore: false },
        )
        return { studentId: sid, serialNo: idx + 1, name: student.fullName, sex: student.sex ?? '', age: student.age != null ? student.age : '', scores: colScores, total: hasScore ? sum : null, remark: '' }
      })
      const payload: ExportPayload = { schoolName: activeClass.schoolName, className: activeClass.name, semester: (semester === 2 ? 2 : 1) as 1 | 2, academicYear: activeClass.academicYear, columns, rows }
      await exportData(format, payload, ac.signal)
    } catch (err) {
      if (ac.signal.aborted) return
      console.error('Export failed', err)
    } finally {
      if (isMountedRef.current) window.dispatchEvent(new CustomEvent('markbook:export-status', { detail: { exporting: false } }))
    }
  }

  const executeRosterExport = async (format: 'xlsx' | 'csv', sem1ClassId: number | null, sem2ClassId: number | null) => {
    if (!activeClass?.id) return
    setRosterDialogOpen(false)
    window.dispatchEvent(new CustomEvent('markbook:export-status', { detail: { exporting: true } }))
    try {
      const allStudents = students.filter(s => !s.archivedAt && s.id != null)
      const studentIds = allStudents.map(s => s.id!)
      const sem1MarksRaw = sem1ClassId ? await scoreRepo.listScoresForSemester(activeClass.id, 1) : {}
      const sem2MarksRaw = sem2ClassId ? await scoreRepo.listScoresForSemester(activeClass.id, 2) : {}
      const allSessions = await attendanceRepo.listAttendanceSessions(activeClass.id)
      const sessionIds = allSessions.map(s => s.id)
      const allRecords = await attendanceRepo.listAttendanceRecords(sessionIds)
      
      const absentsMap: Record<number, number> = {}
      for (const rec of allRecords) {
        if (rec.status === 'A') absentsMap[rec.studentId] = (absentsMap[rec.studentId] || 0) + 1
      }
      const remarks1 = await studentSemesterRepo.listRemarksForSemester(activeClass.id, 1)
      const remarks2 = await studentSemesterRepo.listRemarksForSemester(activeClass.id, 2)
      const combinedRemarks: Record<number, string> = {}
      for (const sid of studentIds) {
        const r = remarks2[sid] || remarks1[sid]
        if (r) combinedRemarks[sid] = r
      }

      const flattenMarks = (map: Record<number, Record<number, CellValue>>): any[] => {
        const out: any[] = []
        for (const studentId in map) {
          for (const subId in map[studentId]) {
            const subject = subjects.find(s => s.id === Number(subId))
            if (subject) out.push({ studentId: Number(studentId), subjectLabel: subject.name, value: map[studentId][subId] })
          }
        }
        return out
      }

      const rosterSubjects = subjects.filter(s => (s.kind ?? 'score') === 'score').map(s => ({ id: s.id!, label: s.name }))
      const model = buildRoster({
        students: allStudents.map(s => ({ id: s.id!, fullName: s.fullName, sex: s.sex ?? null, age: s.age ?? null })),
        subjects: rosterSubjects,
        sem1Marks: flattenMarks(sem1MarksRaw),
        sem2Marks: flattenMarks(sem2MarksRaw),
        attendanceAbsents: absentsMap,
        conduct: {}, 
        remarks: combinedRemarks
      })

      const dateStr = new Date().toISOString().split('T')[0]
      const cleanClassName = activeClass.name.replace(/[^a-z0-9]/gi, '')
      const filename = `${cleanClassName}_Roster_${dateStr}.${format}`

      if (format === 'xlsx') {
        const buffer = await writeRosterXlsx({ model, schoolName: activeClass.schoolName ?? '', className: activeClass.name, academicYear: formatAcademicYear(activeClass.academicYear) })
        const blob = new Blob([buffer.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
      } else {
        const csv = writeRosterCsv({ model, className: activeClass.name })
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Roster failed', err); alert('Roster export failed.')
    } finally {
      window.dispatchEvent(new CustomEvent('markbook:export-status', { detail: { exporting: false } }))
    }
  }

  useEffect(() => {
    const onExport = (e: Event) => { const ce = e as CustomEvent<{ format?: 'csv' | 'xlsx' | 'pdf' }>; if (ce.detail?.format) void exportCurrentSheet(ce.detail.format) }
    const onRoster = () => setRosterDialogOpen(true)
    window.addEventListener('markbook:export', onExport)
    window.addEventListener('markbook:roster-export', onRoster)
    return () => {
      window.removeEventListener('markbook:export', onExport)
      window.removeEventListener('markbook:roster-export', onRoster)
    }
  }, [activeClass, students, subjects, scores, semester])

  const totalForStudent = (studentId: number) =>
    subjects.filter((s) => (s.kind ?? 'score') === 'score').reduce((sum, s) => {
      const v = scores[studentId]?.[s.id ?? -1]
      return typeof v === 'number' ? sum + v : sum
    }, 0)

  const visibleColumns = [
    { key: 'no', label: getText('addRecord.no') },
    { key: 'name', label: getText('addRecord.studentName'), className: 'student-name-col' },
    { key: 'sex', label: getText('addRecord.sex') },
    { key: 'age', label: getText('addRecord.age') },
    { key: 'sem', label: getText('addRecord.sheetLabel') },
    ...subjects.map((s) => ({
      key: `subject-${s.id}`,
      label: s.kind === 'score' || !s.kind ? `${s.name} /${s.maxScore}` : s.name,
      subjectId: s.id ?? -1,
      isScore: (s.kind ?? 'score') === 'score',
    })),
    { key: 'total', label: getText('addRecord.total') },
  ]

  function renderCreateClassDialog() {
    return (
      <div className="class-dialog-backdrop" onClick={() => setCreateClassOpen(false)} role="presentation">
        <form className="class-dialog" onClick={(e) => e.stopPropagation()} onSubmit={createClass}>
          <h3>{getText('addRecord.classDialogTitle')}</h3>
          <label><span>{getText('addRecord.school')}</span><input value={createClassForm.schoolName} onChange={(e) => setCreateClassForm((c) => ({ ...c, schoolName: e.target.value }))} /></label>
          <div className="dialog-two-col">
            <label><span>{getText('addRecord.grade')}</span><input value={createClassForm.grade} onChange={(e) => setCreateClassForm((c) => ({ ...c, grade: e.target.value }))} /></label>
            <label><span>{getText('addRecord.section')}</span><input value={createClassForm.section} maxLength={3} onChange={(e) => setCreateClassForm((c) => ({ ...c, section: e.target.value.toUpperCase() }))} /></label>
          </div>
          <div className="dialog-two-col">
            <label><span>{getText('addRecord.semester')}</span><div className="toggle-group"><button type="button" className={`toggle-btn ${createClassForm.semester === 1 ? 'is-active' : ''}`} onClick={() => setCreateClassForm((c) => ({ ...c, semester: 1 }))}>I</button><button type="button" className={`toggle-btn ${createClassForm.semester === 2 ? 'is-active' : ''}`} onClick={() => setCreateClassForm((c) => ({ ...c, semester: 2 }))}>II</button></div></label>
            <label><span>{getText('addRecord.year')}</span><input value={createClassForm.academicYear} onChange={(e) => setCreateClassForm((c) => ({ ...c, academicYear: e.target.value }))} /></label>
          </div>
          <div className="dialog-actions">
            <button type="button" className="toolbar-button" onClick={() => setCreateClassOpen(false)}>{getText('common.cancel')}</button>
            <button type="submit" className="toolbar-button primary-button">{getText('common.save')}</button>
          </div>
        </form>
      </div>
    )
  }

  if (!classes.length) {
    return (
      <section className="add-record-page">
        <div className="add-record-header"><div className="record-meta-block"><div className="record-class-name">{getText('page.addRecord')}</div></div><div className="save-indicator">{saveState === 'saved' ? getText('addRecord.saved') : getText('addRecord.saving')}</div></div>
        <div className="record-toolbar"><button type="button" className="toolbar-button primary-button" onClick={() => setCreateClassOpen(true)}>{getText('addRecord.classDialogTitle')}</button></div>
        <div className="spreadsheet-shell"><div className="grid-row" style={{ padding: '24px', color: 'var(--muted)' }}>{getText('addRecord.empty')}</div></div>
        <SheetTabs tabs={sheetTabs.length ? sheetTabs : [{ id: 0, label: '+', active: true }]} onSelect={handleTabClick} onAdd={() => setCreateClassOpen(true)} />
        {createClassOpen && renderCreateClassDialog()}
      </section>
    )
  }

  return (
    <section className="add-record-page">
      <div className="add-record-header">
        <div className="record-meta-block">
          <div className="record-class-name">{activeClass?.name ?? getText('page.addRecord')}</div>
          <div className="record-school-name">{activeClass?.schoolName ?? ''}</div>
          <div className="record-semester">{activeClass?.academicYear ?? getText('addRecord.defaultYear')} · {semester === 1 ? getText('semester.short.i') : getText('semester.short.ii')}</div>
        </div>
        <button type="button" className={`merged-save-btn ${saveState}`} onClick={() => {}}>
          {saveState === 'saving' ? <span>{getText('addRecord.saving')}</span> : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg><span>{getText('addRecord.saved')}</span></>}
        </button>
      </div>

      <div className="record-toolbar">
        <button type="button" className="toolbar-button primary-button icon-button" onClick={addStudent}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg><span>{getText('addRecord.addStudent')}</span></button>
        <button type="button" className="toolbar-button icon-button" onClick={() => setColumnDialogOpen(true)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /><line x1="10" y1="7" x2="16" y2="7" /><line x1="10" y1="11" x2="16" y2="11" /></svg><span>{getText('addRecord.addAssess')}</span></button>
      </div>

      <div className="spreadsheet-shell" role="grid" aria-label="Gradebook grid">
        <table className="spreadsheet-table" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
          <colgroup>{visibleColumns.map((c) => (<col key={c.key} style={{ width: getColumnWidth(c.key) }} />))}</colgroup>
          <thead>
            <tr>
              {visibleColumns.map((c) => {
                const isSubject = 'subjectId' in c
                const className = `${'className' in c && c.className ? c.className : ''} ${isSubject ? 'subject-col' : ''}`.trim()
                return (
                  <th key={c.key} className={`grid-cell header-cell ${className}`}>
                    <div className="column-header-wrap">
                      {isSubject ? <div className="header-button" onPointerDown={() => {}} style={{ cursor: 'pointer' }} title="Long-press to delete">{c.label}</div> : <span>{c.label}</span>}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <tr key={student.id} onPointerDown={() => {}}>
                <td className="grid-cell row-index">{idx + 1}</td>
                <td className="grid-cell student-name student-name-col">
                  <input className="inline-grid-input" value={student.fullName} onChange={(e) => setStudents(cur => cur.map(s => s.id === student.id ? { ...s, fullName: e.target.value } : s))} onBlur={(e) => updateStudentField(student.id ?? 0, 'fullName', e.target.value)} />
                </td>
                <td className="grid-cell is-sex-cell" style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center', fontWeight: 600 }}>
                  <div onClick={() => { const current = student.sex ?? ''; const next = current === '' ? 'M' : current === 'M' ? 'F' : ''; updateStudentField(student.id ?? 0, 'sex', next); }} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{student.sex ?? '–'}</div>
                </td>
                <td className="grid-cell">
                  <input className="inline-grid-input" type="number" min={5} max={30} value={student.age ?? ''} onChange={(e) => setStudents(cur => cur.map(s => s.id === student.id ? { ...s, age: Number(e.target.value) || null } : s))} onBlur={(e) => updateStudentField(student.id ?? 0, 'age', e.target.value)} />
                </td>
                <td className="grid-cell">
                  <input className="inline-grid-input" value={remarks[student.id ?? -1] ?? ''} onChange={(e) => setRemarks(cur => ({ ...cur, [student.id!]: e.target.value }))} onBlur={(e) => updateRemarkValue(student.id ?? 0, e.target.value)} />
                </td>
                {subjects.map((subject) => {
                  const value = scores[student.id ?? -1]?.[subject.id ?? -1]
                  return (
                    <td key={`${student.id}-${subject.id}`} className="grid-cell">
                      <input className="inline-grid-input score-cell" inputMode="decimal" value={value ?? ''} onChange={(e) => setScores(cur => { const row = cur[student.id!] || {}; return { ...cur, [student.id!]: { ...row, [subject.id!]: e.target.value === '' ? null : Number(e.target.value) } } })} onBlur={(e) => updateScoreValue(student.id ?? 0, subject.id ?? 0, e.target.value)} />
                    </td>
                  )
                })}
                <td className="grid-cell total-cell">{totalForStudent(student.id ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SheetTabs tabs={sheetTabs} onSelect={handleTabClick} onAdd={() => setCreateClassOpen(true)} />

      {createClassOpen && renderCreateClassDialog()}

      {columnDialogOpen && (
        <div className="class-dialog-backdrop" onClick={() => setColumnDialogOpen(false)} role="presentation">
          <form className="class-dialog" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void saveColumn() }}>
            <h3>{getText('addRecord.addAssess')}</h3>
            <label><span>{getText('addRecord.subjectPrompt')}</span><input value={columnForm.name} onChange={(e) => setColumnForm((c) => ({ ...c, name: e.target.value }))} autoFocus /></label>
            <label><span>{getText('addRecord.maxScore')}</span><input type="number" min={1} value={columnForm.maxScore} onChange={(e) => setColumnForm((c) => ({ ...c, maxScore: Number(e.target.value) || 100 }))} /></label>
            <div className="dialog-actions">
              <button type="button" className="toolbar-button" onClick={() => setColumnDialogOpen(false)}>{getText('common.cancel')}</button>
              <button type="submit" className="toolbar-button primary-button">{getText('common.save')}</button>
            </div>
          </form>
        </div>
      )}

      {rosterDialogOpen && (
        <RosterSetupDialog
          sheetOptions={classes.flatMap(c => c.openSemesters.map(s => ({ id: c.id!, name: c.name, semester: s as Semester })))}
          t={getText}
          onExport={executeRosterExport}
          onCancel={() => setRosterDialogOpen(false)}
        />
      )}
    </section>
  )
}
