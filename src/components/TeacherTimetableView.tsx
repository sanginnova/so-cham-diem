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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  TeacherTimetable,
  TimetableSlot,
  DAYS_OF_WEEK,
  PERIOD_HOURS,
  makeSlotKey,
  loadTeacherTimetable,
  saveTeacherTimetable,
  getTodayTeachingSlots,
  exportTeacherTimetableToExcel,
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

  // Tải lại khi đổi học kỳ
  useEffect(() => {
    const loaded = loadTeacherTimetable(localStorage, teacherId, teacherName, schoolYear, semester);
    setTimetable(loaded);
  }, [teacherId, teacherName, schoolYear, semester]);

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
              Theo dõi lịch dạy các lớp trong tuần, 1-chạm mở ngay Sổ điểm và Điểm danh từng tiết học.
            </p>
          </div>
        </div>

        {/* Nút tác vụ */}
        <div className="flex items-center gap-2 flex-wrap">
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

          <button
            type="button"
            onClick={() => exportTeacherTimetableToExcel(timetable)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95 cursor-pointer"
            title="Xuất file Excel Thời khóa biểu chuẩn sư phạm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Xuất Excel TKB</span>
          </button>

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
            {todaySlots.map((slot) => (
              <div
                key={slot.period}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 backdrop-blur-xs transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-500/80 text-white">
                    Tiết {slot.period}
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
            ))}
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

        <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-slate-400 font-bold block text-[11px] uppercase">Thao tác</span>
          <span className="text-xs text-purple-600 dark:text-purple-400 mt-1 block font-medium">
            Chạm vào ô để xếp / sửa
          </span>
        </div>
      </div>

      {/* ── BẢNG THỜI KHÓA BIỂU TUẦN MA TRẬN ── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900">
        <table className="w-full text-xs text-left border-collapse min-w-[760px]">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-3 w-16 text-center">Buổi</th>
              <th className="p-3 w-16 text-center">Tiết</th>
              <th className="p-3 w-28 text-center">Giờ học</th>
              {DAYS_OF_WEEK.map((day) => {
                const isTodayCol = day.value === (jsDay === 0 ? 8 : jsDay + 1);
                return (
                  <th
                    key={day.value}
                    className={`p-3 text-center transition ${
                      isTodayCol
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 font-black border-x-2 border-purple-400'
                        : ''
                    }`}
                  >
                    <div>{day.label}</div>
                    {isTodayCol && <span className="text-[9px] text-purple-600 font-normal">Hôm nay</span>}
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
                <tr key={p} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                  {p === 1 && (
                    <td
                      rowSpan={5}
                      className="p-3 text-center font-black bg-blue-50/50 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300 border-r border-slate-200 dark:border-slate-700"
                    >
                      SÁNG
                    </td>
                  )}
                  <td className="p-2.5 text-center font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850">
                    Tiết {p}
                  </td>
                  <td className="p-2 text-center font-mono text-slate-400 text-[11px]">
                    {PERIOD_HOURS[p]}
                  </td>
                  {DAYS_OF_WEEK.map((day) => {
                    const key = makeSlotKey(day.value, p);
                    const slot = timetable.slots[key];
                    const isTodayCol = day.value === (jsDay === 0 ? 8 : jsDay + 1);
                    return (
                      <td
                        key={day.value}
                        onClick={() => openEditModal(day.value, p)}
                        className={`p-2 text-center cursor-pointer transition border border-slate-100 dark:border-slate-800 ${
                          isTodayCol ? 'bg-purple-50/30 dark:bg-purple-950/20' : ''
                        } hover:bg-purple-100/50 dark:hover:bg-purple-950/40`}
                      >
                        {slot?.className ? (
                          <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/60 dark:to-indigo-950/60 border border-purple-200 dark:border-purple-800/80 shadow-2xs group relative">
                            <span className="font-black text-sm text-purple-950 dark:text-purple-200 block">
                              {slot.className}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                              {slot.subjectName || 'Toán'} {slot.room ? `· ${slot.room}` : ''}
                            </span>
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

            {/* ── BUỔI CHIỀU: Tiết 6 đến 10 ── */}
            {Array.from({ length: 5 }).map((_, idx) => {
              const p = idx + 6;
              return (
                <tr key={p} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition">
                  {p === 6 && (
                    <td
                      rowSpan={5}
                      className="p-3 text-center font-black bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700"
                    >
                      CHIỀU
                    </td>
                  )}
                  <td className="p-2.5 text-center font-bold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-850">
                    Tiết {p}
                  </td>
                  <td className="p-2 text-center font-mono text-slate-400 text-[11px]">
                    {PERIOD_HOURS[p]}
                  </td>
                  {DAYS_OF_WEEK.map((day) => {
                    const key = makeSlotKey(day.value, p);
                    const slot = timetable.slots[key];
                    const isTodayCol = day.value === (jsDay === 0 ? 8 : jsDay + 1);
                    return (
                      <td
                        key={day.value}
                        onClick={() => openEditModal(day.value, p)}
                        className={`p-2 text-center cursor-pointer transition border border-slate-100 dark:border-slate-800 ${
                          isTodayCol ? 'bg-purple-50/30 dark:bg-purple-950/20' : ''
                        } hover:bg-purple-100/50 dark:hover:bg-purple-950/40`}
                      >
                        {slot?.className ? (
                          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-50 to-orange-50 dark:from-amber-950/60 dark:to-orange-950/60 border border-amber-200 dark:border-amber-800/80 shadow-2xs group relative">
                            <span className="font-black text-sm text-amber-950 dark:text-amber-200 block">
                              {slot.className}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                              {slot.subjectName || 'Toán'} {slot.room ? `· ${slot.room}` : ''}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition absolute right-1 top-1 text-[10px] text-amber-600 font-bold">
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

      {/* ── MODAL CHỈNH SỬA / XẾP TIẾT HỌC ── */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Xếp lịch: Thứ {editingSlot.dayOfWeek} · Tiết {editingSlot.period}
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  {PERIOD_HOURS[editingSlot.period] || ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Chọn lớp dạy
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formClassName}
                    onChange={(e) => setFormClassName(e.target.value)}
                    placeholder="Ví dụ: 10A17, 10A8..."
                    required
                    className="flex-1 p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                  {availableClasses.length > 0 && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) setFormClassName(e.target.value);
                      }}
                      className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs"
                    >
                      <option value="">Lớp của tôi</option>
                      {availableClasses.map((c) => (
                        <option key={c.id} value={c.className}>
                          {c.className}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Môn học
                </label>
                <input
                  type="text"
                  value={formSubjectName}
                  onChange={(e) => setFormSubjectName(e.target.value)}
                  placeholder="Môn học (Toán...)"
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Phòng học / Xưởng thực hành
                </label>
                <input
                  type="text"
                  value={formRoom}
                  onChange={(e) => setFormRoom(e.target.value)}
                  placeholder="Ví dụ: P.204, Nhà A2, Xưởng 1..."
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Ghi chú tiết học (tùy chọn)
                </label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="Kiểm tra 15p, Chữa bài tập..."
                  className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                {editingSlot.slot ? (
                  <button
                    type="button"
                    onClick={handleDeleteSlot}
                    className="py-2 px-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Xóa tiết</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSlot(null)}
                    className="py-2 px-3 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition cursor-pointer shadow-xs"
                  >
                    Lưu lịch dạy
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
