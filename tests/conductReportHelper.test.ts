import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanBehaviorDescription,
  formatBonusItemText,
  formatViolationItemText,
  getStudentConductDetail,
} from '../src/lib/conductReportHelper';
import { DisciplineLog } from '../src/types';

test('cleanBehaviorDescription strips bracket prefixes', () => {
  assert.equal(cleanBehaviorDescription('[Thành tích tuần] Đi học đầy đủ'), 'Đi học đầy đủ');
  assert.equal(cleanBehaviorDescription('[Vi phạm] Mất trật tự'), 'Mất trật tự');
  assert.equal(cleanBehaviorDescription('[Điểm cộng] Tổ trưởng gương mẫu'), 'Tổ trưởng gương mẫu');
});

test('formatBonusItemText formats properly', () => {
  assert.equal(formatBonusItemText('2đ đi học đầy đủ', 2, 1), '2đ đi học đầy đủ');
  assert.equal(formatBonusItemText('1 điểm 10 Lý', 1, 1), '1 điểm 10 Lý');
  assert.equal(formatBonusItemText('Lớp trưởng', 3, 1), '3đ Lớp trưởng');
});

test('formatViolationItemText appends count properly', () => {
  assert.equal(formatViolationItemText('Mất trật tự', 1), 'Mất trật tự 1 lần');
  assert.equal(formatViolationItemText('Ngủ trong giờ', 5), 'Ngủ trong giờ (5 lần)');
  assert.equal(formatViolationItemText('Đi học muộn 1 lần', 1), 'Đi học muộn 1 lần');
});

test('getStudentConductDetail aggregates logs by description', () => {
  const dummyLogs: DisciplineLog[] = [
    {
      id: 'l1',
      date: '2026-10-05',
      month: 10,
      weekNumber: 5,
      studentId: 's1',
      studentCode: 'HS01',
      studentName: 'Dương Thị Lan Anh',
      behaviorCode: 'VP01',
      behaviorDescription: 'Mất trật tự',
      type: 'deduct',
      scorePerUnit: 1,
      count: 1,
      totalScore: 1,
      teacherId: 't1',
      classId: 'c1',
      createdAt: '2026-10-05T08:00:00Z',
      updatedAt: '2026-10-05T08:00:00Z',
    },
    {
      id: 'l2',
      date: '2026-10-06',
      month: 10,
      weekNumber: 5,
      studentId: 's1',
      studentCode: 'HS01',
      studentName: 'Dương Thị Lan Anh',
      behaviorCode: 'VP01',
      behaviorDescription: 'Mất trật tự',
      type: 'deduct',
      scorePerUnit: 1,
      count: 1,
      totalScore: 1,
      teacherId: 't1',
      classId: 'c1',
      createdAt: '2026-10-06T08:00:00Z',
      updatedAt: '2026-10-06T08:00:00Z',
    },
    {
      id: 'l3',
      date: '2026-10-07',
      month: 10,
      weekNumber: 5,
      studentId: 's1',
      studentCode: 'HS01',
      studentName: 'Dương Thị Lan Anh',
      behaviorCode: 'TT01',
      behaviorDescription: '2đ đi học đầy đủ',
      type: 'bonus',
      scorePerUnit: 2,
      count: 1,
      totalScore: 2,
      teacherId: 't1',
      classId: 'c1',
      createdAt: '2026-10-07T08:00:00Z',
      updatedAt: '2026-10-07T08:00:00Z',
    },
    {
      id: 'l4',
      date: '2026-10-07',
      month: 10,
      weekNumber: 5,
      studentId: 's1',
      studentCode: 'HS01',
      studentName: 'Dương Thị Lan Anh',
      behaviorCode: 'TT02',
      behaviorDescription: '1đ tổ trưởng',
      type: 'bonus',
      scorePerUnit: 1,
      count: 1,
      totalScore: 1,
      teacherId: 't1',
      classId: 'c1',
      createdAt: '2026-10-07T08:00:00Z',
      updatedAt: '2026-10-07T08:00:00Z',
    },
  ];

  const detail = getStudentConductDetail('s1', dummyLogs);
  assert.equal(detail.violations.length, 1);
  assert.equal(detail.violations[0].count, 2);
  assert.equal(detail.violations[0].formatted, 'Mất trật tự (2 lần)');

  assert.equal(detail.bonuses.length, 2);
  assert.equal(detail.bonusesText, '2đ đi học đầy đủ, 1đ tổ trưởng');
});
