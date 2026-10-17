import XLSX from 'xlsx-js-style';

export type TimetableMode = 'mon-sat' | 'mon-fri';

export interface TimetableSlot {
  dayOfWeek: number; // 2 -> 7 (Thứ 2 -> Thứ 7)
  period: number; // 1 -> 10 (1-5: Sáng, 6-10: Chiều)
  className: string;
  classId?: string;
  subjectName: string;
  room?: string;
  note?: string;
}

export interface TeacherTimetable {
  teacherId: string;
  teacherName: string;
  schoolYear: string;
  semester: 1 | 2;
  mode?: TimetableMode; // 'mon-sat' (6 ngày) hoặc 'mon-fri' (5 ngày)
  currentWeekNumber?: number; // Tuần đang xem (1 -> 35)
  weekStartDate?: string; // YYYY-MM-DD (Ngày Thứ 2 bắt đầu tuần)
  slots: Record<string, TimetableSlot>; // TKB chuẩn / mặc định
  weekSlots?: Record<string, Record<string, TimetableSlot>>; // TKB theo từng tuần: 'w1', 'w2', 'w3'...
  updatedAt: string;
}

export const DAYS_OF_WEEK_FULL = [
  { value: 2, label: 'Thứ Hai', shortLabel: 'Thứ 2' },
  { value: 3, label: 'Thứ Ba', shortLabel: 'Thứ 3' },
  { value: 4, label: 'Thứ Tư', shortLabel: 'Thứ 4' },
  { value: 5, label: 'Thứ Năm', shortLabel: 'Thứ 5' },
  { value: 6, label: 'Thứ Sáu', shortLabel: 'Thứ 6' },
  { value: 7, label: 'Thứ Bảy', shortLabel: 'Thứ 7' },
];

export const DAYS_OF_WEEK = DAYS_OF_WEEK_FULL;

export function getDaysOfWeek(mode: TimetableMode = 'mon-sat') {
  return mode === 'mon-fri' ? DAYS_OF_WEEK_FULL.slice(0, 5) : DAYS_OF_WEEK_FULL;
}

// Khung giờ thực tế chuẩn 100% theo trường CĐN01 & THPT (như trong ảnh mẫu)
export const PERIOD_HOURS: Record<number, string> = {
  1: '7h15-8h00',
  2: '8h05-8h50',
  3: '9h00-9h45',
  4: '9h50-10h35',
  5: '10h40-11h25',
  6: '13h30-14h15',
  7: '14h20-15h05',
  8: '15h15-16h00',
  9: '16h05-16h50',
  10: '16h55-17h40',
};

// Thông tin hiển thị buổi & số thứ tự tiết trong buổi
export const PERIOD_SESSION_INFO: Record<number, { session: 'morning' | 'afternoon'; sessionLabel: string; periodInSession: number }> = {
  1: { session: 'morning', sessionLabel: 'Sáng', periodInSession: 1 },
  2: { session: 'morning', sessionLabel: 'Sáng', periodInSession: 2 },
  3: { session: 'morning', sessionLabel: 'Sáng', periodInSession: 3 },
  4: { session: 'morning', sessionLabel: 'Sáng', periodInSession: 4 },
  5: { session: 'morning', sessionLabel: 'Sáng', periodInSession: 5 },
  6: { session: 'afternoon', sessionLabel: 'Chiều', periodInSession: 1 },
  7: { session: 'afternoon', sessionLabel: 'Chiều', periodInSession: 2 },
  8: { session: 'afternoon', sessionLabel: 'Chiều', periodInSession: 3 },
  9: { session: 'afternoon', sessionLabel: 'Chiều', periodInSession: 4 },
  10: { session: 'afternoon', sessionLabel: 'Chiều', periodInSession: 5 },
};

export function makeSlotKey(dayOfWeek: number, period: number): string {
  return `${dayOfWeek}_p${period}`;
}

export function getTimetableStorageKey(teacherId: string, schoolYear: string, semester: number): string {
  return `teacher_timetable_v1_${teacherId || 'guest'}_${schoolYear}_s${semester}`;
}

