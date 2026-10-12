import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import {
  UserAccount,
  SchoolClass,
  Student,
  DisciplineLog,
  BehaviorCategory,
  ClassConfig,
  PeriodLockStatus,
} from '../types';

// ======================== USER ACCOUNTS ========================
export async function saveUserToCloud(user: UserAccount): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email,
        username: user.username || '',
        classConfigId: user.classConfigId || '',
        displayName: user.displayName,
        role: user.role,
        assignedClassId: user.assignedClassId,
        assignedClassName: user.assignedClassName,
        department: user.department || '',
        phone: user.phone || '',
        teacherId: user.teacherId || '',
        permissions: user.permissions || { canAddViolations: false, canAddBonuses: false, canViewScores: false },
        studentId: user.studentId || '',
        avatarUrl: user.avatarUrl || '',
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt || new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: false }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserFromCloud(uid: string): Promise<UserAccount | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserAccount;
    }
    return null;
  } catch (error) {
    throw error;
  }
}

export async function getAllUsersFromCloud(): Promise<UserAccount[]> {
  const path = 'users';
  try {
    if (!auth.currentUser || auth.currentUser.isAnonymous) return [];
    const own = await getUserFromCloud(auth.currentUser.uid);
    if (!own) return [];
    if (own.role === 'monitor') return [own];
    const source = ['admin', 'owner'].includes(own.role) ? collection(db, 'users')
      : query(collection(db, 'users'), where('teacherId', '==', own.uid), where('role', '==', 'monitor'));
    const snap = await getDocs(source);
    if (!['admin', 'owner'].includes(own.role)) return [own, ...snap.docs.map((d) => d.data() as UserAccount)];
    return snap.docs.map((d) => d.data() as UserAccount);
  } catch (error) {
    throw error;
  }
}

