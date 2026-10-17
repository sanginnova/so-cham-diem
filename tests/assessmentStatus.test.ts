import test from 'node:test';
import assert from 'node:assert/strict';
import { assessmentValue, needsAssessmentFollowup, setAssessmentStatus } from '../src/lib/assessmentStatus';
import { changeTermLock, recordGradebookEdit } from '../src/lib/gradebookHistory';
import type { ClassGradebookData } from '../src/types/subjectGrade';
const create = (): ClassGradebookData => ({ classId: 'math', subjectName: 'Toán', schoolYear: '2026-2027', teacherName: 'GV', updatedAt: 'now', txCountSemester1: 2, txCountSemester2: 2, grades: { s: { studentId: 's', studentCode: '01', fullName: 'A', yearAverage: 5, semester1: { tx: [0, 10], gk: 5, ck: 5, average: 5 }, semester2: { tx: [0, 10], gk: 5, ck: 5, average: 5 } } } });
test('status replaces a score with null, preserves zero in other cells and exports a readable label', () => {
  const original = create();
  const changed = setAssessmentStatus(original, 's', 'semester1', 'tx', 1, 'absent');
  assert.equal(original.grades.s.semester1.tx[1], 10);
  assert.equal(changed.grades.s.semester1.tx[1], null);
  assert.equal(assessmentValue(changed.grades.s.semester1, 'tx', 0), 0);
  assert.equal(assessmentValue(changed.grades.s.semester1, 'tx', 1), 'Vắng kiểm tra');
  assert.equal(needsAssessmentFollowup(changed.grades.s.semester1, 'makeup'), true);
  assert.equal(needsAssessmentFollowup(changed.grades.s.semester1, 'missing'), true);
  assert.equal(original.grades.s.semester2, changed.grades.s.semester2);
});
test('exempt cells do not count as missing; clearing exemption requires a new score', () => {
  const changed = setAssessmentStatus(create(), 's', 'semester1', 'gk', 0, 'exempt');
  assert.equal(needsAssessmentFollowup(changed.grades.s.semester1, 'missing'), false);
  assert.equal(needsAssessmentFollowup(changed.grades.s.semester1, 'makeup'), false);
  const cleared = setAssessmentStatus(changed, 's', 'semester1', 'gk', 0, '');
  assert.equal(cleared.grades.s.semester1.gk, null);
  assert.equal(needsAssessmentFollowup(cleared.grades.s.semester1, 'missing'), true);
});
test('status changes are audited and blocked in a locked semester', () => {
  const original = create();
  const next = setAssessmentStatus(original, 's', 'semester1', 'ck', 0, 'makeup');
  assert.equal(needsAssessmentFollowup(next.grades.s.semester1, 'makeup'), true);
  const audited = recordGradebookEdit(original, next, 'GV');
  assert.ok(audited.history?.some(event => event.detail.includes('Trạng thái')));
  const locked = changeTermLock(next, 'semester1', 'GV', 'Chốt');
  assert.throws(() => setAssessmentStatus(locked, 's', 'semester1', 'ck', 0, ''), /đã chốt/);
  assert.throws(() => setAssessmentStatus(original, 's', 'semester1', 'tx', 9, 'absent'), /Cột điểm/);
});
