import { z } from 'zod';
import { calculateTermAverage, calculateYearAverage, calculateSubjectRank, type ClassGradebookData } from '../types/subjectGrade';
const canonical = (value: unknown) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const score = z.number().min(0).max(10).nullable();
const term = z.object({ tx: z.array(score).min(2).max(8), gk: score, ck: score, average: score, note: z.string().optional(), assessmentStatuses: z.record(z.string(), z.enum(['absent', 'exempt', 'makeup'])).optional() });
const lock = z.object({ locked: z.boolean(), at: z.string(), actor: z.string(), reason: z.string() });
const schema = z.object({
  classId: z.string(), teacherId: z.string(), subjectName: z.string(), schoolYear: z.string(), teacherName: z.string(), updatedAt: z.string(),
  txCountSemester1: z.number().int().min(2).max(8), txCountSemester2: z.number().int().min(2).max(8),
  txLabelsSemester1: z.array(z.string()).max(8).optional(), txLabelsSemester2: z.array(z.string()).max(8).optional(),
  revision: z.number().int().nonnegative().optional(), pendingSync: z.boolean().optional(), calculationVersion: z.string().optional(),
  termLocks: z.object({ semester1: lock.optional(), semester2: lock.optional() }).optional(),
  history: z.array(z.object({ id: z.string(), at: z.string(), actor: z.string(), term: z.enum(['semester1', 'semester2']), action: z.string(), detail: z.string(), before: z.string(), after: z.string() })).optional(),
  grades: z.record(z.string(), z.object({ studentId: z.string(), studentCode: z.string(), fullName: z.string(), semester1: term, semester2: term, yearAverage: score, rank: z.enum(['Giỏi', 'Khá', 'Đạt', 'Chưa đạt']).optional(), updatedAt: z.string().optional() })),
});

export function previewGradebookRestore(raw: string, current: ClassGradebookData) {
  if (raw.length > 10 * 1024 * 1024) throw new Error('Tệp vượt quá giới hạn 10 MB.');
  const parsed = schema.safeParse(JSON.parse(raw));
  if (!parsed.success) throw new Error('Tệp không đúng cấu trúc sổ điểm hoặc chứa điểm ngoài thang 0–10.');
  const book = parsed.data;
  for (const key of ['teacherId', 'classId', 'subjectName', 'schoolYear'] as const) {
    if (!current[key] || book[key] !== current[key]) throw new Error('Tệp phải thuộc đúng tài khoản, lớp, môn và năm học đang mở.');
  }
  for (const [id, student] of Object.entries(book.grades)) {
    if (['__proto__', 'constructor', 'prototype'].includes(id) || id !== student.studentId) throw new Error('Mã học sinh trong tệp không hợp lệ.');
    for (const key of ['semester1', 'semester2'] as const) {
      const scores = student[key];
      const count = key === 'semester1' ? book.txCountSemester1 : book.txCountSemester2;
      if (scores.tx.length !== count) throw new Error('Số cột điểm không khớp cấu hình sổ.');
      for (const field of Object.keys(scores.assessmentStatuses || {})) {
        const value = field === 'gk' || field === 'ck' ? scores[field] : /^tx_[0-7]$/.test(field) ? scores.tx[Number(field.slice(3))] : undefined;
        if (value !== null) throw new Error('Ô có trạng thái phải để trống điểm và thuộc cột hợp lệ.');
      }
    }
  }
  for (const key of ['semester1', 'semester2'] as const) {
    if (!current.termLocks?.[key]?.locked) continue;
    const first = key === 'semester1';
    const before = [first ? current.txCountSemester1 : current.txCountSemester2, first ? current.txLabelsSemester1 : current.txLabelsSemester2, Object.keys(current.grades).sort().map(id => [id, current.grades[id][key]])];
    const after = [first ? book.txCountSemester1 : book.txCountSemester2, first ? book.txLabelsSemester1 : book.txLabelsSemester2, Object.keys(book.grades).sort().map(id => [id, book.grades[id][key]])];
    if (!book.termLocks?.[key]?.locked || canonical(before) !== canonical(after)) throw new Error('Tệp thay đổi học kỳ đã chốt. Hãy mở lại học kỳ và ghi lý do trước khi khôi phục.');
  }
  const ids = new Set([...Object.keys(current.grades), ...Object.keys(book.grades)]);
  const changed = [...ids].filter(id => canonical(current.grades[id]) !== canonical(book.grades[id])).length;
  return { book: book as ClassGradebookData, changed, students: Object.keys(book.grades).length, removed: Object.keys(current.grades).filter(id => !book.grades[id]).length };
}

export function applyGradebookRestore(current: ClassGradebookData, backup: ClassGradebookData, actor: string): ClassGradebookData {
  const checked = previewGradebookRestore(JSON.stringify(backup), current).book;
  for (const [id, student] of Object.entries(current.grades)) {
    if (checked.grades[id]) continue;
    const blank = (count: number) => ({ tx: Array<number | null>(count).fill(null), gk: null, ck: null, average: null });
    checked.grades[id] = { ...student, semester1: blank(checked.txCountSemester1), semester2: blank(checked.txCountSemester2), yearAverage: null };
    delete checked.grades[id].rank;
  }
  for (const student of Object.values(checked.grades)) {
    if (!checked.termLocks?.semester1?.locked) student.semester1.average = calculateTermAverage(student.semester1);
    if (!checked.termLocks?.semester2?.locked) student.semester2.average = calculateTermAverage(student.semester2);
    student.yearAverage = calculateYearAverage(student.semester1.average, student.semester2.average);
    student.rank = calculateSubjectRank(student.yearAverage);
  }
  const entries = new Map((current.history || []).map(event => [event.id, event]));
  for (const event of checked.history || []) if (!entries.has(event.id)) entries.set(event.id, event);
  return { ...checked, revision: current.revision, pendingSync: true, updatedAt: new Date().toISOString(), history: [...entries.values(), {
    id: crypto.randomUUID(), at: new Date().toISOString(), actor, term: 'semester1', action: 'restore', detail: 'Khôi phục toàn sổ từ JSON trên máy', before: current.updatedAt, after: checked.updatedAt,
  }] };
}
