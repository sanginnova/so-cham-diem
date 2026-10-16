import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  ClassConfig,
  Student,
  DisciplineLog,
  StudentWeeklySummary,
  StudentMonthlySummary,
  StudentSemesterSummary,
} from '../types';
import {
  PublicScoreboardPayload,
  PublicScoreboardSettings,
  PublicScoreboardRecentLog,
} from '../types/publicScoreboard';
import { currentSchoolWeek } from '../lib/weeklyPeriod';

export const DEFAULT_PUBLIC_SETTINGS: PublicScoreboardSettings = {
  isPublic: true,
  viewMode: 'full',
  allowDetails: true,
  requirePin: false,
  pinCode: '',
  customNotice: 'Bảng điểm nề nếp thi đua được cập nhật trực tiếp theo thời gian thực từ giáo viên chủ nhiệm.',
  showTrophyTop3: true,
  allowSearch: true,
};

/**
 * Rút gọn object StudentWeeklySummary để tiết kiệm dung lượng Firestore
 */
function compactWeeklySummary(item: StudentWeeklySummary): StudentWeeklySummary {
  const res: StudentWeeklySummary = {
    studentId: item.studentId,
    studentCode: item.studentCode,
    fullName: item.fullName,
    status: item.status,
    violationCount: item.violationCount,
    bonusCount: item.bonusCount,
    totalDeduct: item.totalDeduct,
    totalBonus: item.totalBonus,
    excusedAbsenceCount: item.excusedAbsenceCount || 0,
    unexcusedAbsenceCount: item.unexcusedAbsenceCount || 0,
    truancyCount: item.truancyCount || 0,
    finalScore: item.finalScore,
    rank: item.rank,
    notes: item.notes || '',
  };
  if (item.achievementBonus) res.achievementBonus = item.achievementBonus;
  if (item.achievementCount) res.achievementCount = item.achievementCount;
  if (item.achievements && item.achievements.length > 0) res.achievements = item.achievements;
  return res;
}

/**
 * Rút gọn object StudentMonthlySummary
 */
function compactMonthlySummary(item: StudentMonthlySummary): StudentMonthlySummary {
  const res: StudentMonthlySummary = {
    studentId: item.studentId,
    studentCode: item.studentCode,
    fullName: item.fullName,
    status: item.status,
    weekDeductions: {},
    totalDeduct: item.totalDeduct,
    totalBonus: item.totalBonus,
    excusedAbsenceCount: item.excusedAbsenceCount || 0,
    unexcusedAbsenceCount: item.unexcusedAbsenceCount || 0,
    truancyCount: item.truancyCount || 0,
    finalScore: item.finalScore,
    rank: item.rank,
    violationCount: item.violationCount,
    bonusCount: item.bonusCount,
    notes: item.notes || '',
  };
  if (item.monthlyBonus) res.monthlyBonus = item.monthlyBonus;
  if (item.weeklyBonus) res.weeklyBonus = item.weeklyBonus;
  if (item.achievementBonus) res.achievementBonus = item.achievementBonus;
  if (item.achievements && item.achievements.length > 0) res.achievements = item.achievements;
  return res;
}

/**
 * Xây dựng payload đầy đủ cho bảng điểm công khai trực tuyến (được tối ưu dung lượng < 1MB cho Firestore)
 */
