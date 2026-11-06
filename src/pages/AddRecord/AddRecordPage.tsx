import { useEffect, useMemo, useRef, useState } from 'react'
import { SheetTabs } from '../../components/Sheets/SheetTabs'
import type { MarkBookClass, Semester, StudentRow, SubjectRow } from '../../db/db'
import * as classRepo from '../../db/repositories/classRepo'
import * as scoreRepo from '../../db/repositories/scoreRepo'
import * as studentRepo from '../../db/repositories/studentRepo'
import * as studentSemesterRepo from '../../db/repositories/studentSemesterRepo'
import * as subjectRepo from '../../db/repositories/subjectRepo'
import { exportGradebook } from '../../lib/export'
import { parsePaste } from '../../lib/grid/parsePaste'
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
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const [semester, setSemester] = useState<Semester>(1)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [scores, setScores] = useState<Record<number, Record<number, CellValue>>>({})
  const [remarks, setRemarks] = useState<Record<number, string | null>>({})
  const [undoStack, setUndoStack] = useState<Array<{ students: StudentRow[]; subjects: SubjectRow[]; scores: Record<number, Record<number, CellValue>>; remarks: Record<number, string | null> }>>([])
  const [redoStack, setRedoStack] = useState<Array<{ students: StudentRow[]; subjects: SubjectRow[]; scores: Record<number, Record<number, CellValue>>; remarks: Record<number, string | null> }>>([])
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false)
  const [columnDialogOpen, setColumnDialogOpen] = useState(false)
  const [subjectEditorOpen, setSubjectEditorOpen] = useState(false)
  const [subjectEditorState, setSubjectEditorState] = useState({
    subjectId: null as number | null,
    name: '',
    maxScore: 100,
  })
  const [dialogState, setDialogState] = useState({
    schoolName: '',
    grade: 11,
    section: 'A',
    semester: 1 as Semester,
    academicYear: getText('addRecord.defaultYear'),
  })
  const [subjectDialogState, setSubjectDialogState] = useState({
    name: '',
    maxScore: 100,
  })
  const [columnDialogState, setColumnDialogState] = useState({
    name: '',
    kind: 'text' as 'text' | 'number' | 'dropdown',
    options: 'Present, Absent, Late, Excused',
  })
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    no: 48,
    name: 180,
    sex: 72,
    age: 72,
    total: 120,
    remark: 160,
  })
  const persistedStudentsRef = useRef<Record<number, StudentRow>>({})
  const persistedScoresRef = useRef<Record<number, Record<number, CellValue>>>({})
  const persistedRemarksRef = useRef<Record<number, string | null>>({})
  const saveTimerRef = useRef<number | null>(null)

  const activeClass = classes.find((item) => item.id === selectedClassId) ?? null

  const sheetTabs = useMemo<ProductSheetTab[]>(() => {
    const nextTabs: ProductSheetTab[] = []

    for (const item of classes) {
      const openSemesters = Array.isArray(item.openSemesters) ? item.openSemesters : [1]

      for (const openSemester of openSemesters) {
        const semesterLabel = Number(openSemester) === 1 ? getText('semester.short.i') : getText('semester.short.ii')
        nextTabs.push({
          id: (item.id ?? 0) * 10 + Number(openSemester),
          label: `${item.name} · ${semesterLabel}`,
          active: item.id === selectedClassId && semester === Number(openSemester),
        })
      }
    }

    return nextTabs
  }, [classes, selectedClassId, semester])

  const loadClasses = async () => {
    const items = await classRepo.listClasses()
    setClasses(items)

    if (!items.length) {
      setSelectedClassId(null)
      setStudents([])
      setSubjects([])
      return
    }

    const nextSelected = selectedClassId ?? items[0].id ?? null
    setSelectedClassId(nextSelected)

    const nextClass = items.find((item) => item.id === nextSelected) ?? items[0]
    if (nextClass && nextClass.openSemesters.length) {
      setSemester((Number(nextClass.openSemesters[0]) as Semester) || 1)
    }
  }

  useEffect(() => {
    void loadClasses()
  }, [])

  useEffect(() => {
    if (!activeClass?.id) {
      setStudents([])
      setSubjects([])
      setScores({})
      setRemarks({})
      persistedStudentsRef.current = {}
      persistedScoresRef.current = {}
      persistedRemarksRef.current = {}
      return
    }

    const classId = activeClass.id

    void (async () => {
      const [nextStudents, nextSubjects, nextScores, nextRemarks] = await Promise.all([
        studentRepo.listStudents(classId),
        subjectRepo.listSubjects(classId),
        scoreRepo.listScoresForSemester(classId, semester),
        studentSemesterRepo.listRemarksForSemester(classId, semester),
      ])

      setStudents(nextStudents)
      setSubjects(nextSubjects)
      setScores(nextScores)
      setRemarks(nextRemarks)
      persistedStudentsRef.current = Object.fromEntries(nextStudents.map((student) => [student.id ?? -1, student]))
      persistedScoresRef.current = JSON.parse(JSON.stringify(nextScores)) as Record<number, Record<number, CellValue>>
      persistedRemarksRef.current = { ...nextRemarks }
    })()
  }, [activeClass, semester])

  const flushAutoSave = async () => {
    const currentStudents = students
    const currentScores = scores
    const currentRemarks = remarks

    const studentsToPersist = currentStudents.filter((student) => {
      const previous = persistedStudentsRef.current[student.id ?? -1]
      return previous && JSON.stringify(previous) !== JSON.stringify(student)
    })

    for (const student of studentsToPersist) {
      await studentRepo.updateStudent(student)
    }

    for (const [studentKey, scoreRow] of Object.entries(currentScores)) {
      const studentId = Number(studentKey)
      const previousRow = persistedScoresRef.current[studentId] ?? {}

      for (const [subjectKey, value] of Object.entries(scoreRow)) {
        const subjectId = Number(subjectKey)
        const previousValue = previousRow[subjectId]
        if (JSON.stringify(previousValue) === JSON.stringify(value)) {
          continue
        }

        await scoreRepo.setScore({ studentId, semester, subjectId, value: value as CellValue })
      }
    }

    for (const [studentKey, remark] of Object.entries(currentRemarks)) {
      const studentId = Number(studentKey)
      const previousValue = persistedRemarksRef.current[studentId]
      if (JSON.stringify(previousValue) === JSON.stringify(remark)) {
        continue
      }

      await studentSemesterRepo.setRemark({ studentId, semester, remark: remark ?? null })
    }

    persistedStudentsRef.current = Object.fromEntries(currentStudents.map((student) => [student.id ?? -1, student]))
    persistedScoresRef.current = JSON.parse(JSON.stringify(currentScores)) as Record<number, Record<number, CellValue>>
    persistedRemarksRef.current = { ...currentRemarks }
    setSaveState('saved')
    saveTimerRef.current = null
  }

  const scheduleAutoSave = () => {
    setSaveState('saving')
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      void flushAutoSave()
    }, 300)
  }

  const saveIndicator =
    saveState === 'saved' ? getText('addRecord.saved') : saveState === 'saving' ? getText('addRecord.saving') : getText('addRecord.retry')

  const exportCurrentSheet = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!activeClass?.id) {
      return
    }

    try {
      await exportGradebook(
        format,
        {
          className: activeClass.name,
          academicYear: activeClass.academicYear,
          schoolName: activeClass.schoolName ?? '',
          semester,
          students: students.map((student) => ({
            id: student.id ?? undefined,
            fullName: student.fullName,
            sex: student.sex ?? null,
            age: student.age ?? null,
          })),
          subjects: subjects.map((subject) => ({
            id: subject.id ?? 0,
            name: subject.name,
            maxScore: subject.maxScore,
            kind: subject.kind ?? 'score',
          })),
          scores: Object.fromEntries(
            Object.entries(scores).map(([studentKey, row]) => [Number(studentKey), row as Record<number, number | string | null>]),
          ),
          remarks,
        },
        `${activeClass.name}-${activeClass.academicYear}-sem-${semester}`,
      )
    } catch (error) {
      console.error('Export failed', error)
      window.alert(getText('menu.export'))
    }
  }

  useEffect(() => {
    const handleExport = (event: Event) => {
      const customEvent = event as CustomEvent<{ format?: 'csv' | 'xlsx' | 'pdf' }>
      const format = customEvent.detail?.format
      if (!format) {
        return
      }

      void exportCurrentSheet(format)
    }

    window.addEventListener('markbook:export', handleExport)

    return () => {
      window.removeEventListener('markbook:export', handleExport)
    }
  }, [activeClass, students, subjects, scores, remarks, semester])

  const snapshotState = () => ({
    students: students.map((student) => ({ ...student })),
    subjects: subjects.map((subject) => ({ ...subject })),
    scores: JSON.parse(JSON.stringify(scores)) as Record<number, Record<number, CellValue>>,
    remarks: { ...remarks },
  })

  const applySnapshot = (next: { students: StudentRow[]; subjects: SubjectRow[]; scores: Record<number, Record<number, CellValue>>; remarks: Record<number, string | null> }) => {
    setStudents(next.students)
    setSubjects(next.subjects)
    setScores(next.scores)
    setRemarks(next.remarks)
  }

  const undoLastAction = () => {
    if (!undoStack.length) {
      return
    }

    const previous = undoStack[undoStack.length - 1]
    setRedoStack((current) => [snapshotState(), ...current].slice(0, 50))
    setUndoStack((current) => current.slice(0, -1))
    applySnapshot(previous)
  }

  const redoLastAction = () => {
    if (!redoStack.length) {
      return
    }

    const next = redoStack[0]
    setUndoStack((current) => [...current.slice(-49), snapshotState()])
    setRedoStack((current) => current.slice(1))
    applySnapshot(next)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redoLastAction()
        } else {
          undoLastAction()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoStack, redoStack, students, subjects, scores, remarks])

  const handlePasteIntoCell = async (
    event: React.ClipboardEvent<HTMLInputElement | HTMLSelectElement>,
    studentId: number,
    field: 'studentName' | 'sex' | 'age' | 'score' | 'remark',
    subjectId?: number,
  ) => {
    const clipboardText = event.clipboardData.getData('text/plain')
    if (!clipboardText) {
      return
    }

    event.preventDefault()
    const rows = parsePaste(clipboardText)
    if (!rows.length) {
      return
    }

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const targetStudentId = studentId + rowIndex
      const currentStudent = students.find((item) => item.id === targetStudentId)
      if (!currentStudent) {
        continue
      }

      for (let columnIndex = 0; columnIndex < rows[rowIndex].length; columnIndex += 1) {
        const value = rows[rowIndex][columnIndex]
        const targetSubjectId = typeof subjectId === 'number' ? subjectId + columnIndex : undefined

        if (field === 'studentName') {
          await updateStudentField(targetStudentId, 'fullName', value)
        } else if (field === 'sex') {
          await updateStudentField(targetStudentId, 'sex', value)
        } else if (field === 'age') {
          await updateStudentField(targetStudentId, 'age', value)
        } else if (field === 'remark') {
          await updateRemarkValue(targetStudentId, value)
        } else if (typeof targetSubjectId === 'number') {
          await updateScoreValue(targetStudentId, targetSubjectId, value)
        }
      }
    }
  }

  const addStudent = async () => {
    if (!activeClass?.id) {
      return
    }

    const before = snapshotState()
    const nextOrder = students.length
    const nextStudent = await studentRepo.createStudent({
      classId: activeClass.id,
      serialNo: nextOrder + 1,
      fullName: `Student ${nextOrder + 1}`,
      order: nextOrder,
    })

    setUndoStack((current) => [...current.slice(-49), before])
    setRedoStack([])
    setStudents((current) => [...current, nextStudent])
    persistedStudentsRef.current = Object.fromEntries([...students, nextStudent].map((student) => [student.id ?? -1, student]))
  }

  const addSubject = async () => {
    if (!activeClass?.id) {
      return
    }

    if (!subjectDialogState.name.trim()) {
      setSubjectDialogOpen(true)
      return
    }

    const safeMax = Number.isFinite(subjectDialogState.maxScore) && subjectDialogState.maxScore > 0 ? subjectDialogState.maxScore : 100

    try {
      const before = snapshotState()
      const nextSubject = await subjectRepo.createSubject({
        classId: activeClass.id,
        name: subjectDialogState.name,
        maxScore: safeMax,
      })
      setUndoStack((current) => [...current.slice(-49), before])
      setRedoStack([])
      setSubjects((current) => [...current, nextSubject])
      setSubjectDialogState({ name: '', maxScore: 100 })
      setSubjectDialogOpen(false)
    } catch {
      window.alert(getText('addRecord.classExists'))
    }
  }

  const addColumn = async () => {
    if (!activeClass?.id) {
      return
    }

    if (!columnDialogState.name.trim()) {
      setColumnDialogOpen(true)
      return
    }

    const kind = columnDialogState.kind
    const options = kind === 'dropdown'
      ? columnDialogState.options
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : []

    try {
      const before = snapshotState()
      const nextSubject = await subjectRepo.createSubject({
        classId: activeClass.id,
        name: columnDialogState.name,
        maxScore: 100,
        kind,
        options: options.length ? options : ['Present', 'Absent', 'Late', 'Excused'],
      })
      setUndoStack((current) => [...current.slice(-49), before])
      setRedoStack([])
      setSubjects((current) => [...current, nextSubject])
      setColumnDialogState({ name: '', kind: 'text', options: 'Present, Absent, Late, Excused' })
      setColumnDialogOpen(false)
    } catch {
      window.alert(getText('addRecord.classExists'))
    }
  }

  const openSubjectEditor = (subjectId: number) => {
    const subject = subjects.find((item) => item.id === subjectId)
    if (!subject) {
      return
    }

    setSubjectEditorState({
      subjectId,
      name: subject.name,
      maxScore: subject.maxScore,
    })
    setSubjectEditorOpen(true)
  }

  const saveSubjectEditor = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (subjectEditorState.subjectId == null) {
      return
    }

    const subject = subjects.find((item) => item.id === subjectEditorState.subjectId)
    if (!subject) {
      return
    }

    const safeMax =
      Number.isFinite(subjectEditorState.maxScore) && subjectEditorState.maxScore > 0 ? subjectEditorState.maxScore : subject.maxScore

    const nextSubject = await subjectRepo.updateSubject({
      ...subject,
      name: subjectEditorState.name.trim() || subject.name,
      maxScore: safeMax,
    })

    setSubjects((current) => current.map((item) => (item.id === nextSubject.id ? nextSubject : item)))
    setSubjectEditorOpen(false)
    setSubjectEditorState({ subjectId: null, name: '', maxScore: 100 })
  }

  const isScoreCell = (subjectId: number) => subjects.some((subject) => subject.id === subjectId && subject.kind === 'score')

  const updateScoreValue = async (studentId: number, subjectId: number, rawValue: string) => {
    const subject = subjects.find((item) => item.id === subjectId)
    const isBlank = rawValue.trim() === ''

    if (subject && subject.kind === 'score') {
      const nextNumber = isBlank ? null : Number(rawValue)
      if (Number.isNaN(nextNumber) || nextNumber === null || nextNumber < 0 || nextNumber > subject.maxScore) {
        setSaveState('retry')
        return
      }

      setScores((current) => {
        const currentStudent = current[studentId] ?? {}
        const next = {
          ...current,
          [studentId]: { ...currentStudent, [subjectId]: isBlank ? null : nextNumber },
        }
        return next
      })

      scheduleAutoSave()
      return
    }

    const before = snapshotState()
    const nextValue = isBlank ? null : rawValue

    setUndoStack((current) => [...current.slice(-49), before])
    setRedoStack([])
    setScores((current) => {
      const currentStudent = current[studentId] ?? {}
      return {
        ...current,
        [studentId]: { ...currentStudent, [subjectId]: nextValue },
      }
    })

    scheduleAutoSave()
  }

  const updateStudentField = async (studentId: number, field: 'fullName' | 'sex' | 'age', value: string) => {
    const student = students.find((item) => item.id === studentId)
    if (!student) {
      return
    }

    const before = snapshotState()
    const nextStudent: StudentRow = {
      ...student,
      fullName: field === 'fullName' ? value : student.fullName,
      sex: field === 'sex' ? (value === 'M' || value === 'F' ? value : null) : student.sex ?? null,
      age: field === 'age' ? (value === '' ? null : Number(value)) : student.age ?? null,
    }

    setUndoStack((current) => [...current.slice(-49), before])
    setRedoStack([])
    setStudents((current) => current.map((item) => (item.id === studentId ? nextStudent : item)))
    scheduleAutoSave()
  }

  const updateRemarkValue = async (studentId: number, value: string) => {
    const before = snapshotState()
    const nextValue = value.trim() === '' ? null : value

    setUndoStack((current) => [...current.slice(-49), before])
    setRedoStack([])
    setRemarks((current) => ({ ...current, [studentId]: nextValue }))
    scheduleAutoSave()
  }

  const archiveStudentRow = async (studentId: number) => {
    const student = students.find((item) => item.id === studentId)
    if (!student) {
      return
    }

    const confirmed = window.confirm(`${getText('addRecord.confirmDeleteStudent')}\n${student.fullName}`)
    if (!confirmed) {
      return
    }

    const before = snapshotState()
    setUndoStack((current) => [...current.slice(-49), before])
    setRedoStack([])
    await studentRepo.archiveStudent(studentId)

    setStudents((current) => current.filter((item) => item.id !== studentId))
    setScores((current) => {
      const next = { ...current }
      delete next[studentId]
      return next
    })
    setRemarks((current) => {
      const next = { ...current }
      delete next[studentId]
      return next
    })
  }

  const archiveSubjectColumn = async (subjectId: number) => {
    const subject = subjects.find((item) => item.id === subjectId)
    if (!subject) {
      return
    }

    const confirmed = window.confirm(`${getText('addRecord.confirmDeleteSubject')}\n${subject.name}`)
    if (!confirmed) {
      return
    }

    const before = snapshotState()
    setUndoStack((current) => [...current.slice(-49), before])
    setRedoStack([])
    await subjectRepo.archiveSubject(subjectId)

    setSubjects((current) => current.filter((item) => item.id !== subjectId))
    setScores((current) => {
      const next: Record<number, Record<number, CellValue>> = {}
      Object.entries(current).forEach(([studentKey, row]) => {
        const studentId = Number(studentKey)
        const nextRow = { ...row }
        delete nextRow[subjectId]
        if (Object.keys(nextRow).length > 0) {
          next[studentId] = nextRow
        }
      })
      return next
    })
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
        void flushAutoSave()
      }
    }

    const handlePageHide = () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
        void flushAutoSave()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
      }
    }
  }, [students, scores, remarks])

  const totalForStudent = (studentId: number) => {
    return subjects
      .filter((subject) => subject.kind === 'score')
      .reduce((sum, subject) => {
        const value = scores[studentId]?.[subject.id ?? -1]
        return typeof value === 'number' ? sum + value : sum
      }, 0)
  }

  const createClass = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedSection = (dialogState.section.trim() || 'A').toUpperCase()
    const normalizedAcademicYear = dialogState.academicYear.trim() || getText('addRecord.defaultYear')
    const baseName = `Grade ${dialogState.grade} ${normalizedSection}`
    const isDuplicateClass = classes.some(
      (item) =>
        item.grade === dialogState.grade &&
        String(item.section ?? '').trim().toUpperCase() === normalizedSection &&
        String(item.academicYear ?? '').trim() === normalizedAcademicYear,
    )
    const className = isDuplicateClass ? `${baseName} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : baseName

    try {
      const created = await classRepo.createClass({
        name: className,
        grade: dialogState.grade,
        section: normalizedSection,
        academicYear: normalizedAcademicYear,
        schoolName: dialogState.schoolName.trim(),
        semester: dialogState.semester,
        allowDuplicate: true,
      })

      await classRepo.openSheet(created.id ?? 0, dialogState.semester)

      setClasses((current) => {
        const existingIndex = current.findIndex((item) => item.id === created.id)
        if (existingIndex >= 0) {
          return current.map((item) => (item.id === created.id ? created : item))
        }
        return [...current, created]
      })
      setSelectedClassId(created.id ?? null)
      setSemester(dialogState.semester)
      setDialogOpen(false)
      setDialogState({
        schoolName: '',
        grade: 11,
        section: 'A',
        semester: 1,
        academicYear: getText('addRecord.defaultYear'),
      })
    } catch {
      window.alert(getText('addRecord.classExists'))
    }
  }

  const handleTabClick = (tabId: number) => {
    const nextClassId = Math.floor(tabId / 10)
    const nextSemester = (tabId % 10) as Semester

    if (!Number.isFinite(nextClassId) || (nextSemester !== 1 && nextSemester !== 2)) {
      return
    }

    setSelectedClassId(nextClassId)
    setSemester(nextSemester)
  }

  const defaultColumnWidths = useMemo(() => {
    const widths: Record<string, number> = {
      no: 48,
      name: 180,
      sex: 72,
      age: 72,
      total: 120,
      remark: 160,
      delete: 88,
    }

    for (const subject of subjects) {
      widths[`subject-${subject.id}`] = 104
    }

    return widths
  }, [subjects])

  const getColumnWidth = (key: string) => columnWidths[key] ?? defaultColumnWidths[key] ?? 120

  const beginColumnResize = (event: React.PointerEvent<HTMLElement>, key: string) => {
    event.preventDefault()

    const startX = event.clientX
    const startWidth = getColumnWidth(key)

    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX
      const nextWidth = Math.min(260, Math.max(60, startWidth + delta))
      setColumnWidths((current) => ({ ...current, [key]: nextWidth }))
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  const startColumnResizeFromCell = (event: React.PointerEvent<HTMLElement>, key: string) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const edgeOffset = event.clientX - rect.left

    if (edgeOffset > rect.width - 8) {
      beginColumnResize(event, key)
    }
  }

  const visibleColumns = [
    { key: 'no', label: getText('addRecord.no') },
    { key: 'name', label: getText('addRecord.studentName') },
    { key: 'sex', label: getText('addRecord.sex') },
    { key: 'age', label: getText('addRecord.age') },
    ...subjects.map((subject) => ({ key: `subject-${subject.id}`, label: `${subject.name} /${subject.maxScore}`, type: 'score', id: subject.id })),
    { key: 'total', label: getText('addRecord.total') },
    { key: 'remark', label: getText('addRecord.remark') },
    { key: 'delete', label: getText('common.delete') },
  ]

  const gridColumns = visibleColumns.map((column) => `${getColumnWidth(column.key)}px`).join(' ')

  if (!classes.length) {
    return (
      <section className="add-record-page">
        <div className="add-record-header">
          <div className="record-meta-block">
            <div className="record-class-name">{getText('page.addRecord')}</div>
          </div>
          <div className="save-indicator">{saveIndicator}</div>
        </div>

        <div className="record-toolbar" aria-label="Add Record actions">
          <button type="button" className="toolbar-button primary-button" onClick={addStudent}>
            {getText('addRecord.addStudent')}
          </button>
          <button
            type="button"
            className="toolbar-button"
            onClick={() => {
              setSubjectDialogState({ name: '', maxScore: 100 })
              setSubjectDialogOpen(true)
            }}
          >
            {getText('addRecord.addSubject')}
          </button>
        </div>

        <div className="spreadsheet-shell" role="grid" aria-label="Gradebook grid">
          <div className="grid-header-row">
            <div className="grid-cell header-cell corner-cell">{getText('addRecord.no')}</div>
            <div className="grid-cell header-cell">{getText('addRecord.studentName')}</div>
            <div className="grid-cell header-cell">{getText('addRecord.sex')}</div>
            <div className="grid-cell header-cell">{getText('addRecord.age')}</div>
            <div className="grid-cell header-cell total-header">{getText('addRecord.total')}</div>
            <div className="grid-cell header-cell">{getText('addRecord.remark')}</div>
          </div>
          <div className="grid-row">
            <div className="grid-cell row-index">—</div>
            <div className="grid-cell">{getText('addRecord.empty')}</div>
          </div>
        </div>

        <SheetTabs tabs={[{ id: 0, label: '+', active: true }]} onAdd={() => setDialogOpen(true)} />

        {dialogOpen && (
          <div className="class-dialog-backdrop" onClick={() => setDialogOpen(false)}>
            <form className="class-dialog" onClick={(event) => event.stopPropagation()} onSubmit={createClass}>
              <h3>{getText('addRecord.classDialogTitle')}</h3>
              <label>
                <span>{getText('addRecord.school')}</span>
                <input value={dialogState.schoolName} onChange={(event) => setDialogState((current) => ({ ...current, schoolName: event.target.value }))} />
              </label>
              <div className="dialog-two-col">
                <label>
                  <span>{getText('addRecord.grade')}</span>
                  <select value={dialogState.grade} onChange={(event) => setDialogState((current) => ({ ...current, grade: Number(event.target.value) }))}>
                    {[...Array(12)].map((_, index) => (
                      <option key={index + 1} value={index + 1}>{index + 1}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{getText('addRecord.section')}</span>
                  <input value={dialogState.section} maxLength={3} onChange={(event) => setDialogState((current) => ({ ...current, section: event.target.value.toUpperCase() }))} />
                </label>
              </div>
              <div className="dialog-two-col">
                <label>
                  <span>{getText('addRecord.semester')}</span>
                  <select value={dialogState.semester} onChange={(event) => setDialogState((current) => ({ ...current, semester: Number(event.target.value) as Semester }))}>
                    <option value={1}>I</option>
                    <option value={2}>II</option>
                  </select>
                </label>
                <label>
                  <span>{getText('addRecord.year')}</span>
                  <input value={dialogState.academicYear} onChange={(event) => setDialogState((current) => ({ ...current, academicYear: event.target.value }))} />
                </label>
              </div>
              <div className="dialog-actions">
                <button type="button" className="toolbar-button" onClick={() => setDialogOpen(false)}>
                  {getText('common.cancel')}
                </button>
                <button type="submit" className="toolbar-button primary-button">
                  {getText('common.save')}
                </button>
              </div>
            </form>
          </div>
        )}

        {subjectDialogOpen && (
          <div className="class-dialog-backdrop" onClick={() => setSubjectDialogOpen(false)}>
            <form className="class-dialog" onClick={(event) => event.stopPropagation()} onSubmit={(event) => {
              event.preventDefault()
              void addSubject()
            }}>
              <h3>{getText('addRecord.addSubject')}</h3>
              <label>
                <span>{getText('addRecord.subjectPrompt')}</span>
                <input
                  value={subjectDialogState.name}
                  onChange={(event) => setSubjectDialogState((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label>
                <span>{getText('addRecord.subjectMax')}</span>
                <input
                  type="number"
                  min={1}
                  value={subjectDialogState.maxScore}
                  onChange={(event) => setSubjectDialogState((current) => ({ ...current, maxScore: Number(event.target.value) || 100 }))}
                />
              </label>
              <div className="dialog-actions">
                <button type="button" className="toolbar-button" onClick={() => setSubjectDialogOpen(false)}>
                  {getText('common.cancel')}
                </button>
                <button type="submit" className="toolbar-button primary-button">
                  {getText('common.save')}
                </button>
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
          <div className="record-class-name">{activeClass?.name ?? getText('page.addRecord')}</div>
          <div className="record-school-name">{activeClass?.schoolName ?? ''}</div>
          <div className="record-semester">
            {activeClass?.academicYear ?? getText('addRecord.defaultYear')} · {semester === 1 ? getText('semester.short.i') : getText('semester.short.ii')}
          </div>
        </div>
        <div className="save-indicator">{saveIndicator}</div>
      </div>

      <div className="record-toolbar" aria-label="Add Record actions">
        <button type="button" className="toolbar-button primary-button" onClick={addStudent}>
          {getText('addRecord.addStudent')}
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => {
            setSubjectDialogState({ name: '', maxScore: 100 })
            setSubjectDialogOpen(true)
          }}
        >
          {getText('addRecord.addSubject')}
        </button>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => {
            setColumnDialogState({ name: '', kind: 'text', options: 'Present, Absent, Late, Excused' })
            setColumnDialogOpen(true)
          }}
        >
          {getText('addRecord.addColumn')}
        </button>
        <button type="button" className="toolbar-button" onClick={undoLastAction} disabled={!undoStack.length}>
          {getText('addRecord.undo')}
        </button>
        <button type="button" className="toolbar-button" onClick={redoLastAction} disabled={!redoStack.length}>
          {getText('addRecord.redo')}
        </button>
      </div>

      <div className="spreadsheet-shell" role="grid" aria-label="Gradebook grid">
        <table className="spreadsheet-table">
          <thead>
            <tr className="grid-header-row" style={{ gridTemplateColumns: gridColumns }}>
              {visibleColumns.map((column) => {
                if (column.key.startsWith('subject-')) {
                  const subjectId = Number(column.key.replace('subject-', ''))
                  return (
                    <th
                      key={column.key}
                      className={`grid-cell header-cell ${column.key === 'total' ? 'total-header' : ''}`}
                      onPointerDown={(event) => startColumnResizeFromCell(event, column.key)}
                    >
                      <div className="column-header-wrap">
                        <button type="button" className="header-button" onClick={() => openSubjectEditor(subjectId)}>
                          {column.label}
                        </button>
                        <button type="button" className="utility-button danger-button column-delete-button" onClick={() => void archiveSubjectColumn(subjectId)} aria-label={`Archive ${column.label}`}>
                          ×
                        </button>
                        <button
                          type="button"
                          className="column-resizer"
                          aria-label={`Resize ${column.label} column`}
                          onPointerDown={(event) => beginColumnResize(event, column.key)}
                        />
                      </div>
                    </th>
                  )
                }

                if (column.key === 'delete') {
                  return (
                    <th key={column.key} className="grid-cell header-cell row-delete-cell" onPointerDown={(event) => startColumnResizeFromCell(event, column.key)}>
                      <div className="column-header-wrap">
                        <span>{column.label}</span>
                      </div>
                    </th>
                  )
                }

                return (
                  <th
                    key={column.key}
                    className={`grid-cell header-cell ${column.key === 'total' ? 'total-header' : ''}`}
                    onPointerDown={(event) => startColumnResizeFromCell(event, column.key)}
                  >
                    <div className="column-header-wrap">
                      <span>{column.label}</span>
                      <button
                        type="button"
                        className="column-resizer"
                        aria-label={`Resize ${column.label} column`}
                        onPointerDown={(event) => beginColumnResize(event, column.key)}
                      />
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {students.map((student, studentIndex) => (
              <tr key={student.id ?? studentIndex} className="grid-row" style={{ gridTemplateColumns: gridColumns }}>
                <td className="grid-cell row-index" onPointerDown={(event) => startColumnResizeFromCell(event, 'no')}>{studentIndex + 1}</td>
                <td className="grid-cell student-name" onPointerDown={(event) => startColumnResizeFromCell(event, 'name')}>
                  <input
                    className="inline-grid-input"
                    value={student.fullName}
                    onFocus={() => setSaveState('saved')}
                    onPaste={(event) => void handlePasteIntoCell(event, student.id ?? 0, 'studentName')}
                    onChange={(event) => void updateStudentField(student.id ?? 0, 'fullName', event.target.value)}
                  />
                </td>
                <td className="grid-cell" onPointerDown={(event) => startColumnResizeFromCell(event, 'sex')}>
                  <select className="inline-grid-input" value={student.sex ?? ''} onPaste={(event) => void handlePasteIntoCell(event, student.id ?? 0, 'sex')} onChange={(event) => void updateStudentField(student.id ?? 0, 'sex', event.target.value)}>
                    <option value=""> </option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </td>
                <td className="grid-cell" onPointerDown={(event) => startColumnResizeFromCell(event, 'age')}>
                  <input
                    className="inline-grid-input"
                    type="number"
                    min={5}
                    max={30}
                    value={student.age ?? ''}
                    onPaste={(event) => void handlePasteIntoCell(event, student.id ?? 0, 'age')}
                    onChange={(event) => void updateStudentField(student.id ?? 0, 'age', event.target.value)}
                  />
                </td>

                {subjects.map((subject) => {
                  const value = scores[student.id ?? -1]?.[subject.id ?? -1]

                  if (subject.kind === 'dropdown') {
                    return (
                      <td key={`${student.id}-${subject.id}`} className="grid-cell" onPointerDown={(event) => startColumnResizeFromCell(event, `subject-${subject.id}`)}>
                        <select
                          className="inline-grid-input"
                          value={value ?? ''}
                          onPaste={(event) => void handlePasteIntoCell(event, student.id ?? 0, 'score', subject.id ?? 0)}
                          onChange={(event) => void updateScoreValue(student.id ?? 0, subject.id ?? 0, event.target.value)}
                        >
                          <option value=""> </option>
                          {(subject.options ?? []).map((option) => (
                            <option key={`${subject.id}-${option}`} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </td>
                    )
                  }

                  if (subject.kind === 'text') {
                    return (
                      <td key={`${student.id}-${subject.id}`} className="grid-cell" onPointerDown={(event) => startColumnResizeFromCell(event, `subject-${subject.id}`)}>
                        <input
                          className="inline-grid-input"
                          value={value ?? ''}
                          onPaste={(event) => void handlePasteIntoCell(event, student.id ?? 0, 'score', subject.id ?? 0)}
                          onChange={(event) => void updateScoreValue(student.id ?? 0, subject.id ?? 0, event.target.value)}
                        />
                      </td>
                    )
                  }

                  return (
                    <td key={`${student.id}-${subject.id}`} className="grid-cell" onPointerDown={(event) => startColumnResizeFromCell(event, `subject-${subject.id}`)}>
                      <input
                        className={`inline-grid-input ${isScoreCell(subject.id ?? 0) ? 'score-cell' : ''}`}
                        type={subject.kind === 'number' ? 'number' : 'text'}
                        value={value ?? ''}
                        inputMode={subject.kind === 'number' ? 'decimal' : 'text'}
                        onPaste={(event) => void handlePasteIntoCell(event, student.id ?? 0, 'score', subject.id ?? 0)}
                        onChange={(event) => void updateScoreValue(student.id ?? 0, subject.id ?? 0, event.target.value)}
                      />
                    </td>
                  )
                })}

                <td className="grid-cell total-cell" onPointerDown={(event) => startColumnResizeFromCell(event, 'total')}>{totalForStudent(student.id ?? 0)}</td>
                <td className="grid-cell" onPointerDown={(event) => startColumnResizeFromCell(event, 'remark')}>
                  <input
                    className="inline-grid-input"
                    value={remarks[student.id ?? -1] ?? ''}
                    onPaste={(event) => void handlePasteIntoCell(event, student.id ?? 0, 'remark')}
                    onChange={(event) => void updateRemarkValue(student.id ?? 0, event.target.value)}
                  />
                </td>
                <td className="grid-cell row-delete-cell" onPointerDown={(event) => startColumnResizeFromCell(event, 'remark')}>
                  <button type="button" className="utility-button danger-button" onClick={() => void archiveStudentRow(student.id ?? 0)} aria-label={`Archive ${student.fullName}`}>
                    {getText('common.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SheetTabs tabs={sheetTabs} onSelect={handleTabClick} onAdd={() => setDialogOpen(true)} />

      {dialogOpen && (
        <div className="class-dialog-backdrop" onClick={() => setDialogOpen(false)}>
          <form className="class-dialog" onClick={(event) => event.stopPropagation()} onSubmit={createClass}>
            <h3>{getText('addRecord.classDialogTitle')}</h3>
            <label>
              <span>{getText('addRecord.school')}</span>
              <input value={dialogState.schoolName} onChange={(event) => setDialogState((current) => ({ ...current, schoolName: event.target.value }))} />
            </label>
            <div className="dialog-two-col">
              <label>
                <span>{getText('addRecord.grade')}</span>
                <select value={dialogState.grade} onChange={(event) => setDialogState((current) => ({ ...current, grade: Number(event.target.value) }))}>
                  {[...Array(12)].map((_, index) => (
                    <option key={index + 1} value={index + 1}>{index + 1}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{getText('addRecord.section')}</span>
                <input value={dialogState.section} maxLength={3} onChange={(event) => setDialogState((current) => ({ ...current, section: event.target.value.toUpperCase() }))} />
              </label>
            </div>
            <div className="dialog-two-col">
              <label>
                <span>{getText('addRecord.semester')}</span>
                <select value={dialogState.semester} onChange={(event) => setDialogState((current) => ({ ...current, semester: Number(event.target.value) as Semester }))}>
                  <option value={1}>I</option>
                  <option value={2}>II</option>
                </select>
              </label>
              <label>
                <span>{getText('addRecord.year')}</span>
                <input value={dialogState.academicYear} onChange={(event) => setDialogState((current) => ({ ...current, academicYear: event.target.value }))} />
              </label>
            </div>
            <div className="dialog-actions">
              <button type="button" className="toolbar-button" onClick={() => setDialogOpen(false)}>
                {getText('common.cancel')}
              </button>
              <button type="submit" className="toolbar-button primary-button">
                {getText('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {subjectDialogOpen && (
        <div className="class-dialog-backdrop" onClick={() => setSubjectDialogOpen(false)}>
          <form className="class-dialog" onClick={(event) => event.stopPropagation()} onSubmit={(event) => {
            event.preventDefault()
            void addSubject()
          }}>
            <h3>{getText('addRecord.addSubject')}</h3>
            <label>
              <span>{getText('addRecord.subjectPrompt')}</span>
              <input
                value={subjectDialogState.name}
                onChange={(event) => setSubjectDialogState((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              <span>{getText('addRecord.subjectMax')}</span>
              <input
                type="number"
                min={1}
                value={subjectDialogState.maxScore}
                onChange={(event) => setSubjectDialogState((current) => ({ ...current, maxScore: Number(event.target.value) || 100 }))}
              />
            </label>
            <div className="dialog-actions">
              <button type="button" className="toolbar-button" onClick={() => setSubjectDialogOpen(false)}>
                {getText('common.cancel')}
              </button>
              <button type="submit" className="toolbar-button primary-button">
                {getText('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {columnDialogOpen && (
        <div className="class-dialog-backdrop" onClick={() => setColumnDialogOpen(false)}>
          <form className="class-dialog" onClick={(event) => event.stopPropagation()} onSubmit={(event) => {
            event.preventDefault()
            void addColumn()
          }}>
            <h3>{getText('addRecord.addColumn')}</h3>
            <label>
              <span>{getText('addRecord.subjectPrompt')}</span>
              <input
                value={columnDialogState.name}
                onChange={(event) => setColumnDialogState((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              <span>Type</span>
              <select
                value={columnDialogState.kind}
                onChange={(event) => setColumnDialogState((current) => ({ ...current, kind: event.target.value as 'text' | 'number' | 'dropdown' }))}
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="dropdown">Dropdown</option>
              </select>
            </label>
            {columnDialogState.kind === 'dropdown' && (
              <label>
                <span>Options</span>
                <input
                  value={columnDialogState.options}
                  onChange={(event) => setColumnDialogState((current) => ({ ...current, options: event.target.value }))}
                />
              </label>
            )}
            <div className="dialog-actions">
              <button type="button" className="toolbar-button" onClick={() => setColumnDialogOpen(false)}>
                {getText('common.cancel')}
              </button>
              <button type="submit" className="toolbar-button primary-button">
                {getText('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      {subjectEditorOpen && (
        <div className="class-dialog-backdrop" onClick={() => setSubjectEditorOpen(false)}>
          <form className="class-dialog" onClick={(event) => event.stopPropagation()} onSubmit={saveSubjectEditor}>
            <h3>Edit subject</h3>
            <label>
              <span>{getText('addRecord.subjectPrompt')}</span>
              <input
                value={subjectEditorState.name}
                onChange={(event) => setSubjectEditorState((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              <span>{getText('addRecord.subjectMax')}</span>
              <input
                type="number"
                min={1}
                value={subjectEditorState.maxScore}
                onChange={(event) => setSubjectEditorState((current) => ({ ...current, maxScore: Number(event.target.value) || 100 }))}
              />
            </label>
            <div className="dialog-actions">
              <button type="button" className="toolbar-button" onClick={() => setSubjectEditorOpen(false)}>
                {getText('common.cancel')}
              </button>
              <button type="submit" className="toolbar-button primary-button">
                {getText('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
