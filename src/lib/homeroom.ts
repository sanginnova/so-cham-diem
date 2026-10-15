import type { ClassConfig, Student } from '../types';
import type { HomeroomInput, HomeroomRecord } from '../types/homeroom';
import { localDateString } from './logValidation';
export function validateHomeroom(input: HomeroomInput, students: Student[], config: ClassConfig) {
  if (!['profile', 'contact', 'meeting', 'task', 'support', 'collection', 'payment', 'allowance'].includes(input.kind)) throw new Error('Loại hồ sơ không hợp lệ.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || localDateString(new Date(`${input.date}T12:00:00`)) !== input.date) throw new Error('Ngày không hợp lệ.');
  if (input.studentId && !students.some(s => s.id === input.studentId && s.classId === config.id)) throw new Error('Học sinh không thuộc lớp đang chọn.');
  if (['profile', 'contact', 'support', 'payment', 'allowance'].includes(input.kind) && !input.studentId) throw new Error('Vui lòng chọn học sinh.');
  if (!input.data || Object.keys(input.data).length > 30 || Object.values(input.data).some(v => typeof v !== 'string' || v.length > 10000)) throw new Error('Nội dung quá dài hoặc sai định dạng.');
  if (input.kind === 'meeting' && !config.weeks.some(w => String(w.weekNumber) === input.data.weekNumber)) throw new Error('Tuần sinh hoạt không thuộc lịch lớp.');
  if (input.kind === 'contact' && !input.data.summary?.trim()) throw new Error('Vui lòng nhập nội dung trao đổi.');
  if (input.kind === 'task' && !input.data.title?.trim()) throw new Error('Vui lòng nhập tên công việc.');
  if (input.kind === 'support' && !input.data.problem?.trim()) throw new Error('Vui lòng nhập nội dung cần hỗ trợ.');
  for (const field of ['followUpDate', 'dueDate', 'reviewDate']) {
    const v = input.data[field];
    if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || localDateString(new Date(`${v}T12:00:00`)) !== v)) throw new Error('Ngày hẹn / hạn xử lý không hợp lệ.');
  }
}
export function homeroomAlerts(records: HomeroomRecord[], today = localDateString()) {
  return records.flatMap(r => {
    const due = r.kind === 'contact' ? r.data.followUpDate : r.kind === 'task' ? r.data.dueDate : r.kind === 'support' ? r.data.reviewDate : '';
    if (!due || due > today || ['Đã hoàn thành', 'Đã kết thúc'].includes(r.data.status)) return [];
    return [{ id: r.id, title: r.data.title || r.data.summary || r.data.problem, due, overdue: due < today, record: r }];
  }).sort((a, b) => a.due.localeCompare(b.due));
}
export function homeroomWordNotes(records: HomeroomRecord[], students: Student[], config: ClassConfig, months: number[]) {
  const name = (id: string) => students.find(s => s.id === id)?.fullName || 'Học sinh đã ngừng theo dõi';
  const inPeriod = (r: HomeroomRecord) => months.includes(Number(r.date.slice(5, 7))) && config.weeks.some(w => r.date >= w.startDate && r.date <= w.endDate);
  const contacts = records.filter(r => r.kind === 'contact' && inPeriod(r)).map(r => `${r.date} — ${name(r.studentId)} — ${r.data.channel || ''}: ${r.data.summary || ''}\nKết quả: ${r.data.result || ''}${r.data.followUpDate ? `; Hẹn theo dõi: ${r.data.followUpDate}` : ''}`).join('\n\n');
  const support = records.filter(r => r.kind === 'support' && inPeriod(r)).map(r => `${name(r.studentId)} — ${r.data.problem || ''}\nMục tiêu: ${r.data.goal || ''}\nBiện pháp: ${r.data.actions || ''}\nKết quả: ${r.data.result || ''}`).join('\n\n');
  const weeklyLearning: Record<number, string> = {}, weeklyComments: Record<number, string> = {};
  for (const w of config.weeks.filter(w => months.includes(w.month))) {
    const meetings = records.filter(r => r.kind === 'meeting' && r.data.weekNumber === String(w.weekNumber)).sort((a,b) => a.date.localeCompare(b.date));
    if (!meetings.length) continue;
    weeklyLearning[w.weekNumber] = meetings.map(r => r.data.positivePoints || '').filter(Boolean).join('\n');
    weeklyComments[w.weekNumber] = meetings.map(r => [`Ngày sinh hoạt: ${r.date}`, `Chuyên cần: ${r.data.attendance || ''}`, `Tồn tại: ${r.data.problems || ''}`, `Ý kiến học sinh: ${r.data.studentFeedback || ''}`, `Kết luận GVCN: ${r.data.teacherConclusion || ''}`, `Nhiệm vụ tuần tới: ${r.data.tasksNextWeek || ''}`].join('\n')).join('\n\n');
  }
  return { parentCooperation: contacts, studentFollowUp: support, weeklyLearning, weeklyComments };
}
