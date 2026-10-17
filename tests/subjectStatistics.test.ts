import test from 'node:test';
import assert from 'node:assert/strict';
import { readDeviceGradebook, summarizeSubjectBook } from '../src/lib/subjectStatistics';
import { INITIAL_CLASS_CONFIG } from '../src/data/initialData';
import type { ClassGradebookData, SubjectTermScores } from '../src/types/subjectGrade';
const term = (value: number | null): SubjectTermScores => ({ tx: [value, value], gk: value, ck: value, average: value });
const make = (): ClassGradebookData => ({ teacherId: 'a', classId: 'math', subjectName: 'Toán', schoolYear: '2026-2027', teacherName: 'GV', txCountSemester1: 2, txCountSemester2: 2, updatedAt: '2026-10-17', grades: {
  zero: { studentId: 'zero', studentCode: '01', fullName: 'A', semester1: term(0), semester2: term(null), yearAverage: 0 },
  exempt: { studentId: 'exempt', studentCode: '02', fullName: 'B', semester1: { ...term(8), gk: null, assessmentStatuses: { gk: 'exempt' } }, semester2: term(8), yearAverage: 8 },
  absent: { studentId: 'absent', studentCode: '03', fullName: 'C', semester1: { ...term(null), assessmentStatuses: { ck: 'makeup' } }, semester2: { ...term(null), assessmentStatuses: { gk: 'absent' } }, yearAverage: null },
} });
test('counts zero, exemptions, missing and makeup without treating an empty record as zero', () => {
  const stats = summarizeSubjectBook(make(), 'semester1');
  assert.deepEqual(stats, { pupils: 3, scored: 2, missing: 1, makeup: 1, mean: 4, bins: [1, 0, 0, 1] });
  const year = summarizeSubjectBook(make(), 'year');
  assert.equal(year.makeup, 1);
  assert.equal(year.missing, 2);
});
test('uses the frozen average for a locked semester', () => {
  const book = make(); book.grades.zero.semester1.average = 7;
  book.termLocks = { semester1: { locked: true, at: 'now', actor: 'GV', reason: 'Chốt' } };
  assert.equal(summarizeSubjectBook(book, 'semester1').mean, 7.5);
});
test('reads only the owning account device cache and distinguishes missing/invalid data', () => {
  const config = { ...INITIAL_CLASS_CONFIG, id: 'math', teacherId: 'a', classType: 'subject' as const, subjectName: 'Toán', schoolYear: '2026-2027' };
  let key = '';
  const storage = { getItem: (value: string) => { key = value; return JSON.stringify(make()); } };
  assert.equal(readDeviceGradebook(storage, 'a', config)?.classId, 'math');
  assert.equal(key, 'subject_gradebook_v2_local_a_math');
  assert.equal(readDeviceGradebook(storage, 'b', config), null);
  assert.equal(readDeviceGradebook({ getItem: () => null }, 'a', config), null);
  assert.throws(() => readDeviceGradebook({ getItem: () => 'invalid' }, 'a', config));
  assert.throws(() => readDeviceGradebook({ getItem: () => JSON.stringify({ ...make(), teacherId: 'b' }) }, 'a', config));
});
