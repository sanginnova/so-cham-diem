import { Timestamp } from 'firebase/firestore';

export type UserRoleV2 =
  | 'owner'
  | 'admin'
  | 'inspector'
  | 'manager'
  | 'teacher'
  | 'recorder';

export type UserStatusV2 = 'active' | 'disabled';

export interface UserProfileV2 {
  uid: string;
  email: string;
  displayName: string;
  role: UserRoleV2;
  schoolId: string;
  assignedClassIds?: string[];
  departmentId?: string;
  phoneNumber?: string;
  status: UserStatusV2;
  createdAt: string | Timestamp;
  updatedAt: string | Timestamp;
}

export interface School {
  id: string;
  code: string;
  name: string;
  shortName: string;
  address?: string;
  phone?: string;
  email?: string;
  currentAcademicYearId?: string;
  active: boolean;
  createdAt: string | Timestamp;
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  code: string; // e.g. "2025-2026"
  name: string; // e.g. "Năm học 2025–2026"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'active' | 'archived';
  createdAt: string | Timestamp;
}

export interface Semester {
  id: string;
  schoolId: string;
  academicYearId: string;
  semesterNumber: 1 | 2;
  name: string; // e.g. "Học kỳ 1"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  weeksCount: number;
}

export interface SchoolClassV2 {
  id: string;
  schoolId: string;
  className: string;
  grade?: string;
  academicYearId: string;
  homeroomTeacherIds: string[];
  departmentId?: string;
  status: 'active' | 'archived';
  studentCount?: number;
  createdAt: string | Timestamp;
}

export type StudentStatusV2 = 'active' | 'transferred' | 'graduated' | 'dropped';

export interface StudentV2 {
  id: string;
  studentCode: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender?: 'Nam' | 'Nữ';
  birthDate?: string;
  parentPhone?: string;
  parentLookupToken?: string;
  status: StudentStatusV2;
  schoolId: string;
  createdAt: string | Timestamp;
  updatedAt: string | Timestamp;
}

export interface EnrollmentV2 {
  id: string;
  studentId: string;
  classId: string;
  academicYearId: string;
  semesterId?: string;
  status: 'active' | 'transferred' | 'completed';
  enrolledAt: string | Timestamp;
  endedAt?: string | Timestamp;
}

export type BehaviorGroupV2 =
  | 'attendance'
  | 'uniform'
  | 'study'
  | 'attitude'
  | 'dormitory'
  | 'safety'
  | 'activity'
  | 'other';

export type BehaviorTypeV2 = 'deduct' | 'bonus';

export interface BehaviorCategoryV2 {
  id: string;
  code: string;
  name: string;
  group: BehaviorGroupV2;
  type: BehaviorTypeV2;
  points: number;
  scope: 'school' | 'class';
  classId?: string;
  active: boolean;
  createdAt: string | Timestamp;
}

export type DisciplineLogSourceV2 =
  | 'teacher'
  | 'manager'
  | 'recorder'
  | 'admin'
  | 'import';

export type DisciplineLogStatusV2 = 'active' | 'voided';

export interface DisciplineLogV2 {
  id: string;
  schoolId: string;
  academicYearId: string;
  semesterId: string;
  classId: string;
  studentId: string;
  categoryId: string;
  categoryNameSnapshot: string;
  type: BehaviorTypeV2;
  points: number;
  eventDate: string; // YYYY-MM-DD
  lessonPeriod?: string;
  notes?: string;
  reporterId: string;
  reporterName: string;
  source: DisciplineLogSourceV2;
  status: DisciplineLogStatusV2;
  voidReason?: string;
  voidedAt?: string | Timestamp;
  voidedBy?: string;
  createdAt: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface WeeklySnapshotV2 {
  id: string;
  schoolId: string;
  academicYearId: string;
  semesterId: string;
  classId: string;
  studentId: string;
  weekNumber: number;
  startingScore: number;
  deductionPoints: number;
  bonusPoints: number;
  finalScore: number;
  classification: string;
  generatedAt: string | Timestamp;
  generatedBy: string;
  locked: boolean;
}

export interface MonthlySummaryV2 {
  id: string;
  schoolId: string;
  academicYearId: string;
  semesterId: string;
  classId: string;
  studentId: string;
  monthNumber: number;
  averageScore: number;
  totalViolations: number;
  totalBonuses: number;
  classification: string;
  generatedAt: string | Timestamp;
  locked: boolean;
}

export interface SemesterSummaryV2 {
  id: string;
  schoolId: string;
  academicYearId: string;
  semesterId: string;
  classId: string;
  studentId: string;
  finalScore: number;
  classification: string;
  conductRank: string;
  generatedAt: string | Timestamp;
  locked: boolean;
}

export type PeriodTypeV2 = 'week' | 'month' | 'semester';

export interface PeriodLockV2 {
  id: string;
  schoolId: string;
  academicYearId: string;
  semesterId: string;
  classId: string; // "all" for whole school, or specific classId
  periodType: PeriodTypeV2;
  periodNumber: number;
  status: 'open' | 'locked';
  lockedAt?: string | Timestamp;
  lockedBy?: string;
  reason?: string;
}

export interface ParentReportV2 {
  id: string;
  schoolId: string;
  academicYearId: string;
  semesterId: string;
  classId: string;
  studentId: string;
  weekNumber: number;
  content: string;
  sentStatus: 'draft' | 'ready' | 'sent';
  sentAt?: string | Timestamp;
  createdAt: string | Timestamp;
}

export interface AuditLogV2 {
  id: string;
  schoolId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  createdAt: string | Timestamp;
}

export interface SystemConfigV2 {
  id: string;
  schoolId: string;
  defaultWeeklyScore: number;
  thresholds: {
    excellent: number; // 9.5
    good: number; // 8.0
    average: number; // 6.5
    weak: number; // 5.0
  };
  allowTeacherCustomCategories: boolean;
  parentPortalEnabled: boolean;
  bulkLoggingEnabled: boolean;
  maxBulkStudents: number;
  currentAcademicYearId: string;
  currentSemesterId: string;
  updatedAt: string | Timestamp;
  updatedBy: string;
}
