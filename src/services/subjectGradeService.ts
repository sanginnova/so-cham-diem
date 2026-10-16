import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Student } from '../types';
import {
  ClassGradebookData,
  StudentSubjectGrade,
  calculateTermAverage,
  calculateYearAverage,
  calculateSubjectRank,
} from '../types/subjectGrade';

const LOCAL_STORAGE_KEY_PREFIX = 'subject_gradebook_';

export async function loadClassGradebook(
  classId: string,
  subjectName: string,
  schoolYear: string,
  teacherName: string,
  students: Student[],
  isLocalMode: boolean
): Promise<ClassGradebookData> {
  let loadedData: Partial<ClassGradebookData> | null = null;
  const storageKey = `${LOCAL_STORAGE_KEY_PREFIX}${classId}`;

  // 1. Tải từ cache cục bộ trước
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      loadedData = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Lỗi đọc sổ điểm từ localStorage:', e);
  }

  // 2. Nếu ở chế độ đám mây, đồng bộ từ Firestore
  if (!isLocalMode) {
    try {
      const snap = await getDoc(doc(db, 'subjectGradebooks', classId));
      if (snap.exists()) {
        loadedData = snap.data() as ClassGradebookData;
        localStorage.setItem(storageKey, JSON.stringify(loadedData));
      }
    } catch (e) {
      console.warn('Lỗi đọc sổ điểm từ Firestore (sử dụng cache nếu có):', e);
    }
  }

  // 3. Khởi tạo cấu trúc hoàn chỉnh nếu chưa có
  const txCountSemester1 = loadedData?.txCountSemester1 || 4;
  const txCountSemester2 = loadedData?.txCountSemester2 || 4;
  const grades: Record<string, StudentSubjectGrade> = { ...(loadedData?.grades || {}) };

  // Đảm bảo mọi học sinh trong lớp đều có bản ghi điểm
  students.forEach((student) => {
    const existing = grades[student.id];
    if (!existing) {
      grades[student.id] = {
        studentId: student.id,
        studentCode: student.studentCode,
        fullName: student.fullName,
        semester1: {
          tx: Array(txCountSemester1).fill(null),
          gk: null,
          ck: null,
          average: null,
        },
        semester2: {
          tx: Array(txCountSemester2).fill(null),
          gk: null,
          ck: null,
          average: null,
        },
        yearAverage: null,
      };
    } else {
      // Cập nhật tên và mã nếu có thay đổi
      existing.studentCode = student.studentCode;
      existing.fullName = student.fullName;

      // Đảm bảo số cột TX đủ theo cấu hình
      while (existing.semester1.tx.length < txCountSemester1) {
        existing.semester1.tx.push(null);
      }
      while (existing.semester2.tx.length < txCountSemester2) {
        existing.semester2.tx.push(null);
      }

      // Tính lại ĐTB
      existing.semester1.average = calculateTermAverage(existing.semester1);
      existing.semester2.average = calculateTermAverage(existing.semester2);
      existing.yearAverage = calculateYearAverage(existing.semester1.average, existing.semester2.average);
      existing.rank = calculateSubjectRank(existing.yearAverage);
    }
  });

  return {
    classId,
    subjectName: loadedData?.subjectName || subjectName || 'Toán',
    schoolYear: loadedData?.schoolYear || schoolYear || '2026-2027',
    teacherName: loadedData?.teacherName || teacherName || 'Giáo viên',
    txCountSemester1,
    txCountSemester2,
    grades,
    updatedAt: loadedData?.updatedAt || new Date().toISOString(),
  };
}

export async function saveClassGradebook(
  data: ClassGradebookData,
  isLocalMode: boolean
): Promise<void> {
  const now = new Date().toISOString();
  const payload: ClassGradebookData = {
    ...data,
    updatedAt: now,
  };

  // 1. Lưu LocalStorage
  const storageKey = `${LOCAL_STORAGE_KEY_PREFIX}${data.classId}`;
  localStorage.setItem(storageKey, JSON.stringify(payload));

  // 2. Lưu Firestore nếu không ở chế độ thuần local
  if (!isLocalMode) {
    try {
      await setDoc(doc(db, 'subjectGradebooks', data.classId), payload);
    } catch (e) {
      console.error('Lỗi lưu sổ điểm lên Firestore:', e);
      throw new Error('Không thể đồng bộ điểm số lên máy chủ: ' + String(e));
    }
  }
}
