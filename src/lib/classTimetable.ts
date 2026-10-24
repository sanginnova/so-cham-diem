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
  'Công nghệ',
  'Giáo dục Thể chất',
  'GDQP-AN',
  'Hoạt động trải nghiệm, hướng nghiệp',
  'Sinh hoạt lớp',
  'Nghề phổ thông / Chuyên ngành',
  'Ôn thi tốt nghiệp',
];

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

  // Tách bằng dấu gạch ngang: "Toán - Thầy Sang", "Ngữ văn - Cô Mai"
  const dashIndex = mainText.indexOf('-');
  if (!teacherName && dashIndex > 0) {
    const part1 = mainText.slice(0, dashIndex).trim();
    const part2 = mainText.slice(dashIndex + 1).trim();
    return { subjectName: part1, teacherName: part2, room };
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
  const defaultTable: ClassTimetable = {
    classId,
    className: className || 'Lớp Chủ Nhiệm',
    schoolYear: schoolYear || '2026-2027',
    semester,
    mode: 'mon-fri',
    weekStartDate: getMondayOfCurrentWeek(),
    slots: {},
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
    return {
      ...defaultTable,
      ...parsed,
      slots: sanitizeClassSlots(parsed.slots || {}),
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