/**
 * Lấy ngày Thứ Hai của tuần hiện tại dạng YYYY-MM-DD
 */
export function getMondayOfCurrentWeek(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0 = CN, 1 = T2,...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Tính danh sách các ngày trong tuần (Thứ 2 -> Thứ 6 hoặc Thứ 7) từ ngày Thứ 2
 */
export function getWeekDates(mondayStr: string, mode: TimetableMode = 'mon-sat'): Array<{ dayOfWeek: number; dateStr: string; displayDate: string }> {
  const monday = new Date(`${mondayStr}T00:00:00`);
  const days = getDaysOfWeek(mode);
  return days.map((d, index) => {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + index);
    const day = String(cur.getDate()).padStart(2, '0');
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const yyyy = cur.getFullYear();
    return {
      dayOfWeek: d.value,
      dateStr: `${yyyy}-${month}-${day}`,
      displayDate: `${day}/${month}`,
    };
  });
}

/**
 * Tách nội dung chuỗi ô thành className và subjectName (vd: 10A8-Toán, 10A8-HĐTN-HN, 10A8-Ôn Toán, 12B6-Toán)
 */
export function parseTimetableCell(rawText: string): { className: string; subjectName: string; room?: string } {
  const clean = (rawText || '').trim();
  if (!clean || clean === '—' || clean === '-' || clean.toLowerCase() === 'x' || clean.toLowerCase() === 'none') {
    return { className: '', subjectName: '' };
  }

  // Bỏ qua các chuỗi không phải là môn học/lớp:
  // 1. Số nguyên thuần túy (số thứ tự tiết: 1, 2, 3...)
  if (/^\d{1,2}$/.test(clean)) {
    return { className: '', subjectName: '' };
  }
  // 2. Định dạng giờ (7h15-8h00, 14h20-15h05, 07:15...)
  if (/\d{1,2}[h:]\d{2}/i.test(clean)) {
    return { className: '', subjectName: '' };
  }
  // 3. Tên thứ (Thứ 2, Thứ Hai, T2, Mon, Tue...)
  if (/^(thứ\s*\d+|thứ\s*hai|thứ\s*ba|thứ\s*tư|thứ\s*năm|thứ\s*sáu|thứ\s*bảy|thu\s*\d+|t[2-7]|mon|tue|wed|thu|fri|sat)$/i.test(clean)) {
    return { className: '', subjectName: '' };
  }
  // 4. Nhãn buổi hoặc nhãn tiết
  if (/^(sáng|chiều|buổi|sang|chieu|tiết\s*\d+|tiet\s*\d+)$/i.test(clean)) {
    return { className: '', subjectName: '' };
  }

  // Tách phòng nếu có định dạng "10A8-Toán (P.102)" hoặc "10A8-Toán - P.102"
  let room = '';
  let mainText = clean;
  const roomMatch = mainText.match(/\((P\.?[^\)]+)\)/i) || mainText.match(/-\s*(P\.?\s*\d+)/i);
  if (roomMatch) {
    room = roomMatch[1].trim();
    mainText = mainText.replace(roomMatch[0], '').trim();
  }

  // Tách Lớp và Môn bằng dấu gạch ngang đầu tiên: "10A8-Toán", "10A8-HĐTN-HN", "10A8 - Ôn Toán"
  const dashIndex = mainText.indexOf('-');
  if (dashIndex > 0) {
    const className = mainText.slice(0, dashIndex).trim();
    const subjectName = mainText.slice(dashIndex + 1).trim();
    return { className, subjectName: subjectName || 'Toán', room };
  }

  // Tách bằng khoảng trắng nếu không có dấu gạch ngang (vd: "10A8 Toán")
  const spaceParts = mainText.split(/\s+/);
  if (spaceParts.length >= 2 && /^\d+[A-Z]\d*$/i.test(spaceParts[0])) {
    return {
      className: spaceParts[0].trim(),
      subjectName: spaceParts.slice(1).join(' ').trim(),
      room,
    };
  }

  return { className: clean, subjectName: 'Toán', room };
}

/**
 * Đối chiếu chuỗi thời gian thực tế với số thứ tự tiết 1 -> 10 chuẩn
 */
