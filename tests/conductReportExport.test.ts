import { test } from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx-js-style';
import { ConductSheetRow } from '../src/components/ConductSheetTable';

test('conduct sheet excel generation matches photo structure', () => {
  const rows: ConductSheetRow[] = [
    {
      stt: 1,
      studentId: 's1',
      studentCode: '12B6-01',
      fullName: 'Dương Thị Lan Anh',
      finalScore: 15,
      violationsLines: [],
      bonusesList: ['2đ đi học đầy đủ', '1đ tổ trưởng', '1 điểm 10 Lý'],
    },
    {
      stt: 2,
      studentId: 's2',
      studentCode: '12B6-02',
      fullName: 'Trần Tiến Dũng',
      finalScore: -7,
      violationsLines: ['Ngủ trong giờ (5 lần)', 'Không ghi bài (1 lần)', 'Không sách Địa (1 lần)'],
      bonusesList: [],
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws: XLSX.WorkSheet = {};

  const titleText = 'KẾT QUẢ RÈN LUYỆN LỚP 12B6';
  const titleStyle = {
    font: { name: 'Times New Roman', sz: 14, bold: true, color: { rgb: '000000' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  ws['A1'] = { t: 's', v: titleText, s: titleStyle };
  ws['A2'] = { t: 's', v: 'TT', s: { font: { bold: true } } };
  ws['B2'] = { t: 's', v: 'Họ và tên', s: { font: { bold: true } } };
  ws['C2'] = { t: 's', v: 'Tuần 5', s: { font: { bold: true } } };
  ws['C3'] = { t: 's', v: 'Điểm\nrèn luyện', s: { font: { bold: true } } };
  ws['D3'] = { t: 's', v: 'Lỗi vi phạm', s: { font: { bold: true } } };
  ws['E3'] = { t: 's', v: 'Cộng điểm', s: { font: { bold: true } } };

  // Data
  ws['A4'] = { t: 'n', v: 1 };
  ws['B4'] = { t: 's', v: rows[0].fullName };
  ws['C4'] = { t: 'n', v: rows[0].finalScore, s: { font: { bold: true, color: { rgb: 'FF0000' } } } };
  ws['D4'] = { t: 's', v: rows[0].violationsLines.join('\n') };
  ws['E4'] = { t: 's', v: rows[0].bonusesList.join(', ') };

  ws['A5'] = { t: 'n', v: 2 };
  ws['B5'] = { t: 's', v: rows[1].fullName };
  ws['C5'] = { t: 'n', v: rows[1].finalScore, s: { font: { bold: true, color: { rgb: 'FF0000' } } } };
  ws['D5'] = { t: 's', v: rows[1].violationsLines.join('\n') };
  ws['E5'] = { t: 's', v: rows[1].bonusesList.join(', ') };

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },
    { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },
    { s: { r: 1, c: 2 }, e: { r: 1, c: 4 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Tuan_5');

  assert.equal(ws['A1'].v, 'KẾT QUẢ RÈN LUYỆN LỚP 12B6');
  assert.equal(ws['C4'].v, 15);
  assert.equal(ws['C4'].s.font.color.rgb, 'FF0000');
  assert.equal(ws['C5'].v, -7);
  assert.equal(ws['D5'].v, 'Ngủ trong giờ (5 lần)\nKhông ghi bài (1 lần)\nKhông sách Địa (1 lần)');
  assert.equal(ws['E4'].v, '2đ đi học đầy đủ, 1đ tổ trưởng, 1 điểm 10 Lý');
});
