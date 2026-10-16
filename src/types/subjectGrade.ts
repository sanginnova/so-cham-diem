export interface SubjectTermScores {
  tx: (number | null)[]; // Điểm kiểm tra thường xuyên (TX1, TX2, TX3, TX4...)
  gk: number | null;     // Điểm giữa kỳ (Hệ số 2)
  ck: number | null;     // Điểm cuối kỳ (Hệ số 3)
  average: number | null; // Điểm trung bình học kỳ
  note?: string;          // Nhận xét, ghi chú
}

export interface StudentSubjectGrade {
  studentId: string;
  studentCode: string;
  fullName: string;
  semester1: SubjectTermScores;
  semester2: SubjectTermScores;
  yearAverage: number | null;
  rank?: 'Giỏi' | 'Khá' | 'Đạt' | 'Chưa đạt';
  updatedAt?: string;
}

export interface ClassGradebookData {
  classId: string;
  subjectName: string;
  schoolYear: string;
  teacherName: string;
  txCountSemester1: number;
  txCountSemester2: number;
  txLabelsSemester1?: string[]; // Nhãn loại bài kiểm tra: "15 phút (Bài 1)", "30 phút", v.v.
  txLabelsSemester2?: string[];
  grades: Record<string, StudentSubjectGrade>; // studentId -> StudentSubjectGrade
  updatedAt: string;
}

// Hàm tính điểm trung bình học kỳ chuẩn Thông tư 22
export function calculateTermAverage(term: SubjectTermScores): number | null {
  const validTx = term.tx.filter((s): s is number => s !== null && !isNaN(s));
  if (validTx.length === 0 && term.gk === null && term.ck === null) return null;

  let totalPoints = validTx.reduce((sum, s) => sum + s, 0);
  let totalCoeff = validTx.length;

  if (term.gk !== null && !isNaN(term.gk)) {
    totalPoints += term.gk * 2;
    totalCoeff += 2;
  }

  if (term.ck !== null && !isNaN(term.ck)) {
    totalPoints += term.ck * 3;
    totalCoeff += 3;
  }

  if (totalCoeff === 0) return null;
  return Math.round((totalPoints / totalCoeff) * 10) / 10;
}

// Hàm tính điểm trung bình cả năm (HK1 + HK2*2) / 3
export function calculateYearAverage(sem1Avg: number | null, sem2Avg: number | null): number | null {
  if (sem1Avg === null && sem2Avg === null) return null;
  if (sem1Avg !== null && sem2Avg === null) return sem1Avg;
  if (sem1Avg === null && sem2Avg !== null) return sem2Avg;
  return Math.round(((sem1Avg! + sem2Avg! * 2) / 3) * 10) / 10;
}

// Xếp loại môn học
export function calculateSubjectRank(yearAvg: number | null): 'Giỏi' | 'Khá' | 'Đạt' | 'Chưa đạt' | undefined {
  if (yearAvg === null) return undefined;
  if (yearAvg >= 8.0) return 'Giỏi';
  if (yearAvg >= 6.5) return 'Khá';
  if (yearAvg >= 5.0) return 'Đạt';
  return 'Chưa đạt';
}
