import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageBreak,
  Footer,
  PageNumber,
  PageOrientation,
  ShadingType,
} from 'docx';
import type { Student, ClassConfig } from '../types';
import type { HomeroomRecord } from '../types/homeroom';
import type { SeatingChartConfig, StudentGroupInfo } from '../types/seatingChart';
import { formatVietnameseDate } from './utils';

export const DEFAULT_SEATING_CONFIG: SeatingChartConfig = {
  columns: 4,
  rows: 5,
  seatsPerDesk: 2,
  teacherDesk: 'left',
  desks: {},
};

export function getSeatingStorageKey(teacherId: string, classId: string): string {
  return `so_cham_diem_seating_${teacherId}_${classId}`;
}

export function loadSeatingConfig(
  teacherId: string,
  classId: string,
  records: HomeroomRecord[]
): SeatingChartConfig {
  // 1. Kiểm tra trong homeroomRecords cloud
  const cloudRecord = records.find(
    (r) => r.kind === 'profile' && r.studentId === '__seating_chart__'
  );
  if (cloudRecord?.data?.configJson) {
    try {
      const parsed = JSON.parse(cloudRecord.data.configJson);
      return { ...DEFAULT_SEATING_CONFIG, ...parsed };
    } catch {
      // ignore
    }
  }

  // 2. Fallback kiểm tra localStorage
  try {
    const raw = localStorage.getItem(getSeatingStorageKey(teacherId, classId));
    if (raw) {
      return { ...DEFAULT_SEATING_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }

  return { ...DEFAULT_SEATING_CONFIG };
}

export function loadGroupAssignments(
  students: Student[],
  records: HomeroomRecord[]
): Record<string, StudentGroupInfo> {
  const result: Record<string, StudentGroupInfo> = {};

  // Lấy từ profile records
  const profileMap = new Map(
    records.filter((r) => r.kind === 'profile' && r.studentId).map((r) => [r.studentId, r.data])
  );

  students.forEach((s) => {
    const p = profileMap.get(s.id);
    result[s.id] = {
      studentId: s.id,
      group: p?.group || '',
      duty: p?.duty || '',
      note: p?.note || '',
    };
  });

  return result;
}

/** Tự động chia đều học sinh vào 4 tổ (Cân bằng nam/nữ) */
export function autoAssignGroups(
  students: Student[],
  numGroups = 4
): Record<string, StudentGroupInfo> {
  const result: Record<string, StudentGroupInfo> = {};

  const active = students.filter((s) => s.status === 'active');
  const males = active.filter((s) => s.gender !== 'Nữ');
  const females = active.filter((s) => s.gender === 'Nữ');

  const groups: string[] = Array.from({ length: numGroups }, (_, i) => `Tổ ${i + 1}`);
  const groupBuckets: Record<string, Student[]> = Object.fromEntries(groups.map((g) => [g, []]));

  // Phân chia nam đều vào các tổ
  males.forEach((m, idx) => {
    groupBuckets[groups[idx % numGroups]].push(m);
  });

  // Phân chia nữ đều vào các tổ (đảo chiều để cân đối sĩ số)
  females.forEach((f, idx) => {
    groupBuckets[groups[(numGroups - 1 - (idx % numGroups))]].push(f);
  });

  // Gán chức vụ mặc định: người đầu tiên làm Tổ trưởng, người thứ 2 làm Tổ phó
  groups.forEach((g) => {
    const members = groupBuckets[g];
    members.forEach((m, idx) => {
      let duty = 'Thành viên';
      if (idx === 0) duty = 'Tổ trưởng';
      else if (idx === 1) duty = 'Tổ phó';

      result[m.id] = {
        studentId: m.id,
        group: g,
        duty,
      };
    });
  });

  // Học sinh nghỉ học hoặc chưa xếp
  students.forEach((s) => {
    if (!result[s.id]) {
      result[s.id] = {
        studentId: s.id,
        group: '',
        duty: '',
      };
    }
  });

  return result;
}

/** Tự động xếp chỗ ngồi theo Tổ (Tổ 1 dãy 1, Tổ 2 dãy 2...) */
export function autoAssignSeatsByGroup(
  config: SeatingChartConfig,
  students: Student[],
  groupMap: Record<string, StudentGroupInfo>
): SeatingChartConfig {
  const nextDesks: Record<string, (string | null)[]> = {};
  const activeStudents = students.filter((s) => s.status === 'active');

  const groups = ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'];

  for (let col = 1; col <= config.columns; col++) {
    const targetGroup = groups[(col - 1) % groups.length];
    const groupMembers = activeStudents.filter((s) => groupMap[s.id]?.group === targetGroup);

    let memberIdx = 0;
    for (let row = 1; row <= config.rows; row++) {
      const key = `${col}_${row}`;
      const seats: (string | null)[] = [];
      for (let seat = 0; seat < config.seatsPerDesk; seat++) {
        if (memberIdx < groupMembers.length) {
          seats.push(groupMembers[memberIdx].id);
          memberIdx++;
        } else {
          seats.push(null);
        }
      }
      nextDesks[key] = seats;
    }
  }

  return {
    ...config,
    desks: nextDesks,
    updatedAt: new Date().toISOString(),
  };
}

/** Tự động xếp chỗ ngồi nam - nữ xen kẽ */
export function autoAssignSeatsBalanced(
  config: SeatingChartConfig,
  students: Student[]
): SeatingChartConfig {
  const nextDesks: Record<string, (string | null)[]> = {};
  const active = students.filter((s) => s.status === 'active');
  const males = [...active.filter((s) => s.gender !== 'Nữ')];
  const females = [...active.filter((s) => s.gender === 'Nữ')];

  for (let col = 1; col <= config.columns; col++) {
    for (let row = 1; row <= config.rows; row++) {
      const key = `${col}_${row}`;
      const seats: (string | null)[] = [];

      for (let seat = 0; seat < config.seatsPerDesk; seat++) {
        let pickedStudent: Student | undefined;
        if (seat % 2 === 0) {
          pickedStudent = males.shift() || females.shift();
        } else {
          pickedStudent = females.shift() || males.shift();
        }
        seats.push(pickedStudent ? pickedStudent.id : null);
      }
      nextDesks[key] = seats;
    }
  }

  return {
    ...config,
    desks: nextDesks,
    updatedAt: new Date().toISOString(),
  };
}

export interface SeatingChartDocxOptions {
  className: string;
  schoolYear: string;
  homeroomTeacher: string;
  schoolName?: string;
  department?: string;
  students: Student[];
  classConfig: ClassConfig;
  config: SeatingChartConfig;
  groupMap: Record<string, StudentGroupInfo>;
}

/** Xuất file Word (.docx) chuyên nghiệp: Sơ đồ lớp & Danh sách phân tổ */
export async function generateSeatingChartDocx(options: SeatingChartDocxOptions): Promise<Blob> {
  const font = 'Times New Roman';
  const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
  const lightBorder = { style: BorderStyle.SINGLE, size: 2, color: '888888' };

  const p = (text: string, bold = false, center = false, size = 12) =>
    new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 60, line: 240 },
      children: [new TextRun({ text, bold, font, size: size * 2 })],
    });

  const studentNameMap = new Map(options.students.map((s) => [s.id, s.fullName]));
  const studentMap = new Map(options.students.map((s) => [s.id, s]));

  // 1. Tạo bảng Sơ đồ lớp
  const deskHeaders = Array.from({ length: options.config.columns }, (_, i) => `DÃY ${i + 1}`);

  const deskRows: string[][] = [];
  for (let row = 1; row <= options.config.rows; row++) {
    const rowCells: string[] = [];
    for (let col = 1; col <= options.config.columns; col++) {
      const key = `${col}_${row}`;
      const seatIds = options.config.desks[key] || [];
      const occupants = seatIds
        .map((id, sIdx) => {
          if (!id) return `(${sIdx + 1}) [Trống]`;
          const s = studentMap.get(id);
          const grp = options.groupMap[id]?.group ? ` [${options.groupMap[id].group}]` : '';
          const duty = options.groupMap[id]?.duty && options.groupMap[id].duty !== 'Thành viên'
            ? ` (${options.groupMap[id].duty})`
            : '';
          return `${sIdx + 1}. ${s?.fullName || id}${grp}${duty}`;
        })
        .filter(Boolean);

      rowCells.push(`BÀN ${row}\n` + (occupants.length ? occupants.join('\n') : '[Bàn trống]'));
    }
    deskRows.push(rowCells);
  }

  // Bảng Word cho sơ đồ lớp
  const seatingTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: deskHeaders.map(
          (h) =>
            new TableCell({
              width: { size: Math.floor(100 / options.config.columns), type: WidthType.PERCENTAGE },
              borders: { top: border, bottom: border, left: border, right: border },
              shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [p(h, true, true, 11)],
            })
        ),
      }),
      ...deskRows.map(
        (r) =>
          new TableRow({
            children: r.map(
              (text) =>
                new TableCell({
                  width: { size: Math.floor(100 / options.config.columns), type: WidthType.PERCENTAGE },
                  borders: { top: lightBorder, bottom: lightBorder, left: lightBorder, right: lightBorder },
                  margins: { top: 70, bottom: 70, left: 80, right: 80 },
                  children: text.split('\n').map((line, idx) =>
                    p(line, idx === 0, idx === 0, idx === 0 ? 10 : 9.5)
                  ),
                })
            ),
          })
      ),
    ],
  });

  // 2. Tạo bảng danh sách phân tổ chi tiết
  const groups = ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'];
  const groupRows: string[][] = [];

  let globalIndex = 1;
  groups.forEach((g) => {
    const members = options.students.filter((s) => options.groupMap[s.id]?.group === g);
    members.forEach((m) => {
      // Tìm vị trí ngồi
      let seatLoc = 'Chưa xếp';
      for (let col = 1; col <= options.config.columns; col++) {
        for (let row = 1; row <= options.config.rows; row++) {
          const key = `${col}_${row}`;
          const seatIds = options.config.desks[key] || [];
          const sIdx = seatIds.indexOf(m.id);
          if (sIdx !== -1) {
            seatLoc = `Dãy ${col} - Bàn ${row} (${sIdx === 0 ? 'Trái' : 'Phải'})`;
            break;
          }
        }
      }

      groupRows.push([
        String(globalIndex++),
        m.studentCode || '',
        m.fullName,
        m.gender || '',
        g,
        options.groupMap[m.id]?.duty || 'Thành viên',
        seatLoc,
        options.groupMap[m.id]?.note || '',
      ]);
    });
  });

  // Học sinh chưa xếp tổ
  const unassigned = options.students.filter(
    (s) => !options.groupMap[s.id]?.group && s.status === 'active'
  );
  unassigned.forEach((m) => {
    groupRows.push([
      String(globalIndex++),
      m.studentCode || '',
      m.fullName,
      m.gender || '',
      'Chưa xếp tổ',
      options.groupMap[m.id]?.duty || '',
      'Chưa xếp',
      '',
    ]);
  });

  const organizationTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          'STT',
          'Mã HS',
          'Họ và tên',
          'Nữ',
          'Tổ',
          'Chức vụ trong tổ',
          'Chỗ ngồi (Dãy / Bàn)',
          'Ghi chú',
        ].map(
          (h, i) =>
            new TableCell({
              width: {
                size: [5, 12, 28, 6, 11, 16, 17, 5][i],
                type: WidthType.PERCENTAGE,
              },
              borders: { top: border, bottom: border, left: border, right: border },
              shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
              margins: { top: 60, bottom: 60, left: 60, right: 60 },
              children: [p(h, true, true, 10)],
            })
        ),
      }),
      ...groupRows.map(
        (r, idx) =>
          new TableRow({
            children: r.map(
              (text, colIdx) =>
                new TableCell({
                  width: {
                    size: [5, 12, 28, 6, 11, 16, 17, 5][colIdx],
                    type: WidthType.PERCENTAGE,
                  },
                  borders: { top: lightBorder, bottom: lightBorder, left: lightBorder, right: lightBorder },
                  margins: { top: 50, bottom: 50, left: 60, right: 60 },
                  children: [p(text, colIdx === 2 && (r[5].includes('Tổ trưởng') || r[5].includes('Lớp trưởng')), colIdx === 0 || colIdx === 1 || colIdx === 3 || colIdx === 4, 10)],
                })
            ),
          })
      ),
    ],
  });

  // Tài liệu Word khổ ngang (Landscape)
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 16838, // A4 Landscape width
              height: 11906, // A4 Landscape height
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Sơ đồ lớp & Phân tổ — Trang ', font, size: 18 }),
                  new TextRun({ children: [PageNumber.CURRENT], font, size: 18 }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Header hành chính
          p('BỘ QUỐC PHÒNG — TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP', true, false, 11),
          p('KHOA CƠ BẢN', true, false, 11),
          p(''),
          p(
            `SƠ ĐỒ CHỖ NGỒI VÀ TỔ CHỨC LỚP HỌC ${options.className.toUpperCase()}`,
            true,
            true,
            16
          ),
          p(
            `Năm học: ${options.schoolYear} · Giáo viên chủ nhiệm: ${options.homeroomTeacher || '....................'} · Sĩ số: ${options.students.filter(s=>s.status==='active').length} học sinh`,
            false,
            true,
            11
          ),
          p(''),

          // Khung Bảng lớp & Bàn giáo viên
          p('================== BẢNG LỚP HỌC ==================', true, true, 11),
          p(
            options.config.teacherDesk === 'left'
              ? '[ BÀN GIÁO VIÊN ]                                                                                             [ CỬA LỚP HỌC ]'
              : '[ CỬA LỚP HỌC ]                                                                                             [ BÀN GIÁO VIÊN ]',
            true,
            false,
            10
          ),
          p(''),

          // Bảng sơ đồ
          seatingTable,
          p(''),

          // Ngắt trang sang bảng danh sách phân tổ
          new Paragraph({ children: [new PageBreak()] }),

          // Trang 2: Danh sách chia theo tổ
          p(
            `DANH SÁCH HỌC SINH CHIA THEO TỔ — LỚP ${options.className.toUpperCase()}`,
            true,
            true,
            14
          ),
          p(
            `Tổ 1: ${options.students.filter(s=>options.groupMap[s.id]?.group==='Tổ 1').length} HS · ` +
            `Tổ 2: ${options.students.filter(s=>options.groupMap[s.id]?.group==='Tổ 2').length} HS · ` +
            `Tổ 3: ${options.students.filter(s=>options.groupMap[s.id]?.group==='Tổ 3').length} HS · ` +
            `Tổ 4: ${options.students.filter(s=>options.groupMap[s.id]?.group==='Tổ 4').length} HS`,
            false,
            true,
            10.5
          ),
          p(''),
          organizationTable,
          p(''),

          // Chữ ký cuối bảng
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [
                      p('PHÊ DUYỆT CỦA BGH / KHOA', true, true, 11),
                      p('(Ký và ghi rõ họ tên)', false, true, 10),
                      p(''),
                      p(''),
                      p(''),
                      p('..................................................', false, true, 11),
                    ],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                    children: [
                      p(`Thái Nguyên, ngày ..... tháng ..... năm 202...`, false, true, 11),
                      p('GIÁO VIÊN CHỦ NHIỆM', true, true, 11),
                      p('(Ký và ghi rõ họ tên)', false, true, 10),
                      p(''),
                      p(''),
                      p(options.homeroomTeacher || '..................................................', true, true, 11),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
