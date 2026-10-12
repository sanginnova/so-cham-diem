import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportToExcel } from '../lib/utils';
import { localDateString } from '../lib/logValidation';

export function PeriodReview({ month, weekNumber }: { month?: number; weekNumber?: number }) {
  const { classConfig, userRole, isPeriodLocked, getMonthlySummary, getWeeklySummary, toggleLockPeriod, updateClassConfig } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fromMonth, setFromMonth] = useState(classConfig.monthlyAverageFromMonth ?? classConfig.months[0]);
  const type = month !== undefined ? 'month' : 'week';
  const value = month ?? weekNumber!;
  const locked = isPeriodLocked(type, value);
  const rows = month !== undefined ? getMonthlySummary(month) : getWeeklySummary(weekNumber!);
  const weeks = classConfig.weeks.filter(w => w.month === month);
  const canClose = month !== undefined ? weeks.length > 0 && weeks.every(w => w.endDate < localDateString() || isPeriodLocked('week', w.weekNumber)) : (classConfig.weeks.find(w => w.weekNumber === weekNumber)?.endDate || '9999') < localDateString();
  return <div className="border rounded-xl p-3 space-y-2 text-sm print:hidden">
    <div className="flex flex-wrap items-center gap-3"><strong>{locked ? 'Đã chốt' : 'Đang tính'} • {month !== undefined ? `Tháng ${month}` : `Tuần ${weekNumber}`}</strong>
      <button className="text-blue-600 underline" onClick={() => exportToExcel(rows.map(s => ({ 'Học sinh': s.fullName, 'Mã HS': s.studentCode, 'Kỳ': value, 'Trạng thái': locked ? 'Đã chốt' : 'Đang tính', 'Điểm trừ': s.totalDeduct, 'Điểm cộng đã ghi': s.totalBonus, 'Điểm tổng kết': s.finalScore, 'Xếp loại': s.rank, 'Giải thích': s.notes })), `Ra_soat_${type}_${value}`)}>Xuất báo cáo rà soát</button>
      {!locked && ['admin', 'owner'].includes(userRole) && <button disabled={busy || !canClose} className="border rounded-lg px-3 py-1 disabled:opacity-40" onClick={async () => { setBusy(true); try { await toggleLockPeriod(type, value, 'Đã rà soát lỗi, điểm thưởng và tổng kết'); } finally { setBusy(false); } }}>Rà soát và chốt kỳ</button>}
    </div>
    {month !== undefined && <><p>Điểm tháng = trung bình các tuần đã kết thúc/đã chốt + thưởng riêng tháng (không giới hạn điểm tối đa). Các kỳ đã khóa giữ kết quả cũ.</p>
      {!locked && userRole !== 'monitor' && <div className="flex flex-wrap gap-2 items-center"><label>Áp dụng trung bình từ tháng <select value={fromMonth} onChange={e => setFromMonth(Number(e.target.value))} className="border rounded p-1 bg-transparent">{classConfig.months.map(m => <option key={m} value={m}>{m}</option>)}</select></label><button disabled={busy} className="border rounded-lg px-3 py-1" onClick={async () => { setBusy(true); setError(''); try { await updateClassConfig({ monthlyAverageFromMonth: fromMonth }); } catch (e) { setError(String(e)); } finally { setBusy(false); } }}>Lưu tháng áp dụng</button></div>}
      <p className="text-xs">Tuần chưa kết thúc không được đưa vào trung bình. Giáo viên rà soát; quản trị viên chốt kỳ.</p></>}
    {error && <p role="alert" className="text-rose-600">{error}</p>}
  </div>;
}
