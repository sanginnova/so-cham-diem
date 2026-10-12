import { DisciplineLog } from '../types';
import { removeVietnameseAccents } from './utils';

export interface AttendanceBreakdown {
  excusedAbsenceCount: number;   // Số buổi nghỉ có phép (P / CP)
  unexcusedAbsenceCount: number; // Số buổi nghỉ không phép (KP)
  truancyCount: number;          // Số lần bỏ tiết / trốn tiết (BT)
}

/**
 * Phân loại một bản ghi kỷ luật / nề nếp xem có thuộc diện Chuyên cần hay không:
 * - 'excused': Nghỉ học có phép (P)
 * - 'unexcused': Nghỉ học không phép, nghỉ tự do (KP)
 * - 'truancy': Bỏ tiết, trốn tiết giữa giờ (BT)
 */
export function classifyAttendance(log: DisciplineLog): 'excused' | 'unexcused' | 'truancy' | null {
  // Bỏ qua điểm thưởng thành tích / khen thưởng chuyên cần
  if (log.type === 'bonus') return null;

  const code = (log.behaviorCode || '').toUpperCase().trim();
  const rawText = `${log.behaviorDescription || ''} ${log.note || ''} ${log.basisOrRegulation || ''} ${log.periodOrTime || ''} ${code}`.trim();
  const desc = removeVietnameseAccents(rawText).toLowerCase();

  // Loại trừ các trường hợp khen thưởng, đi học đầy đủ 100% không nghỉ
  if (
    desc.includes('khong nghi') ||
    desc.includes('chua nghi') ||
    desc.includes('khong vang') ||
    desc.includes('chua tung nghi') ||
    desc.includes('100% khong') ||
    desc.includes('du 100%') ||
    desc.includes('chuyen can xuat sac')
  ) {
    return null;
  }

  // 1. Bỏ tiết, trốn tiết giữa giờ (truancy)
  if (
    code === 'BT' ||
    code === 'TRON_TIET' ||
    code === 'BO_TIET' ||
    code === 'L09_BT' ||
    desc.includes('bo tiet') ||
    desc.includes('tron tiet') ||
    desc.includes('bo gio') ||
    desc.includes('tron gio') ||
    desc.includes('bo hoc giua gio') ||
    desc.includes('tron hoc') ||
    desc.includes('bo tiet hoc')
  ) {
    return 'truancy';
  }

  // 2. Nghỉ học không phép, nghỉ tự do (unexcused)
  const isUnexcusedExplicit =
    code === 'KP' ||
    code === 'NGHI_KHONG_PHEP' ||
    code === 'L09_KP' ||
    code === 'TU_DO' ||
    desc.includes('khong phep') ||
    desc.includes('k phep') ||
    desc.includes('ko phep') ||
    desc.includes('k.phep') ||
    desc.includes('nghi tu do') ||
    desc.includes('nghi hoc tu do') ||
    desc.includes('vang khong phep') ||
    desc.includes('vang kp') ||
    desc.includes('nghi kp') ||
    desc.includes('(kp)') ||
    desc.includes(' khong co ly do') ||
    desc.includes('khong ly do') ||
    desc.includes('k ly do') ||
    desc.includes('ko ly do') ||
    desc.includes('khong p ') ||
    desc.includes('k p ');

  if (isUnexcusedExplicit) {
    return 'unexcused';
  }

  // 3. Nghỉ học có phép (excused)
  const isExcusedExplicit =
    code === 'L15' ||
    code === 'P' ||
    code === 'CP' ||
    code === 'NGHI_CO_PHEP' ||
    code === 'NGHI_PHEP' ||
    code === 'CO_PHEP' ||
    desc.includes('nghi co phep') ||
    desc.includes('co phep') ||
    desc.includes('nghi phep') ||
    desc.includes('xin phep') ||
    desc.includes('co don') ||
    desc.includes('don xin') ||
    desc.includes('don phep') ||
    desc.includes('giay phep') ||
    desc.includes('giay xin') ||
    desc.includes('nghi om') ||
    desc.includes('bi om') ||
    desc.includes('om sot') ||
    desc.includes('kham benh') ||
    desc.includes('nam vien') ||
    desc.includes('dieu tri') ||
    desc.includes('tai nan') ||
    desc.includes('phu huynh xin') ||
    desc.includes('gia dinh xin') ||
    desc.includes('co viec gia dinh') ||
    desc.includes('(p)') ||
    desc.includes('(cp)') ||
    desc.includes('nghi cp') ||
    desc.includes('vang cp') ||
    desc.includes('vang p') ||
    desc.includes('co ly do');

  if (isExcusedExplicit) {
    return 'excused';
  }

  // 4. Nếu mã L09 chuẩn ('Trốn tiết, nghỉ học tự do...')
  if (code === 'L09') {
    if (desc.includes('tron') || desc.includes('bo')) {
      return 'truancy';
    }
    if (desc.includes('phep') || desc.includes('om') || desc.includes('xin') || desc.includes('don')) {
      return 'excused';
    }
    return 'unexcused';
  }

  // 5. Các dạng ghi nhận vắng mặt / nghỉ học chung chung
  const isGeneralAbsence =
    desc.includes('nghi hoc') ||
    desc.includes('vang hoc') ||
    desc.includes('vang mat') ||
    desc.includes('nghi buoi') ||
    desc.includes('vang buoi') ||
    (desc.includes('nghi') && !desc.includes('nghi ngoi') && !desc.includes('suy nghi')) ||
    (desc.includes('vang') && !desc.includes('vang lai'));

  if (isGeneralAbsence) {
    if (
      desc.includes('om') ||
      desc.includes('sot') ||
      desc.includes('benh') ||
      desc.includes('phep') ||
      desc.includes('don') ||
      desc.includes('xin') ||
      desc.includes('gia dinh')
    ) {
      return 'excused';
    }
    return 'unexcused';
  }

  return null;
}

