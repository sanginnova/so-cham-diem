import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseConductPastedText,
  parseViolationItems,
  parseBonusItems,
  buildDisciplineLogsFromConductSheet,
} from '../src/lib/conductSheetImporter';
import { Student, ClassConfig, BehaviorCategory } from '../src/types';

// Dữ liệu mẫu chuẩn 100% từ ảnh chụp của người dùng
export const USER_IMAGE_PASTED_TEXT = `STT\tHọ và tên\tĐiểm rèn luyện\tLỗi vi phạm\tĐiểm cộng
1\tNguyễn Quang Anh\t\t\t
2\tTrần Duy Anh\t9\tngủ trong giờ (-3đ)\tđi học đầy đủ (+2 đ)
3\tPhạm Quốc Bảo\t12\t\tđi học đầy đủ (+2 đ)
4\tNguyễn Duy Chính\t8\tĐi học muộn; không trực nhật; 0 điểm GDKT-PL;\t
5\tHà Nhất Chính\t8\thay ngủ trong giờ , nói chuyện riêng\t
6\tDương Đức Cường\t3\thay nghỉ học tự do , đi học muộn\t
7\tĐặng Việt Dũng\t12\t\tđi học đầy đủ (+2 đ)
8\tLê Trung Dũng\t11\tngủ trong giờ\tđi học đầy đủ (+2 đ)
9\tTrần Tiến Dũng\t5\tmtt(-1đ), nghỉ không phép(-3đ), không viết bài(-1đ)\t
10\tĐặng Ngọc Duy\t12\t\tđi học đầy đủ (+2 đ)
11\tPhạm Quốc Đại\t12\t\tđi học đầy đủ (+2 đ)
12\tKiều Duy Đạt\t12\t\t10đ hóa (+2đ)`;

const MOCK_STUDENTS: Student[] = [
  { id: 'hs-1', studentCode: 'HS01', fullName: 'Nguyễn Quang Anh', firstName: 'Anh', lastName: 'Nguyễn Quang', status: 'active', teacherId: 't1', classId: 'c1', createdAt: '', updatedAt: '' },
  { id: 'hs-2', studentCode: 'HS02', fullName: 'Trần Duy Anh', firstName: 'Anh', lastName: 'Trần Duy', status: 'active', teacherId: 't1', classId: 'c1', createdAt: '', updatedAt: '' },
  { id: 'hs-3', studentCode: 'HS03', fullName: 'Phạm Quốc Bảo', firstName: 'Bảo', lastName: 'Phạm Quốc', status: 'active', teacherId: 't1', classId: 'c1', createdAt: '', updatedAt: '' },
  { id: 'hs-4', studentCode: 'HS04', fullName: 'Nguyễn Duy Chính', firstName: 'Chính', lastName: 'Nguyễn Duy', status: 'active', teacherId: 't1', classId: 'c1', createdAt: '', updatedAt: '' },
  { id: 'hs-5', studentCode: 'HS05', fullName: 'Hà Nhất Chính', firstName: 'Chính', lastName: 'Hà Nhất', status: 'active', teacherId: 't1', classId: 'c1', createdAt: '', updatedAt: '' },
  { id: 'hs-6', studentCode: 'HS06', fullName: 'Dương Đức Cường', firstName: 'Cường', lastName: 'Dương Đức', status: 'active', teacherId: 't1', classId: 'c1', createdAt: '', updatedAt: '' },
  { id: 'hs-7', studentCode: 'HS07', fullName: 'Đặng Việt Dũng', firstName: 'Dũng', lastName: 'Đặng Việt', status: 'active', teacherId: 't1', classId: 'c1', createdAt: '', updatedAt: '' },
  { id: 'hs-8', studentCode: 'HS08', fullName: 'Lê Trung Dũng', firstName: 'Dũng', lastName: 'Lê Trung', status: 'active', teacherId: 't1', classId: 'c1', createdAt: '', updatedAt: '' },
  { id: 'hs-9', studentCode: 'HS09', fullName: 'Trần Tiến Dũng', firstName: 'Dũng', lastName: 'Trần Tiến', status: 'active', teacherId: 't1', classId: 'c1', createdAt: '', updatedAt: '' },
  { id: 'hs-10', studentCode: 'HS10', fullName: 'Đặng Ngọc Duy', firstName: 'Duy', lastName: 'Đặng Ngọc', status: 'active', teacherId: 't1', classId: 'c1', createdAt: '', updatedAt: '' },
  { id: 'hs-11', studentCode: 'HS11', fullName: 'Phạm Quốc Đại', firstName: 'Đại', lastName: 'Phạm Quốc', status: 'active', teacherId: 't1', classId: 'c1', createdAt: '', updatedAt: '' },
  { id: 'hs-12', studentCode: 'HS12', fullName: 'Kiều Duy Đạt', firstName: 'Đạt', lastName: 'Kiều Duy', status: 'active', teacherId: 't1', classId: 'c1', createdAt: '', updatedAt: '' },
];

