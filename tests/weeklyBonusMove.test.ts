import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logsForWeek, targetDateForMovedWeek } from '../src/lib/weeklyPeriod';
import { weekBreakdown } from '../src/lib/scoreBreakdown';
import type { ClassConfig, DisciplineLog } from '../src/types';

test('moving weekly bonus points updates weekly scores correctly', () => {
  const config: ClassConfig = {
    id: 'class_1',
    className: '10A8',
    schoolYear: '2026-2027',
    homeroomTeacher: 'Nguyễn Văn Sang',
    baseScore: 10,
    minScore: 0,
    maxScore: 100,
    months: [9, 10, 11, 12, 1, 2, 3, 4, 5],
    semester1Months: [9, 10, 11, 12, 1],
    semester2Months: [2, 3, 4, 5],
    teacherId: 'teacher_1',
    updatedAt: new Date().toISOString(),
    weeks: [
      { weekNumber: 1, month: 9, startDate: '2026-09-07', endDate: '2026-09-13', semester: 1, title: 'Tuần 1' },
      { weekNumber: 2, month: 9, startDate: '2026-09-14', endDate: '2026-09-20', semester: 1, title: 'Tuần 2' },
    ],
  };

  const initialLog: DisciplineLog = {
    id: 'log_bonus_1',
    date: '2026-09-08', // Tuesday in Week 1
    month: 9,
    weekNumber: 1,
    studentId: 'student_1',
    studentCode: 'HS001',
    studentName: 'Nguyễn Văn A',
    behaviorCode: 'TT_W01',
    behaviorDescription: 'Khen thưởng tuần 1',
    type: 'bonus',
    scorePerUnit: 2,
    count: 1,
    totalScore: 2,
    teacherId: 'teacher_1',
    classId: 'class_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const logs: DisciplineLog[] = [initialLog];

  // Week 1 score before moving
  const week1Before = weekBreakdown(logsForWeek(logs, 1), config);
  const week2Before = weekBreakdown(logsForWeek(logs, 2), config);
  assert.equal(week1Before.bonus, 2);
  assert.equal(week1Before.score, 12);
  assert.equal(week2Before.bonus, 0);
  assert.equal(week2Before.score, 10);

  // Move log to Week 2
  const targetWeek = config.weeks.find((w) => w.weekNumber === 2)!;
  const newDate = targetDateForMovedWeek(initialLog.date, targetWeek);
  assert.equal(newDate, '2026-09-15'); // Preserved Tuesday in Week 2

  const movedLog: DisciplineLog = {
    ...initialLog,
    weekNumber: targetWeek.weekNumber,
    month: targetWeek.month,
    date: newDate,
    behaviorDescription: 'Khen thưởng tuần 2',
    periodOrTime: 'Tổng kết Tuần 2',
    note: '(Chuyển từ Tuần 1 sang Tuần 2)',
    updatedAt: new Date().toISOString(),
  };

  const updatedLogs = [movedLog];

  // Week 1 & Week 2 scores after moving
  const week1After = weekBreakdown(logsForWeek(updatedLogs, 1), config);
  const week2After = weekBreakdown(logsForWeek(updatedLogs, 2), config);
  assert.equal(week1After.bonus, 0);
  assert.equal(week1After.score, 10);
  assert.equal(week2After.bonus, 2);
  assert.equal(week2After.score, 12);
});
