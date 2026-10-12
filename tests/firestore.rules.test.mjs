import fs from 'node:fs';
import assert from 'node:assert/strict';
import { before, after, beforeEach, test } from 'node:test';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, setDoc, updateDoc, collection, query, where, writeBatch, Timestamp, runTransaction, deleteDoc } from 'firebase/firestore';
let env;
const profile = (uid, role = 'teacher', extra = {}) => ({ uid, role, isActive: true, teacherId: '', ...extra });
const dbFor = (uid, provider = 'password') => env.authenticatedContext(uid, { firebase: { sign_in_provider: provider } }).firestore();
const log = (teacherId, createdBy, extra = {}) => ({ teacherId, createdBy, studentId: `student-${teacherId}`, classId: `cfg-${teacherId}`, type: 'deduct', weekNumber: 1, month: 9, count: 1, scorePerUnit: 1, totalScore: 1, ...extra });
test('class-scoped locks and monitors do not cross into another year', async () => {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    for (const id of ['year-a', 'year-b']) {
      await setDoc(doc(db, 'classConfigs', id), { teacherId: 'a', scopeVersion: 2, schoolYear: '2026-2027', classDirectoryId: id, semester1Months: [9, 10, 11, 12, 1] });
      await setDoc(doc(db, 'students', id), { teacherId: 'a', classId: id });
    }
    await setDoc(doc(db, 'users', 'scoped-monitor'), profile('scoped-monitor', 'monitor', { teacherId: 'a', classConfigId: 'year-a', permissions: { canAddViolations: true, canAddBonuses: true, canViewScores: true } }));
  });
  await assertSucceeds(getDoc(doc(dbFor('scoped-monitor'), 'students', 'year-a')));
  await assertFails(getDoc(doc(dbFor('scoped-monitor'), 'students', 'year-b')));
  await assertSucceeds(getDocs(query(collection(dbFor('scoped-monitor'), 'students'), where('teacherId', '==', 'a'), where('classId', '==', 'year-a'))));
  await assertFails(getDoc(doc(dbFor('monitor'), 'students', 'year-b')));
  await assertSucceeds(setDoc(doc(dbFor('admin'), 'periodLocks', 'year-a__week_1'), { isLocked: true, classId: 'year-a' }));
  await assertFails(setDoc(doc(dbFor('a'), 'disciplineLogs', 'blocked-year'), log('a', 'a', { classId: 'year-a', studentId: 'year-a' })));
  await assertSucceeds(setDoc(doc(dbFor('a'), 'disciplineLogs', 'open-year'), log('a', 'a', { classId: 'year-b', studentId: 'year-b' })));
  await assertSucceeds(updateDoc(doc(dbFor('a'), 'disciplineLogs', 'open-year'), { weekNumber: 2, month: 10 }));
  await assertFails(updateDoc(doc(dbFor('a'), 'classConfigs', 'year-a'), { schoolYear: '2027-2028' }));
});
test('log totals must match unit score and integer count', async () => {
  await assertFails(setDoc(doc(dbFor('a'), 'disciplineLogs', 'forged-total'), log('a', 'a', { totalScore: 100 })));
  await assertFails(setDoc(doc(dbFor('a'), 'disciplineLogs', 'fractional-count'), log('a', 'a', { count: 1.5, totalScore: 1.5 })));
  await assertSucceeds(setDoc(doc(dbFor('a'), 'disciplineLogs', 'rounded'), log('a', 'a', { scorePerUnit: 0.333, count: 3, totalScore: 1 })));
});
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-so-cham-diem', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') } }); });
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'users', 'a'), profile('a')), setDoc(doc(db, 'users', 'b'), profile('b')),
      setDoc(doc(db, 'users', 'admin'), profile('admin', 'admin')),
      setDoc(doc(db, 'users', 'disabled'), profile('disabled', 'teacher', { isActive: false })),
      setDoc(doc(db, 'users', 'monitor'), profile('monitor', 'monitor', { teacherId: 'a', assignedClassId: 'class-a', permissions: { canAddViolations: true, canAddBonuses: false, canViewScores: true } })),
      setDoc(doc(db, 'classes', 'class-a'), { teacherId: 'a' }),
      setDoc(doc(db, 'students', 'student-a'), { teacherId: 'a', classId: 'cfg-a' }), setDoc(doc(db, 'students', 'student-b'), { teacherId: 'b', classId: 'cfg-b' }),
      setDoc(doc(db, 'classConfigs', 'cfg-a'), { teacherId: 'a', semester1Months: [9, 10, 11, 12, 1] }),
      setDoc(doc(db, 'classConfigs', 'cfg-b'), { teacherId: 'b', semester1Months: [9, 10, 11, 12, 1] }),
      setDoc(doc(db, 'disciplineLogs', 'old'), log('a', 'a')),
    ]);
  });
});
test('guest and anonymous sessions cannot access school data', async () => {
  for (const db of [env.unauthenticatedContext().firestore(), dbFor('a', 'anonymous')]) {
    await assertFails(getDoc(doc(db, 'students', 'student-a')));
    await assertFails(setDoc(doc(db, 'students', 'new'), { teacherId: 'a' }));
  }
});
test('teachers cannot access, list, overwrite or transfer other teachers data', async () => {
  const db = dbFor('a');
  await assertSucceeds(getDoc(doc(db, 'students', 'student-a')));
  await assertSucceeds(getDocs(query(collection(db, 'students'), where('teacherId', '==', 'a'))));
  await assertFails(getDocs(collection(db, 'students')));
  await assertFails(getDoc(doc(db, 'students', 'student-b')));
  await assertFails(setDoc(doc(db, 'students', 'student-b'), { teacherId: 'a' }));
  await assertFails(updateDoc(doc(db, 'students', 'student-a'), { teacherId: 'b' }));
});
test('profiles cannot self-escalate, unblock themselves or store passwords', async () => {
  const db = dbFor('a');
  await assertFails(updateDoc(doc(db, 'users', 'a'), { role: 'admin' }));
  await assertFails(updateDoc(doc(db, 'users', 'a'), { permissions: { canViewScores: true } }));
  await assertFails(updateDoc(doc(db, 'users', 'b'), { displayName: 'hacked' }));
  await assertFails(updateDoc(doc(dbFor('disabled'), 'users', 'disabled'), { isActive: true }));
  await assertFails(setDoc(doc(dbFor('new'), 'users', 'new'), profile('new', 'admin')));
  await assertFails(setDoc(doc(dbFor('new'), 'users', 'new'), profile('new', 'teacher', { password: 'secret' })));
  await assertSucceeds(setDoc(doc(dbFor('new'), 'users', 'new'), profile('new')));
});
test('teacher provisions monitors only for their own class', async () => {
  const db = dbFor('a');
  await assertSucceeds(setDoc(doc(db, 'users', 'new-monitor'), profile('new-monitor', 'monitor', { teacherId: 'a', assignedClassId: 'class-a' })));
  await assertFails(setDoc(doc(db, 'users', 'bad'), profile('bad', 'monitor', { teacherId: 'b', assignedClassId: 'class-a' })));
  await assertSucceeds(getDocs(query(collection(db, 'users'), where('teacherId', '==', 'a'), where('role', '==', 'monitor'))));
  await assertFails(getDocs(collection(db, 'users')));
});
test('monitor permissions and log creator identity apply on the server', async () => {
  const db = dbFor('monitor');
  await assertSucceeds(setDoc(doc(db, 'disciplineLogs', 'new'), log('a', 'monitor')));
  await assertFails(setDoc(doc(db, 'disciplineLogs', 'bonus'), log('a', 'monitor', { type: 'bonus' })));
  await assertFails(setDoc(doc(db, 'disciplineLogs', 'foreign'), log('b', 'monitor')));
  await assertFails(setDoc(doc(db, 'students', 'new'), { teacherId: 'a' }));
  await assertFails(updateDoc(doc(db, 'disciplineLogs', 'old'), { count: 2 }));
  await assertFails(setDoc(doc(dbFor('a'), 'disciplineLogs', 'forged'), log('a', 'b')));
});
test('period locks and account disabling block writes', async () => {
  await assertSucceeds(setDoc(doc(dbFor('admin'), 'periodLocks', 'week_1'), { isLocked: true }));
  await assertFails(setDoc(doc(dbFor('a'), 'disciplineLogs', 'locked'), log('a', 'a')));
  await assertFails(updateDoc(doc(dbFor('a'), 'disciplineLogs', 'old'), { weekNumber: 2 }));
  await assertFails(setDoc(doc(dbFor('a'), 'periodLocks', 'week_1'), { isLocked: false }));
  await assertFails(setDoc(doc(dbFor('disabled'), 'students', 'new'), { teacherId: 'disabled' }));
  await assertSucceeds(getDoc(doc(dbFor('admin'), 'students', 'student-b')));
});
test('semester locks and student/config references are enforced', async () => {
  const db = dbFor('a');
  await assertFails(setDoc(doc(db, 'disciplineLogs', 'foreign-student'), log('a', 'a', { studentId: 'student-b' })));
  await assertSucceeds(setDoc(doc(dbFor('admin'), 'periodLocks', 'semester_1'), { isLocked: true }));
  await assertFails(setDoc(doc(db, 'disciplineLogs', 'semester-locked'), log('a', 'a')));
  await assertFails(updateDoc(doc(db, 'disciplineLogs', 'old'), { month: 2 }));
});
test('delete with audit is atomic, restore is owner-only and period locks block both', async () => {
  const auditedDelete = uid => { const db = dbFor(uid); const batch = writeBatch(db); batch.delete(doc(db, 'disciplineLogs', 'old')); batch.set(doc(db, 'auditLogs', 'deletion'), { actorId: uid, action: 'DELETE_DISCIPLINE_LOG' }); return batch.commit(); };
  await assertFails(auditedDelete('monitor'));
  await assertFails(auditedDelete('b'));
  await assertSucceeds(auditedDelete('a'));
  assert.equal((await getDoc(doc(dbFor('admin'), 'disciplineLogs', 'old'))).exists(), false);
  assert.equal((await getDoc(doc(dbFor('admin'), 'auditLogs', 'deletion'))).exists(), true);
  await assertSucceeds(setDoc(doc(dbFor('a'), 'disciplineLogs', 'old'), log('a', 'a')));
  await assertSucceeds(setDoc(doc(dbFor('admin'), 'periodLocks', 'month_9'), { isLocked: true }));
  await assertFails(auditedDelete('a'));
  await assertFails(setDoc(doc(dbFor('a'), 'disciplineLogs', 'restore-locked'), log('a', 'a')));
});
const familyDbFor = (email = 'parent@example.com', verified = true) => env.authenticatedContext('family', { email, email_verified: verified, firebase: { sign_in_provider: 'google.com' } }).firestore();
const reportData = () => ({ teacherId: 'a', classId: 'cfg-a', studentId: 'student-a', viewerEmail: 'parent@example.com', revoked: false, expiresAt: Timestamp.fromMillis(Date.now() + 86400000), logIds: ['old'], logs: [] });
test('family report is restricted to verified invited email; no listing, expired or revoked access', async () => {
  await assertSucceeds(setDoc(doc(dbFor('a'), 'familyReports', 'secure-report'), reportData()));
  await assertSucceeds(getDoc(doc(familyDbFor(), 'familyReports', 'secure-report')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'familyReports', 'secure-report')));
  await assertFails(getDoc(doc(familyDbFor('other@example.com'), 'familyReports', 'secure-report')));
  await assertFails(getDoc(doc(familyDbFor('parent@example.com', false), 'familyReports', 'secure-report')));
  await assertFails(getDocs(collection(familyDbFor(), 'familyReports')));
  await assertFails(getDoc(doc(familyDbFor(), 'students', 'student-a')));
  await assertSucceeds(updateDoc(doc(dbFor('a'), 'familyReports', 'secure-report'), { revoked: true }));
  await assertFails(getDoc(doc(familyDbFor(), 'familyReports', 'secure-report')));
  await assertSucceeds(updateDoc(doc(dbFor('a'), 'familyReports', 'secure-report'), { revoked: false, expiresAt: Timestamp.fromMillis(Date.now() - 1000) }));
  await assertFails(getDoc(doc(familyDbFor(), 'familyReports', 'secure-report')));
});
test('family requests cannot target another student, self-approve or alter points', async () => {
  await assertSucceeds(setDoc(doc(dbFor('a'), 'familyReports', 'secure-report'), reportData()));
  const proposal = { reportId: 'secure-report', teacherId: 'a', classId: 'cfg-a', studentId: 'student-a', logId: 'old', requesterId: 'family', requesterEmail: 'parent@example.com', reason: 'Ghi nhầm', requestedDescription: 'Nghỉ học có phép', status: 'pending', createdAt: new Date().toISOString() };
  await assertSucceeds(setDoc(doc(familyDbFor(), 'correctionRequests', 'request'), proposal));
  await assertFails(setDoc(doc(familyDbFor(), 'correctionRequests', 'foreign'), { ...proposal, studentId: 'student-b' }));
  await assertFails(setDoc(doc(familyDbFor(), 'correctionRequests', 'foreign-log'), { ...proposal, logId: 'other' }));
  await assertFails(updateDoc(doc(familyDbFor(), 'correctionRequests', 'request'), { status: 'approved', response: 'ok', reviewedBy: 'family' }));
  await assertFails(updateDoc(doc(familyDbFor(), 'disciplineLogs', 'old'), { behaviorDescription: 'Nghỉ học có phép' }));
  await assertFails(updateDoc(doc(dbFor('b'), 'correctionRequests', 'request'), { status: 'rejected', response: 'no', reviewedBy: 'b' }));
  const staffDb = dbFor('a');
  const batch = writeBatch(staffDb);
  batch.update(doc(staffDb, 'disciplineLogs', 'old'), { behaviorDescription: proposal.requestedDescription });
  batch.update(doc(staffDb, 'correctionRequests', 'request'), { status: 'approved', response: 'Đã kiểm tra', reviewedBy: 'a', reviewedAt: new Date().toISOString() });
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(familyDbFor(), 'correctionRequests', 'request')));
});
test('trash survives deletion, is scoped to owner, restores atomically and respects locks', async () => {
  const oldLog = log('a', 'a');
  const db = dbFor('a');
  const batch = writeBatch(db);
  batch.set(doc(db, 'disciplineTrash', 'old'), { teacherId: 'a', classId: 'cfg-a', log: oldLog, deletedAt: new Date().toISOString(), deletedBy: 'GVCN' });
  batch.delete(doc(db, 'disciplineLogs', 'old'));
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(db, 'disciplineTrash', 'old')));
  await assertFails(getDoc(doc(dbFor('b'), 'disciplineTrash', 'old')));
  await assertFails(getDoc(doc(familyDbFor(), 'disciplineTrash', 'old')));
  await assertFails(deleteDoc(doc(db, 'disciplineTrash', 'old')));
  const restore = () => runTransaction(db, async transaction => { const archived = await transaction.get(doc(db, 'disciplineTrash', 'old')); transaction.set(doc(db, 'disciplineLogs', 'old'), archived.data().log); transaction.delete(doc(db, 'disciplineTrash', 'old')); });
  await assertSucceeds(setDoc(doc(dbFor('admin'), 'periodLocks', 'month_9'), { isLocked: true }));
  await assertFails(restore());
  await assertSucceeds(setDoc(doc(dbFor('admin'), 'periodLocks', 'month_9'), { isLocked: false }));
  await assertSucceeds(restore());
  assert.equal((await getDoc(doc(dbFor('admin'), 'disciplineTrash', 'old'))).exists(), false);
});
