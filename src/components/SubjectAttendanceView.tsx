import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Save,
  Search,
  AlertTriangle,
  UserCheck,
  Users,
  ChevronRight,
  BookOpen,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSubjectRoster } from '../hooks/useSubjectRoster';
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
  type SubjectAttendanceBook,
  type StudentAttendanceEntry,
  makeSessionId,
  readDeviceSubjectAttendance,
  saveDeviceSubjectAttendance,
  calculateStudentAttendanceStats,
  exportSubjectAttendanceToExcel,
} from '../lib/subjectAttendance';

export function SubjectAttendanceView() {
  const {
    classConfig,
    activeAccount,
    workspaceClasses,
    students: ownStudents,
  } = useApp();

  const teacherId = activeAccount?.uid || '';
  const teacherName = classConfig.homeroomTeacher || activeAccount?.displayName || 'Nguyễn Văn Sang';
  const subjectName = classConfig.subjectName || classConfig.teachingSubject || 'Toán';

  const { students, ready: rosterReady, error: rosterError } = useSubjectRoster(
    classConfig,
    workspaceClasses,
    ownStudents
  );

  // Chỉ áp dụng điểm danh cho học sinh đang học
  const activeStudents = useMemo(() => students.filter((s) => s.status === 'active'), [students]);

  const [viewTab, setViewTab] = useState<'session' | 'overview'>('session');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [lessonTitle, setLessonTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Attendance Book loaded from device storage
  const [book, setBook] = useState<SubjectAttendanceBook>(() =>
    readDeviceSubjectAttendance(
      localStorage,
      teacherId,
      classConfig.id,
      subjectName,
      classConfig.schoolYear
    )
  );

  // Sync book when class or teacher changes
  useEffect(() => {
    setBook(
      readDeviceSubjectAttendance(
        localStorage,
        teacherId,
        classConfig.id,
        subjectName,
        classConfig.schoolYear
      )
    );
    setHasChanges(false);
    setMessage('');
  }, [classConfig.id, teacherId, subjectName, classConfig.schoolYear]);

  // Current session ID
  const currentSessionId = makeSessionId(selectedDate, selectedPeriod);
  const currentSession = book.sessions[currentSessionId];

  // Sync lesson title when session changes
  useEffect(() => {
    setLessonTitle(currentSession?.lessonTitle || '');
  }, [currentSessionId, currentSession?.lessonTitle]);

  // Handle status change for a student
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setBook(prev => {
      const existingSession = prev.sessions[currentSessionId] || {
        id: currentSessionId,
        date: selectedDate,
        periodNumber: selectedPeriod,
        lessonTitle: lessonTitle.trim(),
        records: {},
        updatedAt: new Date().toISOString(),
      };

      const existingRecord = existingSession.records[studentId] || { status: 'present' };

      const updatedRecords: Record<string, StudentAttendanceEntry> = {
        ...existingSession.records,
        [studentId]: {
          ...existingRecord,
          status,
        },
      };

      const updatedSession = {
        ...existingSession,
        lessonTitle: lessonTitle.trim(),
        records: updatedRecords,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...prev,
        sessions: {
          ...prev.sessions,
          [currentSessionId]: updatedSession,
        },
        updatedAt: new Date().toISOString(),
      };
    });
    setHasChanges(true);
    setMessage('');
  };

  // Handle note change for a student
  const handleNoteChange = (studentId: string, note: string) => {
    setBook(prev => {
      const existingSession = prev.sessions[currentSessionId] || {
        id: currentSessionId,
        date: selectedDate,
        periodNumber: selectedPeriod,
        lessonTitle: lessonTitle.trim(),
        records: {},
        updatedAt: new Date().toISOString(),
      };

      const existingRecord = existingSession.records[studentId] || { status: 'present' };

      const updatedRecords: Record<string, StudentAttendanceEntry> = {
        ...existingSession.records,
        [studentId]: {
          ...existingRecord,
          note,
        },
      };

      return {
        ...prev,
        sessions: {
          ...prev.sessions,
          [currentSessionId]: {
            ...existingSession,
            records: updatedRecords,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
    setHasChanges(true);
  };

  // Quick Action: Mark all students present
  const handleMarkAllPresent = () => {
    setBook(prev => {
      const existingSession = prev.sessions[currentSessionId] || {
        id: currentSessionId,
        date: selectedDate,
        periodNumber: selectedPeriod,
        lessonTitle: lessonTitle.trim(),
        records: {},
        updatedAt: new Date().toISOString(),
      };

      const updatedRecords: Record<string, StudentAttendanceEntry> = {
        ...existingSession.records,
      };

      activeStudents.forEach(s => {
        updatedRecords[s.id] = {
          status: 'present',
          note: updatedRecords[s.id]?.note || '',
        };
      });

      return {
        ...prev,
        sessions: {
          ...prev.sessions,
          [currentSessionId]: {
            ...existingSession,
            lessonTitle: lessonTitle.trim(),
            records: updatedRecords,
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
    setHasChanges(true);
    setMessage('Đã đánh dấu tất cả học sinh có mặt.');
  };

  // Save changes to device storage
  const handleSave = () => {
    saveDeviceSubjectAttendance(localStorage, teacherId, book);
    setHasChanges(false);
    setMessage('Đã lưu dữ liệu điểm danh trên thiết bị này thành công.');
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      exportSubjectAttendanceToExcel({
        book,
        students: activeStudents,
        className: classConfig.className,
        teacherName,
      });
      setMessage('Đã xuất file Excel điểm danh chuyên cần thành công.');
    } catch (err) {
      alert(`Lỗi khi xuất file Excel: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Filter students by query
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return activeStudents;
    return activeStudents.filter(
      s => s.fullName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q)
    );
  }, [activeStudents, searchQuery]);

  // Current session statistics
  const sessionStats = useMemo(() => {
    let present = 0;
    let excused = 0;
    let unexcused = 0;
    let late = 0;
    let truant = 0;

    activeStudents.forEach(s => {
      const rec = currentSession?.records[s.id];
      const status: AttendanceStatus = rec?.status || 'present';
      if (status === 'present') present++;
      else if (status === 'excused') excused++;
      else if (status === 'unexcused') unexcused++;
      else if (status === 'late') late++;
      else if (status === 'truant') truant++;
    });

    return {
      total: activeStudents.length,
      present,
      excused,
      unexcused,
      late,
      truant,
      absentTotal: excused + unexcused + truant,
    };
  }, [activeStudents, currentSession]);

  if (rosterError) {
    return <div role="alert" className="p-6 text-rose-700 bg-rose-50 rounded-xl">{rosterError}</div>;
  }

  if (!rosterReady) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
        <Clock className="h-6 w-6 animate-spin text-purple-600" />
        <p className="font-semibold text-sm">Đang tải danh sách học sinh lớp {classConfig.className}...</p>
      </div>
    );
  }

  const totalSessionsCount = Object.keys(book.sessions).length;

  return (
    <section className="space-y-4">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Điểm danh bộ môn {subjectName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                Lớp {classConfig.className}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Năm học {classConfig.schoolYear} · GV: <strong>{teacherName}</strong> · Đã ghi nhận <strong>{totalSessionsCount}</strong> tiết học
            </p>
          </div>
        </div>

        {/* Buttons Action */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Xuất Excel chuyên cần</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition active:scale-95 cursor-pointer ${
              hasChanges
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/25 animate-pulse'
                : 'bg-slate-700 hover:bg-slate-800'
            }`}
          >
            <Save className="h-4 w-4" />
            <span>{hasChanges ? 'Lưu điểm danh (Có thay đổi)' : 'Đã lưu'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div role="status" className="p-3 text-sm rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 flex items-center justify-between">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage('')} className="text-xs underline text-purple-700">Đóng</button>
        </div>
      )}

      {/* ── Mode Switcher: Theo Tiết vs Bảng Cả Kỳ ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setViewTab('session')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            viewTab === 'session'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Điểm danh theo tiết dạy</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab('overview')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
            viewTab === 'overview'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Sổ theo dõi cả kỳ & Cảnh báo cấm thi</span>
        </button>
      </div>

      {/* ── VIEW 1: ĐIỂM DANH THEO TIẾT DẠY ── */}
      {viewTab === 'session' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="attendance-date" className="text-xs font-bold text-slate-500 whitespace-nowrap">
                  Ngày dạy:
                </label>
                <input
                  id="attendance-date"
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm font-semibold"
                />
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="attendance-period" className="text-xs font-bold text-slate-500 whitespace-nowrap">
                  Tiết:
                </label>
                <select
                  id="attendance-period"
                  value={selectedPeriod}
                  onChange={e => setSelectedPeriod(Number(e.target.value))}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm font-semibold"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(p => (
                    <option key={p} value={p}>
                      Tiết {p} ({p <= 5 ? 'Sáng' : 'Chiều'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Nội dung bài dạy (VD: Bài 4: Phương trình bậc hai)..."
                  value={lessonTitle}
                  onChange={e => {
                    setLessonTitle(e.target.value);
                    setHasChanges(true);
                  }}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm"
                />
              </div>

              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              >
                <UserCheck className="h-4 w-4" />
                <span>Tất cả có mặt</span>
              </button>
            </div>

            {/* Session Summary Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold">
              <span className="text-slate-500">Sĩ số: <strong>{sessionStats.total}</strong> HS</span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Có mặt: {sessionStats.present}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Phép (P): {sessionStats.excused}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                Không phép (KP): {sessionStats.unexcused}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                Muộn (M): {sessionStats.late}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-200 text-red-900 dark:bg-red-950/90 dark:text-red-300 border border-red-400 dark:border-red-800">
                Bỏ tiết (BT): {sessionStats.truant}
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm học sinh theo tên hoặc mã..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
            />
          </div>

          {/* Student Attendance Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-sm text-left">
              <thead className="bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 border-b border-purple-100 dark:border-purple-900">
                <tr>
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3 w-28">Mã HS</th>
                  <th className="p-3 min-w-[180px]">Họ và tên</th>
                  <th className="p-3 text-center min-w-[320px]">Trạng thái điểm danh tiết {selectedPeriod}</th>
                  <th className="p-3 min-w-[180px]">Ghi chú (lý do)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.map((student, idx) => {
                  const rec = currentSession?.records[student.id];
                  const currentStatus: AttendanceStatus = rec?.status || 'present';

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        currentStatus === 'unexcused' || currentStatus === 'truant'
                          ? 'bg-rose-50/40 dark:bg-rose-950/10'
                          : currentStatus === 'excused'
                          ? 'bg-amber-50/40 dark:bg-amber-950/10'
                          : ''
                      }`}
                    >
                      <td className="p-3 text-center text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="p-3 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                        {student.studentCode || '—'}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                        {student.fullName}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {(Object.keys(ATTENDANCE_STATUSES) as AttendanceStatus[]).map(st => {
                            const info = ATTENDANCE_STATUSES[st];
                            const isSelected = currentStatus === st;

                            return (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleStatusChange(student.id, st)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                                  isSelected
                                    ? `${info.buttonClass} shadow-xs scale-105`
                                    : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                {info.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          placeholder="Lý do..."
                          value={rec?.note || ''}
                          onChange={e => handleNoteChange(student.id, e.target.value)}
                          className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW 2: TỔNG HỢP CẢ KỲ & CẢNH BÁO CẤM THI ── */}
      {viewTab === 'overview' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-bold">Quy chuẩn chuyên cần bộ môn:</p>
              <p className="mt-0.5">
                Học sinh nghỉ quá <strong>20% tổng số tiết</strong> của môn học sẽ bị đưa vào danh sách cảnh báo và có thể bị cấm thi theo quy chế đào tạo hiện hành.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-sm text-left">
              <thead className="bg-purple-50 dark:bg-purple-950/50 text-purple-900 dark:text-purple-200 border-b border-purple-100 dark:border-purple-900">
                <tr>
                  <th className="p-3 w-12 text-center">STT</th>
                  <th className="p-3 w-28">Mã HS</th>
                  <th className="p-3 min-w-[180px]">Họ và tên</th>
                  <th className="p-3 text-center">Tổng tiết</th>
                  <th className="p-3 text-center text-emerald-700">Có mặt</th>
                  <th className="p-3 text-center text-amber-700">Nghỉ phép</th>
                  <th className="p-3 text-center text-rose-700">Không phép</th>
                  <th className="p-3 text-center text-purple-700">Đi muộn</th>
                  <th className="p-3 text-center text-red-700">Bỏ tiết</th>
                  <th className="p-3 text-center font-bold">Tổng vắng</th>
                  <th className="p-3 text-center font-bold">Tỉ lệ vắng</th>
                  <th className="p-3 text-center">Tình trạng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeStudents.map((student, idx) => {
                  const stats = calculateStudentAttendanceStats(book, student.id);

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        stats.isBannedWarning ? 'bg-red-50/60 dark:bg-red-950/20' : ''
                      }`}
                    >
                      <td className="p-3 text-center text-slate-500 font-mono text-xs">{idx + 1}</td>
                      <td className="p-3 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                        {student.studentCode || '—'}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                        {student.fullName}
                      </td>
                      <td className="p-3 text-center font-mono">{stats.totalSessionsHeld}</td>
                      <td className="p-3 text-center font-mono font-bold text-emerald-600">{stats.presentCount}</td>
                      <td className="p-3 text-center font-mono text-amber-600">{stats.excusedCount || '—'}</td>
                      <td className="p-3 text-center font-mono text-rose-600">{stats.unexcusedCount || '—'}</td>
                      <td className="p-3 text-center font-mono text-purple-600">{stats.lateCount || '—'}</td>
                      <td className="p-3 text-center font-mono text-red-600">{stats.truantCount || '—'}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {stats.totalAbsencePeriods || '—'}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        <span className={stats.absencePercent >= 20 ? 'text-red-600' : 'text-slate-600'}>
                          {stats.absencePercent}%
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {stats.isBannedWarning ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800 inline-flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>CẤM THI</span>
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            Bình thường
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
