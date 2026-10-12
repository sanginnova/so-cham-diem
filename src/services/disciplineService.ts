import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DisciplineLogV2, BehaviorTypeV2 } from '../types/v2';
import {
  DisciplineLogV2CreateSchema,
  BulkDisciplineLogV2Schema,
} from '../schemas/v2Schemas';
import { periodLockService } from './periodLockService';
import { auditService } from './auditService';

export const disciplineService = {
  /**
   * Creates a single discipline log with period lock verification and audit trail
   */
  async createLog(
    params: {
      schoolId: string;
      academicYearId: string;
      semesterId: string;
      classId: string;
      studentId: string;
      categoryId: string;
      categoryNameSnapshot: string;
      type: BehaviorTypeV2;
      points: number;
      eventDate: string;
      lessonPeriod?: string;
      notes?: string;
      reporterId: string;
      reporterName: string;
      source: 'teacher' | 'manager' | 'recorder' | 'admin' | 'import';
      weekNumber?: number;
    },
    actor: { id: string; name: string; role: string }
  ): Promise<string> {
    const validated = DisciplineLogV2CreateSchema.parse(params);

    // 1. Period Lock Check
    if (params.weekNumber) {
      const lockCheck = await periodLockService.isLocked(
        validated.schoolId,
        validated.academicYearId,
        validated.semesterId,
        validated.classId,
        'week',
        params.weekNumber
      );

      if (lockCheck.locked) {
        throw new Error(
          `Tuần ${params.weekNumber} đã được khóa thi đua. Không thể thêm hoặc sửa dữ liệu nề nếp.`
        );
      }
    }

    const logCol = collection(db, 'disciplineLogs');
    const newDoc = doc(logCol);
    const id = newDoc.id;

    const logRecord: DisciplineLogV2 = {
      id,
      schoolId: validated.schoolId,
      academicYearId: validated.academicYearId,
      semesterId: validated.semesterId,
      classId: validated.classId,
      studentId: validated.studentId,
      categoryId: validated.categoryId,
      categoryNameSnapshot: validated.categoryNameSnapshot,
      type: validated.type,
      points: validated.points,
      eventDate: validated.eventDate,
      lessonPeriod: validated.lessonPeriod || '',
      notes: validated.notes || '',
      reporterId: validated.reporterId,
      reporterName: validated.reporterName,
      source: validated.source,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await setDoc(newDoc, {
      ...logRecord,
      serverTimestamp: serverTimestamp(),
    });

    // 2. Audit Trail
    await auditService.log({
      schoolId: validated.schoolId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CREATE_DISCIPLINE_LOG',
      entityType: 'DisciplineLog',
      entityId: id,
      after: logRecord,
    });

    return id;
  },

  /**
   * Bulk creates discipline logs for multiple students (e.g. 12 students late)
   */
  async createBulkLogs(
    params: {
      schoolId: string;
      academicYearId: string;
      semesterId: string;
      classId: string;
      studentIds: string[];
      categoryId: string;
      categoryNameSnapshot: string;
      type: BehaviorTypeV2;
      points: number;
      eventDate: string;
      lessonPeriod?: string;
      notes?: string;
      reporterId: string;
      reporterName: string;
      source: 'teacher' | 'manager' | 'recorder' | 'admin' | 'import';
      weekNumber?: number;
    },
    actor: { id: string; name: string; role: string }
  ): Promise<string[]> {
    const validated = BulkDisciplineLogV2Schema.parse(params);

    // 1. Check Period Lock
    if (params.weekNumber) {
      const lockCheck = await periodLockService.isLocked(
        validated.schoolId,
        validated.academicYearId,
        validated.semesterId,
        validated.classId,
        'week',
        params.weekNumber
      );

      if (lockCheck.locked) {
        throw new Error(
          `Tuần ${params.weekNumber} đã được khóa thi đua. Không thể thực hiện ghi nhận hàng loạt.`
        );
      }
    }

    const batch = writeBatch(db);
    const createdIds: string[] = [];
    const logCol = collection(db, 'disciplineLogs');

    for (const studentId of validated.studentIds) {
      const newDoc = doc(logCol);
      const id = newDoc.id;
      createdIds.push(id);

      const logRecord: DisciplineLogV2 = {
        id,
        schoolId: validated.schoolId,
        academicYearId: validated.academicYearId,
        semesterId: validated.semesterId,
        classId: validated.classId,
        studentId,
        categoryId: validated.categoryId,
        categoryNameSnapshot: validated.categoryNameSnapshot,
        type: validated.type,
        points: validated.points,
        eventDate: validated.eventDate,
        lessonPeriod: validated.lessonPeriod || '',
        notes: validated.notes || '',
        reporterId: validated.reporterId,
        reporterName: validated.reporterName,
        source: validated.source,
        status: 'active',
        createdAt: new Date().toISOString(),
      };

      batch.set(newDoc, {
        ...logRecord,
        serverTimestamp: serverTimestamp(),
      });
    }

    await batch.commit();

    // Record bulk action in audit log
    await auditService.log({
      schoolId: validated.schoolId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'BULK_LOG',
      entityType: 'DisciplineLog',
      entityId: `bulk_${createdIds.length}`,
      after: {
        count: createdIds.length,
        category: validated.categoryNameSnapshot,
        points: validated.points,
        date: validated.eventDate,
      },
      reason: `Ghi nhận hàng loạt cho ${createdIds.length} học sinh`,
    });

    return createdIds;
  },

  /**
   * Voids an existing discipline log (Soft Delete with Audit Trail)
   */
  async voidLog(
    logId: string,
    reason: string,
    actor: { id: string; name: string; role: string }
  ): Promise<void> {
    if (!reason || reason.trim().length < 5) {
      throw new Error('Vui lòng nêu rõ lý do hủy bản ghi (tối thiểu 5 ký tự)');
    }

    const logRef = doc(db, 'disciplineLogs', logId);
    const logSnap = await getDoc(logRef);
    if (!logSnap.exists()) {
      throw new Error('Không tìm thấy bản ghi cần hủy.');
    }

    const logData = logSnap.data() as DisciplineLogV2;

    await setDoc(
      logRef,
      {
        status: 'voided',
        voidReason: reason,
        voidedAt: new Date().toISOString(),
        voidedBy: `${actor.name} (${actor.role})`,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Record in audit log
    await auditService.log({
      schoolId: logData.schoolId || 'school_cdnghe01_bqp',
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'VOID_DISCIPLINE_LOG',
      entityType: 'DisciplineLog',
      entityId: logId,
      before: logData,
      after: { status: 'voided', voidReason: reason },
      reason,
    });
  },

  /**
   * Fetches active discipline logs with filtering
   */
  async getLogsByFilter(params: {
    schoolId: string;
    academicYearId?: string;
    classId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<DisciplineLogV2[]> {
    try {
      let q = query(
        collection(db, 'disciplineLogs'),
        where('schoolId', '==', params.schoolId),
        where('status', '==', 'active')
      );

      if (params.academicYearId) {
        q = query(q, where('academicYearId', '==', params.academicYearId));
      }

      if (params.classId) {
        q = query(q, where('classId', '==', params.classId));
      }

      const snapshot = await getDocs(q);
      let logs = snapshot.docs.map((d) => ({
        ...(d.data() as DisciplineLogV2),
        id: d.id,
      }));

      if (params.startDate) {
        logs = logs.filter((l) => l.eventDate >= params.startDate!);
      }
      if (params.endDate) {
        logs = logs.filter((l) => l.eventDate <= params.endDate!);
      }

      return logs;
    } catch (err) {
      console.error('Error fetching discipline logs:', err);
      return [];
    }
  },
};
