import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseClassTimetableCell,
  parseClassTimetableFromText,
  loadClassTimetable,
  SAMPLE_12B4_CLASS_TIMETABLE_SLOTS,
  SAMPLE_12B4_CLASS_TIMETABLE_RAW_TSV,
} from '../src/lib/classTimetable';
import { detectTimetableModeFromText } from '../src/lib/teacherTimetable';

test('parseClassTimetableCell preserves hyphenated subjects (HĐTN-HN, GDKT-PL, CĐ GDKT-PL)', () => {
  const cell1 = parseClassTimetableCell('HĐTN-HN');
  assert.equal(cell1.subjectName, 'HĐTN-HN');
  assert.equal(cell1.teacherName || '', '');

  const cell2 = parseClassTimetableCell('GDKT-PL');
  assert.equal(cell2.subjectName, 'GDKT-PL');
  assert.equal(cell2.teacherName || '', '');

  const cell3 = parseClassTimetableCell('CĐ GDKT-PL');
  assert.equal(cell3.subjectName, 'CĐ GDKT-PL');
  assert.equal(cell3.teacherName || '', '');

  const cell4 = parseClassTimetableCell('GDQP-AN');
  assert.equal(cell4.subjectName, 'GDQP-AN');
  assert.equal(cell4.teacherName || '', '');

  const cellTeacher1 = parseClassTimetableCell('Toán (Thầy Sang)');
  assert.equal(cellTeacher1.subjectName, 'Toán');
  assert.equal(cellTeacher1.teacherName, 'Thầy Sang');

  const cellTeacher2 = parseClassTimetableCell('Ngữ văn - Cô Mai');
  assert.equal(cellTeacher2.subjectName, 'Ngữ văn');
  assert.equal(cellTeacher2.teacherName, 'Cô Mai');
});

test('SAMPLE_12B4_CLASS_TIMETABLE_SLOTS contains 22 slots matching user timetable', () => {
  const slots = SAMPLE_12B4_CLASS_TIMETABLE_SLOTS;
  const count = Object.keys(slots).length;
  assert.equal(count, 22, `Expected 22 slots for 12B4, got ${count}`);

  // Tiết 1: Thứ 2 HĐTN-HN, Thứ 3 HĐTN-HN, Thứ 4 Địa lí, Thứ 5 Toán, Thứ 6 Ngữ văn
  assert.equal(slots['2_p1']?.subjectName, 'HĐTN-HN');
  assert.equal(slots['3_p1']?.subjectName, 'HĐTN-HN');
  assert.equal(slots['4_p1']?.subjectName, 'Địa lí');
  assert.equal(slots['5_p1']?.subjectName, 'Toán');
  assert.equal(slots['6_p1']?.subjectName, 'Ngữ văn');

  // Tiết 2: Thứ 2 Địa lí, Thứ 3 Toán, Thứ 4 Lịch sử, Thứ 5 Toán, Thứ 6 Ngữ văn
  assert.equal(slots['2_p2']?.subjectName, 'Địa lí');
  assert.equal(slots['3_p2']?.subjectName, 'Toán');
  assert.equal(slots['4_p2']?.subjectName, 'Lịch sử');
  assert.equal(slots['5_p2']?.subjectName, 'Toán');
  assert.equal(slots['6_p2']?.subjectName, 'Ngữ văn');

  // Tiết 3: Thứ 2 Lịch sử, Thứ 3 Ngữ văn, Thứ 4 Vật lí, Thứ 5 GDKT-PL, Thứ 6 Hóa học
  assert.equal(slots['2_p3']?.subjectName, 'Lịch sử');
  assert.equal(slots['3_p3']?.subjectName, 'Ngữ văn');
  assert.equal(slots['4_p3']?.subjectName, 'Vật lí');
  assert.equal(slots['5_p3']?.subjectName, 'GDKT-PL');
  assert.equal(slots['6_p3']?.subjectName, 'Hóa học');

  // Tiết 4: Thứ 2 Vật lí, Thứ 3 GDKT-PL, Thứ 4 Hóa học, Thứ 5 CĐ GDKT-PL, Thứ 6 HĐTN-HN
  assert.equal(slots['2_p4']?.subjectName, 'Vật lí');
  assert.equal(slots['3_p4']?.subjectName, 'GDKT-PL');
  assert.equal(slots['4_p4']?.subjectName, 'Hóa học');
  assert.equal(slots['5_p4']?.subjectName, 'CĐ GDKT-PL');
  assert.equal(slots['6_p4']?.subjectName, 'HĐTN-HN');

  // Tiết 5: Thứ 3 CĐ Địa lí, Thứ 5 CĐ Ngữ văn
  assert.equal(slots['3_p5']?.subjectName, 'CĐ Địa lí');
  assert.equal(slots['5_p5']?.subjectName, 'CĐ Ngữ văn');
});

test('parseClassTimetableFromText parses user raw text accurately', () => {
  const parsed = parseClassTimetableFromText(SAMPLE_12B4_CLASS_TIMETABLE_RAW_TSV, 'mon-fri');
  const count = Object.keys(parsed).length;
  assert.equal(count, 22, `Expected 22 parsed slots, got ${count}`);

  assert.equal(parsed['2_p1']?.subjectName, 'HĐTN-HN');
  assert.equal(parsed['5_p1']?.subjectName, 'Toán');
  assert.equal(parsed['3_p5']?.subjectName, 'CĐ Địa lí');
  assert.equal(parsed['5_p5']?.subjectName, 'CĐ Ngữ văn');
});

test('loadClassTimetable initializes 12B4 with sample timetable', () => {
  const mockStorage = {
    getItem: () => null,
  };
  const table = loadClassTimetable(mockStorage, '12B4', '12B4', '2026-2027', 1);
  assert.equal(Object.keys(table.slots).length, 22);
  assert.equal(table.className, '12B4');
});

test('detectTimetableModeFromText detects mon-fri when Saturday column has no lessons', () => {
  const mode = detectTimetableModeFromText(SAMPLE_12B4_CLASS_TIMETABLE_RAW_TSV);
  assert.equal(mode, 'mon-fri');
});


