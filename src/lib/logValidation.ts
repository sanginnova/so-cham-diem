export function localDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function validateLogNumbers(log: { scorePerUnit: number; count: number; month: number; weekNumber: number }) {
  if (!Number.isFinite(log.scorePerUnit) || log.scorePerUnit < 0) throw new Error('Điểm cộng/trừ phải là số không âm.');
  if (!Number.isInteger(log.count) || log.count < 1) throw new Error('Số lần phải là số nguyên lớn hơn 0.');
  if (!Number.isInteger(log.month) || log.month < 1 || log.month > 12) throw new Error('Tháng không hợp lệ.');
  if (!Number.isInteger(log.weekNumber) || log.weekNumber < 1 || log.weekNumber > 53) throw new Error('Tuần không hợp lệ.');
}
