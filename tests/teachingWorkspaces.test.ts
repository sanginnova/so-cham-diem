import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_CLASS_CONFIG } from '../src/data/initialData';
import { sameTeachingWorkspace, filterTeachingWorkspaces, rosterCandidates } from '../src/lib/teachingWorkspaces';

const base = { ...INITIAL_CLASS_CONFIG, id: 'math', teacherId: 'teacher-a', className: '6A1', schoolYear: '2026-2027', classType: 'subject' as const, subjectName: 'Toán' };
test('shared roster links only to a root workspace of the same teacher, class and year', () => {
  const root = { ...base, id: 'root', classType: 'homeroom' as const };
  const configs = [base, root, { ...root, id: 'other-teacher', teacherId: 'teacher-b' }, { ...root, id: 'other-year', schoolYear: '2027-2028' }, { ...root, id: 'other-class', className: '6A2' }, { ...root, id: 'chain', rosterSourceClassId: 'root' }];
  assert.deepEqual(rosterCandidates(configs, base).map(config => config.id), ['root']);
  assert.deepEqual(rosterCandidates([root], { ...base, className: ' 6a1 ', schoolYear: '2026 – 2027' }).map(config => config.id), ['root']);
});
test('allows different subjects and homeroom alongside a subject workspace', () => {
  assert.equal(sameTeachingWorkspace(base, { ...base, subjectName: 'Tin học' }), false);
  assert.equal(sameTeachingWorkspace(base, { ...base, classType: 'homeroom' }), false);
  assert.equal(sameTeachingWorkspace(base, { ...base, teacherId: 'teacher-b' }), false);
  assert.equal(sameTeachingWorkspace(base, { ...base, schoolYear: '2027-2028' }), false);
  assert.equal(sameTeachingWorkspace(base, { ...base, className: ' 6a1 ', schoolYear: '2026 – 2027', subjectName: ' toán ' }), true);
});
test('teaching list filters class, subject and year and excludes homeroom', () => {
  const computing = { ...base, id: 'computing', subjectName: 'Tin học' };
  const nextYear = { ...base, id: 'next', schoolYear: '2027-2028' };
  const configs = [base, computing, nextYear, { ...base, id: 'homeroom', classType: 'homeroom' as const }];
  assert.deepEqual(filterTeachingWorkspaces(configs, '2026-2027', '', '6a1').map(c => c.id), ['computing', 'math']);
  assert.deepEqual(filterTeachingWorkspaces(configs, '', 'Toán', '').map(c => c.id), ['math', 'next']);
  assert.equal(filterTeachingWorkspaces(configs, '', '', 'không có').length, 0);
});