test('parseConductPastedText correctly parses data from user image with 12 students', () => {
  const result = parseConductPastedText(USER_IMAGE_PASTED_TEXT, MOCK_STUDENTS, { weekNumber: 3, month: 10 });
  assert.equal(result.students.length, 12);
  assert.equal(result.matchedCount, 12);
  assert.equal(result.newStudentCount, 0);

  // Row 1: Nguyễn Quang Anh (no score, no violations, no bonuses)
  const r1 = result.students[0];
  assert.equal(r1.stt, 1);
  assert.equal(r1.rawName, 'Nguyễn Quang Anh');
  assert.equal(r1.score, null);
  assert.equal(r1.parsedViolations.length, 0);
  assert.equal(r1.parsedBonuses.length, 0);

  // Row 2: Trần Duy Anh (score: 9, vi phạm: ngủ trong giờ (-3đ), thưởng: đi học đầy đủ (+2 đ))
  const r2 = result.students[1];
  assert.equal(r2.stt, 2);
  assert.equal(r2.rawName, 'Trần Duy Anh');
  assert.equal(r2.score, 9);
  assert.equal(r2.parsedViolations.length, 1);
  assert.equal(r2.parsedViolations[0].cleanName, 'ngủ trong giờ');
  assert.equal(r2.parsedViolations[0].score, 3);
  assert.equal(r2.parsedBonuses.length, 1);
  assert.equal(r2.parsedBonuses[0].cleanName, 'đi học đầy đủ');
  assert.equal(r2.parsedBonuses[0].score, 2);

  // Row 3: Phạm Quốc Bảo (score: 12, thưởng: đi học đầy đủ (+2 đ))
  const r3 = result.students[2];
  assert.equal(r3.score, 12);
  assert.equal(r3.parsedBonuses.length, 1);
  assert.equal(r3.parsedBonuses[0].score, 2);

  // Row 4: Nguyễn Duy Chính (score: 8, 3 vi phạm cách nhau bởi dấu chấm phẩy)
  const r4 = result.students[3];
  assert.equal(r4.score, 8);
  assert.equal(r4.parsedViolations.length, 3);
  assert.equal(r4.parsedViolations[0].cleanName, 'Đi học muộn');
  assert.equal(r4.parsedViolations[1].cleanName, 'không trực nhật');
  assert.equal(r4.parsedViolations[2].cleanName, '0 điểm GDKT-PL');

  // Row 5: Hà Nhất Chính (score: 8, 2 vi phạm cách nhau bởi dấu phẩy)
  const r5 = result.students[4];
  assert.equal(r5.score, 8);
  assert.equal(r5.parsedViolations.length, 2);
  assert.equal(r5.parsedViolations[0].cleanName, 'hay ngủ trong giờ');
  assert.equal(r5.parsedViolations[1].cleanName, 'nói chuyện riêng');

  // Row 6: Dương Đức Cường (score: 3, 2 vi phạm cách nhau bởi dấu phẩy)
  const r6 = result.students[5];
  assert.equal(r6.score, 3);
  assert.equal(r6.parsedViolations.length, 2);
  assert.equal(r6.parsedViolations[0].cleanName, 'hay nghỉ học tự do');
  assert.equal(r6.parsedViolations[1].cleanName, 'đi học muộn');

  // Row 8: Lê Trung Dũng (score: 11, vi phạm: ngủ trong giờ, thưởng: đi học đầy đủ (+2 đ))
  const r8 = result.students[7];
  assert.equal(r8.score, 11);
  assert.equal(r8.parsedViolations.length, 1);
  assert.equal(r8.parsedViolations[0].cleanName, 'ngủ trong giờ');
  assert.equal(r8.parsedBonuses.length, 1);
  assert.equal(r8.parsedBonuses[0].score, 2);

  // Row 9: Trần Tiến Dũng (score: 5, vi phạm: mtt(-1đ), nghỉ không phép(-3đ), không viết bài(-1đ))
  const r9 = result.students[8];
  assert.equal(r9.score, 5);
  assert.equal(r9.parsedViolations.length, 3);
  assert.equal(r9.parsedViolations[0].cleanName, 'mtt');
  assert.equal(r9.parsedViolations[0].score, 1);
  assert.equal(r9.parsedViolations[1].cleanName, 'nghỉ không phép');
  assert.equal(r9.parsedViolations[1].score, 3);
  assert.equal(r9.parsedViolations[2].cleanName, 'không viết bài');
  assert.equal(r9.parsedViolations[2].score, 1);

  // Row 12: Kiều Duy Đạt (score: 12, thưởng: 10đ hóa (+2đ))
  const r12 = result.students[11];
  assert.equal(r12.score, 12);
  assert.equal(r12.parsedBonuses.length, 1);
  assert.equal(r12.parsedBonuses[0].cleanName, '10đ hóa');
  assert.equal(r12.parsedBonuses[0].score, 2);
});

