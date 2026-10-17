import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  CalendarCheck,
  Sparkles,
  Download,
  Printer,
  Plus,
  Trash2,
  CheckCircle2,
  Edit2,
  ChevronRight,
  ExternalLink,
  Layers,
  MapPin,
  Copy,
  ClipboardPaste,
  ChevronLeft,
  CalendarDays,
  FileSpreadsheet,
  Check,
  RotateCcw,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  TeacherTimetable,
  TimetableSlot,
  TimetableMode,
  getDaysOfWeek,
  PERIOD_HOURS,
  PERIOD_SESSION_INFO,
  makeSlotKey,
  loadTeacherTimetable,
  saveTeacherTimetable,
  getTodayTeachingSlots,
  exportTeacherTimetableToExcel,
  getMondayOfCurrentWeek,
  getWeekDates,
  parseTimetableFromText,
  detectTimetableModeFromText,
  getTeacherDefaultTimetableMode,
  setTeacherDefaultTimetableMode,
  exportTimetableToTsv,
  SAMPLE_TIMETABLE_SLOTS,
  getTimetableSlotsForWeek,
  setTimetableSlotsForWeek,
  copyTimetableFromWeekToWeek,
  copyTimetableWeekToRange,
  setWeekAsDefaultTimetable,
} from '../lib/teacherTimetable';
import { schoolWeeksFrom, defaultWeekOneStart } from '../lib/classScope';
import { TabType } from './Navbar';

interface TeacherTimetableViewProps {
  onNavigateTab: (tab: TabType) => void;
}

