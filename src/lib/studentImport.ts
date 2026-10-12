import type { Student } from '../types';
type IncomingStudent = Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId'>;

export function planStudentImport(existing: Student[], incoming: IncomingStudent[], duplicate: 'update' | 'skip', teacherId: string, classId: string, makeId: () => string, now: string) {
  const byCode = new Map(existing.map(student => [student.studentCode.trim().toUpperCase(), student]));
  const changed = new Map<string, Student>();
  const added = new Set<string>();
  const updated = new Set<string>();
  for (const item of incoming) {
    const code = item.studentCode.trim().toUpperCase();
    if (!code) throw new Error('Thiếu mã học sinh.');
    const current = byCode.get(code);
    if (current && duplicate === 'skip') continue;
    const next: Student = current
      ? { ...current, ...item, id: current.id, teacherId: current.teacherId, classId: current.classId, createdAt: current.createdAt, studentCode: code, updatedAt: now }
      : { ...item, id: makeId(), teacherId, classId, studentCode: code, createdAt: now, updatedAt: now };
    byCode.set(code, next);
    changed.set(next.id, next);
    if (!current) added.add(next.id);
    else if (!added.has(next.id)) updated.add(next.id);
  }
  return { records: [...byCode.values()], changed: [...changed.values()], imported: added.size, updated: updated.size };
}
