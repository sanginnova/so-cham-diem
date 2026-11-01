import {
  TimetableMode,
  makeSlotKey,
  getDaysOfWeek,
  getMondayOfCurrentWeek,
  extractDayColumnsFromRow,
  matchPeriodFromTime,
  detectTimetableModeFromText,
} from './teacherTimetable';

export interface ClassTimetableSlot {
  dayOfWeek: number; // 2..7
  period: number; // 1..10
  subjectName: string; // Tên môn học: Toán, Ngữ văn, Tiếng Anh...
  teacherName?: string; // Tên giáo viên dạy môn này: Thầy Sang, Cô Mai...
  room?: string; // Phòng học: P.201, Lab...
  note?: string;
}

export interface ClassTimetable {
  classId: string;
  className: string;
  schoolYear: string;
  semester: 1 | 2;
  mode?: TimetableMode;
  weekStartDate?: string;
  currentWeekNumber?: number;
  slots: Record<string, ClassTimetableSlot>;
  weekSlots?: Record<string, Record<string, ClassTimetableSlot>>;
  updatedAt?: string;
}

export const COMMON_HIGH_SCHOOL_SUBJECTS = [
  'Chào cờ',
  'Toán',
  'Ngữ văn',
  'Tiếng Anh',
  'Vật lí',
  'Hóa học',
  'Sinh học',
  'Lịch sử',
  'Địa lí',
  'Tin học',
  'GD Kinh tế & Pháp luật',
  'GDKT-PL',
  'CĐ GDKT-PL',
  'CĐ Địa lí',
  'CĐ Ngữ văn',
  'CĐ Lịch sử',
  'CĐ Toán',
  'Công nghệ',
  'Giáo dục Thể chất',
  'GDQP-AN',
  'Hoạt động trải nghiệm, hướng nghiệp',
  'HĐTN-HN',
  'Sinh hoạt lớp',
  'Nghề phổ thông / Chuyên ngành',
  'Ôn thi tốt nghiệp',
];

/**
 * Thời khóa biểu học sinh lớp chủ nhiệm 12B4 (chuẩn thực tế theo mẫu Thầy gửi):
 * - Sáng (Tiết 1 -> 5):
 *   + Tiết 1: Thứ 2 (HĐTN-HN), Thứ 3 (HĐTN-HN), Thứ 4 (Địa lí), Thứ 5 (Toán), Thứ 6 (Ngữ văn)
 *   + Tiết 2: Thứ 2 (Địa lí), Thứ 3 (Toán), Thứ 4 (Lịch sử), Thứ 5 (Toán), Thứ 6 (Ngữ văn)
 *   + Tiết 3: Thứ 2 (Lịch sử), Thứ 3 (Ngữ văn), Thứ 4 (Vật lí), Thứ 5 (GDKT-PL), Thứ 6 (Hóa học)
 *   + Tiết 4: Thứ 2 (Vật lí), Thứ 3 (GDKT-PL), Thứ 4 (Hóa học), Thứ 5 (CĐ GDKT-PL), Thứ 6 (HĐTN-HN)
 *   + Tiết 5: Thứ 3 (CĐ Địa lí), Thứ 5 (CĐ Ngữ văn)
 * - Chiều: Trống
 */
