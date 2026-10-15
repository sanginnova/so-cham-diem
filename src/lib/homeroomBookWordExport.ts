import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, PageBreak, Footer, PageNumber, PageOrientation } from 'docx';
import type { Student, ClassConfig, DisciplineLog, StudentWeeklySummary, StudentMonthlySummary, StudentSemesterSummary } from '../types';
import { classifyAttendance } from './attendanceStats';
import { formatVietnameseDate, formatVietnameseNumber } from './utils';

export interface HomeroomBookNotes {
  subjectTeachers?: string;
  organization?: string;
  seatingPlan?: string;
  classSituation?: string;
  annualPlan?: string;
  annualTargets?: string;
  studentFollowUp?: string;
  parentCooperation?: string;
  semesterReview?: string;
  monthlyPlans?: Record<number, string>;
  weeklyLearning?: Record<number, string>;
  weeklyComments?: Record<number, string>;
}
export interface HomeroomBookExportOptions {
  className: string;
  schoolYear: string;
  homeroomTeacher: string;
  schoolName?: string;
  department?: string;
  approverName?: string;
  students: Student[];
  classConfig: ClassConfig;
  logs: DisciplineLog[];
  getWeeklySummary: (weekNumber: number) => StudentWeeklySummary[];
  getMonthlySummary?: (month: number) => StudentMonthlySummary[];
  getSemesterSummary?: (semester: 1 | 2) => StudentSemesterSummary[];
  scope: 'all' | 'semester1' | 'semester2' | 'month';
  selectedMonth?: number;
  includeCover?: boolean;
  includeRegulations?: boolean;
  includeStudentList?: boolean;
  includeOrganization?: boolean;
  includeWeeklySummaries?: boolean;
  includeSemesterSummary?: boolean;
  includeStudentFollowUp?: boolean;
  classPresident?: string;
  academicVicePresident?: string;
  disciplineVicePresident?: string;
  youthUnionSecretary?: string;
  parentRepresentativeHead?: string;
  parentRepresentativeDeputy?: string;
  parentRepresentativePhone?: string;
  notes?: HomeroomBookNotes;
}
const font = 'Times New Roman';
const blank = '........................................................................................';
const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const p = (text: string, bold = false, center = false, size = 12) => new Paragraph({
  alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
  spacing: { after: 100, line: 276 },
  children: [new TextRun({ text, bold, font, size: size * 2 })],
});
const heading = (text: string) => new Paragraph({
  keepNext: true, spacing: { before: 220, after: 160 },
  children: [new TextRun({ text, font, size: 26, bold: true })],
});
function table(headers: string[], rows: string[][], widths?: number[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headers, ...rows].map((row, index) => new TableRow({
      tableHeader: index === 0,
      children: row.map((text, col) => new TableCell({
        width: widths ? { size: widths[col], type: WidthType.PERCENTAGE } : undefined,
        borders: { top: border, bottom: border, left: border, right: border },
        margins: { top: 80, bottom: 80, left: 90, right: 90 },
        children: [p(text, index === 0, index === 0, 11)],
      })),
    })),
  });
}

