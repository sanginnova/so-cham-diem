import * as XLSX from 'xlsx';
import { RankLevel, RankThresholds } from '../types';

/**
 * Mẫu ngưỡng xếp loại rèn luyện thi đua mặc định (chuẩn 10A8 - CĐN1-BQP)
 */
export const DEFAULT_RANK_THRESHOLDS: RankThresholds = {
  xuatSac: 12,
  tot: 8,
  kha: 7,
  dat: 5,
  xuatSacNote: 'Bốc thăm phần thưởng',
  khongDatNote: 'Bốc thăm hình phạt',
};

/**
 * Lấy ngưỡng điểm có hiệu lực (fallback về mặc định nếu thiếu hoặc undefined)
 */
export function getEffectiveRankThresholds(thresholds?: RankThresholds): RankThresholds {
  return {
    xuatSac: thresholds?.xuatSac ?? DEFAULT_RANK_THRESHOLDS.xuatSac,
    tot: thresholds?.tot ?? DEFAULT_RANK_THRESHOLDS.tot,
    kha: thresholds?.kha ?? DEFAULT_RANK_THRESHOLDS.kha,
    dat: thresholds?.dat ?? DEFAULT_RANK_THRESHOLDS.dat,
    xuatSacNote: thresholds?.xuatSacNote || DEFAULT_RANK_THRESHOLDS.xuatSacNote,
    khongDatNote: thresholds?.khongDatNote || DEFAULT_RANK_THRESHOLDS.khongDatNote,
  };
}

/**
 * Mô tả khoảng điểm xếp loại (Ví dụ: "≥ 12.0đ", "8.0 – 11.9đ", "< 5.0đ")
 */
export function getRankRangeDescription(rank: RankLevel, thresholds?: RankThresholds): string {
  const t = getEffectiveRankThresholds(thresholds);
  const format = (n: number) => Number.isInteger(n) ? `${n}.0` : `${n}`;
  switch (rank) {
    case 'Xuất sắc':
      return `≥ ${format(t.xuatSac)}đ`;
    case 'Tốt': {
      const upper = t.xuatSac > t.tot ? format(Math.round((t.xuatSac - 0.1) * 10) / 10) : format(t.tot);
      return `${format(t.tot)} – ${upper}đ`;
    }
    case 'Khá': {
      const upper = t.tot > t.kha ? format(Math.round((t.tot - 0.1) * 10) / 10) : format(t.kha);
      return `${format(t.kha)} – ${upper}đ`;
    }
    case 'Đạt':
    case 'Trung bình': {
      const upper = t.kha > t.dat ? format(Math.round((t.kha - 0.1) * 10) / 10) : format(t.dat);
      return `${format(t.dat)} – ${upper}đ`;
    }
    case 'Không đạt':
    case 'Yếu':
      return `< ${format(t.dat)}đ`;
  }
}

/**
 * Remove Vietnamese accents for loose search / matching
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Format date YYYY-MM-DD or ISO string to dd/MM/yyyy
 */
