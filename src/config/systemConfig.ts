import { SystemConfigV2 } from '../types/v2';

export const DEFAULT_SCHOOL_ID = 'school_cdnghe01_bqp';
export const DEFAULT_ACADEMIC_YEAR_ID = 'ay_2025_2026';
export const DEFAULT_SEMESTER_ID = 'sem_1_2025_2026';

export const DEFAULT_SYSTEM_CONFIG: SystemConfigV2 = {
  id: 'config_default',
  schoolId: DEFAULT_SCHOOL_ID,
  defaultWeeklyScore: 10,
  thresholds: {
    excellent: 9.5, // Xuất sắc: >= 9.5
    good: 8.0,      // Tốt: 8.0 - 9.4
    average: 6.5,   // Khá/Trung bình: 6.5 - 7.9
    weak: 5.0,      // Yếu: < 5.0
  },
  allowTeacherCustomCategories: true,
  parentPortalEnabled: true,
  bulkLoggingEnabled: true,
  maxBulkStudents: 50,
  currentAcademicYearId: DEFAULT_ACADEMIC_YEAR_ID,
  currentSemesterId: DEFAULT_SEMESTER_ID,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export const DEFAULT_SCHOOL_INFO = {
  id: DEFAULT_SCHOOL_ID,
  code: 'CDNGHE01_BQP',
  name: 'Trường Cao Đẳng Nghề Số 1 – Bộ Quốc Phòng',
  shortName: 'Trường CĐ Nghề 01 - BQP',
  address: 'Số 233 Quang Trung, Thịnh Đán, TP. Thái Nguyên',
  phone: '0208.3846.344',
  email: 'cdnghe01bqp@gmail.com',
};
