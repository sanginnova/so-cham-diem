import XLSX from 'xlsx-js-style';
import type { HomeroomRecord } from '../types/homeroom';

export interface CollectionRowData {
  studentId: string;
  code: string;
  name: string;
  base: number;
  discount: number;
  due: number;
  paid: number;
  remaining: number;
  excess: number;
  status: string;
  allowance?: HomeroomRecord;
  transactions?: HomeroomRecord[];
}

export interface CollectionExportOptions {
  collection: HomeroomRecord;
  rows: CollectionRowData[];
  records: HomeroomRecord[];
  classConfig: {
    className: string;
    schoolYear: string;
    teacherName?: string;
  };
  totals: {
    due: number;
    paid: number;
    remaining: number;
    excess: number;
    discount: number;
  };
  teacherName?: string;
}

const FONT_NAME = 'Times New Roman';

const thinBorder = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'thin', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

const totalBorder = {
  top: { style: 'thin', color: { rgb: '000000' } },
  bottom: { style: 'double', color: { rgb: '000000' } },
  left: { style: 'thin', color: { rgb: '000000' } },
  right: { style: 'thin', color: { rgb: '000000' } },
};

function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Xuất file Excel (.xlsx) theo dõi thu nộp học sinh:
 * - 100% font Times New Roman trên mọi ô.
 * - Định dạng bảng đẹp mắt, phân cấp rõ ràng (Quốc hiệu, Tiêu đề, Thông tin đợt thu, Bảng dữ liệu viền nét mảnh, Tổng cộng 2 gạch dưới, Khung chữ ký GVCN & Thủ quỹ).
 * - "Chưa nộp=0 thì để trống": Các ô giá trị = 0 (Đã nộp, Còn thiếu, Miễn/giảm, Nộp dư) được để trống hoàn toàn để dễ dàng rà soát học sinh nộp/chưa nộp.
 */
