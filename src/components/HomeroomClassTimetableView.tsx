import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  CalendarCheck,
  Download,
  Printer,
  Plus,
  Trash2,
  CheckCircle2,
  Edit2,
  Share2,
  RotateCcw,
  Sparkles,
  ClipboardPaste,
  ChevronLeft,
  ChevronRight,
  User,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import {
  TimetableMode,
  PERIOD_HOURS,
  PERIOD_SESSION_INFO,
  makeSlotKey,
  getDaysOfWeek,
  getMondayOfCurrentWeek,
  getWeekDates,
  detectTimetableModeFromText,
} from '../lib/teacherTimetable';
import {
  ClassTimetable,
  ClassTimetableSlot,
  COMMON_HIGH_SCHOOL_SUBJECTS,
  loadClassTimetable,
  saveClassTimetable,
  parseClassTimetableFromText,
  exportClassTimetableToExcel,
} from '../lib/classTimetable';
import { schoolWeeksFrom, defaultWeekOneStart } from '../lib/classScope';
import { TabType } from './Navbar';

interface HomeroomClassTimetableViewProps {
  onNavigateTab?: (tab: TabType) => void;
}

// Màu sắc nhận diện môn học giúp TKB lớp sinh động
function getSubjectBadgeColor(subject: string) {
  const s = (subject || '').toLowerCase();
  if (/chào cờ|sinh hoạt/i.test(s)) return 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800';
  if (/toán|tin học/i.test(s)) return 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border-blue-300 dark:border-blue-800';
  if (/văn|sử|địa/i.test(s)) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800';
  if (/tiếng anh|ngoại ngữ/i.test(s)) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
  if (/vật lí|hóa học|sinh học/i.test(s)) return 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800';
  if (/thể dục|gdqp/i.test(s)) return 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300 border-teal-300 dark:border-teal-800';
  if (/trải nghiệm|hđtn/i.test(s)) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800';
  return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700';
}

