import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterEligibleStudents,
  calculateStudentWeights,
  pickRandomStudents,
} from '../src/lib/randomPicker';
import type { Student } from '../src/types';

const mockStudents: Student[] = [
  { id: 's1', studentCode: '01', fullName: 'Nguyễn Văn An' },
  { id: 's2', studentCode: '02', fullName: 'Trần Thị Bình' },
  { id: 's3', studentCode: '03', fullName: 'Lê Văn Cường' },
  { id: 's4', studentCode: '04', fullName: 'Phạm Hồng Dũng' },
];

test('filterEligibleStudents correctly excludes called and absent students', () => {
  const called = new Set(['s1']);
  const absent = new Set(['s3']);

  // Khi bật cả 2 tùy chọn loại trừ
  const eligible1 = filterEligibleStudents(mockStudents, called, absent, {
    excludeCalled: true,
    excludeAbsent: true,
    prioritizeMissingScores: false,
  });
  assert.equal(eligible1.length, 2);
  assert.deepEqual(eligible1.map((s) => s.id), ['s2', 's4']);

  // Khi tắt loại trừ đã gọi
  const eligible2 = filterEligibleStudents(mockStudents, called, absent, {
    excludeCalled: false,
    excludeAbsent: true,
    prioritizeMissingScores: false,
  });
  assert.equal(eligible2.length, 3);
  assert.ok(eligible2.some((s) => s.id === 's1'));
  assert.ok(!eligible2.some((s) => s.id === 's3'));
});

test('calculateStudentWeights gives higher weights to students with fewer scores', () => {
  const scoreCounts: Record<string, number> = {
    s1: 4, // đã có 4 điểm
    s2: 1, // mới có 1 điểm
    s3: 0, // chưa có điểm nào
  };
  const eligible = mockStudents.slice(0, 3);

  const weights = calculateStudentWeights(eligible, scoreCounts, true);

  // s3 (0 điểm) phải có trọng số cao nhất
  // s2 (1 điểm) cao nhì
  // s1 (4 điểm) thấp nhất
  assert.ok(weights[2] > weights[1]);
  assert.ok(weights[1] > weights[0]);
});

test('pickRandomStudents selects specified number of unique students', () => {
  const picked2 = pickRandomStudents(mockStudents, 2);
  assert.equal(picked2.length, 2);
  assert.notEqual(picked2[0].id, picked2[1].id);

  // Chọn vượt quá số lượng học sinh trong danh sách
  const pickedAll = pickRandomStudents(mockStudents, 10);
  assert.equal(pickedAll.length, mockStudents.length);
});
