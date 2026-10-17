import React, { useState, useEffect, useMemo } from 'react';
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
  exportTimetableToTsv,
  SAMPLE_TIMETABLE_SLOTS,
} from '../lib/teacherTimetable';
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

  // 2 Dạng TKB: 6 ngày (Thứ 2 - Thứ 7) hoặc 5 ngày (Thứ 2 - Thứ 6)
  const [mode, setMode] = useState<TimetableMode>(timetable.mode || 'mon-sat');

  // Ngày Thứ Hai bắt đầu tuần
  const [weekStartDate, setWeekStartDate] = useState<string>(
    timetable.weekStartDate || getMondayOfCurrentWeek()
  );

  // Tải lại khi đổi học kỳ
  useEffect(() => {
    const loaded = loadTeacherTimetable(localStorage, teacherId, teacherName, schoolYear, semester);
    setTimetable(loaded);
    if (loaded.mode) setMode(loaded.mode);
    if (loaded.weekStartDate) setWeekStartDate(loaded.weekStartDate);
  }, [teacherId, teacherName, schoolYear, semester]);

  // Lưu cấu hình mode & weekStartDate vào storage khi thay đổi
  const updateTimetableMeta = (newMode: TimetableMode, newWeekStart: string) => {
    setMode(newMode);
    setWeekStartDate(newWeekStart);
    const nextTable: TeacherTimetable = {
      ...timetable,
      mode: newMode,
      weekStartDate: newWeekStart,
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

  // Điều hướng tuần (Tuần trước / Tuần này / Tuần sau)
  const handleShiftWeek = (offsetDays: number) => {
    const current = new Date(`${weekStartDate}T00:00:00`);
    current.setDate(current.getDate() + offsetDays);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    const nextMondayStr = monday.toISOString().split('T')[0];
    updateTimetableMeta(mode, nextMondayStr);
  };

  const handleResetToCurrentWeek = () => {
    updateTimetableMeta(mode, getMondayOfCurrentWeek());
  };

  // Danh sách các lớp bộ môn thầy đang dạy để gợi ý nhanh
  const availableClasses = useMemo(() => {
    return workspaceClasses.filter((c) => c.classType === 'subject' || c.id === classConfig.id);
  }, [workspaceClasses, classConfig.id]);

  // Tiết dạy hôm nay
  const todayDate = useMemo(() => new Date(), []);
  const todaySlots = useMemo(() => {
    return getTodayTeachingSlots(timetable, todayDate);
  }, [timetable, todayDate]);

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
  const [copySuccessToast, setCopySuccessToast] = useState(false);

  const openEditModal = (dayOfWeek: number, period: number) => {
    const key = makeSlotKey(dayOfWeek, period);
    const existing = timetable.slots[key] || null;
    setEditingSlot({ dayOfWeek, period, slot: existing });
    if (existing) {
      setFormClassName(existing.className);
      setFormSubjectName(existing.subjectName || 'Toán');
      setFormRoom(existing.room || '');
      setFormNote(existing.note || '');
    } else {
      setFormClassName(availableClasses[0]?.className || '');
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

    const matchedClass = availableClasses.find((c) => c.className.toLowerCase() === formClassName.trim().toLowerCase());

    const updatedSlot: TimetableSlot = {
      dayOfWeek,
      period,
      className: formClassName.trim(),
      classId: matchedClass?.id,
      subjectName: formSubjectName.trim() || 'Toán',
      room: formRoom.trim(),
      note: formNote.trim(),
    };

    const nextSlots = { ...timetable.slots, [key]: updatedSlot };
    const nextTable: TeacherTimetable = { ...timetable, slots: nextSlots };
    setTimetable(nextTable);
    saveTeacherTimetable(localStorage, nextTable);
    setEditingSlot(null);
  };

  const handleDeleteSlot = () => {
    if (!editingSlot) return;
    const { dayOfWeek, period } = editingSlot;
    const key = makeSlotKey(dayOfWeek, period);

    const nextSlots = { ...timetable.slots };
    delete nextSlots[key];
    const nextTable: TeacherTimetable = { ...timetable, slots: nextSlots };
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

  // Thao tác Copy TKB ra Clipboard dạng bảng Excel TSV
  const handleCopyTsv = async () => {
    const tsv = exportTimetableToTsv(timetable, mode, weekStartDate);
    try {
      await navigator.clipboard.writeText(tsv);
      setCopySuccessToast(true);
      setTimeout(() => setCopySuccessToast(false), 2500);
    } catch {
      // Fallback nếu clipboard API bị chặn
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

  // Thao tác Áp dụng Dán TKB từ text
  const handleApplyPastedText = () => {
    const parsedSlots = parseTimetableFromText(pasteRawText, mode);
    const count = Object.keys(parsedSlots).length;
    if (count === 0) {
      alert('Không tìm thấy dữ liệu tiết học hợp lệ. Vui lòng kiểm tra lại nội dung bảng dán.');
      return;
    }

    const nextTable: TeacherTimetable = {
      ...timetable,
      slots: { ...timetable.slots, ...parsedSlots },
      mode,
      weekStartDate,
    };
    setTimetable(nextTable);
    saveTeacherTimetable(localStorage, nextTable);
    setIsPasteModalOpen(false);
    setPasteRawText('');
    alert(`Đã nhập thành công ${count} tiết học vào Thời khóa biểu!`);
  };

  // Nạp bộ dữ liệu mẫu thực tế từ ảnh của Thầy
  const handleLoadSampleFromImage = () => {
    if (window.confirm('Thầy có muốn nạp Thời khóa biểu mẫu (chuẩn như ảnh Thầy gửi: 10A8, 12B6, 12B1, 10A17) vào TKB hiện tại không?')) {
      const nextTable: TeacherTimetable = {
        ...timetable,
        slots: { ...timetable.slots, ...SAMPLE_TIMETABLE_SLOTS },
        mode,
        weekStartDate,
      };
      setTimetable(nextTable);
      saveTeacherTimetable(localStorage, nextTable);
    }
  };

  // Xóa toàn bộ TKB học kỳ này
  const handleClearAllSlots = () => {
    if (window.confirm('Thầy có chắc chắn muốn xóa toàn bộ lịch dạy của Học kỳ này để làm lại từ đầu không?')) {
      const nextTable: TeacherTimetable = {
        ...timetable,
        slots: {},
      };
      setTimetable(nextTable);
      saveTeacherTimetable(localStorage, nextTable);
    }
  };

  // Thống kê tổng số tiết
  const totalWeeklyPeriods = useMemo(() => {
    return Object.values(timetable.slots).filter((s) => s.className?.trim()).length;
  }, [timetable]);

  const uniqueClassesTaught = useMemo(() => {
    const set = new Set<string>();
    Object.values(timetable.slots).forEach((s) => {
      if (s.className?.trim()) set.add(s.className.trim());
    });
    return Array.from(set);
  }, [timetable]);

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
                Thời khóa biểu giảng dạy GVBM
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 font-bold border border-purple-300">
                GV: {teacherName}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hỗ trợ 2 dạng TKB (5 ngày / 6 ngày), chọn ngày bắt đầu tuần, sao chép dán trực tiếp từ Excel.
            </p>
          </div>
        </div>

        {/* Nút tác vụ chính */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút Sao chép TKB */}
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
                <span>Sao chép TKB</span>
              </>
            )}
          </button>

          {/* Nút Dán / Nhập TKB */}
          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Dán dữ liệu TKB sao chép từ Excel vào"
          >
            <ClipboardPaste className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Dán từ Excel</span>
          </button>

          {/* Nút Nạp mẫu từ ảnh */}
          <button
            type="button"
            onClick={handleLoadSampleFromImage}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Nạp ngay TKB mẫu chuẩn theo ảnh Thầy vừa gửi"
          >
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="hidden sm:inline">Nạp mẫu ảnh</span>
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

      {/* ── BỘ ĐIỀU KHIỂN: 2 DẠNG TKB & CHỌN NGÀY BẮT ĐẦU TUẦN ── */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Toggle 2 Dạng TKB */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Dạng TKB:</span>
          <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => updateTimetableMeta('mon-sat', weekStartDate)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mode === 'mon-sat'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>Thứ 2 – Thứ 7 (6 ngày)</span>
            </button>
            <button
              type="button"
              onClick={() => updateTimetableMeta('mon-fri', weekStartDate)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                mode === 'mon-fri'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>Thứ 2 – Thứ 6 (5 ngày)</span>
            </button>
          </div>
        </div>

        {/* Chọn ngày Thứ 2 bắt đầu tuần & Điều hướng tuần */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleShiftWeek(-7)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Tuần trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleResetToCurrentWeek}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Quay lại tuần này"
            >
              Tuần này
            </button>
            <button
              type="button"
              onClick={() => handleShiftWeek(7)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Tuần sau"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 font-medium">Thứ 2 bắt đầu:</span>
            <input
              type="date"
              value={weekStartDate}
              onChange={(e) => updateTimetableMeta(mode, e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
            />
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
              Ngày {todayDate.toLocaleDateString('vi-VN')} · Năm học {schoolYear}
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

      {/* ── THỐNG KÊ TỔNG QUAN ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-slate-400 font-bold block text-[11px] uppercase">Tổng tiết / tuần</span>
          <span className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5 block">
            {totalWeeklyPeriods} tiết
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-slate-400 font-bold block text-[11px] uppercase">Số lớp phụ trách</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5 block">
            {uniqueClassesTaught.length} lớp
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-slate-400 font-bold block text-[11px] uppercase">Các lớp đang dạy</span>
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
          <button
            type="button"
            onClick={handleClearAllSlots}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
            title="Xóa toàn bộ TKB học kỳ này"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── BẢNG THỜI KHÓA BIỂU TUẦN MA TRẬN (CHUẨN ẢNH MẪU SƯ PHẠM) ── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900">
        <table className="w-full text-xs text-left border-collapse min-w-[760px]">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3 w-16 text-center border-r border-slate-200 dark:border-slate-700">Buổi</th>
              <th className="p-3 w-16 text-center border-r border-slate-200 dark:border-slate-700">Tiết</th>
              <th className="p-3 w-28 text-center border-r border-slate-200 dark:border-slate-700">Thời gian</th>
              {daysList.map((day, idx) => {
                const isTodayCol = day.value === (jsDay === 0 ? 8 : jsDay + 1);
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
                    const slot = timetable.slots[key];
                    const isTodayCol = day.value === (jsDay === 0 ? 8 : jsDay + 1);
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

            {/* ── BUỔI CHIỀU: Tiết 6 đến 10 (Hiển thị màu đỏ cam đúng chuẩn ảnh mẫu) ── */}
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
                    const slot = timetable.slots[key];
                    const isTodayCol = day.value === (jsDay === 0 ? 8 : jsDay + 1);
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
                      ? `Thứ ${editingSlot.dayOfWeek} · Tiết ${editingSlot.period} (Sáng)`
                      : `Thứ ${editingSlot.dayOfWeek} · Tiết ${editingSlot.period - 5} (Chiều)`}
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
                    placeholder="Ví dụ: 10A8, 12B6, 12B1..."
                    value={formClassName}
                    onChange={(e) => setFormClassName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                  {availableClasses.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) setFormClassName(e.target.value);
                      }}
                      className="px-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      <option value="">Lớp có sẵn...</option>
                      {availableClasses.map((c) => (
                        <option key={c.id} value={c.className}>
                          {c.className}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Môn học */}
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
                  Ghi chú bài dạy / Kế hoạch
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
                    Copy các ô từ Excel/Sheets rồi dán vào khung bên dưới (phím tắt Ctrl+V).
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
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Hệ thống tự động nhận diện các dòng và cột Thứ 2 – Thứ {mode === 'mon-fri' ? '6' : '7'}. Các ô có định dạng như <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-purple-600">10A8-Toán</code>, <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-purple-600">12B6-Toán</code>, <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-purple-600">10A8-HĐTN-HN</code> sẽ được phân tách chính xác.
              </p>

              <textarea
                rows={8}
                value={pasteRawText}
                onChange={(e) => setPasteRawText(e.target.value)}
                placeholder="Dán dữ liệu copy từ Excel hoặc văn bản bảng vào đây... (Ctrl + V)"
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />

              {pasteRawText && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">Xem trước: </span>
                  Nhận diện được khoảng{' '}
                  <span className="font-bold">
                    {Object.keys(parseTimetableFromText(pasteRawText, mode)).length}
                  </span>{' '}
                  tiết dạy phù hợp với dạng TKB hiện tại.
                </div>
              )}
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
