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
  const { className, periodLabel, rows } = options;

  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  // Row heights
  ws['!rows'] = [
    { hpt: 32 }, // Row 0: Title "KẾT QUẢ RÈN LUYỆN LỚP 12B6"
    { hpt: 22 }, // Row 1: Header tier 1 (TT, Họ tên, Tuần 5)
    { hpt: 26 }, // Row 2: Header tier 2 (Điểm rèn luyện, Lỗi vi phạm, Cộng điểm)
  ];

  // Column widths
  ws['!cols'] = [
    { wch: 6 },   // TT
    { wch: 25 },  // Họ và tên
    { wch: 13 },  // Điểm rèn luyện
    { wch: 46 },  // Lỗi vi phạm
    { wch: 46 },  // Cộng điểm
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

  // 1. ROW 0: Title "KẾT QUẢ RÈN LUYỆN LỚP 12B6"
  const titleText = `KẾT QUẢ RÈN LUYỆN LỚP ${className}`;
  const titleStyle = {
    font: { name: 'Times New Roman', sz: 14, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  setCell(0, 0, titleText, titleStyle);
  for (let c = 1; c <= 4; c++) {
    setCell(0, c, '', titleStyle);
  }

  // 2. ROW 1 & 2: Header Tier 1 & 2
  const headerStyle = {
    font: { name: 'Times New Roman', sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: thinBorder,
  };

  // Cell A2 (r:1, c:0): TT (merge A2:A3)
  setCell(1, 0, 'TT', headerStyle);
  setCell(2, 0, '', headerStyle);

  // Cell B2 (r:1, c:1): Họ và tên (merge B2:B3)
  setCell(1, 1, 'Họ và tên', headerStyle);
  setCell(2, 1, '', headerStyle);

  // Cell C2 (r:1, c:2): Tuần 5 (merge C2:E2)
  setCell(1, 2, periodLabel, headerStyle);
  setCell(1, 3, '', headerStyle);
  setCell(1, 4, '', headerStyle);

  // Cell C3 (r:2, c:2): Điểm rèn luyện
  setCell(2, 2, 'Điểm\nrèn luyện', headerStyle);

  // Cell D3 (r:2, c:3): Lỗi vi phạm
  setCell(2, 3, 'Lỗi vi phạm', headerStyle);

  // Cell E3 (r:2, c:4): Cộng điểm
  setCell(2, 4, 'Cộng điểm', headerStyle);

  // Ensure merge borders
  fillMergeBorders(1, 0, 2, 0, headerStyle);
  fillMergeBorders(1, 1, 2, 1, headerStyle);
  fillMergeBorders(1, 2, 1, 4, headerStyle);

  // 3. DATA ROWS (Row 3 onwards)
  rows.forEach((r, idx) => {
    const rowIdx = 3 + idx;

    // TT
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

    // Cộng điểm (cách nhau dấu phẩy hoặc xuống dòng, wrapText)
    const bonusesStr = r.bonusesList.length > 0 ? r.bonusesList.join(', ') : '';
    setCell(rowIdx, 4, bonusesStr, {
      font: { name: 'Times New Roman', sz: 10.5, color: { rgb: '000000' } },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: thinBorder,
    });
  });

  // Cell merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Title
    { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } }, // TT
    { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } }, // Họ và tên
    { s: { r: 1, c: 2 }, e: { r: 1, c: 4 } }, // Tuần 5
  ];

  // Set ref range
  const totalRows = 3 + rows.length;
  ws['!ref'] = `A1:E${Math.max(totalRows, 4)}`;

  // Append sheet and download
  const cleanSheetName = periodLabel.replace(/\s+/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, cleanSheetName.slice(0, 31));

  const fileName = `Ket_qua_ren_luyen_Lop_${className}_${periodLabel.replace(/\s+/g, '_')}.xlsx`;
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
          color: #000;
        }
        h2 {
          text-align: center;
          font-size: 14pt;
          font-weight: bold;
          margin: 0 0 16px;
          text-transform: uppercase;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #000;
        }
        th {
          font-weight: bold;
          text-align: center;
          padding: 6px;
          font-size: 10.5pt;
        }
      </style>
    </head>
    <body>
      <h2>KẾT QUẢ RÈN LUYỆN LỚP ${className}</h2>

      <table>
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
