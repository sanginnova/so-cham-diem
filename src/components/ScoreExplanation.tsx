import React from 'react';
import { useApp } from '../context/AppContext';
import { monthBreakdown, weekBreakdown, isMonthlyBonus } from '../lib/scoreBreakdown';
import { formatVietnameseDate, formatVietnameseNumber } from '../lib/utils';

export function ScoreExplanation({ studentId, weekNumber, month, onClose }: { studentId: string; weekNumber?: number; month?: number; onClose: () => void }) {
  const { students, disciplineLogs, classConfig, lockedPeriods, isPeriodLocked, getMonthlySummary, getWeeklySummary } = useApp();
  const logs = disciplineLogs.filter(l => l.studentId === studentId);
  const locks = lockedPeriods.filter(p => p.classId === classConfig.id || (!p.classId && classConfig.scopeVersion !== 2));
  const semester = classConfig.semester1Months.includes(month!) ? 1 : 2;
  const lock = locks.find(p => p.isLocked && p.periodType === (month !== undefined ? 'month' : 'week') && p.periodValue === (month ?? weekNumber));
  const semesterLock = locks.find(p => p.isLocked && p.periodType === 'semester' && p.periodValue === semester);
  const legacy = month !== undefined && ((!!(lock || semesterLock) && (lock || semesterLock)!.scoreVersion !== 2) || (classConfig.monthlyAverageFromMonth !== undefined && classConfig.months.indexOf(month) < classConfig.months.indexOf(classConfig.monthlyAverageFromMonth)));
  const monthly = month !== undefined ? monthBreakdown(logs, classConfig, month, w => isPeriodLocked('week', w), legacy) : null;
  const weekly = weekBreakdown(logs.filter(l => l.weekNumber === weekNumber), classConfig, !!lock && lock.scoreVersion !== 2);
  const visibleLogs = monthly ? logs.filter(l => l.month === month) : weekly.logs;
  const score = monthly ? getMonthlySummary(month!).find(s => s.studentId === studentId)?.finalScore : getWeeklySummary(weekNumber!).find(s => s.studentId === studentId)?.finalScore;
  return <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-3"><section role="dialog" aria-modal="true" aria-label="Giải thích điểm" className="bg-white dark:bg-slate-800 rounded-2xl p-5 max-w-2xl w-full max-h-[90dvh] overflow-auto space-y-3">
    <div className="flex justify-between"><h3 className="font-bold">Giải thích điểm • {students.find(s => s.id === studentId)?.fullName}</h3><button onClick={onClose} className="border rounded-lg px-3 py-1">Đóng</button></div>
    <p>{lock ? 'Đã chốt' : 'Đang tính'} • {month !== undefined ? `Tháng ${month}` : `Tuần ${weekNumber}`} • <strong>{formatVietnameseNumber(score || 0)}đ</strong></p>
    <p className="text-sm">{monthly ? getMonthlySummary(month!).find(s => s.studentId === studentId)?.notes : `${classConfig.baseScore} − ${weekly.deduct} + ${weekly.bonus} = ${formatVietnameseNumber(score ?? weekly.score)}đ (không giới hạn điểm tối đa)`}</p>
    {lock?.scores && <p className="text-xs">Kết quả đã lưu khi chốt kỳ: {formatVietnameseNumber(score || 0)}đ.</p>}
    {monthly && <div className="space-y-1 text-sm">{monthly.weeks.map(w => <p key={w.weekNumber}>Tuần {w.weekNumber}: {formatVietnameseNumber(getWeeklySummary(w.weekNumber).find(s => s.studentId === studentId)?.finalScore ?? w.score)}đ • {w.locked ? 'Đã chốt' : 'Đã kết thúc, chưa chốt'}</p>)}<p className="text-xs">Chỉ tính tuần đã kết thúc hoặc đã chốt; tuần đang diễn ra/chưa tới không vào trung bình. Tuần được phân vào tháng theo lịch lớp.</p></div>}
    <div className="space-y-2">{visibleLogs.map(l => <div key={l.id} className="border rounded-lg p-2 text-sm"><strong>{l.behaviorDescription}</strong><p>{formatVietnameseDate(l.date)} • {l.type === 'deduct' ? '−' : '+'}{l.totalScore}đ ({l.count} lần × {l.scorePerUnit}đ) • {isMonthlyBonus(l) ? 'Thưởng riêng tháng' : `Tuần ${l.weekNumber}`}</p></div>)}{!visibleLogs.length && <p>Chưa có bản ghi trong kỳ.</p>}</div>
  </section></div>;
}