export const SAMPLE_12B4_CLASS_TIMETABLE_SLOTS: Record<string, ClassTimetableSlot> = {
  // Tiết 1 (7h15-8h00):
  '2_p1': { dayOfWeek: 2, period: 1, subjectName: 'HĐTN-HN', teacherName: 'Thầy Sang' },
  '3_p1': { dayOfWeek: 3, period: 1, subjectName: 'HĐTN-HN', teacherName: 'Thầy Sang' },
  '4_p1': { dayOfWeek: 4, period: 1, subjectName: 'Địa lí', teacherName: '' },
  '5_p1': { dayOfWeek: 5, period: 1, subjectName: 'Toán', teacherName: 'Thầy Sang' },
  '6_p1': { dayOfWeek: 6, period: 1, subjectName: 'Ngữ văn', teacherName: '' },

  // Tiết 2 (8h05-8h50):
  '2_p2': { dayOfWeek: 2, period: 2, subjectName: 'Địa lí', teacherName: '' },
  '3_p2': { dayOfWeek: 3, period: 2, subjectName: 'Toán', teacherName: 'Thầy Sang' },
  '4_p2': { dayOfWeek: 4, period: 2, subjectName: 'Lịch sử', teacherName: '' },
  '5_p2': { dayOfWeek: 5, period: 2, subjectName: 'Toán', teacherName: 'Thầy Sang' },
  '6_p2': { dayOfWeek: 6, period: 2, subjectName: 'Ngữ văn', teacherName: '' },

  // Tiết 3 (9h00-9h45):
  '2_p3': { dayOfWeek: 2, period: 3, subjectName: 'Lịch sử', teacherName: '' },
  '3_p3': { dayOfWeek: 3, period: 3, subjectName: 'Ngữ văn', teacherName: '' },
  '4_p3': { dayOfWeek: 4, period: 3, subjectName: 'Vật lí', teacherName: '' },
  '5_p3': { dayOfWeek: 5, period: 3, subjectName: 'GDKT-PL', teacherName: '' },
  '6_p3': { dayOfWeek: 6, period: 3, subjectName: 'Hóa học', teacherName: '' },

  // Tiết 4 (9h50-10h35):
  '2_p4': { dayOfWeek: 2, period: 4, subjectName: 'Vật lí', teacherName: '' },
  '3_p4': { dayOfWeek: 3, period: 4, subjectName: 'GDKT-PL', teacherName: '' },
  '4_p4': { dayOfWeek: 4, period: 4, subjectName: 'Hóa học', teacherName: '' },
  '5_p4': { dayOfWeek: 5, period: 4, subjectName: 'CĐ GDKT-PL', teacherName: '' },
  '6_p4': { dayOfWeek: 6, period: 4, subjectName: 'HĐTN-HN', teacherName: 'Thầy Sang' },

  // Tiết 5 (10h40-11h25):
  '3_p5': { dayOfWeek: 3, period: 5, subjectName: 'CĐ Địa lí', teacherName: '' },
  '5_p5': { dayOfWeek: 5, period: 5, subjectName: 'CĐ Ngữ văn', teacherName: '' },
};

export const SAMPLE_12B4_CLASS_TIMETABLE_RAW_TSV = `12B4\t\t\t\t\t\t\t\t
Tiết\tThời gian\tThứ 2\tThứ 3\tThứ 4\tThứ 5\tThứ 6\tThứ 7\tChủ nhật
Tiết 1\t7h15-8h00\tHĐTN-HN\tHĐTN-HN\tĐịa lí\tToán\tNgữ văn\t\t
Tiết 2\t8h05-8h50\tĐịa lí\tToán\tLịch sử\tToán\tNgữ văn\t\t
Tiết 3\t9h00-9h45\tLịch sử\tNgữ văn\tVật lí\tGDKT-PL\tHóa học\t\t
Tiết 4\t9h50-10h35\tVật lí\tGDKT-PL\tHóa học\tCĐ GDKT-PL\tHĐTN-HN\t\t
Tiết 5\t10h40-11h25\t\tCĐ Địa lí\t\tCĐ Ngữ văn\t\t\t
Tiết 1\t13h30-14h15\t\t\t\t\t\t\t
Tiết 2\t14h20-15h05\t\t\t\t\t\t\t
Tiết 3\t15h15-16h00\t\t\t\t\t\t\t
Tiết 4\t16h05-16h50\t\t\t\t\t\t\t
Tiết 5\t16h55-17h40\t\t\t\t\t\t\t`;

export function getClassTimetableStorageKey(classId: string, schoolYear: string, semester: number): string {
  return `homeroom_class_timetable_v1_${classId}_${schoolYear}_s${semester}`;
}

export function parseClassTimetableCell(rawText: string): { subjectName: string; teacherName?: string; room?: string } {
  if (!rawText) return { subjectName: '' };
  let mainText = rawText.trim();
  let room: string | undefined;
  let teacherName: string | undefined;

  // Tách phòng học nếu có: (P.201) hoặc (Phòng 201)
  const roomMatch = mainText.match(/\((P\.?[^\)]+)\)/i) || mainText.match(/-\s*(P\.?\s*\d+)/i);
  if (roomMatch) {
    room = roomMatch[1].trim();
    mainText = mainText.replace(roomMatch[0], '').trim();
  }

  // Tách giáo viên trong ngoặc đơn: "Toán (Thầy Sang)", "Tiếng Anh (Cô Hoa)"
  const teacherParenMatch = mainText.match(/\(([^\)]+)\)/);
  if (teacherParenMatch) {
    teacherName = teacherParenMatch[1].trim();
    mainText = mainText.replace(teacherParenMatch[0], '').trim();
  }

  // Bảo toàn các môn học có gạch nối chuẩn: HĐTN-HN, GDKT-PL, GDQP-AN, CĐ GDKT-PL...
  if (/^(?:cđ\s*)?(?:hđtn|hdtn|gdkt|gdqp)[-–](?:hn|pl|an)$/i.test(mainText)) {
    return { subjectName: mainText, teacherName, room };
  }

  // Tách bằng dấu gạch ngang có khoảng trắng: "Toán - Thầy Sang", "Ngữ văn - Cô Mai"
  const spaceDashMatch = mainText.match(/^(.+?)\s+[-–]\s+(.+)$/);
  if (!teacherName && spaceDashMatch) {
    const part1 = spaceDashMatch[1].trim();
    const part2 = spaceDashMatch[2].trim();
    // Nếu part2 là viết tắt đuôi môn học thì ghép lại
    if (/^(?:hn|pl|an)$/i.test(part2)) {
      return { subjectName: `${part1}-${part2}`, teacherName, room };
    }
    return { subjectName: part1, teacherName: part2, room };
  }

  // Nếu là gạch nối liền nhưng phần sau có từ khóa giáo viên: "Toán-Thầy Sang"
  const teacherDashMatch = mainText.match(/^(.+?)[-–]((?:thầy|cô|gv)\s+.+)$/i);
  if (!teacherName && teacherDashMatch) {
    return {
      subjectName: teacherDashMatch[1].trim(),
      teacherName: teacherDashMatch[2].trim(),
      room,
    };
  }

  return { subjectName: mainText, teacherName, room };
}

