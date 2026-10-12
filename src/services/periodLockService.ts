import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PeriodLockV2, PeriodTypeV2 } from '../types/v2';
import { PeriodLockV2Schema, UnlockPeriodV2Schema } from '../schemas/v2Schemas';
import { auditService } from './auditService';

export const periodLockService = {
  /**
   * Generates a deterministic document ID for a period lock
   */
  getLockDocId(
    academicYearId: string,
    periodType: PeriodTypeV2,
    periodNumber: number,
    classId = 'all'
  ): string {
    return `lock_${academicYearId}_${periodType}_${periodNumber}_${classId}`;
  },

  /**
   * Checks whether a specific period is locked
   */
  async isLocked(
    schoolId: string,
    academicYearId: string,
    semesterId: string,
    classId: string,
    periodType: PeriodTypeV2,
    periodNumber: number
  ): Promise<{ locked: boolean; lockInfo?: PeriodLockV2 }> {
    try {
      // 1. Check class-specific lock
      const classLockId = this.getLockDocId(academicYearId, periodType, periodNumber, classId);
      const classLockSnap = await getDoc(doc(db, 'periodLocks', classLockId));
      if (classLockSnap.exists()) {
        const data = classLockSnap.data() as PeriodLockV2;
        if (data.status === 'locked') {
          return { locked: true, lockInfo: data };
        }
      }

      // 2. Check school-wide lock (classId == 'all')
      const schoolLockId = this.getLockDocId(academicYearId, periodType, periodNumber, 'all');
      const schoolLockSnap = await getDoc(doc(db, 'periodLocks', schoolLockId));
      if (schoolLockSnap.exists()) {
        const data = schoolLockSnap.data() as PeriodLockV2;
        if (data.status === 'locked') {
          return { locked: true, lockInfo: data };
        }
      }

      return { locked: false };
    } catch (err) {
      console.error('Error checking period lock status:', err);
      // Fallback safe: false unless proven locked
      return { locked: false };
    }
  },

  /**
   * Locks a period (Inspector/Admin only)
   */
  async lockPeriod(
    params: {
      schoolId: string;
      academicYearId: string;
      semesterId: string;
      classId: string; // 'all' or specific class ID
      periodType: PeriodTypeV2;
      periodNumber: number;
      reason?: string;
    },
    actor: { id: string; name: string; role: string }
  ): Promise<void> {
    const validated = PeriodLockV2Schema.parse({
      ...params,
      status: 'locked',
    });

    const lockId = this.getLockDocId(
      validated.academicYearId,
      validated.periodType,
      validated.periodNumber,
      validated.classId
    );

    const lockData: PeriodLockV2 = {
      id: lockId,
      schoolId: validated.schoolId,
      academicYearId: validated.academicYearId,
      semesterId: validated.semesterId,
      classId: validated.classId,
      periodType: validated.periodType,
      periodNumber: validated.periodNumber,
      status: 'locked',
      lockedAt: new Date().toISOString(),
      lockedBy: `${actor.name} (${actor.role})`,
      reason: validated.reason || 'Khóa sổ thi đua định kỳ',
    };

    await setDoc(doc(db, 'periodLocks', lockId), {
      ...lockData,
      serverTimestamp: serverTimestamp(),
    });

    // Record in immutable audit log
    await auditService.log({
      schoolId: validated.schoolId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'LOCK_PERIOD',
      entityType: 'PeriodLock',
      entityId: lockId,
      after: lockData,
      reason: validated.reason || 'Khóa sổ định kỳ',
    });
  },

  /**
   * Unlocks a period with mandatory audit reason (Inspector/Admin only)
   */
  async unlockPeriod(
    params: { lockId: string; reason: string },
    actor: { id: string; name: string; role: string }
  ): Promise<void> {
    const validated = UnlockPeriodV2Schema.parse(params);

    const lockRef = doc(db, 'periodLocks', validated.lockId);
    const existingSnap = await getDoc(lockRef);
    const beforeData = existingSnap.exists() ? existingSnap.data() : null;

    await setDoc(
      lockRef,
      {
        status: 'open',
        unlockedAt: new Date().toISOString(),
        unlockedBy: `${actor.name} (${actor.role})`,
        unlockReason: validated.reason,
      },
      { merge: true }
    );

    // Record in immutable audit log
    await auditService.log({
      schoolId: (beforeData as any)?.schoolId || 'school_cdnghe01_bqp',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'PERIOD_UNLOCKED',
      entityType: 'PeriodLock',
      entityId: validated.lockId,
      before: beforeData,
      after: { status: 'open', unlockReason: validated.reason },
      reason: validated.reason,
    });
  },

  /**
   * Retrieves all period locks for an academic year
   */
  async getAllLocks(academicYearId: string): Promise<PeriodLockV2[]> {
    try {
      const q = query(
        collection(db, 'periodLocks'),
        where('academicYearId', '==', academicYearId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        ...(d.data() as PeriodLockV2),
        id: d.id,
      }));
    } catch (err) {
      console.error('Error fetching period locks:', err);
      return [];
    }
  },
};
