import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  CalendarRange,
  Award,
  Calendar,
  Users,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  Search,
  Filter,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  MessageSquare,
  Phone,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Share2,
  FileSpreadsheet,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DisciplineLog, Student } from '../types';
import {
  formatVietnameseDate,
  formatVietnameseNumber,
  exportToExcel,
  compareVietnameseNames,
  compareStudentCodes,
} from '../lib/utils';
import { classifyAttendance } from '../lib/attendanceStats';
import { TabType } from './Navbar';
import { currentSchoolWeek } from '../lib/weeklyPeriod';

interface AttendanceReportViewProps {
  onNavigateTab: (tab: TabType) => void;
  onSelectStudentForReport?: (studentId: string) => void;
  onNavigateToZalo?: (params: {
    studentId?: string | null;
    week?: number;
    month?: number;
    mode?: 'week' | 'month';
    templateId?: string;
  }) => void;
}

export interface StudentAttendanceDetail {
  student: Student;
  excusedCount: number;      // Số buổi nghỉ có phép (P)
  unexcusedCount: number;    // Số buổi nghỉ không phép (KP)
  truancyCount: number;       // Số lần bỏ/trốn tiết (BT)
  totalAbsenceCount: number;  // Tổng số buổi nghỉ (P + KP)
  hasAbsence: boolean;
  absenceLogs: Array<{
    id: string;
    date: string;
    weekNumber: number;
    month: number;
    periodOrTime?: string;
    behaviorDescription: string;
    note?: string;
    kind: 'excused' | 'unexcused' | 'truancy';
    count: number;
  }>;
}

