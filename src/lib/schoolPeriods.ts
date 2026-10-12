/**
 * Quản lý thời khóa biểu 2 buổi / ngày, mỗi buổi 5 tiết
 * Trường Cao đẳng nghề số 1 - BQP & Khối THPT
 */

export interface SchoolPeriodOption {
  value: string;
  label: string;
  shortLabel: string;
  session: 'morning' | 'afternoon' | 'other';
  periodNumber?: number;
}

export const MORNING_PERIODS: SchoolPeriodOption[] = [
  { value: 'Tiết 1', label: 'Tiết 1 (Sáng)', shortLabel: 'T1', session: 'morning', periodNumber: 1 },
  { value: 'Tiết 2', label: 'Tiết 2 (Sáng)', shortLabel: 'T2', session: 'morning', periodNumber: 2 },
  { value: 'Tiết 3', label: 'Tiết 3 (Sáng)', shortLabel: 'T3', session: 'morning', periodNumber: 3 },
  { value: 'Tiết 4', label: 'Tiết 4 (Sáng)', shortLabel: 'T4', session: 'morning', periodNumber: 4 },
  { value: 'Tiết 5', label: 'Tiết 5 (Sáng)', shortLabel: 'T5', session: 'morning', periodNumber: 5 },
  { value: 'Đầu giờ sáng', label: 'Đầu giờ sáng (Truy bài)', shortLabel: 'ĐG Sáng', session: 'morning' },
  { value: 'Giờ ra chơi sáng', label: 'Giờ ra chơi sáng', shortLabel: 'RC Sáng', session: 'morning' },
  { value: 'Thực hành xưởng (Sáng)', label: 'Thực hành xưởng (Sáng)', shortLabel: 'Xưởng S', session: 'morning' },
];

export const AFTERNOON_PERIODS: SchoolPeriodOption[] = [
  { value: 'Tiết 6 (Tiết 1 Chiều)', label: 'Tiết 6 (Tiết 1 Chiều)', shortLabel: 'T6', session: 'afternoon', periodNumber: 6 },
  { value: 'Tiết 7 (Tiết 2 Chiều)', label: 'Tiết 7 (Tiết 2 Chiều)', shortLabel: 'T7', session: 'afternoon', periodNumber: 7 },
  { value: 'Tiết 8 (Tiết 3 Chiều)', label: 'Tiết 8 (Tiết 3 Chiều)', shortLabel: 'T8', session: 'afternoon', periodNumber: 8 },
  { value: 'Tiết 9 (Tiết 4 Chiều)', label: 'Tiết 9 (Tiết 4 Chiều)', shortLabel: 'T9', session: 'afternoon', periodNumber: 9 },
  { value: 'Tiết 10 (Tiết 5 Chiều)', label: 'Tiết 10 (Tiết 5 Chiều)', shortLabel: 'T10', session: 'afternoon', periodNumber: 10 },
  { value: 'Đầu giờ chiều', label: 'Đầu giờ chiều (Truy bài)', shortLabel: 'ĐG Chiều', session: 'afternoon' },
  { value: 'Giờ ra chơi chiều', label: 'Giờ ra chơi chiều', shortLabel: 'RC Chiều', session: 'afternoon' },
  { value: 'Thực hành xưởng (Chiều)', label: 'Thực hành xưởng (Chiều)', shortLabel: 'Xưởng C', session: 'afternoon' },
];

export const OTHER_PERIODS: SchoolPeriodOption[] = [
  { value: 'Chào cờ đầu tuần', label: 'Chào cờ đầu tuần', shortLabel: 'Chào cờ', session: 'other' },
  { value: 'Tiết sinh hoạt lớp', label: 'Tiết sinh hoạt lớp (SHCN)', shortLabel: 'SH lớp', session: 'other' },
  { value: 'Ký túc xá / Nội vụ', label: 'Ký túc xá / Nội vụ quân sự', shortLabel: 'KTX', session: 'other' },
  { value: 'Cuối buổi học / Ra về', label: 'Cuối buổi học / Ra về', shortLabel: 'Ra về', session: 'other' },
  { value: 'Cả ngày', label: 'Cả ngày', shortLabel: 'Cả ngày', session: 'other' },
];

export const ALL_SCHOOL_PERIODS: SchoolPeriodOption[] = [
  ...MORNING_PERIODS,
  ...AFTERNOON_PERIODS,
  ...OTHER_PERIODS,
];

/**
 * Xác định bản ghi thuộc buổi nào (sáng, chiều hoặc khác)
 */
export function getPeriodSession(periodOrTime?: string): 'morning' | 'afternoon' | 'other' {
  if (!periodOrTime) return 'other';
  const text = periodOrTime.toLowerCase();

  // Chiều: Tiết 6 -> 10, hoặc có chữ "chiều", "t6", "t7", "t8", "t9", "t10"
  if (
    text.includes('chiều') ||
    text.includes('tiết 6') ||
    text.includes('tiết 7') ||
    text.includes('tiết 8') ||
    text.includes('tiết 9') ||
    text.includes('tiết 10') ||
    text.includes('t6') ||
    text.includes('t7') ||
    text.includes('t8') ||
    text.includes('t9') ||
    text.includes('t10')
  ) {
    return 'afternoon';
  }

  // Sáng: Tiết 1 -> 5, hoặc có chữ "sáng"
  if (
    text.includes('sáng') ||
    text.includes('tiết 1') ||
    text.includes('tiết 2') ||
    text.includes('tiết 3') ||
    text.includes('tiết 4') ||
    text.includes('tiết 5') ||
    text.includes('chào cờ')
  ) {
    return 'morning';
  }

  return 'other';
}

/**
 * Trả về thông tin hiển thị badge cho tiết / thời điểm
 */
export function getPeriodBadgeInfo(periodOrTime?: string): {
  label: string;
  sessionText: string;
  badgeClass: string;
} {
  if (!periodOrTime) {
    return {
      label: '—',
      sessionText: '',
      badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    };
  }

  const session = getPeriodSession(periodOrTime);

  if (session === 'morning') {
    return {
      label: periodOrTime,
      sessionText: 'Sáng',
      badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60',
    };
  }

  if (session === 'afternoon') {
    return {
      label: periodOrTime,
      sessionText: 'Chiều',
      badgeClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60',
    };
  }

  return {
    label: periodOrTime,
    sessionText: 'Khác',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60',
  };
}
