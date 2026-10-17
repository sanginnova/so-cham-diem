import type { ClassConfig } from '../types';
import { calculateTermAverage, calculateYearAverage, type ClassGradebookData, type SubjectTermScores } from '../types/subjectGrade';
import { needsAssessmentFollowup } from './assessmentStatus';
import { previewGradebookRestore } from './gradebookRestore';
import { workspaceSubject } from './teachingWorkspaces';

export function readDeviceGradebook(storage: Pick<Storage, 'getItem'>, uid: string, config: ClassConfig): ClassGradebookData | null {
  if (!uid || config.teacherId !== uid) return null;
  const raw = storage.getItem(`subject_gradebook_v2_local_${uid}_${config.id}`);
  if (!raw) return null;
  const expected = { classId: config.id, teacherId: uid, subjectName: workspaceSubject(config), schoolYear: config.schoolYear, grades: {} } as ClassGradebookData;
  return previewGradebookRestore(raw, expected).book;
}

export function summarizeSubjectBook(book: ClassGradebookData, period: 'semester1' | 'semester2' | 'year') {
  const averages: number[] = [];
  let missing = 0, makeup = 0;
  const bins = [0, 0, 0, 0];
  const average = (term: SubjectTermScores, locked: boolean) => locked ? term.average : calculateTermAverage(term);
  const entries = Object.values(book.grades);
  for (const student of entries) {
    const terms = period === 'year' ? [student.semester1, student.semester2] : [student[period]];
    if (terms.some(term => needsAssessmentFollowup(term, 'missing'))) missing++;
    if (terms.some(term => needsAssessmentFollowup(term, 'makeup'))) makeup++;
    const first = average(student.semester1, !!book.termLocks?.semester1?.locked);
    const second = average(student.semester2, !!book.termLocks?.semester2?.locked);
    const value = period === 'year' ? calculateYearAverage(first, second) : period === 'semester1' ? first : second;
    if (value !== null) {
      averages.push(value);
      bins[value < 5 ? 0 : value < 6.5 ? 1 : value < 8 ? 2 : 3]++;
    }
  }
  return { pupils: entries.length, scored: averages.length, missing, makeup, bins,
    mean: averages.length ? Math.round(averages.reduce((sum, value) => sum + value, 0) / averages.length * 10) / 10 : null };
}
