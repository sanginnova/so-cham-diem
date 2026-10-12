import type { ReportPeriodSelection } from '../lib/weeklyPeriod';
import { currentSchoolWeek, logsForWeek } from '../lib/weeklyPeriod';
import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Download,
  Printer,
  Filter,
  Users,
  AlertTriangle,
  Award,
  Sparkles,
  TrendingUp,
  MessageSquare,
  Zap,
  CheckCircle2,
  X,
  PlusCircle,
  MinusCircle,
  HelpCircle,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDown01,
  ArrowUp10,
  RotateCcw,
  Edit3,
  Search,
  Share2,
  MessageSquareText,
  ArrowRightLeft,
  FileSpreadsheet,
  TableProperties,
  UserX,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AchievementBonusRule, StudentWeeklySummary, DisciplineLog } from '../types';
import {
  formatVietnameseDate,
  formatVietnameseNumber,
  getRankBadgeClass,
  exportToExcel,
  compareVietnameseNames,
  compareStudentCodes,
} from '../lib/utils';
import { ConductSheetTable, ConductSheetRow } from './ConductSheetTable';
import { getStudentConductDetail } from '../lib/conductReportHelper';
import { exportConductSheetToExcel } from '../lib/conductReportExport';
import { TabType } from './Navbar';
import { SummaryZaloExportModal } from './SummaryZaloExportModal';
import { PeriodLockBannerV2 } from './v2/PeriodLockBannerV2';
import { DailyLogModalV2 } from './v2/DailyLogModalV2';
import { StudentPointEditor } from './StudentPointEditor';
import { ScoreExplanation } from './ScoreExplanation';
import { PeriodReview } from './PeriodReview';
import { currentSchoolYear } from '../lib/classScope';
import { isMonthlyBonus } from '../lib/scoreBreakdown';

interface WeeklySummaryViewProps {
  onNavigateTab: (tab: TabType) => void;
  onSelectStudentForReport?: (studentId: string, period?: ReportPeriodSelection) => void;
  onNavigateToZalo?: (params: {
    studentId?: string | null;
    week?: number;
    month?: number;
    mode?: 'week' | 'month';
    templateId?: string;
  }) => void;
}

