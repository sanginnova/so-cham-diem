import { StudentWeeklySummary, StudentMonthlySummary, StudentSemesterSummary, RankLevel } from './index';

export type PublicViewMode = 'full' | 'ranked_anonymous' | 'lookup_only';

export interface PublicScoreboardSettings {
  isPublic: boolean;
  viewMode: PublicViewMode;
  allowDetails: boolean;
  requirePin: boolean;
  pinCode?: string;
  customNotice?: string;
  showTrophyTop3: boolean;
  allowSearch: boolean;
}

export interface PublicScoreboardStudentRow {
  id: string;
  studentCode: string;
  fullName: string;
  gender?: 'Nam' | 'Nữ';
  dateOfBirth?: string;
}

export interface PublicScoreboardRecentLog {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  month: number;
  weekNumber: number;
  type: 'deduct' | 'bonus';
  behaviorDescription: string;
  scorePerUnit: number;
  count: number;
  totalScore: number;
  periodOrTime?: string;
}

export interface PublicScoreboardPayload {
  classId: string;
  className: string;
  schoolYear: string;
  homeroomTeacher: string;
  teacherEmail?: string;
  teacherPhone?: string;
  schoolName?: string;
  baseScore: number;
  isPublic: boolean;
  viewMode: PublicViewMode;
  allowDetails: boolean;
  requirePin: boolean;
  pinCode?: string;
  customNotice?: string;
  showTrophyTop3: boolean;
  allowSearch: boolean;
  updatedAt: string;
  updatedBy?: string;
  currentWeek: number;
  weeks: {
    weekNumber: number;
    startDate: string;
    endDate: string;
    month: number;
    title: string;
  }[];
  months: number[];
  students: PublicScoreboardStudentRow[];
  weeklySummaries: Record<number, StudentWeeklySummary[]>;
  monthlySummaries: Record<number, StudentMonthlySummary[]>;
  semesterSummaries: Record<number, StudentSemesterSummary[]>;
  recentLogs: PublicScoreboardRecentLog[];
  stats: {
    studentCount: number;
    averageWeeklyScore: number;
    topRankCount: number;
    violationCount: number;
    bonusCount: number;
  };
  teacherId: string;
}
