import type { ClassGradebookData } from '../types/subjectGrade';
type Term = 'semester1' | 'semester2';
const text = (value: unknown) => JSON.stringify(value ?? null);

export function recordGradebookEdit(previous: ClassGradebookData, next: ClassGradebookData, actor: string): ClassGradebookData {
  const events: NonNullable<ClassGradebookData['history']> = [];
  for (const term of ['semester1', 'semester2'] as const) {
    const add = (detail: string, before: unknown, after: unknown) => {
      if (text(before) === text(after)) return;
      if (previous.termLocks?.[term]?.locked) throw new Error('Học kỳ đã chốt. Hãy mở lại sổ và ghi lý do trước khi sửa.');
      events.push({ id: crypto.randomUUID(), at: new Date().toISOString(), actor, term, action: 'edit', detail, before: text(before), after: text(after) });
    };
    for (const id of Object.keys(next.grades)) {
      const old = previous.grades[id]?.[term];
      const current = next.grades[id][term];
      if (!old) continue;
      for (const field of ['tx', 'gk', 'ck', 'note'] as const) add(`${next.grades[id].fullName} (${next.grades[id].studentCode}) · ${field.toUpperCase()}`, old[field], current[field]);
    }
    const first = term === 'semester1';
    add('Số cột TX', first ? previous.txCountSemester1 : previous.txCountSemester2, first ? next.txCountSemester1 : next.txCountSemester2);
    add('Nhãn cột TX', first ? previous.txLabelsSemester1 : previous.txLabelsSemester2, first ? next.txLabelsSemester1 : next.txLabelsSemester2);
  }
  return { ...next, history: [...(previous.history || []), ...events] };
}

export function changeTermLock(book: ClassGradebookData, term: Term, actor: string, reason: string): ClassGradebookData {
  const locked = !book.termLocks?.[term]?.locked;
  if (!locked && !reason.trim()) throw new Error('Vui lòng nhập lý do mở lại sổ.');
  const at = new Date().toISOString();
  return { ...book, calculationVersion: book.calculationVersion || 'weighted-v1',
    termLocks: { ...book.termLocks, [term]: { locked, actor, at, reason: reason.trim() } },
    history: [...(book.history || []), { id: crypto.randomUUID(), at, actor, term, action: locked ? 'lock' : 'unlock', detail: reason.trim() || 'Chốt sổ học kỳ', before: String(!locked), after: String(locked) }],
  };
}
