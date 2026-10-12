import type { ClassConfig, DisciplineLog } from '../types';
import { localDateString } from './logValidation';

export const isMonthlyBonus = (log: DisciplineLog) => log.type === 'bonus' && (log.behaviorCode.startsWith('TT_M') || log.behaviorDescription.startsWith('[Thành tích tháng]') || !!log.periodOrTime?.startsWith('Tổng kết Tháng'));
export const rounded = (n: number) => Math.round(n * 100) / 100;
export const limitScore = (n: number, config: ClassConfig) => rounded(Math.max(config.minScore ?? 0, n));
export function weekBreakdown(logs: DisciplineLog[], config: ClassConfig, legacy = false) {
  const applicable = logs.filter(log => legacy || !isMonthlyBonus(log));
  const deduct = rounded(applicable.filter(l => l.type === 'deduct').reduce((n, l) => n + l.totalScore, 0));
  const bonus = rounded(applicable.filter(l => l.type === 'bonus').reduce((n, l) => n + l.totalScore, 0));
  return { logs: applicable, deduct, bonus, score: limitScore(config.baseScore - deduct + bonus, config) };
}
export function monthBreakdown(logs: DisciplineLog[], config: ClassConfig, month: number, isWeekLocked: (week: number) => boolean, legacy = false, today = localDateString(), frozenWeekScore: (week: number) => number | undefined = () => undefined) {
  const monthlyLogs = logs.filter(l => l.month === month);
  const monthlyBonus = rounded(monthlyLogs.filter(isMonthlyBonus).reduce((n, l) => n + l.totalScore, 0));
  const weeks = config.weeks.filter(w => w.month === month && (isWeekLocked(w.weekNumber) || w.endDate < today)).map(w => ({
    weekNumber: w.weekNumber, locked: isWeekLocked(w.weekNumber),
    ...weekBreakdown(logs.filter(l => l.weekNumber === w.weekNumber), config),
  })).map(w => ({ ...w, score: frozenWeekScore(w.weekNumber) ?? w.score }));
  const average = weeks.length ? rounded(weeks.reduce((n, w) => n + w.score, 0) / weeks.length) : null;
  const old = weekBreakdown(monthlyLogs, config, true);
  return { weeks, average, monthlyBonus, legacy, score: legacy ? old.score : limitScore((average ?? config.baseScore) + monthlyBonus, config),
    formula: legacy ? `${config.baseScore} − ${old.deduct} + ${old.bonus}` : `${average === null ? 'Chưa có tuần hoàn tất (điểm nền ' + config.baseScore + ')' : 'Trung bình ' + weeks.length + ' tuần: ' + average} + thưởng tháng ${monthlyBonus}` };
}

export function sameLogEntry(a: Pick<DisciplineLog, 'studentId' | 'date' | 'behaviorCode' | 'behaviorDescription' | 'type' | 'periodOrTime'>, b: typeof a) {
  return a.studentId === b.studentId && a.date === b.date && a.type === b.type && a.behaviorCode === b.behaviorCode && a.behaviorDescription.trim() === b.behaviorDescription.trim() && (a.periodOrTime || '') === (b.periodOrTime || '');
}
