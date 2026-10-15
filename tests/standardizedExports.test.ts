import { test } from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx-js-style';
import { exportToExcel } from '../src/lib/utils';

test('standardized exportToExcel applies Times New Roman, header fill, borders and leaves zeros blank for violations/debts', () => {
  // Intercept XLSX.writeFile to inspect the generated workbook
  let writtenWb: any = null;
  let writtenFileName = '';
  const originalWriteFile = XLSX.writeFile;

  XLSX.writeFile = (wb: any, filename: string) => {
    writtenWb = wb;
    writtenFileName = filename;
    return undefined as any;
  };

  try {
    const sampleData = [
      {
        STT: 1,
        'Mã học sinh': 'HS01',
        'Họ và tên': 'Nguyễn Văn An',
        'Điểm rèn luyện': 10,
        'Số lỗi vi phạm': 0, // Should be suppressed to blank ""
        'Còn thiếu': 0,      // Should be suppressed to blank ""
        'Xếp loại': 'Tốt',
      },
      {
        STT: 2,
        'Mã học sinh': 'HS02',
        'Họ và tên': 'Trần Thị Bình',
        'Điểm rèn luyện': 8.5,
        'Số lỗi vi phạm': 2,
        'Còn thiếu': 50000,
        'Xếp loại': 'Khá',
      },
    ];

    exportToExcel(sampleData, 'Bang_tong_ket_thang_10A8', 'TongKetThang');

    assert.ok(writtenWb, 'Workbook must be created');
    assert.equal(writtenFileName, 'Bang_tong_ket_thang_10A8.xlsx');

    const ws = writtenWb.Sheets['TongKetThang'];
    assert.ok(ws, 'Sheet TongKetThang must exist');

    // 1. Header (Row 0 -> Row 1 in Excel: A1 to G1)
    assert.equal(ws['A1'].v, 'STT');
    assert.equal(ws['A1'].s.font.name, 'Times New Roman');
    assert.equal(ws['A1'].s.font.bold, true);
    assert.equal(ws['A1'].s.fill.fgColor.rgb, 'E2E8F0');
    assert.ok(ws['A1'].s.border, 'Header must have border');

    // 2. Data row 1 (Row index 1 -> Row 2 in Excel: A2 to G2)
    assert.equal(ws['A2'].v, 1);
    assert.equal(ws['A2'].s.font.name, 'Times New Roman');
    assert.equal(ws['C2'].v, 'Nguyễn Văn An');
    assert.equal(ws['C2'].s.font.name, 'Times New Roman');
    assert.equal(ws['D2'].v, 10); // Điểm rèn luyện: 0 or positive is kept as valid score
    assert.equal(ws['D2'].s.font.name, 'Times New Roman');

    // "Chưa nộp=0 thì để trống":
    assert.equal(ws['E2'].v, '', 'Số lỗi vi phạm = 0 must be left blank ""');
    assert.equal(ws['F2'].v, '', 'Còn thiếu = 0 must be left blank ""');

    // 3. Data row 2 (Row index 2 -> Row 3 in Excel: A3 to G3)
    assert.equal(ws['E3'].v, 2, 'Số lỗi vi phạm > 0 must be kept');
    assert.equal(ws['F3'].v, 50000, 'Còn thiếu > 0 must be kept');

    // 4. Column widths
    assert.ok(ws['!cols'] && ws['!cols'].length === 7, 'Must have auto-fitted column widths');
    assert.ok(ws['!rows'] && ws['!rows'].length >= 3, 'Must have row heights');
  } finally {
    XLSX.writeFile = originalWriteFile;
  }
});
