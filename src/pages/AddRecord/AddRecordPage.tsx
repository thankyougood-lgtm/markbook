import { useEffect, useMemo, useRef, useState } from 'react'
import { SheetTabs } from '../../components/Sheets/SheetTabs'
import type { MarkBookClass, Semester, StudentRow, SubjectRow } from '../../db/db'
import * as classRepo from '../../db/repositories/classRepo'
import * as scoreRepo from '../../db/repositories/scoreRepo'
import * as studentRepo from '../../db/repositories/studentRepo'
import * as subjectRepo from '../../db/repositories/subjectRepo'
import * as studentSemesterRepo from '../../db/repositories/studentSemesterRepo'
import en from '../../i18n/en.json'
import am from '../../i18n/am.json'
import om from '../../i18n/om.json'

const dictionaries = { en: en as Record<string, string>, am: am as Record<string, string>, om: om as Record<string, string> }
type Locale = keyof typeof dictionaries
type SaveState = 'saved' | 'saving' | 'retry'
type CellValue = number | string | null

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
  
  const [columnForm, setColumnForm] = useState({ name: '', maxScore: 100 })
  const [createClassForm, setCreateClassForm] = useState({
    schoolName: '', grade: '', section: 'A', semester: 1 as Semester, academicYear: getText('addRecord.defaultYear'),
  })
  
  const [columnWidths] = useState<Record<string, number>>({
    no: 48, name: 140, sex: 64, age: 64, sem: 80, total: 88,
  })

  const saveTimerRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  const activeClass = classes.find((item) => item.id === selectedClassId) ?? null

  const sheetTabs = useMemo(() => {
    const tabs = []
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

  // Load Data: Simple, no "isCurrent" guard, depends on selectedClassId
  useEffect(() => {
    if (selectedClassId == null) {
      setStudents([]); setSubjects([]); setScores({}); setRemarks({})
      return
    }
    const classId = selectedClassId
    void (async () => {
      const [nStudents, nSubjects, nScores, nRemarks] = await Promise.all([
        studentRepo.listStudents(classId),
        subjectRepo.listSubjects(classId),
        scoreRepo.listScoresForSemester(classId, semester),
        studentSemesterRepo.listRemarksForSemester(classId, semester),
      ])
      setStudents(nStudents)
      setSubjects(nSubjects)
      setScores(nScores)
      setRemarks(nRemarks)
    })()
  }, [selectedClassId, semester])

  // Save logic: Debounce + Manual
  const performSave = async () => {
    if (!activeClass?.id) return
    setSaveState('saving')
    try {
      for (const s of students) if (s.id) await studentRepo.updateStudent(s)
      
      for (const [sidStr, subScores] of Object.entries(scores)) {
        for (const [subIdStr, val] of Object.entries(subScores)) {
          await scoreRepo.setScore({ studentId: Number(sidStr), semester, subjectId: Number(subIdStr), value: val })
        }
      }

      for (const [sidStr, remark] of Object.entries(remarks)) {
        await studentSemesterRepo.setRemark({ studentId: Number(sidStr), semester, remark })
      }
      
      if (isMountedRef.current) setSaveState('saved')
    } catch (err) {
      console.error('Save failed', err)
      if (isMountedRef.current) setSaveState('retry')
    }
  }

  const scheduleSave = () => {
    setSaveState('saving')
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => { void performSave() }, 500)
  }

  const updateStudentField = (studentId: number, field: keyof StudentRow, value: any) => {
    setStudents((cur) => cur.map((s) => (s.id === studentId ? { ...s, [field]: value } : s)))
    scheduleSave()
  }

  const updateScoreValue = (studentId: number, subjectId: number, rawValue: string) => {
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
    } else next = isBlank ? null : rawValue
    
    setScores((cur) => {
      const curRow = cur[studentId] ?? {}
      return { ...cur, [studentId]: { ...curRow, [subjectId]: next } }
    })
    scheduleSave()
  }

  const updateRemarkValue = (studentId: number, value: string) => {
    setRemarks((cur) => ({ ...cur, [studentId]: value.trim() === '' ? null : value }))
    scheduleSave()
  }

  const addStudent = async () => {
    if (!activeClass?.id) return
    const nextOrder = students.length
    const next = await studentRepo.createStudent({ classId: activeClass.id, serialNo: nextOrder + 1, fullName: `Student ${nextOrder + 1}`, order: nextOrder })
    setStudents((cur) => [...cur, next])
  }

  const saveColumn = async () => {
    if (!activeClass?.id || !columnForm.name.trim()) return
    try {
      const created = await subjectRepo.createSubject({ classId: activeClass.id, name: columnForm.name.trim(), maxScore: columnForm.maxScore, kind: 'score' })
      if (created) setSubjects((cur) => [...cur, created])
      setColumnDialogOpen(false)
    } catch { window.alert(getText('addRecord.classExists')) }
  }

  const createClass = async (e: React.FormEvent) => {
    e.preventDefault()
    const section = (createClassForm.section.trim() || 'A').toUpperCase()
    const year = createClassForm.academicYear.trim() || getText('addRecord.defaultYear')
    const gradeStr = createClassForm.grade.trim()
    const numericGrade = Number(gradeStr)
    const name = !Number.isNaN(numericGrade) && numericGrade >= 1 && numericGrade <= 12 ? `Grade ${numericGrade} ${section}` : (gradeStr || 'Class') + ' ' + section
    try {
      const created = await classRepo.createClass({ name, grade: numericGrade || 0, section, academicYear: year, schoolName: createClassForm.schoolName.trim(), semester: createClassForm.semester, allowDuplicate: true })
      await classRepo.openSheet(created.id!, createClassForm.semester)
      setClasses((cur) => [...cur, created])
      setSelectedClassId(created.id!)
      setSemester(createClassForm.semester)
      setCreateClassOpen(false)
    } catch { window.alert(getText('addRecord.classExists')) }
  }

  const handleTabClick = (tabId: number) => {
    setSelectedClassId(Math.floor(tabId / 10))
    setSemester((tabId % 10) as Semester)
  }

  const getColumnWidth = (key: string) => columnWidths[key] ?? 88

  const visibleColumns: Array<{ key: string; label: string; className?: string; subjectId?: number }> = [
    { key: 'no', label: getText('addRecord.no') },
    { key: 'name', label: getText('addRecord.studentName'), className: 'student-name-col' },
    { key: 'sex', label: getText('addRecord.sex') },
    { key: 'age', label: getText('addRecord.age') },
    { key: 'sem', label: getText('addRecord.remark') },
    ...subjects.map((s) => ({ key: `subject-${s.id}`, label: `${s.name} /${s.maxScore}`, subjectId: s.id })),
    { key: 'total', label: getText('addRecord.total') },
  ]

  const totalForStudent = (studentId: number) => {
    let sum = 0; let hasScore = false
    for (const s of subjects) {
      if ((s.kind ?? 'score') !== 'score') continue
      const v = scores[studentId]?.[s.id!]
      if (typeof v === 'number') { sum += v; hasScore = true }
    }
    return hasScore ? sum : ''
  }

  if (!classes.length) {
    return (
      <section className="add-record-page">
        <div className="add-record-header"><div className="record-meta-block"><div className="record-class-name">{getText('page.addRecord')}</div></div><div className="save-indicator">{getText('addRecord.saved')}</div></div>
        <div className="record-toolbar"><button type="button" className="toolbar-button primary-button" onClick={() => setCreateClassOpen(true)}>{getText('addRecord.classDialogTitle')}</button></div>
        <div className="spreadsheet-shell"><div className="grid-row" style={{ padding: '24px', color: 'var(--muted)' }}>{getText('addRecord.empty')}</div></div>
        <SheetTabs tabs={sheetTabs.length ? sheetTabs : [{ id: 0, label: '+', active: true }]} onSelect={handleTabClick} onAdd={() => setCreateClassOpen(true)} />
        {createClassOpen && (
          <div className="class-dialog-backdrop" onClick={() => setCreateClassOpen(false)} role="presentation">
            <form className="class-dialog" onClick={(e) => e.stopPropagation()} onSubmit={createClass}>
              <h3>{getText('addRecord.classDialogTitle')}</h3>
              <label><span>{getText('addRecord.school')}</span><input value={createClassForm.schoolName} onChange={(e) => setCreateClassForm((c) => ({ ...c, schoolName: e.target.value }))} /></label>
              <div className="dialog-two-col">
                <label><span>{getText('addRecord.grade')}</span><input value={createClassForm.grade} onChange={(e) => setCreateClassForm((c) => ({ ...c, grade: e.target.value }))} /></label>
                <label><span>{getText('addRecord.section')}</span><input value={createClassForm.section} maxLength={3} onChange={(e) => setCreateClassForm((c) => ({ ...c, section: e.target.value.toUpperCase() }))} /></label>
              </div>
              <div className="dialog-actions">
                <button type="button" className="toolbar-button" onClick={() => setCreateClassOpen(false)}>{getText('common.cancel')}</button>
                <button type="submit" className="toolbar-button primary-button">{getText('common.save')}</button>
              </div>
            </form>
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="add-record-page">
      <div className="add-record-header">
        <div className="record-meta-block">
          <div className="record-class-name">{activeClass?.name}</div>
          <div className="record-semester">{activeClass?.academicYear} · {semester === 1 ? getText('semester.short.i') : getText('semester.short.ii')}</div>
        </div>
        <button type="button" className={`merged-save-btn ${saveState}`} onClick={() => { if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current); void performSave(); }}>
          {saveState === 'saving' ? 'Saving...' : saveState === 'retry' ? 'Retry' : '✓ Saved'}
        </button>
      </div>

      <div className="record-toolbar">
        <button type="button" className="toolbar-button primary-button icon-button" onClick={addStudent}><span>+ Student</span></button>
        <button type="button" className="toolbar-button icon-button" onClick={() => setColumnDialogOpen(true)}><span>+ Assess</span></button>
      </div>

      <div className="spreadsheet-shell">
        <table className="spreadsheet-table" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
          <colgroup>{visibleColumns.map((c) => <col key={c.key} style={{ width: getColumnWidth(c.key) }} />)}</colgroup>
          <thead><tr>{visibleColumns.map((c) => <th key={c.key} className={`grid-cell header-cell ${c.className || ''}`}><div className="column-header-wrap"><span>{c.label}</span></div></th>)}</tr></thead>
          <tbody>
            {students.map((student, idx) => (
              <tr key={student.id}>
                <td className="grid-cell row-index">{idx + 1}</td>
                <td className="grid-cell student-name-col"><input className="inline-grid-input" value={student.fullName} onChange={(e) => updateStudentField(student.id!, 'fullName', e.target.value)} /></td>
                <td className="grid-cell is-sex-cell" style={{ cursor: 'pointer', textAlign: 'center' }} onClick={() => { const cur = student.sex ?? ''; updateStudentField(student.id!, 'sex', cur === '' ? 'M' : cur === 'M' ? 'F' : '') }}>{student.sex ?? '–'}</td>
                <td className="grid-cell"><input className="inline-grid-input" type="number" value={student.age ?? ''} onChange={(e) => updateStudentField(student.id!, 'age', e.target.value === '' ? null : Number(e.target.value))} /></td>
                <td className="grid-cell"><input className="inline-grid-input" value={remarks[student.id!] ?? ''} onChange={(e) => updateRemarkValue(student.id!, e.target.value)} /></td>
                {subjects.map((sub) => (
                  <td key={`${student.id}-${sub.id}`} className="grid-cell">
                    <input className="inline-grid-input score-cell" value={scores[student.id!]?.[sub.id!] ?? ''} onChange={(e) => updateScoreValue(student.id!, sub.id!, e.target.value)} />
                  </td>
                ))}
                <td className="grid-cell total-cell">{totalForStudent(student.id!)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SheetTabs tabs={sheetTabs} onSelect={handleTabClick} onAdd={() => setCreateClassOpen(true)} />

      {columnDialogOpen && (
        <div className="class-dialog-backdrop" onClick={() => setColumnDialogOpen(false)}>
          <form className="class-dialog" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void saveColumn() }}>
            <h3>Add Subject</h3>
            <label><span>Name</span><input value={columnForm.name} onChange={(e) => setColumnForm((c) => ({ ...c, name: e.target.value }))} autoFocus /></label>
            <label><span>Max Score</span><input type="number" value={columnForm.maxScore} onChange={(e) => setColumnForm((c) => ({ ...c, maxScore: Number(e.target.value) }))} /></label>
            <div className="dialog-actions"><button type="button" className="toolbar-button" onClick={() => setColumnDialogOpen(false)}>Cancel</button><button type="submit" className="toolbar-button primary-button">Save</button></div>
          </form>
        </div>
      )}
    </section>
  )
}
