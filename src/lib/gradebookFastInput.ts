/**
 * Tiện ích hỗ trợ nhập điểm nhanh tốc độ cao:
 * 1. Dán từ Excel / Clipboard (Paste multi-row scores)
 * 2. Phân tích NumPad tự động nhảy (85 -> 8.5, 10 -> 10)
 * 3. Điền hàng loạt điểm cho cả cột
 */

import { calculateTermAverage, calculateYearAverage, calculateSubjectRank, type ClassGradebookData, type StudentSubjectGrade } from '../types/subjectGrade';
import { assessmentKey } from './assessmentStatus';

/**
 * Phân tích dữ liệu sao chép từ Clipboard / Excel
 * Hỗ trợ dấu chấm (8.5), dấu phẩy (8,5), các ô trống hoặc chữ số
 */
export function parseClipboardScores(text: string): (number | null)[] {
  if (!text) return [];

  // Tách dòng bởi CRLF hoặc LF
  const lines = text.split(/\r?\n/);
  
  // Bỏ dòng trống cuối cùng nếu có do copy cả cột
  if (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }

  return lines.map(line => {
    // Lấy cột đầu tiên nếu copy nhiều cột bằng tab
    const firstCell = line.split('\t')[0].trim();
    if (!firstCell || firstCell === '—' || firstCell === '-') return null;

    // Chuẩn hóa dấu phẩy thành dấu chấm
    const normalized = firstCell.replace(',', '.');
    const num = parseFloat(normalized);

    if (isNaN(num) || num < 0 || num > 10) return null;
    return Math.round(num * 10) / 10;
  });
}

/**
 * Xử lý nhập điểm nhanh NumPad 2 chữ số không cần dấu chấm
 * - Gõ "85" -> 8.5
 * - Gõ "10" -> 10
 * - Gõ "05" -> 0.5
 * - Gõ "7" -> tạm thời giữ 7, chờ phím tiếp theo hoặc Enter
 */
export function parseSpeedNumpadInput(val: string): { score: number; autoAdvance: boolean } | null {
  const clean = val.trim();
  if (!clean) return null;

  // Trường hợp đặc biệt: 10 điểm
  if (clean === '10') {
    return { score: 10, autoAdvance: true };
  }

  // Trường hợp gõ 2 chữ số liên tiếp: vd "85", "75", "05", "90"
  if (/^\d{2}$/.test(clean)) {
    const tens = parseInt(clean[0], 10);
    const units = parseInt(clean[1], 10);
    // Điểm từ 0.0 đến 9.9
    const score = Math.round((tens + units / 10) * 10) / 10;
    if (score >= 0 && score <= 10) {
      return { score, autoAdvance: true };
    }
  }

  // Trường hợp đã có dấu chấm/phẩy rõ ràng (vd "8.5")
  if (/^\d+[\.,]\d+$/.test(clean)) {
    const num = parseFloat(clean.replace(',', '.'));
    if (!isNaN(num) && num >= 0 && num <= 10) {
      return { score: Math.round(num * 10) / 10, autoAdvance: true };
    }
  }

  // Trường hợp 1 chữ số thông thường (vd "8", "9", "5")
  if (/^\d$/.test(clean)) {
    const num = parseInt(clean, 10);
    if (num >= 0 && num <= 9) {
      return { score: num, autoAdvance: false };
    }
  }

  return null;
}

/**
 * Áp dụng dán một mảng điểm từ Clipboard vào một cột bắt đầu từ startIndex
 */
export function applyPasteScoresToColumn(
  gradebook: ClassGradebookData,
  studentIds: string[],
  startIndex: number,
  termKey: 'semester1' | 'semester2',
  field: 'tx' | 'gk' | 'ck',
  txIndex: number,
  scores: (number | null)[]
): ClassGradebookData {
  const updatedGrades = { ...gradebook.grades };

  scores.forEach((score, offset) => {
    const targetIdx = startIndex + offset;
    if (targetIdx >= studentIds.length) return;

    const studentId = studentIds[targetIdx];
    const currentGrade = updatedGrades[studentId];
    if (!currentGrade) return;

    const studentGrade: StudentSubjectGrade = {
      ...currentGrade,
      semester1: { ...currentGrade.semester1, tx: [...currentGrade.semester1.tx] },
      semester2: { ...currentGrade.semester2, tx: [...currentGrade.semester2.tx] },
    };

    if (field === 'tx') {
      studentGrade[termKey].tx[txIndex] = score;
    } else {
      studentGrade[termKey][field] = score;
    }

    // Xóa trạng thái đặc biệt nếu nhập điểm số cụ thể
    if (score !== null) {
      studentGrade[termKey].assessmentStatuses = { ...studentGrade[termKey].assessmentStatuses };
      delete studentGrade[termKey].assessmentStatuses![assessmentKey(field, txIndex)];
    }

    // Tính lại ĐTB
    if (!gradebook.termLocks?.semester1?.locked) {
      studentGrade.semester1.average = calculateTermAverage(studentGrade.semester1);
    }
    if (!gradebook.termLocks?.semester2?.locked) {
      studentGrade.semester2.average = calculateTermAverage(studentGrade.semester2);
    }
    studentGrade.yearAverage = calculateYearAverage(
      studentGrade.semester1.average,
      studentGrade.semester2.average
    );
    studentGrade.rank = calculateSubjectRank(studentGrade.yearAverage);

    updatedGrades[studentId] = studentGrade;
  });

  return {
    ...gradebook,
    grades: updatedGrades,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Điền điểm đồng loạt cho cả cột (Fill Column)
 */
export function applyFillColumnScore(
  gradebook: ClassGradebookData,
  studentIds: string[],
  termKey: 'semester1' | 'semester2',
  field: 'tx' | 'gk' | 'ck',
  txIndex: number,
  scoreToFill: number,
  onlyEmpty: boolean = true
): ClassGradebookData {
  const updatedGrades = { ...gradebook.grades };

  studentIds.forEach(studentId => {
    const currentGrade = updatedGrades[studentId];
    if (!currentGrade) return;

    const currentVal = field === 'tx'
      ? currentGrade[termKey].tx[txIndex]
      : currentGrade[termKey][field];

    if (onlyEmpty && currentVal !== null && currentVal !== undefined) {
      return; // Bỏ qua nếu đã có điểm
    }

    const studentGrade: StudentSubjectGrade = {
      ...currentGrade,
      semester1: { ...currentGrade.semester1, tx: [...currentGrade.semester1.tx] },
      semester2: { ...currentGrade.semester2, tx: [...currentGrade.semester2.tx] },
    };

    if (field === 'tx') {
      studentGrade[termKey].tx[txIndex] = scoreToFill;
    } else {
      studentGrade[termKey][field] = scoreToFill;
    }

    studentGrade[termKey].assessmentStatuses = { ...studentGrade[termKey].assessmentStatuses };
    delete studentGrade[termKey].assessmentStatuses![assessmentKey(field, txIndex)];

    if (!gradebook.termLocks?.semester1?.locked) {
      studentGrade.semester1.average = calculateTermAverage(studentGrade.semester1);
    }
    if (!gradebook.termLocks?.semester2?.locked) {
      studentGrade.semester2.average = calculateTermAverage(studentGrade.semester2);
    }
    studentGrade.yearAverage = calculateYearAverage(
      studentGrade.semester1.average,
      studentGrade.semester2.average
    );
    studentGrade.rank = calculateSubjectRank(studentGrade.yearAverage);

    updatedGrades[studentId] = studentGrade;
  });

  return {
    ...gradebook,
    grades: updatedGrades,
    updatedAt: new Date().toISOString(),
  };
}
