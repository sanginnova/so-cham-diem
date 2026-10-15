import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCollectionWorkbook, CollectionRowData } from '../src/lib/collectionExcelExport';
import type { HomeroomRecord } from '../src/types/homeroom';

test('collection excel export uses Times New Roman, formats table and leaves 0/Chưa nộp blank', () => {
  const mockCollection: HomeroomRecord = {
    id: 'col_1',
    kind: 'collection',
    studentId: '',
    date: '2026-10-15',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-10-15T08:00:00.000Z',
    data: {
      name: 'Tiền đoàn phí',
      amount: '20000',
      dueDate: '2026-10-16',
      status: 'Đang thu',
      studentIds: JSON.stringify(['s1', 's2', 's3']),
    },
  };

  const rows: CollectionRowData[] = [
    {
      studentId: 's1',
      code: '2497',
      name: 'Trần Văn Phú',
      base: 20000,
      discount: 0,
      due: 20000,
      paid: 20000,
      remaining: 0,
      excess: 0,
      status: 'Đã nộp',
      transactions: [],
    },
    {
      studentId: 's2',
      code: '2511',
      name: 'Đinh Hoàng Dung',
      base: 20000,
      discount: 0,
      due: 20000,
      paid: 0,
      remaining: 20000,
      excess: 0,
      status: 'Chưa nộp',
      transactions: [],
    },
    {
      studentId: 's3',
      code: '2520',
      name: 'Nguyễn Văn Minh',
      base: 20000,
      discount: 10000,
      due: 10000,
      paid: 5000,
      remaining: 5000,
      excess: 0,
      status: 'Nộp một phần',
      transactions: [],
    },
  ];

  const records: HomeroomRecord[] = [
    {
      id: 'pay_1',
      kind: 'payment',
      studentId: 's1',
      date: '2026-10-15',
      createdAt: '2026-10-15T09:00:00.000Z',
      updatedAt: '2026-10-15T09:00:00.000Z',
      data: {
        collectionId: 'col_1',
        amount: '20000',
        method: 'Tiền mặt',
        state: 'Đã ghi nhận',
        note: 'Đóng trực tiếp',
      },
    },
  ];

  const wb = buildCollectionWorkbook({
    collection: mockCollection,
    rows,
    records,
    classConfig: {
      className: '10A8',
      schoolYear: '2026 - 2027',
      teacherName: 'Nguyễn Văn Sang',
    },
    totals: {
      due: 50000,
      paid: 25000,
      remaining: 25000,
      excess: 0,
      discount: 10000,
    },
    teacherName: 'Nguyễn Văn Sang',
  });

  // Check sheets existence
  assert.ok(wb.SheetNames.includes('Theo doi thu nop'), 'Must contain Theo doi thu nop sheet');
  assert.ok(wb.SheetNames.includes('Lich su nop'), 'Must contain Lich su nop sheet');
  assert.ok(wb.SheetNames.includes('Tong hop dot thu'), 'Must contain Tong hop dot thu sheet');

  const ws = wb.Sheets['Theo doi thu nop'];

  // Check header text & font Times New Roman
  assert.equal(ws['A1'].v, 'TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP');
  assert.equal(ws['A1'].s?.font?.name, 'Times New Roman');

  assert.equal(ws['A4'].v, 'BẢNG THEO DÕI THU NỘP: TIỀN ĐOÀN PHÍ');
  assert.equal(ws['A4'].s?.font?.name, 'Times New Roman');
  assert.equal(ws['A4'].s?.font?.bold, true);

  // Table headers at Row 8 (index 7, so A8 to K8)
  assert.equal(ws['A8'].v, 'STT');
  assert.equal(ws['A8'].s?.font?.name, 'Times New Roman');
  assert.equal(ws['D8'].v, 'Mức thu (đ)');
  assert.equal(ws['G8'].v, 'Đã nộp (đ)');
  assert.equal(ws['H8'].v, 'Còn thiếu (đ)');

  // Row 9: Student 1 (Trần Văn Phú - Đã nộp 20000, discount=0, remaining=0)
  assert.equal(ws['C9'].v, 'Trần Văn Phú');
  assert.equal(ws['D9'].v, 20000); // Mức thu
  assert.equal(ws['E9'].v, '', 'discount = 0 must be empty string');
  assert.equal(ws['G9'].v, 20000, 'paid > 0 must be 20000');
  assert.equal(ws['G9'].z, '#,##0');
  assert.equal(ws['H9'].v, '', 'remaining = 0 must be empty string');
  assert.equal(ws['I9'].v, '', 'excess = 0 must be empty string');
  assert.equal(ws['J9'].v, 'Đã nộp');
  assert.equal(ws['C9'].s?.font?.name, 'Times New Roman');

  // Row 10: Student 2 (Đinh Hoàng Dung - Chưa nộp, paid=0, remaining=20000)
  assert.equal(ws['C10'].v, 'Đinh Hoàng Dung');
  assert.equal(ws['G10'].v, '', 'Chưa nộp (paid = 0) must be empty string (để trống)');
  assert.equal(ws['H10'].v, 20000, 'remaining must be 20000');
  assert.equal(ws['J10'].v, 'Chưa nộp');
  assert.equal(ws['G10'].s?.font?.name, 'Times New Roman');

  // Row 11: Student 3 (Nguyễn Văn Minh - discount=10000, paid=5000, remaining=5000)
  assert.equal(ws['C11'].v, 'Nguyễn Văn Minh');
  assert.equal(ws['E11'].v, 10000);
  assert.equal(ws['G11'].v, 5000);
  assert.equal(ws['H11'].v, 5000);
  assert.equal(ws['J11'].v, 'Nộp một phần');

  // Total row at Row 12 (index 11)
  assert.equal(ws['A12'].v, 'TỔNG CỘNG');
  assert.equal(ws['A12'].s?.font?.bold, true);
  assert.equal(ws['D12'].v, 60000);
  assert.equal(ws['E12'].v, 10000);
  assert.equal(ws['F12'].v, 50000);
  assert.equal(ws['G12'].v, 25000);
  assert.equal(ws['H12'].v, 25000);
  assert.equal(ws['A12'].s?.font?.name, 'Times New Roman');

  // Signatures
  const wsHistory = wb.Sheets['Lich su nop'];
  assert.equal(wsHistory['A1'].s?.font?.name, 'Times New Roman');
  assert.equal(wsHistory['D4'].v, 'Trần Văn Phú (2497)');

  const wsSummary = wb.Sheets['Tong hop dot thu'];
  assert.equal(wsSummary['A1'].s?.font?.name, 'Times New Roman');
  assert.equal(wsSummary['A3'].s?.font?.name, 'Times New Roman');
});
