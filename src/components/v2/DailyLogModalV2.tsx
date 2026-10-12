import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Check,
  Search,
  Users,
  User,
  AlertTriangle,
  Lock,
  PlusCircle,
  Clock,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BehaviorCategory, Student, BehaviorType } from '../../types';
import { formatVietnameseDate, removeVietnameseAccents } from '../../lib/utils';
import { localDateString } from '../../lib/logValidation';
import { getBehaviorSuggestions } from '../../lib/behaviorSuggestions';
import { sameLogEntry } from '../../lib/scoreBreakdown';
import {
  MORNING_PERIODS,
  AFTERNOON_PERIODS,
  OTHER_PERIODS,
} from '../../lib/schoolPeriods';

interface DailyLogModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccessToast?: (msg: string) => void;
  initialStudentId?: string;
  initialWeek?: number;
}

export const DailyLogModalV2: React.FC<DailyLogModalV2Props> = ({
  isOpen,
  onClose,
  onSuccessToast,
  initialStudentId,
  initialWeek,
}) => {
  const {
    students,
    disciplineLogs,
    behaviorCategories,
    classConfig,
    activeAccount,
    userRole,
    isPeriodLocked,
    addDisciplineLog,
    addBulkDisciplineLogs,
  } = useApp();

  const isMonitor = activeAccount?.role === 'monitor' || userRole === 'monitor';
  const canAddViolations = isMonitor ? (activeAccount?.permissions?.canAddViolations ?? true) : true;
  const canAddBonuses = isMonitor ? (activeAccount?.permissions?.canAddBonuses ?? true) : true;

  // Mode: Single vs Bulk
  const [logMode, setLogMode] = useState<'single' | 'bulk'>('single');

  // Form State
  const [eventDate, setEventDate] = useState<string>(
    () => {
      const today = localDateString();
      const week = classConfig.weeks.find(item => item.weekNumber === initialWeek);
      return week && (today < week.startDate || today > week.endDate) ? week.startDate : today;
    }
  );
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    if (initialWeek !== undefined) return initialWeek;
    const today = new Date().getTime();
    for (const w of classConfig.weeks) {
      const s = new Date(w.startDate).getTime();
      const e = new Date(w.endDate).getTime() + 86400000;
      if (today >= s && today <= e) return w.weekNumber;
    }
    return 1;
  });
  const [lessonPeriod, setLessonPeriod] = useState<string>('Tiết 1');
  const [reporter, setReporter] = useState<string>(() => {
    if (activeAccount?.role === 'monitor') {
      return `Lớp trưởng ${activeAccount.displayName}`;
    }
    return classConfig.homeroomTeacher || 'GVCN';
  });
  const [note, setNote] = useState<string>('');
  const [keepContextOpen, setKeepContextOpen] = useState<boolean>(true);

  // Student selection
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedSingleStudent, setSelectedSingleStudent] = useState<Student | null>(() => students.find(student => student.id === initialStudentId) || null);
  const [selectedBulkStudentIds, setSelectedBulkStudentIds] = useState<string[]>([]);

  // Category selection
  const [categoryType, setCategoryType] = useState<BehaviorType>(() => {
    if (isMonitor && !canAddViolations && canAddBonuses) return 'bonus';
    return 'deduct';
  });
  const [categoryGroupFilter, setCategoryGroupFilter] = useState<string>('all');
  const [behaviorSearch, setBehaviorSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<BehaviorCategory | null>(null);
  const [customDescription, setCustomDescription] = useState<string>('');
  const [customScore, setCustomScore] = useState<number>(1);
  const [hasCustomScore, setHasCustomScore] = useState(false);
  const [count, setCount] = useState<number>(1);

  // Bulk Confirmation Dialog
  const [showBulkConfirm, setShowBulkConfirm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const week = classConfig.weeks.find(item => item.startDate <= eventDate && eventDate <= item.endDate);
    if (week) setSelectedWeek(week.weekNumber);
  }, [isOpen, eventDate, classConfig.weeks]);

  // The dialog stays mounted between entries. Follow live catalog updates,
  // including changes received from another device, instead of retaining a copy.
  useEffect(() => {
    if (!selectedCategory) return;
    const latest = behaviorCategories.find((category) => category.id === selectedCategory.id && category.isActive);
    if (!latest) {
      setSelectedCategory(null);
      setHasCustomScore(false);
      setErrorMessage('Hành vi đã bị xóa hoặc ngừng sử dụng. Vui lòng chọn lại.');
      return;
    }
    if (latest !== selectedCategory) setSelectedCategory(latest);
    if (!hasCustomScore) setCustomScore(latest.defaultScore);
  }, [behaviorCategories, selectedCategory, hasCustomScore]);

  // Check period lock
  const isLocked = isPeriodLocked('week', selectedWeek);

  // Filter students based on search
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = removeVietnameseAccents(studentSearch.toLowerCase());
    return students.filter((s) => {
      const name = removeVietnameseAccents(s.fullName.toLowerCase());
      const code = s.studentCode.toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [students, studentSearch]);

  // Categories filtered
  const filteredCategories = useMemo(() => {
    return behaviorCategories.filter((c) => {
      if (!c.isActive) return false;
      if (c.type !== categoryType) return false;
      if (categoryGroupFilter !== 'all' && c.group !== categoryGroupFilter) return false;
      return true;
    });
  }, [behaviorCategories, categoryType, categoryGroupFilter]);
  const behaviorSuggestions = useMemo(() => getBehaviorSuggestions(filteredCategories, behaviorSearch), [filteredCategories, behaviorSearch]);
  const recentSuggestions = useMemo(() => {
    const names = [...disciplineLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter(l => l.type === categoryType).map(l => l.behaviorDescription);
    return [...new Set(names)].flatMap(name => behaviorSuggestions.filter(s => s.name === name)).slice(0, 6);
  }, [disciplineLogs, categoryType, behaviorSuggestions]);
  const duplicateStudents = selectedCategory ? disciplineLogs.filter(l => sameLogEntry(l, {
    studentId: l.studentId, date: eventDate, behaviorCode: selectedCategory.code, behaviorDescription: customDescription || selectedCategory.name, type: categoryType, periodOrTime: lessonPeriod,
  }) && (logMode === 'single' ? l.studentId === selectedSingleStudent?.id : selectedBulkStudentIds.includes(l.studentId))) : [];

  // Distinct groups for category tabs
  const categoryGroups = useMemo(() => {
    const set = new Set<string>();
    behaviorCategories
      .filter((c) => c.type === categoryType && c.group)
      .forEach((c) => set.add(c.group!));
    return Array.from(set);
  }, [behaviorCategories, categoryType]);

  // Handle single select student
  const handleSelectSingleStudent = (st: Student) => {
    setSelectedSingleStudent(st);
  };

  // Handle toggle student in bulk
  const handleToggleBulkStudent = (stId: string) => {
    setSelectedBulkStudentIds((prev) =>
      prev.includes(stId) ? prev.filter((id) => id !== stId) : [...prev, stId]
    );
  };

  // Select all filtered students in bulk
  const handleSelectAllFiltered = () => {
    const ids = filteredStudents.map((s) => s.id);
    setSelectedBulkStudentIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  // Clear bulk selection
  const handleClearBulkSelection = () => {
    setSelectedBulkStudentIds([]);
  };

  // Select category
  const handleSelectCategory = (cat: BehaviorCategory, name: string) => {
    setSelectedCategory(cat);
    setHasCustomScore(false);
    setCustomScore(cat.defaultScore);
    setCustomDescription(name);
  };

  // Submit Single Log
  const handleSubmitSingle = async () => {
    setErrorMessage(null);
    if (isLocked) {
      setErrorMessage(`Tuần ${selectedWeek} đã được Ban Giám Hiệu khóa thi đua. Không thể lưu dữ liệu.`);
      return;
    }
    if (!selectedSingleStudent) {
      setErrorMessage('Vui lòng chọn học sinh được chấm điểm.');
      return;
    }
    if (!selectedCategory && !customDescription.trim()) {
      setErrorMessage('Vui lòng chọn một hành vi hoặc nhập nội dung cụ thể.');
      return;
    }

    try {
      setIsSubmitting(true);
      const d = new Date(eventDate);
      const month = d.getMonth() + 1;
      const behCode = selectedCategory ? selectedCategory.code : 'KHT';
      const behDesc = customDescription.trim() || (selectedCategory ? selectedCategory.name : '');

      await addDisciplineLog({
        date: eventDate,
        month,
        weekNumber: selectedWeek,
        studentId: selectedSingleStudent.id,
        studentCode: selectedSingleStudent.studentCode,
        studentName: selectedSingleStudent.fullName,
        behaviorCode: behCode,
        behaviorDescription: behDesc,
        type: categoryType,
        scorePerUnit: Number(customScore),
        count: Number(count),
        periodOrTime: lessonPeriod,
        reporter: reporter || 'GVCN',
        basisOrRegulation: selectedCategory?.basisOrRegulation || '',
        note: note.trim(),
      });

      const successNotice = `Đã lưu ${selectedSingleStudent.fullName}: ${categoryType === 'deduct' ? '−' : '+'}${Number(customScore) * Number(count)} điểm • Tuần ${selectedWeek} • ${formatVietnameseDate(eventDate)}. Xem tổng kết Tuần ${selectedWeek}.`;
      setToastMessage(successNotice);
      if (onSuccessToast) onSuccessToast(successNotice);

      if (keepContextOpen) {
        // Keep date, week, lessonPeriod, category for fast next entry
        setSelectedSingleStudent(null);
        setNote('');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi lưu bản ghi chấm điểm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Bulk Log
  const handleSubmitBulk = async () => {
    setErrorMessage(null);
    if (isLocked) {
      setErrorMessage(`Tuần ${selectedWeek} đã được khóa thi đua. Không thể ghi nhận hàng loạt.`);
      return;
    }
    if (selectedBulkStudentIds.length === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 học sinh để áp dụng.');
      return;
    }
    if (!selectedCategory && !customDescription.trim()) {
      setErrorMessage('Vui lòng chọn một hành vi hoặc nhập nội dung cụ thể.');
      return;
    }

    try {
      setIsSubmitting(true);
      const d = new Date(eventDate);
      const month = d.getMonth() + 1;
      const behCode = selectedCategory ? selectedCategory.code : 'KHT';
      const behDesc = customDescription.trim() || (selectedCategory ? selectedCategory.name : '');

      const bulkPayloads = selectedBulkStudentIds.map((stId) => {
        const studentObj = students.find((s) => s.id === stId);
        return {
          date: eventDate,
          month,
          weekNumber: selectedWeek,
          studentId: stId,
          studentCode: studentObj?.studentCode || '',
          studentName: studentObj?.fullName || '',
          behaviorCode: behCode,
          behaviorDescription: behDesc,
          type: categoryType,
          scorePerUnit: Number(customScore),
          count: Number(count),
          periodOrTime: lessonPeriod,
          reporter: reporter || 'GVCN',
          basisOrRegulation: selectedCategory?.basisOrRegulation || '',
          note: note.trim(),
        };
      });

      await addBulkDisciplineLogs(bulkPayloads);

      setShowBulkConfirm(false);
      const notice = `Đã ghi nhận thành công cho ${selectedBulkStudentIds.length} học sinh!`;
      setToastMessage(notice);
      if (onSuccessToast) onSuccessToast(notice);

      if (keepContextOpen) {
        setSelectedBulkStudentIds([]);
        setNote('');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi ghi nhận hàng loạt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-3.5 sm:px-5 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    Sổ Chấm Điểm Hàng Ngày
                  </h2>
                  <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 shrink-0">
                    Lớp {classConfig.className}
                  </span>
                </div>
                <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400">
                  Ghi nhận vi phạm & thành tích rèn luyện tức thì theo thời gian thực
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Desktop Mode Switcher */}
              <div className="hidden sm:flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLogMode('single')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    logMode === 'single'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span>1 Học Sinh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogMode('bulk')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    logMode === 'bulk'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Nhiều Học Sinh (Bulk)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mobile Mode Switcher Bar (50/50) */}
          <div className="sm:hidden grid grid-cols-2 bg-slate-200 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold mt-2.5 gap-1">
            <button
              type="button"
              onClick={() => setLogMode('single')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer ${
                logMode === 'single'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>1 Học Sinh</span>
            </button>
            <button
              type="button"
              onClick={() => setLogMode('bulk')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition cursor-pointer ${
                logMode === 'bulk'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Cả Nhóm (Bulk)</span>
            </button>
          </div>
        </div>

        {/* Period Lock Warning */}
        {isLocked && (
          <div className="px-3.5 sm:px-5 py-2.5 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-rose-500 shrink-0" />
              <span>
                <strong>Cảnh báo khóa sổ:</strong> Tuần {selectedWeek} đã được Ban Giám Hiệu khóa thi đua. Bạn chỉ có thể xem, không thể ghi nhận điểm mới.
              </span>
            </div>
            <span className="font-bold text-[10px] px-2 py-0.5 bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 rounded">
              ĐÃ KHÓA
            </span>
          </div>
        )}

        {/* Monitor Role Banner */}
        {isMonitor && (
          <div className="px-3.5 sm:px-5 py-2.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold shrink-0">
                LỚP TRƯỞNG
              </span>
              <span className="truncate">
                Chấm điểm nề nếp cho Lớp <strong>{classConfig.className}</strong>. Người ghi nhận: <strong>Lớp trưởng {activeAccount?.displayName}</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Success Toast inside modal */}
        {toastMessage && (
          <div className="px-3.5 sm:px-5 py-2 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {toastMessage}
            </span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 text-[11px]"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 sm:space-y-5">
          {/* Row 1: Session & Period Configuration */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-850/60 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold mb-1 text-[11px] sm:text-xs">Ngày ghi nhận</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-semibold mb-1 text-[11px] sm:text-xs">Tuần học</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="w-full px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-xs truncate"
              >
                {classConfig.weeks.map((w) => (
                  <option key={w.weekNumber} value={w.weekNumber}>
                    Tuần {w.weekNumber} ({w.startDate.slice(5)} ~ {w.endDate.slice(5)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 font-semibold mb-1 text-[11px] sm:text-xs">Tiết / Thời điểm</label>
              <select
                value={lessonPeriod}
                onChange={(e) => setLessonPeriod(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-xs truncate"
              >
                <optgroup label="☀️ Buổi Sáng (5 tiết)">
                  {MORNING_PERIODS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="🌤️ Buổi Chiều (5 tiết)">
                  {AFTERNOON_PERIODS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="📌 Thời điểm khác / Nội vụ">
                  {OTHER_PERIODS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="block text-slate-500 font-semibold mb-1 text-[11px] sm:text-xs">Người ghi nhận</label>
              <input
                type="text"
                value={reporter}
                onChange={(e) => setReporter(e.target.value)}
                placeholder="GVCN / Lớp trưởng"
                className="w-full px-2 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-xs truncate"
              />
            </div>
          </div>

          {/* Quick Period Selector Chips (Sáng: T1-T5 • Chiều: T6-T10) */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-slate-100/70 dark:bg-slate-800/50 rounded-xl text-[11px]">
            <div className="flex items-center gap-1 overflow-x-auto">
              <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0 mr-1 flex items-center gap-0.5">
                ☀️ Sáng:
              </span>
              {MORNING_PERIODS.slice(0, 5).map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setLessonPeriod(p.value)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition ${
                    lessonPeriod === p.value
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-slate-700 dark:text-slate-300'
                  }`}
                  title={p.label}
                >
                  {p.shortLabel}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto">
              <span className="font-bold text-sky-600 dark:text-sky-400 shrink-0 mr-1 flex items-center gap-0.5">
                🌤️ Chiều:
              </span>
              {AFTERNOON_PERIODS.slice(0, 5).map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setLessonPeriod(p.value)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition ${
                    lessonPeriod === p.value
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-700 hover:bg-sky-100 dark:hover:bg-sky-950/50 text-slate-700 dark:text-slate-300'
                  }`}
                  title={p.label}
                >
                  {p.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Search & Student Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-blue-600" />
                {logMode === 'single'
                  ? 'Bước 1: Tìm & Chọn Học Sinh'
                  : `Bước 1: Chọn Các Học Sinh (${selectedBulkStudentIds.length} đã chọn)`}
              </span>
              {logMode === 'bulk' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearBulkSelection}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    Bỏ chọn hết
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Tìm tên hoặc mã HS (vd: 419, Lan, Sang...)"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Students List Grid */}
            <div className="max-h-40 sm:max-h-36 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2 p-1 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
              {filteredStudents.map((st) => {
                const isSelected =
                  logMode === 'single'
                    ? selectedSingleStudent?.id === st.id
                    : selectedBulkStudentIds.includes(st.id);

                return (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() =>
                      logMode === 'single'
                        ? handleSelectSingleStudent(st)
                        : handleToggleBulkStudent(st.id)
                    }
                    className={`p-2 rounded-xl text-left border transition flex items-center justify-between gap-1 text-xs cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="truncate min-w-0">
                      <div className="font-mono text-[10px] text-slate-400 truncate">{st.studentCode}</div>
                      <div className="truncate font-semibold">{st.fullName}</div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Behavior Category & Points */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                Bước 2: Chọn Hành Vi Vi Phạm / Khen Thưởng
              </span>

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs w-full sm:w-auto">
                <button
                  type="button"
                  disabled={!canAddViolations}
                  onClick={() => {
                    setCategoryType('deduct');
                    setSelectedCategory(null);
                    setCustomDescription('');
                    setCategoryGroupFilter('all');
                  }}
                  className={`px-3 py-1.5 rounded-md transition font-bold text-center ${
                    categoryType === 'deduct'
                      ? 'bg-rose-600 text-white shadow'
                      : !canAddViolations
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : 'text-slate-600 dark:text-slate-400 cursor-pointer'
                  }`}
                  title={!canAddViolations ? 'GVCN chưa cấp quyền chấm điểm trừ cho Lớp trưởng' : ''}
                >
                  Trừ Điểm Vi Phạm
                </button>
                <button
                  type="button"
                  disabled={!canAddBonuses}
                  onClick={() => {
                    setCategoryType('bonus');
                    setSelectedCategory(null);
                    setCustomDescription('');
                    setCategoryGroupFilter('all');
                  }}
                  className={`px-3 py-1.5 rounded-md transition font-bold text-center ${
                    categoryType === 'bonus'
                      ? 'bg-emerald-600 text-white shadow'
                      : !canAddBonuses
                      ? 'opacity-40 cursor-not-allowed text-slate-400'
                      : 'text-slate-600 dark:text-slate-400 cursor-pointer'
                  }`}
                  title={!canAddBonuses ? 'GVCN chưa cấp quyền chấm điểm thưởng cho Lớp trưởng' : ''}
                >
                  Cộng Điểm Thưởng
                </button>
              </div>
            </div>

            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Tìm hành vi cụ thể
              <input type="search" value={behaviorSearch} onChange={e => setBehaviorSearch(e.target.value)}
                placeholder="Gõ nghỉ học, đi muộn, điện thoại, phát biểu..."
                className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs" />
            </label>
            {/* Category Groups Pills with smooth horizontal scrolling */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setCategoryGroupFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                  categoryGroupFilter === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Tất cả nhóm
              </button>
              {categoryGroups.map((grp) => (
                <button
                  type="button"
                  key={grp}
                  onClick={() => setCategoryGroupFilter(grp)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition shrink-0 cursor-pointer ${
                    categoryGroupFilter === grp
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {grp}
                </button>
              ))}
            </div>

            {/* Categories Grid */}
            {!behaviorSearch && recentSuggestions.length > 0 && <div className="flex flex-wrap gap-1.5 text-xs"><span className="text-slate-500 text-[11px]">Dùng gần đây:</span>{recentSuggestions.map(({ category, name }) => <button type="button" key={`${category.id}:${name}`} onClick={() => handleSelectCategory(category, name)} className="border border-blue-200 dark:border-blue-900/50 rounded-lg px-2 py-0.5 text-blue-600 dark:text-blue-400 text-[11px] font-medium">{name}</button>)}</div>}
            {selectedCategory && <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Đã chọn: {customDescription} • {categoryType === 'deduct' ? '−' : '+'}{Math.round(customScore * count * 100) / 100}đ ({count} lần)</p>}
            {duplicateStudents.length > 0 && <p role="alert" className="text-xs text-rose-600 font-semibold">Đã có bản ghi cùng ngày, tiết và hành vi của {duplicateStudents.map(l => l.studentName).join(', ')}. Hãy sửa bản ghi cũ hoặc tăng số lần.</p>}
            <div className="max-h-44 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {behaviorSuggestions.map(({ category: cat, name }) => {
                const isCatSelected = selectedCategory?.id === cat.id && customDescription === name;
                return (
                  <button
                    type="button"
                    key={`${cat.id}:${name}`}
                    onClick={() => handleSelectCategory(cat, name)}
                    className={`p-2.5 rounded-xl border text-left transition flex items-start justify-between gap-2 text-xs cursor-pointer ${
                      isCatSelected
                        ? categoryType === 'deduct'
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 font-bold ring-2 ring-rose-500/20'
                          : 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{cat.code}</div>
                    </div>
                    <span
                      className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full shrink-0 ${
                        cat.type === 'deduct'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200'
                      }`}
                    >
                      {cat.type === 'deduct' ? `-${cat.defaultScore}đ` : `+${cat.defaultScore}đ`}
                    </span>
                  </button>
                );
              })}
              {behaviorSuggestions.length === 0 && <p className="col-span-full text-xs text-slate-500 p-3">Không tìm thấy hành vi phù hợp. Thử từ khóa khác hoặc chọn Tất cả nhóm.</p>}
            </div>
          </div>

          {/* Row 4: Custom Description, Score & Count */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50 dark:bg-slate-850/60 p-2.5 sm:p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold mb-1 text-[11px] sm:text-xs">
                Điểm ({categoryType === 'deduct' ? 'Trừ' : 'Cộng'})
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                max="100"
                value={customScore}
                onChange={(e) => { setHasCustomScore(true); setCustomScore(Number(e.target.value)); }}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-semibold mb-1 text-[11px] sm:text-xs">Số lần</label>
              <input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono font-bold text-sm"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-slate-500 font-semibold mb-1 text-[11px] sm:text-xs">Ghi chú cụ thể (Tùy chọn)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nguyên nhân / chi tiết..."
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-xs"
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        {(errorMessage || toastMessage) && (
          <div role={errorMessage ? 'alert' : 'status'} aria-live="polite" className={`shrink-0 px-4 sm:px-5 py-2 text-xs font-semibold border-t ${errorMessage ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            {errorMessage || toastMessage}
          </div>
        )}
        <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={keepContextOpen}
              onChange={(e) => setKeepContextOpen(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="truncate">Tiếp tục chấm học sinh khác (giữ ngày & tiết)</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 sm:py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Đóng
            </button>

            {logMode === 'single' ? (
              <button
                type="button"
                disabled={isLocked || isSubmitting || !selectedSingleStudent || duplicateStudents.length > 0}
                onClick={handleSubmitSingle}
                className="flex-1 sm:flex-none px-5 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Ghi Nhận'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isLocked || isSubmitting || selectedBulkStudentIds.length === 0 || duplicateStudents.length > 0}
                onClick={() => setShowBulkConfirm(true)}
                className="flex-1 sm:flex-none px-5 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users className="h-4 w-4" />
                <span>Áp Dụng Cho {selectedBulkStudentIds.length} HS</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Bulk Action */}
      {showBulkConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Xác Nhận Ghi Nhận Hàng Loạt
                </h3>
                <p className="text-xs text-slate-500">
                  Thao tác sẽ tạo đồng thời các bản ghi nề nếp
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Số lượng học sinh:</span>
                <span className="font-bold font-mono text-blue-600 dark:text-blue-400">
                  {selectedBulkStudentIds.length} học sinh
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nội dung hành vi:</span>
                <span className="font-bold text-slate-900 dark:text-white text-right">
                  {customDescription || selectedCategory?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mức điểm áp dụng:</span>
                <span
                  className={`font-bold font-mono ${
                    categoryType === 'deduct' ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {categoryType === 'deduct' ? `-${customScore} điểm` : `+${customScore} điểm`} / HS
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thời điểm:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {lessonPeriod} • Ngày {formatVietnameseDate(eventDate)} (Tuần {selectedWeek})
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBulkConfirm(false)}
                className="flex-1 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitBulk}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Đang thực hiện...' : 'Xác Nhận Áp Dụng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
