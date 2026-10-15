import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Student } from '../src/types';
import {
  DEFAULT_SEATING_CONFIG,
  autoAssignGroups,
  autoAssignSeatsByGroup,
  autoAssignSeatsBalanced,
  generateSeatingChartDocx,
} from '../src/lib/seatingChart';

const mockStudents: Student[] = [
  { id: 's1', studentCode: 'HS01', fullName: 'Nguyễn Văn An', gender: 'Nam', status: 'active', teacherId: 't1', classId: 'c1', createdAt: 'now', updatedAt: 'now' },
  { id: 's2', studentCode: 'HS02', fullName: 'Trần Thị Bình', gender: 'Nữ', status: 'active', teacherId: 't1', classId: 'c1', createdAt: 'now', updatedAt: 'now' },
  { id: 's3', studentCode: 'HS03', fullName: 'Lê Hoàng Cường', gender: 'Nam', status: 'active', teacherId: 't1', classId: 'c1', createdAt: 'now', updatedAt: 'now' },
  { id: 's4', studentCode: 'HS04', fullName: 'Phạm Thị Dung', gender: 'Nữ', status: 'active', teacherId: 't1', classId: 'c1', createdAt: 'now', updatedAt: 'now' },
  { id: 's5', studentCode: 'HS05', fullName: 'Hoàng Văn Em', gender: 'Nam', status: 'active', teacherId: 't1', classId: 'c1', createdAt: 'now', updatedAt: 'now' },
  { id: 's6', studentCode: 'HS06', fullName: 'Vũ Thị Gấm', gender: 'Nữ', status: 'active', teacherId: 't1', classId: 'c1', createdAt: 'now', updatedAt: 'now' },
  { id: 's7', studentCode: 'HS07', fullName: 'Đỗ Văn Hải', gender: 'Nam', status: 'active', teacherId: 't1', classId: 'c1', createdAt: 'now', updatedAt: 'now' },
  { id: 's8', studentCode: 'HS08', fullName: 'Bùi Thị Lan', gender: 'Nữ', status: 'active', teacherId: 't1', classId: 'c1', createdAt: 'now', updatedAt: 'now' },
];

test('autoAssignGroups divides active students evenly into 4 groups with leaders', () => {
  const result = autoAssignGroups(mockStudents, 4);

  // Each student must have a group
  mockStudents.forEach((s) => {
    assert.ok(result[s.id]?.group, `Student ${s.id} should have a group`);
  });

  // Verify group counts
  const groupCounts: Record<string, number> = {};
  Object.values(result).forEach((info) => {
    groupCounts[info.group] = (groupCounts[info.group] || 0) + 1;
  });

  assert.equal(groupCounts['Tổ 1'], 2);
  assert.equal(groupCounts['Tổ 2'], 2);
  assert.equal(groupCounts['Tổ 3'], 2);
  assert.equal(groupCounts['Tổ 4'], 2);

  // Verify that there is at least one Tổ trưởng per group
  const leaders = Object.values(result).filter((info) => info.duty === 'Tổ trưởng');
  assert.equal(leaders.length, 4);
});

test('autoAssignSeatsByGroup puts group members in matching columns', () => {
  const groups = autoAssignGroups(mockStudents, 4);
  const chart = autoAssignSeatsByGroup(DEFAULT_SEATING_CONFIG, mockStudents, groups);

  // Col 1 desk 1 seat 0 should have a student from Tổ 1
  const t1Member = chart.desks['1_1']?.[0];
  assert.ok(t1Member);
  assert.equal(groups[t1Member].group, 'Tổ 1');

  // Col 2 desk 1 seat 0 should have a student from Tổ 2
  const t2Member = chart.desks['2_1']?.[0];
  assert.ok(t2Member);
  assert.equal(groups[t2Member].group, 'Tổ 2');
});

test('autoAssignSeatsBalanced fills desks and preserves student count', () => {
  const chart = autoAssignSeatsBalanced(DEFAULT_SEATING_CONFIG, mockStudents);
  const seatedIds = Object.values(chart.desks).flatMap((seats) => seats.filter(Boolean));
  assert.equal(seatedIds.length, mockStudents.length);
});

test('generateSeatingChartDocx creates a valid non-empty docx blob', async () => {
  const groups = autoAssignGroups(mockStudents, 4);
  const chart = autoAssignSeatsByGroup(DEFAULT_SEATING_CONFIG, mockStudents, groups);

  const blob = await generateSeatingChartDocx({
    className: '10A8',
    schoolYear: '2026-2027',
    homeroomTeacher: 'Nguyễn Văn Sang',
    students: mockStudents,
    classConfig: {
      id: 'c1',
      teacherId: 't1',
      className: '10A8',
      schoolYear: '2026-2027',
      grade: '10',
      roomNumber: '204',
      baseScore: 10,
      minScore: 0,
      maxScore: 20,
      months: [9, 10, 11, 12, 1],
      weeks: [],
      semester1Months: [9, 10, 11, 12, 1],
      semester2Months: [2, 3, 4, 5],
      classPresident: 'Nguyễn Văn An',
    },
    config: chart,
    groupMap: groups,
  });

  assert.ok(blob);
  assert.ok(blob.size > 1000, 'Blob size should be substantial');
});

test('autoAssignSeatsBalanced supports 4 students per desk configuration', () => {
  const config4 = { ...DEFAULT_SEATING_CONFIG, seatsPerDesk: 4 };
  const chart = autoAssignSeatsBalanced(config4, mockStudents);
  assert.equal(chart.desks['1_1']?.length, 4);
  const totalSeated = Object.values(chart.desks).flatMap((seats) => seats.filter(Boolean));
  assert.equal(totalSeated.length, mockStudents.length);
});

