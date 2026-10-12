import React, { useState, useMemo, useEffect } from 'react';
import {
  Lock,
  Unlock,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  History,
  FileSpreadsheet,
  Download,
  Filter,
  Check,
  ArrowRight,
  Info,
  RefreshCw,
  Search,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PeriodLockStatus } from '../../types';
import { formatVietnameseDate, exportToExcel } from '../../lib/utils';
import { UnlockPeriodModalV2 } from './UnlockPeriodModalV2';
import { auditService } from '../../services/auditService';
import { localDateString } from '../../lib/logValidation';

interface PeriodLockManagerV2Props {
  onRefresh?: () => void;
}

export const PeriodLockManagerV2: React.FC<PeriodLockManagerV2Props> = () => {
  const {
    classConfig,
    lockedPeriods,
    toggleLockPeriod,
    isPeriodLocked,
    activeAccount,
    userRole,
  } = useApp();

  const [activeCycleTab, setActiveCycleTab] = useState<'weeks' | 'months' | 'semesters' | 'audit'>('weeks');
  const [statusFilter, setStatusFilter] = useState<'all' | 'locked' | 'open'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Unlock modal target state
  const [unlockTarget, setUnlockTarget] = useState<{
    periodType: 'week' | 'month' | 'semester';
    periodValue: number;
    periodTitle: string;
    lockedBy?: string;
    lockedAt?: string;
    lockReason?: string;
  } | null>(null);

  // In-memory / Firestore audit trail logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  // Load audit logs
  const loadAuditLogs = async () => {
    try {
      setIsLoadingAudit(true);
      const logs = await auditService.getRecentLogs('school_cdnghe01_bqp', 100);
      setAuditLogs(logs);
    } catch (err) {
      console.warn('Could not load remote audit logs:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeCycleTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeCycleTab]);

  // Weeks list (1 to 35)
  const allWeeks = useMemo(() => {
    return classConfig.weeks.length > 0
      ? classConfig.weeks
      : Array.from({ length: 35 }, (_, i) => ({
          weekNumber: i + 1,
          startDate: `2025-09-0${Math.min(9, i + 1)}`,
          endDate: `2025-09-1${Math.min(9, i + 1)}`,
          title: `Tuần ${i + 1}`,
        }));
  }, [classConfig.weeks]);

  // Months list (Tháng 9 -> Tháng 5)
  const allMonths = useMemo(() => {
    return classConfig.months.map(monthNumber => ({ monthNumber, title: `Tháng ${monthNumber} • ${classConfig.schoolYear}`, semester: classConfig.semester1Months.includes(monthNumber) ? 'HK1' : 'HK2' }));
  }, [classConfig]);

  // Semesters list
  const allSemesters = [
    { semesterNumber: 1, title: `Học Kỳ 1 (${classConfig.schoolYear})`, weeksRange: 'Các tuần học kỳ 1' },
    { semesterNumber: 2, title: `Học Kỳ 2 (${classConfig.schoolYear})`, weeksRange: 'Các tuần học kỳ 2' },
  ];

  // Helper to find existing lock details
  const getLockDetail = (periodType: 'week' | 'month' | 'semester', periodValue: number): PeriodLockStatus | undefined => {
    return lockedPeriods.find((p) => p.periodType === periodType && p.periodValue === periodValue);
  };

  // Handle Quick Lock
  const handleLock = async (
    periodType: 'week' | 'month' | 'semester',
    periodValue: number,
    defaultReason?: string
  ) => {
    const reason = defaultReason || `Khóa sổ ${periodType === 'week' ? `Tuần ${periodValue}` : periodType === 'month' ? `Tháng ${periodValue}` : `Học kỳ ${periodValue}`} sau khi Hội đồng bình xét thi đua`;
    if (!await toggleLockPeriod(periodType, periodValue, reason)) return;
    // Audit log
    await auditService.log({
      schoolId: 'school_cdnghe01_bqp',
      actorId: activeAccount?.uid || 'admin',
      actorName: activeAccount?.displayName || 'Ban Giám Hiệu',
      actorRole: userRole,
      action: 'LOCK_PERIOD',
      entityType: 'PeriodLock',
      entityId: `lock_${periodType}_${periodValue}`,
      after: { periodType, periodValue, isLocked: true, reason },
      reason,
    });
  };

  // Handle Unlock confirmation from modal
  const handleConfirmUnlock = async (unlockReason: string) => {
    if (!unlockTarget) return;
    const { periodType, periodValue } = unlockTarget;
    if (!await toggleLockPeriod(periodType, periodValue, unlockReason)) return;
    // Audit log
    await auditService.log({
      schoolId: 'school_cdnghe01_bqp',
      actorId: activeAccount?.uid || 'admin',
      actorName: activeAccount?.displayName || 'Ban Giám Hiệu',
      actorRole: userRole,
      action: 'PERIOD_UNLOCKED',
      entityType: 'PeriodLock',
      entityId: `lock_${periodType}_${periodValue}`,
      after: { periodType, periodValue, isLocked: false, unlockReason },
      reason: unlockReason,
    });
    setUnlockTarget(null);
  };

  // Batch lock past weeks
  const handleBatchLockPastWeeks = async () => {
    const toLock = allWeeks.filter((w) => w.endDate < localDateString() && !isPeriodLocked('week', w.weekNumber));
    const currentWeekNum = Math.max(0, ...toLock.map(w => w.weekNumber));
    if (toLock.length === 0) {
      alert('Tất cả các tuần đã qua đều đã được khóa sổ.');
      return;
    }
    if (confirm(`Bạn có chắc muốn khóa nhanh ${toLock.length} tuần học đã qua (từ Tuần 1 đến Tuần ${currentWeekNum})?`)) {
      for (const w of toLock) await handleLock('week', w.weekNumber, `Khóa sổ định kỳ theo lịch Ban Giám Hiệu (Tuần ${w.weekNumber})`);
    }
  };

  // Export Audit Trail to Excel
  const handleExportAuditExcel = () => {
    const dataToExport = auditLogs.map((log, idx) => ({
      STT: idx + 1,
      'Thời gian': new Date(log.createdAt).toLocaleString('vi-VN'),
      'Người thực hiện': log.actorName,
      'Vai trò': log.actorRole,
      'Hành động':
        log.action === 'LOCK_PERIOD'
          ? 'KHÓA SỔ THI ĐUA'
          : log.action === 'PERIOD_UNLOCKED'
          ? 'MỞ KHÓA THI ĐUA'
          : log.action,
      'Mã chu kỳ / Đối tượng': log.entityId,
      'Lý do giải trình': log.reason || '-',
    }));
    exportToExcel(dataToExport, `Bao_cao_kiem_toan_khoa_so_${new Date().toISOString().split('T')[0]}`);
  };

  // Statistics
  const lockedCount = lockedPeriods.filter((p) => p.isLocked).length;

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>QUẢN LÝ KHÓA SỔ THI ĐUA & KIỂM TOÁN V2</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Chống Sửa Điểm Hồi Tố
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chốt kết quả sau bình xét. Mở khóa bắt buộc có giải trình và lưu vết vĩnh viễn vào Nhật Ký Kiểm Toán (Audit Trail).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleBatchLockPastWeeks}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Khóa nhanh các tuần đã qua</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-750 rounded-2xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveCycleTab('weeks')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeCycleTab === 'weeks'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            📅 Theo Tuần (35 Tuần)
          </button>
          <button
            type="button"
            onClick={() => setActiveCycleTab('months')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeCycleTab === 'months'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🗓️ Theo Tháng (Tháng 9 - 5)
          </button>
          <button
            type="button"
            onClick={() => setActiveCycleTab('semesters')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              activeCycleTab === 'semesters'
                ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            🎓 Theo Học Kỳ (HK1 & HK2)
          </button>
          <button
            type="button"
            onClick={() => setActiveCycleTab('audit')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${
              activeCycleTab === 'audit'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Biên Bản Lưu Vết ({auditLogs.length})</span>
          </button>
        </div>

        {activeCycleTab !== 'audit' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Lọc:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('locked')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                statusFilter === 'locked'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              Đã khóa
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('open')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                statusFilter === 'open'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}
            >
              Đang mở
            </button>
          </div>
        )}
      </div>

      {/* CONTENT TAB 1: 35 TUẦN HỌC */}
      {activeCycleTab === 'weeks' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {allWeeks
            .filter((w) => {
              const locked = isPeriodLocked('week', w.weekNumber);
              if (statusFilter === 'locked') return locked;
              if (statusFilter === 'open') return !locked;
              return true;
            })
            .map((w) => {
              const locked = isPeriodLocked('week', w.weekNumber);
              const lockDetail = getLockDetail('week', w.weekNumber);

              return (
                <div
                  key={w.weekNumber}
                  className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                    locked
                      ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-slate-50/40 dark:bg-slate-850/40'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            Tuần Học Số {w.weekNumber}
                          </h4>
                          {locked && (
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              LOCKED
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {formatVietnameseDate(w.startDate)} → {formatVietnameseDate(w.endDate)}
                        </p>
                      </div>

                      {locked ? (
                        <span className="p-1.5 rounded-lg bg-amber-500 text-white shadow-xs">
                          <Lock className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                          <Unlock className="h-4 w-4" />
                        </span>
                      )}
                    </div>

                    {/* Status Info */}
                    <div className="mt-2 text-[11px] space-y-1">
                      {locked ? (
                        <div className="p-2 rounded-xl bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 space-y-0.5">
                          <div className="font-semibold flex items-center gap-1">
                            <Lock className="h-3 w-3 shrink-0" />
                            <span>Đã khóa thi đua (Chỉ đọc)</span>
                          </div>
                          {lockDetail?.lockedBy && (
                            <div className="text-[10px] text-amber-800 dark:text-amber-300">
                              Khóa bởi: <strong>{lockDetail.lockedBy}</strong>
                            </div>
                          )}
                          {lockDetail?.reason && (
                            <div className="text-[10px] italic opacity-90 line-clamp-1">
                              "{lockDetail.reason}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-400 text-[10px]">
                          <div>Đang mở nhập điểm & xếp loại</div>
                          {lockDetail?.unlockReason && (
                            <div className="mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                              Đã mở lại: "{lockDetail.unlockReason}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div>
                    {locked ? (
                      <button
                        type="button"
                        onClick={() =>
                          setUnlockTarget({
                            periodType: 'week',
                            periodValue: w.weekNumber,
                            periodTitle: `${w.title} (${w.startDate} - ${w.endDate})`,
                            lockedBy: lockDetail?.lockedBy,
                            lockedAt: lockDetail?.lockedAt,
                            lockReason: lockDetail?.reason,
                          })
                        }
                        className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        <span>Mở Khóa (Cần giải trình)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleLock('week', w.weekNumber)}
                        className="w-full py-1.5 px-3 bg-slate-200 hover:bg-amber-500 hover:text-white dark:bg-slate-700 dark:hover:bg-amber-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        <span>Khóa Sổ Tuần Này</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* CONTENT TAB 2: 9 THÁNG HỌC */}
      {activeCycleTab === 'months' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {allMonths.map((m) => {
            const locked = isPeriodLocked('month', m.monthNumber);
            const lockDetail = getLockDetail('month', m.monthNumber);

            return (
              <div
                key={m.monthNumber}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                  locked
                    ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-850/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {m.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">Học kỳ: {m.semester}</p>
                    </div>
                    {locked ? (
                      <span className="p-1.5 rounded-lg bg-amber-500 text-white">
                        <Lock className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <Unlock className="h-4 w-4" />
                      </span>
                    )}
                  </div>

                  <div className="mt-3 text-[11px]">
                    {locked ? (
                      <div className="p-2 rounded-xl bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-[10px]">
                        <div className="font-bold">ĐÃ CHỐT THI ĐUA THÁNG (KHÓA SỔ)</div>
                        {lockDetail?.lockedBy && <div>Khóa bởi: {lockDetail.lockedBy}</div>}
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-750 text-slate-500 text-[10px]">
                        Đang mở tính điểm tháng
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {locked ? (
                    <button
                      type="button"
                      onClick={() =>
                        setUnlockTarget({
                          periodType: 'month',
                          periodValue: m.monthNumber,
                          periodTitle: m.title,
                          lockedBy: lockDetail?.lockedBy,
                          lockedAt: lockDetail?.lockedAt,
                          lockReason: lockDetail?.reason,
                        })
                      }
                      className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      <span>Mở Khóa Tháng (Giải trình)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLock('month', m.monthNumber)}
                      className="w-full py-1.5 px-3 bg-slate-200 hover:bg-amber-500 hover:text-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Khóa Sổ Tháng Này</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONTENT TAB 3: 2 HỌC KỲ */}
      {activeCycleTab === 'semesters' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allSemesters.map((s) => {
            const locked = isPeriodLocked('semester', s.semesterNumber);
            const lockDetail = getLockDetail('semester', s.semesterNumber);

            return (
              <div
                key={s.semesterNumber}
                className={`p-5 rounded-3xl border transition flex flex-col justify-between space-y-4 ${
                  locked
                    ? 'border-amber-400 bg-amber-50/70 dark:bg-amber-950/30'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-850/40'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {s.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">{s.weeksRange}</p>
                    </div>
                    {locked ? (
                      <span className="p-2 rounded-xl bg-amber-500 text-white shadow-md">
                        <Lock className="h-5 w-5" />
                      </span>
                    ) : (
                      <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        <Unlock className="h-5 w-5" />
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    {locked ? (
                      <div className="p-3 rounded-2xl bg-amber-100/70 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-amber-700" />
                          <span>ĐÃ KHÓA SỔ HỌC KỲ HOÀN TẤT</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          Toàn bộ điểm rèn luyện và xếp loại thi đua học kỳ đã được Hội đồng thi đua nhà trường công nhận.
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-400 text-xs">
                        Học kỳ đang diễn ra hoặc đang trong thời gian mở nhập điểm nề nếp.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  {locked ? (
                    <button
                      type="button"
                      onClick={() =>
                        setUnlockTarget({
                          periodType: 'semester',
                          periodValue: s.semesterNumber,
                          periodTitle: s.title,
                          lockedBy: lockDetail?.lockedBy,
                          lockedAt: lockDetail?.lockedAt,
                          lockReason: lockDetail?.reason,
                        })
                      }
                      className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Unlock className="h-4 w-4" />
                      <span>Mở Khóa Học Kỳ (Bắt buộc giải trình BGH)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleLock('semester', s.semesterNumber)}
                      className="w-full py-2 px-4 bg-slate-900 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <Lock className="h-4 w-4" />
                      <span>Khóa Sổ Chốt Thi Đua Học Kỳ</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONTENT TAB 4: BIÊN BẢN LƯU VẾT KIỂM TOÁN (AUDIT TRAIL) */}
      {activeCycleTab === 'audit' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Tổng cộng: {auditLogs.length} bản ghi lưu vết kiểm toán bất biến
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadAuditLogs}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1 cursor-pointer font-semibold"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingAudit ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
              <button
                type="button"
                onClick={handleExportAuditExcel}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Xuất file Excel</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Thời gian</th>
                    <th className="py-2.5 px-3">Người thực hiện</th>
                    <th className="py-2.5 px-3">Vai trò</th>
                    <th className="py-2.5 px-3">Hành động</th>
                    <th className="py-2.5 px-3">Đối tượng</th>
                    <th className="py-2.5 px-3">Lý do giải trình</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        {isLoadingAudit ? 'Đang tải dữ liệu kiểm toán...' : 'Chưa có bản ghi kiểm toán nào.'}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-850/60">
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                          {log.actorName}
                        </td>
                        <td className="py-2 px-3">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {log.actorRole}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {log.action === 'LOCK_PERIOD' ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              <Lock className="h-3 w-3" />
                              Khóa sổ
                            </span>
                          ) : log.action === 'PERIOD_UNLOCKED' ? (
                            <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              <Unlock className="h-3 w-3" />
                              Mở khóa
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                              {log.action}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                          {log.entityId}
                        </td>
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={log.reason}>
                          {log.reason || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* UNLOCK MODAL */}
      {unlockTarget && (
        <UnlockPeriodModalV2
          isOpen={!!unlockTarget}
          onClose={() => setUnlockTarget(null)}
          periodType={unlockTarget.periodType}
          periodValue={unlockTarget.periodValue}
          periodTitle={unlockTarget.periodTitle}
          lockedBy={unlockTarget.lockedBy}
          lockedAt={unlockTarget.lockedAt}
          lockReason={unlockTarget.lockReason}
          onConfirmUnlock={handleConfirmUnlock}
        />
      )}
    </div>
  );
};
