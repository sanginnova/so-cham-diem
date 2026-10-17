import XLSX from 'xlsx-js-style';
import type { ClassGradebookData, StudentSubjectGrade, SubjectTermScores } from '../types/subjectGrade';
import type { Student } from '../types';
import { assessmentKey, statusLabels, type AssessmentStatus } from './assessmentStatus';

export interface SubjectGradebookExportOptions {
  gradebook: ClassGradebookData;
  students: Student[];
  classConfig: {
    className: string;
    schoolYear: string;
    id?: string;
  };
  teacherName: string;
  semesterTab: 'sem1' | 'sem2' | 'year';
  schoolName?: string;
  departmentName?: string;
}

const FONT_NAME = 'Times New Roman';

const thinBorder = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

function formatScore(score: number | null | undefined): string | number {
  if (score === null || score === undefined || isNaN(score)) return '';
  return Math.round(score * 10) / 10;
}

export function buildStudentNotes(term?: SubjectTermScores): string {
  if (!term) return '';
  const notes: string[] = [];
  if (term.assessmentStatuses) {
    for (const [key, status] of Object.entries(term.assessmentStatuses)) {
      let label = key.toUpperCase();
      if (key.startsWith('tx_')) {
        const idx = parseInt(key.replace('tx_', ''), 10) + 1;
        label = `TX${idx}`;
      } else if (key === 'gk') {
        label = 'Giữa kỳ (GK)';
      } else if (key === 'ck') {
        label = 'Cuối kỳ (CK)';
      }
      notes.push(`${statusLabels[status as AssessmentStatus] || status} [${label}]`);
    }
  }
  if (term.note && term.note.trim()) {
    notes.push(term.note.trim());
  }
  return notes.join('; ');
}