export function buildPublicScoreboardPayload(
  classConfig: ClassConfig,
  students: Student[],
  disciplineLogs: DisciplineLog[],
  settings: PublicScoreboardSettings,
  getWeeklySummary: (weekNumber: number) => StudentWeeklySummary[],
  getMonthlySummary: (month: number) => StudentMonthlySummary[],
  getSemesterSummary: (semester: 1 | 2) => StudentSemesterSummary[],
  updatedBy?: string
): PublicScoreboardPayload {
  const currentWeek = currentSchoolWeek(classConfig.weeks)?.weekNumber ?? 1;

  // 1. Xác định các tuần thực tế cần lưu (các tuần có log hoặc từ tuần 1 đến tuần hiện tại + 1)
  // Tránh lưu trước 20-30 tuần tương lai trống rỗng gây vượt hạn mức 1MB của Firestore
  const logWeekNumbers = new Set(disciplineLogs.map((l) => l.weekNumber));
  const activeWeekNumbers = new Set<number>();
  for (const week of classConfig.weeks) {
    if (week.weekNumber <= currentWeek + 1 || logWeekNumbers.has(week.weekNumber)) {
      activeWeekNumbers.add(week.weekNumber);
    }
  }

  // 2. Lập bản đồ tổng hợp các tuần hoạt động
  const weeklySummaries: Record<number, StudentWeeklySummary[]> = {};
  for (const weekNum of activeWeekNumbers) {
    try {
      weeklySummaries[weekNum] = getWeeklySummary(weekNum).map(compactWeeklySummary);
    } catch {
      weeklySummaries[weekNum] = [];
    }
  }

  // 3. Lập bản đồ tổng hợp các tháng (chỉ các tháng có tuần hoạt động hoặc có log)
  const activeMonths = new Set<number>();
  for (const week of classConfig.weeks) {
    if (activeWeekNumbers.has(week.weekNumber)) {
      activeMonths.add(week.month);
    }
  }
  disciplineLogs.forEach((l) => {
    if (l.month) activeMonths.add(l.month);
  });

  const monthlySummaries: Record<number, StudentMonthlySummary[]> = {};
  for (const month of classConfig.months) {
    if (activeMonths.has(month)) {
      try {
        monthlySummaries[month] = getMonthlySummary(month).map(compactMonthlySummary);
      } catch {
        monthlySummaries[month] = [];
      }
    }
  }

  // 4. Lập bản đồ tổng hợp học kỳ 1 & 2
  const semesterSummaries: Record<number, StudentSemesterSummary[]> = {};
  try {
    semesterSummaries[1] = getSemesterSummary(1);
  } catch {
    semesterSummaries[1] = [];
  }
  if (currentWeek >= 19 || Array.from(logWeekNumbers).some((w) => w >= 19)) {
    try {
      semesterSummaries[2] = getSemesterSummary(2);
    } catch {
      semesterSummaries[2] = [];
    }
  }

  // 5. Nhật ký mới nhất (giới hạn 35 bản ghi gần nhất để tối ưu dung lượng)
  const sortedLogs = [...disciplineLogs].sort((a, b) => {
    return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
  });

  const recentLogs: PublicScoreboardRecentLog[] = sortedLogs.slice(0, 35).map((log) => ({
    id: log.id,
    studentId: log.studentId,
    studentName: log.studentName,
    date: log.date,
    month: log.month,
    weekNumber: log.weekNumber,
    type: log.type,
    behaviorDescription: log.behaviorDescription,
    scorePerUnit: log.scorePerUnit,
    count: log.count,
    totalScore: log.totalScore,
    periodOrTime: log.periodOrTime || '',
  }));

  // Thống kê sơ bộ tuần hiện tại
  const currentWeekList = weeklySummaries[currentWeek] || [];
  const totalScoreSum = currentWeekList.reduce((sum, s) => sum + s.finalScore, 0);
  const avgScore =
    currentWeekList.length > 0
      ? Number((totalScoreSum / currentWeekList.length).toFixed(2))
      : classConfig.baseScore;
  const topRankCount = currentWeekList.filter(
    (s) => s.rank === 'Xuất sắc' || s.rank === 'Tốt'
  ).length;
  const violationCount = disciplineLogs.filter(
    (l) => l.type === 'deduct' && l.weekNumber === currentWeek
  ).length;
  const bonusCount = disciplineLogs.filter(
    (l) => l.type === 'bonus' && l.weekNumber === currentWeek
  ).length;

  const payload: PublicScoreboardPayload = {
    classId: classConfig.id,
    className: classConfig.className,
    schoolYear: classConfig.schoolYear,
    homeroomTeacher: classConfig.homeroomTeacher,
    teacherEmail: classConfig.teacherEmail,
    teacherPhone: classConfig.teacherPhone,
    schoolName: classConfig.schoolName || 'Trường Cao đẳng Nghề số 1 - BQP',
    baseScore: classConfig.baseScore,
    isPublic: settings.isPublic,
    viewMode: settings.viewMode,
    allowDetails: settings.allowDetails,
    requirePin: settings.requirePin,
    pinCode: settings.pinCode,
    customNotice: settings.customNotice,
    showTrophyTop3: settings.showTrophyTop3,
    allowSearch: settings.allowSearch,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy || classConfig.homeroomTeacher,
    currentWeek,
    weeks: classConfig.weeks.map((w) => ({
      weekNumber: w.weekNumber,
      startDate: w.startDate,
      endDate: w.endDate,
      month: w.month,
      title: w.title,
    })),
    months: classConfig.months,
    students: students.map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      gender: s.gender,
      dateOfBirth: s.dateOfBirth,
    })),
    weeklySummaries,
    monthlySummaries,
    semesterSummaries,
    recentLogs,
    stats: {
      studentCount: students.length,
      averageWeeklyScore: avgScore,
      topRankCount,
      violationCount,
      bonusCount,
    },
    teacherId: classConfig.teacherId,
  };

  // 6. Kiểm tra kích thước khẩn cấp: nếu payload vẫn vượt 950KB, tự động tinh giản số tuần cũ
  try {
    const jsonStr = JSON.stringify(payload);
    const byteLength = new Blob([jsonStr]).size;
    if (byteLength > 950000) {
      // Giữ tối đa 12 tuần gần nhất
      const sortedActiveWeeks = Array.from(activeWeekNumbers).sort((a, b) => b - a);
      const keepWeeks = new Set(sortedActiveWeeks.slice(0, 12));
      for (const w of Object.keys(payload.weeklySummaries)) {
        if (!keepWeeks.has(Number(w))) {
          delete payload.weeklySummaries[Number(w)];
        }
      }
      payload.recentLogs = payload.recentLogs.slice(0, 20);
    }
  } catch {
    // Không làm gián đoạn nếu môi trường không có Blob
  }

  return payload;
}