// ======================== CLASSES ========================
export async function saveClassToCloud(cls: SchoolClass): Promise<void> {
  const path = `classes/${cls.id}`;
  try {
    const classRef = doc(db, 'classes', cls.id);
    await setDoc(
      classRef,
      {
        ...cls,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getAllClassesFromCloud(): Promise<SchoolClass[]> {
  const path = 'classes';
  try {
    if (!auth.currentUser || auth.currentUser.isAnonymous) return [];
    const own = await getUserFromCloud(auth.currentUser.uid);
    if (!own) return [];
    const source = ['admin', 'owner'].includes(own.role) ? collection(db, 'classes')
      : query(collection(db, 'classes'), where('teacherId', '==', own.role === 'monitor' ? own.teacherId : own.uid));
    const snap = await getDocs(source);
    return snap.docs.map((d) => d.data() as SchoolClass);
  } catch (error) {
    throw error;
  }
}

export async function deleteClassFromCloud(classId: string): Promise<void> {
  const path = `classes/${classId}`;
  try {
    await deleteDoc(doc(db, 'classes', classId));
  } catch (error) {
    console.warn('Could not delete class from cloud:', error);
  }
}

// ======================== CLASS CONFIG ========================
export async function saveClassConfigToCloud(config: ClassConfig): Promise<void> {
  const path = `classConfigs/${config.id}`;
  try {
    await setDoc(
      doc(db, 'classConfigs', config.id),
      {
        ...config,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getClassConfigFromCloud(teacherId: string): Promise<ClassConfig | null> {
  const path = 'classConfigs';
  try {
    const q = query(collection(db, 'classConfigs'), where('teacherId', '==', teacherId));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const configs = snap.docs.map(item => item.data() as ClassConfig);
      return configs.find(config => config.scopeVersion !== 2) || configs.sort((a, b) => a.id.localeCompare(b.id))[0];
    }
    return null;
  } catch (error) {
    throw error;
  }
}

// ======================== STUDENTS ========================
export async function saveStudentToCloud(student: Student): Promise<void> {
  const path = `students/${student.id}`;
  try {
    await setDoc(
      doc(db, 'students', student.id),
      {
        ...student,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function batchSaveStudentsToCloud(students: Student[]): Promise<void> {
  try {
    await Promise.all(students.map((s) => saveStudentToCloud(s)));
  } catch (error) {
    console.warn('Batch saving students failed:', error);
  }
}

export async function deleteStudentFromCloud(studentId: string): Promise<void> {
  const path = `students/${studentId}`;
  try {
    await deleteDoc(doc(db, 'students', studentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getStudentsFromCloud(teacherId: string, classId?: string): Promise<Student[]> {
  const path = 'students';
  try {
    const q = classId ? query(collection(db, 'students'), where('teacherId', '==', teacherId), where('classId', '==', classId)) : query(collection(db, 'students'), where('teacherId', '==', teacherId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Student);
  } catch (error) {
    throw error;
  }
}

// ======================== DISCIPLINE LOGS ========================
export async function saveDisciplineLogToCloud(log: DisciplineLog): Promise<void> {
  const path = `disciplineLogs/${log.id}`;
  try {
    await setDoc(
      doc(db, 'disciplineLogs', log.id),
      {
        ...log,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDisciplineLogFromCloud(logId: string, deletedLog?: DisciplineLog, editorName?: string): Promise<void> {
  const path = `disciplineLogs/${logId}`;
  try {
    await runTransaction(db, async batch => {
      const live = await batch.get(doc(db, 'disciplineLogs', logId));
      if (!live.exists()) throw new Error('Bản ghi đã bị xóa.');
      const archivedLog = live.data() as DisciplineLog;
      batch.delete(doc(db, 'disciplineLogs', logId));
      if (auth.currentUser) batch.set(doc(db, 'disciplineTrash', logId), {
        teacherId: archivedLog.teacherId, classId: archivedLog.classId, log: archivedLog,
        deletedAt: new Date().toISOString(), deletedBy: editorName || 'GVCN',
      });
      if (auth.currentUser) batch.set(doc(collection(db, 'auditLogs')), {
        schoolId: 'school_cdnghe01_bqp', actorId: auth.currentUser.uid, actorName: editorName || 'GVCN', action: 'DELETE_DISCIPLINE_LOG', entityType: 'DisciplineLog', entityId: logId,
        classId: archivedLog.classId, teacherId: archivedLog.teacherId, before: JSON.parse(JSON.stringify(archivedLog)), createdAt: new Date().toISOString(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function restoreDisciplineLogFromCloud(log: DisciplineLog) {
  await runTransaction(db, async batch => {
    const trashRef = doc(db, 'disciplineTrash', log.id);
    const liveRef = doc(db, 'disciplineLogs', log.id);
    const trash = await batch.get(trashRef);
    if (!trash.exists()) throw new Error('Bản ghi đã được khôi phục hoặc không còn trong thùng rác.');
    const original = trash.data().log as DisciplineLog;
    batch.set(liveRef, { ...original, createdBy: log.createdBy, updatedAt: log.updatedAt, history: [...(original.history || []), ...(log.history || []).slice(-1)] });
    batch.delete(trashRef);
  });
}

export async function getDisciplineLogsFromCloud(teacherId: string, classId?: string): Promise<DisciplineLog[]> {
  const path = 'disciplineLogs';
  try {
    const q = classId ? query(collection(db, 'disciplineLogs'), where('teacherId', '==', teacherId), where('classId', '==', classId)) : query(collection(db, 'disciplineLogs'), where('teacherId', '==', teacherId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as DisciplineLog);
  } catch (error) {
    throw error;
  }
}

// ======================== BEHAVIOR CATEGORIES ========================
export async function saveBehaviorCategoryToCloud(cat: BehaviorCategory): Promise<void> {
  const path = `behaviorCategories/${cat.id}`;
  try {
    await setDoc(
      doc(db, 'behaviorCategories', cat.id),
      {
        ...cat,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getBehaviorCategoriesFromCloud(teacherId: string): Promise<BehaviorCategory[]> {
  const path = 'behaviorCategories';
  try {
    const q = query(collection(db, 'behaviorCategories'), where('teacherId', '==', teacherId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as BehaviorCategory);
  } catch (error) {
    throw error;
  }
}

// ======================== PERIOD LOCKS ========================
export async function savePeriodLockToCloud(lock: PeriodLockStatus): Promise<void> {
  const id = `${lock.classId ? lock.classId + '__' : ''}${lock.periodType}_${lock.periodValue}`;
  const path = `periodLocks/${id}`;
  try {
    await setDoc(
      doc(db, 'periodLocks', id),
      {
        id,
        classId: lock.classId || '',
        periodType: lock.periodType,
        periodValue: lock.periodValue,
        isLocked: lock.isLocked,
        lockedAt: lock.lockedAt || new Date().toISOString(),
        lockedBy: lock.lockedBy || 'Quản trị viên',
        reason: lock.reason || '',
        ...(lock.scoreVersion ? { scoreVersion: lock.scoreVersion } : {}),
        ...(lock.scores ? { scores: lock.scores } : {}),
        ...(lock.monthlyScores ? { monthlyScores: lock.monthlyScores } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    throw error;
  }
}

export async function getPeriodLocksFromCloud(): Promise<PeriodLockStatus[]> {
  const path = 'periodLocks';
  try {
    const snap = await getDocs(collection(db, 'periodLocks'));
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        periodType: data.periodType,
        classId: data.classId || undefined,
        periodValue: data.periodValue,
        isLocked: data.isLocked,
        lockedAt: data.lockedAt,
        lockedBy: data.lockedBy,
        reason: data.reason,
      } as PeriodLockStatus;
    });
  } catch (error) {
    throw error;
  }
}