export function sanitizeClassSlots(slots: Record<string, ClassTimetableSlot>): Record<string, ClassTimetableSlot> {
  const clean: Record<string, ClassTimetableSlot> = {};
  if (!slots) return clean;
  for (const [k, s] of Object.entries(slots)) {
    if (!s || !s.subjectName || !s.subjectName.trim()) continue;
    if (s.period < 1 || s.period > 10) continue;
    if (s.dayOfWeek < 2 || s.dayOfWeek > 7) continue;
    clean[k] = {
      dayOfWeek: Number(s.dayOfWeek),
      period: Number(s.period),
      subjectName: s.subjectName.trim(),
      teacherName: (s.teacherName || '').trim(),
      room: (s.room || '').trim(),
      note: (s.note || '').trim(),
    };
  }
  return clean;
}

export function parseClassTimetableFromText(
  text: string,
  mode: TimetableMode = 'mon-fri'
): Record<string, ClassTimetableSlot> {
  const result: Record<string, ClassTimetableSlot> = {};
  if (!text || !text.trim()) return result;

  const rawLines = text.split(/\r?\n/).filter(l => l.replace(/[\t\s]/g, '').length > 0);
  if (rawLines.length === 0) return result;

  let activeDayMap: Record<number, number> | null = null;
  let currentSession: 'morning' | 'afternoon' = 'morning';
  let lastPeriod = 0;

  for (const line of rawLines) {
    let cols = line.split('\t').map(c => c.trim());
    if (cols.length === 1 && line.includes('|')) {
      cols = line.split('|').map(c => c.trim()).filter(Boolean);
    } else if (cols.length === 1 && line.includes('  ')) {
      cols = line.split(/\s{2,}/).map(c => c.trim());
    }

    if (cols.every(c => !c)) continue;

    const hasSang = cols.some(c => /^sáng$/i.test(c));
    const hasChieu = cols.some(c => /^chiều$/i.test(c));
    if (hasChieu) currentSession = 'afternoon';
    else if (hasSang) currentSession = 'morning';

    const detectedDayMap = extractDayColumnsFromRow(cols);
    if (detectedDayMap) {
      activeDayMap = detectedDayMap;
      continue;
    }

    let period: number | null = null;
    for (const c of cols) {
      const match = matchPeriodFromTime(c);
      if (match !== null) {
        period = match;
        break;
      }
    }

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

    if (period === null) {
      if (!activeDayMap) {
        // Chưa gặp dòng tiêu đề Thứ và không có số tiết/giờ => Bỏ qua dòng tiêu đề lớp/bảng như "12B4"
        continue;
      }
      if (lastPeriod === 0) {
        period = currentSession === 'afternoon' ? 6 : 1;
      } else if (lastPeriod < 10) {
        period = lastPeriod + 1;
      } else {
        continue;
      }
    }

    lastPeriod = period;

    if (activeDayMap) {
      for (const [dayStr, colIdx] of Object.entries(activeDayMap)) {
        const day = parseInt(dayStr, 10);
        if (mode === 'mon-fri' && day > 6) continue;
        const cellValue = cols[colIdx] || '';
        const parsed = parseClassTimetableCell(cellValue);
        if (parsed.subjectName) {
          result[makeSlotKey(day, period)] = {
            dayOfWeek: day,
            period,
            subjectName: parsed.subjectName,
            teacherName: parsed.teacherName || '',
            room: parsed.room || '',
          };
        }
      }
    } else {
      const maxDays = mode === 'mon-fri' ? 5 : 6;
      let dataStartCol = 0;
      while (dataStartCol < cols.length) {
        const val = cols[dataStartCol];
        if (!val || /^(sáng|chiều|tiết|\d{1,2}|.*h.*-.*h.*)$/i.test(val)) {
          dataStartCol++;
        } else {
          break;
        }
      }
      for (let dayOffset = 0; dayOffset < maxDays; dayOffset++) {
        const day = 2 + dayOffset;
        const colIdx = dataStartCol + dayOffset;
        if (colIdx >= cols.length) break;
        const cellValue = cols[colIdx] || '';
        const parsed = parseClassTimetableCell(cellValue);
        if (parsed.subjectName) {
          result[makeSlotKey(day, period)] = {
            dayOfWeek: day,
            period,
            subjectName: parsed.subjectName,
            teacherName: parsed.teacherName || '',
            room: parsed.room || '',
          };
        }
      }
    }
  }

  return sanitizeClassSlots(result);
}

