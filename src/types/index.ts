export type BehaviorType = 'deduct' | 'bonus';

export type StudentStatus = 'active' | 'inactive';

export type RankLevel = 'Xuất sắc' | 'Tốt' | 'Khá' | 'Đạt' | 'Không đạt' | 'Trung bình' | 'Yếu';

export type UserRole = 'guest' | 'teacher' | 'admin' | 'owner' | 'monitor';

export interface UserAccount {
  uid: string;
  email: string;
  username?: string;
  teacherId?: string; // Immutable owner of a monitor account's data scope.
  classConfigId?: string;
  displayName: string;
  role: UserRole;
  assignedClassId: string;
  assignedClassName: string;
  department?: string; // Khoa / Bộ môn
  phone?: string;
  password?: string;
  authProvider?: 'google' | 'password' | 'quick';
  isActive: boolean;
  lastLoginAt?: string;
  avatarUrl?: string;
  studentId?: string; // Link to student ID if monitor
  permissions?: {
    canAddViolations: boolean;
    canAddBonuses: boolean;
    canViewScores: boolean;
  };
}

export interface SchoolClass {
  id: string;
  className: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  department: string;
  schoolYear: string;
  studentCount: number;
  averageScore: number;
  topRankCount: number;
  violationCount: number;
}

export interface PeriodLockStatus {
  scoreVersion?: 2;
  scores?: Record<string, number>;
  monthlyScores?: Record<string, Record<string, number>>;
  classId?: string;
  periodType: 'week' | 'month' | 'semester';
  periodValue: number; // weekNumber (1-35) or month (1-12) or semester (1-2)
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  reason?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  unlockReason?: string;
}