export const AttendanceReportView: React.FC<AttendanceReportViewProps> = ({
  onNavigateTab,
  onSelectStudentForReport,
  onNavigateToZalo,
}) => {
  const { classConfig, students, disciplineLogs } = useApp();

  // Period mode: 'week' | 'month' | 'semester' | 'year'
  const [periodMode, setPeriodMode] = useState<'week' | 'month' | 'semester' | 'year'>('week');
  const [selectedMonth, setSelectedMonth] = useState<number>(() => currentSchoolWeek(classConfig.weeks)?.month ?? 9);
  const [selectedWeek, setSelectedWeek] = useState<number>(() => currentSchoolWeek(classConfig.weeks)?.weekNumber ?? 1);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);

  // Filter & Search states
  const [typeFilter, setTypeFilter] = useState<'absent-only' | 'unexcused' | 'excused' | 'truancy' | 'all'>('absent-only');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'total' | 'unexcused' | 'excused' | 'name' | 'code'>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Expanded row detail
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [copiedZaloSuccess, setCopiedZaloSuccess] = useState<boolean>(false);

  // Available weeks in selected month
  const availableWeeks = useMemo(() => {
    return classConfig.weeks.filter((w) => w.month === selectedMonth);
  }, [classConfig.weeks, selectedMonth]);

  // Sync selected week when month changes
  React.useEffect(() => {
    if (availableWeeks.length > 0 && !availableWeeks.some((w) => w.weekNumber === selectedWeek)) {
      setSelectedWeek(availableWeeks[0].weekNumber);
    }
  }, [selectedMonth, availableWeeks, selectedWeek]);

  // Current scope title description
  const scopeTitle = useMemo(() => {
    if (periodMode === 'week') {
      const wInfo = classConfig.weeks.find((w) => w.weekNumber === selectedWeek);
      const dates = wInfo ? ` (${formatVietnameseDate(wInfo.startDate)} - ${formatVietnameseDate(wInfo.endDate)})` : '';
      return `Tuần ${selectedWeek} • Tháng ${selectedMonth}${dates}`;
    }
    if (periodMode === 'month') {
      return `Tháng ${selectedMonth} (Năm học ${classConfig.schoolYear})`;
    }
    if (periodMode === 'semester') {
      const months = selectedSemester === 1 ? classConfig.semester1Months : classConfig.semester2Months;
      return `Học kỳ ${selectedSemester} (Tháng ${months.join(', ')})`;
    }
    return `Cả năm học ${classConfig.schoolYear}`;
  }, [periodMode, selectedWeek, selectedMonth, selectedSemester, classConfig]);

  // Filter logs within selected period
  const periodLogs = useMemo(() => {
    return disciplineLogs.filter((log) => {
      if (periodMode === 'week') {
        return log.weekNumber === selectedWeek;
      }
      if (periodMode === 'month') {
        return log.month === selectedMonth;
      }
      if (periodMode === 'semester') {
        const semesterMonths = selectedSemester === 1 ? classConfig.semester1Months : classConfig.semester2Months;
        return semesterMonths.includes(log.month);
      }
      // 'year'
      return true;
    });
  }, [disciplineLogs, periodMode, selectedWeek, selectedMonth, selectedSemester, classConfig]);

  // Build attendance summary per student
  const attendanceList = useMemo<StudentAttendanceDetail[]>(() => {
    return students.map((std) => {
      const stdLogs = periodLogs.filter((l) => l.studentId === std.id);
      let excusedCount = 0;
      let unexcusedCount = 0;
      let truancyCount = 0;
      const absenceLogs: StudentAttendanceDetail['absenceLogs'] = [];

      stdLogs.forEach((l) => {
        const kind = classifyAttendance(l);
        if (!kind) return;
        const cnt = Math.max(1, l.count || 1);

        if (kind === 'excused') excusedCount += cnt;
        if (kind === 'unexcused') unexcusedCount += cnt;
        if (kind === 'truancy') truancyCount += cnt;

        absenceLogs.push({
          id: l.id,
          date: l.date,
          weekNumber: l.weekNumber,
          month: l.month,
          periodOrTime: l.periodOrTime,
          behaviorDescription: l.behaviorDescription,
          note: l.note,
          kind,
          count: cnt,
        });
      });

      // Sort logs by date descending
      absenceLogs.sort((a, b) => b.date.localeCompare(a.date));

      const totalAbsenceCount = excusedCount + unexcusedCount;
      const hasAbsence = totalAbsenceCount > 0 || truancyCount > 0;

      return {
        student: std,
        excusedCount,
        unexcusedCount,
        truancyCount,
        totalAbsenceCount,
        hasAbsence,
        absenceLogs,
      };
    });
  }, [students, periodLogs]);

  // Overall attendance statistics
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const absentStudentsCount = attendanceList.filter((s) => s.hasAbsence).length;
    const perfectAttendanceCount = totalStudents - absentStudentsCount;

    const totalExcused = attendanceList.reduce((acc, curr) => acc + curr.excusedCount, 0);
    const totalUnexcused = attendanceList.reduce((acc, curr) => acc + curr.unexcusedCount, 0);
    const totalTruancy = attendanceList.reduce((acc, curr) => acc + curr.truancyCount, 0);
    const totalAbsence = totalExcused + totalUnexcused;

    return {
      totalStudents,
      absentStudentsCount,
      perfectAttendanceCount,
      totalExcused,
      totalUnexcused,
      totalTruancy,
      totalAbsence,
      absenceRate: totalStudents > 0 ? Math.round((absentStudentsCount / totalStudents) * 100) : 0,
      perfectRate: totalStudents > 0 ? Math.round((perfectAttendanceCount / totalStudents) * 100) : 100,
    };
  }, [students, attendanceList]);

  // Filtered and sorted student list
  const filteredData = useMemo(() => {
    let list = attendanceList;

    // Filter by type
    if (typeFilter === 'absent-only') {
      list = list.filter((s) => s.hasAbsence);
    } else if (typeFilter === 'unexcused') {
      list = list.filter((s) => s.unexcusedCount > 0);
    } else if (typeFilter === 'excused') {
      list = list.filter((s) => s.excusedCount > 0);
    } else if (typeFilter === 'truancy') {
      list = list.filter((s) => s.truancyCount > 0);
    }
    // 'all' keeps all students

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.student.fullName.toLowerCase().includes(q) ||
          s.student.studentCode.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortField === 'name') {
        return compareVietnameseNames(a.student, b.student, sortDirection);
      }
      if (sortField === 'code') {
        return compareStudentCodes(a.student.studentCode, b.student.studentCode, sortDirection);
      }
      if (sortField === 'excused') {
        const diff = b.excusedCount - a.excusedCount;
        return sortDirection === 'desc' ? diff : -diff;
      }
      if (sortField === 'unexcused') {
        const diff = b.unexcusedCount - a.unexcusedCount;
        return sortDirection === 'desc' ? diff : -diff;
      }
      // 'total'
      const diff = b.totalAbsenceCount - a.totalAbsenceCount;
      if (diff !== 0) return sortDirection === 'desc' ? diff : -diff;
      return compareVietnameseNames(a.student, b.student, 'asc');
    });
  }, [attendanceList, typeFilter, searchQuery, sortField, sortDirection]);

  // Export Excel
  const handleExportExcel = () => {
    const exportRows = filteredData.map((s, idx) => ({
      STT: idx + 1,
      'Mã học sinh': s.student.studentCode,
      'Họ và tên': s.student.fullName,
      'Ngày sinh': formatVietnameseDate(s.student.dateOfBirth),
      'Giới tính': s.student.gender || '—',
      'Tổng số buổi nghỉ': s.totalAbsenceCount,
      'Nghỉ có phép (P)': s.excusedCount,
      'Nghỉ không phép (KP)': s.unexcusedCount,
      'Bỏ / Trốn tiết (BT)': s.truancyCount,
      'Tình trạng chuyên cần': s.hasAbsence
        ? `Nghỉ ${s.totalAbsenceCount} buổi (P: ${s.excusedCount}, KP: ${s.unexcusedCount}${s.truancyCount > 0 ? `, BT: ${s.truancyCount}` : ''})`
        : 'Chuyên cần 100%',
      'Chi tiết các ngày nghỉ': s.absenceLogs
        .map((l) => `${formatVietnameseDate(l.date)} (${l.kind === 'excused' ? 'P' : l.kind === 'unexcused' ? 'KP' : 'BT'}): ${l.behaviorDescription}${l.note ? ` [${l.note}]` : ''}`)
        .join('; '),
      'SĐT Phụ huynh': s.student.parentPhone || '—',
    }));

    exportToExcel(
      exportRows,
      `Bao_cao_hoc_sinh_nghi_hoc_Lop_${classConfig.className}_${classConfig.schoolYear}_${periodMode}`,
      `Nghi_hoc`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // Copy quick summary message for Zalo
  const handleCopyZaloSummary = () => {
    const absentListText = attendanceList
      .filter((s) => s.hasAbsence)
      .map((s, i) => `${i + 1}. ${s.student.fullName} (${s.student.studentCode}): Nghỉ ${s.totalAbsenceCount} buổi (P: ${s.excusedCount}, KP: ${s.unexcusedCount}${s.truancyCount > 0 ? `, BT: ${s.truancyCount}` : ''})`)
      .join('\n');

    const text = `📢 BÁO CÁO CHUYÊN CẦN & DANH SÁCH HỌC SINH NGHỈ HỌC
🏫 Trường Cao đẳng Nghề số 1 - BQP • Lớp ${classConfig.className}
📅 Thời gian: ${scopeTitle}
👨‍🏫 GVCN: ${classConfig.homeroomTeacher || 'Nguyễn Văn Sang'}
━━━━━━━━━━━━━━━━━━━━
📊 THỐNG KÊ CHUNG:
• Sĩ số lớp: ${stats.totalStudents} HS
• Số HS có nghỉ học: ${stats.absentStudentsCount} HS (${stats.absenceRate}%)
• Số HS đi học chuyên cần 100%: ${stats.perfectAttendanceCount} HS (${stats.perfectRate}%)
• Tổng số buổi nghỉ: ${stats.totalAbsence} buổi (Có phép: ${stats.totalExcused}, Không phép: ${stats.totalUnexcused})
• Bỏ / trốn tiết: ${stats.totalTruancy} lần

📋 DANH SÁCH HỌC SINH NGHỈ HỌC:
${absentListText || 'Toàn lớp đi học đầy đủ 100%, không có học sinh nghỉ học.'}

💡 NHẮC NHỞ CHUYÊN CẦN: Kính đề nghị Quý Phụ huynh phối hợp đôn đốc các em đi học chuyên cần, đúng giờ để đảm bảo tiếp thu kiến thức đầy đủ!`;

    navigator.clipboard.writeText(text);
    setCopiedZaloSuccess(true);
    setTimeout(() => setCopiedZaloSuccess(false), 3500);
  };

  const handleSortChange = (field: 'total' | 'unexcused' | 'excused' | 'name' | 'code') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' || field === 'code' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="space-y-5">
      {/* HEADER SECTION */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-200 dark:border-rose-800 shadow-xs">
              <UserX className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Báo Cáo Danh Sách Học Sinh Nghỉ Học
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                  {stats.absentStudentsCount} HS nghỉ
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Theo dõi chi tiết số buổi nghỉ có phép, không phép, trốn tiết & tình trạng chuyên cần • Lớp {classConfig.className}
              </p>
            </div>
          </div>
        </div>

        {/* Scope selector & actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chọn Phạm vi: Tuần / Tháng / Học kỳ / Cả năm */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-750 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setPeriodMode('week')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                periodMode === 'week'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Tuần
            </button>
            <button
              onClick={() => setPeriodMode('month')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                periodMode === 'month'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Tháng
            </button>
            <button
              onClick={() => setPeriodMode('semester')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                periodMode === 'semester'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Học kỳ
            </button>
            <button
              onClick={() => setPeriodMode('year')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                periodMode === 'year'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Cả năm
            </button>
          </div>

          {/* Sub selectors based on periodMode */}
          {periodMode === 'week' && (
            <>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 font-medium">Tháng:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  {classConfig.months.map((m) => (
                    <option key={m} value={m} className="dark:bg-slate-800">
                      Tháng {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 font-medium">Tuần:</span>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  {availableWeeks.map((w) => (
                    <option key={w.weekNumber} value={w.weekNumber} className="dark:bg-slate-800">
                      Tuần {w.weekNumber} ({formatVietnameseDate(w.startDate).slice(0, 5)} - {formatVietnameseDate(w.endDate).slice(0, 5)})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {periodMode === 'month' && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 font-medium">Tháng:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {classConfig.months.map((m) => (
                  <option key={m} value={m} className="dark:bg-slate-800">
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodMode === 'semester' && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 font-medium">Kỳ:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value) as 1 | 2)}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value={1} className="dark:bg-slate-800">Học kỳ 1</option>
                <option value={2} className="dark:bg-slate-800">Học kỳ 2</option>
              </select>
            </div>
          )}

          {/* Action buttons */}
          <button
            onClick={handleCopyZaloSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 transition active:scale-95 shadow-xs cursor-pointer"
            title="Sao chép danh sách học sinh nghỉ học kèm số buổi để gửi nhóm Zalo phụ huynh hoặc BGH"
          >
            {copiedZaloSuccess ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedZaloSuccess ? 'Đã sao chép tin nhắn!' : 'Sao chép tin Zalo'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            title="Xuất bảng danh sách học sinh nghỉ học ra file Excel"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            title="In danh sách học sinh nghỉ học ra giấy A4"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>In</span>
          </button>
        </div>
      </div>

      {/* PRINT HEADER (ONLY VISIBLE ON PRINT) */}
      <div className="hidden print:block text-center space-y-1 pb-4 border-b border-slate-300">
        <p className="text-xs uppercase font-bold tracking-wider text-slate-600">TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP • KHOA CƠ BẢN</p>
        <h1 className="text-base font-extrabold text-slate-900 uppercase">
          BÁO CÁO DANH SÁCH HỌC SINH NGHỈ HỌC VÀ CHUYÊN CẦN
        </h1>
        <p className="text-xs text-slate-600">
          Lớp: <strong>{classConfig.className}</strong> • Năm học: <strong>{classConfig.schoolYear}</strong> • Giáo viên chủ nhiệm: <strong>{classConfig.homeroomTeacher || 'Nguyễn Văn Sang'}</strong>
        </p>
        <p className="text-xs text-slate-500 italic">Thời gian: {scopeTitle}</p>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5 print:hidden">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <span className="text-[11px] text-slate-500 font-medium block">Sĩ số theo dõi</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white">
            {stats.totalStudents} HS
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-medium">
            {stats.perfectAttendanceCount} HS đủ 100% chuyên cần
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 shadow-xs">
          <span className="text-[11px] text-rose-600 font-medium block">Số HS có nghỉ học</span>
          <span className="text-xl font-bold text-rose-600">
            {stats.absentStudentsCount} HS
          </span>
          <span className="text-[10px] text-rose-500 block mt-0.5">
            Chiếm {stats.absenceRate}% sĩ số lớp
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium block">Nghỉ có phép (P)</span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {stats.totalExcused} buổi
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Có đơn / lý do chính đáng
          </span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 shadow-xs">
          <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium block">Nghỉ không phép (KP)</span>
          <span className="text-xl font-bold text-rose-700 dark:text-rose-400">
            {stats.totalUnexcused} buổi
          </span>
          <span className="text-[10px] text-purple-600 dark:text-purple-400 block mt-0.5 font-medium">
            + {stats.totalTruancy} lần bỏ/trốn tiết (BT)
          </span>
        </div>

        <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-950/40 dark:to-emerald-900/20 p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-xs">
          <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Tỷ lệ chuyên cần</span>
          </div>
          <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-300 block mt-0.5">
            {stats.perfectRate}%
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-medium">
            {stats.perfectAttendanceCount}/{stats.totalStudents} HS đi học đủ 100%
          </span>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Attendance Type Filter Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-medium shrink-0">Lọc theo loại:</span>

            <button
              onClick={() => setTypeFilter('absent-only')}
              className={`px-3 py-1 rounded-lg transition font-semibold cursor-pointer ${
                typeFilter === 'absent-only'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tất cả HS có nghỉ ({stats.absentStudentsCount})
            </button>

            <button
              onClick={() => setTypeFilter('unexcused')}
              className={`px-2.5 py-1 rounded-lg transition font-semibold flex items-center gap-1 border cursor-pointer ${
                typeFilter === 'unexcused'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              <span>⚠️ Có nghỉ không phép ({attendanceList.filter((s) => s.unexcusedCount > 0).length})</span>
            </button>

            <button
              onClick={() => setTypeFilter('excused')}
              className={`px-2.5 py-1 rounded-lg transition font-semibold flex items-center gap-1 border cursor-pointer ${
                typeFilter === 'excused'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              }`}
            >
              <span>📋 Có nghỉ có phép ({attendanceList.filter((s) => s.excusedCount > 0).length})</span>
            </button>

            <button
              onClick={() => setTypeFilter('truancy')}
              className={`px-2.5 py-1 rounded-lg transition font-semibold flex items-center gap-1 border cursor-pointer ${
                typeFilter === 'truancy'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
              }`}
            >
              <span>🚪 Có bỏ tiết ({attendanceList.filter((s) => s.truancyCount > 0).length})</span>
            </button>

            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition font-semibold cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Toàn bộ lớp ({students.length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã HS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* MAIN ATTENDANCE REPORT TABLE */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[700px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-10 text-center">STT</th>
                <th
                  onClick={() => handleSortChange('code')}
                  className="py-3 px-3 w-28 cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                  title="Sắp xếp theo Mã học sinh"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={sortField === 'code' ? 'text-blue-600 font-bold' : ''}>Mã HS</span>
                    {sortField === 'code' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSortChange('name')}
                  className="py-3 px-3 min-w-[170px] cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                  title="Sắp xếp theo Họ và Tên (A-Z)"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={sortField === 'name' ? 'text-blue-600 font-bold' : ''}>Họ và tên</span>
                    {sortField === 'name' && (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />)}
                  </div>
                </th>
                <th className="py-3 px-3 w-24 text-center">Ngày sinh</th>
                <th
                  onClick={() => handleSortChange('total')}
                  className="py-3 px-3 text-center w-28 font-bold cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-700 transition text-rose-700 dark:text-rose-400"
                  title="Tổng số buổi nghỉ học (P + KP)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Tổng buổi nghỉ</span>
                    {sortField === 'total' && (sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-rose-600" /> : <ArrowUp className="h-3 w-3 text-rose-600" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSortChange('excused')}
                  className="py-3 px-3 text-center w-28 cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                  title="Số buổi nghỉ có phép (P)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-amber-700 dark:text-amber-400 font-bold">Có phép (P)</span>
                    {sortField === 'excused' && (sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-amber-600" /> : <ArrowUp className="h-3 w-3 text-amber-600" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSortChange('unexcused')}
                  className="py-3 px-3 text-center w-28 cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                  title="Số buổi nghỉ không phép (KP)"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-rose-700 dark:text-rose-400 font-bold">Không phép (KP)</span>
                    {sortField === 'unexcused' && (sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-rose-600" /> : <ArrowUp className="h-3 w-3 text-rose-600" />)}
                  </div>
                </th>
                <th className="py-3 px-3 text-center w-24">Bỏ tiết (BT)</th>
                <th className="py-3 px-3 min-w-[260px]">Chi tiết các ngày & lý do nghỉ</th>
                <th className="py-3 px-3 text-center w-36">Tình trạng chuyên cần</th>
                <th className="py-3 px-3 text-center w-24 print:hidden">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
                        Không có học sinh nào phù hợp với điều kiện lọc hiện tại.
                      </p>
                      <p className="text-xs text-slate-400">
                        {typeFilter === 'absent-only'
                          ? `Trong ${scopeTitle}, toàn bộ học sinh đi học chuyên cần đầy đủ 100%!`
                          : 'Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc chọn phạm vi thời gian khác.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((s, idx) => {
                  const isExpanded = expandedStudentId === s.student.id;

                  return (
                    <React.Fragment key={s.student.id}>
                      <tr
                        className={`hover:bg-blue-50/40 dark:hover:bg-slate-750/50 transition-colors ${
                          s.hasAbsence ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                          {s.student.studentCode}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {s.student.fullName}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">
                          {formatVietnameseDate(s.student.dateOfBirth)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {s.totalAbsenceCount > 0 ? (
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs">
                              {s.totalAbsenceCount} buổi
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono font-semibold">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {s.excusedCount > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              {s.excusedCount}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {s.unexcusedCount > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              {s.unexcusedCount}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {s.truancyCount > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {s.truancyCount}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {s.absenceLogs.length === 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium italic">
                              Chuyên cần 100%, không vắng buổi nào.
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {s.absenceLogs.slice(0, isExpanded ? undefined : 2).map((log) => (
                                <div key={log.id} className="flex items-start gap-1.5 text-[11px]">
                                  <span
                                    className={`shrink-0 px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                      log.kind === 'excused'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        : log.kind === 'unexcused'
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                        : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                                    }`}
                                  >
                                    {log.kind === 'excused' ? 'Có phép' : log.kind === 'unexcused' ? 'K.phép' : 'Bỏ tiết'}
                                  </span>
                                  <span className="text-slate-500 font-mono">
                                    {formatVietnameseDate(log.date)}
                                    {log.periodOrTime ? ` (${log.periodOrTime})` : ''}:
                                  </span>
                                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                                    {log.behaviorDescription}
                                    {log.note ? ` • Ghi chú: ${log.note}` : ''}
                                  </span>
                                </div>
                              ))}

                              {s.absenceLogs.length > 2 && (
                                <button
                                  onClick={() => setExpandedStudentId(isExpanded ? null : s.student.id)}
                                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-0.5 print:hidden cursor-pointer"
                                >
                                  {isExpanded ? (
                                    <>
                                      <span>Thu gọn</span>
                                      <ChevronUp className="h-3 w-3" />
                                    </>
                                  ) : (
                                    <>
                                      <span>Xem thêm {s.absenceLogs.length - 2} buổi khác</span>
                                      <ChevronDown className="h-3 w-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {s.hasAbsence ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                              Có nghỉ ({s.totalAbsenceCount} buổi)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300">
                              Chuyên cần 100%
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                if (onNavigateToZalo) {
                                  onNavigateToZalo({
                                    studentId: s.student.id,
                                    week: periodMode === 'week' ? selectedWeek : undefined,
                                    month: selectedMonth,
                                    mode: periodMode === 'week' ? 'week' : 'month',
                                  });
                                } else {
                                  onNavigateTab('zalo-composer');
                                }
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition"
                              title={`Soạn tin nhắn Zalo gửi phụ huynh học sinh ${s.student.fullName}`}
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </button>

                            {onSelectStudentForReport && (
                              <button
                                onClick={() => onSelectStudentForReport(s.student.id)}
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition"
                                title={`Xem phiếu báo phụ huynh của ${s.student.fullName}`}
                              >
                                <Award className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINT FOOTER SIGNATURE SECTION (ONLY VISIBLE ON PRINT) */}
      <div className="hidden print:grid grid-cols-3 text-center text-xs pt-8 mt-6 border-t border-slate-300">
        <div>
          <p className="font-bold uppercase">NGƯỜI LẬP BÁO CÁO</p>
          <p className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
          <div className="h-16" />
        </div>
        <div>
          <p className="font-bold uppercase">TRƯỞNG KHOA / TTCM</p>
          <p className="text-[11px] text-slate-500 italic mt-0.5">(Ký và phê duyệt)</p>
          <div className="h-16" />
          <p className="font-bold">Phạm Thị Thu Trang</p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 italic">Thái Nguyên, ngày ..... tháng ..... năm 2026</p>
          <p className="font-bold uppercase mt-1">GIÁO VIÊN CHỦ NHIỆM</p>
          <p className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
          <div className="h-16" />
          <p className="font-bold">{classConfig.homeroomTeacher || 'Nguyễn Văn Sang'}</p>
        </div>
      </div>
    </div>
  );
};
