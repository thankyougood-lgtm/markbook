import { describe, expect, it } from 'vitest';
import { calculateAnalytics, type AnalyticsSnapshot } from './stats';

const data: AnalyticsSnapshot = {
  students: [
    { id: 2, classId: 1, serialNo: 2, fullName: 'Sara', sex: 'F', age: 15, order: 2, archivedAt: null },
    { id: 1, classId: 1, serialNo: 1, fullName: 'Abebe', sex: 'M', age: 16, order: 1, archivedAt: null },
    { id: 3, classId: 1, serialNo: 3, fullName: 'Archived', sex: null, age: null, order: 3, archivedAt: 10 }
  ],
  subjects: [
    { id: 20, classId: 1, name: 'English', maxScore: 50, order: 2, archivedAt: null },
    { id: 10, classId: 1, name: 'Maths', maxScore: 100, order: 1, archivedAt: null }
  ],
  scores: [
    { studentId: 1, semester: 1, subjectId: 10, value: 80 },
    { studentId: 2, semester: 1, subjectId: 10, value: 60 },
    { studentId: 1, semester: 1, subjectId: 20, value: null },
    { studentId: 1, semester: 2, subjectId: 10, value: 100 },
    { studentId: 3, semester: 1, subjectId: 10, value: 100 }
  ],
  sessions: [
    { id: 1, classId: 1, date: '2026-11-02', period: 1, subjectId: 10, semester: 1 },
    { id: 2, classId: 1, date: '2026-11-01', period: 1, subjectId: null, semester: 1 },
    { id: 3, classId: 1, date: '2026-11-03', period: 1, subjectId: 10, semester: 2 },
    { id: 4, classId: 1, date: '2026-10-31', period: 2, subjectId: 10 }
  ],
  records: [
    { sessionId: 1, studentId: 1, status: 'L' }, { sessionId: 1, studentId: 2, status: 'A' },
    { sessionId: 2, studentId: 1, status: 'P' }, { sessionId: 2, studentId: 2, status: 'E' },
    { sessionId: 3, studentId: 1, status: 'A' }, { sessionId: 4, studentId: 1, status: 'P' },
    { sessionId: 1, studentId: 3, status: 'A' }
  ]
};

describe('analytics calculations', () => {
  it('averages only entered marks, keeps roster order and excludes archived students', () => {
    const result = calculateAnalytics(data, 1);
    expect(result.subjects.map((s) => s.name)).toEqual(['Maths', 'English']);
    expect(result.subjects[0]).toMatchObject({ average: 70, recorded: 2, maxScore: 100 });
    expect(result.subjects[1]).toMatchObject({ average: null, recorded: 0 });
    expect(result.summaries.map((s) => [s.fullName, s.total])).toEqual([['Abebe', 80], ['Sara', 60]]);
    expect(result.recordedMarks).toBe(2);
  });
  it('counts late as present, excludes excused and sorts the date trend', () => {
    const result = calculateAnalytics(data, 1);
    expect(result.statuses).toEqual([{ status: 'P', count: 2 }, { status: 'A', count: 1 }, { status: 'L', count: 1 }, { status: 'E', count: 1 }]);
    expect(result.attendancePercent).toBe(75);
    expect(result.recordedAttendance).toBe(4);
    expect(result.trend.map((d) => [d.date, d.percent])).toEqual([['2026-10-31', 100], ['2026-11-01', 100], ['2026-11-02', 50]]);
    expect(result.summaries[0]!.attendancePercent).toBe(100);
    expect(result.summaries[1]!.attendancePercent).toBe(0);
  });
  it('applies subject and semester filters without mixing legacy sessions into Semester II', () => {
    const maths = calculateAnalytics(data, 1, 10);
    expect(maths.recordedMarks).toBe(2);
    expect(maths.recordedAttendance).toBe(3);
    expect(maths.trend.map((d) => d.date)).toEqual(['2026-10-31', '2026-11-02']);
    const second = calculateAnalytics(data, 2);
    expect(second.recordedMarks).toBe(1);
    expect(second.attendancePercent).toBe(0);
    expect(second.summaries[1]).toMatchObject({ total: null, attendancePercent: null });
  });
  it('returns honest empty values instead of invented zeroes', () => {
    const result = calculateAnalytics({ students: [], subjects: [], scores: [], sessions: [], records: [] }, 1);
    expect(result.attendancePercent).toBeNull();
    expect(result.subjects).toEqual([]);
    expect(result.trend).toEqual([]);
    expect(result.summaries).toEqual([]);
  });
});
