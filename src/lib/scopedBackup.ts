import type { HomeroomRecord } from '../types/homeroom';
import type { Student, DisciplineLog, BehaviorCategory, ClassConfig } from '../types';

// Imported document IDs belong to the recipient UID; references stay consistent.
export function scopeBackup(data: { students: Student[]; disciplineLogs: DisciplineLog[]; behaviorCategories?: BehaviorCategory[]; classConfig?: ClassConfig; homeroomRecords?: HomeroomRecord[] }, teacherId: string, actorId: string, currentConfig: ClassConfig) {
  const prefix = currentConfig.scopeVersion === 2 ? `${teacherId}__${currentConfig.id}__` : `${teacherId}__`;
  const ownedId = (id: string) => id.startsWith(prefix) ? id : `${prefix}${id}`;
  const classId = currentConfig.id || `cfg_${teacherId}`;
  const students = data.students.map((student) => ({ ...student, id: ownedId(student.id), teacherId, classId }));
  const studentIds = new Set(students.map((student) => student.id));
  const disciplineLogs = data.disciplineLogs.map((log) => {
    const studentId = ownedId(log.studentId);
    if (!studentIds.has(studentId)) throw new Error('Nhật ký tham chiếu học sinh không có trong bản sao lưu.');
    return { ...log, id: ownedId(log.id), studentId, teacherId, classId, createdBy: actorId };
  });
  return {
    students, disciplineLogs,
    homeroomRecords: (data.homeroomRecords || []).map(record => {
      const studentId = record.studentId ? ownedId(record.studentId) : '';
      if (studentId && !studentIds.has(studentId)) throw new Error('Hồ sơ GVCN tham chiếu học sinh không có trong bản sao lưu.');
      const recordData = { ...record.data };
      if (record.kind === 'collection') {
        const members: string[] = JSON.parse(recordData.studentIds || '[]');
        recordData.studentIds = JSON.stringify(members.map(ownedId));
        const names: Record<string, string> = JSON.parse(recordData.studentNames || '{}');
        recordData.studentNames = JSON.stringify(Object.fromEntries(Object.entries(names).map(([id, name]) => [ownedId(id), name])));
      }
      if (['payment', 'allowance'].includes(record.kind)) {
        if (!(data.homeroomRecords || []).some(r => r.id === recordData.collectionId && r.kind === 'collection')) throw new Error('Phiếu thu tham chiếu khoản thu không có trong bản sao lưu.');
        recordData.collectionId = ownedId(recordData.collectionId);
      }
      return { ...record, data: recordData, id: ownedId(record.id), studentId, teacherId, classId, createdBy: actorId };
    }),
    behaviorCategories: (data.behaviorCategories || []).map((category) => ({ ...category, id: ownedId(category.id), teacherId, classId })),
    classConfig: { ...currentConfig, ...data.classConfig, rosterSourceClassId: currentConfig.rosterSourceClassId || '', id: classId, teacherId, scopeVersion: currentConfig.scopeVersion, classDirectoryId: currentConfig.classDirectoryId, schoolYear: currentConfig.schoolYear },
  };
}
