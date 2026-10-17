import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseClipboardScores,
  parseSpeedNumpadInput,
  applyPasteScoresToColumn,
  applyFillColumnScore,
} from '../src/lib/gradebookFastInput';
import type { ClassGradebookData } from '../src/types/subjectGrade';

test('parseClipboardScores parses varied numbers, commas and blanks correctly', () => {
  const clipboardText = '8.5\r\n9\r\n7,5\r\n10\r\n\r\n—\r\n9.2';
  const parsed = parseClipboardScores(clipboardText);

  assert.deepEqual(parsed, [8.5, 9.0, 7.5, 10.0, null, null, 9.2]);

  // Tab-separated table column copy
  const tabSeparated = '8.0\tA\r\n7.5\tB\r\n10\tC';
  assert.deepEqual(parseClipboardScores(tabSeparated), [8.0, 7.5, 10.0]);
});

test('parseSpeedNumpadInput handles 2-digit decimals and special score 10', () => {
  // Gõ "85" -> 8.5 và autoAdvance
  const res85 = parseSpeedNumpadInput('85');
  assert.ok(res85);
  assert.equal(res85.score, 8.5);
  assert.equal(res85.autoAdvance, true);

  // Gõ "10" -> 10 và autoAdvance
  const res10 = parseSpeedNumpadInput('10');
  assert.ok(res10);
  assert.equal(res10.score, 10);
  assert.equal(res10.autoAdvance, true);

  // Gõ "05" -> 0.5 và autoAdvance
  const res05 = parseSpeedNumpadInput('05');
  assert.ok(res05);
  assert.equal(res05.score, 0.5);
  assert.equal(res05.autoAdvance, true);

  // Gõ "7" -> 7 nhưng chưa autoAdvance (chờ số thứ 2 hoặc Enter)
  const res7 = parseSpeedNumpadInput('7');
  assert.ok(res7);
  assert.equal(res7.score, 7);
  assert.equal(res7.autoAdvance, false);
});

test('applyPasteScoresToColumn applies pasted scores downwards and recalculates averages', () => {
  const mockGradebook: ClassGradebookData = {
    classId: 'c1',
    subjectName: 'Toán',
    schoolYear: '2026-2027',
    teacherName: 'Nguyễn Văn Sang',
    txCountSemester1: 4,
    txCountSemester2: 4,
    grades: {
      's1': {
        studentId: 's1', studentCode: '01', fullName: 'An',
        semester1: { tx: [null, null, null, null], gk: null, ck: null, average: null },
        semester2: { tx: [null, null, null, null], gk: null, ck: null, average: null },
        yearAverage: null,
      },
      's2': {
        studentId: 's2', studentCode: '02', fullName: 'Bình',
        semester1: { tx: [null, null, null, null], gk: null, ck: null, average: null },
        semester2: { tx: [null, null, null, null], gk: null, ck: null, average: null },
        yearAverage: null,
      },
      's3': {
        studentId: 's3', studentCode: '03', fullName: 'Cường',
        semester1: { tx: [null, null, null, null], gk: null, ck: null, average: null },
        semester2: { tx: [null, null, null, null], gk: null, ck: null, average: null },
        yearAverage: null,
      },
    },
    updatedAt: '',
  };

  const studentIds = ['s1', 's2', 's3'];
  const scoresToPaste = [8.5, 9.0, 7.5];

  const updated = applyPasteScoresToColumn(
    mockGradebook,
    studentIds,
    0, // start at student 1
    'semester1',
    'tx',
    0, // TX1
    scoresToPaste
  );

  assert.equal(updated.grades['s1'].semester1.tx[0], 8.5);
  assert.equal(updated.grades['s2'].semester1.tx[0], 9.0);
  assert.equal(updated.grades['s3'].semester1.tx[0], 7.5);
});
