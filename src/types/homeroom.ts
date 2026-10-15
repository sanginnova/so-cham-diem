export type HomeroomKind = 'profile' | 'contact' | 'meeting' | 'task' | 'support' | 'collection' | 'payment' | 'allowance';
export interface HomeroomRecord {
  id: string;
  teacherId: string;
  classId: string;
  kind: HomeroomKind;
  studentId: string;
  date: string;
  data: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
export type HomeroomInput = Pick<HomeroomRecord, 'kind' | 'studentId' | 'date' | 'data'> & { id?: string };
