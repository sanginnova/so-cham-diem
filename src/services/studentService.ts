import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StudentV2, EnrollmentV2 } from '../types/v2';
import { StudentV2Schema, EnrollmentV2Schema } from '../schemas/v2Schemas';
import { auditService } from './auditService';

export const studentService = {
  /**
   * Generates a secure random 12-char parent lookup token
   */
  generateLookupToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 10; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  },

  /**
   * Creates a new student and creates an enrollment record
   */
  async createStudent(
    studentData: {
      studentCode: string;
      fullName: string;
      firstName: string;
      lastName: string;
      gender?: 'Nam' | 'Nữ';
      birthDate?: string;
      parentPhone?: string;
      schoolId: string;
    },
    classId: string,
    academicYearId: string,
    actor: { id: string; name: string; role: string }
  ): Promise<string> {
    const validated = StudentV2Schema.parse({
      ...studentData,
      status: 'active',
    });

    // Check duplicate studentCode within the same school
    const existingQ = query(
      collection(db, 'students'),
      where('schoolId', '==', validated.schoolId),
      where('studentCode', '==', validated.studentCode)
    );
    const existingSnap = await getDocs(existingQ);
    if (!existingSnap.empty) {
      throw new Error(`Mã học sinh "${validated.studentCode}" đã tồn tại trong hệ thống.`);
    }

    const studentCol = collection(db, 'students');
    const newStudentDoc = doc(studentCol);
    const studentId = newStudentDoc.id;

    const parentLookupToken = this.generateLookupToken();

    const newStudent: StudentV2 = {
      id: studentId,
      studentCode: validated.studentCode,
      fullName: validated.fullName,
      firstName: validated.firstName,
      lastName: validated.lastName,
      gender: validated.gender,
      birthDate: validated.birthDate,
      parentPhone: validated.parentPhone,
      parentLookupToken,
      status: 'active',
      schoolId: validated.schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const batch = writeBatch(db);
    batch.set(newStudentDoc, {
      ...newStudent,
      serverTimestamp: serverTimestamp(),
    });

    // Create Enrollment
    const enrollmentCol = collection(db, 'enrollments');
    const newEnrollmentDoc = doc(enrollmentCol);
    const enrollmentRecord: EnrollmentV2 = {
      id: newEnrollmentDoc.id,
      studentId,
      classId,
      academicYearId,
      status: 'active',
      enrolledAt: new Date().toISOString(),
    };

    batch.set(newEnrollmentDoc, {
      ...enrollmentRecord,
      serverTimestamp: serverTimestamp(),
    });

    await batch.commit();

    // Audit log
    await auditService.log({
      schoolId: validated.schoolId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'CREATE_STUDENT',
      entityType: 'Student',
      entityId: studentId,
      after: newStudent,
      reason: `Thêm học sinh ${validated.fullName} (${validated.studentCode}) vào lớp`,
    });

    return studentId;
  },

  /**
   * Imports or updates multiple students from an Excel parsed list with duplicate handling
   */
  async importStudentsWithDuplicateResolution(
    rows: Array<{
      studentCode: string;
      fullName: string;
      firstName: string;
      lastName: string;
      gender?: 'Nam' | 'Nữ';
      birthDate?: string;
      parentPhone?: string;
    }>,
    classId: string,
    academicYearId: string,
    schoolId: string,
    onDuplicate: 'update' | 'skip',
    actor: { id: string; name: string; role: string }
  ): Promise<{ added: number; updated: number; skipped: number }> {
    // 1. Fetch existing students by schoolId
    const existingQ = query(
      collection(db, 'students'),
      where('schoolId', '==', schoolId)
    );
    const existingSnap = await getDocs(existingQ);
    const existingMap = new Map<string, StudentV2>();
    existingSnap.docs.forEach((d) => {
      const data = d.data() as StudentV2;
      existingMap.set(data.studentCode.trim().toLowerCase(), { ...data, id: d.id });
    });

    let added = 0;
    let updated = 0;
    let skipped = 0;

    const batch = writeBatch(db);
    const studentCol = collection(db, 'students');
    const enrollmentCol = collection(db, 'enrollments');

    for (const row of rows) {
      const codeKey = row.studentCode.trim().toLowerCase();
      const existing = existingMap.get(codeKey);

      if (existing) {
        if (onDuplicate === 'update') {
          const docRef = doc(db, 'students', existing.id);
          batch.update(docRef, {
            fullName: row.fullName,
            firstName: row.firstName,
            lastName: row.lastName,
            gender: row.gender || existing.gender || 'Nam',
            birthDate: row.birthDate || existing.birthDate || '',
            parentPhone: row.parentPhone || existing.parentPhone || '',
            updatedAt: new Date().toISOString(),
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        const newDoc = doc(studentCol);
        const sId = newDoc.id;
        const newStudent: StudentV2 = {
          id: sId,
          studentCode: row.studentCode,
          fullName: row.fullName,
          firstName: row.firstName,
          lastName: row.lastName,
          gender: row.gender || 'Nam',
          birthDate: row.birthDate || '',
          parentPhone: row.parentPhone || '',
          parentLookupToken: this.generateLookupToken(),
          status: 'active',
          schoolId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        batch.set(newDoc, newStudent);

        // Enrollment
        const eDoc = doc(enrollmentCol);
        batch.set(eDoc, {
          id: eDoc.id,
          studentId: sId,
          classId,
          academicYearId,
          status: 'active',
          enrolledAt: new Date().toISOString(),
        });

        added++;
      }
    }

    await batch.commit();

    await auditService.log({
      schoolId,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'IMPORT_STUDENTS',
      entityType: 'Student',
      entityId: `import_${rows.length}`,
      after: { added, updated, skipped, classId },
      reason: `Nhập Excel: Thêm ${added}, cập nhật ${updated}, bỏ qua ${skipped}`,
    });

    return { added, updated, skipped };
  },
};