export function TeacherTimetableView({ onNavigateTab }: TeacherTimetableViewProps) {
  const {
    activeAccount,
    classConfig,
    workspaceClasses,
    selectWorkspaceClass,
  } = useApp();

  const teacherName = activeAccount?.displayName || classConfig.homeroomTeacher || 'Nguyễn Văn Sang';
  const teacherId = activeAccount?.uid || 'teacher_sang';
  const schoolYear = classConfig.schoolYear || '2026-2027';

  const [semester, setSemester] = useState<1 | 2>(1);
  const [timetable, setTimetable] = useState<TeacherTimetable>(() => {
    return loadTeacherTimetable(localStorage, teacherId, teacherName, schoolYear, 1);
  });

  const [defaultMode, setDefaultMode] = useState<TimetableMode>(() => {
    return getTeacherDefaultTimetableMode(localStorage, teacherId);
  });

  // 2 Dạng TKB: Mặc định Thứ 2 - Thứ 6 (5 ngày) hoặc Thứ 2 - Thứ 7 (6 ngày)
  const [mode, setMode] = useState<TimetableMode>(timetable.mode || defaultMode);
  const [defaultSaveToast, setDefaultSaveToast] = useState(false);

  // Lưu dạng TKB hiện tại làm mặc định cho mọi lần mở sau
  const handleSaveCurrentModeAsDefault = () => {
    setTeacherDefaultTimetableMode(localStorage, teacherId, mode);
    setDefaultMode(mode);
    const nextTable: TeacherTimetable = {
      ...timetable,
      mode,
    };
    setTimetable(nextTable);
    saveTeacherTimetable(localStorage, nextTable);
    setDefaultSaveToast(true);
    setTimeout(() => setDefaultSaveToast(false), 2500);
  };

  // Danh sách 35 tuần chuẩn của năm học
  const allSchoolWeeks = useMemo(() => {
    try {
      const start = defaultWeekOneStart(schoolYear);
      return schoolWeeksFrom(start, 35);
    } catch {
      return schoolWeeksFrom('2026-09-07', 35);
    }
  }, [schoolYear]);

  // Xác định tuần hiện tại dựa trên ngày hôm nay
  const currentActualWeekNumber = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const found = allSchoolWeeks.find((w) => todayStr >= w.startDate && todayStr <= w.endDate);
    return found ? found.weekNumber : 1;
  }, [allSchoolWeeks]);

  // Tuần đang được chọn xem TKB (1 -> 35)
  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(() => {
    return timetable.currentWeekNumber || currentActualWeekNumber || 1;
  });

  // Thông tin của tuần đang chọn
  const selectedWeekInfo = useMemo(() => {
    return allSchoolWeeks.find((w) => w.weekNumber === selectedWeekNumber) || allSchoolWeeks[0];
  }, [allSchoolWeeks, selectedWeekNumber]);

  // Ngày Thứ Hai bắt đầu của tuần đang chọn
  const weekStartDate = useMemo(() => {
    return selectedWeekInfo ? selectedWeekInfo.startDate : getMondayOfCurrentWeek();
  }, [selectedWeekInfo]);

  // Tải lại khi đổi học kỳ
  useEffect(() => {
    const loaded = loadTeacherTimetable(localStorage, teacherId, teacherName, schoolYear, semester);
    setTimetable(loaded);
    if (loaded.mode) setMode(loaded.mode);
  }, [teacherId, teacherName, schoolYear, semester]);

  // Lưu cấu hình mode vào storage khi thay đổi
  const handleToggleMode = (newMode: TimetableMode) => {
    setMode(newMode);
    const nextTable: TeacherTimetable = {
      ...timetable,
      mode: newMode,
      currentWeekNumber: selectedWeekNumber,
    };
    setTimetable(nextTable);
    saveTeacherTimetable(localStorage, nextTable);
  };

  // Tính danh sách ngày cho từng Thứ trong tuần đã chọn
  const weekDays = useMemo(() => {
    return getWeekDates(weekStartDate, mode);
  }, [weekStartDate, mode]);

  const daysList = useMemo(() => {
    return getDaysOfWeek(mode);
  }, [mode]);

  // Slots hiện tại của tuần đang chọn (nếu chưa có thì lấy TKB mặc định)
  const currentWeekSlots = useMemo(() => {
    return getTimetableSlotsForWeek(timetable, selectedWeekNumber);
  }, [timetable, selectedWeekNumber]);

  // Kiểm tra xem tuần này có TKB riêng biệt hay đang dùng chung
  const isCustomWeek = useMemo(() => {
    const weekKey = `w${selectedWeekNumber}`;
    return !!(timetable.weekSlots && timetable.weekSlots[weekKey] && Object.keys(timetable.weekSlots[weekKey]).length > 0);
  }, [timetable, selectedWeekNumber]);

  // Tiết dạy hôm nay (tính theo tuần đang chọn)
  const todayDate = useMemo(() => new Date(), []);
  const todaySlots = useMemo(() => {
    return getTodayTeachingSlots(timetable, todayDate, selectedWeekNumber);
  }, [timetable, todayDate, selectedWeekNumber]);

  const jsDay = todayDate.getDay();
  const todayLabel = jsDay === 0 ? 'Chủ Nhật' : `Thứ ${jsDay + 1}`;

  // Modal chỉnh sửa ô tiết học
  const [editingSlot, setEditingSlot] = useState<{ dayOfWeek: number; period: number; slot: TimetableSlot | null } | null>(null);
  const [formClassName, setFormClassName] = useState<string>('');
  const [formSubjectName, setFormSubjectName] = useState<string>('Toán');
  const [formRoom, setFormRoom] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');

  // Modal Dán / Nhập TKB từ Excel
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [pasteScope, setPasteScope] = useState<'current_week' | 'from_here_on' | 'all_weeks'>('current_week');
  const [copySuccessToast, setCopySuccessToast] = useState(false);

  // Modal Sao chép giữa các tuần
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [targetCopyWeek, setTargetCopyWeek] = useState<number>(selectedWeekNumber + 1 <= 35 ? selectedWeekNumber + 1 : 1);
  const [copyScopeMode, setCopyScopeMode] = useState<'single' | 'range' | 'default'>('single');

  // Lắng nghe sự kiện paste toàn cục (Ctrl + V)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Nếu đang mở input/textarea khác thì không can thiệp
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      const text = e.clipboardData?.getData('text');
      if (text && text.trim()) {
        setPasteRawText(text);
        setIsPasteModalOpen(true);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  const openEditModal = (dayOfWeek: number, period: number) => {
    const key = makeSlotKey(dayOfWeek, period);
    const existing = currentWeekSlots[key] || null;
    setEditingSlot({ dayOfWeek, period, slot: existing });
    if (existing) {
      setFormClassName(existing.className);
      setFormSubjectName(existing.subjectName || 'Toán');
      setFormRoom(existing.room || '');
      setFormNote(existing.note || '');
    } else {
      setFormClassName(workspaceClasses[0]?.className || '');
      setFormSubjectName(classConfig.subjectName || 'Toán');
      setFormRoom('');
      setFormNote('');
    }
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;

    const { dayOfWeek, period } = editingSlot;
    const key = makeSlotKey(dayOfWeek, period);

    const matchedClass = workspaceClasses.find((c) => c.className.toLowerCase() === formClassName.trim().toLowerCase());

    const updatedSlot: TimetableSlot = {
      dayOfWeek,
      period,
      className: formClassName.trim(),
      classId: matchedClass?.id,
      subjectName: formSubjectName.trim() || 'Toán',
      room: formRoom.trim(),
      note: formNote.trim(),
    };

    const nextWeekSlots = { ...currentWeekSlots, [key]: updatedSlot };
    const nextTable = setTimetableSlotsForWeek(timetable, selectedWeekNumber, nextWeekSlots);
    setTimetable(nextTable);
    saveTeacherTimetable(localStorage, nextTable);
    setEditingSlot(null);
  };

  const handleDeleteSlot = () => {
    if (!editingSlot) return;
    const { dayOfWeek, period } = editingSlot;
    const key = makeSlotKey(dayOfWeek, period);

    const nextWeekSlots = { ...currentWeekSlots };
    delete nextWeekSlots[key];
    const nextTable = setTimetableSlotsForWeek(timetable, selectedWeekNumber, nextWeekSlots);
    setTimetable(nextTable);
    saveTeacherTimetable(localStorage, nextTable);
    setEditingSlot(null);
  };

  // Mở sổ điểm của lớp từ ô TKB
  const handleOpenGradebookForClass = (className: string, classId?: string) => {
    const target = classId
      ? workspaceClasses.find((c) => c.id === classId)
      : workspaceClasses.find((c) => c.className.toLowerCase() === className.toLowerCase());

    if (target) {
      selectWorkspaceClass(target.id);
      onNavigateTab('gradebook');
    } else {
      alert(`Đang chọn xem lớp ${className}. Thầy có thể tạo lớp này trong phần "Lớp tôi dạy".`);
      onNavigateTab('gradebook');
    }
  };

  // Sao chép TKB ra Clipboard dạng bảng Excel TSV
  const handleCopyTsv = async () => {
    const tsv = exportTimetableToTsv(timetable, mode, weekStartDate);
    try {
      await navigator.clipboard.writeText(tsv);
      setCopySuccessToast(true);
      setTimeout(() => setCopySuccessToast(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = tsv;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopySuccessToast(true);
      setTimeout(() => setCopySuccessToast(false), 2500);
    }
  };

  // Áp dụng dán TKB từ text / Excel
  const handleApplyPastedText = () => {
    const detected = detectTimetableModeFromText(pasteRawText);
    const activeMode = detected || mode;
    if (detected && detected !== mode) {
      setMode(detected);
    }
    const parsedSlots = parseTimetableFromText(pasteRawText, activeMode);
    const count = Object.keys(parsedSlots).length;
    if (count === 0) {
      alert('Không tìm thấy dữ liệu tiết học hợp lệ. Vui lòng kiểm tra lại nội dung dán.');
      return;
    }

    let nextTable: TeacherTimetable = {
      ...timetable,
      mode: activeMode,
    };

    if (pasteScope === 'current_week') {
      // Thay thế hoàn toàn các tiết của tuần hiện tại bằng TKB mới dán (xóa sạch rác cũ)
      nextTable = setTimetableSlotsForWeek(nextTable, selectedWeekNumber, parsedSlots);
    } else if (pasteScope === 'from_here_on') {
      // Áp dụng từ tuần này đến hết học kỳ
      const targetWeeks: number[] = [];
      const maxWeek = semester === 1 ? 18 : 35;
      for (let w = selectedWeekNumber; w <= maxWeek; w++) {
        targetWeeks.push(w);
      }
      nextTable = setTimetableSlotsForWeek(nextTable, selectedWeekNumber, parsedSlots);
      nextTable = copyTimetableWeekToRange(nextTable, selectedWeekNumber, targetWeeks);
    } else {
      // Áp dụng làm TKB chung mặc định cho toàn bộ tuần
      nextTable = {
        ...nextTable,
        slots: parsedSlots,
      };
      nextTable = setTimetableSlotsForWeek(nextTable, selectedWeekNumber, parsedSlots);
    }

    setTimetable(nextTable);
    saveTeacherTimetable(localStorage, nextTable);
    setIsPasteModalOpen(false);
    setPasteRawText('');
    alert(`Đã nhập thành công ${count} tiết học từ Excel vào Thời khóa biểu!`);
  };

  // Xóa sạch toàn bộ các tiết học trong tuần đang chọn
  const handleClearCurrentWeekTimetable = () => {
    if (!window.confirm(`Xóa toàn bộ các tiết học của Tuần ${selectedWeekNumber}? Bạn có thể dán mới từ Excel sau khi xóa.`)) {
      return;
    }
    let nextTable = setTimetableSlotsForWeek(timetable, selectedWeekNumber, {});
    if (selectedWeekNumber === 1 || !timetable.weekSlots || Object.keys(timetable.weekSlots).length === 0) {
      nextTable = { ...nextTable, slots: {} };
    }
    setTimetable(nextTable);
    saveTeacherTimetable(localStorage, nextTable);
  };

  // Nạp bộ dữ liệu mẫu thực tế từ ảnh
  const handleLoadSampleFromImage = () => {
    if (window.confirm(`Thầy có muốn nạp Thời khóa biểu mẫu thực tế (10A8, 12B6, 12B1, 10A17) vào Tuần ${selectedWeekNumber} không?`)) {
      const nextTable = setTimetableSlotsForWeek(timetable, selectedWeekNumber, SAMPLE_TIMETABLE_SLOTS);
      setTimetable(nextTable);
      saveTeacherTimetable(localStorage, nextTable);
    }
  };

  // Thực hiện Sao chép giữa các tuần
  const handleExecuteCopyWeek = () => {
    let nextTable = timetable;

    if (copyScopeMode === 'single') {
      // Ví dụ: Tuần 3 sang Tuần 4
      nextTable = copyTimetableFromWeekToWeek(timetable, selectedWeekNumber, targetCopyWeek);
      alert(`Đã sao chép toàn bộ lịch dạy của Tuần ${selectedWeekNumber} sang Tuần ${targetCopyWeek}!`);
    } else if (copyScopeMode === 'range') {
      // Sao chép sang các tuần tiếp theo
      const targetWeeks: number[] = [];
      const maxWeek = semester === 1 ? 18 : 35;
      for (let w = selectedWeekNumber + 1; w <= maxWeek; w++) {
        targetWeeks.push(w);
      }
      if (targetWeeks.length === 0) {
        alert('Tuần hiện tại đã là tuần cuối cùng của kỳ.');
        return;
      }
      nextTable = copyTimetableWeekToRange(timetable, selectedWeekNumber, targetWeeks);
      alert(`Đã sao chép lịch dạy của Tuần ${selectedWeekNumber} sang các Tuần ${targetWeeks.join(', ')}!`);
    } else {
      // Đặt làm TKB mặc định
      nextTable = setWeekAsDefaultTimetable(timetable, selectedWeekNumber);
      alert(`Đã đặt lịch dạy của Tuần ${selectedWeekNumber} làm Thời khóa biểu chuẩn cho toàn kỳ!`);
    }

    setTimetable(nextTable);
    saveTeacherTimetable(localStorage, nextTable);
    setIsCopyModalOpen(false);
  };

  // Xóa TKB của tuần này (quay về TKB mặc định)
  const handleResetCurrentWeek = () => {
    if (window.confirm(`Thầy có chắc chắn muốn đặt lại Tuần ${selectedWeekNumber} về Thời khóa biểu chuẩn ban đầu không?`)) {
      const nextWeekSlots = { ...(timetable.weekSlots || {}) };
      delete nextWeekSlots[`w${selectedWeekNumber}`];
      const nextTable: TeacherTimetable = {
        ...timetable,
        weekSlots: nextWeekSlots,
      };
      setTimetable(nextTable);
      saveTeacherTimetable(localStorage, nextTable);
    }
  };

  // Thống kê tổng số tiết tuần này
  const totalWeeklyPeriods = useMemo(() => {
    return Object.values(currentWeekSlots).filter((s) => s.className?.trim()).length;
  }, [currentWeekSlots]);

  const uniqueClassesTaught = useMemo(() => {
    const set = new Set<string>();
    Object.values(currentWeekSlots).forEach((s) => {
      if (s.className?.trim()) set.add(s.className.trim());
    });
    return Array.from(set);
  }, [currentWeekSlots]);

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      {/* ── Tiêu đề & Công cụ đầu trang ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Thời khóa biểu giảng dạy GVBM (Tất cả các lớp)
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 font-bold border border-purple-300">
                GV: {teacherName}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 font-semibold border border-blue-300">
                TKB chung toàn trường
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Thời khóa biểu chung theo từng tuần, cho phép sao chép giữa các tuần, dán trực tiếp từ Excel (Ctrl+V).
            </p>
          </div>
        </div>

        {/* Nút tác vụ chính */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút Sao chép sang tuần khác */}
          <button
            type="button"
            onClick={() => setIsCopyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Sao chép thời khóa biểu tuần này sang tuần khác (vd: Tuần 3 giống Tuần 4)"
          >
            <Share2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Sao chép tuần</span>
          </button>

          {/* Nút Dán từ Excel */}
          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Dán dữ liệu TKB sao chép từ Excel vào (Phím tắt: Ctrl + V)"
          >
            <ClipboardPaste className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Dán từ Excel</span>
          </button>

          {/* Nút Sao chép TKB ra Clipboard */}
          <button
            type="button"
            onClick={handleCopyTsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Sao chép bảng TKB để dán vào Excel / Google Sheets"
          >
            {copySuccessToast ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600 font-bold">Đã sao chép!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 text-slate-500" />
                <span>Copy bảng</span>
              </>
            )}
          </button>

          {/* Nút Nạp mẫu từ ảnh */}
          <button
            type="button"
            onClick={handleLoadSampleFromImage}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Nạp ngay TKB mẫu chuẩn theo ảnh Thầy vừa gửi"
          >
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="hidden sm:inline">Nạp mẫu</span>
          </button>

          {/* Nút Xóa TKB tuần này */}
          <button
            type="button"
            onClick={handleClearCurrentWeekTimetable}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Xóa toàn bộ các tiết học của tuần này để dán mới từ đầu"
          >
            <Trash2 className="h-4 w-4 text-rose-600" />
            <span className="hidden sm:inline">Xóa tuần</span>
          </button>

          {/* Chuyển học kỳ */}
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setSemester(1)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                semester === 1
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Học kỳ 1
            </button>
            <button
              type="button"
              onClick={() => setSemester(2)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                semester === 2
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Học kỳ 2
            </button>
          </div>

          {/* Xuất Excel */}
          <button
            type="button"
            onClick={() => exportTeacherTimetableToExcel(timetable, mode, weekStartDate)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Xuất file Excel Thời khóa biểu chuẩn sư phạm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Xuất Excel</span>
          </button>

          {/* In TKB */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 shadow-xs transition active:scale-95 cursor-pointer"
            title="In thời khóa biểu"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">In TKB</span>
          </button>
        </div>
      </div>

      {/* ── BỘ ĐIỀU KHIỂN CHỌN TUẦN & 2 DẠNG TKB ── */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Toggle 2 Dạng TKB (6 ngày / 5 ngày) kèm nút Lưu làm mặc định */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Dạng:</span>
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => handleToggleMode('mon-sat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'mon-sat'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Thứ 2 – Thứ 7 (6 ngày)
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode('mon-fri')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                mode === 'mon-fri'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Thứ 2 – Thứ 6 (5 ngày)
            </button>
          </div>

          {/* Nút / Huy hiệu Lưu làm mặc định */}
          {mode === defaultMode ? (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              title="Dạng TKB này đang là mặc định khi mở ứng dụng"
            >
              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Mặc định
            </span>
          ) : (
            <button
              type="button"
              onClick={handleSaveCurrentModeAsDefault}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 transition cursor-pointer"
              title={`Lưu dạng ${mode === 'mon-fri' ? 'Thứ 2 – Thứ 6 (5 ngày)' : 'Thứ 2 – Thứ 7 (6 ngày)'} làm mặc định`}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              Đặt làm mặc định
            </button>
          )}

          {defaultSaveToast && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in">
              ✓ Đã lưu dạng này làm mặc định!
            </span>
          )}
        </div>

        {/* Bộ chọn tuần học (Tuần 1 đến Tuần 35) */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedWeekNumber((prev) => Math.max(1, prev - 1))}
              disabled={selectedWeekNumber <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Tuần trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedWeekNumber(currentActualWeekNumber)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Quay lại tuần thực tế hôm nay"
            >
              Tuần hiện tại
            </button>
            <button
              type="button"
              onClick={() => setSelectedWeekNumber((prev) => Math.min(35, prev + 1))}
              disabled={selectedWeekNumber >= 35}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Tuần sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Dropdown danh sách 35 tuần */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
            <select
              value={selectedWeekNumber}
              onChange={(e) => setSelectedWeekNumber(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-700 bg-purple-50/60 dark:bg-purple-950/60 text-xs font-black text-purple-900 dark:text-purple-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              {allSchoolWeeks.map((w) => (
                <option key={w.weekNumber} value={w.weekNumber}>
                  Tuần {w.weekNumber} ({w.startDate.slice(5).replace('-', '/')} – {w.endDate.slice(5).replace('-', '/')}) {w.weekNumber === currentActualWeekNumber ? '★ Hiện tại' : ''}
                </option>
              ))}
            </select>

            {isCustomWeek ? (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold border border-emerald-300">
                Lịch riêng
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">
                TKB chuẩn
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── BANNER NỔI BẬT: HÔM NAY TÔI DẠY NHỮNG LỚP NÀO? ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wide">
              {todayLabel}
            </span>
            <span className="text-xs text-purple-200">
              Ngày {todayDate.toLocaleDateString('vi-VN')} · Tuần {selectedWeekNumber} · Năm học {schoolYear}
            </span>
          </div>
          <div className="text-xs text-amber-300 font-bold">
            {todaySlots.length > 0 ? `Hôm nay Thầy có ${todaySlots.length} tiết giảng dạy` : 'Hôm nay Thầy không có tiết dạy'}
          </div>
        </div>

        {todaySlots.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            {todaySlots.map((slot) => {
              const isAfternoon = slot.period >= 6;
              const periodLabel = isAfternoon ? `Tiết ${slot.period - 5} (Chiều)` : `Tiết ${slot.period} (Sáng)`;
              return (
                <div
                  key={slot.period}
                  className="p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-xs transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black px-2 py-0.5 rounded ${isAfternoon ? 'bg-rose-500/90 text-white' : 'bg-blue-500/90 text-white'}`}>
                      {periodLabel}
                    </span>
                    <span className="text-[11px] text-purple-200 font-mono">
                      {PERIOD_HOURS[slot.period] || ''}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">
                      Lớp {slot.className}
                    </h4>
                    <p className="text-xs text-purple-200 mt-0.5">
                      {slot.subjectName || 'Toán'} {slot.room ? `· ${slot.room}` : ''}
                    </p>
                  </div>
                  {/* Nút hành động nhanh */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => handleOpenGradebookForClass(slot.className, slot.classId)}
                      className="flex-1 py-1 px-2 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white transition flex items-center justify-center gap-1 cursor-pointer"
                      title="Mở sổ điểm của lớp này"
                    >
                      <BookOpen className="h-3 w-3" />
                      <span>Sổ điểm</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (slot.classId) selectWorkspaceClass(slot.classId);
                        onNavigateTab('subject-attendance');
                      }}
                      className="py-1 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-[11px] font-bold text-white transition flex items-center justify-center gap-1 cursor-pointer"
                      title="Điểm danh tiết học này"
                    >
                      <CalendarCheck className="h-3 w-3" />
                      <span>Điểm danh</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-purple-200 italic py-1">
            Thầy có thể nghỉ ngơi, chuẩn bị bài giảng hoặc kiểm tra lại sổ điểm.
          </p>
        )}
      </div>

      {/* ── THỐNG KÊ TỔNG QUAN TUẦN NÀY ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-slate-400 font-bold block text-[11px] uppercase">Tuần {selectedWeekNumber}</span>
          <span className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5 block">
            {totalWeeklyPeriods} tiết dạy
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-slate-400 font-bold block text-[11px] uppercase">Số lớp phụ trách</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5 block">
            {uniqueClassesTaught.length} lớp
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-slate-400 font-bold block text-[11px] uppercase">Các lớp trong tuần</span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block truncate">
            {uniqueClassesTaught.length > 0 ? uniqueClassesTaught.join(', ') : 'Chưa xếp TKB'}
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-bold block text-[11px] uppercase">Thao tác</span>
            <span className="text-xs text-purple-600 dark:text-purple-400 mt-0.5 block font-medium">
              Chạm vào ô để sửa
            </span>
          </div>
          {isCustomWeek && (
            <button
              type="button"
              onClick={handleResetCurrentWeek}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
              title="Đặt lại Tuần này về Thời khóa biểu chuẩn"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── BẢNG THỜI KHÓA BIỂU TUẦN MA TRẬN ── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900">
        <table className="w-full text-xs text-left border-collapse min-w-[760px]">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3 w-16 text-center border-r border-slate-200 dark:border-slate-700">Buổi</th>
              <th className="p-3 w-16 text-center border-r border-slate-200 dark:border-slate-700">Tiết</th>
              <th className="p-3 w-28 text-center border-r border-slate-200 dark:border-slate-700">Thời gian</th>
              {daysList.map((day, idx) => {
                const isTodayCol = day.value === (jsDay === 0 ? 8 : jsDay + 1) && selectedWeekNumber === currentActualWeekNumber;
                const displayDate = weekDays[idx]?.displayDate;
                return (
                  <th
                    key={day.value}
                    className={`p-3 text-center border-r border-slate-200 dark:border-slate-700 transition ${
                      isTodayCol
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 font-black'
                        : ''
                    }`}
                  >
                    <div className="text-xs font-bold">{day.label}</div>
                    {displayDate && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        ({displayDate})
                      </div>
                    )}
                    {isTodayCol && (
                      <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded-full bg-purple-600 text-white font-semibold">
                        Hôm nay
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {/* ── BUỔI SÁNG: Tiết 1 đến 5 ── */}
            {Array.from({ length: 5 }).map((_, idx) => {
              const p = idx + 1;
              return (
                <tr key={p} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition">
                  {p === 1 && (
                    <td
                      rowSpan={5}
                      className="p-3 text-center font-black bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-r border-b border-slate-200 dark:border-slate-700"
                    >
                      Sáng
                    </td>
                  )}
                  <td className="p-2.5 text-center font-bold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-850 border-r border-slate-200 dark:border-slate-700">
                    Tiết {p}
                  </td>
                  <td className="p-2 text-center font-mono text-slate-600 dark:text-slate-400 text-xs border-r border-slate-200 dark:border-slate-700">
                    {PERIOD_HOURS[p]}
                  </td>
                  {daysList.map((day) => {
                    const key = makeSlotKey(day.value, p);
                    const slot = currentWeekSlots[key];
                    const isTodayCol = day.value === (jsDay === 0 ? 8 : jsDay + 1) && selectedWeekNumber === currentActualWeekNumber;
                    return (
                      <td
                        key={day.value}
                        onClick={() => openEditModal(day.value, p)}
                        className={`p-2 text-center cursor-pointer transition border-r border-slate-100 dark:border-slate-800 ${
                          isTodayCol ? 'bg-purple-50/30 dark:bg-purple-950/20' : ''
                        } hover:bg-purple-100/40 dark:hover:bg-purple-950/30`}
                      >
                        {slot?.className ? (
                          <div className="p-2 rounded-xl bg-purple-50/80 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 shadow-2xs group relative text-center">
                            <span className="font-bold text-sm text-slate-900 dark:text-white block">
                              {slot.className}-{slot.subjectName || 'Toán'}
                            </span>
                            {slot.room && (
                              <span className="text-[10px] text-purple-700 dark:text-purple-300 block mt-0.5">
                                {slot.room}
                              </span>
                            )}
                            <div className="opacity-0 group-hover:opacity-100 transition absolute right-1 top-1 text-[10px] text-purple-600 font-bold">
                              ✎
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* ── BUỔI CHIỀU: Tiết 6 đến 10 (Màu đỏ cam chuẩn ảnh mẫu) ── */}
            {Array.from({ length: 5 }).map((_, idx) => {
              const p = idx + 6;
              const periodInAfternoon = p - 5;
              return (
                <tr key={p} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition">
                  {p === 6 && (
                    <td
                      rowSpan={5}
                      className="p-3 text-center font-black bg-rose-50/60 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-r border-b border-rose-200 dark:border-rose-900"
                    >
                      Chiều
                    </td>
                  )}
                  <td className="p-2.5 text-center font-bold text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20 border-r border-rose-200 dark:border-rose-900">
                    Tiết {periodInAfternoon}
                  </td>
                  <td className="p-2 text-center font-mono text-rose-600 dark:text-rose-400 text-xs border-r border-rose-200 dark:border-rose-900">
                    {PERIOD_HOURS[p]}
                  </td>
                  {daysList.map((day) => {
                    const key = makeSlotKey(day.value, p);
                    const slot = currentWeekSlots[key];
                    const isTodayCol = day.value === (jsDay === 0 ? 8 : jsDay + 1) && selectedWeekNumber === currentActualWeekNumber;
                    return (
                      <td
                        key={day.value}
                        onClick={() => openEditModal(day.value, p)}
                        className={`p-2 text-center cursor-pointer transition border-r border-slate-100 dark:border-slate-800 ${
                          isTodayCol ? 'bg-purple-50/30 dark:bg-purple-950/20' : ''
                        } hover:bg-rose-100/40 dark:hover:bg-rose-950/30`}
                      >
                        {slot?.className ? (
                          <div className="p-2 rounded-xl bg-rose-50/80 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 shadow-2xs group relative text-center">
                            <span className="font-bold text-sm text-rose-600 dark:text-rose-400 block">
                              {slot.className}-{slot.subjectName || 'Toán'}
                            </span>
                            {slot.room && (
                              <span className="text-[10px] text-rose-500 dark:text-rose-400 block mt-0.5">
                                {slot.room}
                              </span>
                            )}
                            <div className="opacity-0 group-hover:opacity-100 transition absolute right-1 top-1 text-[10px] text-rose-600 font-bold">
                              ✎
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── MODAL CHỈNH SỬA Ô TIẾT HỌC ── */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center font-black">
                  {editingSlot.dayOfWeek}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {editingSlot.period <= 5
                      ? `Thứ ${editingSlot.dayOfWeek} · Tiết ${editingSlot.period} (Sáng) · Tuần ${selectedWeekNumber}`
                      : `Thứ ${editingSlot.dayOfWeek} · Tiết ${editingSlot.period - 5} (Chiều) · Tuần ${selectedWeekNumber}`}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Khung giờ: {PERIOD_HOURS[editingSlot.period] || ''}
                  </p>
                </div>
              </div>
              {editingSlot.slot && (
                <button
                  type="button"
                  onClick={handleDeleteSlot}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                  title="Xóa tiết học này"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-3.5">
              {/* Chọn lớp dạy */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lớp giảng dạy <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 10A8, 12B6, 12B1, 10A17..."
                    value={formClassName}
                    onChange={(e) => setFormClassName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                  {workspaceClasses.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) setFormClassName(e.target.value);
                      }}
                      className="px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <option value="">Lớp có sẵn...</option>
                      {workspaceClasses.map((c) => (
                        <option key={c.id} value={c.className}>
                          {c.className}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Môn học & Phòng */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Môn học
                  </label>
                  <input
                    type="text"
                    placeholder="Toán, HĐTN-HN, Ôn Toán..."
                    value={formSubjectName}
                    onChange={(e) => setFormSubjectName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phòng học
                  </label>
                  <input
                    type="text"
                    placeholder="P.201, Nhà A..."
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú bài dạy
                </label>
                <input
                  type="text"
                  placeholder="Kiểm tra 15p, Chữa bài tập..."
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Nút lưu */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Lưu tiết dạy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL SAO CHÉP GIỮA CÁC TUẦN (VD: TUẦN 3 GIỐNG TUẦN 4) ── */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold">
                  <Share2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Sao chép TKB giữa các tuần
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tuần nguồn: <strong className="text-purple-600 dark:text-purple-400">Tuần {selectedWeekNumber}</strong> ({totalWeeklyPeriods} tiết)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Chọn hình thức sao chép:
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="radio"
                      name="copyScope"
                      checked={copyScopeMode === 'single'}
                      onChange={() => setCopyScopeMode('single')}
                      className="mt-0.5 text-purple-600"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Sao chép sang một tuần cụ thể
                      </span>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        Ví dụ: Sao chép Tuần {selectedWeekNumber} sang Tuần {targetCopyWeek} (làm Tuần {targetCopyWeek} giống hệt Tuần {selectedWeekNumber}).
                      </span>
                      {copyScopeMode === 'single' && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                          <span>Tuần đích:</span>
                          <select
                            value={targetCopyWeek}
                            onChange={(e) => setTargetCopyWeek(Number(e.target.value))}
                            className="px-2.5 py-1 rounded-lg border border-purple-300 bg-white dark:bg-slate-800 font-bold text-purple-700 dark:text-purple-300"
                          >
                            {allSchoolWeeks.map((w) => (
                              <option key={w.weekNumber} value={w.weekNumber}>
                                Tuần {w.weekNumber}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="radio"
                      name="copyScope"
                      checked={copyScopeMode === 'range'}
                      onChange={() => setCopyScopeMode('range')}
                      className="mt-0.5 text-purple-600"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Áp dụng cho tất cả các tuần tiếp theo
                      </span>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        Sao chép Tuần {selectedWeekNumber} sang tất cả các tuần từ Tuần {selectedWeekNumber + 1} đến hết kỳ.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="radio"
                      name="copyScope"
                      checked={copyScopeMode === 'default'}
                      onChange={() => setCopyScopeMode('default')}
                      className="mt-0.5 text-purple-600"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        Đặt làm Thời khóa biểu chuẩn
                      </span>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        Lấy lịch của Tuần {selectedWeekNumber} làm TKB chuẩn chung cho cả năm học.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteCopyWeek}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
              >
                Xác nhận sao chép
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DÁN / NHẬP TKB TỪ EXCEL ── */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold">
                  <ClipboardPaste className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Dán / Nhập Thời khóa biểu từ Excel
                  </h3>
                  <p className="text-xs text-slate-500">
                    Copy các ô từ file Excel rồi dán vào khung bên dưới (Ctrl + V).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <textarea
                rows={7}
                value={pasteRawText}
                onChange={(e) => setPasteRawText(e.target.value)}
                placeholder="Dán dữ liệu copy từ Excel hoặc bảng vào đây... (Ctrl + V)"
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />

              {pasteRawText && (() => {
                const detected = detectTimetableModeFromText(pasteRawText);
                const activeMode = detected || mode;
                const parsed = parseTimetableFromText(pasteRawText, activeMode);
                const slotCount = Object.keys(parsed).length;
                return (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Xem trước: </span>
                        Nhận diện được{' '}
                        <span className="font-bold text-purple-600 dark:text-purple-300">
                          {slotCount}
                        </span>{' '}
                        tiết dạy.
                      </div>
                      {detected && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold">
                          Dạng tự động khớp: {detected === 'mon-fri' ? 'Thứ 2 – Thứ 6 (5 ngày)' : 'Thứ 2 – Thứ 7 (6 ngày)'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Phạm vi áp dụng khi dán */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Phạm vi áp dụng dữ liệu vừa dán:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="pasteScope"
                      checked={pasteScope === 'current_week'}
                      onChange={() => setPasteScope('current_week')}
                      className="text-indigo-600"
                    />
                    <span>Chỉ Tuần {selectedWeekNumber}</span>
                  </label>
                  <label className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="pasteScope"
                      checked={pasteScope === 'from_here_on'}
                      onChange={() => setPasteScope('from_here_on')}
                      className="text-indigo-600"
                    />
                    <span>Từ Tuần {selectedWeekNumber} trở đi</span>
                  </label>
                  <label className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="pasteScope"
                      checked={pasteScope === 'all_weeks'}
                      onChange={() => setPasteScope('all_weeks')}
                      className="text-indigo-600"
                    />
                    <span>TKB chuẩn cả kỳ</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyPastedText}
                disabled={!pasteRawText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-xs transition active:scale-95 cursor-pointer"
              >
                Áp dụng vào TKB
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
