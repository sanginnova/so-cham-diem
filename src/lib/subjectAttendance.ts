import XLSX from 'xlsx-js-style';
import type { Student } from '../types';

export type AttendanceStatus = 'present' | 'excused' | 'unexcused' | 'late' | 'truant';

export interface AttendanceStatusInfo {
  status: AttendanceStatus;
  label: string;
  short: string;
  badgeClass: string;
  buttonClass: string;
}

export const ATTENDANCE_STATUSES: Record<AttendanceStatus, AttendanceStatusInfo> = {
  present: {
    status: 'present',
    label: 'Có mặt',
    short: 'CM',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  excused: {
    status: 'excused',
    label: 'Vắng có phép',
    short: 'P',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  unexcused: {
    status: 'unexcused',
    label: 'Vắng không phép',
    short: 'KP',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800',
    buttonClass: 'bg-rose-600 hover:bg-rose-700 text-white',
  },
  late: {
    status: 'late',
    label: 'Đi muộn',
    short: 'M',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    buttonClass: 'bg-purple-600 hover:bg-purple-700 text-white',
  },
  truant: {
    status: 'truant',
    label: 'Bỏ tiết',
    short: 'BT',
    badgeClass: 'bg-red-200 text-red-900 dark:bg-red-950/90 dark:text-red-300 border-red-400 dark:border-red-800',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
};

export interface StudentAttendanceEntry {
  status: AttendanceStatus;
  note?: string;
}

export interface SubjectAttendanceSession {
  id: string; // YYYY-MM-DD_p[period]
  date: string; // YYYY-MM-DD
  periodNumber: number; // 1 - 10
  lessonTitle?: string;
  records: Record<string, StudentAttendanceEntry>; // studentId -> status & note
  updatedAt: string;
}

export interface SubjectAttendanceBook {
  classId: string;
  teacherId: string;
  subjectName: string;
  schoolYear: string;
  totalPlannedPeriods?: number; // Mặc định 45 hoặc 90 tiết
  sessions: Record<string, SubjectAttendanceSession>; // sessionId -> session
  updatedAt: string;
}

export function makeSessionId(date: string, periodNumber: number): string {
  return `${date}_p${periodNumber}`;
}

export function getAttendanceStorageKey(uid: string, classId: string): string {
  return `subject_attendance_v1_${uid}_${classId}`;
}

export function readDeviceSubjectAttendance(
  storage: Pick<Storage, 'getItem'>,
  uid: string,
  classId: string,
  subjectName: string = 'Toán',
  schoolYear: string = '2026-2027'
): SubjectAttendanceBook {
  if (!uid || !classId) {
    return {
      classId,
      teacherId: uid,
      subjectName,
      schoolYear,
      totalPlannedPeriods: 45,
      sessions: {},
      updatedAt: new Date().toISOString(),
    };
  }

  const raw = storage.getItem(getAttendanceStorageKey(uid, classId));
  if (!raw) {
    return {
      classId,
      teacherId: uid,
      subjectName,
      schoolYear,
      totalPlannedPeriods: 45,
      sessions: {},
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const parsed = JSON.parse(raw) as SubjectAttendanceBook;
    return {
      classId,
      teacherId: uid,
      subjectName: parsed.subjectName || subjectName,
      schoolYear: parsed.schoolYear || schoolYear,
      totalPlannedPeriods: parsed.totalPlannedPeriods || 45,
      sessions: parsed.sessions || {},
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return {
      classId,
      teacherId: uid,
      subjectName,
      schoolYear,
      totalPlannedPeriods: 45,
      sessions: {},
      updatedAt: new Date().toISOString(),
    };
  }
}

export function saveDeviceSubjectAttendance(
  storage: Pick<Storage, 'setItem'>,
  uid: string,
  book: SubjectAttendanceBook
): void {
  const updatedBook = {
    ...book,
    updatedAt: new Date().toISOString(),
  };
  storage.setItem(getAttendanceStorageKey(uid, book.classId), JSON.stringify(updatedBook));
}

export interface StudentAttendanceSummary {
  studentId: string;
  totalSessionsHeld: number;
  presentCount: number;
  excusedCount: number;
  unexcusedCount: number;
  lateCount: number;
  truantCount: number;
  totalAbsencePeriods: number; // P + KP + BT
  absencePercent: number; // % trên tổng số tiết đã dạy
  isBannedWarning: boolean; // Vắng quá 20%
}

export function calculateStudentAttendanceStats(
  book: SubjectAttendanceBook,
  studentId: string
): StudentAttendanceSummary {
  const sessions = Object.values(book.sessions);
  const totalSessionsHeld = sessions.length;

  let presentCount = 0;
  let excusedCount = 0;
  let unexcusedCount = 0;
  let lateCount = 0;
  let truantCount = 0;

  for (const session of sessions) {
    const record = session.records[studentId];
    const status = record?.status || 'present';
    if (status === 'present') presentCount++;
    else if (status === 'excused') excusedCount++;
    else if (status === 'unexcused') unexcusedCount++;
    else if (status === 'late') lateCount++;
    else if (status === 'truant') truantCount++;
  }

  const totalAbsencePeriods = excusedCount + unexcusedCount + truantCount;
  const absencePercent =
    totalSessionsHeld > 0
      ? Math.round((totalAbsencePeriods / totalSessionsHeld) * 1000) / 10
      : 0;

  // Cảnh báo cấm thi: vắng >= 20% số tiết
  const isBannedWarning = totalSessionsHeld >= 5 && absencePercent >= 20.0;

  return {
    studentId,
    totalSessionsHeld,
    presentCount,
    excusedCount,
    unexcusedCount,
    lateCount,
    truantCount,
    totalAbsencePeriods,
    absencePercent,
    isBannedWarning,
  };
}

export interface AttendanceExportOptions {
  book: SubjectAttendanceBook;
  students: Student[];
  className: string;
  teacherName: string;
}

export function exportSubjectAttendanceToExcel(options: AttendanceExportOptions): void {
  const { book, students, className, teacherName } = options;
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  const FONT_NAME = 'Times New Roman';
  const thinBorder = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } },
  };

  const sortedSessions = Object.values(book.sessions).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.periodNumber - b.periodNumber;
  });

  // Base Columns: STT, Mã HS, Họ và tên
  const headerCols: { title: string; width: number }[] = [
    { title: 'STT', width: 6 },
    { title: 'Mã HS', width: 14 },
    { title: 'Họ và tên', width: 25 },
  ];

  // Each session column
  sortedSessions.forEach(sess => {
    const dateParts = sess.date.split('-');
    const shortDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : sess.date;
    headerCols.push({
      title: `${shortDate}\nTiết ${sess.periodNumber}`,
      width: 10,
    });
  });

  // Summary Columns
  headerCols.push(
    { title: 'Tổng\ntiết học', width: 10 },
    { title: 'Có mặt\n(CM)', width: 10 },
    { title: 'Nghỉ phép\n(P)', width: 10 },
    { title: 'Không phép\n(KP)', width: 11 },
    { title: 'Đi muộn\n(M)', width: 10 },
    { title: 'Bỏ tiết\n(BT)', width: 10 },
    { title: 'Tổng\nvắng', width: 10 },
    { title: 'Tỉ lệ\nvắng (%)', width: 11 },
    { title: 'Cảnh báo\nchuyên cần', width: 18 }
  );

  const totalCols = headerCols.length;
  const lastColIdx = totalCols - 1;
  const colRightStart = Math.max(3, totalCols - 4);

  // Administrative Headers
  ws['A1'] = {
    t: 's',
    v: 'TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP',
    s: { font: { name: FONT_NAME, sz: 10, bold: true }, alignment: { horizontal: 'center' } },
  };
  ws[XLSX.utils.encode_cell({ r: 0, c: colRightStart })] = {
    t: 's',
    v: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    s: { font: { name: FONT_NAME, sz: 10, bold: true }, alignment: { horizontal: 'center' } },
  };

  ws['A2'] = {
    t: 's',
    v: 'KHOA CƠ BẢN',
    s: { font: { name: FONT_NAME, sz: 10, bold: true }, alignment: { horizontal: 'center' } },
  };
  ws[XLSX.utils.encode_cell({ r: 1, c: colRightStart })] = {
    t: 's',
    v: 'Độc lập - Tự do - Hạnh phúc',
    s: { font: { name: FONT_NAME, sz: 10, bold: true, underline: true }, alignment: { horizontal: 'center' } },
  };

  // Title
  ws['A4'] = {
    t: 's',
    v: `SỔ THEO DÕI ĐIỂM DANH CHUYÊN CẦN MÔN ${book.subjectName.toUpperCase()}`,
    s: { font: { name: FONT_NAME, sz: 14, bold: true }, alignment: { horizontal: 'center' } },
  };

  ws['A5'] = {
    t: 's',
    v: `Lớp: ${className}   ·   Năm học: ${book.schoolYear}   ·   Giáo viên bộ môn: ${teacherName}   ·   Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
    s: { font: { name: FONT_NAME, sz: 11, italic: true }, alignment: { horizontal: 'center' } },
  };

  const headerRowIdx = 6;
  headerCols.forEach((col, idx) => {
    const ref = XLSX.utils.encode_cell({ r: headerRowIdx, c: idx });
    ws[ref] = {
      t: 's',
      v: col.title,
      s: {
        font: { name: FONT_NAME, sz: 10, bold: true },
        fill: { fgColor: { rgb: 'EDE9FE' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: thinBorder,
      },
    };
  });

  const cellCenter = { font: { name: FONT_NAME, sz: 10.5 }, alignment: { horizontal: 'center', vertical: 'center' }, border: thinBorder };
  const cellLeft = { font: { name: FONT_NAME, sz: 10.5 }, alignment: { horizontal: 'left', vertical: 'center' }, border: thinBorder };

  let r = 7;
  students.forEach((student, sIdx) => {
    const stats = calculateStudentAttendanceStats(book, student.id);
    let c = 0;

    // STT
    ws[XLSX.utils.encode_cell({ r, c: c++ })] = { t: 'n', v: sIdx + 1, s: cellCenter };
    // Mã HS
    ws[XLSX.utils.encode_cell({ r, c: c++ })] = { t: 's', v: student.studentCode || '', s: cellCenter };
    // Họ và tên
    ws[XLSX.utils.encode_cell({ r, c: c++ })] = { t: 's', v: student.fullName, s: cellLeft };

    // Sessions statuses
    sortedSessions.forEach(sess => {
      const rec = sess.records[student.id];
      const status: AttendanceStatus = rec?.status || 'present';
      const info = ATTENDANCE_STATUSES[status];
      const isAbsent = status !== 'present';
      ws[XLSX.utils.encode_cell({ r, c: c++ })] = {
        t: 's',
        v: info.short,
        s: {
          ...cellCenter,
          font: {
            name: FONT_NAME,
            sz: 10,
            bold: isAbsent,
            color: isAbsent ? { rgb: status === 'excused' ? 'D97706' : 'DC2626' } : { rgb: '059669' },
          },
        },
      };
    });

    // Summary counts
    ws[XLSX.utils.encode_cell({ r, c: c++ })] = { t: 'n', v: stats.totalSessionsHeld, s: cellCenter };
    ws[XLSX.utils.encode_cell({ r, c: c++ })] = { t: 'n', v: stats.presentCount, s: cellCenter };
    ws[XLSX.utils.encode_cell({ r, c: c++ })] = { t: 'n', v: stats.excusedCount, s: cellCenter };
    ws[XLSX.utils.encode_cell({ r, c: c++ })] = { t: 'n', v: stats.unexcusedCount, s: cellCenter };
    ws[XLSX.utils.encode_cell({ r, c: c++ })] = { t: 'n', v: stats.lateCount, s: cellCenter };
    ws[XLSX.utils.encode_cell({ r, c: c++ })] = { t: 'n', v: stats.truantCount, s: cellCenter };
    ws[XLSX.utils.encode_cell({ r, c: c++ })] = {
      t: 'n',
      v: stats.totalAbsencePeriods,
      s: { ...cellCenter, font: { ...cellCenter.font, bold: stats.totalAbsencePeriods > 0 } },
    };
    ws[XLSX.utils.encode_cell({ r, c: c++ })] = { t: 's', v: `${stats.absencePercent}%`, s: cellCenter };
    ws[XLSX.utils.encode_cell({ r, c: c++ })] = {
      t: 's',
      v: stats.isBannedWarning ? 'NGUY CƠ CẤM THI' : 'Bình thường',
      s: {
        ...cellCenter,
        font: {
          name: FONT_NAME,
          sz: 10,
          bold: stats.isBannedWarning,
          color: stats.isBannedWarning ? { rgb: 'DC2626' } : { rgb: '059669' },
        },
        fill: stats.isBannedWarning ? { fgColor: { rgb: 'FEE2E2' } } : undefined,
      },
    };

    r++;
  });

  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 0, c: colRightStart }, e: { r: 0, c: lastColIdx } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
    { s: { r: 1, c: colRightStart }, e: { r: 1, c: lastColIdx } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastColIdx } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: lastColIdx } },
  ];

  ws['!merges'] = merges;
  ws['!cols'] = headerCols.map(c => ({ wch: c.width }));

  const sheetName = 'Chuyen_Can_Bo_Mon';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanSubject = book.subjectName.replace(/[\\/:*?"<>|\s]/g, '_');
  const cleanClass = className.replace(/[\\/:*?"<>|\s]/g, '_');
  const filename = `Diem_Danh_${cleanSubject}_${cleanClass}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}
