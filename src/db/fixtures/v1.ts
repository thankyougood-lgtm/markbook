export const fixtureV1 = {
  classes: [
    {
      id: 1,
      name: 'Grade 11 A',
      grade: 11,
      section: 'A',
      academicYear: '2018 EC',
      schoolName: 'Bole Secondary',
      teacherName: 'Abebe',
      createdAt: 1710000000000,
      archivedAt: null,
      openSemesters: [1],
    },
  ],
  subjects: [
    { id: 1, classId: 1, name: 'Math', maxScore: 100, order: 0, archivedAt: null, kind: 'score', options: [] },
    { id: 2, classId: 1, name: 'Science', maxScore: 100, order: 1, archivedAt: null, kind: 'score', options: [] },
  ],
  students: [
    { id: 1, classId: 1, serialNo: 1, fullName: 'Alice', sex: 'F', age: 17, order: 0, archivedAt: null },
    { id: 2, classId: 1, serialNo: 2, fullName: 'Bob', sex: 'M', age: 16, order: 1, archivedAt: null },
  ],
  scores: [
    { studentId: 1, semester: 1, subjectId: 1, value: 90 },
    { studentId: 2, semester: 1, subjectId: 1, value: 85 },
  ],
  settings: [{ key: 'language', value: 'en' }],
}
