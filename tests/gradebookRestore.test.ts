import test from 'node:test';
import assert from 'node:assert/strict';
import { previewGradebookRestore, applyGradebookRestore } from '../src/lib/gradebookRestore';
import { changeTermLock } from '../src/lib/gradebookHistory';
import type { ClassGradebookData } from '../src/types/subjectGrade';
const make = (): ClassGradebookData => ({ classId: 'math', teacherId: 'a', subjectName: 'Toán', schoolYear: '2026-2027', teacherName: 'GV', txCountSemester1: 2, txCountSemester2: 2, updatedAt: '2026-10-17', grades: { s: { studentId: 's', studentCode: '01', fullName: 'A', yearAverage: 5, semester1: { tx: [0, 10], gk: 5, ck: 5, average: 5 }, semester2: { tx: [0, 10], gk: 5, ck: 5, average: 5 } } } });
test('previews matching books and rejects a foreign scope or invalid scores/statuses', () => {
  const current = make();
  assert.equal(previewGradebookRestore(JSON.stringify(current), current).changed, 0);
  for (const patch of [{ teacherId: 'b' }, { classId: 'other' }, { subjectName: 'Tin' }, { schoolYear: '2027-2028' }]) assert.throws(() => previewGradebookRestore(JSON.stringify({ ...current, ...patch }), current), /đúng tài khoản/);
  const bad = make(); bad.grades.s.semester1.gk = 11;
  assert.throws(() => previewGradebookRestore(JSON.stringify(bad), current), /cấu trúc/);
  bad.grades.s.semester1.gk = 5; bad.grades.s.semester1.assessmentStatuses = { gk: 'absent' };
  assert.throws(() => previewGradebookRestore(JSON.stringify(bad), current), /để trống/);
});
test('locked semester accepts an identical backup and refuses score changes or unlocking', () => {
  const locked = changeTermLock(make(), 'semester1', 'GV', 'Chốt');
  assert.equal(previewGradebookRestore(JSON.stringify(locked), locked).changed, 0);
  const changed = structuredClone(locked); changed.grades.s.semester1.gk = 7;
  assert.throws(() => previewGradebookRestore(JSON.stringify(changed), locked), /đã chốt/);
  const unlocked = structuredClone(locked); delete unlocked.termLocks;
  assert.throws(() => previewGradebookRestore(JSON.stringify(unlocked), locked), /đã chốt/);
});
test('restore keeps prior history, adds a restore event and initializes omitted pupils with blank grades', () => {
  const current = changeTermLock(make(), 'semester2', 'GV', 'Chốt');
  const unlocked = changeTermLock(current, 'semester2', 'GV', 'Sửa');
  const backup = make(); backup.grades = {};
  const restored = applyGradebookRestore(unlocked, backup, 'GV');
  assert.deepEqual(restored.grades.s.semester1.tx, [null, null]);
  assert.equal(restored.history?.length, 3);
  assert.equal(restored.history?.[2].action, 'restore');
  assert.equal(restored.pendingSync, true);
  assert.equal(unlocked.grades.s.semester1.tx[0], 0);
});
