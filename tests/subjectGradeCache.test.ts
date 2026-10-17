import test from 'node:test';
import assert from 'node:assert/strict';
import { auth } from '../src/lib/firebase';
import { stageGradebookDraft, discardGradebookDraft, loadClassGradebook, saveClassGradebook } from '../src/services/subjectGradeService';
import type { ClassGradebookData } from '../src/types/subjectGrade';

test('drafts survive switching classes, isolate accounts and clear only the selected draft', async () => {
  const items = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
  } });
  const original = auth.currentUser;
  const book: ClassGradebookData = { classId: 'class-a', teacherId: 'teacher-a', subjectName: 'Toán', schoolYear: '2026-2027', teacherName: 'GV', txCountSemester1: 4, txCountSemester2: 4, grades: {}, revision: 0, updatedAt: '2026-10-17' };
  try {
    Object.defineProperty(auth, 'currentUser', { configurable: true, writable: true, value: { uid: 'teacher-a' } });
    stageGradebookDraft(book, false);
    stageGradebookDraft({ ...book, classId: 'class-b' }, false);
    Object.defineProperty(auth, 'currentUser', { value: { uid: 'teacher-b' } });
    stageGradebookDraft({ ...book, teacherId: 'teacher-b' }, false);
    discardGradebookDraft('class-a', false);
    assert.equal(items.size, 2);
    assert.equal(JSON.parse(items.get('subject_gradebook_v2_teacher-a_class-a')!).pendingSync, true);
    Object.defineProperty(auth, 'currentUser', { value: null });
    assert.throws(() => stageGradebookDraft(book, false), /đăng nhập/);
    stageGradebookDraft({ ...book, txLabelsSemester1: ['Miệng'] }, true);
    const recovered = await loadClassGradebook(book.classId, book.subjectName, book.schoolYear, book.teacherName, [], true, 'teacher-a');
    assert.equal(recovered.pendingSync, true);
    assert.deepEqual(recovered.txLabelsSemester1, ['Miệng']);
    const saved = await saveClassGradebook(recovered, true);
    assert.equal(saved.pendingSync, false);
    assert.equal(items.has('subject_gradebook_v2_teacher-a_class-b'), true);
    // Two subjects share stable student identities but keep independent scores.
    const roster = [{ id: 'shared-student', studentCode: 'HS01', fullName: 'Học sinh A' }] as any;
    const math = await loadClassGradebook('math', 'Toán', book.schoolYear, 'GV', roster, true, 'teacher-a');
    math.grades['shared-student'].semester1.tx[0] = 8;
    await saveClassGradebook(math, true);
    const computing = await loadClassGradebook('computing', 'Tin', book.schoolYear, 'GV', roster, true, 'teacher-a');
    assert.equal(computing.grades['shared-student'].semester1.tx[0], null);
    const reopened = await loadClassGradebook('math', 'Toán', book.schoolYear, 'GV', [{ ...roster[0], fullName: 'Tên đã sửa' }], true, 'teacher-a');
    assert.equal(reopened.grades['shared-student'].fullName, 'Tên đã sửa');
    assert.equal(reopened.grades['shared-student'].semester1.tx[0], 8);
  } finally {
    Object.defineProperty(auth, 'currentUser', { value: original });
    delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});