test('parseConductPastedText works without headers (direct student rows)', () => {
  const withoutHeaders = `1\tNguyễn Quang Anh\t\t\t
2\tTrần Duy Anh\t9\tngủ trong giờ (-3đ)\tđi học đầy đủ (+2 đ)`;

  const res = parseConductPastedText(withoutHeaders, MOCK_STUDENTS, { weekNumber: 2, month: 10 });
  assert.equal(res.students.length, 2);
  assert.equal(res.students[0].rawName, 'Nguyễn Quang Anh');
  assert.equal(res.students[1].rawName, 'Trần Duy Anh');
  assert.equal(res.students[1].score, 9);
});

test('parseConductPastedText works without STT column (4 columns)', () => {
  const withoutStt = `Họ và tên\tĐiểm rèn luyện\tLỗi vi phạm\tĐiểm cộng
Trần Duy Anh\t9\tngủ trong giờ (-3đ)\tđi học đầy đủ (+2 đ)
Phạm Quốc Bảo\t12\t\tđi học đầy đủ (+2 đ)`;

  const res = parseConductPastedText(withoutStt, MOCK_STUDENTS, { weekNumber: 1, month: 10 });
  assert.equal(res.students.length, 2);
  assert.equal(res.students[0].stt, 1);
  assert.equal(res.students[0].rawName, 'Trần Duy Anh');
  assert.equal(res.students[0].score, 9);
  assert.equal(res.students[1].stt, 2);
  assert.equal(res.students[1].rawName, 'Phạm Quốc Bảo');
  assert.equal(res.students[1].score, 12);
});

test('buildDisciplineLogsFromConductSheet generates valid logs', () => {
  const parsedSheet = parseConductPastedText(USER_IMAGE_PASTED_TEXT, MOCK_STUDENTS, { weekNumber: 3, month: 10 });
  const studentMap = new Map<string, Student>();
  MOCK_STUDENTS.forEach(s => studentMap.set(s.fullName.toLowerCase(), s));

  const mockConfig: ClassConfig = {
    id: 'c1',
    className: '12B4',
    schoolYear: '2024-2025',
    homeroomTeacher: 'Ngô Thị Hải Yến',
    baseScore: 10,
    minScore: 0,
    maxScore: 100,
    months: [9, 10, 11, 12, 1, 2, 3, 4, 5],
    semester1Months: [9, 10, 11, 12, 1],
    semester2Months: [2, 3, 4, 5],
    weeks: [{ weekNumber: 3, startDate: '2024-10-14', endDate: '2024-10-19', semester: 1, month: 10, title: 'Tuần 3' }],
    teacherId: 't1',
    updatedAt: '',
  };

  const mockCategories: BehaviorCategory[] = [
    { id: 'b1', code: 'L_SLEEP', name: 'Ngủ trong giờ', type: 'deduct', defaultScore: 1, isActive: true, teacherId: 't1', createdAt: '', updatedAt: '' },
    { id: 'b2', code: 'T_ATTEND', name: 'Đi học đầy đủ', type: 'bonus', defaultScore: 2, isActive: true, teacherId: 't1', createdAt: '', updatedAt: '' },
  ];

  const logs = buildDisciplineLogsFromConductSheet({
    parsedSheet,
    studentsMap: studentMap,
    targetWeekNumber: 3,
    classConfig: mockConfig,
    behaviorCategories: mockCategories,
  });

  assert.ok(logs.length > 0);
  const duyAnhLogs = logs.filter(l => l.studentName === 'Trần Duy Anh');
  assert.equal(duyAnhLogs.length, 2);
  assert.equal(duyAnhLogs.find(l => l.type === 'deduct')?.scorePerUnit, 3);
  assert.equal(duyAnhLogs.find(l => l.type === 'bonus')?.scorePerUnit, 2);
});
