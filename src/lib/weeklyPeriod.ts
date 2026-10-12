import { localDateString } from './logValidation';

export interface ReportPeriodSelection {
  period: 'week' | 'month' | 'semester';
  weekNumber?: number;
  month?: number;
  semester?: 1 | 2;
}

// Week numbers are unique within a class/year. A week can cross a month boundary.
export function logsForWeek<T extends { weekNumber: number }>(logs: T[], weekNumber: number): T[] {
  return logs.filter(log => log.weekNumber === weekNumber);
}

export function currentSchoolWeek<T extends { startDate: string; endDate: string }>(weeks: T[], date = localDateString()): T | undefined {
  return weeks.find(week => week.startDate <= date && date <= week.endDate) || weeks[0];
}

export function targetDateForMovedWeek(
  currentDate: string,
  targetWeek: { startDate: string; endDate: string }
): string {
  if (currentDate >= targetWeek.startDate && currentDate <= targetWeek.endDate) {
    return currentDate;
  }
  const parts = currentDate.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const origDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const origDay = origDate.getUTCDay();
    const startParts = targetWeek.startDate.split('-').map(Number);
    if (startParts.length === 3 && !isNaN(startParts[0]) && !isNaN(startParts[1]) && !isNaN(startParts[2])) {
      const startD = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
      const startDay = startD.getUTCDay();
      const dayOffset = (origDay - startDay + 7) % 7;
      startD.setUTCDate(startD.getUTCDate() + dayOffset);
      const computedStr = startD.toISOString().slice(0, 10);
      if (computedStr >= targetWeek.startDate && computedStr <= targetWeek.endDate) {
        return computedStr;
      }
    }
  }
  return targetWeek.startDate;
}
