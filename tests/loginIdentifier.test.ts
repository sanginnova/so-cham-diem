import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveLoginIdentifier } from '../src/lib/loginIdentifier';

test('username login and registration resolve the same Firebase identity', () => {
  assert.equal(resolveLoginIdentifier(' SangInnova '), 'sanginnova@cdnghe01bqp.edu.vn');
  assert.equal(resolveLoginIdentifier('teacher.name_1'), 'teacher.name_1@cdnghe01bqp.edu.vn');
  assert.equal(resolveLoginIdentifier(' SangInnova8@gmail.com '), 'sanginnova8@gmail.com');
});

test('reject malformed usernames and email addresses before calling Firebase', () => {
  for (const value of ['', 'ab', 'sang innova', 'giáoviên', '@gmail.com', 'a@b', '.teacher']) {
    assert.throws(() => resolveLoginIdentifier(value));
  }
});
