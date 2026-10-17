import type { ClassConfig } from '../types';

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
const normalizeYear = (value: string) => value.replace(/\s/g, '').replace(/[–—]/g, '-');
export const workspaceSubject = (config: ClassConfig) => config.subjectName || config.teachingSubject || 'Toán';

export function sameTeachingWorkspace(a: ClassConfig, b: ClassConfig): boolean {
  return a.teacherId === b.teacherId
    && normalize(a.className) === normalize(b.className)
    && normalizeYear(a.schoolYear) === normalizeYear(b.schoolYear)
    && (a.classType || 'homeroom') === (b.classType || 'homeroom')
    && (a.classType !== 'subject' || normalize(workspaceSubject(a)) === normalize(workspaceSubject(b)));
}

export function filterTeachingWorkspaces(configs: ClassConfig[], year: string, subject: string, search: string): ClassConfig[] {
  return configs.filter(config => config.classType === 'subject'
    && (!year || config.schoolYear === year)
    && (!subject || workspaceSubject(config) === subject)
    && normalize(`${config.className} ${workspaceSubject(config)}`).includes(normalize(search)))
    .sort((a, b) => a.className.localeCompare(b.className, 'vi', { numeric: true })
      || workspaceSubject(a).localeCompare(workspaceSubject(b), 'vi'));
}
