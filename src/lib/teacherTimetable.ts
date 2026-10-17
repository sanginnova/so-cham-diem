import XLSX from 'xlsx-js-style';

export interface TimetableSlot {
  dayOfWeek: number; // 2 -> 7 (Thứ 2 -> Thứ 7), 8 (Chủ nhật)
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
  slots: Record<string, TimetableSlot>; // Key: `${dayOfWeek}_p${period}`
  updatedAt: string;
}

export const DAYS_OF_WEEK = [
  { value: 2, label: 'Thứ Hai', shortLabel: 'Thứ 2' },
  { value: 3, label: 'Thứ Ba', shortLabel: 'Thứ 3' },
  { value: 4, label: 'Thứ Tư', shortLabel: 'Thứ 4' },
  { value: 5, label: 'Thứ Năm', shortLabel: 'Thứ 5' },
  { value: 6, label: 'Thứ Sáu', shortLabel: 'Thứ 6' },
  { value: 7, label: 'Thứ Bảy', shortLabel: 'Thứ 7' },
];

export const PERIOD_HOURS: Record<number, string> = {
  1: '07:00 - 07:45',
  2: '07:50 - 08:35',
  3: '08:45 - 09:30',
  4: '09:40 - 10:25',
  5: '10:30 - 11:15',
  6: '13:00 - 13:45',
  7: '13:50 - 14:35',
  8: '14:45 - 15:30',
  9: '15:40 - 16:25',
  10: '16:30 - 17:15',
};

export function makeSlotKey(dayOfWeek: number, period: number): string {
  return `${dayOfWeek}_p${period}`;
}

export function getTimetableStorageKey(teacherId: string, schoolYear: string, semester: number): string {
  return `teacher_timetable_v1_${teacherId || 'guest'}_${schoolYear}_s${semester}`;
}

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
  // getDay(): 0 = CN, 1 = T2, 2 = T3, ..., 6 = T7
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
export function exportTeacherTimetableToExcel(timetable: TeacherTimetable): void {
  const wb = XLSX.utils.book_new();

  const fontTitle = { name: 'Times New Roman', sz: 14, bold: true };
  const fontHeader = { name: 'Times New Roman', sz: 11, bold: true };
  const fontBody = { name: 'Times New Roman', sz: 11 };
  const fontBodyBold = { name: 'Times New Roman', sz: 11, bold: true };
  const borderThin = {
    top: { style: 'thin', color: { rgb: '94A3B8' } },
    bottom: { style: 'thin', color: { rgb: '94A3B8' } },
    left: { style: 'thin', color: { rgb: '94A3B8' } },
    right: { style: 'thin', color: { rgb: '94A3B8' } },
  };

  const wsData: (string | null)[][] = [
    ['BỘ QUỐC PHÒNG', null, null, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],
    ['TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP', null, null, 'Độc lập - Tự do - Hạnh phúc'],
    [null],
    [`THỜI KHÓA BIỂU GIẢNG DẠY CÁ NHÂN (HỌC KỲ ${timetable.semester})`],
    [`Giáo viên: ${timetable.teacherName} — Năm học: ${timetable.schoolYear}`],
    [null],
    ['Buổi', 'Tiết', 'Thời gian', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'],
  ];

  // Buổi sáng: Tiết 1 - 5
  for (let p = 1; p <= 5; p++) {
    const row: (string | null)[] = [
      p === 1 ? 'SÁNG' : null,
      `Tiết ${p}`,
      PERIOD_HOURS[p] || '',
    ];
    for (let d = 2; d <= 7; d++) {
      const slot = timetable.slots[makeSlotKey(d, p)];
      row.push(slot?.className ? `${slot.className} (${slot.subjectName || 'Toán'})${slot.room ? ` - ${slot.room}` : ''}` : '—');
    }
    wsData.push(row);
  }

  // Buổi chiều: Tiết 6 - 10
  for (let p = 6; p <= 10; p++) {
    const row: (string | null)[] = [
      p === 6 ? 'CHIỀU' : null,
      `Tiết ${p}`,
      PERIOD_HOURS[p] || '',
    ];
    for (let d = 2; d <= 7; d++) {
      const slot = timetable.slots[makeSlotKey(d, p)];
      row.push(slot?.className ? `${slot.className} (${slot.subjectName || 'Toán'})${slot.room ? ` - ${slot.room}` : ''}` : '—');
    }
    wsData.push(row);
  }

  // Footer chữ ký
  wsData.push([null]);
  wsData.push([null, null, null, null, null, null, `Thái Nguyên, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`]);
  wsData.push([null, null, 'TRƯỞNG KHOA', null, null, null, 'GIÁO VIÊN GIẢNG DẠY']);
  wsData.push([null]);
  wsData.push([null]);
  wsData.push([null]);
  wsData.push([null, null, 'Phạm Thị Thu Trang', null, null, null, timetable.teacherName]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws['!cols'] = [
    { wch: 10 }, // Buổi
    { wch: 10 }, // Tiết
    { wch: 16 }, // Thời gian
    { wch: 20 }, // Thứ 2
    { wch: 20 }, // Thứ 3
    { wch: 20 }, // Thứ 4
    { wch: 20 }, // Thứ 5
    { wch: 20 }, // Thứ 6
    { wch: 20 }, // Thứ 7
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'TKB_Ca_Nhan');
  const fileName = `TKB_GV_${timetable.teacherName.replace(/\s+/g, '_')}_HK${timetable.semester}_${timetable.schoolYear}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