export function formatVietnameseDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    // If it's already YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const cleanDay = day.split('T')[0];
      return `${cleanDay.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Format decimal numbers using Vietnamese comma, e.g. 0.5 -> "0,5", 9 -> "9", 8.25 -> "8,25"
 */
export function formatVietnameseNumber(num: number, maxDecimals: number = 2): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  // Round to maxDecimals
  const rounded = Math.round(num * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);
  const parts = rounded.toString().split('.');
  if (parts.length === 1) return parts[0];
  return `${parts[0]},${parts[1]}`;
}

/**
 * Calculate rank level according to tiêu chuẩn xếp loại rèn luyện thi đua:
 * - Xuất sắc: Từ ngưỡng xuatSac (mặc định 12 điểm)
 * - Tốt: Từ ngưỡng tot (mặc định 8 điểm) đến dưới xuatSac
 * - Khá: Từ ngưỡng kha (mặc định 7 điểm) đến dưới tot
 * - Đạt: Từ ngưỡng dat (mặc định 5 điểm) đến dưới kha
 * - Không đạt: Dưới ngưỡng dat (mặc định dưới 5 điểm)
 */
export function calculateRank(score: number, thresholds?: RankThresholds): RankLevel {
  const t = getEffectiveRankThresholds(thresholds);
  if (score >= t.xuatSac) return 'Xuất sắc';
  if (score >= t.tot) return 'Tốt';
  if (score >= t.kha) return 'Khá';
  if (score >= t.dat) return 'Đạt';
  return 'Không đạt';
}

/**
 * Clamp score to at least min (default 0). No upper limit unless max is explicitly specified.
 */
export function clampScore(score: number, min: number = 0, max?: number): number {
  const rounded = Math.round(score * 100) / 100;
  const lower = Math.max(min, rounded);
  return max !== undefined ? Math.min(max, lower) : lower;
}

/**
 * Get CSS badge color classes for Rank
 */
export function getRankBadgeClass(rank: RankLevel): { bg: string; text: string; border: string } {
  switch (rank) {
    case 'Xuất sắc':
      return { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' };
    case 'Tốt':
      return { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' };
    case 'Khá':
      return { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' };
    case 'Đạt':
    case 'Trung bình':
      return { bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' };
    case 'Không đạt':
    case 'Yếu':
      return { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' };
  }
}

/**
 * Export data array to Excel (.xlsx) file and trigger download
 */
export function exportToExcel(data: Record<string, any>[], fileName: string, sheetName: string = 'Sheet1') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Export data array to CSV file and trigger download
 */
export function exportToCsv(data: Record<string, any>[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a blank sample Excel file for student imports
 */
export function downloadStudentTemplate() {
  const template = [
    { 'Mã học sinh': '419', 'Họ đệm': 'Nguyễn Văn', 'Tên': 'Trọng', 'Giới tính': 'Nam', 'Dân tộc': 'Dao', 'Ngày sinh': '16/05/2011', 'Điện thoại phụ huynh': '0912345678', 'Tên phụ huynh': 'Nguyễn Văn Hùng' },
    { 'Mã học sinh': '421', 'Họ đệm': 'Chu Văn', 'Tên': 'Thương', 'Giới tính': 'Nam', 'Dân tộc': 'Cao Lan', 'Ngày sinh': '15/01/2011', 'Điện thoại phụ huynh': '0987654321', 'Tên phụ huynh': 'Lê Thị Mai' },
    { 'Mã học sinh': '1257', 'Họ đệm': 'Nguyễn Thị', 'Tên': 'Linh', 'Giới tính': 'Nữ', 'Dân tộc': 'Tày', 'Ngày sinh': '24/10/2011', 'Điện thoại phụ huynh': '', 'Tên phụ huynh': '' },
  ];
  const worksheet = XLSX.utils.json_to_sheet(template);
  worksheet['!cols'] = [14, 22, 16, 12, 14, 14, 25, 25].map((wch) => ({ wch }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachHocSinh');
  XLSX.writeFile(workbook, 'Mau_nhap_danh_sach_hoc_sinh.xlsx');
}
/**
 * Flexible date parser for Excel/CSV inputs
 * Handles Excel serial numbers, DD/MM/YYYY, YYYY-MM-DD, ISO strings
 */
export function parseFlexibleDate(val: any): string | null {
  if (val === undefined || val === null || val === '') return null;

  // If already Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // If Excel numeric serial date (e.g. 45557)
  if (typeof val === 'number' && val > 20000 && val < 80000) {
    try {
      // Excel 1900 date system leap year bug adjustment (25569 = 1970-01-01)
      const utcDays = Math.floor(val - 25569);
      const date = new Date(utcDays * 86400 * 1000);
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    } catch {
      return null;
    }
  }

  const str = String(val).trim();
  if (!str) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Try standard JS Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Download a sample Excel file for discipline log (Nhật ký lỗi / nề nếp) imports
 */
export function downloadDisciplineLogTemplate() {
  const template = [
    {
      'Ngày': '2026-09-22',
      'Mã học sinh': 'HS10A801',
      'Họ và tên': 'Nguyễn Văn An',
      'Mã vi phạm': 'KTB',
      'Nội dung lỗi': 'Không thuộc bài môn Toán',
      'Loại': 'Trừ điểm',
      'Điểm': 1,
      'Số lần': 1,
      'Tiết / Thời điểm': 'Tiết 1',
      'Người ghi nhận': 'Cán sự môn Toán',
      'Căn cứ / Quy định': 'Điều 3 - Nội quy học tập',
      'Ghi chú': 'Kiểm tra miệng đầu giờ',
    },
    {
      'Ngày': '2026-09-23',
      'Mã học sinh': 'HS10A802',
      'Họ và tên': 'Trần Thị Bình',
      'Mã vi phạm': 'DHM',
      'Nội dung lỗi': 'Đi học muộn 15 phút',
      'Loại': 'Trừ điểm',
      'Điểm': 1,
      'Số lần': 1,
      'Tiết / Thời điểm': 'Đầu giờ sáng',
      'Người ghi nhận': 'Cờ đỏ',
      'Căn cứ / Quy định': 'Nội quy chuyên cần',
      'Ghi chú': 'Hỏng xe trên đường đến trường',
    },
    {
      'Ngày': '2026-09-24',
      'Mã học sinh': 'HS10A803',
      'Họ và tên': 'Lê Hoàng Bảo',
      'Mã vi phạm': 'PBT',
      'Nội dung lỗi': 'Phát biểu xây dựng bài sôi nổi',
      'Loại': 'Cộng điểm',
      'Điểm': 0.5,
      'Số lần': 2,
      'Tiết / Thời điểm': 'Tiết 3',
      'Người ghi nhận': 'GV Bộ môn',
      'Căn cứ / Quy định': 'Tiêu chí thi đua học tập',
      'Ghi chú': 'Giải bài tập nâng cao lên bảng',
    },
    {
      'Ngày': '2026-09-25',
      'Mã học sinh': 'HS10A804',
      'Họ và tên': 'Vũ Đức Cường',
      'Mã vi phạm': 'THX',
      'Nội dung lỗi': 'Vệ sinh máy và bàn giao xưởng thực hành xuất sắc',
      'Loại': 'Cộng điểm',
      'Điểm': 1,
      'Số lần': 1,
      'Tiết / Thời điểm': 'Tiết 7 (Tiết 2 Chiều)',
      'Người ghi nhận': 'GV Hướng dẫn Xưởng',
      'Căn cứ / Quy định': 'Nội quy an toàn xưởng thực hành',
      'Ghi chú': 'Buổi chiều thực hành nghề',
    },
  ];
  exportToExcel(template, 'Mau_nhap_nhat_ky_ne_nep_10A8', 'NhatKyLoi');
}

/**
 * Vietnamese comparison for student names according to Vietnamese school convention:
 * Compares by firstName (Tên chính) first, then lastName (Họ & tên đệm), then fullName.
 * Uses Vietnamese locale collation ('vi') so vowels with diacritics
 * are sorted in standard Vietnamese alphabet order.
 */
export function compareVietnameseNames(
  studentA: { firstName?: string; lastName?: string; fullName?: string },
  studentB: { firstName?: string; lastName?: string; fullName?: string },
  direction: 'asc' | 'desc' = 'asc'
): number {
  const getFirstName = (s: { firstName?: string; fullName?: string }) => {
    if (s.firstName && s.firstName.trim()) return s.firstName.trim();
    if (s.fullName && s.fullName.trim()) {
      const parts = s.fullName.trim().split(/\s+/);
      return parts[parts.length - 1];
    }
    return '';
  };

  const getLastName = (s: { lastName?: string; fullName?: string }) => {
    if (s.lastName && s.lastName.trim()) return s.lastName.trim();
    if (s.fullName && s.fullName.trim()) {
      const parts = s.fullName.trim().split(/\s+/);
      if (parts.length > 1) {
        return parts.slice(0, parts.length - 1).join(' ');
      }
    }
    return '';
  };

  const nameA = getFirstName(studentA);
  const nameB = getFirstName(studentB);

  // Compare first name (Tên chính) with Vietnamese collation
  let comp = nameA.localeCompare(nameB, 'vi', { sensitivity: 'base', numeric: true });
  if (comp === 0) {
    // If first names are identical, compare last & middle name (Họ & Đệm)
    const lastA = getLastName(studentA);
    const lastB = getLastName(studentB);
    comp = lastA.localeCompare(lastB, 'vi', { sensitivity: 'base', numeric: true });
  }
  if (comp === 0) {
    comp = (studentA.fullName || '').localeCompare(studentB.fullName || '', 'vi');
  }

  return direction === 'asc' ? comp : -comp;
}

/**
 * Natural comparison for student code (e.g. HS01, HS02, HS10)
 */
export function compareStudentCodes(
  codeA?: string,
  codeB?: string,
  direction: 'asc' | 'desc' = 'asc'
): number {
  const comp = (codeA || '').trim().localeCompare((codeB || '').trim(), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  return direction === 'asc' ? comp : -comp;
}
