import { useCallback, useEffect, useState } from 'react';
import type { Semester, StudentRow, SubjectRow } from '../../db/schema';
import { listStudents } from '../../db/repositories/students';
import { listSubjects } from '../../db/repositories/subjects';
import { getScoresForClassStudents } from '../../db/repositories/scores';
import { scoreKey } from './model';

export type SaveStatus = 'idle' | 'saving' | 'saved';

export interface SheetData {
  subjects: SubjectRow[];
  students: StudentRow[];
  scores: Map<string, number | null>;
  remarks: Map<number, string>;
  status: SaveStatus;
  reload: () => Promise<void>;
  markSaving: () => void;
}

export function useSheet(classId: number | null, semester: Semester): SheetData {
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [scores, setScores] = useState<Map<string, number | null>>(new Map());
  const [remarks, setRemarks] = useState<Map<number, string>>(new Map());
  const [status, setStatus] = useState<SaveStatus>('idle');

  const reload = useCallback(async () => {
    if (classId === null) {
      setSubjects([]);
      setStudents([]);
      setScores(new Map());
      setRemarks(new Map());
      return;
    }
    const [subj, stud] = await Promise.all([listSubjects(classId), listStudents(classId)]);
    const ids = stud.map((s) => s.id);
    const [scoreRows, remarkRows] = await Promise.all([
      getScoresForClassStudents(ids, semester),
      Promise.all(ids.map(async (id) => [id, ''] as const))
    ]);
    setSubjects(subj);
    setStudents(stud);
    setScores(new Map(scoreRows.map((r) => [scoreKey(r.studentId, r.subjectId), r.value])));
    setRemarks(new Map(remarkRows));
  }, [classId, semester]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const markSaving = useCallback(() => {
    setStatus('saving');
    window.setTimeout(() => setStatus('saved'), 300);
  }, []);

  return { subjects, students, scores, remarks, status, reload, markSaving };
}
