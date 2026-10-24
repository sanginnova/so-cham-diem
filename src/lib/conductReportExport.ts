import XLSX from 'xlsx-js-style';
import { ConductSheetRow } from '../components/ConductSheetTable';
import { formatVietnameseNumber } from './utils';

export interface ConductReportExportOptions {
  className: string;
  schoolYear?: string;
  periodLabel: string; // e.g. "Tuần 5" hoặc "Tháng 10"
  homeroomTeacher?: string;
  approverName?: string;
  locationDate?: string;
  stats?: any;
  rows: ConductSheetRow[];
  includeSignatures?: boolean;
  includeAdministrativeHeader?: boolean;
}

const thinBorder = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

/**
 * Xuất file Excel (.xlsx) chuẩn 100% theo mẫu sổ rèn luyện học sinh:
 * - Dòng 1: Tiêu đề "KẾT QUẢ RÈN LUYỆN LỚP [Tên Lớp]" (Căn giữa, in hoa đậm, gộp cột A-E)
 * - Dòng 2 & 3: Tiêu đề bảng 2 tầng chuẩn:
 *   + Cột A: TT (gộp dòng 2-3, căn giữa)
 *   + Cột B: Họ và tên (gộp dòng 2-3, căn giữa)
 *   + Cột C-E: Tuần X / Tháng Y (gộp 3 cột C-E, căn giữa)
 *   + Dòng 3: Điểm rèn luyện (căn giữa), Lỗi vi phạm (căn giữa), Cộng điểm (căn giữa)
 * - Dữ liệu:
 *   + Điểm rèn luyện: Chữ số ĐỎ ĐẬM (FF0000), căn giữa
 *   + Lỗi vi phạm: Căn trái, wrapText xuống dòng từng lỗi
 *   + Cộng điểm: Căn trái, wrapText
 *   + 100% các ô đều có viền đen mảnh (thin border)
 */