/**
 * Lưu/Cập nhật bảng điểm công khai lên Firestore
 */
export async function publishPublicScoreboard(
  classConfig: ClassConfig,
  students: Student[],
  disciplineLogs: DisciplineLog[],
  settings: PublicScoreboardSettings,
  getWeeklySummary: (weekNumber: number) => StudentWeeklySummary[],
  getMonthlySummary: (month: number) => StudentMonthlySummary[],
  getSemesterSummary: (semester: 1 | 2) => StudentSemesterSummary[],
  updatedBy?: string
): Promise<PublicScoreboardPayload> {
  const payload = buildPublicScoreboardPayload(
    classConfig,
    students,
    disciplineLogs,
    settings,
    getWeeklySummary,
    getMonthlySummary,
    getSemesterSummary,
    updatedBy
  );

  const docRef = doc(db, 'publicScoreboards', classConfig.id);
  await setDoc(docRef, payload, { merge: true });
  return payload;
}

/**
 * Cập nhật trạng thái bật/tắt chia sẻ công khai
 */
export async function togglePublicScoreboardLive(classId: string, isPublic: boolean): Promise<void> {
  const docRef = doc(db, 'publicScoreboards', classId);
  await updateDoc(docRef, {
    isPublic,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Lấy dữ liệu bảng điểm công khai 1 lần
 */
export async function fetchPublicScoreboard(classId: string): Promise<PublicScoreboardPayload | null> {
  const docRef = doc(db, 'publicScoreboards', classId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as PublicScoreboardPayload;
}

/**
 * LẮNG NGHE THỜI GIAN THỰC (Real-time Listener) bảng điểm công khai
 * Bất cứ khi nào giáo viên chấm điểm hoặc sửa điểm, Firestore sẽ tự động đẩy dữ liệu mới về!
 */
export function subscribePublicScoreboard(
  classId: string,
  onData: (data: PublicScoreboardPayload | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const docRef = doc(db, 'publicScoreboards', classId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
      } else {
        onData(snap.data() as PublicScoreboardPayload);
      }
    },
    (error) => {
      console.warn('Lỗi lắng nghe bảng điểm công khai realtime:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Sinh link xem điểm công khai hoàn chỉnh
 */
export function generatePublicScoreboardUrl(classId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  return `${origin}${pathname}?live=${encodeURIComponent(classId)}`;
}
