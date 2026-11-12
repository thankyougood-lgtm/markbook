import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { SheetTabs } from '../../components/Sheets/SheetTabs'
import type {
  AttendanceRecordRow,
  AttendanceSessionRow,
  MarkBookClass,
  Semester,
  StudentRow,
  SubjectRow,
} from '../../db/db'
import * as attendanceRepo from '../../db/repositories/attendanceRepo'
import * as classRepo from '../../db/repositories/classRepo'
import * as scoreRepo from '../../db/repositories/scoreRepo'
import * as studentRepo from '../../db/repositories/studentRepo'
import * as subjectRepo from '../../db/repositories/subjectRepo'
import {
  computeOverview,
  computeSubjectAverages,
  computeScoreDistribution,
  computeAttendanceBreakdown,
  computeAttendanceTrend,
  computeSexSplit,
  computeStudentSummaries,
  type ScoreMatrix,
} from '../../lib/analytics/compute'
import en from '../../i18n/en.json'
import am from '../../i18n/am.json'
import om from '../../i18n/om.json'
import './AnalyticsPage.css'

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
type SortKey = 'no' | 'name' | 'avg' | 'att'

const CHART_COLORS = ['#2F5BE0', '#4B7BF5', '#7AA0FF', '#A7BEFF', '#C9D9FF']

function readSelectedSheet(): { classId: number | null; semester: Semester } {
  const saved = localStorage.getItem('markbook-selected-sheet')
  if (!saved) return { classId: null, semester: 1 }
  const [classPart, semPart] = saved.split('-')
  const classId = Number(classPart)
  const sem = Number(semPart) === 2 ? 2 : 1
  return { classId: Number.isFinite(classId) && classId > 0 ? classId : null, semester: sem }
}

function shortDate(iso: string): string {
  try {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return iso
  }
}

