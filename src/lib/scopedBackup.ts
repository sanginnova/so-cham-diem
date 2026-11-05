import type { HomeroomRecord } from '../types/homeroom';
import type { Student, DisciplineLog, BehaviorCategory, ClassConfig } from '../types';

// Imported document IDs belong to the recipient UID; references stay consistent.
export function scopeBackup(data: { students: Student[]; disciplineLogs: DisciplineLog[]; behaviorCategories?: BehaviorCategory[]; classConfig?: ClassConfig; homeroomRecords?: HomeroomRecord[] }, teacherId: string, actorId: string, currentConfig: ClassConfig) {
  const prefix = currentConfig.scopeVersion === 2 ? `${teacherId}__${currentConfig.id}__` : `${teacherId}__`;
  
  // Extract pure ID without old prefixes to prevent infinite nesting
  const cleanBaseId = (id: string) => {
    if (!id) return '';
    const parts = id.split('__');
    return parts[parts.length - 1];
  };

  const ownedId = (id: string) => {
    if (!id) return '';
    const base = cleanBaseId(id);
    return `${prefix}${base}`;
  };

  const classId = currentConfig.id || `cfg_${teacherId}`;
  const students = data.students.map((student) => ({ ...student, id: ownedId(student.id), teacherId, classId }));
  const studentIds = new Set(students.map((student) => student.id));
  
  // Map studentCode to newly scoped student.id for robust fallback
  const studentByCode = new Map(students.filter(s => s.studentCode).map(s => [s.studentCode.trim().toUpperCase(), s.id]));

  const disciplineLogs = data.disciplineLogs.map((log) => {
    let studentId = ownedId(log.studentId);
    if (!studentIds.has(studentId) && log.studentCode) {
      const matched = studentByCode.get(log.studentCode.trim().toUpperCase());
      if (matched) studentId = matched;
    }
    if (studentId && !studentIds.has(studentId)) {
      throw new Error('Dữ liệu nhật ký có học sinh không có trong danh sách học sinh.');
    }
    return { ...log, id: ownedId(log.id), studentId, teacherId, classId, createdBy: actorId };
  });

  const collectionIds = new Set((data.homeroomRecords || []).filter(r => r.kind === 'collection').map(r => ownedId(r.id)));

  return {
    students, disciplineLogs,
    homeroomRecords: (data.homeroomRecords || []).map(record => {
      let studentId = record.studentId ? (record.studentId === '__seating_chart__' ? '__seating_chart__' : ownedId(record.studentId)) : '';
      if (studentId && studentId !== '__seating_chart__' && !studentIds.has(studentId)) {
        throw new Error('Dữ liệu hồ sơ có học sinh không có trong danh sách học sinh.');
      }
      const recordData = { ...record.data };
      if (record.kind === 'collection') {
        const members: string[] = JSON.parse(recordData.studentIds || '[]');
        recordData.studentIds = JSON.stringify(members.map(ownedId));
        const names: Record<string, string> = JSON.parse(recordData.studentNames || '{}');
        recordData.studentNames = JSON.stringify(Object.fromEntries(Object.entries(names).map(([id, name]) => [ownedId(id), name])));
      }
      if (['payment', 'allowance'].includes(record.kind)) {
        if (recordData.collectionId) {
          const mappedColId = ownedId(recordData.collectionId);
          if (!collectionIds.has(mappedColId)) {
            throw new Error('Khoản thu liên kết không có trong dữ liệu.');
          }
          recordData.collectionId = mappedColId;
        }
      }
      return { ...record, data: recordData, id: ownedId(record.id), studentId, teacherId, classId, createdBy: actorId };
    }),
    behaviorCategories: (data.behaviorCategories || []).map((category) => ({ ...category, id: ownedId(category.id), teacherId, classId })),
    classConfig: { ...currentConfig, ...data.classConfig, rosterSourceClassId: currentConfig.rosterSourceClassId || '', id: classId, teacherId, scopeVersion: currentConfig.scopeVersion, classDirectoryId: currentConfig.classDirectoryId, schoolYear: currentConfig.schoolYear },
  };
}
