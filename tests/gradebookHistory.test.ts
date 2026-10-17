import test from 'node:test';
import assert from 'node:assert/strict';
import { recordGradebookEdit, changeTermLock } from '../src/lib/gradebookHistory';
import type { ClassGradebookData } from '../src/types/subjectGrade';

const makeBook = (): ClassGradebookData => ({ classId: 'math', teacherId: 'a', subjectName: 'Toán', schoolYear: '2026-2027', teacherName: 'GV', txCountSemester1: 4, txCountSemester2: 4, updatedAt: '2026-10-17', grades: {
  s: { studentId: 's', studentCode: '01', fullName: 'Học sinh', yearAverage: null, semester1: { tx: [null, null, null, null], gk: null, ck: null, average: null }, semester2: { tx: [null, null, null, null], gk: null, ck: null, average: null } },
} });
test('records a zero distinctly from missing score without mutating the original', () => {
  const book = makeBook(); const edited = structuredClone(book);
  edited.grades.s.semester1.tx[0] = 0;
  const result = recordGradebookEdit(book, edited, 'GV A');
  assert.equal(result.history?.length, 1);
  assert.equal(result.history?.[0].before, '[null,null,null,null]');
  assert.equal(result.history?.[0].after, '[0,null,null,null]');
  assert.equal(book.grades.s.semester1.tx[0], null);
});
test('locked term rejects score and column edits, other term stays editable', () => {
  const locked = changeTermLock(makeBook(), 'semester1', 'GV A', 'Chốt HK1');
  const score = structuredClone(locked); score.grades.s.semester1.gk = 9;
  assert.throws(() => recordGradebookEdit(locked, score, 'GV A'), /đã chốt/);
  assert.throws(() => recordGradebookEdit(locked, { ...locked, txCountSemester1: 5 }, 'GV A'), /đã chốt/);
  const other = structuredClone(locked); other.grades.s.semester2.gk = 8;
  assert.equal(recordGradebookEdit(locked, other, 'GV A').history?.length, 2);
  assert.throws(() => changeTermLock(locked, 'semester1', 'GV A', '  '), /lý do/);
  const reopened = changeTermLock(locked, 'semester1', 'GV A', 'Sửa nhầm điểm');
  assert.equal(reopened.termLocks?.semester1?.locked, false);
  assert.equal(reopened.history?.[1].action, 'unlock');
  assert.equal(reopened.calculationVersion, 'weighted-v1');
});
