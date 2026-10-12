import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AuditLogV2 } from '../types/v2';
import { AuditLogV2Schema } from '../schemas/v2Schemas';

export interface CreateAuditLogParams {
  schoolId: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
}

export const auditService = {
  /**
   * Records an immutable audit log entry into Firestore
   */
  async log(params: CreateAuditLogParams): Promise<string> {
    try {
      const validated = AuditLogV2Schema.parse(params);
      const auditCol = collection(db, 'auditLogs');
      const logDoc = doc(auditCol);
      const id = logDoc.id;

      const newAudit: AuditLogV2 = {
        id,
        schoolId: validated.schoolId,
        actorId: validated.actorId,
        actorName: validated.actorName,
        actorRole: validated.actorRole,
        action: validated.action,
        entityType: validated.entityType,
        entityId: validated.entityId,
        before: validated.before ?? null,
        after: validated.after ?? null,
        reason: validated.reason ?? '',
        createdAt: new Date().toISOString(),
      };

      await setDoc(logDoc, {
        ...newAudit,
        serverTimestamp: serverTimestamp(),
      });

      return id;
    } catch (err) {
      console.warn('Failed to record audit log:', err);
      // Non-blocking in case of offline, but logged
      return '';
    }
  },

  /**
   * Retrieves recent audit logs for a given school (Admin/Owner only)
   */
  async getRecentLogs(schoolId: string, maxLimit = 50): Promise<AuditLogV2[]> {
    try {
      const auditCol = collection(db, 'auditLogs');
      const q = query(
        auditCol,
        where('schoolId', '==', schoolId),
        orderBy('createdAt', 'desc'),
        limit(maxLimit)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as AuditLogV2),
        id: docSnap.id,
      }));
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      return [];
    }
  },
};
