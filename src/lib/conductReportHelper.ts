import { DisciplineLog } from '../types';

export interface FormattedViolationItem {
  behaviorCode: string;
  description: string;
  count: number;
  totalDeduct: number;
  formatted: string;
}

export interface FormattedBonusItem {
  behaviorCode: string;
  description: string;
  count: number;
  totalBonus: number;
  formatted: string;
}

export interface StudentConductDetail {
  studentId: string;
  violations: FormattedViolationItem[];
  bonuses: FormattedBonusItem[];
  violationsLines: string[];
  bonusesList: string[];
  violationsText: string;
  bonusesText: string;
}

/**
 * Làm sạch chuỗi mô tả lỗi hoặc điểm cộng
 */
export function cleanBehaviorDescription(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^\[Thành tích tuần\]\s*/i, '')
    .replace(/^\[Thành tích tháng\]\s*/i, '')
    .replace(/^\[Khen thưởng\]\s*/i, '')
    .replace(/^\[Vi phạm\]\s*/i, '')
    .replace(/^\[Điểm cộng\]\s*/i, '')
    .replace(/^\[Điểm trừ\]\s*/i, '')
    .trim();
}

/**
 * Chuẩn hóa chuỗi hiển thị điểm cộng: vd "2đ đi học đầy đủ", "1đ tổ trưởng", "1 điểm 10 Lý"
 */
export function formatBonusItemText(desc: string, score: number, count: number): string {
  const cleaned = cleanBehaviorDescription(desc);
  if (!cleaned) return '';

  // Nếu mô tả đã bắt đầu bằng số điểm (ví dụ: "2đ đi học đầy đủ", "1 điểm 10", "+2 điểm...")
  if (/^(\+?\d+([\.,]\d+)?\s*(đ|điểm)|điểm\s+\d+)/i.test(cleaned)) {
    return cleaned;
  }

  // Nếu có điểm số cụ thể
  if (score > 0) {
    // Định dạng gọn gàng: "2đ đi học đầy đủ"
    const scoreStr = Number.isInteger(score) ? `${score}đ` : `${score}đ`;
    return `${scoreStr} ${cleaned}`;
  }

  return cleaned;
}

/**
 * Chuẩn hóa chuỗi hiển thị lỗi vi phạm kèm số lần: vd "Mất trật tự (2 lần)", "Ngủ trong giờ 1 lần"
 */
export function formatViolationItemText(desc: string, count: number): string {
  const cleaned = cleanBehaviorDescription(desc);
  if (!cleaned) return '';

  // Nếu trong tên lỗi đã ghi sẵn "1 lần" hoặc "(2 lần)" thì giữ nguyên
  if (/\d+\s*lần/i.test(cleaned)) {
    return cleaned;
  }

  if (count > 1) {
    return `${cleaned} (${count} lần)`;
  }

  return `${cleaned} 1 lần`;
}

/**
 * Bóc tách và gom nhóm chi tiết lỗi vi phạm và điểm cộng của học sinh trong tuần/tháng
 */
export function getStudentConductDetail(studentId: string, studentLogs: DisciplineLog[]): StudentConductDetail {
  const logs = studentLogs.filter((l) => l.studentId === studentId);

  // 1. Gom nhóm Lỗi vi phạm (type === 'deduct')
  const violationMap = new Map<string, { behaviorCode: string; description: string; count: number; totalDeduct: number }>();

  // 2. Gom nhóm Điểm cộng (type === 'bonus')
  const bonusMap = new Map<string, { behaviorCode: string; description: string; count: number; totalBonus: number }>();

  logs.forEach((log) => {
    const cleanedDesc = cleanBehaviorDescription(log.behaviorDescription);
    const key = cleanedDesc.toLowerCase() || log.behaviorCode;

    if (log.type === 'deduct') {
      const existing = violationMap.get(key);
      const count = log.count || 1;
      const deduct = log.totalScore || 0;
      if (existing) {
        existing.count += count;
        existing.totalDeduct += deduct;
      } else {
        violationMap.set(key, {
          behaviorCode: log.behaviorCode,
          description: cleanedDesc,
          count,
          totalDeduct: deduct,
        });
      }
    } else if (log.type === 'bonus') {
      const existing = bonusMap.get(key);
      const count = log.count || 1;
      const bonus = log.totalScore || 0;
      if (existing) {
        existing.count += count;
        existing.totalBonus += bonus;
      } else {
        bonusMap.set(key, {
          behaviorCode: log.behaviorCode,
          description: cleanedDesc,
          count,
          totalBonus: bonus,
        });
      }
    }
  });

  const violations: FormattedViolationItem[] = Array.from(violationMap.values()).map((v) => ({
    ...v,
    formatted: formatViolationItemText(v.description, v.count),
  }));

  const bonuses: FormattedBonusItem[] = Array.from(bonusMap.values()).map((b) => ({
    ...b,
    formatted: formatBonusItemText(b.description, b.totalBonus, b.count),
  }));

  const violationsLines = violations.map((v) => v.formatted);
  const bonusesList = bonuses.map((b) => b.formatted);

  return {
    studentId,
    violations,
    bonuses,
    violationsLines,
    bonusesList,
    violationsText: violationsLines.join('\n'),
    bonusesText: bonusesList.join(', '),
  };
}