export interface Student {
  id: string;
  studentCode: string;
  lastName: string;
  firstName: string;
  fullName: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: 'Nam' | 'Nữ';
  ethnicity?: string;
  status: StudentStatus;
  teacherId: string;
  classId: string;
  parentName?: string;
  parentPhone?: string;
  parentLookupToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BehaviorCategory {
  classId?: string;
  id: string;
  code: string;
  name: string;
  type: BehaviorType;
  defaultScore: number;
  group?: string; // e.g., 'Chuyên cần - Giờ giấc', 'Học tập - Bài vở', 'Kỷ luật - Tác phong', 'Đạo đức - Ứng xử', 'Tài sản - Vệ sinh'
  basisOrRegulation?: string;
  keywords?: string[];
  isActive: boolean;
  isCustom?: boolean;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export type AchievementPeriod = 'weekly' | 'monthly';

export interface AchievementBonusRule {
  id: string;
  code: string; // e.g., 'TT_W01', 'TT_M01'
  title: string; // e.g., 'Không vi phạm lỗi nào trong tuần'
  period: AchievementPeriod;
  bonusScore: number; // e.g. 1.0, 2.0
  description?: string;
  isAutoEligible?: boolean; // Tự động xét duyệt nếu đủ điều kiện (vd: 0 vi phạm)
  isActive: boolean;
  isCustom?: boolean;
}

export interface EditHistoryEntry {
  timestamp: string;
  editorName: string;
  action: 'create' | 'update' | 'delete';
  previousValue?: string;
  newValue?: string;
}

export interface DisciplineLog {
  id: string;
  date: string; // YYYY-MM-DD
  month: number; // 1 - 12
  weekNumber: number; // 1 - 35
  studentId: string;
  studentCode: string;
  studentName: string;
  behaviorCode: string;
  behaviorDescription: string;
  type: BehaviorType;
  scorePerUnit: number; // Positive number, e.g. 1, 0.5, 3
  count: number; // default 1
  totalScore: number; // scorePerUnit * count (represented as positive in record, math applies deduct/bonus)
  periodOrTime?: string; // e.g., 'Tiết 2', 'Giờ ra chơi', 'Sinh hoạt đầu tuần'
  reporter?: string; // e.g., 'Cán sự lớp', 'GVCN', 'GV Bộ môn Toán'
  basisOrRegulation?: string; // Nội quy trường/lớp
  note?: string;
  teacherId: string;
  classId: string;
  createdAt: string;
  updatedAt: string;
  history?: EditHistoryEntry[];
  createdBy?: string;
}

export interface SchoolWeek {
  weekNumber: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  semester: 1 | 2;
  month: number;
  title: string;
}

export interface RankThresholds {
  xuatSac: number; // Mặc định 12 (Từ 12đ trở lên)
  tot: number;     // Mặc định 8 (Từ 8đ đến dưới xuatSac)
  kha: number;     // Mặc định 7 (Từ 7đ đến dưới tot)
  dat: number;     // Mặc định 5 (Từ 5đ đến dưới kha)
  xuatSacNote?: string; // Mặc định 'Bốc thăm phần thưởng'
  khongDatNote?: string; // Mặc định 'Bốc thăm hình phạt'
}

export interface ClassConfig {
  monthlyAverageFromMonth?: number;
  scopeVersion?: 2;
  classDirectoryId?: string;
  id: string;
  className: string;
  schoolYear: string;
  homeroomTeacher: string;
  baseScore: number; // 10
  minScore: number; // 0
  maxScore: number; // Điểm trần tối đa (mặc định 100, cho phép > 10)
  months: number[]; // [9, 10, 11, 12, 1, 2, 3, 4, 5]
  semester1Months: number[]; // [9, 10, 11, 12, 1]
  semester2Months: number[]; // [2, 3, 4, 5]
  weeks: SchoolWeek[];
  achievementBonusRules?: AchievementBonusRule[];
  rankThresholds?: RankThresholds; // Tiêu chuẩn ngưỡng điểm xếp loại rèn luyện thi đua
  teacherId: string;
  updatedAt: string;

  // Rich Teacher Information
  teacherPhone?: string; // Số điện thoại liên hệ của GVCN
  teacherEmail?: string; // Email liên hệ của GVCN
  teachingSubject?: string; // Môn giảng dạy chính
  defaultTeacherNote?: string; // Lời dặn dò / ghi chú mặc định gửi phụ huynh

  // Rich Class Information
  schoolName?: string; // Tên trường (vd: THPT Chuyên, THPT Lê Quý Đôn)
  grade?: string; // Khối lớp (vd: Khối 10, Khối 11, Khối 12)
  roomNumber?: string; // Phòng học (vd: Phòng 204 - Nhà A)

  // Ban cán sự lớp
  classPresident?: string; // Lớp trưởng
  academicVicePresident?: string; // Lớp phó học tập
  disciplineVicePresident?: string; // Lớp phó nề nếp / kỷ luật
  youthUnionSecretary?: string; // Bí thư chi đoàn

  // Quy chuẩn thời khóa biểu (2 buổi/ngày, mỗi buổi 5 tiết)
  dailySessions?: number; // Mặc định 2 (Sáng & Chiều)
  periodsPerSession?: number; // Mặc định 5 (5 tiết/buổi)
  totalPeriodsPerDay?: number; // Mặc định 10 (10 tiết/ngày)
}

export interface StudentWeeklySummary {
  studentId: string;
  studentCode: string;
  fullName: string;
  dateOfBirth?: string;
  status: StudentStatus;
  violationCount: number;
  bonusCount: number;
  totalDeduct: number;
  totalBonus: number;
  excusedAbsenceCount: number;   // Số buổi nghỉ có phép (P)
  unexcusedAbsenceCount: number; // Số buổi nghỉ không phép (KP)
  truancyCount: number;          // Số lần bỏ tiết / trốn tiết (BT)
  achievementBonus?: number;
  achievementCount?: number;
  achievements?: string[];
  finalScore: number;
  rank: RankLevel;
  notes: string;
}

export interface StudentMonthlySummary {
  monthlyBonus?: number;
  weeklyBonus?: number;
  studentId: string;
  studentCode: string;
  fullName: string;
  status: StudentStatus;
  weekDeductions: Record<number, number>; // weekNumber -> deduct amount
  totalDeduct: number;
  totalBonus: number;
  excusedAbsenceCount: number;   // Số buổi nghỉ có phép (P)
  unexcusedAbsenceCount: number; // Số buổi nghỉ không phép (KP)
  truancyCount: number;          // Số lần bỏ tiết / trốn tiết (BT)
  achievementBonus?: number;
  achievementCount?: number;
  achievements?: string[];
  finalScore: number;
  rank: RankLevel;
  violationCount: number;
  bonusCount: number;
  notes: string;
}

export interface StudentSemesterSummary {
  studentId: string;
  studentCode: string;
  fullName: string;
  status: StudentStatus;
  monthlyScores: Record<number, number | null>; // month -> finalScore
  averageScore: number;
  finalRank: RankLevel;
  totalViolations: number;
  totalDeduct: number;
  totalBonus: number;
  excusedAbsenceCount: number;   // Số buổi nghỉ có phép (P)
  unexcusedAbsenceCount: number; // Số buổi nghỉ không phép (KP)
  truancyCount: number;          // Số lần bỏ tiết / trốn tiết (BT)
}
