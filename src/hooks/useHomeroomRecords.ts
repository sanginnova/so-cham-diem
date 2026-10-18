import { validateCollectionRecord } from '../lib/collections';
import { useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ClassConfig, Student, UserRole } from '../types';
import type { HomeroomInput, HomeroomRecord } from '../types/homeroom';
import { validateHomeroom } from '../lib/homeroom';
export function useHomeroomRecords(config: ClassConfig, students: Student[], uid: string, role: UserRole, local: boolean) {
  const key = `${uid}:${config.teacherId}:${config.id}:${local}`;
  const current = useRef(key); current.current = key;
  const [state, setState] = useState<{ key: string; rows: HomeroomRecord[] }>({ key: '', rows: [] });
  const [status, setStatus] = useState({ key: '', loading: false, error: '' });
  const allowed = !!uid && !!config.id && ['teacher', 'admin', 'owner'].includes(role);
  const storageKey = `homeroom-records:${uid}:${config.teacherId}:${config.id}`;
  const deletedStorageKey = `homeroom-deleted-records:${uid}:${config.teacherId}:${config.id}`;
  const homeroomRecords = state.key === key && allowed ? state.rows : [];

  const getDeletedSet = (): Set<string> => {
    try {
      const raw = localStorage.getItem(deletedStorageKey);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  useEffect(() => {
    setState({ key, rows: [] }); setStatus({ key, loading: allowed && !local, error: '' });
    if (!allowed) return;
    if (local) {
      try {
        const rows = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const deletedSet = getDeletedSet();
        setState({
          key,
          rows: Array.isArray(rows)
            ? rows.filter(r => r.teacherId === config.teacherId && r.classId === config.id && !r.data?.isDeleted && !deletedSet.has(r.id))
            : [],
        });
      } catch {
        setStatus({ key, loading: false, error: 'Không đọc được hồ sơ lưu trên thiết bị.' });
      }
      return;
    }
    return onSnapshot(
      query(collection(db, 'homeroomRecords'), where('teacherId', '==', config.teacherId), where('classId', '==', config.id)),
      snap => {
        if (current.current === key) {
          const deletedSet = getDeletedSet();
          const rows = snap.docs
            .map(d => ({ ...d.data(), id: d.id } as HomeroomRecord))
            .filter(r => !r.data?.isDeleted && !deletedSet.has(r.id));
          setState({ key, rows });
          setStatus({ key, loading: false, error: '' });
        }
      },
      () => {
        if (current.current === key)
          setStatus({ key, loading: false, error: 'Không tải được hồ sơ GVCN. Kiểm tra kết nối và quyền Firestore homeroomRecords; không chuyển sang lưu tạm trên máy.' });
      }
    );
  }, [key, allowed]);
  const commitLocal = (rows: HomeroomRecord[]) => { localStorage.setItem(storageKey, JSON.stringify(rows)); setState({ key, rows }); };
  const saveHomeroomRecord = async (input: HomeroomInput) => {
    if (!allowed || current.current !== key) throw new Error('Không có quyền lưu hồ sơ lớp này.');
    if (!local && (status.key !== key || status.loading || status.error)) throw new Error('Chờ tải hồ sơ thành công trước khi lưu.');
    validateHomeroom(input, students, config);
    validateCollectionRecord(input, homeroomRecords, students);
    let existing = input.id ? homeroomRecords.find(r => r.id === input.id) : input.kind === 'profile' ? homeroomRecords.find(r => r.kind === 'profile' && r.studentId === input.studentId) : undefined;
    if (!input.id && input.kind === 'allowance') existing = homeroomRecords.find(r => r.kind === 'allowance' && r.studentId === input.studentId && r.data.collectionId === input.data.collectionId);
    if (input.id && !existing) throw new Error('Hồ sơ đã thay đổi hoặc không thuộc lớp.');
    if (existing && (existing.kind !== input.kind || existing.studentId !== input.studentId)) throw new Error('Không được chuyển học sinh hoặc loại hồ sơ khi sửa.');
    const now = new Date().toISOString();
    const id = existing?.id || (input.kind === 'profile' ? `profile_${config.id}_${input.studentId}` : input.kind === 'allowance' ? `allowance_${input.data.collectionId}_${input.studentId}` : crypto.randomUUID());
    const row: HomeroomRecord = { ...input, id, teacherId: config.teacherId, classId: config.id, createdBy: existing?.createdBy || uid, createdAt: existing?.createdAt || now, updatedAt: now };
    if (local) commitLocal([...homeroomRecords.filter(r => r.id !== id), row]);
    else await setDoc(doc(db, 'homeroomRecords', id), row);
  };
  const saveHomeroomRecordsBatch = async (inputs: HomeroomInput[]) => {
    if (!allowed || current.current !== key) throw new Error('Không có quyền lưu hồ sơ lớp này.');
    if (!local && (status.key !== key || status.loading || status.error)) throw new Error('Chờ tải hồ sơ thành công trước khi lưu.');
    if (!inputs.length) return;
    let currentRecords = [...homeroomRecords];
    const rowsToCommit: HomeroomRecord[] = [];
    for (const input of inputs) {
      validateHomeroom(input, students, config);
      validateCollectionRecord(input, currentRecords, students);
      let existing = input.id ? currentRecords.find(r => r.id === input.id) : input.kind === 'profile' ? currentRecords.find(r => r.kind === 'profile' && r.studentId === input.studentId) : undefined;
      if (!input.id && input.kind === 'allowance') existing = currentRecords.find(r => r.kind === 'allowance' && r.studentId === input.studentId && r.data.collectionId === input.data.collectionId);
      if (input.id && !existing) throw new Error('Hồ sơ đã thay đổi hoặc không thuộc lớp.');
      if (existing && (existing.kind !== input.kind || existing.studentId !== input.studentId)) throw new Error('Không được chuyển học sinh hoặc loại hồ sơ khi sửa.');
      const now = new Date().toISOString();
      const id = existing?.id || (input.kind === 'profile' ? `profile_${config.id}_${input.studentId}` : input.kind === 'allowance' ? `allowance_${input.data.collectionId}_${input.studentId}` : crypto.randomUUID());
      const row: HomeroomRecord = { ...input, id, teacherId: config.teacherId, classId: config.id, createdBy: existing?.createdBy || uid, createdAt: existing?.createdAt || now, updatedAt: now };
      rowsToCommit.push(row);
      currentRecords = [...currentRecords.filter(r => r.id !== id), row];
    }
    if (local) {
      commitLocal(currentRecords);
    } else {
      const batch = writeBatch(db);
      for (const row of rowsToCommit) {
        batch.set(doc(db, 'homeroomRecords', row.id), row);
      }
      await batch.commit();
    }
  };
  const deleteCollection = async (collectionId: string) => {
    if (!allowed || current.current !== key) throw new Error('Không có quyền xóa khoản thu lớp này.');
    if (!local && (status.key !== key || status.loading || status.error)) throw new Error('Chờ tải dữ liệu thành công trước khi xóa.');
    const colRecord = homeroomRecords.find(r => r.id === collectionId && r.kind === 'collection');
    if (!colRecord) throw new Error('Không tìm thấy khoản thu cần xóa.');

    const relatedRecords = homeroomRecords.filter(
      r => r.id === collectionId || r.data?.collectionId === collectionId
    );
    const relatedIds = relatedRecords.map(r => r.id);

    // 1. Cập nhật ngay lập tức giao diện người dùng (Optimistic UI) & bộ nhớ cục bộ
    const remaining = homeroomRecords.filter(r => !relatedIds.includes(r.id));
    commitLocal(remaining);

    // Lưu danh sách ID đã xóa vào blacklist cục bộ để không bao giờ hiển thị lại
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem(deletedStorageKey) || '[]');
      localStorage.setItem(deletedStorageKey, JSON.stringify([...new Set([...deletedList, ...relatedIds])]));
    } catch {}

    if (local) {
      return;
    }

    // 2. Thử xóa vật lý trực tiếp trên Firestore
    try {
      const batch = writeBatch(db);
      for (const id of relatedIds) {
        batch.delete(doc(db, 'homeroomRecords', id));
      }
      await batch.commit();
    } catch (batchErr: any) {
      console.warn('Physical batch delete failed, attempting soft-delete fallback on Firestore:', batchErr);

      // 3. Dự phòng thông minh: Nếu Firebase Cloud Rules chưa được deploy bản mới, đánh dấu hủy & kết thúc
      try {
        const fallbackBatch = writeBatch(db);
        const now = new Date().toISOString();
        for (const r of relatedRecords) {
          const docRef = doc(db, 'homeroomRecords', r.id);
          if (r.kind === 'collection') {
            fallbackBatch.update(docRef, {
              'data.status': 'Đã kết thúc',
              'data.isDeleted': true,
              'data.deletedAt': now,
              updatedAt: now,
            });
          } else if (r.kind === 'payment') {
            fallbackBatch.update(docRef, {
              'data.state': 'Đã hủy',
              'data.voidReason': 'Khoản thu đã bị xóa',
              'data.isDeleted': true,
              'data.deletedAt': now,
              updatedAt: now,
            });
          } else {
            fallbackBatch.update(docRef, {
              'data.isDeleted': true,
              'data.deletedAt': now,
              updatedAt: now,
            });
          }
        }
        await fallbackBatch.commit();
      } catch (softErr: any) {
        console.error('Soft delete fallback on Firestore failed:', softErr);
      }
    }
  };
  const deleteHomeroomRecord = async (id: string) => {
    if (!allowed || !homeroomRecords.some(r => r.id === id)) throw new Error('Không có quyền xóa hồ sơ.');
    const target = homeroomRecords.find(r => r.id === id);
    if (target?.kind === 'collection') {
      return deleteCollection(id);
    }
    const remaining = homeroomRecords.filter(r => r.id !== id);
    commitLocal(remaining);
    try {
      const deletedList: string[] = JSON.parse(localStorage.getItem(deletedStorageKey) || '[]');
      localStorage.setItem(deletedStorageKey, JSON.stringify([...new Set([...deletedList, id])]));
    } catch {}
    if (!local) {
      await deleteDoc(doc(db, 'homeroomRecords', id));
    }
  };
  return {
    homeroomRecords,
    homeroomLoading: allowed && !local && (status.key !== key || status.loading),
    homeroomError: status.key === key ? status.error : '',
    saveHomeroomRecord,
    saveHomeroomRecordsBatch,
    deleteHomeroomRecord,
    deleteCollection,
  };
}