export function matchPeriodFromTime(str: string): number | null {
  const clean = str.toLowerCase().replace(/\s+/g, '');
  if (/7h15|07:15|7:15/i.test(clean)) return 1;
  if (/8h05|08:05|8:05/i.test(clean)) return 2;
  if (/9h00|09:00|9:00/i.test(clean)) return 3;
  if (/9h50|09:50|9:50/i.test(clean)) return 4;
  if (/10h40|10:40/i.test(clean)) return 5;
  if (/13h30|13:30/i.test(clean)) return 6;
  if (/14h20|14:20/i.test(clean)) return 7;
  if (/15h15|15:15/i.test(clean)) return 8;
  if (/16h05|16:05/i.test(clean)) return 9;
  if (/16h55|16:55/i.test(clean)) return 10;
  return null;
}

/**
 * Nhận diện chỉ mục các cột tương ứng với từng Thứ (Thứ 2..Thứ 7) trong dòng tiêu đề
 */
export function extractDayColumnsFromRow(cells: string[]): Record<number, number> | null {
  const dayMap: Record<number, number> = {};
  cells.forEach((cell, idx) => {
    const lower = cell.toLowerCase().trim();
    if (/^(thứ\s*2|thứ\s*hai|t2|mon|thu\s*2)$/i.test(lower)) dayMap[2] = idx;
    else if (/^(thứ\s*3|thứ\s*ba|t3|tue|thu\s*3)$/i.test(lower)) dayMap[3] = idx;
    else if (/^(thứ\s*4|thứ\s*tư|t4|wed|thu\s*4)$/i.test(lower)) dayMap[4] = idx;
    else if (/^(thứ\s*5|thứ\s*năm|t5|thu|thu\s*5)$/i.test(lower)) dayMap[5] = idx;
    else if (/^(thứ\s*6|thứ\s*sáu|t6|fri|thu\s*6)$/i.test(lower)) dayMap[6] = idx;
    else if (/^(thứ\s*7|thứ\s*bảy|t7|sat|thu\s*7)$/i.test(lower)) dayMap[7] = idx;
  });
  return Object.keys(dayMap).length >= 2 ? dayMap : null;
}

/**
 * Tự động phát hiện dạng TKB (Thứ 2-Thứ 6 hay Thứ 2-Thứ 7) từ chuỗi copy
 */
export function detectTimetableModeFromText(text: string): TimetableMode | null {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const cols = line.split('\t').map(c => c.trim());
    const dayMap = extractDayColumnsFromRow(cols);
    if (dayMap) {
      if (dayMap[7] !== undefined) return 'mon-sat';
      if (dayMap[2] !== undefined && dayMap[6] !== undefined) return 'mon-fri';
    }
  }
  return null;
}

/**
 * Phân tích chuỗi Copy-Paste (dạng Tab-separated từ Excel, TSV, hoặc bảng có merge ô) thành ma trận slots
 */