export function loadClassTimetable(
  storage: Pick<Storage, 'getItem'>,
  classId: string,
  className: string,
  schoolYear: string,
  semester: 1 | 2 = 1
): ClassTimetable {
  const is12B4 = (classId || '').includes('12B4') || (className || '').includes('12B4');
  const defaultSlots = is12B4 ? SAMPLE_12B4_CLASS_TIMETABLE_SLOTS : {};

  const defaultTable: ClassTimetable = {
    classId,
    className: className || (is12B4 ? '12B4' : 'Lớp Chủ Nhiệm'),
    schoolYear: schoolYear || '2026-2027',
    semester,
    mode: 'mon-fri',
    weekStartDate: getMondayOfCurrentWeek(),
    slots: defaultSlots,
    weekSlots: {},
    updatedAt: new Date().toISOString(),
  };

  const key = getClassTimetableStorageKey(classId, schoolYear || '2026-2027', semester);
  try {
    let raw = storage.getItem(key);
    if (!raw && schoolYear !== '2026-2027') {
      raw = storage.getItem(getClassTimetableStorageKey(classId, '2026-2027', semester));
    }
    if (!raw) return defaultTable;
    const parsed = JSON.parse(raw) as ClassTimetable;
    const loadedSlots = sanitizeClassSlots(parsed.slots || {});
    const finalSlots = Object.keys(loadedSlots).length > 0 ? loadedSlots : defaultSlots;
    return {
      ...defaultTable,
      ...parsed,
      slots: finalSlots,
      weekSlots: parsed.weekSlots || {},
    };
  } catch {
    return defaultTable;
  }
}

export function saveClassTimetable(
  storage: Pick<Storage, 'setItem'>,
  timetable: ClassTimetable
): void {
  const key = getClassTimetableStorageKey(timetable.classId, timetable.schoolYear || '2026-2027', timetable.semester);
  storage.setItem(key, JSON.stringify({ ...timetable, updatedAt: new Date().toISOString() }));
}

export async function exportClassTimetableToExcel(
  timetable: ClassTimetable,
  mode: TimetableMode = 'mon-fri',
  activeWeekNumber: number = 1
): Promise<void> {
  const XLSX = (await import('xlsx-js-style')).default;
  const days = getDaysOfWeek(mode);
  const weekSlots = timetable.weekSlots?.[`w${activeWeekNumber}`] || timetable.slots || {};

  const rows: any[] = [];
  rows.push([`THỜI KHÓA BIỂU LỚP: ${timetable.className.toUpperCase()}`]);
  rows.push([`Năm học: ${timetable.schoolYear} · Học kỳ ${timetable.semester} · Tuần ${activeWeekNumber}`]);
  rows.push([]);

  const headers = ['Buổi', 'Tiết', ...days.map(d => d.label)];
  rows.push(headers);

  // Buổi Sáng
  for (let p = 1; p <= 5; p++) {
    const row = [
      p === 1 ? 'Sáng' : '',
      `Tiết ${p}`,
      ...days.map(d => {
        const slot = weekSlots[makeSlotKey(d.value, p)];
        if (!slot) return '';
        return slot.teacherName ? `${slot.subjectName} (${slot.teacherName})` : slot.subjectName;
      }),
    ];
    rows.push(row);
  }

  // Buổi Chiều
  for (let p = 6; p <= 10; p++) {
    const row = [
      p === 6 ? 'Chiều' : '',
      `Tiết ${p - 5} (Tiết ${p})`,
      ...days.map(d => {
        const slot = weekSlots[makeSlotKey(d.value, p)];
        if (!slot) return '';
        return slot.teacherName ? `${slot.subjectName} (${slot.teacherName})` : slot.subjectName;
      }),
    ];
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'TKB_Lop');
  const fileName = `TKB_Lop_${timetable.className.replace(/\s+/g, '_')}_HK${timetable.semester}_Tuan${activeWeekNumber}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