export function HomeroomClassTimetableView({ onNavigateTab }: HomeroomClassTimetableViewProps) {
  const { classConfig } = useApp();
  const classId = classConfig.id;
  const className = classConfig.className || 'Lớp Chủ Nhiệm';
  const schoolYear = classConfig.schoolYear || '2026-2027';

  const [semester, setSemester] = useState<1 | 2>(1);
  const [timetable, setTimetable] = useState<ClassTimetable>(() => {
    return loadClassTimetable(localStorage, classId, className, schoolYear, 1);
  });

  const [mode, setMode] = useState<TimetableMode>(timetable.mode || 'mon-fri');

  // Tuần học (1 -> 35)
  const allSchoolWeeks = useMemo(() => {
    try {
      const start = defaultWeekOneStart(schoolYear);
      return schoolWeeksFrom(start, 35);
    } catch {
      return schoolWeeksFrom('2026-09-07', 35);
    }
  }, [schoolYear]);

  const currentActualWeekNumber = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const found = allSchoolWeeks.find((w) => todayStr >= w.startDate && todayStr <= w.endDate);
    return found ? found.weekNumber : 1;
  }, [allSchoolWeeks]);

  const [selectedWeekNumber, setSelectedWeekNumber] = useState<number>(() => {
    return timetable.currentWeekNumber || currentActualWeekNumber || 1;
  });

  const selectedWeekInfo = useMemo(() => {
    return allSchoolWeeks.find((w) => w.weekNumber === selectedWeekNumber) || allSchoolWeeks[0];
  }, [allSchoolWeeks, selectedWeekNumber]);

  const weekStartDate = useMemo(() => {
    return selectedWeekInfo ? selectedWeekInfo.startDate : getMondayOfCurrentWeek();
  }, [selectedWeekInfo]);

  // Lưu và đồng bộ cả LocalStorage và Firestore Cloud (Real-time giữa PC và ĐT)
  const persistTimetable = useCallback((nextTable: ClassTimetable) => {
    setTimetable(nextTable);
    saveClassTimetable(localStorage, nextTable);
    if (auth.currentUser) {
      const docId = `${classId}_s${semester}`;
      setDoc(doc(db, 'classTimetables', docId), nextTable, { merge: true }).catch(() => {});
    }
  }, [classId, semester]);

  // Lắng nghe dữ liệu TKB lớp thời gian thực từ Cloud Firestore
  useEffect(() => {
    if (!auth.currentUser) return;
    const docId = `${classId}_s${semester}`;
    const unsub = onSnapshot(doc(db, 'classTimetables', docId), (snap) => {
      if (snap.exists()) {
        const cloudData = snap.data() as ClassTimetable;
        if (cloudData.slots && Object.keys(cloudData.slots).length > 0) {
          setTimetable((prev) => ({
            ...prev,
            ...cloudData,
          }));
          saveClassTimetable(localStorage, cloudData);
        }
      }
    }, () => {});
    return () => unsub();
  }, [classId, semester]);

  // Tải lại khi đổi lớp hoặc đổi học kỳ
  useEffect(() => {
    const loaded = loadClassTimetable(localStorage, classId, className, schoolYear, semester);
    setTimetable(loaded);
    if (loaded.mode) setMode(loaded.mode);
  }, [classId, className, schoolYear, semester]);

  // Chuyển đổi dạng TKB (Thứ 2 - Thứ 6 vs Thứ 2 - Thứ 7)
  const handleToggleMode = (newMode: TimetableMode) => {
    setMode(newMode);
    const nextTable: ClassTimetable = {
      ...timetable,
      mode: newMode,
      currentWeekNumber: selectedWeekNumber,
    };
    persistTimetable(nextTable);
  };

  const weekDays = useMemo(() => {
    return getWeekDates(weekStartDate, mode);
  }, [weekStartDate, mode]);

  const currentWeekSlots = useMemo(() => {
    const weekKey = `w${selectedWeekNumber}`;
    if (timetable.weekSlots && timetable.weekSlots[weekKey] && Object.keys(timetable.weekSlots[weekKey]).length > 0) {
      return timetable.weekSlots[weekKey];
    }
    return timetable.slots || {};
  }, [timetable, selectedWeekNumber]);

  // Modal chỉnh sửa 1 ô tiết học
  const [editingSlot, setEditingSlot] = useState<{ dayOfWeek: number; period: number } | null>(null);
  const [formSubject, setFormSubject] = useState('');
  const [formTeacher, setFormTeacher] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formNote, setFormNote] = useState('');

  const openEditModal = (dayOfWeek: number, period: number) => {
    const key = makeSlotKey(dayOfWeek, period);
    const slot = currentWeekSlots[key];
    setEditingSlot({ dayOfWeek, period });
    setFormSubject(slot?.subjectName || '');
    setFormTeacher(slot?.teacherName || '');
    setFormRoom(slot?.room || '');
    setFormNote(slot?.note || '');
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    const { dayOfWeek, period } = editingSlot;
    const key = makeSlotKey(dayOfWeek, period);

    if (!formSubject.trim()) {
      alert('Vui lòng nhập hoặc chọn tên môn học.');
      return;
    }

    const updatedSlot: ClassTimetableSlot = {
      dayOfWeek,
      period,
      subjectName: formSubject.trim(),
      teacherName: formTeacher.trim(),
      room: formRoom.trim(),
      note: formNote.trim(),
    };

    const nextWeekSlots = { ...currentWeekSlots, [key]: updatedSlot };
    const nextWeekSlotsMap = {
      ...(timetable.weekSlots || {}),
      [`w${selectedWeekNumber}`]: nextWeekSlots,
    };
    const nextTable: ClassTimetable = {
      ...timetable,
      slots: selectedWeekNumber === 1 ? nextWeekSlots : timetable.slots,
      weekSlots: nextWeekSlotsMap,
    };
    persistTimetable(nextTable);
    setEditingSlot(null);
  };

  const handleDeleteSlot = () => {
    if (!editingSlot) return;
    const { dayOfWeek, period } = editingSlot;
    const key = makeSlotKey(dayOfWeek, period);

    const nextWeekSlots = { ...currentWeekSlots };
    delete nextWeekSlots[key];

    const nextWeekSlotsMap = {
      ...(timetable.weekSlots || {}),
      [`w${selectedWeekNumber}`]: nextWeekSlots,
    };
    const nextTable: ClassTimetable = {
      ...timetable,
      slots: selectedWeekNumber === 1 ? nextWeekSlots : timetable.slots,
      weekSlots: nextWeekSlotsMap,
    };
    persistTimetable(nextTable);
    setEditingSlot(null);
  };

  // Modal Dán / Nhập TKB từ Excel
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [pasteScope, setPasteScope] = useState<'current_week' | 'from_here_on' | 'all_weeks'>('all_weeks');

  const handleApplyPastedText = () => {
    if (!pasteRawText.trim()) return;
    const detected = detectTimetableModeFromText(pasteRawText);
    const activeMode = detected || mode;
    const parsedSlots = parseClassTimetableFromText(pasteRawText, activeMode);
    const count = Object.keys(parsedSlots).length;

    if (count === 0) {
      alert('Không nhận diện được tiết học nào từ văn bản đã dán. Vui lòng kiểm tra lại cấu trúc cột theo hướng dẫn.');
      return;
    }

    if (detected && detected !== mode) {
      setMode(detected);
    }

    let nextTable = { ...timetable, mode: activeMode };

    if (pasteScope === 'current_week') {
      const nextMap = { ...(nextTable.weekSlots || {}), [`w${selectedWeekNumber}`]: parsedSlots };
      nextTable = { ...nextTable, weekSlots: nextMap };
    } else if (pasteScope === 'from_here_on') {
      const nextMap = { ...(nextTable.weekSlots || {}) };
      const maxWeek = semester === 1 ? 18 : 35;
      for (let w = selectedWeekNumber; w <= maxWeek; w++) {
        nextMap[`w${w}`] = parsedSlots;
      }
      nextTable = { ...nextTable, weekSlots: nextMap };
    } else {
      nextTable = {
        ...nextTable,
        slots: parsedSlots,
        weekSlots: { [`w${selectedWeekNumber}`]: parsedSlots },
      };
    }

    persistTimetable(nextTable);
    setIsPasteModalOpen(false);
    setPasteRawText('');
    alert(`Đã nhập thành công ${count} tiết học vào Thời khóa biểu Lớp ${className}!`);
  };

  // Sao chép giữa các tuần
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [targetCopyWeek, setTargetCopyWeek] = useState(selectedWeekNumber + 1);

  const handleExecuteCopyWeek = () => {
    const sourceSlots = currentWeekSlots;
    const nextMap = { ...(timetable.weekSlots || {}), [`w${targetCopyWeek}`]: sourceSlots };
    const nextTable: ClassTimetable = { ...timetable, weekSlots: nextMap };
    persistTimetable(nextTable);
    setIsCopyModalOpen(false);
    alert(`Đã sao chép lịch học của Tuần ${selectedWeekNumber} sang Tuần ${targetCopyWeek}!`);
  };

  const handleSetWeekAsDefault = () => {
    if (window.confirm(`Thầy/Cô có muốn đặt Thời khóa biểu của Tuần ${selectedWeekNumber} làm TKB chuẩn chung cho cả kỳ không?`)) {
      const nextTable: ClassTimetable = { ...timetable, slots: currentWeekSlots };
      persistTimetable(nextTable);
      alert('Đã cập nhật làm Thời khóa biểu chuẩn thành công!');
    }
  };

  const handleClearCurrentWeek = () => {
    if (!window.confirm(`Xóa toàn bộ các tiết học của Tuần ${selectedWeekNumber}?`)) return;
    const nextMap = { ...(timetable.weekSlots || {}), [`w${selectedWeekNumber}`]: {} };
    const nextTable = { ...timetable, weekSlots: nextMap };
    persistTimetable(nextTable);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportClassTimetableToExcel(timetable, mode, selectedWeekNumber);
  };

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      {/* ── Tiêu đề & Công cụ đầu trang ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/25">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Thời khóa biểu Lớp Chủ Nhiệm — {className}
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold border border-emerald-300">
                GVCN: {classConfig.homeroomTeacher || 'Nguyễn Văn Sang'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 font-semibold border border-blue-300">
                Niên khóa {schoolYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Thời khóa biểu toàn bộ các môn học trong tuần của lớp {className}, cho phép dán từ Excel, in ấn và đồng bộ Cloud.
            </p>
          </div>
        </div>

        {/* Nút tác vụ chính */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setIsCopyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Sao chép TKB tuần này sang tuần khác"
          >
            <Share2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span>Sao chép tuần</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
            title="Dán dữ liệu TKB sao chép từ Excel vào (Ctrl + V)"
          >
            <ClipboardPaste className="h-4 w-4" />
            <span>Dán từ Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Xuất Thời khóa biểu lớp ra file Excel (.xlsx)"
          >
            <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs transition active:scale-95 cursor-pointer"
            title="In Thời khóa biểu lớp"
          >
            <Printer className="h-4 w-4" />
            <span>In TKB</span>
          </button>

          <button
            type="button"
            onClick={handleSetWeekAsDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs transition active:scale-95 cursor-pointer"
            title="Đặt TKB của tuần này làm TKB chuẩn chung cả kỳ"
          >
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Đặt làm chuẩn</span>
          </button>
        </div>
      </div>

      {/* ── BỘ ĐIỀU KHIỂN CHỌN TUẦN & DẠNG TKB ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
        {/* Toggle 5 ngày / 6 ngày */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => handleToggleMode('mon-fri')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              mode === 'mon-fri'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Thứ 2 – Thứ 6 (5 ngày)
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode('mon-sat')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              mode === 'mon-sat'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Thứ 2 – Thứ 7 (6 ngày)
          </button>
        </div>

        {/* Học kỳ & Chọn tuần */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => setSemester(1)}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                semester === 1 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Học kỳ 1
            </button>
            <button
              type="button"
              onClick={() => setSemester(2)}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                semester === 2 ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'
              }`}
            >
              Học kỳ 2
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={selectedWeekNumber <= 1}
              onClick={() => setSelectedWeekNumber((prev) => Math.max(1, prev - 1))}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <select
              aria-label="Chọn tuần học"
              value={selectedWeekNumber}
              onChange={(e) => setSelectedWeekNumber(Number(e.target.value))}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              {allSchoolWeeks.map((w) => (
                <option key={w.weekNumber} value={w.weekNumber}>
                  Tuần {w.weekNumber} ({w.startDate.split('-').reverse().slice(0, 2).join('/')} - {w.endDate.split('-').reverse().slice(0, 2).join('/')})
                  {w.weekNumber === currentActualWeekNumber ? ' • Tuần này' : ''}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={selectedWeekNumber >= 35}
              onClick={() => setSelectedWeekNumber((prev) => Math.min(35, prev + 1))}
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearCurrentWeek}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 transition cursor-pointer"
            title="Xóa trắng các tiết của tuần này"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── BẢNG THỜI KHÓA BIỂU MA TRẬN TUẦN ── */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full text-center border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
              <th className="p-3 w-16 border-r border-slate-200 dark:border-slate-800">Buổi</th>
              <th className="p-3 w-28 border-r border-slate-200 dark:border-slate-800">Tiết</th>
              {weekDays.map((d) => {
                const dayLabels = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                return (
                  <th key={d.dayOfWeek} className="p-3 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                      {dayLabels[d.dayOfWeek]}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                      {d.displayDate}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {/* ── BUỔI SÁNG (Tiết 1 -> 5) ── */}
            {[1, 2, 3, 4, 5].map((period, idx) => (
              <tr key={period} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition">
                {idx === 0 && (
                  <td
                    rowSpan={5}
                    className="p-3 font-black text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20 border-r border-slate-200 dark:border-slate-800 uppercase tracking-widest text-[11px]"
                  >
                    Sáng
                  </td>
                )}
                <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400">
                  <div className="font-bold text-slate-800 dark:text-slate-200">Tiết {period}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{PERIOD_HOURS[period]}</div>
                </td>
                {weekDays.map((d) => {
                  const key = makeSlotKey(d.dayOfWeek, period);
                  const slot = currentWeekSlots[key];
                  return (
                    <td
                      key={d.dayOfWeek}
                      onClick={() => openEditModal(d.dayOfWeek, period)}
                      className="p-1.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0 cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition group"
                    >
                      {slot ? (
                        <div
                          className={`p-2 rounded-xl border text-left space-y-1 transition group-hover:shadow-xs group-hover:scale-[1.01] ${getSubjectBadgeColor(
                            slot.subjectName
                          )}`}
                        >
                          <div className="font-black text-xs leading-tight">{slot.subjectName}</div>
                          {slot.teacherName && (
                            <div className="text-[11px] font-medium opacity-90 flex items-center gap-1">
                              <User className="h-3 w-3 shrink-0" />
                              <span className="truncate">{slot.teacherName}</span>
                            </div>
                          )}
                          {slot.room && (
                            <div className="text-[10px] opacity-75 font-mono">📍 {slot.room}</div>
                          )}
                        </div>
                      ) : (
                        <div className="h-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 group-hover:border-emerald-300 dark:group-hover:border-emerald-700 transition">
                          <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 text-emerald-600 transition" />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Dòng phân cách Buổi trưa */}
            <tr className="bg-slate-100/60 dark:bg-slate-800/40 border-y-2 border-slate-200 dark:border-slate-700">
              <td colSpan={weekDays.length + 2} className="py-1 text-[11px] text-slate-400 italic font-medium">
                — Giờ nghỉ trưa —
              </td>
            </tr>

            {/* ── BUỔI CHIỀU (Tiết 6 -> 10) ── */}
            {[6, 7, 8, 9, 10].map((period, idx) => (
              <tr key={period} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/50 transition">
                {idx === 0 && (
                  <td
                    rowSpan={5}
                    className="p-3 font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/20 border-r border-slate-200 dark:border-slate-800 uppercase tracking-widest text-[11px]"
                  >
                    Chiều
                  </td>
                )}
                <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Tiết {period - 5} <span className="text-[10px] text-slate-400">(T.{period})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{PERIOD_HOURS[period]}</div>
                </td>
                {weekDays.map((d) => {
                  const key = makeSlotKey(d.dayOfWeek, period);
                  const slot = currentWeekSlots[key];
                  return (
                    <td
                      key={d.dayOfWeek}
                      onClick={() => openEditModal(d.dayOfWeek, period)}
                      className="p-1.5 border-r border-slate-200 dark:border-slate-800 last:border-r-0 cursor-pointer hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition group"
                    >
                      {slot ? (
                        <div
                          className={`p-2 rounded-xl border text-left space-y-1 transition group-hover:shadow-xs group-hover:scale-[1.01] ${getSubjectBadgeColor(
                            slot.subjectName
                          )}`}
                        >
                          <div className="font-black text-xs leading-tight">{slot.subjectName}</div>
                          {slot.teacherName && (
                            <div className="text-[11px] font-medium opacity-90 flex items-center gap-1">
                              <User className="h-3 w-3 shrink-0" />
                              <span className="truncate">{slot.teacherName}</span>
                            </div>
                          )}
                          {slot.room && (
                            <div className="text-[10px] opacity-75 font-mono">📍 {slot.room}</div>
                          )}
                        </div>
                      ) : (
                        <div className="h-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 group-hover:border-emerald-300 dark:group-hover:border-emerald-700 transition">
                          <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 text-emerald-600 transition" />
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── MODAL CHỈNH SỬA 1 Ô TIẾT HỌC ── */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <form
            onSubmit={handleSaveSlot}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                <span>
                  Tiết {editingSlot.period <= 5 ? editingSlot.period : editingSlot.period - 5} ({PERIOD_SESSION_INFO[editingSlot.period].sessionLabel}) • Thứ {editingSlot.dayOfWeek}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Môn học *
                </label>
                <input
                  type="text"
                  required
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Ví dụ: Toán, Ngữ văn, Tiếng Anh..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {COMMON_HIGH_SCHOOL_SUBJECTS.slice(0, 8).map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setFormSubject(sub)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 transition cursor-pointer"
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Giáo viên phụ trách
                </label>
                <input
                  type="text"
                  value={formTeacher}
                  onChange={(e) => setFormTeacher(e.target.value)}
                  placeholder="Ví dụ: Thầy Sang, Cô Mai..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phòng học
                  </label>
                  <input
                    type="text"
                    value={formRoom}
                    onChange={(e) => setFormRoom(e.target.value)}
                    placeholder="P.201, Lab..."
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ghi chú
                  </label>
                  <input
                    type="text"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="Ghi chú thêm..."
                    className="w-full p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleDeleteSlot}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                Xóa tiết này
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
                >
                  Lưu tiết học
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL DÁN / NHẬP TKB TỪ EXCEL ── */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold">
                  <ClipboardPaste className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Dán Thời khóa biểu Lớp {className} từ Excel
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

            <div className="space-y-2.5">
              <textarea
                rows={7}
                value={pasteRawText}
                onChange={(e) => setPasteRawText(e.target.value)}
                placeholder={`Dán dữ liệu copy từ Excel hoặc bảng vào đây... (Ctrl + V)

Ví dụ các cột từ Excel của lớp:
Buổi\tTiết\tThứ 2\tThứ 3\tThứ 4\tThứ 5\tThứ 6
Sáng\tTiết 1\tChào cờ\tToán (Thầy Sang)\tHóa học\tNgữ văn\tTiếng Anh
Sáng\tTiết 2\tToán (Thầy Sang)\tVật lí\tSinh học\tNgữ văn\tToán (Thầy Sang)`}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400/80 focus:ring-2 focus:ring-emerald-500"
              />

              {!pasteRawText && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400 flex-wrap">
                    <span>💡 Thứ tự các cột chuẩn:</span>
                    <span className="font-normal text-slate-700 dark:text-slate-300">
                      Buổi | Tiết | <b>Thứ 2</b> | <b>Thứ 3</b> | <b>Thứ 4</b> | <b>Thứ 5</b> | <b>Thứ 6</b> <i>(hoặc Thứ 7)</i>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    • Cú pháp ô: <span className="font-semibold text-emerald-600 dark:text-emerald-400">Toán (Thầy Sang)</span> hoặc <span className="font-semibold text-emerald-600 dark:text-emerald-400">Toán - Thầy Sang</span> hoặc chỉ cần <span className="font-semibold text-emerald-600 dark:text-emerald-400">Toán</span>.
                  </p>
                </div>
              )}

              {/* Phạm vi áp dụng */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Phạm vi áp dụng dữ liệu vừa dán:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="classPasteScope"
                      checked={pasteScope === 'current_week'}
                      onChange={() => setPasteScope('current_week')}
                      className="text-emerald-600"
                    />
                    <span>Chỉ Tuần {selectedWeekNumber}</span>
                  </label>
                  <label className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="classPasteScope"
                      checked={pasteScope === 'from_here_on'}
                      onChange={() => setPasteScope('from_here_on')}
                      className="text-emerald-600"
                    />
                    <span>Từ Tuần {selectedWeekNumber} trở đi</span>
                  </label>
                  <label className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="classPasteScope"
                      checked={pasteScope === 'all_weeks'}
                      onChange={() => setPasteScope('all_weeks')}
                      className="text-emerald-600"
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
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyPastedText}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
              >
                Áp dụng vào TKB Lớp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SAO CHÉP TUẦN ── */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Share2 className="h-4 w-4 text-purple-600" />
              <span>Sao chép TKB Lớp {className}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Sao chép toàn bộ lịch học của Tuần {selectedWeekNumber} sang tuần đích:
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sao chép sang Tuần:
              </label>
              <select
                aria-label="Chọn tuần đích"
                value={targetCopyWeek}
                onChange={(e) => setTargetCopyWeek(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
              >
                {allSchoolWeeks.map((w) => (
                  <option key={w.weekNumber} value={w.weekNumber}>
                    Tuần {w.weekNumber} ({w.startDate.split('-').reverse().slice(0, 2).join('/')})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCopyModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleExecuteCopyWeek}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition cursor-pointer"
              >
                Sao chép ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
