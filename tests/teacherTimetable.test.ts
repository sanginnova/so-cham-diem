import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeSlotKey,
  loadTeacherTimetable,
  saveTeacherTimetable,
  getTodayTeachingSlots,
  parseTimetableCell,
  parseTimetableFromText,
  exportTimetableToTsv,
  getWeekDates,
  getMondayOfCurrentWeek,
  SAMPLE_TIMETABLE_SLOTS,
  TeacherTimetable,
} from '../src/lib/teacherTimetable';

test('makeSlotKey creates correct keys', () => {
  assert.equal(makeSlotKey(2, 1), '2_p1');
  assert.equal(makeSlotKey(7, 5), '7_p5');
  assert.equal(makeSlotKey(3, 8), '3_p8');
});

test('parseTimetableCell correctly splits className and subject', () => {
  const c1 = parseTimetableCell('10A8-HĐTN-HN');
  assert.equal(c1.className, '10A8');
  assert.equal(c1.subjectName, 'HĐTN-HN');

  const c2 = parseTimetableCell('12B6-Toán');
  assert.equal(c2.className, '12B6');
  assert.equal(c2.subjectName, 'Toán');

  const c3 = parseTimetableCell('10A8-Ôn Toán');
  assert.equal(c3.className, '10A8');
  assert.equal(c3.subjectName, 'Ôn Toán');

  const c4 = parseTimetableCell('10A17-Toán (P.201)');
  assert.equal(c4.className, '10A17');
  assert.equal(c4.subjectName, 'Toán');
  assert.equal(c4.room, 'P.201');

  const empty = parseTimetableCell('—');
  assert.equal(empty.className, '');
});

test('parseTimetableFromText parses TSV matrix and skips headers', () => {
  const sampleTsv = `Buổi\tTiết\tThời gian\tThứ 2\tThứ 3\tThứ 4\tThứ 5\tThứ 6\tThứ 7
Sáng\tTiết 1\t7h15-8h00\t10A8-HĐTN-HN\t\t\t\t\t
Sáng\tTiết 2\t8h05-8h50\t\t12B6-Toán\t\t12B1-Toán\t\t`;

  const slots = parseTimetableFromText(sampleTsv, 'mon-sat');
  assert.ok(slots['2_p1']);
  assert.equal(slots['2_p1'].className, '10A8');
  assert.equal(slots['2_p1'].subjectName, 'HĐTN-HN');

  assert.ok(slots['3_p2']);
  assert.equal(slots['3_p2'].className, '12B6');
  assert.equal(slots['3_p2'].subjectName, 'Toán');

  assert.ok(slots['5_p2']);
  assert.equal(slots['5_p2'].className, '12B1');
  assert.equal(slots['5_p2'].subjectName, 'Toán');
});

test('getWeekDates calculates accurate dates from Monday', () => {
  const datesSat = getWeekDates('2026-10-19', 'mon-sat');
  assert.equal(datesSat.length, 6);
  assert.equal(datesSat[0].displayDate, '19/10');
  assert.equal(datesSat[5].displayDate, '24/10');

  const datesFri = getWeekDates('2026-10-19', 'mon-fri');
  assert.equal(datesFri.length, 5);
  assert.equal(datesFri[4].displayDate, '23/10');
});

test('SAMPLE_TIMETABLE_SLOTS contains correct entries matching user images', () => {
  assert.equal(SAMPLE_TIMETABLE_SLOTS['2_p1']?.className, '10A8');
  assert.equal(SAMPLE_TIMETABLE_SLOTS['2_p1']?.subjectName, 'HĐTN-HN');
  assert.equal(SAMPLE_TIMETABLE_SLOTS['3_p6']?.className, '10A17');
  assert.equal(SAMPLE_TIMETABLE_SLOTS['5_p6']?.className, '10A8');
  assert.equal(SAMPLE_TIMETABLE_SLOTS['5_p6']?.subjectName, 'Ôn Toán');
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
  assert.equal(initial.mode, 'mon-sat');
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
      '3_p1': { dayOfWeek: 3, period: 1, className: '10A8', subjectName: 'Toán' },
    },
    updatedAt: '',
  };

  const todaySlots = getTodayTeachingSlots(timetable, monday);
  assert.equal(todaySlots.length, 2);
  assert.equal(todaySlots[0].className, '10A17');
  assert.equal(todaySlots[1].className, '10A17');
});

test('exportTimetableToTsv generates tab delimited table string', () => {
  const timetable: TeacherTimetable = {
    teacherId: 'teacher1',
    teacherName: 'Nguyễn Văn Sang',
    schoolYear: '2026-2027',
    semester: 1,
    slots: {
      '2_p1': { dayOfWeek: 2, period: 1, className: '10A8', subjectName: 'HĐTN-HN' },
    },
    updatedAt: '',
  };

  const tsv = exportTimetableToTsv(timetable, 'mon-sat');
  assert.ok(tsv.includes('Buổi\tTiết\tThời gian'));
  assert.ok(tsv.includes('10A8-HĐTN-HN'));
});
