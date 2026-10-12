import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SchoolClassV2 } from '../types/v2';
import { auditService } from './auditService';

export const classService = {
  /**
   * Retrieves classes for an academic year
   */
  async getClassesByAcademicYear(
    schoolId: string,
    academicYearId: string
  ): Promise<SchoolClassV2[]> {
    try {
      const q = query(
        collection(db, 'classes'),
        where('schoolId', '==', schoolId),
        where('academicYearId', '==', academicYearId),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        ...(d.data() as SchoolClassV2),
        id: d.id,
      }));
    } catch (err) {
      console.error('Error fetching classes:', err);
      return [];
    }
  },

  /**
   * Creates a new class with immutable ID
   */
  async createClass(
    params: {
      schoolId: string;
      className: string;
      grade?: string;
      academicYearId: string;
      homeroomTeacherIds: string[];
      departmentId?: string;
    },
    actor: { id: string; name: string; role: string }
  ): Promise<string> {
    const classCol = collection(db, 'classes');
    const newDoc = doc(classCol);
    const id = newDoc.id;

    const newClass: SchoolClassV2 = {
      id,
      schoolId: params.schoolId,
      className: params.className.trim(),
      grade: params.grade || '',
      academicYearId: params.academicYearId,
      homeroomTeacherIds: params.homeroomTeacherIds,
      departmentId: params.departmentId || '',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await setDoc(newDoc, {
      ...newClass,
      serverTimestamp: serverTimestamp(),
    });

    await auditService.log({
      schoolId: params.schoolId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CREATE_CLASS',
      entityType: 'SchoolClass',
      entityId: id,
      after: newClass,
      reason: `Tạo lớp học ${params.className}`,
    });

    return id;
  },
};
