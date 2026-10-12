import test from 'node:test';
import assert from 'node:assert/strict';
import { planStudentImport } from '../src/lib/studentImport';
import { localDateString, validateLogNumbers } from '../src/lib/logValidation';
import { calculateRank, clampScore, parseFlexibleDate } from '../src/lib/utils';
import type { Student } from '../src/types';
import * as XLSX from 'xlsx';
const old: Student = { id: 's1', studentCode: '419', fullName: 'Old', firstName: 'Old', lastName: '', status: 'active', teacherId: 't1', classId: 'c1', createdAt: 'old', updatedAt: 'old' };
const incoming = { studentCode: '419', fullName: 'New', firstName: 'New', lastName: '', status: 'active' as const, ethnicity: 'Dao' };
test('Excel round trip preserves eight columns, accents and leading zeroes', () => {
  const rows = [{ 'Mã học sinh': '00419', 'Họ đệm': 'Nguyễn Văn', 'Tên': 'Trọng', 'Giới tính': 'Nam', 'Dân tộc': 'Dao', 'Ngày sinh': '16/05/2011', 'Điện thoại phụ huynh': '0912345678', 'Tên phụ huynh': 'Nguyễn Văn Hùng' }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'HocSinh');
  const loaded = XLSX.read(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }), { type: 'array' });
  assert.deepEqual(XLSX.utils.sheet_to_json(loaded.Sheets.HocSinh), rows);
});

test('skip preserves existing students; update preserves ownership and identity', () => {
  const skip = planStudentImport([old], [incoming], 'skip', 't1', 'c1', () => 'new-id', 'now');
  assert.deepEqual(skip.records, [old]); assert.equal(skip.changed.length, 0);
  const update = planStudentImport([old], [incoming], 'update', 't2', 'c2', () => 'new-id', 'now');
  assert.equal(update.updated, 1); assert.equal(update.records[0].teacherId, 't1');
  assert.equal(update.records[0].id, 's1'); assert.equal(update.records[0].ethnicity, 'Dao');
});
test('duplicate codes in the same file produce one student and accurate counts', () => {
  const plan = planStudentImport([], [incoming, { ...incoming, fullName: 'Latest' }], 'update', 't1', 'c1', () => 'new-id', 'now');
  assert.equal(plan.imported, 1); assert.equal(plan.updated, 0); assert.equal(plan.changed.length, 1);
  assert.equal(plan.records[0].fullName, 'Latest');
  assert.throws(() => planStudentImport([], [{ ...incoming, studentCode: '' }], 'update', 't1', 'c1', () => 'id', 'now'));
});
test('reject invalid scores/counts/periods before saving', () => {
  const valid = { scorePerUnit: 0.5, count: 2, month: 10, weekNumber: 5 };
  assert.doesNotThrow(() => validateLogNumbers(valid));
  for (const patch of [{ scorePerUnit: NaN }, { scorePerUnit: -1 }, { count: 0 }, { count: 1.5 }, { month: 13 }, { weekNumber: 0 }]) assert.throws(() => validateLogNumbers({ ...valid, ...patch }));
});
test('local day, date parsing and score boundaries', () => {
  assert.equal(localDateString(new Date(2026, 9, 2, 0, 1)), '2026-10-02');
  assert.equal(parseFlexibleDate('16/05/2011'), '2011-05-16');
  assert.equal(clampScore(20), 10); assert.equal(clampScore(-1), 0);
  assert.equal(clampScore(12, 0, 20), 12);
  for (const [score, rank] of [[9, 'Xuất sắc'], [8, 'Tốt'], [7, 'Khá'], [5, 'Trung bình'], [4.99, 'Yếu']] as const) assert.equal(calculateRank(score), rank);
});
