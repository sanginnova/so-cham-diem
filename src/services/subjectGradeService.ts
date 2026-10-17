import { doc, getDocFromServer, runTransaction } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Student } from '../types';
import {
  ClassGradebookData,
  StudentSubjectGrade,
  calculateTermAverage,
  calculateYearAverage,
  calculateSubjectRank,
} from '../types/subjectGrade';

function cacheKey(classId: string, local: boolean): string {
  const uid = auth.currentUser?.uid;
  if (!local && !uid) throw new Error('Vui lòng đăng nhập lại để mở sổ điểm.');
  return `subject_gradebook_v2_${local ? 'local' : uid}_${classId}`;
}

export function stageGradebookDraft(data: ClassGradebookData, local: boolean): void {
  localStorage.setItem(cacheKey(data.classId, local), JSON.stringify({ ...data, pendingSync: true }));
}

export function discardGradebookDraft(classId: string, local: boolean): void {
  localStorage.removeItem(cacheKey(classId, local));
}

export async function loadClassGradebook(
  classId: string,
  subjectName: string,
  schoolYear: string,
  teacherName: string,
  students: Student[],
  isLocalMode: boolean,
  teacherId: string
): Promise<ClassGradebookData> {
  let loadedData: Partial<ClassGradebookData> | null = null;
  const storageKey = cacheKey(classId, isLocalMode);

  // 1. Tải từ cache cục bộ trước
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const cached = JSON.parse(raw) as ClassGradebookData;
      if (cached.classId === classId && cached.teacherId === teacherId) loadedData = cached;
    }
  } catch (e) {
    console.warn('Lỗi đọc sổ điểm từ localStorage:', e);
  }
  if (isLocalMode && !loadedData) {
    try {
      const raw = localStorage.getItem(`subject_gradebook_${classId}`);
      const legacy = raw ? JSON.parse(raw) as ClassGradebookData : null;
      if (legacy?.classId === classId && legacy.subjectName === subjectName && legacy.schoolYear === schoolYear) {
        loadedData = { ...legacy, teacherId, revision: 0, pendingSync: true };
      }
    } catch { /* Preserve unreadable legacy cache. */ }
  }

  // 2. Nếu ở chế độ đám mây, đồng bộ từ Firestore
  if (!isLocalMode) {
    const snap = await getDocFromServer(doc(db, 'subjectGradebooks', classId));
    const remote = snap.exists() ? snap.data() as ClassGradebookData : null;
    // Legacy caches had no account key. Only recover after server authorization,
    // for the owner and when no cloud gradebook exists; keep the original intact.
    if (!remote && !loadedData && auth.currentUser?.uid === teacherId) {
      try {
        const raw = localStorage.getItem(`subject_gradebook_${classId}`);
        const legacy = raw ? JSON.parse(raw) as ClassGradebookData : null;
        if (legacy?.classId === classId && legacy.subjectName === subjectName && legacy.schoolYear === schoolYear) {
          loadedData = { ...legacy, teacherId, revision: 0, pendingSync: true };
          localStorage.setItem(storageKey, JSON.stringify(loadedData));
        }
      } catch { /* Leave the original cache untouched if it cannot be recovered. */ }
    }
    // Keep an unsent draft; its original revision is checked by the save transaction.
    if (!loadedData?.pendingSync) loadedData = remote;
    if (loadedData && !loadedData.pendingSync) localStorage.setItem(storageKey, JSON.stringify(loadedData));
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
    teacherId,
    revision: loadedData?.revision || 0,
    pendingSync: loadedData?.pendingSync || false,
    classId,
    subjectName: loadedData?.subjectName || subjectName || 'Toán',
    schoolYear: loadedData?.schoolYear || schoolYear || '2026-2027',
    teacherName: loadedData?.teacherName || teacherName || 'Giáo viên',
    txCountSemester1,
    txCountSemester2,
    ...(loadedData?.txLabelsSemester1 ? { txLabelsSemester1: loadedData.txLabelsSemester1 } : {}),
    ...(loadedData?.txLabelsSemester2 ? { txLabelsSemester2: loadedData.txLabelsSemester2 } : {}),
    grades,
    updatedAt: loadedData?.updatedAt || new Date().toISOString(),
  };
}

export async function saveClassGradebook(
  data: ClassGradebookData,
  isLocalMode: boolean
): Promise<ClassGradebookData> {
  const now = new Date().toISOString();
  const payload: ClassGradebookData = {
    ...data,
    updatedAt: now,
    pendingSync: false,
  };

  // 1. Lưu LocalStorage
  const storageKey = cacheKey(data.classId, isLocalMode);
  stageGradebookDraft(data, isLocalMode);

  // 2. Lưu Firestore nếu không ở chế độ thuần local
  if (!isLocalMode) {
    try {
      await runTransaction(db, async transaction => {
        const reference = doc(db, 'subjectGradebooks', data.classId);
        const current = await transaction.get(reference);
        if ((current.data()?.revision || 0) !== (data.revision || 0)) {
          throw new Error('Sổ điểm đã thay đổi trên thiết bị khác. Xuất Excel để giữ bản đang sửa, rồi tải lại bản máy chủ.');
        }
        payload.revision = (data.revision || 0) + 1;
        transaction.set(reference, payload);
      });
    } catch (e) {
      console.error('Lỗi lưu sổ điểm lên Firestore:', e);
      throw new Error('Không thể đồng bộ điểm số lên máy chủ: ' + String(e));
    }
  }
  localStorage.setItem(storageKey, JSON.stringify(payload));
  return payload;
}