export function parseTimetableFromText(
  text: string,
  mode: TimetableMode = 'mon-fri'
): Record<string, TimetableSlot> {
  const result: Record<string, TimetableSlot> = {};
  if (!text || !text.trim()) return result;

  const rawLines = text.split(/\r?\n/).filter(l => l.replace(/[\t\s]/g, '').length > 0);
  if (rawLines.length === 0) return result;

  let activeDayMap: Record<number, number> | null = null;
  let currentSession: 'morning' | 'afternoon' = 'morning';
  let lastPeriod = 0;

  for (const line of rawLines) {
    // Tách cột bằng Tab (\t), dấu gạch dọc (|), hoặc 2 dấu cách
    let cols = line.split('\t').map(c => c.trim());
    if (cols.length === 1 && line.includes('|')) {
      cols = line.split('|').map(c => c.trim()).filter(Boolean);
    } else if (cols.length === 1 && line.includes('  ')) {
      cols = line.split(/\s{2,}/).map(c => c.trim());
    }

    if (cols.every(c => !c)) continue;

    // Kiểm tra xem dòng này có đổi Buổi (Sáng/Chiều) không
    const hasSang = cols.some(c => /^sáng$/i.test(c));
    const hasChieu = cols.some(c => /^chiều$/i.test(c));
    if (hasChieu) currentSession = 'afternoon';
    else if (hasSang) currentSession = 'morning';

    // Kiểm tra xem dòng này có phải là dòng tiêu đề Thứ (Header: Thứ 2, Thứ 3...) không
    const detectedDayMap = extractDayColumnsFromRow(cols);
    if (detectedDayMap) {
      activeDayMap = detectedDayMap;
      // Dòng header không chứa tiết học, tiếp tục quét dòng dữ liệu kế tiếp
      continue;
    }

    // Xác định Tiết học (period: 1 -> 10) của dòng này:
    let period: number | null = null;

    // 1. Ưu tiên cao nhất: Tìm khung giờ khớp chính xác (vd: 7h15-8h00, 14h20-15h05, 15h15...)
    for (const c of cols) {
      const match = matchPeriodFromTime(c);
      if (match !== null) {
        period = match;
        break;
      }
    }

    // 2. Nếu không tìm thấy giờ, tìm số thứ tự tiết (vd: Tiết 1, 1, 2, 3...)
    if (period === null) {
      for (const c of cols) {
        const periodMatch = c.match(/^(?:tiết\s*)?(\d{1,2})$/i);
        if (periodMatch) {
          const num = parseInt(periodMatch[1], 10);
          if (num >= 6 && num <= 10) {
            period = num;
            break;
          } else if (num >= 1 && num <= 5) {
            period = currentSession === 'afternoon' ? num + 5 : num;
            break;
          }
        }
      }
    }

    // 3. Fallback: Nếu không có cả giờ lẫn số tiết, tự động tăng từ tiết trước
    if (period === null) {
      if (lastPeriod === 0) {
        period = currentSession === 'afternoon' ? 6 : 1;
      } else if (lastPeriod < 10) {
        period = lastPeriod + 1;
      } else {
        continue;
      }
    }

    lastPeriod = period;

    // Gán dữ liệu cho từng Thứ trong tuần:
    if (activeDayMap) {
      // Trường hợp A: Đã nhận diện chính xác cột nào ứng với Thứ nào
      for (const [dayStr, colIdx] of Object.entries(activeDayMap)) {
        const day = parseInt(dayStr, 10);
        if (mode === 'mon-fri' && day > 6) continue;
        const cellValue = cols[colIdx] || '';
        const parsed = parseTimetableCell(cellValue);
        if (parsed.className) {
          result[makeSlotKey(day, period)] = {
            dayOfWeek: day,
            period,
            className: parsed.className,
            subjectName: parsed.subjectName,
            room: parsed.room || '',
          };
        }
      }
    } else {
      // Trường hợp B: Người dùng copy không kèm dòng header Thứ 2, Thứ 3...
      // Bỏ qua các cột metadata ở đầu (Buổi, Tiết, Thời gian hoặc ô trống do merge ô dọc)
      let startIndex = 0;
      for (let idx = 0; idx < cols.length; idx++) {
        const c = cols[idx];
        if (!c) {
          startIndex = idx + 1;
        } else if (/^(sáng|chiều|buổi)$/i.test(c)) {
          startIndex = idx + 1;
        } else if (/^(tiết\s*\d+|\d{1,2})$/i.test(c)) {
          startIndex = idx + 1;
        } else if (/\d{1,2}[h:]\d{2}/i.test(c)) {
          startIndex = idx + 1;
        } else {
          break;
        }
      }

      const targetDays = mode === 'mon-fri' ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7];
      const dataCols = cols.slice(startIndex);
      for (let i = 0; i < targetDays.length && i < dataCols.length; i++) {
        const day = targetDays[i];
        const cellValue = dataCols[i];
        const parsed = parseTimetableCell(cellValue);
        if (parsed.className) {
          result[makeSlotKey(day, period)] = {
            dayOfWeek: day,
            period,
            className: parsed.className,
            subjectName: parsed.subjectName,
            room: parsed.room || '',
          };
        }
      }
    }
  }

  return result;
}

