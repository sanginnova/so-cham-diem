import React, { useState, useMemo } from 'react';
import { FamilyManagement } from './FamilyManagement';
import { currentSchoolWeek, type ReportPeriodSelection } from '../lib/weeklyPeriod';
import {
  MessageSquareShare,
  Copy,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  HeartHandshake,
  Send,
  Calendar,
  AlertCircle,
  Share2,
  ExternalLink,
  PhoneCall,
  Key,
  ShieldCheck,
  Flame,
  Award,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatVietnameseDate,
  formatVietnameseNumber,
  removeVietnameseAccents,
  getRankBadgeClass,
  compareVietnameseNames,
  compareStudentCodes,
} from '../lib/utils';
import { Student, StudentWeeklySummary } from '../types';
import { StudentReportZaloModal } from './StudentReportZaloModal';

interface ParentReportViewProps {
  initialSelectedStudentId?: string | null;
  initialPeriod?: ReportPeriodSelection;
}

export const ParentReportView: React.FC<ParentReportViewProps> = ({
  initialSelectedStudentId,
  initialPeriod,
}) => {
  const {
    students,
    classConfig,
    disciplineLogs,
    getWeeklySummary,
    getMonthlySummary,
    getSemesterSummary,
  } = useApp();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialSelectedStudentId || (students[0]?.id ?? '')
  );
  const [reportPeriod, setReportPeriod] = useState<'week' | 'month' | 'semester'>(initialPeriod?.period ?? 'week');
  const [selectedMonth, setSelectedMonth] = useState<number>(() => initialPeriod?.month ?? currentSchoolWeek(classConfig.weeks)?.month ?? 9);
  const [selectedWeek, setSelectedWeek] = useState<number>(() => initialPeriod?.weekNumber ?? currentSchoolWeek(classConfig.weeks)?.weekNumber ?? 1);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(() => initialPeriod?.semester ?? currentSchoolWeek(classConfig.weeks)?.semester ?? 1);

  const [studentSearch, setStudentSearch] = useState('');
  const [studentSortBy, setStudentSortBy] = useState<'name' | 'code'>('name');
  const [studentFilterMode, setStudentFilterMode] = useState<'all' | 'need_attention' | 'honors'>('all');
  const [copied, setCopied] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [teacherPersonalNote, setTeacherPersonalNote] = useState('');
  const [isZaloModalOpen, setIsZaloModalOpen] = useState(false);

  // Selected student object
  const currentStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  // Weeks for this month
  const availableWeeks = useMemo(() => {
    return classConfig.weeks.filter((w) => w.month === selectedMonth);
  }, [classConfig.weeks, selectedMonth]);

  React.useEffect(() => {
    if (availableWeeks.length > 0 && !availableWeeks.some((w) => w.weekNumber === selectedWeek)) {
      setSelectedWeek(availableWeeks[0].weekNumber);
    }
  }, [selectedMonth, availableWeeks, selectedWeek]);

  // Current student index and quick previous/next
  const studentIndex = useMemo(() => {
    return students.findIndex((s) => s.id === currentStudent?.id);
  }, [students, currentStudent]);

  const handlePrevStudent = () => {
    if (studentIndex > 0) {
      setSelectedStudentId(students[studentIndex - 1].id);
      setCopied(false);
    }
  };

  const handleNextStudent = () => {
    if (studentIndex < students.length - 1) {
      setSelectedStudentId(students[studentIndex + 1].id);
      setCopied(false);
    }
  };

  // Get specific logs for the period
  const periodLogs = useMemo(() => {
    if (!currentStudent) return [];
    return disciplineLogs.filter((l) => {
      if (l.studentId !== currentStudent.id) return false;
      if (reportPeriod === 'week') {
        return l.weekNumber === selectedWeek;
      } else if (reportPeriod === 'month') {
        return l.month === selectedMonth;
      } else {
        const months = selectedSemester === 1 ? classConfig.semester1Months : classConfig.semester2Months;
        return months.includes(l.month);
      }
    });
  }, [disciplineLogs, currentStudent, reportPeriod, selectedWeek, selectedMonth, selectedSemester, classConfig]);

  // Calculated score for the period
  const periodSummary = useMemo(() => {
    if (!currentStudent) return null;
    if (reportPeriod === 'week') {
      const summaryList = getWeeklySummary(selectedWeek, selectedMonth);
      return summaryList.find((s) => s.studentId === currentStudent.id);
    } else if (reportPeriod === 'month') {
      const summaryList = getMonthlySummary(selectedMonth);
      return summaryList.find((s) => s.studentId === currentStudent.id);
    } else {
      const summaryList = getSemesterSummary(selectedSemester);
      const semItem = summaryList.find((s) => s.studentId === currentStudent.id);
      if (!semItem) return null;
      return {
        studentId: semItem.studentId,
        studentCode: semItem.studentCode,
        fullName: semItem.fullName,
        weekNumber: 0,
        month: 0,
        baseScore: 10,
        totalDeduct: semItem.totalDeduct,
        totalBonus: semItem.totalBonus,
        finalScore: semItem.averageScore,
        rank: semItem.finalRank,
        violationCount: semItem.totalViolations,
        excusedAbsenceCount: 0,
        unexcusedAbsenceCount: 0,
        truancyCount: 0,
        status: 'active' as const,
        bonusCount: 0,
        notes: '',
      } as StudentWeeklySummary;
    }
  }, [currentStudent, reportPeriod, selectedWeek, selectedMonth, selectedSemester, getWeeklySummary, getMonthlySummary, getSemesterSummary]);

  // Map of student score for quick filtering in the sidebar
  const studentScoreMap = useMemo(() => {
    if (reportPeriod === 'week') {
      const list = getWeeklySummary(selectedWeek, selectedMonth);
      return new Map(list.map((s) => [s.studentId, s]));
    } else if (reportPeriod === 'month') {
      const list = getMonthlySummary(selectedMonth);
      return new Map(list.map((s) => [s.studentId, s]));
    } else {
      const list = getSemesterSummary(selectedSemester);
      return new Map(
        list.map((s) => [
          s.studentId,
          {
            studentId: s.studentId,
            studentCode: s.studentCode,
            fullName: s.fullName,
            weekNumber: 0,
            month: 0,
            baseScore: 10,
            totalDeduct: s.totalDeduct,
            totalBonus: s.totalBonus,
            finalScore: s.averageScore,
            rank: s.finalRank,
            violationCount: s.totalViolations,
            excusedAbsenceCount: 0,
            unexcusedAbsenceCount: 0,
            truancyCount: 0,
            status: 'active' as const,
            bonusCount: 0,
            notes: '',
          } as StudentWeeklySummary,
        ])
      );
    }
  }, [reportPeriod, selectedWeek, selectedMonth, selectedSemester, getWeeklySummary, getMonthlySummary, getSemesterSummary]);

  // Student list search & sort & filter
  const filteredStudents = useMemo(() => {
    let list = students;

    // Filter mode
    if (studentFilterMode === 'need_attention') {
      list = list.filter((s) => {
        const sum = studentScoreMap.get(s.id);
        return sum && (sum.finalScore < 8.0 || (sum.totalDeduct > 0));
      });
    } else if (studentFilterMode === 'honors') {
      list = list.filter((s) => {
        const sum = studentScoreMap.get(s.id);
        return sum && (sum.finalScore >= 9.0 || sum.totalBonus > 0);
      });
    }

    // Search query
    if (studentSearch) {
      const q = removeVietnameseAccents(studentSearch);
      list = list.filter(
        (s) =>
          removeVietnameseAccents(s.fullName).includes(q) ||
          s.studentCode.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (studentSortBy === 'code') {
        return compareStudentCodes(a.studentCode, b.studentCode, 'asc');
      }
      return compareVietnameseNames(a, b, 'asc');
    });
  }, [students, studentSearch, studentSortBy, studentFilterMode, studentScoreMap]);

  // Compose Polite & Constructive Message
  const generatedMessage = useMemo(() => {
    if (!currentStudent || !periodSummary) return '';

    const periodText =
      reportPeriod === 'week'
        ? `tuần ${selectedWeek} (tháng ${selectedMonth})`
        : reportPeriod === 'month'
        ? `tháng ${selectedMonth}`
        : `Học kỳ ${selectedSemester} (Năm học ${classConfig.schoolYear})`;

    const score = formatVietnameseNumber(periodSummary.finalScore);
    const deduct = formatVietnameseNumber(periodSummary.totalDeduct);
    const bonus = formatVietnameseNumber(periodSummary.totalBonus);
    const rank = periodSummary.rank;

    const violations = periodLogs.filter((l) => l.type === 'deduct');
    const bonuses = periodLogs.filter((l) => l.type === 'bonus');

    const contentLines: string[] = [];

    const teacherName = classConfig.homeroomTeacher || 'Nguyễn Văn Sang';
    const school = classConfig.schoolName || 'Trường Cao đẳng nghề 01 - BQP';
    const teacherPhone = classConfig.teacherPhone ? ` • SĐT: ${classConfig.teacherPhone}` : '';

    contentLines.push(`Kính gửi Quý phụ huynh học sinh ${currentStudent.fullName},`);
    contentLines.push('');
    contentLines.push(
      `Thầy/Cô ${teacherName} - Giáo viên chủ nhiệm lớp ${classConfig.className}, ${school} xin gửi tới Quý gia đình thông tin rèn luyện nề nếp của em ${currentStudent.fullName} (Mã HS: ${currentStudent.studentCode}) trong ${periodText}:`
    );
    contentLines.push('');
    contentLines.push(`• Điểm rèn luyện đạt được: ${score} điểm (Thang chuẩn: 10đ)`);
    contentLines.push(`• Xếp loại thi đua: ${rank}`);

    if (periodSummary.totalDeduct > 0) {
      contentLines.push(`• Điểm trừ nề nếp: -${deduct} điểm (${periodSummary.violationCount} lượt)`);
      contentLines.push('  Các nội dung cần lưu ý:');
      violations.forEach((v) => {
        contentLines.push(`  - ${formatVietnameseDate(v.date)}: ${v.behaviorDescription} (-${formatVietnameseNumber(v.totalScore)}đ)`);
      });
    }

    if (periodSummary.totalBonus > 0) {
      contentLines.push(`• Điểm cộng thi đua: +${bonus} điểm`);
      contentLines.push('  Biểu dương việc tốt / thành tích:');
      bonuses.forEach((b) => {
        contentLines.push(`  + ${formatVietnameseDate(b.date)}: ${b.behaviorDescription} (+${formatVietnameseNumber(b.totalScore)}đ)`);
      });
    }

    contentLines.push('');
    contentLines.push('• Để tra cứu trực tuyến, sử dụng liên kết báo cáo được giáo viên cấp riêng cho email Google của gia đình.');

    // Positive and cooperative closing statement
    contentLines.push('');
    if (periodSummary.totalDeduct === 0 && periodSummary.totalBonus > 0) {
      contentLines.push(
        `Lời nhắn từ GVCN: Trong ${periodText}, em ${currentStudent.firstName} đã có ý thức rèn luyện rất xuất sắc, tích cực tham gia các phong trào và hoàn thành tốt nhiệm vụ. Thầy/Cô biểu dương tinh thần của em và mong gia đình tiếp tục khích lệ em phát huy!`
      );
    } else if (periodSummary.totalDeduct === 0) {
      contentLines.push(
        `Lời nhắn từ GVCN: Trong ${periodText}, em ${currentStudent.firstName} chấp hành nghiêm túc mọi nội quy trường lớp, giữ vững nền nếp học tập tốt. Thầy/Cô rất yên tâm và cảm ơn sự phối hợp từ Quý phụ huynh!`
      );
    } else if (periodSummary.finalScore >= 8) {
      contentLines.push(
        `Lời nhắn từ GVCN: Về cơ bản em ${currentStudent.firstName} có tinh thần tự giác tốt. Nhờ gia đình nhắc nhở thêm em chú ý một vài lỗi nhỏ nêu trên để tuần tới đạt kết quả hoàn hảo hơn.`
      );
    } else {
      contentLines.push(
        `Lời nhắn từ GVCN: Thầy/Cô mong Quý phụ huynh cùng đồng hành, nhắc nhở và động viên em ${currentStudent.firstName} khắc phục kịp thời các vi phạm nề nếp nêu trên để kết quả rèn luyện tiến bộ hơn trong thời gian tới.`
      );
    }

    if (teacherPersonalNote.trim()) {
      contentLines.push('');
      contentLines.push(`Ghi chú thêm: ${teacherPersonalNote.trim()}`);
    } else if (classConfig.defaultTeacherNote?.trim()) {
      contentLines.push('');
      contentLines.push(`Dặn dò từ GV: ${classConfig.defaultTeacherNote.trim()}`);
    }

    contentLines.push('');
    contentLines.push(`Trân trọng cảm ơn sự phối hợp chặt chẽ của Quý gia đình!`);
    contentLines.push(`GVCN: ${teacherName} • Lớp ${classConfig.className}${teacherPhone}`);

    return contentLines.join('\n');
  }, [currentStudent, periodSummary, periodLogs, reportPeriod, selectedWeek, selectedMonth, selectedSemester, classConfig, teacherPersonalNote]);

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    setActionNotice('Đã sao chép nội dung tin nhắn vào bộ nhớ tạm (Clipboard)!');
    setTimeout(() => {
      setCopied(false);
      setActionNotice(null);
    }, 3500);
  };

  // 1-Touch Zalo Direct Open & Auto-copy
  const handleOpenOneTouchZalo = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    const cleanPhone = (currentStudent?.parentPhone || '').replace(/\D/g, '');

    if (cleanPhone) {
      window.open(`https://zalo.me/${cleanPhone}`, '_blank');
      setActionNotice(`Đã sao chép tin nhắn và mở Zalo với PH em ${currentStudent?.fullName} (${currentStudent?.parentPhone})! Thầy/cô chỉ cần dán (Ctrl+V) để gửi.`);
    } else {
      setActionNotice(`Đã sao chép nội dung tin nhắn! Học sinh chưa có SĐT phụ huynh nên thầy/cô vui lòng mở Zalo và dán tin nhắn.`);
    }

    setTimeout(() => {
      setCopied(false);
      setActionNotice(null);
    }, 5000);
  };

  const rankBadge = periodSummary ? getRankBadgeClass(periodSummary.rank) : null;

  return (
    <div className="space-y-5">
      <FamilyManagement />
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageSquareShare className="h-5 w-5 text-blue-600" />
            <span>Tạo Báo Cáo & Tin Nhắn Zalo Phụ Huynh 1 Chạm</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tin nhắn tự động định dạng chuẩn mực, kèm mã tra cứu bí mật • Bấm 1-chạm để mở thẳng Zalo phụ huynh
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Mode */}
          <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => setReportPeriod('week')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                reportPeriod === 'week'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Theo Tuần
            </button>
            <button
              onClick={() => setReportPeriod('month')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                reportPeriod === 'month'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Theo Tháng
            </button>
            <button
              onClick={() => setReportPeriod('semester')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                reportPeriod === 'semester'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Học Kỳ
            </button>
          </div>

          {/* Month selector */}
          {reportPeriod !== 'semester' && (
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

          {/* Week selector */}
          {reportPeriod === 'week' && (
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 font-medium">Tuần:</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {availableWeeks.map((w) => (
                  <option key={w.weekNumber} value={w.weekNumber} className="dark:bg-slate-800">
                    Tuần {w.weekNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Semester selector */}
          {reportPeriod === 'semester' && (
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
        </div>
      </div>

      {/* Action Notice Alert */}
      {actionNotice && (
        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs text-blue-900 dark:text-blue-200 font-medium flex items-center justify-between animate-fadeIn shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-blue-500 hover:text-blue-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Student List & Message Composer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Student Selector & Quick Filters */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Danh Sách Học Sinh ({filteredStudents.length}/{students.length})
            </span>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-0.5 rounded-xl text-[11px]">
              <button
                type="button"
                onClick={() => setStudentSortBy('name')}
                className={`px-2 py-0.5 rounded-lg font-medium transition cursor-pointer ${
                  studentSortBy === 'name'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
                }`}
                title="Xếp theo Tên A-Z"
              >
                Tên A-Z
              </button>
              <button
                type="button"
                onClick={() => setStudentSortBy('code')}
                className={`px-2 py-0.5 rounded-lg font-medium transition cursor-pointer ${
                  studentSortBy === 'code'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
                }`}
                title="Xếp theo Mã HS"
              >
                Mã HS
              </button>
            </div>
          </div>

          {/* Smart Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-750 rounded-2xl text-[11px]">
            <button
              type="button"
              onClick={() => setStudentFilterMode('all')}
              className={`flex-1 py-1 rounded-xl text-center font-bold transition cursor-pointer ${
                studentFilterMode === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setStudentFilterMode('need_attention')}
              className={`flex-1 py-1 rounded-xl text-center font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                studentFilterMode === 'need_attention'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50'
              }`}
              title="Lọc các học sinh có điểm rèn luyện dưới 8.0 hoặc có vi phạm trong kỳ"
            >
              <AlertCircle className="h-3 w-3" />
              <span>Cần nhắc</span>
            </button>
            <button
              type="button"
              onClick={() => setStudentFilterMode('honors')}
              className={`flex-1 py-1 rounded-xl text-center font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                studentFilterMode === 'honors'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50'
              }`}
              title="Lọc các học sinh có điểm >= 9.0 hoặc có điểm cộng việc tốt"
            >
              <Award className="h-3 w-3" />
              <span>Biểu dương</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã HS..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Student list */}
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Không tìm thấy học sinh phù hợp.
              </div>
            ) : (
              filteredStudents.map((s, idx) => {
                const isSelected = s.id === currentStudent?.id;
                const studSummary = studentScoreMap.get(s.id);
                const hasDeduct = studSummary ? studSummary.totalDeduct > 0 : false;
                const hasBonus = studSummary ? studSummary.totalBonus > 0 : false;

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedStudentId(s.id);
                      setCopied(false);
                    }}
                    className={`p-2.5 rounded-2xl cursor-pointer flex items-center justify-between text-xs transition ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] opacity-70 w-5 font-mono">{idx + 1}</span>
                      <div className="truncate max-w-[130px]">
                        <div>{s.fullName}</div>
                        <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {s.studentCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-right font-mono">
                      {studSummary && (
                        <span className={`text-[11px] font-bold ${isSelected ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                          {formatVietnameseNumber(studSummary.finalScore)}đ
                        </span>
                      )}
                      {hasDeduct && (
                        <span className={`text-[10px] font-bold px-1 rounded ${isSelected ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'}`}>
                          -
                        </span>
                      )}
                      {hasBonus && (
                        <span className={`text-[10px] font-bold px-1 rounded ${isSelected ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                          +
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Message Preview & Quick Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick Browse Bar */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevStudent}
                disabled={studentIndex <= 0}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 disabled:opacity-30 rounded-xl transition cursor-pointer"
                title="Học sinh trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">
                  {studentIndex + 1}/{students.length}: {currentStudent?.fullName}
                </span>
                <span className="font-mono text-slate-400 text-[11px] ml-1.5">
                  ({currentStudent?.studentCode})
                </span>
              </div>
              <button
                onClick={handleNextStudent}
                disabled={studentIndex >= students.length - 1}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 disabled:opacity-30 rounded-xl transition cursor-pointer"
                title="Học sinh kế tiếp"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Rank Badge & Phone Info */}
            <div className="flex items-center gap-3">
              {currentStudent?.parentPhone && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <PhoneCall className="h-3 w-3 text-emerald-500" />
                  <span>{currentStudent.parentPhone}</span>
                </span>
              )}
              {periodSummary && rankBadge && (
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {formatVietnameseNumber(periodSummary.finalScore)}đ
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${rankBadge.bg} ${rankBadge.text} ${rankBadge.border}`}>
                    {periodSummary.rank}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Editable Additional Note */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Lời nhắn riêng của GVCN gửi cho phụ huynh học sinh này (Tùy chọn):
            </label>
            <input
              type="text"
              placeholder="vd: Con dạo này có tiến bộ vượt bậc; Nhờ gia đình nhắc nhở con đi ngủ sớm để không đi muộn..."
              value={teacherPersonalNote}
              onChange={(e) => setTeacherPersonalNote(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Message Preview Box */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nội Dung Tin Nhắn Sẵn Sàng Gửi Phụ Huynh
              </span>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1-Touch Zalo Chat Button */}
                <button
                  type="button"
                  onClick={handleOpenOneTouchZalo}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition shadow-md shadow-blue-500/20 bg-[#0068FF] hover:bg-[#0052cc] text-white active:scale-95 cursor-pointer"
                  title="Tự động sao chép tin nhắn và mở thẳng Zalo cá nhân của phụ huynh"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>1-Chạm: Mở Zalo Phụ Huynh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsZaloModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition shadow-xs bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 active:scale-95 cursor-pointer"
                  title="Xuất phiếu kết quả rèn luyện dạng ảnh đẹp để gửi Zalo cho phụ huynh học sinh này"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Thẻ ảnh Zalo</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition shadow-xs cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 active:scale-95'
                  }`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép tin'}</span>
                </button>
              </div>
            </div>

            {/* Formatted Textarea */}
            <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-750 font-sans text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto font-mono">
              {generatedMessage}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="flex items-center gap-1">
                <HeartHandshake className="h-4 w-4 text-emerald-500" />
                <span>Nội dung khuyến khích sự đồng hành tích cực giữa gia đình và nhà trường</span>
              </span>
              <span>
                Tra cứu bằng liên kết riêng và email được cấp quyền
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Student Report Zalo Modal */}
      {currentStudent && periodSummary && (
        <StudentReportZaloModal
          isOpen={isZaloModalOpen}
          onClose={() => setIsZaloModalOpen(false)}
          student={currentStudent}
          periodTitle={
            reportPeriod === 'week'
              ? `Tuần ${selectedWeek} (Tháng ${selectedMonth})`
              : reportPeriod === 'month'
              ? `Tháng ${selectedMonth}`
              : `Học kỳ ${selectedSemester}`
          }
          periodSummary={periodSummary}
          periodLogs={periodLogs}
          className={classConfig.className}
          schoolYear={classConfig.schoolYear}
          homeroomTeacher={classConfig.homeroomTeacher}
          schoolName={classConfig.schoolName}
          teacherPhone={classConfig.teacherPhone}
          teacherPersonalNote={teacherPersonalNote}
          generatedTextMessage={generatedMessage}
        />
      )}
    </div>
  );
};