export function exportConductSheetToExcel(options: ConductReportExportOptions) {
  const { className, periodLabel, rows, homeroomTeacher } = options;

  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  // Trích xuất số tuần và tháng cho tiêu đề và tên sheet dạng T{tuần}-T{tháng}
  const weekMatch = periodLabel.match(/Tuần\s*(\d+)/i);
  const monthMatch = periodLabel.match(/Tháng\s*(\d+)/i);
  const weekNum = weekMatch ? parseInt(weekMatch[1], 10) : null;
  const monthNum = monthMatch ? parseInt(monthMatch[1], 10) : 10;

  const displayPeriod = weekNum
    ? `Tuần ${weekNum}/ Tháng ${monthNum}`
    : `Tháng ${monthNum}`;

  const cleanSheetName = weekNum
    ? `T${weekNum}-T${monthNum}`
    : `Thang_${monthNum}`;

  // Row heights
  ws['!rows'] = [
    { hpt: 16 }, // Row 0 (A1): đệm
    { hpt: 28 }, // Row 1 (A2): Tiêu đề "KẾT QUẢ RÈN LUYỆN LỚP 12B4"
    { hpt: 20 }, // Row 2 (A3): GVCN
    { hpt: 22 }, // Row 3 (A4): Tuần X/ Tháng Y
    { hpt: 24 }, // Row 4 (A5): STT | Họ và tên | Điểm rèn luyện | Lỗi vi phạm | Điểm cộng
  ];

  // Column widths
  ws['!cols'] = [
    { wch: 7 },   // STT
    { wch: 26 },  // Họ và tên
    { wch: 15 },  // Điểm rèn luyện
    { wch: 48 },  // Lỗi vi phạm
    { wch: 48 },  // Điểm cộng
  ];

  // Helper to safely set a cell
  const setCell = (r: number, c: number, val: string | number, style: any) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    ws[ref] = {
      t: typeof val === 'number' ? 'n' : 's',
      v: val,
      s: style,
    };
  };

  // Helper to ensure all merged cells have border
  const fillMergeBorders = (startR: number, startC: number, endR: number, endC: number, baseStyle: any) => {
    for (let r = startR; r <= endR; r++) {
      for (let c = startC; c <= endC; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) {
          ws[ref] = { t: 's', v: '', s: baseStyle };
        } else {
          ws[ref].s = { ...ws[ref].s, border: thinBorder };
        }
      }
    }
  };

  // 1. Dòng 2 (Row idx 1): Title "KẾT QUẢ RÈN LUYỆN LỚP [Tên Lớp]" (Merge A2:E2)
  const titleText = `KẾT QUẢ RÈN LUYỆN LỚP ${className}`;
  const titleStyle = {
    font: { name: 'Times New Roman', sz: 14, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  setCell(1, 0, titleText, titleStyle);
  for (let c = 1; c <= 4; c++) setCell(1, c, '', titleStyle);

  // 2. Dòng 3 (Row idx 2): GVCN (Merge B3:E3)
  const teacherText = `GVCN: ${homeroomTeacher || 'Nguyễn Văn Sang'}`;
  const teacherStyle = {
    font: { name: 'Times New Roman', sz: 11, bold: true, italic: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
  setCell(2, 0, '', teacherStyle);
  setCell(2, 1, teacherText, teacherStyle);
  for (let c = 2; c <= 4; c++) setCell(2, c, '', teacherStyle);

  // 3. Dòng 4 (Row idx 3): Tuần X/ Tháng Y (Merge C4:E4)
  const periodStyle = {
    font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  setCell(3, 0, '', periodStyle);
  setCell(3, 1, '', periodStyle);
  setCell(3, 2, displayPeriod, periodStyle);
  setCell(3, 3, '', periodStyle);
  setCell(3, 4, '', periodStyle);

  // 4. Dòng 5 (Row idx 4): Header bảng 5 cột chuẩn
  const tableHeaderStyle = {
    font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'E2E8F0' } },
    border: thinBorder,
  };

  setCell(4, 0, 'STT', tableHeaderStyle);
  setCell(4, 1, 'Họ và tên', tableHeaderStyle);
  setCell(4, 2, 'Điểm rèn luyện', tableHeaderStyle);
  setCell(4, 3, 'Lỗi vi phạm', tableHeaderStyle);
  setCell(4, 4, 'Điểm cộng', tableHeaderStyle);

  // 5. DATA ROWS (Row idx 5 onwards)
  rows.forEach((r, idx) => {
    const rowIdx = 5 + idx;

    // STT
    setCell(rowIdx, 0, idx + 1, {
      font: { name: 'Times New Roman', sz: 11, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    });

    // Họ và tên
    setCell(rowIdx, 1, r.fullName, {
      font: { name: 'Times New Roman', sz: 11, color: { rgb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: thinBorder,
    });

    // Điểm rèn luyện (In chữ số đỏ đậm FF0000 y hệt mẫu)
    setCell(rowIdx, 2, r.finalScore, {
      font: { name: 'Times New Roman', sz: 12, bold: true, color: { rgb: 'FF0000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    });

    // Lỗi vi phạm (xuống dòng từng lỗi, wrapText)
    const violationsStr = r.violationsLines.length > 0 ? r.violationsLines.join('\n') : '';
    setCell(rowIdx, 3, violationsStr, {
      font: { name: 'Times New Roman', sz: 10.5, color: { rgb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: thinBorder,
    });

    // Điểm cộng (cách nhau dấu chấm phẩy hoặc xuống dòng, wrapText)
    const bonusesStr = r.bonusesList.length > 0 ? r.bonusesList.join('; ') : '';
    setCell(rowIdx, 4, bonusesStr, {
      font: { name: 'Times New Roman', sz: 10.5, color: { rgb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: thinBorder,
    });
  });

  // Cell merges chuẩn mẫu 12B4
  ws['!merges'] = [
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Title: A2:E2
    { s: { r: 2, c: 1 }, e: { r: 2, c: 4 } }, // GVCN: B3:E3
    { s: { r: 3, c: 2 }, e: { r: 3, c: 4 } }, // Tuần/Tháng: C4:E4
  ];

  // Set ref range
  const totalRows = 5 + rows.length;
  ws['!ref'] = `A1:E${Math.max(totalRows, 6)}`;

  // Append sheet and download
  XLSX.utils.book_append_sheet(wb, ws, cleanSheetName.slice(0, 31));

  const fileName = `Ket_qua_ren_luyen_Lop_${className}_${cleanSheetName}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Xuất file Excel nhiều sheet cho cả tháng (ví dụ: T1-T10, T2-T10, T3-T10, T4-T10)
 * Chuẩn 100% mẫu file '12B4- Chấm điểm rèn luyện tháng 10.xlsx'
 */
export function exportMultiWeekConductToExcel(params: {
  className: string;
  homeroomTeacher: string;
  month: number;
  weeksData: Array<{
    weekNumber: number;
    rows: ConductSheetRow[];
  }>;
}) {
  const { className, homeroomTeacher, month, weeksData } = params;
  const wb = XLSX.utils.book_new();

  weeksData.forEach(({ weekNumber, rows }) => {
    const ws: XLSX.WorkSheet = {};
    const sheetName = `T${weekNumber}-T${month}`;
    const displayPeriod = `Tuần ${weekNumber}/ Tháng ${month}`;

    ws['!rows'] = [
      { hpt: 16 },
      { hpt: 28 },
      { hpt: 20 },
      { hpt: 22 },
      { hpt: 24 },
    ];

    ws['!cols'] = [
      { wch: 7 },
      { wch: 26 },
      { wch: 15 },
      { wch: 48 },
      { wch: 48 },
    ];

    const setCell = (r: number, c: number, val: string | number, style: any) => {
      const ref = XLSX.utils.encode_cell({ r, c });
      ws[ref] = {
        t: typeof val === 'number' ? 'n' : 's',
        v: val,
        s: style,
      };
    };

    // Title
    const titleText = `KẾT QUẢ RÈN LUYỆN LỚP ${className}`;
    const titleStyle = {
      font: { name: 'Times New Roman', sz: 14, bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
    setCell(1, 0, titleText, titleStyle);
    for (let c = 1; c <= 4; c++) setCell(1, c, '', titleStyle);

    // GVCN
    const teacherText = `GVCN: ${homeroomTeacher || 'Nguyễn Văn Sang'}`;
    const teacherStyle = {
      font: { name: 'Times New Roman', sz: 11, bold: true, italic: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
    setCell(2, 0, '', teacherStyle);
    setCell(2, 1, teacherText, teacherStyle);
    for (let c = 2; c <= 4; c++) setCell(2, c, '', teacherStyle);

    // Period
    const periodStyle = {
      font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
    setCell(3, 0, '', periodStyle);
    setCell(3, 1, '', periodStyle);
    setCell(3, 2, displayPeriod, periodStyle);
    setCell(3, 3, '', periodStyle);
    setCell(3, 4, '', periodStyle);

    // Header table
    const tableHeaderStyle = {
      font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      fill: { fgColor: { rgb: 'E2E8F0' } },
      border: thinBorder,
    };

    setCell(4, 0, 'STT', tableHeaderStyle);
    setCell(4, 1, 'Họ và tên', tableHeaderStyle);
    setCell(4, 2, 'Điểm rèn luyện', tableHeaderStyle);
    setCell(4, 3, 'Lỗi vi phạm', tableHeaderStyle);
    setCell(4, 4, 'Điểm cộng', tableHeaderStyle);

    // Data rows
    rows.forEach((r, idx) => {
      const rowIdx = 5 + idx;

      setCell(rowIdx, 0, idx + 1, {
        font: { name: 'Times New Roman', sz: 11, color: { rgb: '000000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: thinBorder,
      });

      setCell(rowIdx, 1, r.fullName, {
        font: { name: 'Times New Roman', sz: 11, color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center' },
        border: thinBorder,
      });

      setCell(rowIdx, 2, r.finalScore, {
        font: { name: 'Times New Roman', sz: 12, bold: true, color: { rgb: 'FF0000' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: thinBorder,
      });

      const violationsStr = r.violationsLines.length > 0 ? r.violationsLines.join('\n') : '';
      setCell(rowIdx, 3, violationsStr, {
        font: { name: 'Times New Roman', sz: 10.5, color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: thinBorder,
      });

      const bonusesStr = r.bonusesList.length > 0 ? r.bonusesList.join('; ') : '';
      setCell(rowIdx, 4, bonusesStr, {
        font: { name: 'Times New Roman', sz: 10.5, color: { rgb: '000000' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: thinBorder,
      });
    });

    ws['!merges'] = [
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: 4 } },
      { s: { r: 3, c: 2 }, e: { r: 3, c: 4 } },
    ];

    const totalRows = 5 + rows.length;
    ws['!ref'] = `A1:E${Math.max(totalRows, 6)}`;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const fileName = `Ket_qua_ren_luyen_Lop_${className}_Thang_${month}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Xuất file Word (.doc) chuẩn mẫu hiển thị y hệt ảnh:
 * Tiêu đề KẾT QUẢ RÈN LUYỆN LỚP [Tên Lớp], bảng 5 cột viền đen, điểm đỏ, ngắt dòng
 */
export function exportConductSheetToWord(options: ConductReportExportOptions) {
  const { className, periodLabel, rows } = options;

  const tableRowsHtml = rows
    .map((r, idx) => {
      const violationsHtml = r.violationsLines.length > 0
        ? r.violationsLines.map(v => `<div>${v}</div>`).join('')
        : '';
      const bonusesHtml = r.bonusesList.length > 0
        ? `<div>${r.bonusesList.join(', ')}</div>`
        : '';

      return `
        <tr>
          <td style="text-align: center; padding: 5px 4px; border: 1px solid #000;">${idx + 1}</td>
          <td style="padding: 5px 8px; border: 1px solid #000; white-space: nowrap;">${r.fullName}</td>
          <td style="text-align: center; padding: 5px 4px; border: 1px solid #000; font-weight: bold; color: #ff0000; font-size: 11pt;">${formatVietnameseNumber(r.finalScore)}</td>
          <td style="padding: 5px 8px; border: 1px solid #000; line-height: 1.35; font-size: 10pt;">${violationsHtml}</td>
          <td style="padding: 5px 8px; border: 1px solid #000; line-height: 1.35; font-size: 10pt;">${bonusesHtml}</td>
        </tr>
      `;
    })
    .join('');

  const teacherDisplayName = options.homeroomTeacher || 'Nguyễn Văn Sang';
  const schoolYearStr = options.schoolYear || '2026 - 2027';

  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <title>KẾT QUẢ RÈN LUYỆN LỚP ${className}</title>
      <style>
        @page {
          size: 210mm 297mm;
          margin: 15mm 12mm 15mm 12mm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.25;
          color: #000;
        }
        h2 {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          margin: 10px 0 4px;
          text-transform: uppercase;
          color: #0f172a;
        }
        table.data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        table.data-table th, table.data-table td {
          border: 1px solid #000;
        }
        table.data-table th {
          background-color: #e2e8f0;
          font-weight: bold;
          text-align: center;
          padding: 6px;
          font-size: 10.5pt;
        }
      </style>
    </head>
    <body>
      <table style="width: 100%; border: none; margin-bottom: 12px;">
        <tr>
          <td style="border: none; text-align: center; width: 45%; vertical-align: top;">
            <div style="font-weight: bold; font-size: 10pt;">TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP</div>
            <div style="font-weight: bold; font-size: 10pt; color: #1e3a8a;">KHOA CƠ BẢN</div>
            <div style="font-size: 9pt;">-----------------</div>
          </td>
          <td style="border: none; text-align: center; width: 55%; vertical-align: top;">
            <div style="font-weight: bold; font-size: 10pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div style="font-weight: bold; font-style: italic; font-size: 10pt;">Độc lập - Tự do - Hạnh phúc</div>
            <div style="font-size: 9pt;">-----------------</div>
          </td>
        </tr>
      </table>

      <h2>KẾT QUẢ RÈN LUYỆN LỚP ${className}</h2>
      <div style="text-align: center; font-style: italic; font-size: 10.5pt; color: #334155; margin-bottom: 14px;">
        Năm học: ${schoolYearStr} &nbsp;|&nbsp; Thời gian: ${periodLabel} &nbsp;|&nbsp; GVCN: ${teacherDisplayName}
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th rowspan="2" style="width: 35px;">TT</th>
            <th rowspan="2" style="width: 170px;">Họ và tên</th>
            <th colspan="3">${periodLabel}</th>
          </tr>
          <tr>
            <th style="width: 85px;">Điểm<br/>rèn luyện</th>
            <th>Lỗi vi phạm</th>
            <th>Cộng điểm</th>
          </tr>
        </thead>
        <tbody>
          ${tableRowsHtml}
        </tbody>
      </table>

      <table style="width: 100%; border: none; margin-top: 28px;">
        <tr>
          <td style="border: none; text-align: center; width: 50%; vertical-align: top;">
            <div style="font-weight: bold; font-size: 11pt;">NGƯỜI LẬP BIỂU</div>
            <div style="font-style: italic; font-size: 10pt; color: #64748b;">(Ký và ghi rõ họ tên)</div>
          </td>
          <td style="border: none; text-align: center; width: 50%; vertical-align: top;">
            <div style="font-style: italic; font-size: 10.5pt; margin-bottom: 4px;">Thái Nguyên, ngày ..... tháng ..... năm 202...</div>
            <div style="font-weight: bold; font-size: 11pt;">GIÁO VIÊN CHỦ NHIỆM</div>
            <div style="font-style: italic; font-size: 10pt; color: #64748b;">(Ký và ghi rõ họ tên)</div>
            <div style="height: 55px;"></div>
            <div style="font-weight: bold; font-size: 11pt;">${teacherDisplayName}</div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Ket_qua_ren_luyen_Lop_${className}_${periodLabel.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sao chép bảng rèn luyện vào Clipboard dưới định dạng TSV để dán thẳng vào Excel
 */
export async function copyConductSheetToClipboard(options: ConductReportExportOptions): Promise<boolean> {
  try {
    const { rows, periodLabel } = options;
    const header = `TT\tHọ và tên\t${periodLabel} - Điểm rèn luyện\tLỗi vi phạm\tCộng điểm\n`;
    const body = rows.map((r, idx) => {
      const v = r.violationsLines.join('; ');
      const b = r.bonusesList.join(', ');
      return `${idx + 1}\t${r.fullName}\t${r.finalScore}\t${v}\t${b}`;
    }).join('\n');

    await navigator.clipboard.writeText(header + body);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
