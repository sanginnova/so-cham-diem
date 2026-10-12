import type { Student, DisciplineLog, BehaviorCategory, ClassConfig } from '../types';

// Imported document IDs belong to the recipient UID; references stay consistent.
export function scopeBackup(data: { students: Student[]; disciplineLogs: DisciplineLog[]; behaviorCategories?: BehaviorCategory[]; classConfig?: ClassConfig }, teacherId: string, actorId: string, currentConfig: ClassConfig) {
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
    behaviorCategories: (data.behaviorCategories || []).map((category) => ({ ...category, id: ownedId(category.id), teacherId, classId })),
    classConfig: { ...currentConfig, ...data.classConfig, id: classId, teacherId, scopeVersion: currentConfig.scopeVersion, classDirectoryId: currentConfig.classDirectoryId, schoolYear: currentConfig.schoolYear },
  };
}
