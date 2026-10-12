import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const bundled = buildSync({ stdin: { contents: 'export * from "./src/lib/scoreBreakdown"; export * from "./src/lib/attendanceStats";', resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', write: false });
const mod = { exports: {} };
new Function('module', 'exports', bundled.outputFiles[0].text)(mod, mod.exports);
const { monthBreakdown, weekBreakdown, sameLogEntry, classifyAttendance, calculateAttendanceStats } = mod.exports;
const config = { baseScore: 10, minScore: 0, maxScore: 10, weeks: [1, 2, 3, 4].map(weekNumber => ({ weekNumber, month: 9, endDate: `2026-09-${String(weekNumber * 7).padStart(2, '0')}` })) };
const log = (weekNumber, type, totalScore, more = {}) => ({ studentId: 's1', date: '2026-09-01', month: 9, weekNumber, type, totalScore, behaviorCode: 'L03', behaviorDescription: 'Nghỉ học không phép', periodOrTime: 'Tiết 1', ...more });
const logs = [log(1, 'deduct', 3), log(2, 'deduct', 6), log(3, 'deduct', 5), log(3, 'bonus', 10, { behaviorCode: 'T01' })];
test('Four-week example is 9; legacy formula remains 6', () => {
  assert.equal(monthBreakdown(logs, config, 9, () => false, false, '2026-10-01').score, 9);
  assert.equal(monthBreakdown(logs, config, 9, () => false, true, '2026-10-01').score, 6);
});
test('Monthly reward applies once to month, never to weekly score', () => {
  const reward = log(2, 'bonus', 2, { behaviorCode: 'TT_M01' });
  assert.equal(weekBreakdown([...logs.filter(l => l.weekNumber === 2), reward], config).score, 4);
  assert.equal(monthBreakdown([...logs, reward], config, 9, () => false, false, '2026-10-01').score, 11);
  assert.equal(monthBreakdown([...logs, { ...reward, totalScore: 20 }], config, 9, () => false, false, '2026-10-01').score, 29);
});
test('Future/current weeks excluded, locked weeks included, empty weeks retain base', () => {
  const current = monthBreakdown(logs, config, 9, () => false, false, '2026-09-14');
  assert.equal(current.weeks.length, 1);
  assert.equal(current.score, 7);
  assert.equal(monthBreakdown(logs, config, 9, w => w === 2, false, '2026-09-14').score, 5.5);
  assert.equal(monthBreakdown([], config, 9, () => false, false, '2026-10-01').score, 10);
});
test('Week crossing month boundary includes the whole week; month reward stays in its month', () => {
  const crossing = log(1, 'deduct', 2, { month: 10 });
  assert.equal(monthBreakdown([crossing], { ...config, weeks: config.weeks.slice(0, 1) }, 9, () => false, false, '2026-10-10').score, 8);
});
test('Same code with different specific behavior is not a duplicate', () => {
  const a = log(1, 'deduct', 3);
  assert.equal(sameLogEntry(a, { ...a }), true);
  assert.equal(sameLogEntry(a, { ...a, behaviorDescription: 'Ngủ trong giờ học' }), false);
  assert.equal(sameLogEntry(a, { ...a, periodOrTime: 'Tiết 2' }), false);
  assert.equal(sameLogEntry(a, { ...a, studentId: 's2' }), false);
});
test('Frozen week scores are used in the monthly average', () => {
  const result = monthBreakdown(logs, config, 9, () => true, false, '2026-10-01', w => w === 1 ? 9 : undefined);
  assert.equal(result.score, 9.5);
});

test('Attendance classification correctly identifies all excused, unexcused, and truancy patterns', () => {
  // Excused absences
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: 'L15', behaviorDescription: 'Nghỉ học có phép' }), 'excused');
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: 'L09', behaviorDescription: 'Nghỉ học có phép (bị sốt xuất huyết)' }), 'excused');
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: 'P', behaviorDescription: 'Nghỉ ốm' }), 'excused');
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: 'CP', behaviorDescription: 'Gia đình có việc bận xin nghỉ' }), 'excused');
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: 'L02', behaviorDescription: 'Bị ốm nghỉ học', note: 'Phụ huynh có gửi đơn' }), 'excused');

  // Unexcused absences
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: 'L09', behaviorDescription: 'Trốn tiết, nghỉ học tự do' }), 'truancy');
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: 'L09', behaviorDescription: 'Nghỉ học không phép' }), 'unexcused');
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: 'KP', behaviorDescription: 'Vắng không phép' }), 'unexcused');
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: 'L01', behaviorDescription: 'Nghỉ học' }), 'unexcused');
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: '', behaviorDescription: 'Vắng mặt không lý do' }), 'unexcused');

  // Truancy
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: 'BT', behaviorDescription: 'Bỏ tiết' }), 'truancy');
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: 'L09_BT', behaviorDescription: 'Trốn tiết giữa giờ' }), 'truancy');

  // False positives must NOT be classified as absences
  assert.equal(classifyAttendance({ type: 'bonus', behaviorCode: 'T01', behaviorDescription: 'Chuyên cần tháng xuất sắc (100% không nghỉ)' }), null);
  assert.equal(classifyAttendance({ type: 'deduct', behaviorCode: 'L05', behaviorDescription: 'Không chú ý nghe giảng, nói chuyện riêng' }), null);

  // Statistics calculation
  const sampleLogs = [
    { type: 'deduct', behaviorCode: 'L15', behaviorDescription: 'Nghỉ có phép', count: 2 },
    { type: 'deduct', behaviorCode: 'L09', behaviorDescription: 'Nghỉ không phép', count: 1 },
    { type: 'deduct', behaviorCode: 'BT', behaviorDescription: 'Bỏ tiết 4', count: 1 },
  ];
  const stats = calculateAttendanceStats(sampleLogs);
  assert.equal(stats.excusedAbsenceCount, 2);
  assert.equal(stats.unexcusedAbsenceCount, 1);
  assert.equal(stats.truancyCount, 1);
});