export function buildCollectionWorkbook(options: CollectionExportOptions) {
  const { collection, rows, records, classConfig, totals, teacherName } = options;
  const wb = XLSX.utils.book_new();

  // ==========================================
  // SHEET 1: THEO DÕI THU NỘP
  // ==========================================
  const wsMain: XLSX.WorkSheet = {};
  const mainMerges: XLSX.Range[] = [];

  const setCell = (r: number, c: number, val: string | number, style: any, numFormat?: string) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    const isNum = typeof val === 'number';
    wsMain[ref] = {
      t: isNum ? 'n' : 's',
      v: val,
      s: style,
      ...(isNum && numFormat ? { z: numFormat } : {}),
    };
  };

  const fillAreaBorders = (startR: number, startC: number, endR: number, endC: number, style: any) => {
    for (let r = startR; r <= endR; r++) {
      for (let c = startC; c <= endC; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!wsMain[ref]) {
          wsMain[ref] = { t: 's', v: '', s: style };
        }
      }
    }
  };

  // Header hành chính:
  // Hàng 0, 1, 2:
  // Cột A-D (c: 0-3): TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP / KHOA CƠ BẢN
  // Cột G-K (c: 6-10): CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM / Độc lập - Tự do - Hạnh phúc
  const adminLeftTopStyle = {
    font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const adminLeftSubStyle = {
    font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '1E3A8A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const adminRightTopStyle = {
    font: { name: FONT_NAME, sz: 10, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const adminRightSubStyle = {
    font: { name: FONT_NAME, sz: 10, italic: true, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  setCell(0, 0, 'TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP', adminLeftTopStyle);
  setCell(1, 0, 'KHOA CƠ BẢN', adminLeftSubStyle);
  mainMerges.push(
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }
  );

  setCell(0, 6, 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', adminRightTopStyle);
  setCell(1, 6, 'Độc lập - Tự do - Hạnh phúc', adminRightSubStyle);
  mainMerges.push(
    { s: { r: 0, c: 6 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 6 }, e: { r: 1, c: 10 } }
  );

  // Tiêu đề chính (Row 3):
  const collectionName = (collection.data.name || 'CÁC KHOẢN THU').toUpperCase();
  const titleStyle = {
    font: { name: FONT_NAME, sz: 14, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  setCell(3, 0, `BẢNG THEO DÕI THU NỘP: ${collectionName}`, titleStyle);
  mainMerges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 10 } });

  // Thông tin phụ (Row 4 & 5):
  const infoStyle = {
    font: { name: FONT_NAME, sz: 10.5, italic: true, color: { rgb: '334155' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const baseMoneyFormatted = new Intl.NumberFormat('vi-VN').format(Number(collection.data.amount || 0));
  const subInfoText1 = `Lớp: ${classConfig.className}  |  Năm học: ${classConfig.schoolYear}  |  Mức thu: ${baseMoneyFormatted} đ/học sinh`;
  const subInfoText2 = `Hạn nộp: ${formatDateVN(collection.data.dueDate) || 'Chưa quy định'}  |  Trạng thái: ${collection.data.status || 'Đang thu'}  |  Tổng số học sinh: ${rows.length} em`;
  setCell(4, 0, subInfoText1, infoStyle);
  setCell(5, 0, subInfoText2, infoStyle);
  mainMerges.push(
    { s: { r: 4, c: 0 }, e: { r: 4, c: 10 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 10 } }
  );

  // Tiêu đề bảng dữ liệu (Row 7):
  const headerCols = [
    { label: 'STT', width: 6 },
    { label: 'Mã học sinh', width: 14 },
    { label: 'Họ và tên', width: 25 },
    { label: 'Mức thu (đ)', width: 14 },
    { label: 'Miễn/giảm (đ)', width: 14 },
    { label: 'Phải nộp (đ)', width: 14 },
    { label: 'Đã nộp (đ)', width: 14 },
    { label: 'Còn thiếu (đ)', width: 14 },
    { label: 'Nộp dư (đ)', width: 13 },
    { label: 'Trạng thái', width: 15 },
    { label: 'Ghi chú / Ký nhận', width: 22 },
  ];

  const headerRowIdx = 7;
  const tableHeaderStyle = {
    font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'E2E8F0' } }, // Soft slate background
    border: thinBorder,
  };

  headerCols.forEach((col, idx) => {
    setCell(headerRowIdx, idx, col.label, tableHeaderStyle);
  });

  // Dữ liệu từng học sinh (Row 8 trở đi):
  const startDataRow = 8;
  const cellTextStyleCenter = {
    font: { name: FONT_NAME, sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };
  const cellTextStyleLeft = {
    font: { name: FONT_NAME, sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder,
  };
  const cellNumberStyleRight = {
    font: { name: FONT_NAME, sz: 11, color: { rgb: '000000' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder,
  };
  const cellPaidNumberStyle = {
    font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: '047857' } }, // Dark emerald
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder,
  };
  const cellDebtNumberStyle = {
    font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: 'B91C1C' } }, // Dark red
    alignment: { horizontal: 'right', vertical: 'center' },
    border: thinBorder,
  };

  rows.forEach((r, idx) => {
    const rowIdx = startDataRow + idx;

    // 0. STT
    setCell(rowIdx, 0, idx + 1, cellTextStyleCenter);

    // 1. Mã học sinh
    setCell(rowIdx, 1, r.code, cellTextStyleCenter);

    // 2. Họ và tên
    setCell(rowIdx, 2, r.name, cellTextStyleLeft);

    // 3. Mức thu (đ)
    if (r.base > 0) {
      setCell(rowIdx, 3, r.base, cellNumberStyleRight, '#,##0');
    } else {
      setCell(rowIdx, 3, '', cellNumberStyleRight);
    }

    // 4. Miễn/giảm (đ) - Chưa có/0 thì để trống
    if (r.discount > 0) {
      setCell(rowIdx, 4, r.discount, cellNumberStyleRight, '#,##0');
    } else {
      setCell(rowIdx, 4, '', cellNumberStyleRight);
    }

    // 5. Phải nộp (đ) - Nếu 0 thì để trống
    if (r.due > 0) {
      setCell(rowIdx, 5, r.due, cellNumberStyleRight, '#,##0');
    } else {
      setCell(rowIdx, 5, '', cellNumberStyleRight);
    }

    // 6. Đã nộp (đ) - "Chưa nộp=0 thì để trống"
    if (r.paid > 0) {
      setCell(rowIdx, 6, r.paid, cellPaidNumberStyle, '#,##0');
    } else {
      setCell(rowIdx, 6, '', cellNumberStyleRight);
    }

    // 7. Còn thiếu (đ) - Đã nộp đủ (=0) thì để trống
    if (r.remaining > 0) {
      setCell(rowIdx, 7, r.remaining, cellDebtNumberStyle, '#,##0');
    } else {
      setCell(rowIdx, 7, '', cellNumberStyleRight);
    }

    // 8. Nộp dư (đ) - Không dư (=0) thì để trống
    if (r.excess > 0) {
      setCell(rowIdx, 8, r.excess, cellNumberStyleRight, '#,##0');
    } else {
      setCell(rowIdx, 8, '', cellNumberStyleRight);
    }

    // 9. Trạng thái
    let statusColor = '000000';
    if (r.status === 'Đã nộp') statusColor = '047857';
    else if (r.status === 'Chưa nộp') statusColor = 'B91C1C';
    else if (r.status === 'Nộp một phần') statusColor = 'C2410C';
    else if (r.status === 'Nộp dư') statusColor = '1D4ED8';
    else if (r.status === 'Miễn') statusColor = '4B5563';

    setCell(rowIdx, 9, r.status, {
      font: { name: FONT_NAME, sz: 10.5, bold: true, color: { rgb: statusColor } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    });

    // 10. Ghi chú / Ký nhận
    const noteText = r.allowance?.data.reason || '';
    setCell(rowIdx, 10, noteText, cellTextStyleLeft);
  });

  // Hàng TỔNG CỘNG:
  const totalRowIdx = startDataRow + rows.length;
  const totalLabelStyle = {
    font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    border: totalBorder,
  };
  const totalNumStyle = {
    font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    border: totalBorder,
  };

  // Merge A..C cho chữ TỔNG CỘNG
  setCell(totalRowIdx, 0, 'TỔNG CỘNG', totalLabelStyle);
  setCell(totalRowIdx, 1, '', totalLabelStyle);
  setCell(totalRowIdx, 2, '', totalLabelStyle);
  mainMerges.push({ s: { r: totalRowIdx, c: 0 }, e: { r: totalRowIdx, c: 2 } });

  const totalBase = rows.reduce((s, r) => s + r.base, 0);
  setCell(totalRowIdx, 3, totalBase, totalNumStyle, '#,##0');
  setCell(totalRowIdx, 4, totals.discount > 0 ? totals.discount : '', totalNumStyle, totals.discount > 0 ? '#,##0' : undefined);
  setCell(totalRowIdx, 5, totals.due, totalNumStyle, '#,##0');
  setCell(totalRowIdx, 6, totals.paid, totalNumStyle, '#,##0');
  setCell(totalRowIdx, 7, totals.remaining > 0 ? totals.remaining : '', totalNumStyle, totals.remaining > 0 ? '#,##0' : undefined);
  setCell(totalRowIdx, 8, totals.excess > 0 ? totals.excess : '', totalNumStyle, totals.excess > 0 ? '#,##0' : undefined);
  setCell(totalRowIdx, 9, '', totalLabelStyle);
  setCell(totalRowIdx, 10, '', totalLabelStyle);

  // Khung chữ ký (Signatures):
  const signDateRowIdx = totalRowIdx + 2;
  const now = new Date();
  const dateStr = `Thái Nguyên, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}`;
  const dateStyle = {
    font: { name: FONT_NAME, sz: 11, italic: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  setCell(signDateRowIdx, 7, dateStr, dateStyle);
  mainMerges.push({ s: { r: signDateRowIdx, c: 7 }, e: { r: signDateRowIdx, c: 10 } });

  const signTitleRowIdx = signDateRowIdx + 1;
  const signSubRowIdx = signTitleRowIdx + 1;
  const signNameRowIdx = signTitleRowIdx + 5;

  const signRoleStyle = {
    font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const signSubStyle = {
    font: { name: FONT_NAME, sz: 10, italic: true, color: { rgb: '475569' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  const signNameStyle = {
    font: { name: FONT_NAME, sz: 11, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  // Bên trái: NGƯỜI LẬP BIỂU / THỦ QUỸ LỚP
  setCell(signTitleRowIdx, 0, 'NGƯỜI LẬP BIỂU', signRoleStyle);
  setCell(signSubRowIdx, 0, '(Ký và ghi rõ họ tên)', signSubStyle);
  mainMerges.push(
    { s: { r: signTitleRowIdx, c: 0 }, e: { r: signTitleRowIdx, c: 3 } },
    { s: { r: signSubRowIdx, c: 0 }, e: { r: signSubRowIdx, c: 3 } }
  );

  // Bên phải: GIÁO VIÊN CHỦ NHIỆM
  const gvcnName = teacherName || (classConfig as any)?.teacherName || 'Nguyễn Văn Sang';
  setCell(signTitleRowIdx, 7, 'GIÁO VIÊN CHỦ NHIỆM', signRoleStyle);
  setCell(signSubRowIdx, 7, '(Ký và ghi rõ họ tên)', signSubStyle);
  setCell(signNameRowIdx, 7, gvcnName, signNameStyle);
  mainMerges.push(
    { s: { r: signTitleRowIdx, c: 7 }, e: { r: signTitleRowIdx, c: 10 } },
    { s: { r: signSubRowIdx, c: 7 }, e: { r: signSubRowIdx, c: 10 } },
    { s: { r: signNameRowIdx, c: 7 }, e: { r: signNameRowIdx, c: 10 } }
  );

  // Row heights & Col widths
  wsMain['!merges'] = mainMerges;
  wsMain['!cols'] = headerCols.map((c) => ({ wch: c.width }));
  wsMain['!rows'] = [
    { hpt: 20 }, // 0
    { hpt: 20 }, // 1
    { hpt: 10 }, // 2
    { hpt: 28 }, // 3: Tiêu đề
    { hpt: 20 }, // 4
    { hpt: 20 }, // 5
    { hpt: 10 }, // 6: Đệm
    { hpt: 28 }, // 7: Header
    ...rows.map(() => ({ hpt: 22 })),
    { hpt: 24 }, // Tổng cộng
  ];

  const totalMainRows = signNameRowIdx + 2;
  wsMain['!ref'] = `A1:K${totalMainRows}`;
  XLSX.utils.book_append_sheet(wb, wsMain, 'Theo doi thu nop');

  // ==========================================
  // SHEET 2: LỊCH SỬ NỘP TIỀN
  // ==========================================
  const wsHistory: XLSX.WorkSheet = {};
  const historyMerges: XLSX.Range[] = [];

  const setHistoryCell = (r: number, c: number, val: string | number, style: any, numFormat?: string) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    const isNum = typeof val === 'number';
    wsHistory[ref] = {
      t: isNum ? 'n' : 's',
      v: val,
      s: style,
      ...(isNum && numFormat ? { z: numFormat } : {}),
    };
  };

  const historyTitleStyle = {
    font: { name: FONT_NAME, sz: 13, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  setHistoryCell(0, 0, `NHẬT KÝ LỊCH SỬ NỘP TIỀN - ${collectionName}`, historyTitleStyle);
  historyMerges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });

  const historyHeaders = [
    { label: 'STT', width: 6 },
    { label: 'Mã phiếu', width: 14 },
    { label: 'Ngày ghi nhận', width: 14 },
    { label: 'Học sinh', width: 25 },
    { label: 'Số tiền nộp (đ)', width: 16 },
    { label: 'Phương thức', width: 14 },
    { label: 'Trạng thái phiếu', width: 16 },
    { label: 'Nội dung / Ghi chú', width: 30 },
    { label: 'Lý do điều chỉnh / hủy', width: 30 },
  ];

  historyHeaders.forEach((h, idx) => {
    setHistoryCell(2, idx, h.label, tableHeaderStyle);
  });

  const paymentRecords = records
    .filter((r) => r.kind === 'payment' && r.data.collectionId === collection.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  paymentRecords.forEach((p, idx) => {
    const rowIdx = 3 + idx;
    const student = rows.find((s) => s.studentId === p.studentId);
    const studentName = student ? `${student.name} (${student.code})` : p.studentId;
    const amt = Number(p.data.amount) || 0;
    const isVoid = p.data.state === 'Đã hủy';

    setHistoryCell(rowIdx, 0, idx + 1, cellTextStyleCenter);
    setHistoryCell(rowIdx, 1, p.id.slice(0, 8), cellTextStyleCenter);
    setHistoryCell(rowIdx, 2, formatDateVN(p.date), cellTextStyleCenter);
    setHistoryCell(rowIdx, 3, studentName, cellTextStyleLeft);
    setHistoryCell(
      rowIdx,
      4,
      amt > 0 ? amt : '',
      {
        ...cellNumberStyleRight,
        font: {
          name: FONT_NAME,
          sz: 11,
          bold: true,
          color: { rgb: isVoid ? '9CA3AF' : '047857' },
        },
      },
      amt > 0 ? '#,##0' : undefined
    );
    setHistoryCell(rowIdx, 5, p.data.method || 'Tiền mặt', cellTextStyleCenter);
    setHistoryCell(rowIdx, 6, p.data.state || 'Đã ghi nhận', {
      font: {
        name: FONT_NAME,
        sz: 10.5,
        bold: true,
        color: { rgb: isVoid ? 'DC2626' : '047857' },
      },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    });
    setHistoryCell(rowIdx, 7, p.data.note || '', cellTextStyleLeft);
    setHistoryCell(rowIdx, 8, p.data.voidReason || '', cellTextStyleLeft);
  });

  wsHistory['!merges'] = historyMerges;
  wsHistory['!cols'] = historyHeaders.map((h) => ({ wch: h.width }));
  wsHistory['!ref'] = `A1:I${Math.max(4 + paymentRecords.length, 5)}`;
  XLSX.utils.book_append_sheet(wb, wsHistory, 'Lich su nop');

  // ==========================================
  // SHEET 3: TỔNG HỢP TIẾN ĐỘ ĐỢT THU
  // ==========================================
  const wsSummary: XLSX.WorkSheet = {};
  const summaryMerges: XLSX.Range[] = [];

  const setSummaryCell = (r: number, c: number, val: string | number, style: any, numFormat?: string) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    const isNum = typeof val === 'number';
    wsSummary[ref] = {
      t: isNum ? 'n' : 's',
      v: val,
      s: style,
      ...(isNum && numFormat ? { z: numFormat } : {}),
    };
  };

  setSummaryCell(0, 0, `BÁO CÁO TỔNG QUAN TIẾN ĐỘ THU: ${collectionName}`, historyTitleStyle);
  summaryMerges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });

  const summaryItems = [
    { key: 'Lớp học', val: classConfig.className },
    { key: 'Niên khóa', val: classConfig.schoolYear },
    { key: 'Giáo viên chủ nhiệm', val: gvcnName },
    { key: 'Khoản thu', val: collection.data.name },
    { key: 'Ngày bắt đầu thu', val: formatDateVN(collection.date) },
    { key: 'Hạn nộp', val: formatDateVN(collection.data.dueDate) || 'Không giới hạn' },
    { key: 'Trạng thái đợt thu', val: collection.data.status || 'Đang thu' },
    { key: 'Mức thu quy định', val: `${baseMoneyFormatted} đ / học sinh` },
    { key: 'Tổng số học sinh', val: `${rows.length} học sinh` },
    { key: 'Tổng số tiền phải thu', val: totals.due, numFormat: '#,##0' },
    { key: 'Tổng số tiền đã thu', val: totals.paid, numFormat: '#,##0' },
    { key: 'Tổng số tiền còn thiếu', val: totals.remaining, numFormat: '#,##0' },
    { key: 'Tổng số tiền nộp dư', val: totals.excess, numFormat: '#,##0' },
    { key: 'Tổng tiền miễn/giảm', val: totals.discount, numFormat: '#,##0' },
    {
      key: 'Tỷ lệ hoàn thành theo số tiền',
      val: totals.due > 0 ? `${Math.round((totals.paid / totals.due) * 100)}%` : '100%',
    },
    {
      key: 'Số học sinh đã nộp đủ',
      val: `${rows.filter((r) => r.status === 'Đã nộp').length} học sinh`,
    },
    {
      key: 'Số học sinh chưa nộp',
      val: `${rows.filter((r) => r.status === 'Chưa nộp').length} học sinh`,
    },
    {
      key: 'Số học sinh nộp một phần',
      val: `${rows.filter((r) => r.status === 'Nộp một phần').length} học sinh`,
    },
    {
      key: 'Số học sinh được miễn/giảm',
      val: `${rows.filter((r) => r.discount > 0 || r.status === 'Miễn').length} học sinh`,
    },
  ];

  setSummaryCell(2, 0, 'CHỈ TIÊU / THÔNG SỐ', tableHeaderStyle);
  setSummaryCell(2, 1, 'GIÁ TRỊ THỰC HIỆN', tableHeaderStyle);

  summaryItems.forEach((item, idx) => {
    const rowIdx = 3 + idx;
    setSummaryCell(rowIdx, 0, item.key, {
      font: { name: FONT_NAME, sz: 11, bold: idx >= 9 && idx <= 14, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border: thinBorder,
    });
    setSummaryCell(
      rowIdx,
      1,
      item.val,
      {
        font: {
          name: FONT_NAME,
          sz: 11,
          bold: idx >= 9 && idx <= 14,
          color: {
            rgb:
              item.key === 'Tổng số tiền đã thu'
                ? '047857'
                : item.key === 'Tổng số tiền còn thiếu' && totals.remaining > 0
                ? 'B91C1C'
                : '000000',
          },
        },
        alignment: {
          horizontal: typeof item.val === 'number' ? 'right' : 'center',
          vertical: 'center',
        },
        border: thinBorder,
      },
      item.numFormat
    );
  });

  wsSummary['!merges'] = summaryMerges;
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 30 }];
  wsSummary['!ref'] = `A1:B${4 + summaryItems.length}`;
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong hop dot thu');

  return wb;
}

/**
 * Xuất file Excel (.xlsx) tải về trình duyệt người dùng
 */
export function exportCollectionToExcel(options: CollectionExportOptions) {
  const wb = buildCollectionWorkbook(options);
  const cleanFileName = `Khoan_thu_${options.classConfig.className}_${options.collection.data.name || 'Bao_cao'}.xlsx`.replace(
    /[\\/:*?"<>|]/g,
    '_'
  );
  XLSX.writeFile(wb, cleanFileName);
}
