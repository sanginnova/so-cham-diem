import XLSX from 'xlsx-js-style';
import type { ClassConfig } from '../types';
import { calculateTermAverage, calculateYearAverage, type ClassGradebookData, type SubjectTermScores } from '../types/subjectGrade';
import { needsAssessmentFollowup } from './assessmentStatus';
import { previewGradebookRestore } from './gradebookRestore';
import { workspaceSubject } from './teachingWorkspaces';

export function readDeviceGradebook(storage: Pick<Storage, 'getItem'>, uid: string, config: ClassConfig): ClassGradebookData | null {
  if (!uid || config.teacherId !== uid) return null;
  const raw = storage.getItem(`subject_gradebook_v2_local_${uid}_${config.id}`);
  if (!raw) return null;
  const expected = { classId: config.id, teacherId: uid, subjectName: workspaceSubject(config), schoolYear: config.schoolYear, grades: {} } as ClassGradebookData;
  return previewGradebookRestore(raw, expected).book;
}

export function summarizeSubjectBook(book: ClassGradebookData, period: 'semester1' | 'semester2' | 'year') {
  const averages: number[] = [];
  let missing = 0, makeup = 0;
  const bins = [0, 0, 0, 0];
  const average = (term: SubjectTermScores, locked: boolean) => locked ? term.average : calculateTermAverage(term);
  const entries = Object.values(book.grades);
  for (const student of entries) {
    const terms = period === 'year' ? [student.semester1, student.semester2] : [student[period]];
    if (terms.some(term => needsAssessmentFollowup(term, 'missing'))) missing++;
    if (terms.some(term => needsAssessmentFollowup(term, 'makeup'))) makeup++;
    const first = average(student.semester1, !!book.termLocks?.semester1?.locked);
    const second = average(student.semester2, !!book.termLocks?.semester2?.locked);
    const value = period === 'year' ? calculateYearAverage(first, second) : period === 'semester1' ? first : second;
    if (value !== null) {
      averages.push(value);
      bins[value < 5 ? 0 : value < 6.5 ? 1 : value < 8 ? 2 : 3]++;
    }
  }
  return { pupils: entries.length, scored: averages.length, missing, makeup, bins,
    mean: averages.length ? Math.round(averages.reduce((sum, value) => sum + value, 0) / averages.length * 10) / 10 : null };
}

export interface StatisticsExportRow {
  className: string;
  subjectName: string;
  schoolYear: string;
  pupils: number | string;
  scored: number | string;
  missing: number | string;
  makeup: number | string;
  mean: number | string;
  bin0: number | string;
  bin1: number | string;
  bin2: number | string;
  bin3: number | string;
  status: string;
}

export function exportSubjectStatisticsToExcel(
  rows: StatisticsExportRow[],
  period: 'semester1' | 'semester2' | 'year',
  teacherName: string = 'Giáo viên'
) {
  const periodLabel = period === 'semester1' ? 'HỌC KỲ I' : period === 'semester2' ? 'HỌC KỲ II' : 'CẢ NĂM';
  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

    const FONT_NAME = 'Times New Roman';
    const thinBorder = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    };

    // Row 0: Admin header
    ws['A1'] = { t: 's', v: 'TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP', s: { font: { name: FONT_NAME, sz: 10, bold: true }, alignment: { horizontal: 'center' } } };
    ws['G1'] = { t: 's', v: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', s: { font: { name: FONT_NAME, sz: 10, bold: true }, alignment: { horizontal: 'center' } } };

    ws['A2'] = { t: 's', v: 'KHOA CƠ BẢN', s: { font: { name: FONT_NAME, sz: 10, bold: true }, alignment: { horizontal: 'center' } } };
    ws['G2'] = { t: 's', v: 'Độc lập - Tự do - Hạnh phúc', s: { font: { name: FONT_NAME, sz: 10, bold: true, underline: true }, alignment: { horizontal: 'center' } } };

    // Row 3: Title
    ws['A4'] = {
      t: 's',
      v: `BÁO CÁO THỐNG KÊ CHẤT LƯỢNG ĐIỂM BỘ MÔN - ${periodLabel}`,
      s: { font: { name: FONT_NAME, sz: 14, bold: true }, alignment: { horizontal: 'center' } },
    };

    ws['A5'] = {
      t: 's',
      v: `Giáo viên báo cáo: ${teacherName}   ·   Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
      s: { font: { name: FONT_NAME, sz: 10.5, italic: true }, alignment: { horizontal: 'center' } },
    };

    const headers = [
      'STT', 'Lớp', 'Môn học', 'Năm học',
      'Tổng HS', 'Có ĐTB', 'Thiếu điểm', 'Vắng/Bù', 'TB các ĐTB',
      'Dưới 5 (<5)', '5 – <6.5', '6.5 – <8', 'Từ 8.0 (≥8)', 'Trạng thái'
    ];

    const tableHeaderStyle = {
      font: { name: FONT_NAME, sz: 10.5, bold: true, color: { rgb: '0F172A' } },
      fill: { fgColor: { rgb: 'EDE9FE' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: thinBorder,
    };

    const cellCenter = {
      font: { name: FONT_NAME, sz: 10.5 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    };

    const cellLeft = {
      font: { name: FONT_NAME, sz: 10.5 },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: thinBorder,
    };

    headers.forEach((h, idx) => {
      const ref = XLSX.utils.encode_cell({ r: 6, c: idx });
      ws[ref] = { t: 's', v: h, s: tableHeaderStyle };
    });

    let r = 7;
    rows.forEach((row, idx) => {
      const data = [
        idx + 1, row.className, row.subjectName, row.schoolYear,
        row.pupils, row.scored, row.missing, row.makeup, row.mean,
        row.bin0, row.bin1, row.bin2, row.bin3, row.status
      ];
      data.forEach((val, c) => {
        const ref = XLSX.utils.encode_cell({ r, c });
        const isNum = typeof val === 'number';
        ws[ref] = {
          t: isNum ? 'n' : 's',
          v: val,
          s: (c === 1 || c === 2 || c === 13) ? cellLeft : cellCenter,
        };
      });
      r++;
    });

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
      { s: { r: 0, c: 6 }, e: { r: 0, c: 13 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
      { s: { r: 1, c: 6 }, e: { r: 1, c: 13 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 13 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 13 } },
    ];

    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 15 }, { wch: 12 },
      { wch: 10 }, { wch: 10 }, { wch: 11 }, { wch: 11 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }
    ];

    const sheetName = 'Thong_Ke_GVBM';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Bao_Cao_Thong_Ke_GVBM_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

