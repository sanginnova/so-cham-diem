import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scopeBackup } from '../src/lib/scopedBackup';
const fixture: any = { students: [{ id: 's1', teacherId: 'old' }], disciplineLogs: [{ id: 'l1', studentId: 's1', teacherId: 'old' }], behaviorCategories: [{ id: 'c1' }], classConfig: { id: 'old-config', teacherId: 'old' } };
test('import separates two teachers and preserves student references', () => {
  const a = scopeBackup(fixture, 'a', 'a', { id: 'cfg_a' } as any);
  const b = scopeBackup(fixture, 'b', 'b', { id: 'cfg_b' } as any);
  assert.notEqual(a.students[0].id, b.students[0].id);
  assert.equal(a.disciplineLogs[0].studentId, a.students[0].id);
  assert.equal(a.disciplineLogs[0].createdBy, 'a');
  assert.equal(a.classConfig.id, 'cfg_a');
  assert.deepEqual(scopeBackup(a, 'a', 'a', a.classConfig), a);
});
test('import rejects dangling student references', () => {
  assert.throws(() => scopeBackup({ ...fixture, students: [] }, 'a', 'a', {} as any));
});
