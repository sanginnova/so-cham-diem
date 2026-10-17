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
  weekStartDate?: string; // YYYY-MM-DD (Ngày Thứ 2 bắt đầu tuần)
  slots: Record<string, TimetableSlot>; // Key: `${dayOfWeek}_p${period}`
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
  const clean = rawText.trim();
  if (!clean || clean === '—' || clean === '-') {
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
 * Phân tích chuỗi Copy-Paste (dạng Tab-separated từ Excel hoặc dòng xuống) thành ma trận slots
 */
export function parseTimetableFromText(
  text: string,
  mode: TimetableMode = 'mon-sat'
): Record<string, TimetableSlot> {
  const result: Record<string, TimetableSlot> = {};
  if (!text || !text.trim()) return result;

  const targetDays = mode === 'mon-fri' ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7];
  const rawLines = text.split(/\r?\n/).filter(l => l.length > 0);
  const dataLines = rawLines.filter(line => {
    const lower = line.toLowerCase();
    // Bỏ qua dòng header nếu có
    return !(lower.includes('thứ') || lower.includes('thu') || (lower.includes('buổi') && lower.includes('tiết')));
  });

  let currentPeriod = 1;
  for (const line of dataLines) {
    if (currentPeriod > 10) break;

    // Tách bằng Tab (\t) nếu từ Excel, hoặc phân tách bằng 2 dấu cách trở lên / dấu |
    let cols = line.split('\t').map(c => c.trim());
    if (cols.length === 1 && line.includes('|')) {
      cols = line.split('|').map(c => c.trim()).filter(Boolean);
    } else if (cols.length === 1 && line.includes('  ')) {
      cols = line.split(/\s{2,}/).map(c => c.trim());
    }

    // Bỏ qua dòng rỗng hoàn toàn
    if (cols.every(c => !c)) continue;

    // Thông minh loại bỏ các cột Buổi, Tiết, Thời gian ở đầu
    let cellCols = [...cols];
    // 1. Cột Buổi
    if (cellCols.length > 0 && /^(sáng|chiều|buổi)$/i.test(cellCols[0])) {
      cellCols.shift();
    }
    // 2. Cột Tiết
    if (cellCols.length > 0 && /^(tiết\s*\d+|\d+)$/i.test(cellCols[0])) {
      cellCols.shift();
    }
    // 3. Cột Giờ / Thời gian (vd "7h15-8h00", "07:15-08:00")
    if (cellCols.length > 0 && (/\d+h\d*|\d{1,2}:\d{2}/i.test(cellCols[0]))) {
      cellCols.shift();
    }

    // Gán dữ liệu vào từng Thứ của tiết hiện tại
    for (let i = 0; i < targetDays.length; i++) {
      const d = targetDays[i];
      const rawCell = cellCols[i] || '';
      const parsed = parseTimetableCell(rawCell);
      if (parsed.className) {
        const key = makeSlotKey(d, currentPeriod);
        result[key] = {
          dayOfWeek: d,
          period: currentPeriod,
          className: parsed.className,
          subjectName: parsed.subjectName,
          room: parsed.room || '',
        };
      }
    }

    currentPeriod++;
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

export function loadTeacherTimetable(
  storage: Pick<Storage, 'getItem'>,
  teacherId: string,
  teacherName: string,
  schoolYear: string,
  semester: 1 | 2 = 1
): TeacherTimetable {
  const defaultTable: TeacherTimetable = {
    teacherId: teacherId || 'guest',
    teacherName: teacherName || 'Nguyễn Văn Sang',
    schoolYear: schoolYear || '2026-2027',
    semester,
    mode: 'mon-sat',
    weekStartDate: getMondayOfCurrentWeek(),
    slots: {},
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
      mode: parsed.mode || 'mon-sat',
      weekStartDate: parsed.weekStartDate || getMondayOfCurrentWeek(),
      slots: parsed.slots || {},
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
 * Lọc danh sách các tiết dạy hôm nay của giáo viên
 */
export function getTodayTeachingSlots(
  timetable: TeacherTimetable,
  currentDate: Date = new Date()
): TimetableSlot[] {
  const jsDay = currentDate.getDay();
  const dayOfWeek = jsDay === 0 ? 8 : jsDay + 1; // 2 -> 8

  const todaySlots: TimetableSlot[] = [];
  for (let p = 1; p <= 10; p++) {
    const key = makeSlotKey(dayOfWeek, p);
    const slot = timetable.slots[key];
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