export const WeeklySummaryView: React.FC<WeeklySummaryViewProps> = ({
  onNavigateTab,
  onSelectStudentForReport,
  onNavigateToZalo,
}) => {
  const {
    classConfig,
    students,
    disciplineLogs,
    isPeriodLocked,
    getWeeklySummary,
    awardAchievementBonus,
    batchAwardAchievementBonus,
    revokeAchievementBonus,
    updateDisciplineLog,
    deleteDisciplineLog,
    moveDisciplineLogToWeek,
    batchMoveDisciplineLogsToWeek,
    activeAccount,
  } = useApp();

  const [selectedMonth, setSelectedMonth] = useState<number>(() => currentSchoolWeek(classConfig.weeks)?.month ?? 9);
  const [selectedWeek, setSelectedWeek] = useState<number>(() => currentSchoolWeek(classConfig.weeks)?.weekNumber ?? 1);
  const [deductStudentId, setDeductStudentId] = useState<string | null>(null);
  const [editPointsStudentId, setEditPointsStudentId] = useState<string | null>(null);
  const [explainStudentId, setExplainStudentId] = useState<string | null>(null);
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'unexcused' | 'excused' | 'any'>('all');
  const [isZaloModalOpen, setIsZaloModalOpen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'management' | 'conduct-sheet'>('management');

  // Modals for achievement awards
  const [isAutoAwardModalOpen, setIsAutoAwardModalOpen] = useState(false);
  const [isCustomAwardModalOpen, setIsCustomAwardModalOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [tableSelectedStudentIds, setTableSelectedStudentIds] = useState<Set<string>>(new Set());
  const [modalStudentSearch, setModalStudentSearch] = useState<string>('');
  const [selectedRuleId, setSelectedRuleId] = useState<string>('');
  const [customScoreInput, setCustomScoreInput] = useState<number>(1.0);
  const [customNoteInput, setCustomNoteInput] = useState<string>('');
  const [awardingResult, setAwardingResult] = useState<string | null>(null);

  // Management modal for editing, moving and deleting bonus points
  const [isManageBonusesModalOpen, setIsManageBonusesModalOpen] = useState(false);
  const [manageBonusSearch, setManageBonusSearch] = useState('');
  const [manageBonusFilterType, setManageBonusFilterType] = useState<'all' | 'achievement' | 'regular'>('all');
  const [manageStudentFilter, setManageStudentFilter] = useState<string>('all');
  const [selectedBonusLogIds, setSelectedBonusLogIds] = useState<Set<string>>(new Set());
  const [movingBonusLogs, setMovingBonusLogs] = useState<DisciplineLog[] | null>(null);
  const [targetMoveWeek, setTargetMoveWeek] = useState<number>(() => {
    const nextWeek = selectedWeek + 1;
    return classConfig.weeks.some((w) => w.weekNumber === nextWeek) ? nextWeek : 1;
  });
  const [customMoveNote, setCustomMoveNote] = useState<string>('');
  const [isMovingBonus, setIsMovingBonus] = useState<boolean>(false);
  const [editingBonusLog, setEditingBonusLog] = useState<{
    id: string;
    studentName: string;
    studentCode: string;
    score: number;
    title: string;
    note: string;
    isAchievement: boolean;
    targetWeekNumber: number;
  } | null>(null);
  const [deletingBonusLog, setDeletingBonusLog] = useState<{
    id: string;
    studentName: string;
    score: number;
    title: string;
  } | null>(null);

  const availableWeeks = useMemo(() => {
    return classConfig.weeks.filter((w) => w.month === selectedMonth);
  }, [classConfig.weeks, selectedMonth]);

  // Sync selected week when month changes
  React.useEffect(() => {
    if (availableWeeks.length > 0 && !availableWeeks.some((w) => w.weekNumber === selectedWeek)) {
      setSelectedWeek(availableWeeks[0].weekNumber);
    }
  }, [selectedMonth, availableWeeks, selectedWeek]);

  const currentWeekInfo = useMemo(() => {
    return classConfig.weeks.find((w) => w.weekNumber === selectedWeek);
  }, [classConfig.weeks, selectedWeek]);

  // Weekly achievement rules
  const weeklyRules = useMemo(() => {
    return (classConfig.achievementBonusRules || []).filter(
      (r) => r.period === 'weekly' && r.isActive
    );
  }, [classConfig.achievementBonusRules]);

  // Filtered students for batch award modal
  const filteredModalStudents = useMemo(() => {
    if (!modalStudentSearch.trim()) return students;
    const q = modalStudentSearch.toLowerCase().trim();
    return students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q)
    );
  }, [students, modalStudentSearch]);

  // Calculate summaries strictly derived from source logs
  const weeklyData = useMemo(() => {
    return getWeeklySummary(selectedWeek, selectedMonth);
  }, [getWeeklySummary, selectedWeek, selectedMonth, disciplineLogs]);

  // Attendance stats for quick filter buttons
  const attendanceStats = useMemo(() => {
    let unexcusedCount = 0;
    let excusedCount = 0;
    let anyAbsenceCount = 0;
    let truancyCount = 0;

    weeklyData.forEach((s) => {
      const u = s.unexcusedAbsenceCount || 0;
      const e = s.excusedAbsenceCount || 0;
      const t = s.truancyCount || 0;
      if (u > 0) unexcusedCount++;
      if (e > 0) excusedCount++;
      if (u > 0 || e > 0 || t > 0) anyAbsenceCount++;
      if (t > 0) truancyCount++;
    });

    return {
      unexcusedCount,
      excusedCount,
      anyAbsenceCount,
      truancyCount,
    };
  }, [weeklyData]);

  // Sorting state for weekly table
  const [sortField, setSortField] = useState<'score' | 'name' | 'code'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSortChange = (field: 'score' | 'name' | 'code') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'score' ? 'desc' : 'asc');
    }
  };

  // Filtered and sorted by rank, attendance, name, code, or score
  const filteredData = useMemo(() => {
    let list = weeklyData;

    // Filter by rank
    if (rankFilter !== 'all') {
      list = list.filter((d) => {
        if (rankFilter === 'Đạt' || rankFilter === 'Trung bình') return d.rank === 'Đạt' || d.rank === 'Trung bình';
        if (rankFilter === 'Không đạt' || rankFilter === 'Yếu') return d.rank === 'Không đạt' || d.rank === 'Yếu';
        return d.rank === rankFilter;
      });
    }

    // Filter by attendance
    if (attendanceFilter === 'unexcused') {
      list = list.filter((d) => (d.unexcusedAbsenceCount || 0) > 0);
    } else if (attendanceFilter === 'excused') {
      list = list.filter((d) => (d.excusedAbsenceCount || 0) > 0);
    } else if (attendanceFilter === 'any') {
      list = list.filter((d) => (d.unexcusedAbsenceCount || 0) > 0 || (d.excusedAbsenceCount || 0) > 0 || (d.truancyCount || 0) > 0);
    }

    return [...list].sort((a, b) => {
      if (sortField === 'name') {
        return compareVietnameseNames(a, b, sortDirection);
      }
      if (sortField === 'code') {
        return compareStudentCodes(a.studentCode, b.studentCode, sortDirection);
      }
      // sortField === 'score'
      const diff = b.finalScore - a.finalScore;
      if (diff !== 0) return sortDirection === 'desc' ? diff : -diff;
      return compareVietnameseNames(a, b, 'asc');
    });
  }, [weeklyData, rankFilter, attendanceFilter, sortField, sortDirection]);

  // Logs for current week to extract violations and bonuses
  const weekLogs = useMemo(() => {
    return logsForWeek(disciplineLogs, selectedWeek).filter((l) => !isMonthlyBonus(l));
  }, [disciplineLogs, selectedWeek]);

  // Conduct sheet rows matching the traditional 5-column template
  const conductRows: ConductSheetRow[] = useMemo(() => {
    return filteredData.map((s, idx) => {
      const detail = getStudentConductDetail(s.studentId, weekLogs);
      return {
        stt: idx + 1,
        studentId: s.studentId,
        studentCode: s.studentCode,
        fullName: s.fullName,
        finalScore: s.finalScore,
        violationsLines: detail.violationsLines,
        bonusesList: detail.bonusesList,
      };
    });
  }, [filteredData, weekLogs]);

  // Export Excel in traditional conduct sheet format with full 2-tier header and signatures
  const handleExportConductSheetExcel = () => {
    exportConductSheetToExcel({
      className: classConfig.className,
      schoolYear: classConfig.schoolYear,
      periodLabel: `Tuần ${selectedWeek}`,
      homeroomTeacher: classConfig.homeroomTeacher || 'Nguyễn Văn Sang',
      rows: conductRows,
      stats: {
        totalStudents: weeklyData.length,
        avgScore: stats.avgScore,
        excellentCount: stats.ranks['Xuất sắc'],
        goodCount: stats.ranks['Tốt'],
        fairCount: stats.ranks['Khá'],
        mediumCount: stats.ranks['Đạt'],
        weakCount: stats.ranks['Không đạt'],
        totalViolations: stats.totalViolations,
        totalBonuses: stats.totalBonuses,
      },
    });
  };

  // Eligible students for Zero-violation Clean Week (Rule TT_W01 or first auto weekly rule)
  const zeroViolationRule = useMemo(() => {
    return weeklyRules.find((r) => r.isAutoEligible) || weeklyRules[0];
  }, [weeklyRules]);

  // Students eligible for zero-violation award who haven't received it yet
  const eligibleZeroViolationStudents = useMemo(() => {
    if (!zeroViolationRule) return [];
    return weeklyData.filter((s) => {
      if (s.violationCount > 0) return false;
      // Check if student already received this achievement bonus in this week
      const hasReceived = disciplineLogs.some(
        (l) =>
          l.studentId === s.studentId &&
          l.weekNumber === selectedWeek &&
          l.behaviorCode === zeroViolationRule.code
      );
      return !hasReceived;
    });
  }, [weeklyData, zeroViolationRule, disciplineLogs, selectedWeek]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalDeduct = weeklyData.reduce((acc, curr) => acc + curr.totalDeduct, 0);
    const totalBonus = weeklyData.reduce((acc, curr) => acc + curr.totalBonus, 0);
    const totalAchievementBonus = weeklyData.reduce(
      (acc, curr) => acc + (curr.achievementBonus || 0),
      0
    );
    const totalViolations = weeklyData.reduce((acc, curr) => acc + curr.violationCount, 0);
    const totalBonuses = weeklyData.reduce((acc, curr) => acc + curr.bonusCount, 0);
    const totalAwardedStudents = weeklyData.filter((s) => (s.achievementCount || 0) > 0).length;

    const scores = weeklyData.map((d) => d.finalScore);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 10;
    const above8Count = weeklyData.filter((d) => d.finalScore >= 8).length;
    const above8Rate = weeklyData.length > 0 ? (above8Count / weeklyData.length) * 100 : 0;

    const ranks = {
      'Xuất sắc': weeklyData.filter((d) => d.rank === 'Xuất sắc').length,
      'Tốt': weeklyData.filter((d) => d.rank === 'Tốt').length,
      'Khá': weeklyData.filter((d) => d.rank === 'Khá').length,
      'Đạt': weeklyData.filter((d) => d.rank === 'Đạt' || d.rank === 'Trung bình').length,
      'Không đạt': weeklyData.filter((d) => d.rank === 'Không đạt' || d.rank === 'Yếu').length,
      'Trung bình': weeklyData.filter((d) => d.rank === 'Đạt' || d.rank === 'Trung bình').length,
      'Yếu': weeklyData.filter((d) => d.rank === 'Không đạt' || d.rank === 'Yếu').length,
    };

    return {
      totalDeduct: Math.round(totalDeduct * 100) / 100,
      totalBonus: Math.round(totalBonus * 100) / 100,
      totalAchievementBonus: Math.round(totalAchievementBonus * 100) / 100,
      totalViolations,
      totalBonuses,
      totalAwardedStudents,
      avgScore: Math.round(avgScore * 100) / 100,
      above8Rate: Math.round(above8Rate),
      ranks,
    };
  }, [weeklyData]);

  // Execute Auto Award
  const handleConfirmAutoAward = async () => {
    if (!zeroViolationRule || eligibleZeroViolationStudents.length === 0) return;
    const ids = eligibleZeroViolationStudents.map((s) => s.studentId);
    const res = await batchAwardAchievementBonus({
      studentIds: ids,
      rule: zeroViolationRule,
      weekNumber: selectedWeek,
      month: selectedMonth,
      customNote: `Tuần ${selectedWeek} nề nếp gương mẫu (0 lỗi vi phạm)`,
    });

    setIsAutoAwardModalOpen(false);
    setAwardingResult(`Đã trao thưởng thành tích cho ${res.awardedCount} học sinh gương mẫu (+${zeroViolationRule.bonusScore}đ)!`);
    setTimeout(() => setAwardingResult(null), 4000);
  };

  // Execute Custom / Batch Award
  const handleConfirmCustomAward = async () => {
    if (selectedStudentIds.length === 0) {
      alert('Vui lòng chọn ít nhất một học sinh để cộng điểm tuần');
      return;
    }
    const rule = weeklyRules.find((r) => r.id === selectedRuleId);
    const score = Number(customScoreInput) || 1.0;
    const note = customNoteInput.trim() || undefined;

    const res = await batchAwardAchievementBonus({
      studentIds: selectedStudentIds,
      rule,
      weekNumber: selectedWeek,
      month: selectedMonth,
      customScore: score,
      customNote: note,
    });

    setIsCustomAwardModalOpen(false);
    setSelectedStudentIds([]);
    setTableSelectedStudentIds(new Set());
    setSelectedRuleId('');
    setCustomNoteInput('');

    const awardedTitle = rule ? rule.title : (note || `Khen thưởng tuần ${selectedWeek}`);
    if (res.skippedCount > 0) {
      setAwardingResult(
        `Đã cộng +${score}đ ("${awardedTitle}") cho ${res.awardedCount} học sinh (${res.skippedCount} em đã được trao quy chế này trước đó)!`
      );
    } else {
      setAwardingResult(
        `Đã cộng điểm tuần +${score}đ ("${awardedTitle}") thành công cho ${res.awardedCount} học sinh!`
      );
    }
    setTimeout(() => setAwardingResult(null), 5000);
  };

  // All bonus logs for the selected week
  const weeklyBonusLogs = useMemo(() => {
    return disciplineLogs.filter(
      (l) => l.weekNumber === selectedWeek && l.type === 'bonus' && !isMonthlyBonus(l)
    );
  }, [disciplineLogs, selectedWeek]);

  // Students with bonus in this week for filtering
  const studentsWithWeeklyBonus = useMemo(() => {
    const studentIds = new Set(weeklyBonusLogs.map((l) => l.studentId));
    return students.filter((s) => studentIds.has(s.id));
  }, [weeklyBonusLogs, students]);

  // Filtered bonus logs for the management modal
  const filteredBonusLogs = useMemo(() => {
    return weeklyBonusLogs.filter((log) => {
      // Filter by student
      if (manageStudentFilter !== 'all' && log.studentId !== manageStudentFilter) {
        return false;
      }
      // Filter by type
      const isAch =
        log.behaviorCode.startsWith('TT_') ||
        log.behaviorDescription.includes('[Thành tích');
      if (manageBonusFilterType === 'achievement' && !isAch) return false;
      if (manageBonusFilterType === 'regular' && isAch) return false;

      // Filter by search keyword
      if (manageBonusSearch.trim()) {
        const query = manageBonusSearch.toLowerCase().trim();
        const matchesName = log.studentName.toLowerCase().includes(query);
        const matchesCode = log.studentCode.toLowerCase().includes(query);
        const matchesDesc = log.behaviorDescription.toLowerCase().includes(query);
        const matchesNote = (log.note || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesDesc && !matchesNote) {
          return false;
        }
      }
      return true;
    });
  }, [weeklyBonusLogs, manageStudentFilter, manageBonusFilterType, manageBonusSearch]);

  // Open modal and pre-filter for a specific student if provided
  const handleOpenManageBonuses = (studentId?: string) => {
    setManageStudentFilter(studentId || 'all');
    setManageBonusFilterType('all');
    setManageBonusSearch('');
    setSelectedBonusLogIds(new Set());
    setMovingBonusLogs(null);
    setEditingBonusLog(null);
    setDeletingBonusLog(null);
    setIsManageBonusesModalOpen(true);
  };

  // Start editing a bonus log
  const handleStartEditBonus = (log: DisciplineLog) => {
    const isAch =
      log.behaviorCode.startsWith('TT_') ||
      log.behaviorDescription.includes('[Thành tích');
    const cleanTitle = log.behaviorDescription
      .replace(/\[Thành tích (tuần|tháng)\]\s*/g, '')
      .trim();

    setEditingBonusLog({
      id: log.id,
      studentName: log.studentName,
      studentCode: log.studentCode,
      score: log.scorePerUnit ?? log.totalScore,
      title: cleanTitle,
      note: log.note || '',
      isAchievement: isAch,
      targetWeekNumber: log.weekNumber,
    });
  };

  // Save edited bonus log
  const handleSaveEditBonus = async () => {
    if (!editingBonusLog) return;
    const originalLog = disciplineLogs.find((l) => l.id === editingBonusLog.id);
    if (!originalLog) return;

    const newScore = Number(editingBonusLog.score) || 1.0;
    const rawTitle = editingBonusLog.title.trim() || 'Khen thưởng thành tích tuần';
    const finalDescription = editingBonusLog.isAchievement
      ? (rawTitle.startsWith('[Thành tích tuần]') ? rawTitle : `[Thành tích tuần] ${rawTitle}`)
      : rawTitle;

    const weekChanged = editingBonusLog.targetWeekNumber !== originalLog.weekNumber;

    if (weekChanged) {
      await updateDisciplineLog(
        editingBonusLog.id,
        {
          scorePerUnit: newScore,
          totalScore: newScore,
          behaviorDescription: finalDescription,
          note: editingBonusLog.note.trim() || undefined,
          weekNumber: editingBonusLog.targetWeekNumber,
        },
        classConfig.homeroomTeacher || 'GVCN'
      );
      setAwardingResult(
        `Đã lưu và chuyển điểm thưởng (+${newScore}đ) của học sinh ${editingBonusLog.studentName} sang Tuần ${editingBonusLog.targetWeekNumber}!`
      );
    } else {
      await updateDisciplineLog(
        editingBonusLog.id,
        {
          scorePerUnit: newScore,
          totalScore: newScore,
          behaviorDescription: finalDescription,
          note: editingBonusLog.note.trim() || undefined,
        },
        classConfig.homeroomTeacher || 'GVCN'
      );
      setAwardingResult(`Đã cập nhật điểm thưởng của học sinh ${editingBonusLog.studentName} (+${newScore}đ)!`);
    }

    setEditingBonusLog(null);
    setTimeout(() => setAwardingResult(null), 4000);
  };

  // Start moving bonus log(s) to another week
  const handleStartMoveBonus = (logs: DisciplineLog[]) => {
    if (!logs || logs.length === 0) return;
    const nextW = selectedWeek + 1;
    const defaultTarget = classConfig.weeks.some((w) => w.weekNumber === nextW && !isPeriodLocked('week', w.weekNumber))
      ? nextW
      : classConfig.weeks.find((w) => w.weekNumber !== selectedWeek && !isPeriodLocked('week', w.weekNumber))?.weekNumber || selectedWeek;

    setTargetMoveWeek(defaultTarget);
    setCustomMoveNote('');
    setMovingBonusLogs(logs);
  };

  // Confirm moving bonus log(s)
  const handleConfirmMoveBonus = async () => {
    if (!movingBonusLogs || movingBonusLogs.length === 0) return;
    if (targetMoveWeek === selectedWeek) {
      alert('Vui lòng chọn tuần khác với tuần hiện tại!');
      return;
    }
    if (isPeriodLocked('week', targetMoveWeek)) {
      alert(`Tuần ${targetMoveWeek} đã khóa thi đua. Không thể chuyển vào tuần này.`);
      return;
    }

    setIsMovingBonus(true);
    try {
      const ids = movingBonusLogs.map((l) => l.id);
      const res = await batchMoveDisciplineLogsToWeek(
        ids,
        targetMoveWeek,
        activeAccount?.displayName || classConfig.homeroomTeacher || 'GVCN',
        customMoveNote.trim() || undefined
      );

      const totalScore = movingBonusLogs.reduce((sum, l) => sum + l.totalScore, 0);
      setMovingBonusLogs(null);
      setSelectedBonusLogIds(new Set());

      if (res.errors.length > 0) {
        setAwardingResult(
          `Đã chuyển ${res.movedCount}/${ids.length} điểm thưởng sang Tuần ${targetMoveWeek}. Lỗi: ${res.errors[0]}`
        );
      } else {
        setAwardingResult(
          `Đã di chuyển thành công ${res.movedCount} điểm thưởng (+${formatVietnameseNumber(totalScore)}đ) từ Tuần ${selectedWeek} sang Tuần ${targetMoveWeek}!`
        );
      }
      setTimeout(() => setAwardingResult(null), 5000);
    } catch (err: any) {
      alert('Lỗi di chuyển điểm thưởng: ' + (err.message || String(err)));
    } finally {
      setIsMovingBonus(false);
    }
  };

  // Confirm delete bonus log
  const handleConfirmDeleteBonus = async () => {
    if (!deletingBonusLog) return;
    await deleteDisciplineLog(deletingBonusLog.id, classConfig.homeroomTeacher || 'GVCN');
    const msg = `Đã xóa điểm thưởng (+${deletingBonusLog.score}đ) của học sinh ${deletingBonusLog.studentName}!`;
    setDeletingBonusLog(null);
    setAwardingResult(msg);
    setTimeout(() => setAwardingResult(null), 4000);
  };

  // Export Excel
  const handleExportExcel = () => {
    const exportRows = weeklyData.map((s, idx) => ({
      STT: idx + 1,
      'Mã học sinh': s.studentCode,
      'Họ và tên': s.fullName,
      'Ngày sinh': formatVietnameseDate(s.dateOfBirth),
      'Số lượt vi phạm': s.violationCount,
      'Tổng điểm trừ': formatVietnameseNumber(s.totalDeduct),
      'Thưởng thông thường': formatVietnameseNumber(s.totalBonus - (s.achievementBonus || 0)),
      'Thưởng thành tích tuần 🏆': formatVietnameseNumber(s.achievementBonus || 0),
      'Danh hiệu thành tích': (s.achievements || []).join('; '),
      'Điểm tuần': formatVietnameseNumber(s.finalScore),
      'Xếp loại': s.rank,
      'Ghi chú sư phạm': s.notes,
    }));
    exportToExcel(
      exportRows,
      `Tong_ket_tuan_${selectedWeek}_Lop_${classConfig.className}_${classConfig.schoolYear}`,
      `Tuan_${selectedWeek}`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      <PeriodReview weekNumber={selectedWeek} />
      {explainStudentId && <ScoreExplanation studentId={explainStudentId} weekNumber={selectedWeek} onClose={() => setExplainStudentId(null)} />}
      {/* Header and Filter Row */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-xl">
              <CalendarCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Bảng Tổng Kết Điểm Rèn Luyện Tuần {selectedWeek}
              </h2>
              <p className="text-xs text-slate-500">
                Tháng {selectedMonth} •{' '}
                {currentWeekInfo
                  ? `Từ ${formatVietnameseDate(currentWeekInfo.startDate)} đến ${formatVietnameseDate(currentWeekInfo.endDate)}`
                  : ''}{' '}
                • Lớp {classConfig.className}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Month, Week & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
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

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
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

          <button
            onClick={() => onNavigateTab('zalo-composer')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 transition active:scale-95 shadow-xs"
            title="Soạn thảo tin nhắn Zalo tuần kèm số liệu điểm số và danh sách khen thưởng/nhắc nhở"
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            <span>Soạn tin Zalo</span>
          </button>

          <button
            onClick={() => handleOpenManageBonuses('all')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            title="Quản lý và chuyển điểm thưởng tuần này sang tuần khác"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span>Chuyển điểm thưởng ({weeklyBonusLogs.length})</span>
          </button>

          <button
            onClick={() => {
              if (onNavigateToZalo) {
                onNavigateToZalo({
                  week: selectedWeek,
                  month: selectedMonth,
                  mode: 'week',
                  templateId: 'weekly_class_group',
                });
              } else {
                onNavigateTab('zalo-composer');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            title="Soạn thảo tin nhắn Zalo kèm số liệu điểm nề nếp tuần này"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Soạn tin Zalo</span>
          </button>

          <button
            onClick={() => onNavigateTab('attendance-report')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-850 shadow-xs transition active:scale-95 cursor-pointer"
            title="Mở Báo cáo danh sách học sinh nghỉ học chi tiết số buổi và lý do"
          >
            <UserX className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            <span>Báo cáo nghỉ học</span>
          </button>

          <button
            onClick={() => setIsZaloModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
            title="Sao chép hình ảnh Tổng kết Tuần để dán gửi nhóm Zalo phụ huynh"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Gửi ảnh Zalo</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
            title="Xuất bảng tổng kết ra Excel"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition"
            title="In bảng tổng kết tuần"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>In</span>
          </button>
        </div>
      </div>

      {/* Period Lock Banner V2 */}
      <PeriodLockBannerV2
        periodType="week"
        periodValue={selectedWeek}
        periodTitle={currentWeekInfo ? `${currentWeekInfo.title} (${currentWeekInfo.startDate} đến ${currentWeekInfo.endDate})` : undefined}
      />

      {/* Success notification banner */}
      {awardingResult && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{awardingResult}</span>
          </div>
          <button onClick={() => setAwardingResult(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* FEATURE CARD: KHEN THƯỞNG THÀNH TÍCH TUẦN */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-950/30 dark:via-amber-950/10 border border-amber-300/60 dark:border-amber-700/60 rounded-2xl p-4 sm:p-5 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500 text-white rounded-lg shadow-xs shadow-amber-500/30">
                <Award className="h-4 w-4" />
              </span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Khen Thưởng Thành Tích Tuần {selectedWeek}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                {stats.totalAwardedStudents} HS đã nhận thưởng (+{formatVietnameseNumber(stats.totalAchievementBonus)}đ)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {eligibleZeroViolationStudents.length > 0 ? (
                <span>
                  🌟 Phát hiện <strong>{eligibleZeroViolationStudents.length} học sinh</strong> không mắc lỗi nào trong tuần này (đủ điều kiện cộng thưởng +{zeroViolationRule?.bonusScore || 1}đ theo quy chế).
                </span>
              ) : (
                <span>
                  Toàn bộ học sinh gương mẫu tuần {selectedWeek} đã được ghi nhận điểm thưởng thành tích, hoặc bạn có thể trao thêm điểm thưởng tiêu biểu bên dưới.
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isPeriodLocked('week', selectedWeek) && (
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                <span>Tuần {selectedWeek} đã khóa thi đua.</span>
              </span>
            )}

            {!isPeriodLocked('week', selectedWeek) && (
              <>
                {eligibleZeroViolationStudents.length > 0 && zeroViolationRule && (
                  <button
                    onClick={() => setIsAutoAwardModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Xét thưởng 0 vi phạm ({eligibleZeroViolationStudents.length} HS)</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (tableSelectedStudentIds.size > 0) {
                      setSelectedStudentIds(Array.from(tableSelectedStudentIds));
                    } else {
                      setSelectedStudentIds([]);
                    }
                    setModalStudentSearch('');
                    setSelectedRuleId('');
                    setCustomScoreInput(1.0);
                    setCustomNoteInput('');
                    setIsCustomAwardModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                  title="Cộng điểm thưởng tuần cho một hoặc nhiều học sinh cùng lúc"
                >
                  <Award className="h-4 w-4" />
                  <span>
                    + Cộng điểm tuần {tableSelectedStudentIds.size > 0 ? `(${tableSelectedStudentIds.size} HS đã chọn)` : '(Nhiều HS)'}
                  </span>
                </button>
              </>
            )}

            <button
              onClick={() => handleOpenManageBonuses('all')}
              className={`flex items-center gap-1.5 px-3.5 py-2 border text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer ${
                weeklyBonusLogs.length > 0
                  ? 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/70 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                  : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
              title="Xem danh sách, sửa mức điểm, di chuyển sang tuần khác hoặc xóa điểm thưởng đã trao"
            >
              <ArrowRightLeft className="h-4 w-4 text-amber-600" />
              <span>Quản lý & Chuyển điểm thưởng ({weeklyBonusLogs.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] text-slate-500 font-medium block">Sĩ số theo dõi</span>
          <span className="text-xl font-bold text-slate-900 dark:text-white">{weeklyData.length} HS</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40">
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium block">Tổng điểm trừ</span>
          <span className="text-xl font-bold text-rose-600 dark:text-rose-400">
            -{formatVietnameseNumber(stats.totalDeduct)}đ
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{stats.totalViolations} lượt vi phạm</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium block">Thưởng thành tích 🏆</span>
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
            +{formatVietnameseNumber(stats.totalAchievementBonus)}đ
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{stats.totalAwardedStudents} HS có thành tích</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium block">Tổng điểm cộng</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            +{formatVietnameseNumber(stats.totalBonus)}đ
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">{stats.totalBonuses} lượt khen thưởng</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40">
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium block">Điểm trung bình</span>
          <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
            {formatVietnameseNumber(stats.avgScore)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Thang 10,0 điểm</span>
        </div>

        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] text-slate-500 font-medium block">Đạt loại Tốt/XS</span>
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{stats.above8Rate}%</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {stats.ranks['Xuất sắc'] + stats.ranks['Tốt']} học sinh
          </span>
        </div>
      </div>

      {/* KHỐI BỘ LỌC CHUYÊN CẦN & XẾP LOẠI THI ĐUA */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2.5 print:hidden">
        {/* Dòng 1: Bộ lọc Chuyên Cần & Vắng Nghỉ */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold text-xs shrink-0">
              <Users className="h-3.5 w-3.5 text-blue-600" />
              <span>Chuyên cần & Nghỉ học:</span>
            </span>

            <button
              onClick={() => {
                setAttendanceFilter('all');
              }}
              className={`px-3 py-1 rounded-lg transition font-semibold cursor-pointer text-xs ${
                attendanceFilter === 'all'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Tất cả chuyên cần
            </button>

            {/* Lọc: Nghỉ có phép */}
            <button
              onClick={() => {
                setRankFilter('all');
                setAttendanceFilter((prev) => (prev === 'excused' ? 'all' : 'excused'));
              }}
              className={`px-3 py-1 rounded-lg transition font-semibold flex items-center gap-1.5 border cursor-pointer text-xs ${
                attendanceFilter === 'excused'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-400'
                  : attendanceStats.excusedCount > 0
                  ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800 font-bold'
                  : 'bg-slate-50 dark:bg-slate-750 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title="Lọc danh sách học sinh có nghỉ học có phép trong tuần"
            >
              <span>📋 Nghỉ có phép</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                attendanceFilter === 'excused' ? 'bg-white/20 text-white' : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100'
              }`}>
                {attendanceStats.excusedCount}
              </span>
            </button>

            {/* Lọc: Nghỉ không phép */}
            <button
              onClick={() => {
                setRankFilter('all');
                setAttendanceFilter((prev) => (prev === 'unexcused' ? 'all' : 'unexcused'));
              }}
              className={`px-3 py-1 rounded-lg transition font-semibold flex items-center gap-1.5 border cursor-pointer text-xs ${
                attendanceFilter === 'unexcused'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-400'
                  : attendanceStats.unexcusedCount > 0
                  ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800 font-bold'
                  : 'bg-slate-50 dark:bg-slate-750 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title="Lọc danh sách học sinh nghỉ học không phép trong tuần"
            >
              <span>⚠️ Nghỉ không phép</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                attendanceFilter === 'unexcused' ? 'bg-white/20 text-white' : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100'
              }`}>
                {attendanceStats.unexcusedCount}
              </span>
            </button>

            {/* Tất cả học sinh có vắng nghỉ (dù có phép hay không phép) */}
            <button
              onClick={() => {
                setRankFilter('all');
                setAttendanceFilter((prev) => (prev === 'any' ? 'all' : 'any'));
              }}
              className={`px-3.5 py-1 rounded-lg transition font-medium flex items-center gap-1.5 border cursor-pointer text-xs ${
                attendanceFilter === 'any'
                  ? 'bg-rose-700 text-white border-rose-700 shadow-sm ring-2 ring-rose-400'
                  : attendanceStats.anyAbsenceCount > 0
                  ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-100 dark:border-rose-700'
                  : 'bg-slate-50 dark:bg-slate-750 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
              title="Danh sách tất cả học sinh có vắng nghỉ (có phép hoặc không phép)"
            >
              <span>👥 Tất cả HS nghỉ</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-extrabold ${
                attendanceFilter === 'any' ? 'bg-white/20 text-white' : 'bg-rose-600 text-white'
              }`}>
                {attendanceStats.anyAbsenceCount}
              </span>
            </button>
          </div>

          {(rankFilter !== 'all' || attendanceFilter !== 'all') && (
            <button
              onClick={() => {
                setRankFilter('all');
                setAttendanceFilter('all');
              }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg"
              title="Xóa toàn bộ bộ lọc và hiển thị tất cả học sinh"
            >
              <span>✕ Xóa tất cả bộ lọc</span>
            </button>
          )}
        </div>

        {/* Dòng 2: Bộ lọc Xếp loại thi đua & Sắp xếp danh sách */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-medium shrink-0">Xếp loại thi đua:</span>
            <button
              onClick={() => {
                setRankFilter('all');
              }}
              className={`px-3 py-1 rounded-lg transition font-semibold cursor-pointer ${
                rankFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-650'
              }`}
            >
              Tất cả ({weeklyData.length})
            </button>
            {(['Xuất sắc', 'Tốt', 'Khá', 'Đạt', 'Không đạt'] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setAttendanceFilter('all');
                  setRankFilter((prev) => (prev === r ? 'all' : r));
                }}
                className={`px-2.5 py-1 rounded-lg transition font-semibold cursor-pointer ${
                  rankFilter === r
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-650'
                }`}
              >
                {r} ({stats.ranks[r]})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0">Xếp theo:</span>
          
          <button
            onClick={() => handleSortChange('score')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition ${
              sortField === 'score'
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Xếp theo Điểm tuần thi đua (Cao xuống thấp / Thấp lên cao)"
          >
            {sortField === 'score' && (sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-blue-600" /> : <ArrowUp className="h-3 w-3 text-blue-600" />)}
            <span>Điểm tuần</span>
          </button>

          <button
            onClick={() => handleSortChange('name')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition ${
              sortField === 'name'
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Xếp theo Họ và Tên (chuẩn danh sách Việt Nam A-Z)"
          >
            {sortField === 'name' ? (
              sortDirection === 'asc' ? <ArrowDownAZ className="h-3 w-3 text-blue-600" /> : <ArrowUpAZ className="h-3 w-3 text-blue-600" />
            ) : (
              <ArrowDownAZ className="h-3 w-3 text-slate-400" />
            )}
            <span>Họ và Tên</span>
          </button>

          <button
            onClick={() => handleSortChange('code')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold transition ${
              sortField === 'code'
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Xếp theo Mã học sinh"
          >
            {sortField === 'code' ? (
              sortDirection === 'asc' ? <ArrowDown01 className="h-3 w-3 text-blue-600" /> : <ArrowUp10 className="h-3 w-3 text-blue-600" />
            ) : (
              <ArrowDown01 className="h-3 w-3 text-slate-400" />
            )}
            <span>Mã HS</span>
          </button>
        </div>
      </div>
    </div>

      {/* CHUYỂN ĐỔI CHẾ ĐỘ XEM: BẢNG QUẢN TRỊ ĐẦY ĐỦ / MẪU SỔ RÈN LUYỆN TRUYỀN THỐNG */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 print:hidden">
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('management')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'management'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TableProperties className="h-3.5 w-3.5" />
            <span>Bảng quản trị đầy đủ</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('conduct-sheet')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'conduct-sheet'
                ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 font-bold shadow-xs ring-1 ring-red-200 dark:ring-red-900'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-red-500" />
            <span>Mẫu Sổ Rèn Luyện (A4)</span>
          </button>
        </div>

        {viewMode === 'conduct-sheet' && (
          <span className="text-xs text-slate-500 font-medium italic">
            Mẫu 5 cột chuẩn theo sổ theo dõi rèn luyện: Điểm rèn luyện đỏ, Lỗi vi phạm và Cộng điểm chi tiết.
          </span>
        )}
      </div>

      {viewMode === 'conduct-sheet' ? (
        <ConductSheetTable
          className={classConfig.className}
          schoolYear={classConfig.schoolYear}
          homeroomTeacher={classConfig.homeroomTeacher || 'Nguyễn Văn Sang'}
          periodLabel={`Tuần ${selectedWeek}`}
          rows={conductRows}
          stats={{
            totalStudents: weeklyData.length,
            avgScore: stats.avgScore,
            excellentCount: stats.ranks['Xuất sắc'],
            goodCount: stats.ranks['Tốt'],
            fairCount: stats.ranks['Khá'],
            mediumCount: stats.ranks['Đạt'],
            weakCount: stats.ranks['Không đạt'],
            totalViolations: stats.totalViolations,
            totalBonuses: stats.totalBonuses,
          }}
          sortField={sortField === 'name' ? 'name' : sortField === 'score' ? 'score' : 'stt'}
          sortDirection={sortDirection}
          onSortChange={(field) => {
            if (field === 'name') handleSortChange('name');
            else if (field === 'score') handleSortChange('score');
            else handleSortChange('code');
          }}
          onPrint={handlePrint}
          onExportExcel={handleExportConductSheetExcel}
        />
      ) : (
        /* Main Weekly Table */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden relative">
        <div className="overflow-x-auto max-h-[650px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-10 text-center print:hidden">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả học sinh"
                    checked={filteredData.length > 0 && filteredData.every((s) => tableSelectedStudentIds.has(s.studentId))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTableSelectedStudentIds(new Set(filteredData.map((s) => s.studentId)));
                      } else {
                        setTableSelectedStudentIds(new Set());
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Chọn tất cả học sinh để cộng điểm tuần hàng loạt"
                  />
                </th>
                <th className="py-3 px-3 w-10 text-center">STT</th>
                <th
                  onClick={() => handleSortChange('code')}
                  className="py-3 px-3 w-28 cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                  title="Nhấn để sắp xếp theo Mã học sinh"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={sortField === 'code' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>Mã HS</span>
                    {sortField === 'code' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSortChange('name')}
                  className="py-3 px-3 min-w-[160px] cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                  title="Nhấn để sắp xếp theo Họ và Tên (chuẩn danh sách Việt Nam A-Z)"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={sortField === 'name' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>Họ và tên</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 w-24">Ngày sinh</th>
                <th className="py-3 px-3 text-center w-20">Lỗi VP</th>
                <th className="py-3 px-3 text-right w-24">Điểm trừ</th>
                <th className="py-3 px-3 text-right w-24">Thưởng tuần 🏆</th>
                <th
                  onClick={() => handleSortChange('score')}
                  className="py-3 px-3 text-right w-24 font-bold cursor-pointer select-none hover:bg-slate-200/80 dark:hover:bg-slate-700 transition"
                  title="Nhấn để sắp xếp theo Điểm tuần"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span className={sortField === 'score' ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}>Điểm tuần</span>
                    {sortField === 'score' ? (
                      sortDirection === 'desc' ? <ArrowDown className="h-3 w-3 text-blue-600" /> : <ArrowUp className="h-3 w-3 text-blue-600" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-40" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-3 text-center w-28">Xếp loại</th>
                <th className="py-3 px-3 min-w-[200px]">Ghi chú & Thành tích</th>
                <th className="py-3 px-3 text-center w-28 print:hidden">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Không có học sinh nào phù hợp với bộ lọc hiện tại.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {attendanceFilter === 'unexcused'
                        ? 'Tuần này không có học sinh nào nghỉ học không phép.'
                        : attendanceFilter === 'excused'
                        ? 'Tuần này không có học sinh nào nghỉ học có phép.'
                        : attendanceFilter === 'any'
                        ? 'Tuần này không có học sinh nào nghỉ học (100% học sinh đi học đầy đủ).'
                        : 'Không tìm thấy kết quả phù hợp.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setRankFilter('all');
                        setAttendanceFilter('all');
                      }}
                      className="mt-3 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 rounded-lg transition cursor-pointer"
                    >
                      Xem toàn bộ {weeklyData.length} học sinh
                    </button>
                  </td>
                </tr>
              ) : (
                filteredData.map((s, idx) => {
                const rankBadge = getRankBadgeClass(s.rank);
                const hasAchievement = (s.achievementCount || 0) > 0;
                const isSelected = tableSelectedStudentIds.has(s.studentId);

                return (
                  <tr
                    key={s.studentId}
                    className={`hover:bg-blue-50/40 dark:hover:bg-slate-750/50 transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40'
                        : hasAchievement
                        ? 'bg-amber-50/20 dark:bg-amber-950/10'
                        : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center print:hidden">
                      <input
                        type="checkbox"
                        aria-label={`Chọn học sinh ${s.fullName}`}
                        checked={isSelected}
                        onChange={(e) => {
                          const next = new Set(tableSelectedStudentIds);
                          if (e.target.checked) {
                            next.add(s.studentId);
                          } else {
                            next.delete(s.studentId);
                          }
                          setTableSelectedStudentIds(next);
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {s.studentCode}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {s.fullName}
                        </span>
                        {hasAchievement && (
                          <span
                            className="inline-flex items-center text-amber-500"
                            title={`Đạt ${s.achievementCount} thành tích tuần: ${(s.achievements || []).join(', ')}`}
                          >
                            <Award className="h-3.5 w-3.5" />
                          </span>
                        )}
                        {/* Huy hiệu Chuyên cần / Nghỉ học */}
                        {s.unexcusedAbsenceCount > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                            title={`Nghỉ học không phép: ${s.unexcusedAbsenceCount} buổi`}
                          >
                            KP: {s.unexcusedAbsenceCount}
                          </span>
                        )}
                        {s.excusedAbsenceCount > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                            title={`Nghỉ học có phép: ${s.excusedAbsenceCount} buổi`}
                          >
                            P: {s.excusedAbsenceCount}
                          </span>
                        )}
                        {s.truancyCount > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                            title={`Bỏ / trốn tiết: ${s.truancyCount} lần`}
                          >
                            BT: {s.truancyCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      {formatVietnameseDate(s.dateOfBirth)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      {s.violationCount > 0 ? (
                        <button type="button" onClick={() => setEditPointsStudentId(s.studentId)} title="Xem, sửa hoặc xóa lỗi" className="px-2 py-0.5 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 rounded-full font-bold">
                          {s.violationCount}
                        </button>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-rose-600 dark:text-rose-400">
                      {s.totalDeduct > 0 ? `-${formatVietnameseNumber(s.totalDeduct)}đ` : '0'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {hasAchievement ? (
                        <button
                          type="button"
                          onClick={() => handleOpenManageBonuses(s.studentId)}
                          className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:underline group cursor-pointer"
                          title="Bấm để chuyển tuần, sửa hoặc xóa điểm thưởng tuần của học sinh này"
                        >
                          <span>+{formatVietnameseNumber(s.achievementBonus || 0)}đ</span>
                          <ArrowRightLeft className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity print:hidden" />
                        </button>
                      ) : s.totalBonus > 0 ? (
                        <button
                          type="button"
                          onClick={() => handleOpenManageBonuses(s.studentId)}
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline group cursor-pointer"
                          title="Bấm để chuyển tuần, sửa hoặc xóa điểm cộng tuần của học sinh này"
                        >
                          <span>+{formatVietnameseNumber(s.totalBonus)}đ</span>
                          <ArrowRightLeft className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity print:hidden" />
                        </button>
                      ) : (
                        <span className="text-slate-300">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                      <button type="button" title="Xem cách tính điểm" className="underline decoration-dotted" onClick={() => setExplainStudentId(s.studentId)}>{formatVietnameseNumber(s.finalScore)}</button>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${rankBadge.bg} ${rankBadge.text} ${rankBadge.border}`}
                      >
                        {s.rank}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                      {s.notes}
                    </td>
                    <td className="py-2.5 px-3 text-center print:hidden">
                      <div className="flex items-center justify-center gap-1">
                        {activeAccount?.role !== 'monitor' && <button type="button" onClick={() => setEditPointsStudentId(s.studentId)} title={`Sửa điểm đã ghi nhận của ${s.fullName}`} aria-label={`Sửa điểm của ${s.fullName}`} className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded"><Edit3 className="h-4 w-4" /></button>}
                        {s.totalBonus > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenManageBonuses(s.studentId)}
                            className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                            title={`⇄ Chuyển điểm thưởng sang tuần khác hoặc sửa điểm của ${s.fullName}`}
                            aria-label={`Chuyển điểm thưởng của ${s.fullName}`}
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isPeriodLocked('week', selectedWeek) || (activeAccount?.role === 'monitor' && !activeAccount.permissions?.canAddViolations)}
                          onClick={() => setDeductStudentId(s.studentId)}
                          className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title={`− Trừ điểm tuần ${selectedWeek} cho ${s.fullName}`}
                          aria-label={`Trừ điểm cho ${s.fullName}`}
                        >
                          <MinusCircle className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudentIds([s.studentId]);
                            setModalStudentSearch('');
                            setSelectedRuleId('');
                            setCustomScoreInput(1.0);
                            setCustomNoteInput('');
                            setIsCustomAwardModalOpen(true);
                          }}
                          className="p-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                          title={`+ Cộng điểm tuần riêng cho ${s.fullName}`}
                        >
                          <PlusCircle className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectStudentForReport) onSelectStudentForReport(s.studentId, { period: 'week', weekNumber: selectedWeek, month: selectedMonth });
                            onNavigateTab('parent-report');
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                          title="Tạo tin nhắn báo phụ huynh học sinh này"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Floating Batch Action Bar when table items are checked */}
        {tableSelectedStudentIds.size > 0 && (
          <div className="sticky bottom-3 mx-4 my-2 p-3 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white rounded-2xl shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-slideUp z-20">
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {tableSelectedStudentIds.size}
              </span>
              <div>
                <p className="text-xs font-bold text-white">
                  Đã chọn {tableSelectedStudentIds.size} học sinh
                </p>
                <p className="text-[11px] text-slate-400">
                  Sẵn sàng cộng điểm thi đua tuần {selectedWeek} hàng loạt
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTableSelectedStudentIds(new Set())}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Bỏ chọn
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedStudentIds(Array.from(tableSelectedStudentIds));
                  setModalStudentSearch('');
                  setSelectedRuleId('');
                  setCustomScoreInput(1.0);
                  setCustomNoteInput('');
                  setIsCustomAwardModalOpen(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Award className="h-4 w-4" />
                <span>Cộng Điểm Tuần ({tableSelectedStudentIds.size} HS)</span>
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* MODAL: XÉT THƯỞNG TỰ ĐỘNG TUẦN KHÔNG VI PHẠM */}
      {isAutoAwardModalOpen && zeroViolationRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <span>Xét Thưởng Tự Động: {zeroViolationRule.title}</span>
              </h3>
              <button
                onClick={() => setIsAutoAwardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Tìm thấy <strong>{eligibleZeroViolationStudents.length} học sinh</strong> trong tuần {selectedWeek} chấp hành nề nếp gương mẫu (không có bất kỳ vi phạm nào).
              </p>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  Quy chế áp dụng: [{zeroViolationRule.code}] {zeroViolationRule.title}
                </p>
                <p className="text-amber-800 dark:text-amber-300">
                  Mức điểm thưởng cộng: <strong>+{zeroViolationRule.bonusScore} điểm</strong> vào tổng kết tuần {selectedWeek}.
                </p>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Danh sách {eligibleZeroViolationStudents.length} học sinh được trao thưởng:
                </label>
                <div className="max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-750 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 grid grid-cols-2 gap-1.5 scrollbar-thin">
                  {eligibleZeroViolationStudents.map((s, idx) => (
                    <div key={s.studentId} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">
                        {idx + 1}. {s.fullName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setIsAutoAwardModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => handleConfirmAutoAward().catch(e => alert(e.message || String(e)))}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
              >
                Xác nhận trao thưởng ({eligibleZeroViolationStudents.length} HS)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CỘNG ĐIỂM THƯỞNG TUẦN (1 HOẶC NHIỀU HỌC SINH CÙNG LÚC) */}
      {isCustomAwardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[92vh] overflow-y-auto scrollbar-thin">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cộng Điểm Thưởng Tuần {selectedWeek}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Áp dụng cộng điểm thi đua, thành tích cho 1 hoặc nhiều học sinh cùng lúc
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomAwardModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* SECTION 1: CHỌN HỌC SINH */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-750 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>Danh sách học sinh nhận điểm thưởng:</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold text-[11px]">
                      Đã chọn {selectedStudentIds.length} / {students.length} HS
                    </span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds(students.map((s) => s.id))}
                      className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold rounded-lg border border-slate-200 dark:border-slate-600 transition cursor-pointer text-[11px]"
                    >
                      + Chọn cả lớp ({students.length})
                    </button>
                    {selectedStudentIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds([])}
                        className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-rose-50 text-rose-600 dark:text-rose-400 font-semibold rounded-lg border border-slate-200 dark:border-slate-600 transition cursor-pointer text-[11px]"
                      >
                        Bỏ chọn
                      </button>
                    )}
                  </div>
                </div>

                {/* Search Bar for student list */}
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo họ tên hoặc mã học sinh..."
                    value={modalStudentSearch}
                    onChange={(e) => setModalStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Selected Chips Preview */}
                {selectedStudentIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {selectedStudentIds.slice(0, 8).map((sId) => {
                      const st = students.find((x) => x.id === sId);
                      if (!st) return null;
                      return (
                        <span
                          key={sId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-[11px] font-medium"
                        >
                          <span className="truncate max-w-[120px]">{st.fullName}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedStudentIds(selectedStudentIds.filter((id) => id !== sId))}
                            className="hover:text-rose-600 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                    {selectedStudentIds.length > 8 && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium self-center">
                        +{selectedStudentIds.length - 8} học sinh khác...
                      </span>
                    )}
                  </div>
                )}

                {/* Student Checklist Grid */}
                <div className="max-h-44 overflow-y-auto scrollbar-thin bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {filteredModalStudents.map((s) => {
                    const isChecked = selectedStudentIds.includes(s.id);
                    const weekSummary = weeklyData.find((w) => w.studentId === s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between p-2 rounded-lg border transition cursor-pointer select-none ${
                          isChecked
                            ? 'bg-blue-50/80 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-100 dark:border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedStudentIds([...selectedStudentIds, s.id]);
                              } else {
                                setSelectedStudentIds(selectedStudentIds.filter((id) => id !== s.id));
                              }
                            }}
                            className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {s.fullName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {s.studentCode}
                            </p>
                          </div>
                        </div>

                        {weekSummary && (
                          <span
                            className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md shrink-0 ${
                              weekSummary.finalScore >= 8.5
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : weekSummary.finalScore >= 7.0
                                ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                            title="Điểm tổng kết tuần hiện tại"
                          >
                            {formatVietnameseNumber(weekSummary.finalScore)}đ
                          </span>
                        )}
                      </label>
                    );
                  })}
                  {filteredModalStudents.length === 0 && (
                    <div className="col-span-2 py-4 text-center text-slate-400">
                      Không tìm thấy học sinh nào phù hợp từ khóa
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: QUY CHẾ VÀ MỨC ĐIỂM CỘNG */}
              <div className="p-3.5 bg-amber-50/40 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 space-y-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Quy chế / Danh hiệu thành tích mẫu{' '}
                    <span className="text-slate-400 font-normal text-xs">(Không bắt buộc)</span>
                  </label>
                  <select
                    value={selectedRuleId}
                    onChange={(e) => {
                      const ruleId = e.target.value;
                      setSelectedRuleId(ruleId);
                      const r = weeklyRules.find((x) => x.id === ruleId);
                      if (r) {
                        setCustomScoreInput(r.bonusScore);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold cursor-pointer"
                  >
                    <option value="">-- Không chọn quy chế (Nhập tự do theo đề xuất của GVCN) --</option>
                    {weeklyRules.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.code}] {r.title} (+{r.bonusScore}đ)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Mức điểm thưởng cộng cho mỗi HS
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        max="100"
                        value={customScoreInput}
                        onChange={(e) => setCustomScoreInput(Number(e.target.value))}
                        className="w-28 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black font-mono text-emerald-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="flex items-center gap-1 flex-wrap">
                        {[0.5, 1.0, 1.5, 2.0].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCustomScoreInput(preset)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer border ${
                              customScoreInput === preset
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            +{preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Áp dụng vào thời điểm
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`Tuần ${selectedWeek} (Tháng ${selectedMonth}) • Năm học ${classConfig.schoolYear || currentSchoolYear()}`}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Lý do / Ghi chú cụ thể (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="vd: Tuyên dương trực nhật sạch sẽ, đạt hoa điểm 10, tham gia văn nghệ 20/11..."
                    value={customNoteInput}
                    onChange={(e) => setCustomNoteInput(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                {selectedStudentIds.length === 0 ? (
                  <span className="text-amber-600 font-medium">⚠️ Vui lòng chọn ít nhất 1 học sinh</span>
                ) : (
                  <span>
                    Tổng điểm cộng thêm vào lớp: <strong>+{selectedStudentIds.length * (Number(customScoreInput) || 0)} điểm</strong>
                  </span>
                )}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomAwardModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={selectedStudentIds.length === 0}
                  onClick={() => handleConfirmCustomAward().catch(e => alert(e.message || String(e)))}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Award className="h-4 w-4" />
                  <span>
                    Xác nhận cộng +{customScoreInput}đ ({selectedStudentIds.length} HS)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUẢN LÝ & SỬA / XÓA ĐIỂM THƯỞNG TUẦN */}
      {isManageBonusesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-600" />
                  <span>Quản Lý, Chuyển & Sửa / Xóa Điểm Thưởng Tuần {selectedWeek}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Di chuyển điểm thưởng sang tuần khác, điều chỉnh số điểm hoặc xóa / thu hồi điểm thưởng đã ghi nhận
                </p>
              </div>
              <button
                onClick={() => {
                  setIsManageBonusesModalOpen(false);
                  setEditingBonusLog(null);
                  setMovingBonusLogs(null);
                  setDeletingBonusLog(null);
                  setSelectedBonusLogIds(new Set());
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-Panel: Chỉnh Sửa Điểm Thưởng */}
            {editingBonusLog && (
              <div className="my-3 p-4 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 rounded-xl space-y-3 shrink-0 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-amber-800">
                  <span className="font-bold text-xs text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <Edit3 className="h-4 w-4 text-amber-600" />
                    Chỉnh sửa điểm thưởng: <strong>{editingBonusLog.studentName}</strong> ({editingBonusLog.studentCode})
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 font-semibold">
                    {editingBonusLog.isAchievement ? 'Thành tích tuần' : 'Điểm cộng nề nếp'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Tên danh hiệu / Nội dung khen thưởng *
                    </label>
                    <input
                      type="text"
                      value={editingBonusLog.title}
                      onChange={(e) =>
                        setEditingBonusLog({ ...editingBonusLog, title: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 font-medium"
                      placeholder="vd: Tuyên dương hoa điểm 10, giải bơi lội..."
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Mức điểm thưởng (+đ) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.1"
                      max="100"
                      value={editingBonusLog.score}
                      onChange={(e) =>
                        setEditingBonusLog({
                          ...editingBonusLog,
                          score: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-emerald-600 font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Tuần áp dụng (Chuyển tuần)
                    </label>
                    <select
                      value={editingBonusLog.targetWeekNumber}
                      onChange={(e) =>
                        setEditingBonusLog({
                          ...editingBonusLog,
                          targetWeekNumber: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 font-medium"
                    >
                      {classConfig.weeks.map((w) => (
                        <option
                          key={w.weekNumber}
                          value={w.weekNumber}
                          disabled={isPeriodLocked('week', w.weekNumber) && w.weekNumber !== editingBonusLog.targetWeekNumber}
                        >
                          Tuần {w.weekNumber} (Tháng {w.month})
                          {w.weekNumber === selectedWeek ? ' - Hiện tại' : ''}
                          {isPeriodLocked('week', w.weekNumber) ? ' - [Đã khóa]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Ghi chú cụ thể
                    </label>
                    <input
                      type="text"
                      value={editingBonusLog.note}
                      onChange={(e) =>
                        setEditingBonusLog({ ...editingBonusLog, note: e.target.value })
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-750 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100"
                      placeholder="Ghi chú thêm về thành tích hoặc lý do khen thưởng..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-amber-200/70 dark:border-amber-800/80">
                  <button
                    type="button"
                    onClick={() => setEditingBonusLog(null)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy chỉnh sửa
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditBonus}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            )}

            {/* Sub-Panel: Xác Nhận Di Chuyển Điểm Thưởng Tuần */}
            {movingBonusLogs && (
              <div className="my-3 p-4 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-700 rounded-xl space-y-3 shrink-0 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200 dark:border-blue-800">
                  <span className="font-bold text-xs text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                    Di chuyển {movingBonusLogs.length} điểm thưởng từ Tuần {selectedWeek} sang tuần khác
                  </span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-200/80 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200 font-bold">
                    Tổng +{formatVietnameseNumber(movingBonusLogs.reduce((acc, l) => acc + l.totalScore, 0))}đ
                  </span>
                </div>

                <div className="max-h-28 overflow-y-auto space-y-1 text-xs pr-1 scrollbar-thin">
                  {movingBonusLogs.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900 text-[11px]"
                    >
                      <div className="truncate pr-2">
                        <strong>{l.studentName}</strong> ({l.studentCode}) •{' '}
                        <span className="text-slate-600 dark:text-slate-300">
                          {l.behaviorDescription.replace(/\[Thành tích (tuần|tháng)\]\s*/g, '')}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        +{formatVietnameseNumber(l.totalScore)}đ
                      </span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Chọn tuần đích muốn chuyển đến *
                    </label>
                    <select
                      value={targetMoveWeek}
                      onChange={(e) => setTargetMoveWeek(Number(e.target.value))}
                      disabled={isMovingBonus}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-blue-300 dark:border-blue-700 rounded-xl text-slate-800 dark:text-slate-100 font-semibold text-xs"
                    >
                      {classConfig.weeks.map((w) => {
                        const isCur = w.weekNumber === selectedWeek;
                        const isLock = isPeriodLocked('week', w.weekNumber);
                        return (
                          <option key={w.weekNumber} value={w.weekNumber} disabled={isCur || isLock}>
                            Tuần {w.weekNumber} (Tháng {w.month}: {formatVietnameseDate(w.startDate)} - {formatVietnameseDate(w.endDate)})
                            {isCur ? ' • (Tuần hiện tại)' : ''}
                            {isLock ? ' • [Đã khóa]' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                      Lý do / Ghi chú di chuyển (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={customMoveNote}
                      onChange={(e) => setCustomMoveNote(e.target.value)}
                      disabled={isMovingBonus}
                      placeholder="VD: Chuyển thưởng theo đề xuất GVCN / bù điểm..."
                      className="w-full px-3 py-2 bg-white dark:bg-slate-750 border border-blue-300 dark:border-blue-700 rounded-xl text-slate-800 dark:text-slate-100 text-xs"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-blue-700 dark:text-blue-300 bg-blue-100/60 dark:bg-blue-900/30 p-2 rounded-lg">
                  💡 Điểm thưởng sẽ được chuyển khỏi bảng điểm Tuần {selectedWeek} và cộng ngay vào Tuần {targetMoveWeek}. Bảng tổng kết và xếp loại của học sinh sẽ tự động cập nhật ngay lập tức.
                </p>

                <div className="flex justify-end gap-2 pt-1 border-t border-blue-200 dark:border-blue-800">
                  <button
                    type="button"
                    disabled={isMovingBonus}
                    onClick={() => setMovingBonusLogs(null)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    disabled={isMovingBonus || targetMoveWeek === selectedWeek || isPeriodLocked('week', targetMoveWeek)}
                    onClick={handleConfirmMoveBonus}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    <span>{isMovingBonus ? 'Đang chuyển…' : `Xác nhận chuyển sang Tuần ${targetMoveWeek}`}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Sub-Panel: Xác Nhận Xóa Điểm Thưởng */}
            {deletingBonusLog && (
              <div className="my-3 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl space-y-2 shrink-0 animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Xác nhận xóa / thu hồi điểm thưởng</span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  Bạn có chắc chắn muốn xóa điểm thưởng <strong>+{deletingBonusLog.score}đ</strong> ({deletingBonusLog.title}) của học sinh <strong>{deletingBonusLog.studentName}</strong>?
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Lưu ý: Sau khi xóa, tổng điểm và xếp loại tuần {selectedWeek} của học sinh sẽ tự động được tính toán lại ngay lập tức.
                </p>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDeletingBonusLog(null)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteBonus}
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow-sm transition active:scale-95"
                  >
                    Xác nhận xóa vĩnh viễn
                  </button>
                </div>
              </div>
            )}

            {/* Batch Action Bar */}
            {selectedBonusLogIds.size > 0 && !movingBonusLogs && !editingBonusLog && !deletingBonusLog && (
              <div className="my-2 p-2.5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-xs flex items-center justify-between gap-2 shrink-0 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200 font-bold">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  <span>Đã chọn {selectedBonusLogIds.size} điểm thưởng</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const logsToMove = weeklyBonusLogs.filter((l) => selectedBonusLogIds.has(l.id));
                      handleStartMoveBonus(logsToMove);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    <span>Chuyển {selectedBonusLogIds.size} mục sang tuần khác</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBonusLogIds(new Set())}
                    className="px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            )}

            {/* Search and Filters Bar */}
            <div className="space-y-2 shrink-0 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Search */}
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên học sinh, mã HS, nội dung..."
                    value={manageBonusSearch}
                    onChange={(e) => setManageBonusSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                  />
                </div>

                {/* Filter by Student */}
                <div>
                  <select
                    value={manageStudentFilter}
                    onChange={(e) => setManageStudentFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="all">-- Xem tất cả học sinh được thưởng ({weeklyBonusLogs.length} bản ghi) --</option>
                    {studentsWithWeeklyBonus.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.studentCode} - {s.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Type Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold">
                <span className="text-slate-400 font-normal shrink-0">Loại:</span>
                <button
                  type="button"
                  onClick={() => setManageBonusFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                    manageBonusFilterType === 'all'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Tất cả ({weeklyBonusLogs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setManageBonusFilterType('achievement')}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                    manageBonusFilterType === 'achievement'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Thành tích tuần 🏆 ({weeklyBonusLogs.filter((l) => l.behaviorCode.startsWith('TT_') || l.behaviorDescription.includes('[Thành tích')).length})
                </button>
                <button
                  type="button"
                  onClick={() => setManageBonusFilterType('regular')}
                  className={`px-2.5 py-1 rounded-lg transition shrink-0 ${
                    manageBonusFilterType === 'regular'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Điểm cộng nề nếp ({weeklyBonusLogs.filter((l) => !l.behaviorCode.startsWith('TT_') && !l.behaviorDescription.includes('[Thành tích')).length})
                </button>
              </div>

              {filteredBonusLogs.length > 0 && (
                <div className="flex items-center justify-between text-xs pt-0.5 px-0.5">
                  <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer select-none font-medium">
                    <input
                      type="checkbox"
                      checked={filteredBonusLogs.length > 0 && filteredBonusLogs.every((l) => selectedBonusLogIds.has(l.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBonusLogIds(new Set(filteredBonusLogs.map((l) => l.id)));
                        } else {
                          setSelectedBonusLogIds(new Set());
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Chọn tất cả ({filteredBonusLogs.length} bản ghi)</span>
                  </label>
                  {selectedBonusLogIds.size > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const logsToMove = weeklyBonusLogs.filter((l) => selectedBonusLogIds.has(l.id));
                        handleStartMoveBonus(logsToMove);
                      }}
                      className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                      <span>Chuyển {selectedBonusLogIds.size} mục đã chọn sang tuần khác</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* List of Bonus Logs */}
            <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[420px] pr-1 space-y-2 scrollbar-thin mt-2">
              {filteredBonusLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Award className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-xs">
                    {weeklyBonusLogs.length === 0
                      ? `Chưa có điểm thưởng nào được ghi nhận trong tuần ${selectedWeek}.`
                      : 'Không tìm thấy bản ghi điểm thưởng nào khớp với bộ lọc hiện tại.'}
                  </p>
                </div>
              ) : (
                filteredBonusLogs.map((log) => {
                  const isAch =
                    log.behaviorCode.startsWith('TT_') ||
                    log.behaviorDescription.includes('[Thành tích');
                  const cleanTitle = log.behaviorDescription
                    .replace(/\[Thành tích (tuần|tháng)\]\s*/g, '')
                    .trim();

                  return (
                    <div
                      key={log.id}
                      className={`p-3 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 border rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        selectedBonusLogIds.has(log.id)
                          ? 'border-blue-400 dark:border-blue-600 bg-blue-50/40 dark:bg-blue-950/30'
                          : 'bg-slate-50 dark:bg-slate-750/70 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedBonusLogIds.has(log.id)}
                          onChange={(e) => {
                            const next = new Set(selectedBonusLogIds);
                            if (e.target.checked) next.add(log.id);
                            else next.delete(log.id);
                            setSelectedBonusLogIds(next);
                          }}
                          className="mt-1 rounded text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                          title="Chọn để chuyển sang tuần khác"
                        />
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {log.studentName}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400 font-medium">
                              ({log.studentCode})
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isAch
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              }`}
                            >
                              {isAch ? '🏆 Thành tích tuần' : '⭐ Điểm cộng nề nếp'}
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {cleanTitle}
                          </p>

                          {log.note && (
                            <p className="text-[11px] text-slate-500 italic">
                              Ghi chú: {log.note}
                            </p>
                          )}

                          <div className="text-[10px] text-slate-400 flex items-center gap-2 flex-wrap">
                            <span>Ngày: {formatVietnameseDate(log.date)}</span>
                            <span>•</span>
                            <span>{log.periodOrTime || `Tuần ${selectedWeek}`}</span>
                            <span>•</span>
                            <span>Người ghi: {log.reporter || 'GVCN'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                          +{formatVietnameseNumber(log.totalScore)}đ
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartMoveBonus([log])}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50 rounded-lg transition cursor-pointer"
                            title="Di chuyển điểm thưởng này sang tuần khác"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditBonus(log)}
                            className="p-1.5 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/50 rounded-lg transition cursor-pointer"
                            title="Sửa số điểm hoặc nội dung khen thưởng"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeletingBonusLog({
                                id: log.id,
                                studentName: log.studentName,
                                score: log.totalScore,
                                title: cleanTitle,
                              })
                            }
                            className="p-1.5 text-rose-600 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/60 rounded-lg transition cursor-pointer"
                            title="Xóa điểm thưởng này"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 text-xs">
              <span className="text-slate-500 font-medium">
                Tổng cộng: <strong>{filteredBonusLogs.length}</strong> bản ghi (
                <span className="text-emerald-600 font-bold font-mono">
                  +{formatVietnameseNumber(
                    filteredBonusLogs.reduce((acc, curr) => acc + curr.totalScore, 0)
                  )}đ
                </span>
                )
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsManageBonusesModalOpen(false);
                  setEditingBonusLog(null);
                  setDeletingBonusLog(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zalo Image Export Modal */}
      <SummaryZaloExportModal
        isOpen={isZaloModalOpen}
        onClose={() => setIsZaloModalOpen(false)}
        periodType="weekly"
        periodTitle={`Tuần ${selectedWeek} (Tháng ${selectedMonth})`}
        periodTimeInfo={
          currentWeekInfo
            ? `Từ ${formatVietnameseDate(currentWeekInfo.startDate)} đến ${formatVietnameseDate(currentWeekInfo.endDate)}`
            : undefined
        }
        className={classConfig.className}
        schoolYear={classConfig.schoolYear}
        homeroomTeacher={classConfig.homeroomTeacher}
        stats={{
          totalStudents: weeklyData.length,
          avgScore: stats.avgScore,
          excellentCount: stats.ranks['Xuất sắc'] || 0,
          goodCount: stats.ranks['Tốt'] || 0,
          fairCount: stats.ranks['Khá'] || 0,
          mediumCount: stats.ranks['Trung bình'] || 0,
          weakCount: stats.ranks['Yếu'] || 0,
          totalViolations: stats.totalViolations,
          totalDeduct: stats.totalDeduct,
          totalBonus: stats.totalBonus,
          totalAchievementBonus: stats.totalAchievementBonus,
        }}
        students={[...weeklyData]
          .sort((a, b) => b.finalScore - a.finalScore || a.studentCode.localeCompare(b.studentCode))
          .map((d, idx) => ({
            stt: idx + 1,
            studentCode: d.studentCode,
            fullName: d.fullName,
            dateOfBirth: d.dateOfBirth,
            violationCount: d.violationCount,
            totalDeduct: d.totalDeduct,
            totalBonus: d.totalBonus,
            achievementBonus: d.achievementBonus,
            achievements: d.achievements,
            finalScore: d.finalScore,
            rank: d.rank,
            notes: d.notes,
          }))}
      />
      {deductStudentId && <DailyLogModalV2
        isOpen
        initialStudentId={deductStudentId}
        initialWeek={selectedWeek}
        onClose={() => setDeductStudentId(null)}
        onSuccessToast={message => setAwardingResult(message)}
      />}
      {editPointsStudentId && <StudentPointEditor studentId={editPointsStudentId} weekNumber={selectedWeek} onClose={() => setEditPointsStudentId(null)} />}
    </div>
  );
};
