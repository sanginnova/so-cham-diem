import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateHomeroom, homeroomAlerts, homeroomWordNotes } from '../src/lib/homeroom';
import { scopeBackup } from '../src/lib/scopedBackup';
const config: any = { id: 'class-a', teacherId: 'a', scopeVersion: 2, weeks: [{ weekNumber: 1, month: 9, startDate: '2026-09-07', endDate: '2026-09-13' }, { weekNumber: 2, month: 10, startDate: '2026-10-05', endDate: '2026-10-11' }] };
const students: any[] = [{ id: 'student-a', fullName: 'Học sinh kiểm tra', classId: 'class-a', teacherId: 'a' }];
const row = (extra: any = {}): any => ({ id: 'r1', teacherId: 'a', classId: 'class-a', studentId: 'student-a', kind: 'contact', date: '2026-09-08', data: { summary: 'Trao đổi', followUpDate: '2026-09-10' }, createdBy: 'a', createdAt: 'now', updatedAt: 'now', ...extra });
test('records validate class, real dates, required content and configured weeks', () => {
  assert.doesNotThrow(() => validateHomeroom(row(), students, config));
  assert.throws(() => validateHomeroom(row({ studentId: 'foreign' }), students, config), /không thuộc/);
  assert.throws(() => validateHomeroom(row({ date: '2026-02-30' }), students, config), /Ngày/);
  assert.throws(() => validateHomeroom(row({ data: { summary: ' ' } }), students, config), /nội dung/);
  assert.throws(() => validateHomeroom(row({ kind: 'meeting', studentId: '', data: { weekNumber: '99' } }), students, config), /Tuần/);
});
test('due alerts use supplied current date and suppress completed items', () => {
  const rows = [row(), row({ id: 'done', data: { followUpDate: '2026-09-09', status: 'Đã hoàn thành' } }), row({ id: 'future', data: { followUpDate: '2026-09-12' } })];
  assert.equal(homeroomAlerts(rows, '2026-09-09').length, 0);
  assert.equal(homeroomAlerts(rows, '2026-09-10')[0].overdue, false);
  assert.equal(homeroomAlerts(rows, '2026-09-11')[0].overdue, true);
});
test('Word notes honor selected months and include actual meeting and parent content', () => {
  const notes = homeroomWordNotes([row(), row({ id: 'oct', date: '2026-10-06', data: { summary: 'KHÔNG XUẤT THÁNG 10' } }), row({ id:'meet', kind:'meeting', studentId:'', data:{ weekNumber:'1', positivePoints:'Học tập đã xác nhận', teacherConclusion:'Kết luận thực tế' } })], students, config, [9]);
  assert.match(notes.parentCooperation, /Trao đổi/);
  assert.doesNotMatch(notes.parentCooperation, /KHÔNG XUẤT/);
  assert.match(notes.weeklyLearning[1], /Học tập đã xác nhận/);
  assert.match(notes.weeklyComments[1], /Kết luận thực tế/);
});
test('backup remaps private records and student references to recipient class', () => {
  const source: any = { students, disciplineLogs: [], homeroomRecords: [row()], classConfig: config };
  const imported = scopeBackup(source, 'b', 'b', { ...config, id:'class-b', teacherId:'b' });
  assert.equal(imported.homeroomRecords[0].studentId, imported.students[0].id);
  assert.equal(imported.homeroomRecords[0].classId, 'class-b');
  assert.equal(imported.homeroomRecords[0].teacherId, 'b');
  assert.deepEqual(scopeBackup(imported, 'b', 'b', imported.classConfig), imported);
  assert.throws(() => scopeBackup({ ...source, students: [] }, 'b', 'b', config), /không có/);
});
