import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { DisciplineLog, BehaviorType } from '../types';
import { formatVietnameseDate, formatVietnameseNumber, compareVietnameseNames } from '../lib/utils';
import { targetDateForMovedWeek } from '../lib/weeklyPeriod';
import {
  MORNING_PERIODS,
  AFTERNOON_PERIODS,
  ALL_SCHOOL_PERIODS,
  getPeriodBadgeInfo,
} from '../lib/schoolPeriods';
import {
  Edit3,
  Trash2,
  ArrowRightLeft,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  Award,
  Check,
  X,
  History,
  Undo2,
  Calendar,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

export function StudentPointEditor({
  studentId,
  weekNumber,
  month,
  onClose,
}: {
  studentId: string;
  weekNumber?: number;
  month?: number;
  onClose: () => void;
}) {
  const {
    disciplineLogs,
    students,
    classConfig,
    activeAccount,
    behaviorCategories,
    isPeriodLocked,
    updateDisciplineLog,
    deleteDisciplineLog,
    restoreDisciplineLog,
    addDisciplineLog,
    moveDisciplineLogToWeek,
  } = useApp();

  const [filterType, setFilterType] = useState<'all' | 'deduct' | 'bonus'>('all');
  const [editing, setEditing] = useState<DisciplineLog | null>(null);
  const [deleting, setDeleting] = useState<DisciplineLog | null>(null);
  const [deleted, setDeleted] = useState<DisciplineLog | null>(null);
  const [movingLogId, setMovingLogId] = useState<string | null>(null);
  const [targetMoveWeek, setTargetMoveWeek] = useState<number>(weekNumber || 1);

  // Form Thêm mới
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [newType, setNewType] = useState<BehaviorType>('deduct');
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newScore, setNewScore] = useState<number>(1);
  const [newCount, setNewCount] = useState<number>(1);
  const [newDate, setNewDate] = useState(() => {
    if (weekNumber) {
      const w = classConfig.weeks.find((item) => item.weekNumber === weekNumber);
      return w?.startDate || new Date().toISOString().slice(0, 10);
    }
    return new Date().toISOString().slice(0, 10);
  });
  const [newPeriodOrTime, setNewPeriodOrTime] = useState('');
  const [newNote, setNewNote] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [currentStudentId, setCurrentStudentId] = useState<string>(studentId);

  useEffect(() => {
    setCurrentStudentId(studentId);
  }, [studentId]);

  // Sắp xếp danh sách học sinh theo chuẩn tiếng Việt để chuyển tuần tự
  const activeStudents = useMemo(() => {
    return [...students].sort((a, b) => compareVietnameseNames(a, b, 'asc'));
  }, [students]);

  const currentIndex = useMemo(() => {
    return activeStudents.findIndex((s) => s.id === currentStudentId);
  }, [activeStudents, currentStudentId]);

  const prevStudent = currentIndex > 0 ? activeStudents[currentIndex - 1] : null;
  const nextStudent = currentIndex >= 0 && currentIndex < activeStudents.length - 1 ? activeStudents[currentIndex + 1] : null;

  const handlePrevStudent = () => {
    if (prevStudent) {
      setCurrentStudentId(prevStudent.id);
      setFilterType('all');
      setEditing(null);
      setIsAddingOpen(false);
      setNotice('');
      setError('');
    }
  };

  const handleNextStudent = () => {
    if (nextStudent) {
      setCurrentStudentId(nextStudent.id);
      setFilterType('all');
      setEditing(null);
      setIsAddingOpen(false);
      setNotice('');
      setError('');
    }
  };

  // Hỗ trợ phím tắt mũi tên Trái / Phải để chuyển học sinh cực nhanh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (prevStudent) {
          setCurrentStudentId(prevStudent.id);
          setFilterType('all');
          setEditing(null);
          setIsAddingOpen(false);
          setNotice('');
          setError('');
        }
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (nextStudent) {
          setCurrentStudentId(nextStudent.id);
          setFilterType('all');
          setEditing(null);
          setIsAddingOpen(false);
          setNotice('');
          setError('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevStudent, nextStudent]);

  const student = students.find((s) => s.id === currentStudentId);

  // Danh sách các bản ghi thuộc học sinh này trong kỳ đang xét
  const logs = useMemo(() => {
    return disciplineLogs.filter(
      (log) =>
        log.studentId === currentStudentId &&
        (month !== undefined ? log.month === month : log.weekNumber === weekNumber)
    );
  }, [disciplineLogs, currentStudentId, month, weekNumber]);

  const deductLogs = useMemo(() => logs.filter((l) => l.type === 'deduct'), [logs]);
  const bonusLogs = useMemo(() => logs.filter((l) => l.type === 'bonus'), [logs]);

  const totalDeduct = useMemo(
    () => deductLogs.reduce((acc, l) => acc + (l.totalScore ?? l.scorePerUnit * l.count), 0),
    [deductLogs]
  );
  const totalBonus = useMemo(
    () => bonusLogs.reduce((acc, l) => acc + (l.totalScore ?? l.scorePerUnit * l.count), 0),
    [bonusLogs]
  );

  const displayedLogs = useMemo(() => {
    if (filterType === 'deduct') return deductLogs;
    if (filterType === 'bonus') return bonusLogs;
    return logs;
  }, [filterType, logs, deductLogs, bonusLogs]);

  const locked = (log: DisciplineLog) =>
    isPeriodLocked('week', log.weekNumber) ||
    isPeriodLocked('month', log.month) ||
    isPeriodLocked('semester', classConfig.semester1Months.includes(log.month) ? 1 : 2);

  const getWeekAndMonthForDate = (dateStr: string) => {
    const matchingWeek = classConfig.weeks.find((w) => w.startDate <= dateStr && dateStr <= w.endDate);
    if (matchingWeek) {
      return { weekNumber: matchingWeek.weekNumber, month: matchingWeek.month };
    }
    const d = new Date(dateStr);
    const m = !isNaN(d.getTime()) ? d.getMonth() + 1 : 1;
    return { weekNumber: editing?.weekNumber || 1, month: m };
  };

  const targetPeriod = editing?.date ? getWeekAndMonthForDate(editing.date) : null;
  const isTargetLocked = targetPeriod
    ? isPeriodLocked('week', targetPeriod.weekNumber) ||
      isPeriodLocked('month', targetPeriod.month) ||
      isPeriodLocked('semester', classConfig.semester1Months.includes(targetPeriod.month) ? 1 : 2)
    : false;

  const currentPeriodLocked = weekNumber
    ? isPeriodLocked('week', weekNumber)
    : month
    ? isPeriodLocked('month', month)
    : false;

  // Xử lý mở form thêm mới
  const handleStartAdd = (type: BehaviorType) => {
    setNewType(type);
    setNewCategoryCode('');
    setNewDescription(type === 'bonus' ? 'Khen thưởng thành tích học tập / việc tốt' : '');
    setNewScore(type === 'bonus' ? 1.0 : 1.0);
    setNewCount(1);
    setNewPeriodOrTime('');
    setNewNote('');
    setError('');
    setNotice('');
    setIsAddingOpen(true);
    setEditing(null);
    setDeleting(null);
    setMovingLogId(null);
  };

  // Chọn danh mục vi phạm / khen thưởng khi thêm mới
  const handleSelectCategory = (catCode: string) => {
    setNewCategoryCode(catCode);
    const cat = behaviorCategories.find((c) => c.code === catCode);
    if (cat) {
      setNewDescription(cat.name);
      setNewScore(cat.defaultScore);
    }
  };

  // Submit thêm mới
  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    if (!newDescription.trim()) {
      setError('Vui lòng nhập mô tả hoặc lý do.');
      return;
    }
    if (newScore <= 0 || newCount <= 0) {
      setError('Điểm và số lần phải lớn hơn 0.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const targetW =
        classConfig.weeks.find((w) => w.startDate <= newDate && newDate <= w.endDate) ||
        (weekNumber ? classConfig.weeks.find((w) => w.weekNumber === weekNumber) : undefined);

      const targetWNum = targetW?.weekNumber || weekNumber || 1;
      const targetM = targetW?.month || month || 1;

      if (isPeriodLocked('week', targetWNum)) {
        throw new Error(`Tuần ${targetWNum} đã bị khóa thi đua. Không thể thêm bản ghi!`);
      }

      await addDisciplineLog({
        studentId: student.id,
        studentCode: student.studentCode,
        studentName: student.fullName,
        date: newDate,
        weekNumber: targetWNum,
        month: targetM,
        type: newType,
        behaviorCode: newCategoryCode || (newType === 'bonus' ? 'BONUS_CUSTOM' : 'VIOLATION_CUSTOM'),
        behaviorDescription: newDescription.trim(),
        scorePerUnit: Number(newScore),
        count: Number(newCount),
        periodOrTime: newPeriodOrTime.trim() || undefined,
        note: newNote.trim() || undefined,
        reporter: activeAccount?.displayName || classConfig.homeroomTeacher,
        createdBy: activeAccount?.displayName || classConfig.homeroomTeacher,
      });

      setIsAddingOpen(false);
      setNotice(
        `Đã thêm thành công bản ghi ${newType === 'bonus' ? 'khen thưởng (+)' : 'vi phạm (-)'} cho ${student.fullName}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  // Submit chuyển tuần nhanh
  const handleQuickMoveWeek = async (logId: string, toWeek: number) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await moveDisciplineLogToWeek(logId, toWeek);
      setMovingLogId(null);
      setNotice(`Đã chuyển bản ghi sang Tuần ${toWeek} thành công! Điểm tuần đã được cập nhật.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Quản lý & Sửa điểm học sinh"
        className="w-full max-w-3xl max-h-[92dvh] flex flex-col bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-scaleIn"
      >
        {/* HEADER VỚI BỘ ĐIỀU HƯỚNG CHUYỂN HỌC SINH SIÊU TIỆN LỢI */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-2 flex-1 min-w-[280px]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 rounded-md">
                {student?.studentCode}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {student?.fullName}
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                • {month !== undefined ? `Tháng ${month}` : `Tuần ${weekNumber}`}
              </span>

              {currentIndex >= 0 && (
                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                  HS {currentIndex + 1}/{activeStudents.length}
                </span>
              )}
            </div>

            {/* THANH CHỌN NHANH HỌC SINH */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Chuyển sang:</span>
                <select
                  aria-label="Chọn học sinh cần chấm điểm"
                  value={currentStudentId}
                  onChange={(e) => {
                    setCurrentStudentId(e.target.value);
                    setFilterType('all');
                    setEditing(null);
                    setIsAddingOpen(false);
                    setNotice('');
                    setError('');
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs max-w-[240px]"
                >
                  {activeStudents.map((s, idx) => (
                    <option key={s.id} value={s.id}>
                      {idx + 1}. {s.fullName} ({s.studentCode})
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-[11px] text-slate-400 italic hidden md:inline">
                (Phím tắt: ⬅️ Trước | Tiếp ➡️)
              </span>
            </div>
          </div>

          {/* CỤM NÚT ĐIỀU HƯỚNG TRƯỚC / SAU VÀ ĐÓNG */}
          <div className="flex items-center gap-1.5 self-start">
            <button
              type="button"
              disabled={busy || !prevStudent}
              onClick={handlePrevStudent}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-2xs cursor-pointer active:scale-95"
              title="Chuyển sang học sinh trước (Phím mũi tên Trái ⬅️)"
            >
              <ChevronLeft className="h-4 w-4 text-indigo-600" />
              <span>Trước</span>
            </button>

            <button
              type="button"
              disabled={busy || !nextStudent}
              onClick={handleNextStudent}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-2xs cursor-pointer active:scale-95"
              title="Chuyển sang học sinh tiếp theo (Phím mũi tên Phải ➡️)"
            >
              <span>Tiếp</span>
              <ChevronRight className="h-4 w-4 text-indigo-600" />
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer ml-1"
              title="Đóng bảng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* THỐNG KÊ ĐIỂM TỔNG HỢP TRONG KỲ */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-100/80 via-slate-50 to-slate-100/80 dark:from-slate-800/80 dark:via-slate-800/40 dark:to-slate-800/80 border-b border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40">
            <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Vi phạm ({deductLogs.length} lỗi)</p>
            <p className="text-base sm:text-lg font-black font-mono text-rose-700 dark:text-rose-300">
              {totalDeduct > 0 ? `-${formatVietnameseNumber(totalDeduct)}đ` : '0đ'}
            </p>
          </div>

          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40">
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Thưởng ({bonusLogs.length} việc tốt)</p>
            <p className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
              {totalBonus > 0 ? `+${formatVietnameseNumber(totalBonus)}đ` : '0đ'}
            </p>
          </div>

          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-900/40">
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Điểm hiện tại</p>
            <p className="text-base sm:text-lg font-black font-mono text-blue-700 dark:text-blue-300">
              {formatVietnameseNumber(Math.max(0, 10 - totalDeduct + totalBonus))}đ
            </p>
          </div>
        </div>

        {/* THÔNG BÁO LỖI / THÀNH CÔNG */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </span>
            <button onClick={() => setError('')} className="p-1 hover:bg-rose-200/50 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {notice && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-medium">
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{notice}</span>
            </span>
            <button onClick={() => setNotice('')} className="p-1 hover:bg-emerald-200/50 rounded">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {deleted && (
          <div className="mx-4 mt-3 p-2.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl text-xs flex items-center justify-between">
            <span className="text-blue-700 dark:text-blue-300">
              Đã xóa: “{deleted.behaviorDescription}” ({deleted.type === 'deduct' ? '-' : '+'}{deleted.totalScore}đ)
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  await restoreDisciplineLog(deleted);
                  setDeleted(null);
                  setNotice('Đã hoàn tác khôi phục bản ghi thành công.');
                } catch (failure) {
                  setError(failure instanceof Error ? failure.message : String(failure));
                } finally {
                  setBusy(false);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span>Hoàn tác</span>
            </button>
          </div>
        )}

        {/* BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* THANH THAO TÁC: BỘ LỌC VÀ NÚT THÊM MỚI */}
          {!editing && !isAddingOpen && (
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    filterType === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Tất cả ({logs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('deduct')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    filterType === 'deduct'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  Điểm trừ ({deductLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('bonus')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    filterType === 'bonus'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                >
                  Điểm thưởng ({bonusLogs.length})
                </button>
              </div>

              {!currentPeriodLocked && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartAdd('deduct')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                    title="Ghi nhận lỗi vi phạm mới cho học sinh này"
                  >
                    <MinusCircle className="h-3.5 w-3.5" />
                    <span>+ Thêm vi phạm (-)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartAdd('bonus')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                    title="Cộng điểm thưởng hoặc việc tốt cho học sinh này"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span>+ Thêm thưởng (+)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FORM THÊM MỚI (NẾU ĐANG MỞ) */}
          {isAddingOpen && (
            <form
              onSubmit={handleSaveNew}
              className="p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3.5 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-6 w-6 rounded-lg flex items-center justify-center font-bold text-white text-xs ${
                      newType === 'deduct' ? 'bg-rose-600' : 'bg-emerald-600'
                    }`}
                  >
                    {newType === 'deduct' ? '−' : '+'}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {newType === 'deduct' ? 'Ghi nhận lỗi vi phạm mới' : 'Cộng điểm thưởng thành tích mới'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Đóng
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">
                    {newType === 'deduct' ? 'Chọn loại lỗi mẫu (tùy chọn)' : 'Loại khen thưởng'}
                  </label>
                  <select
                    value={newCategoryCode}
                    onChange={(e) => handleSelectCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl"
                  >
                    <option value="">-- Tự nhập nội dung bên dưới --</option>
                    {behaviorCategories
                      .filter((c) => c.type === newType)
                      .map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name} ({newType === 'deduct' ? `-${c.defaultScore}đ` : `+${c.defaultScore}đ`})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    Ngày ghi nhận
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold mb-1">Nội dung hành vi / Việc tốt *</label>
                <input
                  type="text"
                  required
                  placeholder={newType === 'deduct' ? 'VD: Đi học muộn 15 phút, Quên vở bài tập...' : 'VD: Phát biểu xây dựng bài, Giúp đỡ bạn bè...'}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Mức điểm mỗi lần</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    required
                    value={newScore}
                    onChange={(e) => setNewScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Số lần</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={newCount}
                    onChange={(e) => setNewCount(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold">Tiết / Thời điểm</label>
                    <span className="text-[10px] text-slate-400">2 buổi • 5 tiết/buổi</span>
                  </div>
                  <input
                    type="text"
                    list="student-editor-periods-list"
                    placeholder="VD: Tiết 1, Tiết 6 (Tiết 1 Chiều)..."
                    value={newPeriodOrTime}
                    onChange={(e) => setNewPeriodOrTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl"
                  />
                  <datalist id="student-editor-periods-list">
                    {ALL_SCHOOL_PERIODS.map((p) => (
                      <option key={p.value} value={p.value} />
                    ))}
                  </datalist>

                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px]">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">☀️ Sáng:</span>
                    {MORNING_PERIODS.slice(0, 5).map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setNewPeriodOrTime(p.value)}
                        className={`px-1.5 py-0.5 rounded border transition ${
                          newPeriodOrTime === p.value
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p.shortLabel}
                      </button>
                    ))}
                    <span className="font-semibold text-sky-600 dark:text-sky-400 ml-1">🌤️ Chiều:</span>
                    {AFTERNOON_PERIODS.slice(0, 5).map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setNewPeriodOrTime(p.value)}
                        className={`px-1.5 py-0.5 rounded border transition ${
                          newPeriodOrTime === p.value
                            ? 'bg-sky-500 text-white border-sky-500'
                            : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold mb-1">Ghi chú thêm</label>
                <input
                  type="text"
                  placeholder="Ghi chú chi tiết nếu có..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tổng điểm:{' '}
                  <span className={newType === 'deduct' ? 'text-rose-600' : 'text-emerald-600'}>
                    {newType === 'deduct' ? '−' : '+'}
                    {formatVietnameseNumber(newScore * newCount)}đ
                  </span>
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingOpen(false)}
                    className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                      newType === 'deduct' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    {busy ? 'Đang lưu…' : 'Xác nhận thêm'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* HỘP THOẠI XÁC NHẬN XÓA (NẾU ĐANG CHỌN XÓA) */}
          {deleting && (
            <div
              role="alertdialog"
              aria-label="Xác nhận xóa bản ghi"
              className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-2xl space-y-3 animate-fadeIn"
            >
              <div className="flex items-start gap-2.5">
                <Trash2 className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                    Xác nhận xóa bản ghi “{deleting.behaviorDescription}”?
                  </h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                    Ngày: {formatVietnameseDate(deleting.date)} • Mức điểm:{' '}
                    {deleting.type === 'deduct' ? '-' : '+'}
                    {formatVietnameseNumber(deleting.totalScore ?? deleting.scorePerUnit * deleting.count)}đ.
                    Sau khi xóa, điểm tổng kết của {student?.fullName} sẽ được tự động tính toán lại.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDeleting(null)}
                  className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold hover:bg-white dark:hover:bg-slate-700"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={busy || locked(deleting)}
                  onClick={async () => {
                    setBusy(true);
                    setError('');
                    setNotice('');
                    try {
                      if (locked(deleting)) {
                        throw new Error('Tuần, tháng hoặc học kỳ của bản ghi đã bị khóa thi đua. Không thể xóa.');
                      }
                      await deleteDisciplineLog(
                        deleting.id,
                        activeAccount?.displayName || classConfig.homeroomTeacher
                      );
                      setDeleted(deleting);
                      setDeleting(null);
                      setNotice('Đã xóa thành công bản ghi. Điểm tổng kết đã được cập nhật.');
                    } catch (failure) {
                      setError(failure instanceof Error ? failure.message : String(failure));
                    } finally {
                      setBusy(false);
                    }
                  }}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  {busy ? 'Đang xóa…' : 'Xóa vĩnh viễn'}
                </button>
              </div>
            </div>
          )}

          {/* FORM SỬA BẢN GHI (NẾU ĐANG SỬA) */}
          {editing && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                setNotice('');
                try {
                  if (locked(editing)) {
                    throw new Error('Tuần, tháng hoặc học kỳ của bản ghi đã khóa. Không thể sửa.');
                  }
                  if (isTargetLocked && targetPeriod) {
                    throw new Error(
                      `Tuần ${targetPeriod.weekNumber} hoặc Tháng ${targetPeriod.month} đã khóa thi đua. Không thể lưu!`
                    );
                  }

                  await updateDisciplineLog(
                    editing.id,
                    {
                      date: editing.date,
                      weekNumber: editing.weekNumber,
                      type: editing.type,
                      scorePerUnit: editing.scorePerUnit,
                      count: editing.count,
                      behaviorDescription: editing.behaviorDescription.trim(),
                      periodOrTime: editing.periodOrTime,
                      note: editing.note || '',
                    },
                    activeAccount?.displayName || classConfig.homeroomTeacher
                  );

                  const wasMoved =
                    targetPeriod &&
                    ((weekNumber !== undefined && targetPeriod.weekNumber !== weekNumber) ||
                      (month !== undefined && targetPeriod.month !== month));

                  setEditing(null);
                  setNotice(
                    wasMoved
                      ? `Đã lưu chỉnh sửa. Bản ghi đã được chuyển sang Tuần ${targetPeriod.weekNumber} (Tháng ${targetPeriod.month}).`
                      : 'Đã lưu chỉnh sửa. Điểm tổng kết đã được cập nhật.'
                  );
                } catch (failure) {
                  setError(failure instanceof Error ? failure.message : String(failure));
                } finally {
                  setBusy(false);
                }
              }}
              className="p-4 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-3.5 animate-fadeIn"
            >
              <div className="flex items-center justify-between pb-2 border-b border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4 text-blue-600" />
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                    Chỉnh sửa bản ghi điểm
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Đóng
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Loại điểm</label>
                  <select
                    disabled={busy}
                    value={editing.type}
                    onChange={(e) =>
                      setEditing({ ...editing, type: e.target.value as 'deduct' | 'bonus' })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl font-bold"
                  >
                    <option value="deduct">Trừ điểm (−)</option>
                    <option value="bonus">Điểm thưởng (+)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Tuần áp dụng (Chuyển tuần)</label>
                  <select
                    disabled={busy}
                    value={targetPeriod?.weekNumber || editing.weekNumber}
                    onChange={(e) => {
                      const wNum = Number(e.target.value);
                      const targetW = classConfig.weeks.find((w) => w.weekNumber === wNum);
                      if (targetW) {
                        const newD = targetDateForMovedWeek(editing.date, targetW);
                        setEditing({
                          ...editing,
                          date: newD,
                          weekNumber: targetW.weekNumber,
                          month: targetW.month,
                        });
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl font-bold text-amber-700 dark:text-amber-400"
                  >
                    {classConfig.weeks.map((w) => (
                      <option
                        key={w.weekNumber}
                        value={w.weekNumber}
                        disabled={isPeriodLocked('week', w.weekNumber)}
                      >
                        Tuần {w.weekNumber} (Tháng {w.month})
                        {isPeriodLocked('week', w.weekNumber) ? ' - [Đã khóa]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">
                    {editing.type === 'deduct' ? 'Ngày vi phạm' : 'Ngày ghi nhận'}
                  </label>
                  <input
                    type="date"
                    required
                    disabled={busy}
                    value={editing.date}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl font-medium"
                  />
                </div>
              </div>

              {targetPeriod && (
                <div className="text-xs flex flex-wrap items-center gap-1.5 text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800 p-2.5 rounded-xl border border-blue-200 dark:border-blue-800">
                  <span>
                    📅 Thuộc <strong>Tuần {targetPeriod.weekNumber}</strong> (Tháng {targetPeriod.month})
                  </span>
                  {weekNumber !== undefined && targetPeriod.weekNumber !== weekNumber && (
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      • Lưu ý: Bản ghi sẽ chuyển từ Tuần {weekNumber} sang Tuần {targetPeriod.weekNumber}
                    </span>
                  )}
                  {isTargetLocked && (
                    <span className="text-rose-600 dark:text-rose-400 font-bold w-full mt-1">
                      ⚠️ Tuần {targetPeriod.weekNumber} đã bị khóa thi đua! Vui lòng chọn tuần khác.
                    </span>
                  )}
                </div>
              )}

              <div className="text-xs">
                <label className="block font-semibold mb-1">Nội dung hành vi / Việc tốt</label>
                <input
                  type="text"
                  required
                  disabled={busy}
                  value={editing.behaviorDescription}
                  onChange={(e) => setEditing({ ...editing, behaviorDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Điểm mỗi lần</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    disabled={busy}
                    value={editing.scorePerUnit}
                    onChange={(e) => setEditing({ ...editing, scorePerUnit: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Số lần</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    disabled={busy}
                    value={editing.count}
                    onChange={(e) =>
                      setEditing({ ...editing, count: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold">Tiết / Thời điểm</label>
                    <span className="text-[10px] text-slate-400">2 buổi • 5 tiết/buổi</span>
                  </div>
                  <input
                    type="text"
                    list="student-editor-periods-list"
                    disabled={busy}
                    value={editing.periodOrTime || ''}
                    onChange={(e) => setEditing({ ...editing, periodOrTime: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl"
                  />

                  {/* Quick Select Buttons for Edit */}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px]">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">☀️ Sáng:</span>
                    {MORNING_PERIODS.slice(0, 5).map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setEditing({ ...editing, periodOrTime: p.value })}
                        className={`px-1.5 py-0.5 rounded border transition ${
                          editing.periodOrTime === p.value
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p.shortLabel}
                      </button>
                    ))}
                    <span className="font-semibold text-sky-600 dark:text-sky-400 ml-1">🌤️ Chiều:</span>
                    {AFTERNOON_PERIODS.slice(0, 5).map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setEditing({ ...editing, periodOrTime: p.value })}
                        className={`px-1.5 py-0.5 rounded border transition ${
                          editing.periodOrTime === p.value
                            ? 'bg-sky-500 text-white border-sky-500'
                            : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="text-xs">
                <label className="block font-semibold mb-1">Ghi chú / Lý do sửa</label>
                <input
                  type="text"
                  disabled={busy}
                  value={editing.note || ''}
                  onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold">
                  Tổng điểm mới:{' '}
                  <span className={editing.type === 'deduct' ? 'text-rose-600' : 'text-emerald-600'}>
                    {editing.type === 'deduct' ? '−' : '+'}
                    {formatVietnameseNumber(editing.scorePerUnit * editing.count)}đ
                  </span>
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setEditing(null)}
                    className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={busy || locked(editing) || isTargetLocked}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
                  >
                    {busy ? 'Đang lưu…' : 'Lưu chỉnh sửa'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* DANH SÁCH BẢN GHI */}
          <div className="space-y-2.5">
            {displayedLogs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Chưa có bản ghi{' '}
                  {filterType === 'deduct'
                    ? 'trừ điểm nào'
                    : filterType === 'bonus'
                    ? 'điểm thưởng nào'
                    : 'nào'}
                  {' '}cho {student?.fullName} trong kỳ này.
                </p>
                {!currentPeriodLocked && (
                  <div className="flex justify-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleStartAdd('deduct')}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200"
                    >
                      + Thêm vi phạm (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartAdd('bonus')}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200"
                    >
                      + Thêm thưởng (+)
                    </button>
                  </div>
                )}
              </div>
            ) : (
              displayedLogs.map((log) => {
                const isDeduct = log.type === 'deduct';
                const isItemLocked = locked(log);
                const scoreValue = log.totalScore ?? log.scorePerUnit * log.count;
                const isMoving = movingLogId === log.id;

                return (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-2xl border transition ${
                      isDeduct
                        ? 'bg-white dark:bg-slate-800 border-rose-200/80 dark:border-rose-900/50 hover:border-rose-300'
                        : 'bg-white dark:bg-slate-800 border-emerald-200/80 dark:border-emerald-900/50 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 px-2 py-1 rounded-lg text-xs font-mono font-black shrink-0 ${
                            isDeduct
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          }`}
                        >
                          {isDeduct ? '−' : '+'}
                          {formatVietnameseNumber(scoreValue)}đ
                        </span>

                        <div className="space-y-0.5">
                          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                            {log.behaviorDescription}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>📅 {formatVietnameseDate(log.date)}</span>
                            <span>• Tuần {log.weekNumber}</span>
                            {log.count > 1 && (
                              <span>• {log.count} lần × {formatVietnameseNumber(log.scorePerUnit)}đ</span>
                            )}
                            {log.periodOrTime && (
                              <span className="inline-flex items-center gap-1 font-medium">
                                • {getPeriodBadgeInfo(log.periodOrTime).sessionText === 'Sáng' && '☀️'}
                                {getPeriodBadgeInfo(log.periodOrTime).sessionText === 'Chiều' && '🌤️'}
                                {log.periodOrTime}
                              </span>
                            )}
                            {log.reporter && <span>• Báo cáo: {log.reporter}</span>}
                          </div>

                          {log.note && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-0.5">
                              Ghi chú: {log.note}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* NÚT THAO TÁC TRÊN BẢN GHI: SỬA, CHUYỂN TUẦN, XÓA */}
                      <div className="shrink-0 flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busy || isItemLocked}
                          onClick={() => {
                            setEditing({ ...log });
                            setDeleting(null);
                            setIsAddingOpen(false);
                            setMovingLogId(null);
                            setError('');
                            setNotice('');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 rounded-lg transition disabled:opacity-40 cursor-pointer"
                          title="Sửa chi tiết điểm, ngày, mô tả hoặc chuyển tuần"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Sửa</span>
                        </button>

                        <button
                          type="button"
                          disabled={busy || isItemLocked}
                          onClick={() => {
                            setMovingLogId(isMoving ? null : log.id);
                            setTargetMoveWeek(log.weekNumber);
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition disabled:opacity-40 cursor-pointer ${
                            isMoving
                              ? 'bg-amber-500 text-white'
                              : 'text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/60'
                          }`}
                          title="Chuyển điểm này sang tuần khác"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Chuyển tuần</span>
                        </button>

                        <button
                          type="button"
                          disabled={busy || isItemLocked}
                          onClick={() => {
                            setDeleting(log);
                            setEditing(null);
                            setIsAddingOpen(false);
                            setMovingLogId(null);
                            setError('');
                            setNotice('');
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 rounded-lg transition disabled:opacity-40 cursor-pointer"
                          title="Xóa bản ghi điểm này"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>

                    {/* KHUNG CHỌN CHUYỂN TUẦN NHANH */}
                    {isMoving && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-750 flex flex-wrap items-center justify-between gap-2 bg-amber-50/60 dark:bg-amber-950/40 p-2.5 rounded-xl">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-amber-900 dark:text-amber-300">
                            Chuyển sang:
                          </span>
                          <select
                            value={targetMoveWeek}
                            onChange={(e) => setTargetMoveWeek(Number(e.target.value))}
                            className="px-2.5 py-1 bg-white dark:bg-slate-700 border border-amber-300 dark:border-amber-700 rounded-lg font-bold text-xs"
                          >
                            {classConfig.weeks.map((w) => (
                              <option
                                key={w.weekNumber}
                                value={w.weekNumber}
                                disabled={isPeriodLocked('week', w.weekNumber)}
                              >
                                Tuần {w.weekNumber} (Tháng {w.month})
                                {isPeriodLocked('week', w.weekNumber) ? ' [Đã khóa]' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setMovingLogId(null)}
                            className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            disabled={busy || targetMoveWeek === log.weekNumber || isPeriodLocked('week', targetMoveWeek)}
                            onClick={() => handleQuickMoveWeek(log.id, targetMoveWeek)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                          >
                            Xác nhận chuyển
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* LỊCH SỬ CHỈNH SỬA MINH BẠCH */}
          <details className="text-xs pt-2">
            <summary className="cursor-pointer font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1.5 select-none">
              <History className="h-3.5 w-3.5" />
              <span>Xem nhật ký lịch sử chỉnh sửa ({logs.flatMap((l) => l.history || []).length} lượt)</span>
            </summary>
            <div className="mt-2 space-y-1 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
              {logs.flatMap((log) =>
                (log.history || []).map((entry, index) => (
                  <p key={`${log.id}:${index}`} className="text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{new Date(entry.timestamp).toLocaleString('vi-VN')}</span> •{' '}
                    <strong>{entry.editorName}</strong>: {entry.newValue || entry.previousValue || entry.action}
                  </p>
                ))
              )}
            </div>
          </details>
        </div>

        {/* FOOTER VỚI NÚT ĐIỀU HƯỚNG */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !prevStudent}
              onClick={handlePrevStudent}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4 text-indigo-600" />
              <span>Học sinh trước</span>
            </button>

            <button
              type="button"
              disabled={busy || !nextStudent}
              onClick={handleNextStudent}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-35 disabled:cursor-not-allowed flex items-center gap-1 transition shadow-2xs cursor-pointer"
            >
              <span>Học sinh tiếp theo</span>
              <ChevronRight className="h-4 w-4 text-indigo-600" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {currentPeriodLocked && (
              <span className="text-amber-600 font-semibold flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3.5 w-3.5" />
                Kỳ này đã bị khóa thi đua.
              </span>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
            >
              Đóng bảng
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