/**
 * Xuất toàn bộ bảng TKB ra định dạng bảng TSV (Tab-separated values) để copy dán vào Excel
 */
export function exportTimetableToTsv(
  timetable: TeacherTimetable,
  mode: TimetableMode = 'mon-sat',
  weekStartDate?: string
): string {
  const days = getDaysOfWeek(mode);
  const weekDates = weekStartDate ? getWeekDates(weekStartDate, mode) : null;

  const headers = ['Buổi', 'Tiết', 'Thời gian', ...days.map((d, idx) => {
    return weekDates ? `${d.shortLabel} (${weekDates[idx].displayDate})` : d.shortLabel;
  })];

  const rows: string[] = [headers.join('\t')];

  // Sáng 1-5
  for (let p = 1; p <= 5; p++) {
    const row = [
      p === 1 ? 'Sáng' : '',
      `Tiết ${p}`,
      PERIOD_HOURS[p] || '',
    ];
    for (const d of days) {
      const slot = timetable.slots[makeSlotKey(d.value, p)];
      row.push(slot?.className ? `${slot.className}-${slot.subjectName || 'Toán'}` : '');
    }
    rows.push(row.join('\t'));
  }

  // Chiều 6-10 (Tiết 1-5 Chiều)
  for (let p = 6; p <= 10; p++) {
    const periodInAfternoon = p - 5;
    const row = [
      p === 6 ? 'Chiều' : '',
      `Tiết ${periodInAfternoon}`,
      PERIOD_HOURS[p] || '',
    ];
    for (const d of days) {
      const slot = timetable.slots[makeSlotKey(d.value, p)];
      row.push(slot?.className ? `${slot.className}-${slot.subjectName || 'Toán'}` : '');
    }
    rows.push(row.join('\t'));
  }

  return rows.join('\n');
}

/**
 * Bộ dữ liệu mẫu thực tế trích xuất 100% chính xác từ 2 ảnh Thầy vừa gửi
 */
export const SAMPLE_TIMETABLE_SLOTS: Record<string, TimetableSlot> = {
  // Sáng:
  // Tiết 1: Thứ 2 (10A8-HĐTN-HN)
  '2_p1': { dayOfWeek: 2, period: 1, className: '10A8', subjectName: 'HĐTN-HN' },
  // Tiết 2: Thứ 3 (12B6-Toán), Thứ 5 (12B1-Toán)
  '3_p2': { dayOfWeek: 3, period: 2, className: '12B6', subjectName: 'Toán' },
  '5_p2': { dayOfWeek: 5, period: 2, className: '12B1', subjectName: 'Toán' },
  // Tiết 3: Thứ 2 (10A8-Toán), Thứ 3 (12B1-Toán), Thứ 4 (10A8-HĐTN-HN), Thứ 5 (12B6-Toán), Thứ 6 (10A8-Toán), Thứ 7 (10A8-Toán)
  '2_p3': { dayOfWeek: 2, period: 3, className: '10A8', subjectName: 'Toán' },
  '3_p3': { dayOfWeek: 3, period: 3, className: '12B1', subjectName: 'Toán' },
  '4_p3': { dayOfWeek: 4, period: 3, className: '10A8', subjectName: 'HĐTN-HN' },
  '5_p3': { dayOfWeek: 5, period: 3, className: '12B6', subjectName: 'Toán' },
  '6_p3': { dayOfWeek: 6, period: 3, className: '10A8', subjectName: 'Toán' },
  '7_p3': { dayOfWeek: 7, period: 3, className: '10A8', subjectName: 'Toán' },
  // Tiết 4: Thứ 2 (10A8-Toán), Thứ 3 (12B1-Toán), Thứ 5 (12B6-Toán), Thứ 6 (10A8-HĐTN-HN), Thứ 7 (10A8-HĐTN-HN)
  '2_p4': { dayOfWeek: 2, period: 4, className: '10A8', subjectName: 'Toán' },
  '3_p4': { dayOfWeek: 3, period: 4, className: '12B1', subjectName: 'Toán' },
  '5_p4': { dayOfWeek: 5, period: 4, className: '12B6', subjectName: 'Toán' },
  '6_p4': { dayOfWeek: 6, period: 4, className: '10A8', subjectName: 'HĐTN-HN' },
  '7_p4': { dayOfWeek: 7, period: 4, className: '10A8', subjectName: 'HĐTN-HN' },

  // Chiều (Tiết 6 = Tiết 1 Chiều, Tiết 7 = Tiết 2 Chiều, Tiết 8 = Tiết 3 Chiều):
  // Chiều Tiết 1 (p6): Thứ 3 (10A17-Toán), Thứ 5 (10A8-Ôn Toán)
  '3_p6': { dayOfWeek: 3, period: 6, className: '10A17', subjectName: 'Toán' },
  '5_p6': { dayOfWeek: 5, period: 6, className: '10A8', subjectName: 'Ôn Toán' },
  // Chiều Tiết 2 (p7): Thứ 3 (10A17-Toán), Thứ 5 (10A8-Ôn Toán)
  '3_p7': { dayOfWeek: 3, period: 7, className: '10A17', subjectName: 'Toán' },
  '5_p7': { dayOfWeek: 5, period: 7, className: '10A8', subjectName: 'Ôn Toán' },
  // Chiều Tiết 3 (p8): Thứ 3 (10A8-Ôn Toán), Thứ 6 (10A17-Toán), Thứ 7 (10A17-Toán)
  '3_p8': { dayOfWeek: 3, period: 8, className: '10A8', subjectName: 'Ôn Toán' },
  '6_p8': { dayOfWeek: 6, period: 8, className: '10A17', subjectName: 'Toán' },
  '7_p8': { dayOfWeek: 7, period: 8, className: '10A17', subjectName: 'Toán' },
};

