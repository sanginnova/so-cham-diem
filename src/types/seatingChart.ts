export interface SeatingChartConfig {
  columns: number; // Số dãy bàn (ví dụ 3 hoặc 4 dãy)
  rows: number; // Số bàn mỗi dãy (ví dụ 5 hoặc 6 bàn)
  seatsPerDesk: number; // Số chỗ mỗi bàn (ví dụ 2 hoặc 3 chỗ)
  teacherDesk: 'left' | 'right'; // Vị trí bàn giáo viên
  // Map lưu vị trí: key là `${col}_${row}` -> mảng studentId (chiều dài seatsPerDesk)
  desks: Record<string, (string | null)[]>;
  updatedAt?: string;
}

export interface StudentGroupInfo {
  studentId: string;
  group: string; // 'Tổ 1' | 'Tổ 2' | 'Tổ 3' | 'Tổ 4'
  duty: string; // 'Tổ trưởng' | 'Tổ phó' | 'Thành viên' | 'Lớp trưởng' ...
  note?: string;
}

export interface ClassOrganizationData {
  groups: Record<string, StudentGroupInfo>; // studentId -> StudentGroupInfo
  updatedAt?: string;
}