function sanitizeFileNamePart(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/\s+/g, '_')
    .replace(/[\\/:*?"<>|]/g, '_');
}

export function generateSubjectGradebookWorkbook(options: SubjectGradebookExportOptions): {
  wb: XLSX.WorkBook;
  fileName: string;
  sheetName: string;
} {
  const {
    gradebook,
    students,
    classConfig,
    teacherName,
    semesterTab,
    schoolName = 'TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP',
    departmentName = 'KHOA CƠ BẢN',
  } = options;

  const isSem1 = semesterTab === 'sem1';
  const isSem2 = semesterTab === 'sem2';
  const isYear = semesterTab === 'year';
  const titleTerm = isSem1 ? 'HỌC KỲ I' : isSem2 ? 'HỌC KỲ II' : 'CẢ NĂM';
  const txCount = isSem1
    ? (gradebook.txCountSemester1 || 4)
    : (gradebook.txCountSemester2 || 4);
  const currentLabels = isSem1
    ? gradebook.txLabelsSemester1
    : gradebook.txLabelsSemester2;

  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  // Headers list for calculation of columns
  const headerCols: { title: string; width: number }[] = [
    { title: 'STT', width: 6 },
    { title: 'Mã HS', width: 14 },
    { title: 'Họ và tên', width: 25 },
  ];

  if (!isYear) {
    for (let i = 0; i < txCount; i++) {
      const lbl = currentLabels?.[i] || (i === 2 ? '30 phút' : '15 phút');
      headerCols.push({ title: `TX${i + 1}\n(${lbl})`, width: 12 });
    }
    headerCols.push(
      { title: 'ĐĐGgk\n(Hệ số 2)', width: 13 },
      { title: 'ĐĐGck\n(Hệ số 3)', width: 13 },
      { title: `ĐTB\n${titleTerm}`, width: 13 },
      { title: 'Xếp loại', width: 12 },
      { title: 'Ghi chú & Trạng thái', width: 26 },
    );
  } else {
    headerCols.push(
      { title: 'ĐTB\nHọc kỳ I', width: 13 },
      { title: 'ĐTB\nHọc kỳ II', width: 13 },
      { title: 'ĐTB\nCả năm', width: 15 },
      { title: 'Xếp loại\nCả năm', width: 15 },
      { title: 'Ghi chú & Nhận xét', width: 26 },
    );
  }

  const totalCols = headerCols.length;
  const lastColIdx = totalCols - 1;
  const colRightStart = Math.max(3, totalCols - 4);

  // Styles
  const adminHeaderLeftStyle = {
    font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '1E293B' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const adminHeaderRightStyle = {
    font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '1E293B' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const titleStyle = {
    font: { name: FONT_NAME, sz: 15, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const subTitleStyle = {
    font: { name: FONT_NAME, sz: 11, bold: true, italic: true, color: { rgb: '334155' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const metaStyle = {
    font: { name: FONT_NAME, sz: 10, italic: true, color: { rgb: '64748B' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const tableHeaderStyle = {
    font: { name: FONT_NAME, sz: 10.5, bold: true, color: { rgb: '0F172A' } },
    fill: { fgColor: { rgb: 'EDE9FE' } }, // Soft purple header
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: thinBorder,
  };

  const cellCenterStyle = {
    font: { name: FONT_NAME, sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const cellLeftStyle = {
    font: { name: FONT_NAME, sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder,
  };

  const cellBoldCenterStyle = {
    font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const cellStatusStyle = {
    font: { name: FONT_NAME, sz: 10, italic: true, bold: true, color: { rgb: '7C3AED' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const merges: XLSX.Range[] = [];

  // Row 0: Admin header top
  const refA1 = XLSX.utils.encode_cell({ r: 0, c: 0 });
  ws[refA1] = { t: 's', v: schoolName.toUpperCase(), s: adminHeaderLeftStyle };
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } });

  const refRight1 = XLSX.utils.encode_cell({ r: 0, c: colRightStart });
  ws[refRight1] = { t: 's', v: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', s: adminHeaderRightStyle };
  merges.push({ s: { r: 0, c: colRightStart }, e: { r: 0, c: lastColIdx } });

  // Row 1: Admin header bottom
  const refA2 = XLSX.utils.encode_cell({ r: 1, c: 0 });
  ws[refA2] = { t: 's', v: departmentName.toUpperCase(), s: adminHeaderLeftStyle };
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 2 } });

  const refRight2 = XLSX.utils.encode_cell({ r: 1, c: colRightStart });
  ws[refRight2] = { t: 's', v: 'Độc lập - Tự do - Hạnh phúc', s: { ...adminHeaderRightStyle, font: { ...adminHeaderRightStyle.font, underline: true } } };
  merges.push({ s: { r: 1, c: colRightStart }, e: { r: 1, c: lastColIdx } });

  // Row 3: Title
  const refTitle = XLSX.utils.encode_cell({ r: 3, c: 0 });
  ws[refTitle] = {
    t: 's',
    v: `BẢNG ĐIỂM ĐÁNH GIÁ KẾT QUẢ HỌC TẬP - ${titleTerm}`,
    s: titleStyle,
  };
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: lastColIdx } });

  // Row 4: Subtitle (Subject & Class)
  const refSubTitle = XLSX.utils.encode_cell({ r: 4, c: 0 });
  ws[refSubTitle] = {
    t: 's',
    v: `Môn: ${gradebook.subjectName.toUpperCase()} · Lớp: ${classConfig.className} · Năm học: ${classConfig.schoolYear}`,
    s: subTitleStyle,
  };
  merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: lastColIdx } });

  // Row 5: Metadata (Teacher & Date)
  const exportDateStr = new Date().toLocaleDateString('vi-VN');
  const refMeta = XLSX.utils.encode_cell({ r: 5, c: 0 });
  ws[refMeta] = {
    t: 's',
    v: `Giáo viên bộ môn: ${teacherName} · Ngày xuất: ${exportDateStr}`,
    s: metaStyle,
  };
  merges.push({ s: { r: 5, c: 0 }, e: { r: 5, c: lastColIdx } });

  // Row 7: Table Column Headers
  const tableHeaderRowIndex = 7;
  headerCols.forEach((col, idx) => {
    const ref = XLSX.utils.encode_cell({ r: tableHeaderRowIndex, c: idx });
    ws[ref] = { t: 's', v: col.title, s: tableHeaderStyle };
  });

  // Table Data Rows: Row 8 onwards
  let currentRow = 8;
  const averagesList: number[] = [];

  students.forEach((student, studentIndex) => {
    const g: StudentSubjectGrade | undefined = gradebook.grades[student.id];
    let colIdx = 0;

    // Col 0: STT
    const refStt = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
    ws[refStt] = { t: 'n', v: studentIndex + 1, s: cellCenterStyle };

    // Col 1: Mã HS
    const refCode = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
    ws[refCode] = { t: 's', v: student.studentCode || '', s: cellCenterStyle };

    // Col 2: Họ và tên
    const refName = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
    ws[refName] = { t: 's', v: student.fullName, s: cellLeftStyle };

    if (!isYear) {
      const term: SubjectTermScores | undefined = isSem1 ? g?.semester1 : g?.semester2;
      const statuses = term?.assessmentStatuses || {};

      // TX columns
      for (let i = 0; i < txCount; i++) {
        const key = assessmentKey('tx', i);
        const status = statuses[key];
        const refTx = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });

        if (status) {
          const label = status === 'exempt' ? 'Miễn' : status === 'absent' ? 'Vắng' : 'Cần bù';
          ws[refTx] = { t: 's', v: label, s: cellStatusStyle };
        } else {
          const score = term?.tx?.[i];
          const val = formatScore(score);
          ws[refTx] = {
            t: typeof val === 'number' ? 'n' : 's',
            v: val,
            s: cellCenterStyle,
          };
        }
      }

      // GK column
      const gkStatus = statuses['gk'];
      const refGk = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
      if (gkStatus) {
        const label = gkStatus === 'exempt' ? 'Miễn' : gkStatus === 'absent' ? 'Vắng' : 'Cần bù';
        ws[refGk] = { t: 's', v: label, s: cellStatusStyle };
      } else {
        const val = formatScore(term?.gk);
        ws[refGk] = {
          t: typeof val === 'number' ? 'n' : 's',
          v: val,
          s: cellCenterStyle,
        };
      }

      // CK column
      const ckStatus = statuses['ck'];
      const refCk = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
      if (ckStatus) {
        const label = ckStatus === 'exempt' ? 'Miễn' : ckStatus === 'absent' ? 'Vắng' : 'Cần bù';
        ws[refCk] = { t: 's', v: label, s: cellStatusStyle };
      } else {
        const val = formatScore(term?.ck);
        ws[refCk] = {
          t: typeof val === 'number' ? 'n' : 's',
          v: val,
          s: cellCenterStyle,
        };
      }

      // Average column
      const avg = term?.average;
      const refAvg = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
      if (avg !== null && avg !== undefined && !isNaN(avg)) {
        averagesList.push(avg);
        ws[refAvg] = { t: 'n', v: Math.round(avg * 10) / 10, s: cellBoldCenterStyle };
      } else {
        ws[refAvg] = { t: 's', v: '', s: cellBoldCenterStyle };
      }

      // Rank column
      const refRank = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
      let rankText = '';
      if (avg !== null && avg !== undefined && !isNaN(avg)) {
        if (avg >= 8.0) rankText = 'Giỏi';
        else if (avg >= 6.5) rankText = 'Khá';
        else if (avg >= 5.0) rankText = 'Đạt';
        else rankText = 'Chưa đạt';
      }
      ws[refRank] = { t: 's', v: rankText, s: cellCenterStyle };

      // Note column
      const refNote = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
      ws[refNote] = { t: 's', v: buildStudentNotes(term), s: cellLeftStyle };
    } else {
      // Year Mode
      const avg1 = g?.semester1?.average;
      const avg2 = g?.semester2?.average;
      const yearAvg = g?.yearAverage;
      const rank = g?.rank || '';

      if (yearAvg !== null && yearAvg !== undefined && !isNaN(yearAvg)) {
        averagesList.push(yearAvg);
      }

      // ĐTB HK1
      const refAvg1 = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
      const val1 = formatScore(avg1);
      ws[refAvg1] = { t: typeof val1 === 'number' ? 'n' : 's', v: val1, s: cellCenterStyle };

      // ĐTB HK2
      const refAvg2 = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
      const val2 = formatScore(avg2);
      ws[refAvg2] = { t: typeof val2 === 'number' ? 'n' : 's', v: val2, s: cellCenterStyle };

      // ĐTB Cả năm
      const refYearAvg = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
      const valYear = formatScore(yearAvg);
      ws[refYearAvg] = { t: typeof valYear === 'number' ? 'n' : 's', v: valYear, s: cellBoldCenterStyle };

      // Xếp loại Cả năm
      const refRank = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
      ws[refRank] = { t: 's', v: rank, s: cellBoldCenterStyle };

      // Ghi chú cả 2 kỳ
      const notesSem1 = buildStudentNotes(g?.semester1);
      const notesSem2 = buildStudentNotes(g?.semester2);
      const combinedNotes: string[] = [];
      if (notesSem1) combinedNotes.push(`HK1: ${notesSem1}`);
      if (notesSem2) combinedNotes.push(`HK2: ${notesSem2}`);

      const refNote = XLSX.utils.encode_cell({ r: currentRow, c: colIdx++ });
      ws[refNote] = { t: 's', v: combinedNotes.join(' | '), s: cellLeftStyle };
    }

    currentRow++;
  });

  // Summary Row under table
  const summaryRowIndex = currentRow;
  const refSumLabel = XLSX.utils.encode_cell({ r: summaryRowIndex, c: 0 });
  ws[refSumLabel] = {
    t: 's',
    v: 'ĐIỂM TRUNG BÌNH TOÀN LỚP',
    s: { ...cellBoldCenterStyle, fill: { fgColor: { rgb: 'F1F5F9' } } },
  };
  merges.push({ s: { r: summaryRowIndex, c: 0 }, e: { r: summaryRowIndex, c: 2 } });

  const classAverage =
    averagesList.length > 0
      ? Math.round((averagesList.reduce((sum, v) => sum + v, 0) / averagesList.length) * 10) / 10
      : null;

  // Fill in blanks for cells before average
  const avgColIdx = isYear ? 5 : totalCols - 3;
  for (let c = 3; c < totalCols; c++) {
    const ref = XLSX.utils.encode_cell({ r: summaryRowIndex, c });
    if (c === avgColIdx) {
      ws[ref] = {
        t: classAverage !== null ? 'n' : 's',
        v: classAverage ?? '',
        s: { ...cellBoldCenterStyle, fill: { fgColor: { rgb: 'FEF08A' } } },
      };
    } else {
      ws[ref] = { t: 's', v: '', s: { ...cellCenterStyle, fill: { fgColor: { rgb: 'F1F5F9' } } } };
    }
  }

  // Row heights
  const rowHeights: { hpt: number }[] = [
    { hpt: 20 }, // 0 Admin header
    { hpt: 20 }, // 1 Admin header
    { hpt: 12 }, // 2 Blank
    { hpt: 28 }, // 3 Main Title
    { hpt: 22 }, // 4 Subtitle
    { hpt: 20 }, // 5 Metadata
    { hpt: 12 }, // 6 Blank
    { hpt: 32 }, // 7 Table Header
  ];

  for (let r = 8; r <= summaryRowIndex; r++) {
    rowHeights.push({ hpt: 22 });
  }

  // Statistics details block
  currentRow = summaryRowIndex + 2;
  const totalStudents = students.length;
  const hasAvgCount = averagesList.length;
  const gioCount = averagesList.filter(a => a >= 8.0).length;
  const khaCount = averagesList.filter(a => a >= 6.5 && a < 8.0).length;
  const datCount = averagesList.filter(a => a >= 5.0 && a < 6.5).length;
  const chuaDatCount = averagesList.filter(a => a < 5.0).length;

  const pct = (cnt: number) => (hasAvgCount > 0 ? (Math.round((cnt / hasAvgCount) * 1000) / 10) : 0);

  const statText1 = `• Sĩ số lớp: ${totalStudents} học sinh   |   Đã có ĐTB: ${hasAvgCount}/${totalStudents} học sinh   |   Điểm TB toàn lớp: ${classAverage !== null ? classAverage : '—'}`;
  const statText2 = `• Phân loại chất lượng:  Giỏi (≥ 8.0): ${gioCount} HS (${pct(gioCount)}%)   |   Khá (6.5–<8.0): ${khaCount} HS (${pct(khaCount)}%)   |   Đạt (5.0–<6.5): ${datCount} HS (${pct(datCount)}%)   |   Chưa đạt (< 5.0): ${chuaDatCount} HS (${pct(chuaDatCount)}%)`;

  const statStyle = {
    font: { name: FONT_NAME, sz: 10.5, italic: true, color: { rgb: '1E293B' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const refStat1 = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
  ws[refStat1] = { t: 's', v: statText1, s: statStyle };
  merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: lastColIdx } });
  rowHeights.push({ hpt: 20 });
  currentRow++;

  const refStat2 = XLSX.utils.encode_cell({ r: currentRow, c: 0 });
  ws[refStat2] = { t: 's', v: statText2, s: statStyle };
  merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: lastColIdx } });
  rowHeights.push({ hpt: 20 });
  currentRow += 2;

  // Signatures Block
  const sigDateRow = currentRow++;
  const refSigDate = XLSX.utils.encode_cell({ r: sigDateRow, c: colRightStart });
  ws[refSigDate] = {
    t: 's',
    v: '......, ngày ..... tháng ..... năm 20...',
    s: { font: { name: FONT_NAME, sz: 11, italic: true }, alignment: { horizontal: 'center' } },
  };
  merges.push({ s: { r: sigDateRow, c: colRightStart }, e: { r: sigDateRow, c: lastColIdx } });
  rowHeights.push({ hpt: 20 });

  const sigTitleRow = currentRow++;
  const refSigLeftTitle = XLSX.utils.encode_cell({ r: sigTitleRow, c: 0 });
  ws[refSigLeftTitle] = {
    t: 's',
    v: 'TRƯỞNG KHOA / TỔ TRƯỞNG',
    s: { font: { name: FONT_NAME, sz: 11, bold: true }, alignment: { horizontal: 'center' } },
  };
  merges.push({ s: { r: sigTitleRow, c: 0 }, e: { r: sigTitleRow, c: 2 } });

  const refSigRightTitle = XLSX.utils.encode_cell({ r: sigTitleRow, c: colRightStart });
  ws[refSigRightTitle] = {
    t: 's',
    v: 'GIÁO VIÊN BỘ MÔN',
    s: { font: { name: FONT_NAME, sz: 11, bold: true }, alignment: { horizontal: 'center' } },
  };
  merges.push({ s: { r: sigTitleRow, c: colRightStart }, e: { r: sigTitleRow, c: lastColIdx } });
  rowHeights.push({ hpt: 20 });

  const sigSubRow = currentRow++;
  const refSigLeftSub = XLSX.utils.encode_cell({ r: sigSubRow, c: 0 });
  ws[refSigLeftSub] = {
    t: 's',
    v: '(Ký và ghi rõ họ tên)',
    s: { font: { name: FONT_NAME, sz: 10, italic: true }, alignment: { horizontal: 'center' } },
  };
  merges.push({ s: { r: sigSubRow, c: 0 }, e: { r: sigSubRow, c: 2 } });

  const refSigRightSub = XLSX.utils.encode_cell({ r: sigSubRow, c: colRightStart });
  ws[refSigRightSub] = {
    t: 's',
    v: '(Ký và ghi rõ họ tên)',
    s: { font: { name: FONT_NAME, sz: 10, italic: true }, alignment: { horizontal: 'center' } },
  };
  merges.push({ s: { r: sigSubRow, c: colRightStart }, e: { r: sigSubRow, c: lastColIdx } });
  rowHeights.push({ hpt: 18 });

  // 4 rows spacing for signature
  for (let k = 0; k < 4; k++) {
    rowHeights.push({ hpt: 18 });
    currentRow++;
  }

  // Teacher Name row under signature
  const sigNameRow = currentRow++;
  const refTeacherName = XLSX.utils.encode_cell({ r: sigNameRow, c: colRightStart });
  ws[refTeacherName] = {
    t: 's',
    v: teacherName,
    s: { font: { name: FONT_NAME, sz: 11, bold: true }, alignment: { horizontal: 'center' } },
  };
  merges.push({ s: { r: sigNameRow, c: colRightStart }, e: { r: sigNameRow, c: lastColIdx } });
  rowHeights.push({ hpt: 24 });

  // Attach metadata to worksheet
  ws['!merges'] = merges;
  ws['!cols'] = headerCols.map(c => ({ wch: c.width }));
  ws['!rows'] = rowHeights;

  const sheetName = `Bang_Diem_${gradebook.subjectName.replace(/[\\/:*?"<>|]/g, '_')}`.slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const cleanSubject = sanitizeFileNamePart(gradebook.subjectName);
  const cleanClass = sanitizeFileNamePart(classConfig.className);
  const cleanYear = sanitizeFileNamePart(classConfig.schoolYear);
  const fileName = `Bang_Diem_${cleanSubject}_${cleanClass}_${semesterTab}_${cleanYear}.xlsx`;

  return { wb, fileName, sheetName };
}

export function exportSubjectGradebookToExcel(options: SubjectGradebookExportOptions): void {
  const { wb, fileName } = generateSubjectGradebookWorkbook(options);
  XLSX.writeFile(wb, fileName);
}