/**
 * Lấy các slots của một tuần cụ thể. Nếu tuần đó chưa được chỉnh sửa riêng, trả về TKB chuẩn (slots)
 */
export function getTimetableSlotsForWeek(
  timetable: TeacherTimetable,
  weekNumber?: number
): Record<string, TimetableSlot> {
  if (!weekNumber) return timetable.slots || {};
  const weekKey = `w${weekNumber}`;
  if (timetable.weekSlots && timetable.weekSlots[weekKey] && Object.keys(timetable.weekSlots[weekKey]).length > 0) {
    return timetable.weekSlots[weekKey];
  }
  return timetable.slots || {};
}

/**
 * Lưu các slots cho một tuần cụ thể
 */
export function setTimetableSlotsForWeek(
  timetable: TeacherTimetable,
  weekNumber: number,
  slots: Record<string, TimetableSlot>
): TeacherTimetable {
  const weekKey = `w${weekNumber}`;
  const nextWeekSlots = {
    ...(timetable.weekSlots || {}),
    [weekKey]: slots,
  };
  return {
    ...timetable,
    weekSlots: nextWeekSlots,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Sao chép TKB từ một tuần nguồn sang một tuần đích (vd: Tuần 3 sang Tuần 4)
 */
export function copyTimetableFromWeekToWeek(
  timetable: TeacherTimetable,
  fromWeek: number,
  toWeek: number
): TeacherTimetable {
  const sourceSlots = getTimetableSlotsForWeek(timetable, fromWeek);
  const clonedSlots: Record<string, TimetableSlot> = JSON.parse(JSON.stringify(sourceSlots));
  return setTimetableSlotsForWeek(timetable, toWeek, clonedSlots);
}

/**
 * Sao chép TKB từ một tuần nguồn sang nhiều tuần đích
 */
export function copyTimetableWeekToRange(
  timetable: TeacherTimetable,
  fromWeek: number,
  targetWeeks: number[]
): TeacherTimetable {
  const sourceSlots = getTimetableSlotsForWeek(timetable, fromWeek);
  const nextWeekSlots = { ...(timetable.weekSlots || {}) };

  for (const w of targetWeeks) {
    nextWeekSlots[`w${w}`] = JSON.parse(JSON.stringify(sourceSlots));
  }

  return {
    ...timetable,
    weekSlots: nextWeekSlots,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Đặt TKB của một tuần làm TKB chuẩn chung cho toàn bộ các tuần trong học kỳ
 */
export function setWeekAsDefaultTimetable(
  timetable: TeacherTimetable,
  weekNumber: number
): TeacherTimetable {
  const currentSlots = getTimetableSlotsForWeek(timetable, weekNumber);
  const clonedSlots = JSON.parse(JSON.stringify(currentSlots));
  return {
    ...timetable,
    slots: clonedSlots,
    updatedAt: new Date().toISOString(),
  };
}

export const DEFAULT_TIMETABLE_MODE_KEY = (teacherId: string) =>
  `teacher_timetable_default_mode_${teacherId || 'guest'}`;

export function getTeacherDefaultTimetableMode(
  storage: Pick<Storage, 'getItem'>,
  teacherId: string
): TimetableMode {
  const saved = storage.getItem(DEFAULT_TIMETABLE_MODE_KEY(teacherId)) as TimetableMode | null;
  if (saved === 'mon-sat' || saved === 'mon-fri') return saved;
  return 'mon-fri'; // Mặc định là Thứ 2 - Thứ 6 (5 ngày) theo yêu cầu giáo viên
}

export function setTeacherDefaultTimetableMode(
  storage: Pick<Storage, 'setItem'>,
  teacherId: string,
  mode: TimetableMode
): void {
  storage.setItem(DEFAULT_TIMETABLE_MODE_KEY(teacherId), mode);
}

export function loadTeacherTimetable(
  storage: Pick<Storage, 'getItem'>,
  teacherId: string,
  teacherName: string,
  schoolYear: string,
  semester: 1 | 2 = 1
): TeacherTimetable {
  const preferredDefaultMode = getTeacherDefaultTimetableMode(storage, teacherId);

  const defaultTable: TeacherTimetable = {
    teacherId: teacherId || 'guest',
    teacherName: teacherName || 'Nguyễn Văn Sang',
    schoolYear: schoolYear || '2026-2027',
    semester,
    mode: preferredDefaultMode,
    weekStartDate: getMondayOfCurrentWeek(),
    slots: {},
    weekSlots: {},
    updatedAt: new Date().toISOString(),
  };

  const key = getTimetableStorageKey(teacherId, schoolYear, semester);
  try {
    const raw = storage.getItem(key);
    if (!raw) return defaultTable;
    const parsed = JSON.parse(raw) as TeacherTimetable;
    return {
      ...defaultTable,
      ...parsed,
      mode: parsed.mode || preferredDefaultMode,
      weekStartDate: parsed.weekStartDate || getMondayOfCurrentWeek(),
      slots: parsed.slots || {},
      weekSlots: parsed.weekSlots || {},
    };
  } catch {
    return defaultTable;
  }
}

export function saveTeacherTimetable(
  storage: Pick<Storage, 'setItem'>,
  timetable: TeacherTimetable
): void {
  const key = getTimetableStorageKey(timetable.teacherId, timetable.schoolYear, timetable.semester);
  storage.setItem(key, JSON.stringify({ ...timetable, updatedAt: new Date().toISOString() }));
}

/**
 * Lọc danh sách các tiết dạy hôm nay của giáo viên (theo tuần cụ thể hoặc TKB mặc định)
 */
export function getTodayTeachingSlots(
  timetable: TeacherTimetable,
  currentDate: Date = new Date(),
  weekNumber?: number
): TimetableSlot[] {
  const jsDay = currentDate.getDay();
  const dayOfWeek = jsDay === 0 ? 8 : jsDay + 1; // 2 -> 8

  const activeSlots = getTimetableSlotsForWeek(timetable, weekNumber);

  const todaySlots: TimetableSlot[] = [];
  for (let p = 1; p <= 10; p++) {
    const key = makeSlotKey(dayOfWeek, p);
    const slot = activeSlots[key];
    if (slot && slot.className?.trim()) {
      todaySlots.push(slot);
    }
  }

  return todaySlots;
}

/**
 * Xuất file Excel Thời khóa biểu giảng dạy cá nhân chuẩn Sư phạm
 */
export function exportTeacherTimetableToExcel(
  timetable: TeacherTimetable,
  mode: TimetableMode = 'mon-sat',
  weekStartDate?: string
): void {
  const wb = XLSX.utils.book_new();

  const days = getDaysOfWeek(mode);
  const weekDates = weekStartDate ? getWeekDates(weekStartDate, mode) : null;

  const fontTitle = { name: 'Times New Roman', sz: 14, bold: true };
  const fontHeader = { name: 'Times New Roman', sz: 11, bold: true };
  const fontBody = { name: 'Times New Roman', sz: 11 };
  const fontBodyBold = { name: 'Times New Roman', sz: 11, bold: true };
  const fontAfternoon = { name: 'Times New Roman', sz: 11, color: { rgb: 'E11D48' } }; // Màu đỏ cam chiều

  const borderThin = {
    top: { style: 'thin', color: { rgb: '94A3B8' } },
    bottom: { style: 'thin', color: { rgb: '94A3B8' } },
    left: { style: 'thin', color: { rgb: '94A3B8' } },
    right: { style: 'thin', color: { rgb: '94A3B8' } },
  };

  const headerDayCols = days.map((d, idx) => {
    return weekDates ? `${d.shortLabel} (${weekDates[idx].displayDate})` : d.label;
  });

  const wsData: (string | null)[][] = [
    ['BỘ QUỐC PHÒNG', null, null, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],
    ['TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP', null, null, 'Độc lập - Tự do - Hạnh phúc'],
    [null],
    [`THỜI KHÓA BIỂU GIẢNG DẠY CÁ NHÂN (HỌC KỲ ${timetable.semester})`],
    [
      `Giáo viên: ${timetable.teacherName} — Năm học: ${timetable.schoolYear}${
        weekStartDate ? ` — Tuần từ: ${weekStartDate}` : ''
      }`,
    ],
    [null],
    ['Buổi', 'Tiết', 'Thời gian', ...headerDayCols],
  ];

  // Buổi sáng: Tiết 1 - 5
  for (let p = 1; p <= 5; p++) {
    const row: (string | null)[] = [
      p === 1 ? 'SÁNG' : null,
      `Tiết ${p}`,
      PERIOD_HOURS[p] || '',
    ];
    for (const d of days) {
      const slot = timetable.slots[makeSlotKey(d.value, p)];
      row.push(
        slot?.className
          ? `${slot.className}-${slot.subjectName || 'Toán'}${slot.room ? ` (${slot.room})` : ''}`
          : ''
      );
    }
    wsData.push(row);
  }

  // Buổi chiều: Tiết 6 - 10 (Hiển thị Tiết 1 - 5 Chiều)
  for (let p = 6; p <= 10; p++) {
    const periodInAfternoon = p - 5;
    const row: (string | null)[] = [
      p === 6 ? 'CHIỀU' : null,
      `Tiết ${periodInAfternoon}`,
      PERIOD_HOURS[p] || '',
    ];
    for (const d of days) {
      const slot = timetable.slots[makeSlotKey(d.value, p)];
      row.push(
        slot?.className
          ? `${slot.className}-${slot.subjectName || 'Toán'}${slot.room ? ` (${slot.room})` : ''}`
          : ''
      );
    }
    wsData.push(row);
  }

  // Footer chữ ký sư phạm
  wsData.push([null]);
  wsData.push([
    null,
    null,
    null,
    null,
    `Thái Nguyên, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`,
  ]);
  wsData.push([null, null, 'TRƯỞNG KHOA', null, 'GIÁO VIÊN GIẢNG DẠY']);
  wsData.push([null]);
  wsData.push([null]);
  wsData.push([null]);
  wsData.push([null, null, 'Phạm Thị Thu Trang', null, timetable.teacherName]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 10 }, // Buổi
    { wch: 10 }, // Tiết
    { wch: 16 }, // Thời gian
    ...days.map(() => ({ wch: 18 })),
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'TKB_Ca_Nhan');
  const fileName = `TKB_GV_${timetable.teacherName.replace(/\s+/g, '_')}_HK${timetable.semester}_${mode}_${timetable.schoolYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
