import test from 'node:test';
import assert from 'node:assert/strict';
import { rowsForClass, schoolWeeksFrom, validateSchoolYear, defaultWeekOneStart } from '../src/lib/classScope';
import { scopeBackup } from '../src/lib/scopedBackup';
import { INITIAL_CLASS_CONFIG } from '../src/data/initialData';

test('two classes under one teacher keep students and logs separate', () => {
  const rows = [{ classId: 'a', value: 1 }, { classId: 'b', value: 2 }];
  assert.deepEqual(rowsForClass(rows, { ...INITIAL_CLASS_CONFIG, id: 'b', scopeVersion: 2 }), [rows[1]]);
});
test('legacy categories remain in old class and never appear in new class', () => {
  const rows = [{ name: 'old' }, { classId: 'b', name: 'new' }];
  assert.deepEqual(rowsForClass(rows, { ...INITIAL_CLASS_CONFIG, id: 'a' }, true), [rows[0]]);
  assert.deepEqual(rowsForClass(rows, { ...INITIAL_CLASS_CONFIG, id: 'b', scopeVersion: 2 }, true), [rows[1]]);
});
test('validate year and build a calendar from the requested start date', () => {
  assert.equal(validateSchoolYear('2026 – 2027'), '2026-2027');
  assert.throws(() => validateSchoolYear('2026-2028'));
  assert.throws(() => schoolWeeksFrom('2026-02-30'));
  const weeks = schoolWeeksFrom('2026-09-01');
  assert.equal(weeks.length, 35); assert.equal(weeks[0].startDate, '2026-09-01');
  assert.equal(weeks[0].endDate, '2026-09-07'); assert.equal(weeks[1].startDate, '2026-09-08');
  assert.equal(weeks[34].startDate, '2027-04-27');
});

test('week one starts on the containing Monday for Mon–Thu and next Monday for Fri–Sun', () => {
  const expected = [[2022,'2022-09-05'],[2023,'2023-09-04'],[2029,'2029-09-03'],[2024,'2024-09-02'],[2025,'2025-09-08'],[2026,'2026-09-07'],[2027,'2027-09-06']] as const;
  for (const [year, start] of expected) {
    assert.equal(defaultWeekOneStart(`${year}–${year+1}`), start);
    const weeks = schoolWeeksFrom(start);
    assert.equal(new Date(`${weeks[0].startDate}T12:00:00`).getDay(),1);
    assert.equal(new Date(`${weeks[0].endDate}T12:00:00`).getDay(),0);
  }
});
test('restoring same backup into two years does not overwrite document IDs', () => {
  const student: any = { id: 's', classId: 'old', teacherId: 't' };
  const backup = { students: [student], disciplineLogs: [], classConfig: { ...INITIAL_CLASS_CONFIG, schoolYear: 'old' } };
  const configA = { ...INITIAL_CLASS_CONFIG, id: 'a', scopeVersion: 2 as const, schoolYear: '2026-2027' };
  const configB = { ...configA, id: 'b', schoolYear: '2027-2028' };
  const a = scopeBackup(backup, 't', 't', configA); const b = scopeBackup(backup, 't', 't', configB);
  assert.notEqual(a.students[0].id, b.students[0].id);
  assert.equal(a.classConfig.schoolYear, '2026-2027');
  assert.equal(scopeBackup(a, 't', 't', configA).students[0].id, a.students[0].id);
});
