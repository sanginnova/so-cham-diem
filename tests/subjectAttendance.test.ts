import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeSessionId,
  readDeviceSubjectAttendance,
  saveDeviceSubjectAttendance,
  calculateStudentAttendanceStats,
  exportSubjectAttendanceToExcel,
  type SubjectAttendanceBook,
} from '../src/lib/subjectAttendance';
import type { Student } from '../src/types';

test('subject attendance saves and reads from device storage properly', () => {
  const store: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = val; },
  };

  const initial = readDeviceSubjectAttendance(mockStorage, 'teacher-1', 'class-1', 'Toán', '2026-2027');
  assert.equal(initial.subjectName, 'Toán');
  assert.equal(Object.keys(initial.sessions).length, 0);

  const sessionId = makeSessionId('2026-10-17', 2);
  assert.equal(sessionId, '2026-10-17_p2');

  const updated: SubjectAttendanceBook = {
    ...initial,
    sessions: {
      [sessionId]: {
        id: sessionId,
        date: '2026-10-17',
        periodNumber: 2,
        lessonTitle: 'Đạo hàm hàm số lượng giác',
        records: {
          's1': { status: 'present' },
          's2': { status: 'excused', note: 'Có đơn xin phép' },
          's3': { status: 'unexcused' },
        },
        updatedAt: new Date().toISOString(),
      },
    },
  };

  saveDeviceSubjectAttendance(mockStorage, 'teacher-1', updated);

  const loaded = readDeviceSubjectAttendance(mockStorage, 'teacher-1', 'class-1', 'Toán', '2026-2027');
  assert.equal(Object.keys(loaded.sessions).length, 1);
  assert.equal(loaded.sessions[sessionId].records['s2'].status, 'excused');
  assert.equal(loaded.sessions[sessionId].records['s2'].note, 'Có đơn xin phép');
});

test('subject attendance correctly calculates absence percentages and warnings', () => {
  const book: SubjectAttendanceBook = {
    classId: 'class-1',
    teacherId: 'teacher-1',
    subjectName: 'Toán',
    schoolYear: '2026-2027',
    sessions: {
      'sess1': { id: 'sess1', date: '2026-10-10', periodNumber: 1, records: { s1: { status: 'present' }, s2: { status: 'unexcused' } }, updatedAt: '' },
      'sess2': { id: 'sess2', date: '2026-10-11', periodNumber: 1, records: { s1: { status: 'present' }, s2: { status: 'unexcused' } }, updatedAt: '' },
      'sess3': { id: 'sess3', date: '2026-10-12', periodNumber: 1, records: { s1: { status: 'late' }, s2: { status: 'excused' } }, updatedAt: '' },
      'sess4': { id: 'sess4', date: '2026-10-13', periodNumber: 1, records: { s1: { status: 'present' }, s2: { status: 'present' } }, updatedAt: '' },
      'sess5': { id: 'sess5', date: '2026-10-14', periodNumber: 1, records: { s1: { status: 'present' }, s2: { status: 'truant' } }, updatedAt: '' },
    },
    updatedAt: '',
  };

  // Student 1: 4 present, 1 late (0 absence) -> absencePercent = 0%
  const s1Stats = calculateStudentAttendanceStats(book, 's1');
  assert.equal(s1Stats.totalSessionsHeld, 5);
  assert.equal(s1Stats.presentCount, 4);
  assert.equal(s1Stats.lateCount, 1);
  assert.equal(s1Stats.totalAbsencePeriods, 0);
  assert.equal(s1Stats.absencePercent, 0);
  assert.equal(s1Stats.isBannedWarning, false);

  // Student 2: 1 present, 2 unexcused, 1 excused, 1 truant -> 4 absences out of 5 sessions = 80% >= 20%
  const s2Stats = calculateStudentAttendanceStats(book, 's2');
  assert.equal(s2Stats.totalSessionsHeld, 5);
  assert.equal(s2Stats.presentCount, 1);
  assert.equal(s2Stats.unexcusedCount, 2);
  assert.equal(s2Stats.excusedCount, 1);
  assert.equal(s2Stats.truantCount, 1);
  assert.equal(s2Stats.totalAbsencePeriods, 4);
  assert.equal(s2Stats.absencePercent, 80);
  assert.equal(s2Stats.isBannedWarning, true);
});