/**
 * Tính toán thống kê chuyên cần từ danh sách các bản ghi nhật ký
 */
export function calculateAttendanceStats(logs: DisciplineLog[]): AttendanceBreakdown {
  let excusedAbsenceCount = 0;
  let unexcusedAbsenceCount = 0;
  let truancyCount = 0;

  for (const log of logs) {
    const kind = classifyAttendance(log);
    const count = Math.max(1, log.count || 1);
    if (kind === 'excused') {
      excusedAbsenceCount += count;
    } else if (kind === 'unexcused') {
      unexcusedAbsenceCount += count;
    } else if (kind === 'truancy') {
      truancyCount += count;
    }
  }

  return {
    excusedAbsenceCount,
    unexcusedAbsenceCount,
    truancyCount,
  };
}

/**
 * Trình bày chuỗi tóm tắt dạng ngắn (ví dụ: 'P: 1 | KP: 2 | BT: 1')
 */
export function formatAttendanceBadgeText(stats: AttendanceBreakdown): string {
  const parts: string[] = [];
  if (stats.excusedAbsenceCount > 0) parts.push(`P: ${stats.excusedAbsenceCount}`);
  if (stats.unexcusedAbsenceCount > 0) parts.push(`KP: ${stats.unexcusedAbsenceCount}`);
  if (stats.truancyCount > 0) parts.push(`BT: ${stats.truancyCount}`);
  return parts.length > 0 ? parts.join(' • ') : '0';
}

/**
 * Trình bày chuỗi chi tiết đầy đủ (ví dụ: '1 có phép, 2 không phép, 1 bỏ tiết')
 */
export function formatAttendanceDetailText(stats: AttendanceBreakdown): string {
  const parts: string[] = [];
  if (stats.excusedAbsenceCount > 0) parts.push(`${stats.excusedAbsenceCount} có phép (P)`);
  if (stats.unexcusedAbsenceCount > 0) parts.push(`${stats.unexcusedAbsenceCount} không phép (KP)`);
  if (stats.truancyCount > 0) parts.push(`${stats.truancyCount} bỏ tiết (BT)`);
  return parts.join(', ');
}
