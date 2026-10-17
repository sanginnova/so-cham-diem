import { test } from 'node:test';
import assert from 'node:assert/strict';
import XLSX from 'xlsx-js-style';
import type { ClassGradebookData } from '../src/types/subjectGrade';
import type { Student } from '../src/types';
import {
  generateSubjectGradebookWorkbook,
  exportSubjectGradebookToExcel,
  exportAllClassesSubjectGradebooksToExcel,
} from '../src/lib/subjectGradebookExport';

test('subject gradebook excel export creates pedagogical Times New Roman sheet with headers, notes and statuses', () => {
  const mockStudents: Student[] = [
    {
      id: 'student-1',
      studentCode: '10A8-01',
      fullName: 'Nguyễn Văn An',
      dateOfBirth: '2008-01-01',
      gender: 'Nam',
      parentPhone: '0912345678',
      isActive: true,
      classId: 'class-1',
    },
    {
      id: 'student-2',
      studentCode: '10A8-02',
      fullName: 'Trần Thị Bình',
      dateOfBirth: '2008-02-02',
      gender: 'Nữ',
      parentPhone: '0987654321',
      isActive: true,
      classId: 'class-1',
    },
    {
      id: 'student-3',
      studentCode: '10A8-03',
      fullName: 'Lê Hoàng Cường',
      dateOfBirth: '2008-03-03',
      gender: 'Nam',
      parentPhone: '0977889900',
      isActive: true,
      classId: 'class-1',
    },
  ];

  const mockGradebook: ClassGradebookData = {
    classId: 'class-1',
    subjectName: 'Toán học',
    schoolYear: '2026-2027',
    teacherName: 'Nguyễn Văn Sang',
    txCountSemester1: 4,
    txCountSemester2: 4,
    txLabelsSemester1: ['15 phút (ĐS)', '15 phút (HH)', '30 phút', '15 phút'],
    grades: {
      'student-1': {
        studentId: 'student-1',
        studentCode: '10A8-01',
        fullName: 'Nguyễn Văn An',
        semester1: {
          tx: [8.5, 9.0, 7.5, 8.0],
          gk: 8.0,
          ck: 9.0,
          average: 8.4,
        },
        semester2: {
          tx: [8.0, 8.5, 9.0, 8.5],
          gk: 8.5,
          ck: 9.0,
          average: 8.7,
        },
        yearAverage: 8.6,
        rank: 'Giỏi',
      },
      'student-2': {
        studentId: 'student-2',
        studentCode: '10A8-02',
        fullName: 'Trần Thị Bình',
        semester1: {
          assessmentStatuses: {
            tx_1: 'exempt',
            gk: 'absent',
            ck: 'makeup',
          },
          tx: [7.0, null, 6.5, 7.0],
          gk: null,
          ck: null,
          average: 6.8,
          note: 'Gia đình có việc xin phép',
        },
        semester2: {
          tx: [7.0, 7.5, 7.0, 8.0],
          gk: 7.0,
          ck: 7.5,
          average: 7.3,
        },
        yearAverage: 7.1,
        rank: 'Khá',
      },
      'student-3': {
        studentId: 'student-3',
        studentCode: '10A8-03',
        fullName: 'Lê Hoàng Cường',
        semester1: {
          tx: [null, null, null, null],
          gk: null,
          ck: null,
          average: null,
        },
        semester2: {
          tx: [null, null, null, null],
          gk: null,
          ck: null,
          average: null,
        },
        yearAverage: null,
      },
    },
    updatedAt: new Date().toISOString(),
  };

  const optionsSem1 = {
    gradebook: mockGradebook,
    students: mockStudents,
    classConfig: {
      className: '10A8',
      schoolYear: '2026-2027',
      id: 'class-1',
    },
    teacherName: 'Nguyễn Văn Sang',
    semesterTab: 'sem1' as const,
  };

  const resultSem1 = generateSubjectGradebookWorkbook(optionsSem1);
  assert.ok(resultSem1.wb, 'Workbook sem1 must be created');
  assert.ok(resultSem1.fileName.includes('Bang_Diem_Toan_hoc_10A8_sem1_2026-2027.xlsx'));

  const ws = resultSem1.wb.Sheets[resultSem1.sheetName];
  assert.ok(ws, 'Worksheet must exist');

  // Verify Admin header (A1, A2)
  assert.equal(ws['A1'].v, 'TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP');
  assert.equal(ws['A1'].s.font.name, 'Times New Roman');
  assert.equal(ws['A2'].v, 'KHOA CƠ BẢN');

  // Verify Title (A4)
  assert.equal(ws['A4'].v, 'BẢNG ĐIỂM ĐÁNH GIÁ KẾT QUẢ HỌC TẬP - HỌC KỲ I');
  assert.equal(ws['A4'].s.font.name, 'Times New Roman');
  assert.equal(ws['A4'].s.font.bold, true);

  // Verify Table Headers (Row 8 in Excel -> index r=7)
  assert.equal(ws['A8'].v, 'STT');
  assert.equal(ws['A8'].s.font.name, 'Times New Roman');
  assert.equal(ws['A8'].s.fill.fgColor.rgb, 'EDE9FE');

  // Student 1 data (Row 9 in Excel -> index r=8)
  assert.equal(ws['A9'].v, 1);
  assert.equal(ws['B9'].v, '10A8-01');
  assert.equal(ws['C9'].v, 'Nguyễn Văn An');
  assert.equal(ws['C9'].s.font.name, 'Times New Roman');
  assert.equal(ws['D9'].v, 8.5); // TX1
  assert.equal(ws['H9'].v, 8.0); // GK
  assert.equal(ws['I9'].v, 9.0); // CK
  assert.equal(ws['J9'].v, 8.4); // Average
  assert.equal(ws['K9'].v, 'Giỏi'); // Rank

  // Student 2 assessment statuses (Row 10 in Excel -> index r=9)
  assert.equal(ws['E10'].v, 'Miễn'); // TX2 exempt
  assert.equal(ws['H10'].v, 'Vắng'); // GK absent
  assert.equal(ws['I10'].v, 'Cần bù'); // CK makeup
  assert.ok(ws['L10'].v.includes('Miễn đánh giá [TX2]'));
  assert.ok(ws['L10'].v.includes('Vắng kiểm tra [Giữa kỳ (GK)]'));
  assert.ok(ws['L10'].v.includes('Cần kiểm tra bù [Cuối kỳ (CK)]'));
  assert.ok(ws['L10'].v.includes('Gia đình có việc xin phép'));

  // Test Year Mode
  const optionsYear = {
    ...optionsSem1,
    semesterTab: 'year' as const,
  };
  const resultYear = generateSubjectGradebookWorkbook(optionsYear);
  const wsYear = resultYear.wb.Sheets[resultYear.sheetName];
  assert.ok(wsYear, 'Year worksheet must exist');

  // Student 1 in Year mode
  assert.equal(wsYear['D9'].v, 8.4); // HK1
  assert.equal(wsYear['E9'].v, 8.7); // HK2
  assert.equal(wsYear['F9'].v, 8.6); // Year
  assert.equal(wsYear['G9'].v, 'Giỏi'); // Rank Year
});

