import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const bundled = buildSync({
  stdin: {
    contents: 'export * from "./src/lib/bulkStudentMatcher";',
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: 'node',
  format: 'cjs',
  write: false,
});

const mod = { exports: {} };
new Function('module', 'exports', bundled.outputFiles[0].text)(mod, mod.exports);
const { matchStudentsFromBulkText } = mod.exports;

const mockStudents = [
  { id: '1', studentCode: '2497', fullName: 'Trần Duy Anh', status: 'active' },
  { id: '2', studentCode: '2456', fullName: 'Phạm Quốc Bảo', status: 'active' },
  { id: '3', studentCode: '2511', fullName: 'Đặng Việt Dũng', status: 'active' },
  { id: '4', studentCode: '834', fullName: 'Lê Trung Dũng', status: 'active' },
  { id: '5', studentCode: '2377', fullName: 'Đặng Ngọc Duy', status: 'active' },
  { id: '6', studentCode: '2334', fullName: 'Phạm Quốc Đại', status: 'active' },
  { id: '7', studentCode: '2283', fullName: 'Kiều Duy Đạt', status: 'active' },
  { id: '8', studentCode: '2373', fullName: 'Phạm Xuân Hòa', status: 'active' },
  { id: '9', studentCode: '1739', fullName: 'Ngô Gia Khánh', status: 'active' },
  { id: '10', studentCode: '162', fullName: 'Nguyễn Anh Khoa', status: 'active' },
  { id: '11', studentCode: '1738', fullName: 'Đặng Văn Nghị', status: 'active' },
  { id: '12', studentCode: '1153', fullName: 'Nguyễn Vũ Yên Nguyên', status: 'active' },
  { id: '13', studentCode: '901', fullName: 'Nguyễn Văn Thắng', status: 'active' },
  { id: '14', studentCode: '902', fullName: 'Nguyễn Minh Trí', status: 'active' },
  { id: '15', studentCode: '903', fullName: 'Trần Trọng Tuyên', status: 'active' },
  { id: '99', studentCode: '999', fullName: 'Học Sinh Đã Nghỉ', status: 'inactive' },
];

test('Matches user exact 15 Excel pasted lines of names', () => {
  const excelText = `Trần Duy Anh
Phạm Quốc Bảo
Đặng Việt Dũng
Lê Trung Dũng
Đặng Ngọc Duy
Phạm Quốc Đại
Kiều Duy Đạt
Phạm Xuân Hòa
Ngô Gia Khánh
Nguyễn Anh Khoa
Đặng Văn Nghị
Nguyễn Vũ Yên Nguyên
Nguyễn Văn Thắng
Nguyễn Minh Trí
Trần Trọng Tuyên`;

  const result = matchStudentsFromBulkText(excelText, mockStudents);
  assert.equal(result.matchedIds.length, 15);
  assert.equal(result.unmatchedLines.length, 0);
  assert.deepEqual(
    result.matchedStudents.map((s) => s.fullName),
    [
      'Trần Duy Anh',
      'Phạm Quốc Bảo',
      'Đặng Việt Dũng',
      'Lê Trung Dũng',
      'Đặng Ngọc Duy',
      'Phạm Quốc Đại',
      'Kiều Duy Đạt',
      'Phạm Xuân Hòa',
      'Ngô Gia Khánh',
      'Nguyễn Anh Khoa',
      'Đặng Văn Nghị',
      'Nguyễn Vũ Yên Nguyên',
      'Nguyễn Văn Thắng',
      'Nguyễn Minh Trí',
      'Trần Trọng Tuyên',
    ]
  );
});

test('Matches names with numbering and tabs from Excel', () => {
  const excelTextWithNumbers = `1	Trần Duy Anh
2.	Phạm Quốc Bảo
3 - Đặng Việt Dũng`;

  const result = matchStudentsFromBulkText(excelTextWithNumbers, mockStudents);
  assert.equal(result.matchedIds.length, 3);
  assert.equal(result.matchedIds.includes('1'), true);
  assert.equal(result.matchedIds.includes('2'), true);
  assert.equal(result.matchedIds.includes('3'), true);
});

test('Matches student codes and case-insensitive/no-accent names', () => {
  const codesAndNoAccent = `2497
pham quoc bao
dang viet dung`;

  const result = matchStudentsFromBulkText(codesAndNoAccent, mockStudents);
  assert.equal(result.matchedIds.length, 3);
  assert.equal(result.matchedIds.includes('1'), true);
  assert.equal(result.matchedIds.includes('2'), true);
  assert.equal(result.matchedIds.includes('3'), true);
});

test('Excludes inactive students (ngừng học)', () => {
  const textWithInactive = `Học Sinh Đã Nghỉ
Trần Duy Anh`;

  const result = matchStudentsFromBulkText(textWithInactive, mockStudents);
  assert.equal(result.matchedIds.length, 1);
  assert.equal(result.matchedIds[0], '1');
  assert.equal(result.unmatchedLines.includes('Học Sinh Đã Nghỉ'), true);
});
