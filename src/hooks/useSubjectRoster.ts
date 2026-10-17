import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { rosterCandidates } from '../lib/teachingWorkspaces';
import type { ClassConfig, Student } from '../types';

export function useSubjectRoster(config: ClassConfig, configs: ClassConfig[], ownStudents: Student[]) {
  const [state, setState] = useState<{ sourceId: string; students: Student[]; ready: boolean; error: string }>({ sourceId: '', students: [], ready: false, error: '' });
  const sourceId = config.rosterSourceClassId || '';
  const source = rosterCandidates(configs, config).find(item => item.id === sourceId);
  useEffect(() => {
    if (!sourceId) return;
    setState({ sourceId, students: [], ready: false, error: '' });
    if (!source) {
      setState({ sourceId, students: [], ready: false, error: 'Không tìm thấy lớp nguồn hợp lệ. Hãy kiểm tra lớp và năm học; điểm cũ vẫn được giữ.' });
      return;
    }
    return onSnapshot(query(collection(db, 'students'), where('teacherId', '==', config.teacherId), where('classId', '==', sourceId)), snapshot => {
      setState({ sourceId, students: snapshot.docs.map(item => item.data() as Student), ready: true, error: '' });
    }, error => setState({ sourceId, students: [], ready: false, error: `Không tải được danh sách lớp nguồn: ${error.message}` }));
  }, [sourceId, source?.id, config.teacherId]);
  if (!sourceId) return { students: ownStudents, ready: true, error: '' };
  return state.sourceId === sourceId ? state : { students: [], ready: false, error: '' };
}