/** Recreates the sections of the supplied school book with real class data. */
export async function generateHomeroomBookBlob(o: HomeroomBookExportOptions): Promise<Blob> {
  const c = o.classConfig;
  const notes = o.notes || {};
  const roster = o.students.filter(s => s.teacherId === c.teacherId && (s.classId === c.id || (!s.classId && c.scopeVersion !== 2)));
  const studentIds = new Set(roster.map(s => s.id));
  const logs = o.logs.filter(l => studentIds.has(l.studentId) && l.teacherId === c.teacherId && (l.classId === c.id || (!l.classId && c.scopeVersion !== 2)));
  const months = o.scope === 'month' ? (o.selectedMonth ? [o.selectedMonth] : [])
    : o.scope === 'semester1' ? c.semester1Months : o.scope === 'semester2' ? c.semester2Months : c.months;
  if (!months.length) throw new Error('Chưa chọn tháng hoặc chưa cấu hình lịch học.');
  if (![o.includeCover, o.includeRegulations, o.includeStudentList, o.includeOrganization, o.includeWeeklySummaries, o.includeSemesterSummary, o.includeStudentFollowUp].some(v => v !== false)) {
    throw new Error('Vui lòng chọn ít nhất một phần để xuất.');
  }
  const sections: ConstructorParameters<typeof Document>[0]['sections'][number][] = [];
  let body: (Paragraph | Table)[] = [];
  const pageBreak = () => { if (body.length) body.push(new Paragraph({ children: [new PageBreak()] })); };
  const text = (value?: string) => (value?.trim() || blank).split('\n').forEach(line => body.push(p(line)));
  const page = (landscape = false) => {
    if (!body.length) return;
    sections.push({
      properties: { page: {
        size: { width: 11906, height: 16838, orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
        margin: { top: 1134, bottom: 1134, left: 1417, right: 850 },
      } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Trang ', font, size: 20 }), new TextRun({ children: [PageNumber.CURRENT], font, size: 20 })],
      })] }) }, children: body,
    });
    body = [];
  };
  if (o.includeCover !== false) {
    body.push(p('BỘ QUỐC PHÒNG', true, true, 14), p(o.schoolName || '', true, true, 16));
    if (o.department) body.push(p(o.department, true, true));
    body.push(p(''), p(''), p('SỔ CÔNG TÁC', true, true, 26), p('GIÁO VIÊN CHỦ NHIỆM', true, true, 24), p('TRUNG HỌC PHỔ THÔNG', true, true, 16), p(''),
      p(`HỌ TÊN GIÁO VIÊN: ${o.homeroomTeacher || blank}`, true, true, 14),
      p(`CHỦ NHIỆM LỚP: ${o.className}`, true, true, 14), p(`NĂM HỌC: ${o.schoolYear}`, true, true, 14));
    page();
  }
  if (o.includeRegulations !== false) {
    body.push(heading('NHỮNG VĂN BẢN QUY ĐỊNH NHIỆM VỤ HỌC SINH'));
    text('Phần văn bản được giữ theo mẫu sổ do giáo viên cung cấp; cần rà soát trước khi sử dụng.');
    // Static reference text contains no student or parent records.
    const { homeroomRegulations } = await import('../data/homeroomRegulations');
    for (const line of homeroomRegulations) body.push(/^Điều \d+\.|^NHIỆM VỤ/.test(line.trim()) ? heading(line) : p(line));
    page();
  }
  if (o.includeStudentList !== false) {
    body.push(heading('DANH SÁCH GIÁO VIÊN BỘ MÔN'));
    text(notes.subjectTeachers);
    body.push(table(['Bộ môn', 'Họ tên', 'Số điện thoại', 'Ghi chú'], [['', '', '', '']]));
    page();
    body.push(heading(`DANH SÁCH HỌC SINH LỚP ${o.className}`));
    body.push(table(['TT', 'Họ và tên', 'Nữ', 'Ngày sinh', 'Dân tộc', 'Khuyết tật / mồ côi', 'Con TB / LS', 'Chính sách', 'Họ tên bố/mẹ', 'Nghề nghiệp', 'Chỗ ở', 'SĐT', 'Ghi chú'],
      roster.length ? roster.map((s, i) => [String(i + 1), s.fullName, s.gender === 'Nữ' ? 'x' : '', s.dateOfBirth ? formatVietnameseDate(s.dateOfBirth) : '', s.ethnicity || '', s.disabilityOrOrphan || '', s.martyrFamily || '', s.policy || '', s.parentName || '', s.parentOccupation || '', s.address || '', s.parentPhone || '', ''])
      : [Array(13).fill('')], [4, 16, 3, 8, 5, 7, 6, 6, 12, 7, 9, 10, 7]));
    page(true);
  }
  if (o.includeOrganization !== false) {
    body.push(heading('PHẦN II: TỔ CHỨC LỚP HỌC'), heading('DANH SÁCH HỌC SINH CHIA THEO TỔ'));
    text(notes.organization);
    body.push(table(['STT', 'Họ tên', 'Nhiệm vụ trong lớp', 'Tổ / Ghi chú'], roster.length ? roster.map((s, i) => [String(i + 1), s.fullName,
      s.duty || (s.fullName === o.classPresident ? 'Lớp trưởng' : s.fullName === o.academicVicePresident ? 'Lớp phó học tập' : s.fullName === o.disciplineVicePresident ? 'Lớp phó nề nếp' : ''), s.group || '']) : [['', '', '', '']], [6, 38, 30, 26]));
    pageBreak();
    body.push(heading(`SƠ ĐỒ LỚP HỌC ${o.className}`)); text(notes.seatingPlan);
    body.push(p('BÀN GIÁO VIÊN', true, true), table(['Dãy 1', 'Dãy 2', 'Dãy 3'], Array.from({ length: 6 }, () => ['', '', ''])));
    body.push(heading('BAN CÁN SỰ LỚP'));
    body.push(table(['Chức vụ', 'Họ tên'], [
      ['Lớp trưởng', o.classPresident || c.classPresident || ''], ['Lớp phó học tập', o.academicVicePresident || c.academicVicePresident || ''],
      ['Lớp phó nề nếp', o.disciplineVicePresident || c.disciplineVicePresident || ''], ['Bí thư chi đoàn', o.youthUnionSecretary || c.youthUnionSecretary || ''],
    ]));
    body.push(heading('BAN ĐẠI DIỆN CHA MẸ HỌC SINH'), table(['Chức vụ', 'Họ tên', 'Số điện thoại'], [
      ['Trưởng ban', o.parentRepresentativeHead || '', o.parentRepresentativePhone || ''], ['Phó ban', o.parentRepresentativeDeputy || '', ''],
    ]));
    body.push(heading('ĐẶC ĐIỂM TÌNH HÌNH LỚP'), p(`Tổng số hồ sơ: ${roster.length}; Nữ: ${roster.filter(s => s.gender === 'Nữ').length}; Đang học: ${roster.filter(s => s.status === 'active').length}.`));
    text(notes.classSituation);
    pageBreak(); body.push(heading('KẾ HOẠCH CÔNG TÁC CHỦ NHIỆM NĂM HỌC')); text(notes.annualPlan);
    body.push(heading('CHỈ TIÊU TOÀN DIỆN CUỐI NĂM')); text(notes.annualTargets);
    page();
  }
  if (o.includeWeeklySummaries !== false) {
    for (const month of months) {
      pageBreak();
      body.push(heading(`KẾ HOẠCH THÁNG ${month}`), heading('A. KẾ HOẠCH CHUNG')); text(notes.monthlyPlans?.[month]);
      body.push(heading('B. NỘI DUNG SINH HOẠT TUẦN'));
      const weeks = c.weeks.filter(w => w.month === month).sort((a, b) => a.weekNumber - b.weekNumber);
      if (!weeks.length) text('Chưa cấu hình tuần học cho tháng này.');
      for (const week of weeks) {
        const weekLogs = logs.filter(l => l.date >= week.startDate && l.date <= week.endDate && l.weekNumber === week.weekNumber);
        const count = (kind: 'excused' | 'unexcused' | 'truancy') => weekLogs.filter(l => l.type === 'deduct' && classifyAttendance(l) === kind).reduce((n, l) => n + l.count, 0);
        body.push(heading(`Tuần ${week.weekNumber}: Từ ngày ${formatVietnameseDate(week.startDate)} - ${formatVietnameseDate(week.endDate)}`));
        body.push(p('a. Nề nếp', true), p(`Theo nhật ký: Nghỉ có phép ${count('excused')}; Không phép ${count('unexcused')}; Bỏ tiết ${count('truancy')}.`));
        if (weekLogs.length) body.push(table(['Học sinh', 'Nội dung ghi nhận', 'Số lần'], weekLogs.map(l => [l.studentName, l.behaviorDescription, String(l.count)]), [28, 60, 12]));
        else body.push(p('Chưa có nhật ký trong tuần; chưa đủ cơ sở kết luận chuyên cần hoặc nề nếp.'));
        body.push(p('b. Học tập', true)); text(notes.weeklyLearning?.[week.weekNumber]);
        body.push(p('c. Nhận xét', true)); text(notes.weeklyComments?.[week.weekNumber]);
      }
      body.push(heading('SƠ KẾT HÀNG TUẦN'));
      const summaries = new Map(weeks.map(w => [w.weekNumber, new Map(o.getWeeklySummary(w.weekNumber).map(s => [s.studentId, s]))]));
      const monthly = new Map((o.getMonthlySummary?.(month) || []).map(s => [s.studentId, s]));
      body.push(table(['TT', 'Họ tên', ...weeks.map(w => `Tuần ${w.weekNumber}`), 'Điểm tháng', 'Xếp loại thi đua'], roster.length ? roster.map((s, i) => [String(i + 1), s.fullName,
        ...weeks.map(w => { const v = summaries.get(w.weekNumber)?.get(s.id); return v ? formatVietnameseNumber(v.finalScore) : ''; }),
        monthly.has(s.id) ? formatVietnameseNumber(monthly.get(s.id)!.finalScore) : '', monthly.get(s.id)?.rank || '']) : [Array(weeks.length + 4).fill('')]));
      body.push(p('Điểm và xếp loại thi đua được lấy từ bảng tổng kết của ứng dụng; không thay thế kết quả học tập hoặc đánh giá rèn luyện chính thức.'));
    }
    page();
  }
  if (o.includeSemesterSummary !== false && o.scope !== 'month') {
    const semesters: (1 | 2)[] = o.scope === 'semester1' ? [1] : o.scope === 'semester2' ? [2] : [1, 2];
    for (const sem of semesters) {
      pageBreak(); body.push(heading(`SƠ KẾT HỌC KÌ ${sem === 1 ? 'I' : 'II'}`));
      const scores = new Map((o.getSemesterSummary?.(sem) || []).map(s => [s.studentId, s]));
      body.push(table(['TT', 'Họ tên', 'Điểm thi đua', 'Xếp loại thi đua', 'Học tập chính thức', 'Rèn luyện chính thức'], roster.length ? roster.map((s, i) => [String(i + 1), s.fullName,
        scores.has(s.id) ? formatVietnameseNumber(scores.get(s.id)!.averageScore) : '', scores.get(s.id)?.finalRank || '', '', '']) : [['', '', '', '', '', '']]));
      body.push(p('Kết quả học tập và rèn luyện chính thức do giáo viên bổ sung sau khi được duyệt.'));
      body.push(heading('NHẬN XÉT VÀ PHƯƠNG HƯỚNG')); text(notes.semesterReview);
    }
    page();
  }
  if (o.includeStudentFollowUp !== false) {
    body.push(heading('THEO DÕI HỌC SINH CẦN QUAN TÂM')); text(notes.studentFollowUp);
    body.push(table(['Họ tên', 'Nội dung cần theo dõi', 'Biện pháp', 'Kết quả'], [['', '', '', ''], ['', '', '', '']]));
    body.push(heading('KẾT HỢP VỚI PHỤ HUYNH HỌC SINH')); text(notes.parentCooperation);
    body.push(table(['Thời gian', 'Phụ huynh / Học sinh', 'Nội dung trao đổi', 'Kết quả / Theo dõi'], [['', '', '', ''], ['', '', '', '']]));
    body.push(p(''), table(['DUYỆT CỦA TRƯỞNG KHOA / TTCM', 'GIÁO VIÊN CHỦ NHIỆM'], [['(Ký và ghi rõ họ tên)', '(Ký và ghi rõ họ tên)'], ['', ''], [o.approverName || '', o.homeroomTeacher || '']]));
    page();
  }
  if (!sections.length) throw new Error('Phạm vi hiện tại không có nội dung để xuất.');
  return Packer.toBlob(new Document({ creator: o.homeroomTeacher, title: `Sổ công tác GVCN lớp ${o.className}`, sections }));
}
export async function downloadHomeroomBook(options: HomeroomBookExportOptions): Promise<void> {
  const blob = await generateHomeroomBookBlob(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `So_Chu_Nhiem_${options.className}_${options.schoolYear}.docx`.replace(/[\\/:*?"<>|]/g, '_');
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
