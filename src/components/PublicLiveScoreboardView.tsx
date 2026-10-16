import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  RefreshCw,
  Search,
  Trophy,
  Award,
  Users,
  AlertTriangle,
  Sparkles,
  Calendar,
  Lock,
  Unlock,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Printer,
  ChevronDown,
  Info,
  ArrowUpDown,
  Phone,
  Mail,
  School,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  PublicScoreboardPayload,
  PublicScoreboardStudentRow,
  PublicScoreboardRecentLog,
} from '../types/publicScoreboard';
import {
  subscribePublicScoreboard,
  fetchPublicScoreboard,
} from '../services/publicScoreboardService';
import { StudentWeeklySummary, StudentMonthlySummary, StudentSemesterSummary, RankLevel } from '../types';
import { getRankBadgeClass, formatVietnameseDate } from '../lib/utils';

interface PublicLiveScoreboardViewProps {
  classId: string;
  onOpenLoginModal?: () => void;
}

export const PublicLiveScoreboardView: React.FC<PublicLiveScoreboardViewProps> = ({
  classId,
  onOpenLoginModal,
}) => {
  const [data, setData] = useState<PublicScoreboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tab kỳ xem
  const [periodType, setPeriodType] = useState<'weekly' | 'monthly' | 'semester' | 'live-feed'>('weekly');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1);

  // Tìm kiếm & Lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRank, setFilterRank] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rank' | 'name' | 'code'>('rank');

  // Khóa PIN
  const [pinInput, setPinInput] = useState('');
  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);

  // Modal xem chi tiết từng học sinh
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<PublicScoreboardStudentRow | null>(null);

  // Lắng nghe dữ liệu thời gian thực qua Firestore onSnapshot
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = subscribePublicScoreboard(
      classId,
      (remoteData) => {
        setLoading(false);
        if (!remoteData) {
          setError('Không tìm thấy bảng điểm hoặc giáo viên chưa công bố liên kết cho lớp này.');
          setData(null);
        } else {
          setData(remoteData);
          setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
          // Đồng bộ tuần hiện tại nếu chưa chọn
          if (remoteData.currentWeek) {
            setSelectedWeek((prev) => (prev === 1 ? remoteData.currentWeek : prev));
          }
          if (remoteData.months && remoteData.months[0]) {
            setSelectedMonth((prev) => (prev === 9 ? remoteData.months[0] : prev));
          }
          // Kiểm tra xem có cần PIN không
          if (!remoteData.requirePin) {
            setIsPinUnlocked(true);
          }
        }
      },
      (err) => {
        setLoading(false);
        setError('Không thể kết nối đến máy chủ thời gian thực. Vui lòng kiểm tra kết nối mạng.');
        console.error(err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [classId]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await fetchPublicScoreboard(classId);
      if (refreshed) {
        setData(refreshed);
        setLastSyncTime(new Date().toLocaleTimeString('vi-VN'));
      }
    } catch {
      // Ignored
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (data.pinCode && pinInput.trim() === data.pinCode.trim()) {
      setIsPinUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Helper ẩn danh họ tên học sinh nếu bật chế độ ranked_anonymous
  const formatStudentDisplayName = (fullName: string): string => {
    if (!data || data.viewMode !== 'ranked_anonymous') return fullName;
    const parts = fullName.trim().split(/\s+/);
    if (parts.length <= 1) return fullName;
    const lastName = parts[0];
    const firstName = parts[parts.length - 1];
    const middleInitials = parts
      .slice(1, -1)
      .map((p) => `${p.charAt(0).toUpperCase()}.`)
      .join(' ');
    return `${lastName} ${middleInitials ? middleInitials + ' ' : ''}${firstName}`;
  };

  // Danh sách học sinh theo tuần/tháng/kỳ được lọc và sắp xếp (có fallback thông minh nếu tuần/tháng tương lai không có trong payload)
  const currentWeekSummaries = useMemo(() => {
    if (!data) return [];
    const found = data.weeklySummaries?.[selectedWeek];
    if (found && found.length > 0) return found;

    // Fallback cho các tuần chưa diễn ra hoặc tuần chưa có dữ liệu nề nếp
    return data.students.map((s) => ({
      studentId: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      status: 'active' as const,
      violationCount: 0,
      bonusCount: 0,
      totalDeduct: 0,
      totalBonus: 0,
      excusedAbsenceCount: 0,
      unexcusedAbsenceCount: 0,
      truancyCount: 0,
      finalScore: data.baseScore,
      rank: 'Xuất sắc' as const,
      notes: '',
    }));
  }, [data, selectedWeek]);

  const currentMonthSummaries = useMemo(() => {
    if (!data) return [];
    const found = data.monthlySummaries?.[selectedMonth];
    if (found && found.length > 0) return found;

    // Fallback cho các tháng tương lai
    return data.students.map((s) => ({
      studentId: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      status: 'active' as const,
      weekDeductions: {},
      totalDeduct: 0,
      totalBonus: 0,
      excusedAbsenceCount: 0,
      unexcusedAbsenceCount: 0,
      truancyCount: 0,
      finalScore: data.baseScore,
      rank: 'Xuất sắc' as const,
      violationCount: 0,
      bonusCount: 0,
      notes: '',
    }));
  }, [data, selectedMonth]);

  const currentSemesterSummaries = useMemo(() => {
    if (!data) return [];
    const found = data.semesterSummaries?.[selectedSemester];
    if (found && found.length > 0) return found;

    // Fallback cho học kỳ chưa diễn ra
    return data.students.map((s) => ({
      studentId: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      status: 'active' as const,
      monthlyScores: {},
      averageScore: data.baseScore,
      finalRank: 'Xuất sắc' as const,
      totalViolations: 0,
      totalDeduct: 0,
      totalBonus: 0,
      excusedAbsenceCount: 0,
      unexcusedAbsenceCount: 0,
      truancyCount: 0,
    }));
  }, [data, selectedSemester]);

  // Bộ lọc tìm kiếm
  const filteredStudents = useMemo(() => {
    if (!data) return [];

    let list: Array<{
      student: PublicScoreboardStudentRow;
      weekly?: StudentWeeklySummary;
      monthly?: StudentMonthlySummary;
      semester?: StudentSemesterSummary;
    }> = [];

    // Ghép thông tin student với summary tương ứng
    for (const student of data.students) {
      const weekly = currentWeekSummaries.find((w) => w.studentId === student.id);
      const monthly = currentMonthSummaries.find((m) => m.studentId === student.id);
      const semester = currentSemesterSummaries.find((s) => s.studentId === student.id);

      list.push({ student, weekly, monthly, semester });
    }

    // Nếu chế độ chỉ cho tra cứu (lookup_only) và chưa gõ tìm kiếm -> Không hiển thị toàn bộ
    if (data.viewMode === 'lookup_only' && !searchQuery.trim()) {
      return [];
    }

    // Lọc theo search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => {
        const nameMatch = item.student.fullName.toLowerCase().includes(q);
        const codeMatch = item.student.studentCode.toLowerCase().includes(q);
        return nameMatch || codeMatch;
      });
    }

    // Lọc theo xếp loại
    if (filterRank !== 'all') {
      list = list.filter((item) => {
        if (periodType === 'weekly') return item.weekly?.rank === filterRank;
        if (periodType === 'monthly') return item.monthly?.rank === filterRank;
        if (periodType === 'semester') return item.semester?.finalRank === filterRank;
        return true;
      });
    }

    // Sắp xếp
    list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.student.fullName.localeCompare(b.student.fullName, 'vi');
      }
      if (sortBy === 'code') {
        return a.student.studentCode.localeCompare(b.student.studentCode);
      }
      // Sắp xếp theo rank / score giảm dần (Mặc định)
      const scoreA =
        periodType === 'weekly'
          ? a.weekly?.finalScore ?? 0
          : periodType === 'monthly'
          ? a.monthly?.finalScore ?? 0
          : a.semester?.averageScore ?? 0;
      const scoreB =
        periodType === 'weekly'
          ? b.weekly?.finalScore ?? 0
          : periodType === 'monthly'
          ? b.monthly?.finalScore ?? 0
          : b.semester?.averageScore ?? 0;
      return scoreB - scoreA;
    });

    return list;
  }, [
    data,
    currentWeekSummaries,
    currentMonthSummaries,
    currentSemesterSummaries,
    searchQuery,
    filterRank,
    sortBy,
    periodType,
  ]);

  // Top 3 học sinh xuất sắc nhất tuần
  const top3Students = useMemo(() => {
    if (!data || !data.showTrophyTop3 || currentWeekSummaries.length === 0) return [];
    const sorted = [...currentWeekSummaries].sort((a, b) => b.finalScore - a.finalScore);
    return sorted.slice(0, 3);
  }, [data, currentWeekSummaries]);

  // Lịch sử nhật ký của học sinh đang được xem chi tiết
  const studentLogsForDetail = useMemo(() => {
    if (!data || !selectedStudentDetail) return [];
    return data.recentLogs.filter((l) => l.studentId === selectedStudentDetail.id);
  }, [data, selectedStudentDetail]);

  // ── Màn hình Đang tải ──
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="relative inline-flex p-4 rounded-3xl bg-blue-50 dark:bg-blue-900/40 text-blue-600">
            <Radio className="h-10 w-10 animate-pulse text-blue-600 dark:text-blue-400" />
            <span className="absolute top-2 right-2 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600" />
            </span>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Đang kết nối Bảng điểm Thời gian thực…
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Trường Cao Đẳng Nghề Số 1 - Bộ Quốc Phòng
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Màn hình Lỗi hoặc Chưa công bố ──
  if (error || !data || !data.isPublic) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center space-y-5">
          <div className="inline-flex p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <ShieldCheck className="h-12 w-12" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Bảng điểm chưa công bố hoặc đang tạm khóa
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {error || 'Giáo viên chủ nhiệm hiện chưa kích hoạt chế độ xem điểm công khai cho liên kết này.'}
            </p>
          </div>
          {onOpenLoginModal && (
            <button
              onClick={onOpenLoginModal}
              className="w-full py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Đăng nhập không gian Giáo viên
            </button>
          )}
        </div>
      </main>
    );
  }

  // ── Màn hình Nhập Mã PIN bảo vệ (nếu có yêu cầu PIN) ──
  if (data.requirePin && !isPinUnlocked) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Bảng Điểm Lớp {data.className}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Giáo viên chủ nhiệm {data.homeroomTeacher} đã cài đặt mã bảo vệ cho bảng điểm này.
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nhập mã PIN của lớp
              </label>
              <input
                type="password"
                required
                autoFocus
                maxLength={10}
                placeholder="Nhập mã PIN…"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                className={`w-full px-4 py-3 rounded-2xl border text-center text-lg font-mono tracking-widest bg-slate-50 dark:bg-slate-800 transition ${
                  pinError
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500'
                }`}
              />
              {pinError && (
                <p className="text-[11px] text-rose-600 mt-1.5 text-center font-medium">
                  Mã PIN không chính xác. Vui lòng liên hệ GVCN!
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Mở Bảng Điểm
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── GIAO DIỆN CHÍNH: BẢNG ĐIỂM THỜI GIAN THỰC ──
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-600 selection:text-white pb-20">
      {/* ── STICKY REAL-TIME LIVE STATUS BAR ── */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs">
          {/* Left: Pulse Indicator */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[11px] shrink-0">
              TRỰC TIẾP
            </span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
              Tự động cập nhật tức thời khi giáo viên chấm điểm
            </span>
          </div>

          {/* Right: Last sync time + Refresh + Print */}
          <div className="flex items-center gap-2 shrink-0">
            {lastSyncTime && (
              <span className="text-[11px] text-slate-400 hidden md:inline">
                Cập nhật: {lastSyncTime}
              </span>
            )}
            <button
              type="button"
              onClick={handleManualRefresh}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition text-xs font-semibold cursor-pointer"
              title="Làm mới bảng điểm"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition text-xs font-semibold cursor-pointer print:hidden"
              title="In bảng điểm"
            >
              <Printer className="h-3 w-3" />
              <span className="hidden sm:inline">In</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        {/* HERO INSTITUTION BANNER */}
        <section className="rounded-3xl bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-xs font-bold text-blue-200">
                <School className="h-3.5 w-3.5 text-blue-300" />
                <span>{data.schoolName}</span>
              </div>
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Năm học {data.schoolYear}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                BẢNG THEO DÕI NỀ NẾP & THI ĐUA LỚP {data.className}
              </h1>
              <p className="text-xs sm:text-sm text-blue-100/80 mt-1">
                Giáo viên chủ nhiệm:{' '}
                <strong className="text-white font-bold">{data.homeroomTeacher}</strong>
                {data.teacherPhone && <span> • SĐT: {data.teacherPhone}</span>}
                <span> • Sĩ số: {data.students.length} học sinh</span>
              </p>
            </div>

            {/* Custom Teacher Notice */}
            {data.customNotice && (
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-blue-100 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{data.customNotice}</p>
              </div>
            )}
          </div>
        </section>

        {/* ── OVERVIEW STATS CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Sĩ số lớp</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              {data.students.length}{' '}
              <span className="text-xs font-normal text-slate-400">học sinh</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Điểm TB Tuần {selectedWeek}
            </span>
            <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
              {data.stats.averageWeeklyScore}{' '}
              <span className="text-xs font-normal text-slate-400">điểm</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Xếp loại Tốt & Xuất sắc
            </span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {data.stats.topRankCount}{' '}
              <span className="text-xs font-normal text-slate-400">học sinh</span>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Ghi nhận nề nếp tuần
            </span>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <span>+{data.stats.bonusCount}</span>
              <span className="text-xs font-normal text-slate-400">/</span>
              <span className="text-rose-600 dark:text-rose-400">-{data.stats.violationCount}</span>
            </p>
          </div>
        </div>

        {/* ── TOP 3 PODIUM VINH DANH THI ĐUA (NẾU ĐƯỢC BẬT) ── */}
        {data.showTrophyTop3 && top3Students.length > 0 && periodType === 'weekly' && (
          <section className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-yellow-500/10 dark:from-amber-950/30 dark:to-yellow-950/20 border border-amber-300/40 dark:border-amber-800/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                  Vinh Danh Thi Đua Tuần {selectedWeek} • Top 3 Xuất Sắc
                </h3>
              </div>
              <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold hidden sm:inline">
                Tuyên dương rèn luyện gương mẫu
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {top3Students.map((item, idx) => {
                const medals = [
                  { title: 'Quán quân thi đua', badge: '🥇 Hạng 1', color: 'from-amber-500 to-yellow-500 text-white' },
                  { title: 'Á quân thi đua', badge: '🥈 Hạng 2', color: 'from-slate-300 to-slate-400 text-slate-900' },
                  { title: 'Hạng ba thi đua', badge: '🥉 Hạng 3', color: 'from-amber-700 to-amber-800 text-white' },
                ];
                const medal = medals[idx] || medals[2];

                return (
                  <div
                    key={item.studentId}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-200/80 dark:border-amber-900/40 shadow-xs flex items-center gap-3.5"
                  >
                    <div
                      className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${medal.color} font-black text-sm flex items-center justify-center shrink-0 shadow-md`}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {medal.badge}
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {formatStudentDisplayName(item.fullName)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Điểm: <strong className="text-blue-600 dark:text-blue-400 font-bold">{item.finalScore}đ</strong> • {item.rank}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── PERIOD SELECTOR & SEARCH BAR ── */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          {/* Main Period Tabs: Tuần / Tháng / Học kỳ / Nhật ký trực tiếp */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => setPeriodType('weekly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  periodType === 'weekly'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Theo Tuần
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('monthly')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  periodType === 'monthly'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Theo Tháng
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('semester')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  periodType === 'semester'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Học Kỳ
              </button>
              {data.allowDetails && (
                <button
                  type="button"
                  onClick={() => setPeriodType('live-feed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    periodType === 'live-feed'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Nhật Ký Nề Nếp
                </button>
              )}
            </div>

            {/* Sub-selector for specific Week/Month/Semester */}
            {periodType === 'weekly' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">Chọn tuần:</label>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  {data.weeks.map((w) => (
                    <option key={w.weekNumber} value={w.weekNumber}>
                      Tuần {w.weekNumber} ({w.startDate} - {w.endDate})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periodType === 'monthly' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">Chọn tháng:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  {data.months.map((m) => (
                    <option key={m} value={m}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periodType === 'semester' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">Chọn học kỳ:</label>
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(Number(e.target.value) as 1 | 2)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  <option value={1}>Học kỳ 1</option>
                  <option value={2}>Học kỳ 2</option>
                </select>
              </div>
            )}
          </div>

          {/* Search & Filters */}
          {periodType !== 'live-feed' && (
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={
                    data.viewMode === 'lookup_only'
                      ? 'Nhập họ tên hoặc mã học sinh để tra cứu điểm…'
                      : 'Tìm kiếm học sinh theo họ tên hoặc mã số…'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Rank filter & Sort */}
              <div className="flex items-center gap-2">
                <select
                  value={filterRank}
                  onChange={(e) => setFilterRank(e.target.value)}
                  className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                >
                  <option value="all">Tất cả xếp loại</option>
                  <option value="Xuất sắc">Xuất sắc</option>
                  <option value="Tốt">Tốt</option>
                  <option value="Khá">Khá</option>
                  <option value="Đạt">Đạt</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Yếu">Cần cố gắng</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200"
                >
                  <option value="rank">Sắp xếp: Điểm cao nhất</option>
                  <option value="name">Sắp xếp: Tên A-Z</option>
                  <option value="code">Sắp xếp: Mã số học sinh</option>
                </select>
              </div>
            </div>
          )}
        </section>

        {/* ── BẢNG ĐIỂM CHI TIẾT (HOẶC NHẬT KÝ LIVE FEED) ── */}
        {periodType === 'live-feed' ? (
          /* LIVE ACTIVITY FEED */
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Dòng thời gian ghi nhận nề nếp mới nhất
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {data.recentLogs.length} bản ghi gần nhất
              </span>
            </div>

            {data.recentLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Chưa có bản ghi nề nếp nào.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentLogs.map((log) => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <strong className="font-bold text-slate-900 dark:text-white">
                          {formatStudentDisplayName(log.studentName)}
                        </strong>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.date} {log.periodOrTime && `• ${log.periodOrTime}`}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (Tuần {log.weekNumber})
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300">
                        {log.behaviorDescription}
                      </p>
                    </div>
                    <div
                      className={`px-2.5 py-1 rounded-xl font-bold text-xs shrink-0 ${
                        log.type === 'bonus'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {log.type === 'bonus' ? `+${log.totalScore}đ` : `-${log.totalScore}đ`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          /* STUDENT SCOREBOARD TABLE & CARDS */
          <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Lookup only hint if empty search */}
            {data.viewMode === 'lookup_only' && !searchQuery.trim() ? (
              <div className="p-12 text-center space-y-3">
                <Search className="h-10 w-10 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Tra cứu điểm số rèn luyện cá nhân
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Vui lòng nhập Họ và tên hoặc Mã học sinh vào ô tìm kiếm phía trên để hiển thị kết quả.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                Không tìm thấy học sinh nào phù hợp với điều kiện tìm kiếm.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3 sm:px-4 text-center w-12">Hạng</th>
                      <th className="py-3 px-3 sm:px-4">Mã HS</th>
                      <th className="py-3 px-3 sm:px-4">Họ và tên</th>
                      {periodType === 'weekly' && (
                        <>
                          <th className="py-3 px-3 sm:px-4 text-center">Chuẩn</th>
                          <th className="py-3 px-3 sm:px-4 text-center text-rose-600">Trừ</th>
                          <th className="py-3 px-3 sm:px-4 text-center text-emerald-600">Cộng</th>
                          <th className="py-3 px-3 sm:px-4 text-center font-bold">Tổng kết</th>
                          <th className="py-3 px-3 sm:px-4 text-center">Xếp loại</th>
                        </>
                      )}
                      {periodType === 'monthly' && (
                        <>
                          <th className="py-3 px-3 sm:px-4 text-center text-rose-600">Tổng trừ</th>
                          <th className="py-3 px-3 sm:px-4 text-center text-emerald-600">Tổng cộng</th>
                          <th className="py-3 px-3 sm:px-4 text-center font-bold">Điểm tháng</th>
                          <th className="py-3 px-3 sm:px-4 text-center">Xếp loại</th>
                        </>
                      )}
                      {periodType === 'semester' && (
                        <>
                          <th className="py-3 px-3 sm:px-4 text-center">Vi phạm</th>
                          <th className="py-3 px-3 sm:px-4 text-center font-bold">Điểm TB Kỳ</th>
                          <th className="py-3 px-3 sm:px-4 text-center">Xếp loại</th>
                        </>
                      )}
                      {data.allowDetails && (
                        <th className="py-3 px-3 sm:px-4 text-center w-20">Chi tiết</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudents.map((item, idx) => {
                      const weekly = item.weekly;
                      const monthly = item.monthly;
                      const semester = item.semester;

                      const rank =
                        periodType === 'weekly'
                          ? weekly?.rank
                          : periodType === 'monthly'
                          ? monthly?.rank
                          : semester?.finalRank;

                      const finalScore =
                        periodType === 'weekly'
                          ? weekly?.finalScore
                          : periodType === 'monthly'
                          ? monthly?.finalScore
                          : semester?.averageScore;

                      return (
                        <tr
                          key={item.student.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                        >
                          {/* Thứ hạng */}
                          <td className="py-3 px-3 sm:px-4 text-center font-bold">
                            {idx === 0 ? (
                              <span className="inline-flex h-6 w-6 rounded-full bg-amber-500 text-white items-center justify-center text-xs shadow-xs">
                                1
                              </span>
                            ) : idx === 1 ? (
                              <span className="inline-flex h-6 w-6 rounded-full bg-slate-400 text-white items-center justify-center text-xs shadow-xs">
                                2
                              </span>
                            ) : idx === 2 ? (
                              <span className="inline-flex h-6 w-6 rounded-full bg-amber-700 text-white items-center justify-center text-xs shadow-xs">
                                3
                              </span>
                            ) : (
                              <span className="text-slate-400">{idx + 1}</span>
                            )}
                          </td>

                          {/* Mã HS */}
                          <td className="py-3 px-3 sm:px-4 font-mono text-slate-500 text-[11px]">
                            {item.student.studentCode}
                          </td>

                          {/* Họ và tên */}
                          <td className="py-3 px-3 sm:px-4 font-bold text-slate-900 dark:text-white">
                            {formatStudentDisplayName(item.student.fullName)}
                          </td>

                          {/* Weekly Columns */}
                          {periodType === 'weekly' && (
                            <>
                              <td className="py-3 px-3 sm:px-4 text-center text-slate-400 font-mono">
                                {data.baseScore}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-center text-rose-600 font-bold font-mono">
                                {weekly?.totalDeduct ? `-${weekly.totalDeduct}` : '0'}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-center text-emerald-600 font-bold font-mono">
                                {weekly?.totalBonus ? `+${weekly.totalBonus}` : '0'}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-center font-black text-blue-600 dark:text-blue-400 text-sm font-mono">
                                {weekly?.finalScore ?? data.baseScore}đ
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getRankBadgeClass(
                                    rank || 'Đạt'
                                  )}`}
                                >
                                  {rank || 'Đạt'}
                                </span>
                              </td>
                            </>
                          )}

                          {/* Monthly Columns */}
                          {periodType === 'monthly' && (
                            <>
                              <td className="py-3 px-3 sm:px-4 text-center text-rose-600 font-bold font-mono">
                                {monthly?.totalDeduct ? `-${monthly.totalDeduct}` : '0'}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-center text-emerald-600 font-bold font-mono">
                                {monthly?.totalBonus ? `+${monthly.totalBonus}` : '0'}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-center font-black text-blue-600 dark:text-blue-400 text-sm font-mono">
                                {monthly?.finalScore ?? data.baseScore}đ
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getRankBadgeClass(
                                    rank || 'Đạt'
                                  )}`}
                                >
                                  {rank || 'Đạt'}
                                </span>
                              </td>
                            </>
                          )}

                          {/* Semester Columns */}
                          {periodType === 'semester' && (
                            <>
                              <td className="py-3 px-3 sm:px-4 text-center text-slate-600 font-mono">
                                {semester?.totalViolations ?? 0}
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-center font-black text-blue-600 dark:text-blue-400 text-sm font-mono">
                                {semester?.averageScore ?? data.baseScore}đ
                              </td>
                              <td className="py-3 px-3 sm:px-4 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getRankBadgeClass(
                                    rank || 'Đạt'
                                  )}`}
                                >
                                  {rank || 'Đạt'}
                                </span>
                              </td>
                            </>
                          )}

                          {/* Nút Xem chi tiết */}
                          {data.allowDetails && (
                            <td className="py-3 px-3 sm:px-4 text-center">
                              <button
                                type="button"
                                onClick={() => setSelectedStudentDetail(item.student)}
                                className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 font-semibold text-[11px] transition cursor-pointer"
                              >
                                Xem
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── FOOTER HÀNH CHÍNH ── */}
        <footer className="text-center text-xs text-slate-400 pt-8 space-y-1">
          <p className="font-semibold text-slate-500 dark:text-slate-400">
            {data.schoolName} • Hệ thống Quản lý Nề nếp & Thi đua Học sinh
          </p>
          <p className="text-[11px]">
            Dữ liệu phát trực tiếp thời gian thực • Được quản lý bởi GVCN: {data.homeroomTeacher}
          </p>
        </footer>
      </main>

      {/* ── MODAL CHI TIẾT LỊCH SỬ NỀ NẾP CỦA HỌC SINH ── */}
      {selectedStudentDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedStudentDetail(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-blue-600 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">
                  Lịch sử nề nếp: {formatStudentDisplayName(selectedStudentDetail.fullName)}
                </h4>
                <p className="text-xs text-blue-100">
                  Mã HS: {selectedStudentDetail.studentCode} • Lớp {data.className}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="p-1.5 rounded-xl hover:bg-white/20 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
              {studentLogsForDetail.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  Học sinh chưa có ghi nhận vi phạm hoặc điểm thưởng nào gần đây.
                </div>
              ) : (
                studentLogsForDetail.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-2.5 text-xs"
                  >
                    <div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.date} {log.periodOrTime && `• ${log.periodOrTime}`} • Tuần {log.weekNumber}
                      </span>
                      <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                        {log.behaviorDescription}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-lg font-bold shrink-0 text-xs ${
                        log.type === 'bonus'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-rose-50 text-rose-600 border border-rose-200'
                      }`}
                    >
                      {log.type === 'bonus' ? `+${log.totalScore}đ` : `-${log.totalScore}đ`}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setSelectedStudentDetail(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
