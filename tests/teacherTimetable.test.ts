import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeSlotKey,
  loadTeacherTimetable,
  saveTeacherTimetable,
  getTodayTeachingSlots,
  TeacherTimetable,
} from '../src/lib/teacherTimetable';

test('makeSlotKey creates correct keys', () => {
  assert.equal(makeSlotKey(2, 1), '2_p1');
  assert.equal(makeSlotKey(7, 5), '7_p5');
});

test('loadTeacherTimetable returns default when empty and persists updates', () => {
  const mockStorage: Record<string, string> = {};
  const storage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
  };

  const initial = loadTeacherTimetable(storage, 'teacher1', 'Nguyễn Văn Sang', '2026-2027', 1);
  assert.equal(initial.teacherName, 'Nguyễn Văn Sang');
  assert.equal(initial.semester, 1);
  assert.deepEqual(initial.slots, {});

  // Lưu một tiết dạy
  const updated: TeacherTimetable = {
    ...initial,
    slots: {
      '2_p1': {
        dayOfWeek: 2,
        period: 1,
        className: '10A17',
        subjectName: 'Toán',
        room: 'P.204',
      },
    },
  };
  saveTeacherTimetable(storage, updated);

  const reloaded = loadTeacherTimetable(storage, 'teacher1', 'Nguyễn Văn Sang', '2026-2027', 1);
  assert.equal(reloaded.slots['2_p1']?.className, '10A17');
  assert.equal(reloaded.slots['2_p1']?.room, 'P.204');
});

test('getTodayTeachingSlots returns slots scheduled for today', () => {
  // Mock date: 2026-10-19 is a Monday (Thứ 2 => dayOfWeek = 2)
  const monday = new Date(2026, 9, 19);

  const timetable: TeacherTimetable = {
    teacherId: 'teacher1',
    teacherName: 'Nguyễn Văn Sang',
    schoolYear: '2026-2027',
    semester: 1,
    slots: {
      '2_p1': { dayOfWeek: 2, period: 1, className: '10A17', subjectName: 'Toán' },
      '2_p2': { dayOfWeek: 2, period: 2, className: '10A17', subjectName: 'Toán' },
      '3_p1': { dayOfWeek: 3, period: 1, className: '10A8', subjectName: 'Toán' }, // Thứ 3
    },
    updatedAt: '',
  };

  const todaySlots = getTodayTeachingSlots(timetable, monday);
  assert.equal(todaySlots.length, 2);
  assert.equal(todaySlots[0].className, '10A17');
  assert.equal(todaySlots[1].className, '10A17');
});
