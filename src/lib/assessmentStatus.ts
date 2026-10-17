import { calculateTermAverage, calculateYearAverage, calculateSubjectRank, type ClassGradebookData, type SubjectTermScores } from '../types/subjectGrade';
export type AssessmentStatus = 'absent' | 'exempt' | 'makeup';
export const statusLabels: Record<AssessmentStatus, string> = { absent: 'Vắng kiểm tra', exempt: 'Miễn đánh giá', makeup: 'Cần kiểm tra bù' };
export function assessmentKey(field: 'tx' | 'gk' | 'ck', index = 0) { return field === 'tx' ? `tx_${index}` : field; }
export function assessmentValue(term: SubjectTermScores | undefined, field: 'tx' | 'gk' | 'ck', index = 0): number | string {
  const status = term?.assessmentStatuses?.[assessmentKey(field, index)];
  return status ? statusLabels[status] : (field === 'tx' ? term?.tx[index] : term?.[field]) ?? '';
}
export function setAssessmentStatus(book: ClassGradebookData, studentId: string, term: 'semester1' | 'semester2', field: 'tx' | 'gk' | 'ck', index: number, status: AssessmentStatus | ''): ClassGradebookData {
  if (book.termLocks?.[term]?.locked) throw new Error('Học kỳ đã chốt.');
  const student = book.grades[studentId];
  if (!student) throw new Error('Không tìm thấy học sinh.');
  if (field === 'tx' && (index < 0 || index >= student[term].tx.length)) throw new Error('Cột điểm không hợp lệ.');
  const scores = { ...student[term], tx: [...student[term].tx], assessmentStatuses: { ...student[term].assessmentStatuses } };
  const key = assessmentKey(field, index);
  if (status) {
    scores.assessmentStatuses[key] = status;
    if (field === 'tx') scores.tx[index] = null;
    else scores[field] = null;
  } else delete scores.assessmentStatuses[key];
  scores.average = calculateTermAverage(scores);
  const next = { ...student, [term]: scores };
  next.yearAverage = calculateYearAverage(next.semester1.average, next.semester2.average);
  next.rank = calculateSubjectRank(next.yearAverage);
  return { ...book, grades: { ...book.grades, [studentId]: next } };
}
export function needsAssessmentFollowup(term: SubjectTermScores, filter: 'missing' | 'makeup'): boolean {
  const cells = [...term.tx.map((value, index) => ({ value, key: assessmentKey('tx', index) })), { value: term.gk, key: 'gk' }, { value: term.ck, key: 'ck' }];
  return cells.some(({ value, key }) => filter === 'makeup'
    ? ['absent', 'makeup'].includes(term.assessmentStatuses?.[key] || '')
    : value === null && term.assessmentStatuses?.[key] !== 'exempt');
}