export function AnalyticsPage() {
  const initial = useMemo(() => readSelectedSheet(), [])

  const [classes, setClasses] = useState<MarkBookClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<number | null>(initial.classId)
  const [semester, setSemester] = useState<Semester>(initial.semester)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [scores, setScores] = useState<ScoreMatrix>({})
  const [sessions, setSessions] = useState<AttendanceSessionRow[]>([])
  const [records, setRecords] = useState<AttendanceRecordRow[]>([])
  const [loading, setLoading] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('no')

  const activeClass = classes.find((c) => c.id === selectedClassId) ?? null

  useEffect(() => {
    if (selectedClassId != null) {
      localStorage.setItem('markbook-selected-sheet', selectedClassId + '-' + semester)
    }
  }, [selectedClassId, semester])

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
        if (!allowed.includes(semester)) setSemester((allowed[0] as Semester) || 1)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!activeClass?.id) {
      setStudents([]); setSubjects([]); setScores({}); setSessions([]); setRecords([])
      return
    }
    setLoading(true)
    const classId = activeClass.id
    void (async () => {
      try {
        const [nextStudents, nextSubjects, nextScores, nextSessions] = await Promise.all([
          studentRepo.listStudents(classId),
          subjectRepo.listSubjects(classId),
          scoreRepo.listScoresForSemester(classId, semester),
          attendanceRepo.listAttendanceSessions(classId),
        ])
        const sessionIds = nextSessions.map((s) => s.id).filter((id): id is number => id != null)
        const nextRecords = await attendanceRepo.listAttendanceRecords(sessionIds)
        setStudents(nextStudents)
        setSubjects(nextSubjects)
        setScores(nextScores as ScoreMatrix)
        setSessions(nextSessions)
        setRecords(nextRecords)
      } catch (error) {
        console.error('Failed to load analytics:', error, (error as { inner?: unknown }).inner)
      } finally {
        setLoading(false)
      }
    })()
  }, [activeClass?.id, semester])

  const overview = useMemo(
    () => computeOverview(students, subjects, sessions),
    [students, subjects, sessions],
  )
  const attendanceBreakdown = useMemo(
    () => computeAttendanceBreakdown(records, sessions, students),
    [records, sessions, students],
  )
  const subjectAverages = useMemo(
    () => computeSubjectAverages(scores, subjects, students),
    [scores, subjects, students],
  )
  const distribution = useMemo(
    () => computeScoreDistribution(scores, subjects, students),
    [scores, subjects, students],
  )
  const trend = useMemo(
    () => computeAttendanceTrend(records, sessions, students),
    [records, sessions, students],
  )
  const sexSplit = useMemo(() => computeSexSplit(students), [students])
  const summaries = useMemo(
    () => computeStudentSummaries(scores, subjects, students, records, sessions),
    [scores, subjects, students, records, sessions],
  )

  const sortedSummaries = useMemo(() => {
    const copy = [...summaries]
    if (sortKey === 'no') return copy
    if (sortKey === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name))
    if (sortKey === 'avg') {
      return copy.sort((a, b) => {
        if (a.average == null && b.average == null) return 0
        if (a.average == null) return 1
        if (b.average == null) return -1
        return b.average - a.average
      })
    }
    if (sortKey === 'att') {
      return copy.sort((a, b) => {
        if (a.attendancePct == null && b.attendancePct == null) return 0
        if (a.attendancePct == null) return 1
        if (b.attendancePct == null) return -1
        return b.attendancePct - a.attendancePct
      })
    }
    return copy
  }, [summaries, sortKey])

  const sheetTabs = useMemo<SheetTab[]>(() => {
    const tabs: SheetTab[] = []
    for (const item of classes) {
      const sems = Array.isArray(item.openSemesters) && item.openSemesters.length ? item.openSemesters : [1]
      for (const sem of sems) {
        tabs.push({
          id: (item.id ?? 0) * 10 + Number(sem),
          label: `${item.name} · ${Number(sem) === 1 ? getText('semester.short.i') : getText('semester.short.ii')}`,
          active: item.id === selectedClassId && Number(sem) === semester,
        })
      }
    }
    return tabs
  }, [classes, selectedClassId, semester])

  const handleTabSelect = (tabId: number) => {
    const nextClassId = Math.floor(tabId / 10)
    const nextSem = (tabId % 10) as Semester
    if (!Number.isFinite(nextClassId) || (nextSem !== 1 && nextSem !== 2)) return
    setSelectedClassId(nextClassId)
    setSemester(nextSem)
  }

  if (!activeClass) {
    return (
      <section className="analytics-page">
        <div className="analytics-empty">
          <p>{getText('analytics.empty')}</p>
        </div>
        <SheetTabs
          tabs={sheetTabs.length ? sheetTabs : [{ id: 0, label: '+', active: true }]}
          onSelect={handleTabSelect}
        />
      </section>
    )
  }

  const attTotal = attendanceBreakdown.total
  const pieData = [
    { name: getText('attendance.present'), value: attendanceBreakdown.P, key: 'P' },
    { name: getText('attendance.absent'), value: attendanceBreakdown.A, key: 'A' },
    { name: getText('attendance.late'), value: attendanceBreakdown.L, key: 'L' },
    { name: getText('attendance.excused'), value: attendanceBreakdown.E, key: 'E' },
  ].filter((p) => p.value > 0)

  const sexData = [
    { name: getText('analytics.sexM'), value: sexSplit.M, key: 'M' },
    { name: getText('analytics.sexF'), value: sexSplit.F, key: 'F' },
    { name: getText('analytics.sexBlank'), value: sexSplit.blank, key: 'blank' },
  ].filter((p) => p.value > 0)

  const trendData = trend
    .filter((t) => t.attendancePct != null)
    .map((t) => ({
      date: shortDate(t.date),
      pct: t.attendancePct as number,
    }))

  return (
    <section className="analytics-page">
      <div className="add-record-header">
        <div className="record-meta-block">
          <div className="record-class-name">{activeClass.name}</div>
          <div className="record-school-name">{activeClass.schoolName ?? ''}</div>
          <div className="record-semester">
            {activeClass.academicYear ?? ''} ·{' '}
            {semester === 1 ? getText('semester.short.i') : getText('semester.short.ii')}
          </div>
        </div>
        {loading && <div className="save-indicator">{getText('analytics.loading')}</div>}
      </div>

      <div className="analytics-scroll">
        {/* ── Overview strip ─────────────────────────────── */}
        <div className="analytics-overview">
          <div className="overview-card">
            <div className="overview-value">{overview.studentCount}</div>
            <div className="overview-label">{getText('analytics.students')}</div>
          </div>
          <div className="overview-card">
            <div className="overview-value">{overview.subjectCount}</div>
            <div className="overview-label">{getText('analytics.subjects')}</div>
          </div>
          <div className="overview-card">
            <div className="overview-value">{overview.sessionCount}</div>
            <div className="overview-label">{getText('analytics.sessions')}</div>
          </div>
          <div className="overview-card">
            <div className="overview-value">
              {attTotal > 0 ? Math.round((attendanceBreakdown.P / attTotal) * 100) + '%' : '—'}
            </div>
            <div className="overview-label">{getText('analytics.attendancePct')}</div>
          </div>
        </div>

        {/* ── Charts grid ────────────────────────────────── */}
        <div className="analytics-charts-grid">
          <div className="chart-card">
            <h3>{getText('analytics.subjectAvgTitle')}</h3>
            {subjectAverages.filter((s) => s.averagePct != null).length === 0 ? (
              <div className="chart-empty">{getText('analytics.noScores')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, subjectAverages.length * 32)}>
                <BarChart
                  data={subjectAverages.filter((s) => s.averagePct != null)}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="averagePct" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <h3>{getText('analytics.distributionTitle')}</h3>
            {distribution.every((b) => b.count === 0) ? (
              <div className="chart-empty">{getText('analytics.noScores')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distribution} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <h3>{getText('analytics.attendanceBreakdownTitle')}</h3>
            {attTotal === 0 ? (
              <div className="chart-empty">{getText('analytics.noAttendance')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <h3>{getText('analytics.trendTitle')}</h3>
            {trendData.length === 0 ? (
              <div className="chart-empty">{getText('analytics.noAttendance')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="pct" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="chart-card">
            <h3>{getText('analytics.sexSplitTitle')}</h3>
            {sexData.length === 0 ? (
              <div className="chart-empty">{getText('analytics.noStudents')}</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sexData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {sexData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Student summary table ──────────────────────── */}
        <div className="analytics-table-card">
          <h3>{getText('analytics.studentsTableTitle')}</h3>
          {summaries.length === 0 ? (
            <div className="chart-empty">{getText('analytics.noStudents')}</div>
          ) : (
            <div className="analytics-table-scroll">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th onClick={() => setSortKey('no')} className={sortKey === 'no' ? 'is-sorted' : ''}>NO</th>
                    <th onClick={() => setSortKey('name')} className={sortKey === 'name' ? 'is-sorted' : ''}>
                      {getText('addRecord.studentName')}
                    </th>
                    <th onClick={() => setSortKey('avg')} className={sortKey === 'avg' ? 'is-sorted' : ''}>
                      {getText('analytics.avg')}
                    </th>
                    <th onClick={() => setSortKey('att')} className={sortKey === 'att' ? 'is-sorted' : ''}>
                      {getText('analytics.attendancePct')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSummaries.map((s, i) => (
                    <tr key={s.studentId}>
                      <td>{i + 1}</td>
                      <td className="analytics-table-name">{s.name}</td>
                      <td>{s.average == null ? '—' : s.average.toFixed(1) + '%'}</td>
                      <td>{s.attendancePct == null ? '—' : s.attendancePct.toFixed(1) + '%'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <SheetTabs
        tabs={sheetTabs.length ? sheetTabs : [{ id: 0, label: '+', active: true }]}
        onSelect={handleTabSelect}
      />
    </section>
  )
}