test('exportAllClassesSubjectGradebooksToExcel exports multiple classes with one sheet per class', () => {
  const mockStudentsA: Student[] = [
    { id: 'st-1', studentCode: '10A8-01', fullName: 'Nguyễn Văn An', status: 'active', classId: 'cls-1', teacherId: 't1' },
  ];
  const mockStudentsB: Student[] = [
    { id: 'st-2', studentCode: '12B6-01', fullName: 'Trần Thị Bình', status: 'active', classId: 'cls-2', teacherId: 't1' },
  ];

  const bookA: ClassGradebookData = {
    classId: 'cls-1',
    subjectName: 'Toán',
    schoolYear: '2026-2027',
    teacherName: 'Nguyễn Văn Sang',
    txCountSemester1: 4,
    txCountSemester2: 4,
    grades: {
      'st-1': {
        studentId: 'st-1',
        studentCode: '10A8-01',
        fullName: 'Nguyễn Văn An',
        semester1: { tx: [9, 9, 8, 8], gk: 8, ck: 9, average: 8.6 },
        semester2: { tx: [], gk: null, ck: null, average: null },
        yearAverage: null,
      },
    },
    updatedAt: '',
  };

  const bookB: ClassGradebookData = {
    classId: 'cls-2',
    subjectName: 'Toán',
    schoolYear: '2026-2027',
    teacherName: 'Nguyễn Văn Sang',
    txCountSemester1: 4,
    txCountSemester2: 4,
    grades: {
      'st-2': {
        studentId: 'st-2',
        studentCode: '12B6-01',
        fullName: 'Trần Thị Bình',
        semester1: { tx: [7, 8, 8, 8], gk: 7.5, ck: 8, average: 7.8 },
        semester2: { tx: [], gk: null, ck: null, average: null },
        yearAverage: null,
      },
    },
    updatedAt: '',
  };

  // Mock XLSX.writeFile to prevent disk write during test
  const originalWriteFile = XLSX.writeFile;
  let writtenFileName = '';
  XLSX.writeFile = ((wb: XLSX.WorkBook, filename: string) => {
    writtenFileName = filename;
  }) as any;

  try {
    const result = exportAllClassesSubjectGradebooksToExcel({
      classesData: [
        { classConfig: { className: '10A8', schoolYear: '2026-2027', id: 'cls-1' }, gradebook: bookA, students: mockStudentsA },
        { classConfig: { className: '12B6', schoolYear: '2026-2027', id: 'cls-2' }, gradebook: bookB, students: mockStudentsB },
      ],
      teacherName: 'Nguyễn Văn Sang',
      semesterTab: 'sem1',
    });

    assert.equal(result.sheetCount, 2);
    assert.ok(result.wb.Sheets['10A8'], 'Sheet 10A8 must exist');
    assert.ok(result.wb.Sheets['12B6'], 'Sheet 12B6 must exist');
    assert.ok(writtenFileName.includes('So_Diem_Tat_Ca_Cac_Lop'));
    assert.ok(writtenFileName.includes('HK1'));
  } finally {
    XLSX.writeFile = originalWriteFile;
  }
});
