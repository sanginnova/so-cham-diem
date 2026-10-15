import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { HomeroomKind, HomeroomRecord } from '../types/homeroom';
import { homeroomAlerts } from '../lib/homeroom';
import { localDateString } from '../lib/logValidation';
type AssistantKind = Exclude<HomeroomKind, 'collection' | 'payment' | 'allowance'>;
const tabs: { id: AssistantKind | 'overview'; label: string }[] = [
  { id: 'overview', label: 'Việc cần chú ý' }, { id: 'profile', label: 'Hồ sơ mở rộng' }, { id: 'contact', label: 'Liên hệ phụ huynh' },
  { id: 'meeting', label: 'Sinh hoạt lớp' }, { id: 'task', label: 'Công việc' }, { id: 'support', label: 'Hỗ trợ học sinh' },
];
type Field = { key: string; label: string; type?: 'date' | 'textarea'; options?: string[] };
const fields: Record<AssistantKind, Field[]> = {
  profile: [{ key: 'address', label: 'Chỗ ở hiện tại' }, { key: 'hometown', label: 'Quê quán' }, { key: 'group', label: 'Tổ' }, { key: 'duty', label: 'Nhiệm vụ trong lớp' },
    { key: 'guardianName', label: 'Họ tên bố/mẹ hoặc người giám hộ chính' }, { key: 'relationship', label: 'Quan hệ', options: ['Bố', 'Mẹ', 'Người giám hộ', 'Ông/Bà', 'Khác'] }, { key: 'guardianPhone', label: 'Điện thoại người giám hộ chính' }, { key: 'parentOccupation', label: 'Nghề nghiệp bố/mẹ' },
    { key: 'secondGuardian', label: 'Người liên hệ thứ hai: Họ tên — Quan hệ — SĐT' }, { key: 'policy', label: 'Diện chính sách (nếu có)' }, { key: 'disabilityOrOrphan', label: 'Khuyết tật / mồ côi (nếu có)' }, { key: 'martyrFamily', label: 'Con thương binh / liệt sĩ (nếu có)' }, { key: 'note', label: 'Ghi chú cần thiết', type: 'textarea' }],
  contact: [{ key: 'channel', label: 'Kênh liên hệ', options: ['Điện thoại', 'Zalo', 'SMS', 'Gặp trực tiếp', 'Họp phụ huynh', 'Khác'] }, { key: 'guardian', label: 'Người trao đổi' }, { key: 'summary', label: 'Nội dung trao đổi', type: 'textarea' }, { key: 'result', label: 'Kết quả / Nội dung thống nhất', type: 'textarea' }, { key: 'followUpDate', label: 'Ngày hẹn theo dõi lại', type: 'date' }, { key: 'status', label: 'Trạng thái', options: ['Cần theo dõi', 'Đang xử lý', 'Đã hoàn thành'] }],
  meeting: [{ key: 'weekNumber', label: 'Tuần sinh hoạt' }, { key: 'attendance', label: 'Tình hình chuyên cần', type: 'textarea' }, { key: 'positivePoints', label: 'Học tập / Ưu điểm / Tuyên dương', type: 'textarea' }, { key: 'problems', label: 'Tồn tại cần khắc phục', type: 'textarea' }, { key: 'studentFeedback', label: 'Ý kiến học sinh', type: 'textarea' }, { key: 'teacherConclusion', label: 'Kết luận của GVCN', type: 'textarea' }, { key: 'tasksNextWeek', label: 'Nhiệm vụ tuần tới', type: 'textarea' }],
  task: [{ key: 'title', label: 'Tên công việc' }, { key: 'category', label: 'Nhóm việc', options: ['Lớp', 'Học sinh', 'Phụ huynh', 'Nhà trường', 'Báo cáo', 'Hồ sơ', 'Phong trào', 'Khác'] }, { key: 'priority', label: 'Ưu tiên', options: ['Bình thường', 'Quan trọng', 'Khẩn cấp'] }, { key: 'dueDate', label: 'Hạn hoàn thành', type: 'date' }, { key: 'description', label: 'Nội dung', type: 'textarea' }, { key: 'status', label: 'Trạng thái', options: ['Chưa làm', 'Đang làm', 'Đã hoàn thành'] }],
  support: [{ key: 'problem', label: 'Nội dung cần hỗ trợ', type: 'textarea' }, { key: 'goal', label: 'Mục tiêu', type: 'textarea' }, { key: 'actions', label: 'Các lần trao đổi / Biện pháp (ghi ngày từng lần)', type: 'textarea' }, { key: 'reviewDate', label: 'Ngày đánh giá lại', type: 'date' }, { key: 'parentInvolved', label: 'Phối hợp phụ huynh', options: ['Chưa phối hợp', 'Đã phối hợp'] }, { key: 'result', label: 'Kết quả / Tiến bộ', type: 'textarea' }, { key: 'status', label: 'Trạng thái', options: ['Đang theo dõi', 'Đang hỗ trợ', 'Đã cải thiện', 'Chưa cải thiện', 'Đã kết thúc'] }],
};
const inputClass = 'w-full border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100';
export function HomeroomAssistantView() {
  const { classConfig, students, userRole, homeroomRecords: records, homeroomLoading, homeroomError, saveHomeroomRecord, deleteHomeroomRecord, isLocalMode } = useApp();
  const [tab, setTab] = useState<AssistantKind | 'overview'>('overview');
  const [studentId, setStudentId] = useState('');
  const [id, setId] = useState<string>();
  const [date, setDate] = useState(localDateString());
  const [data, setData] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('');
  const alerts = useMemo(() => homeroomAlerts(records), [records]);
  const name = (sid: string) => students.find(s => s.id === sid)?.fullName || (sid ? 'Học sinh không còn trong danh sách' : 'Cả lớp');
  const reset = () => { setId(undefined); setStudentId(''); setDate(localDateString()); setData({}); setMessage(''); };
  const chooseTab = (next: typeof tab) => { setTab(next); reset(); };
  const edit = (r: HomeroomRecord) => { setTab(r.kind as AssistantKind); setId(r.id); setStudentId(r.studentId); setDate(r.date); setData(r.data); setMessage(''); };
  const chooseStudent = (sid: string) => {
    if (tab === 'profile') {
      const row = records.find(r => r.kind === 'profile' && r.studentId === sid);
      if (row) { edit(row); return; }
      setId(undefined); setData({});
    }
    setStudentId(sid);
  };
  if (!['teacher', 'admin', 'owner'].includes(userRole)) return <p>Chỉ giáo viên và quản trị viên được sử dụng hồ sơ GVCN.</p>;
  const rows = records.filter(r => r.kind === tab && (!filter || `${name(r.studentId)} ${Object.values(r.data).join(' ')}`.toLocaleLowerCase('vi').includes(filter.toLocaleLowerCase('vi')))).sort((a,b) => b.date.localeCompare(a.date));
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (tab === 'overview') return;
    setBusy(true); setMessage('');
    try { await saveHomeroomRecord({ id, kind: tab, studentId, date, data }); reset(); setMessage(isLocalMode ? 'Đã lưu trên thiết bị.' : 'Đã lưu lên đám mây.'); }
    catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async (r: HomeroomRecord) => {
    if (!window.confirm('Xóa hồ sơ này? Bạn nên tải bản sao lưu trước khi xóa.')) return;
    setBusy(true);
    try { await deleteHomeroomRecord(r.id); if (id === r.id) reset(); setMessage('Đã xóa hồ sơ.'); }
    catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  };
  return <section className="space-y-5 text-slate-800 dark:text-slate-100">
    <div><h2 className="text-2xl font-bold">Trợ lý giáo viên chủ nhiệm</h2><p className="text-sm text-slate-500 mt-1">{classConfig.className} · {classConfig.schoolYear} · Hồ sơ riêng của giáo viên, lấy dữ liệu cho Sổ chủ nhiệm Word.</p></div>
    <div className="flex gap-2 flex-wrap">{tabs.map(t => <button key={t.id} disabled={busy} onClick={() => chooseTab(t.id)} className={`px-3 py-2 rounded-lg text-sm font-semibold ${tab === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{t.label}{t.id === 'overview' && alerts.length ? ` (${alerts.length})` : ''}</button>)}</div>
    {homeroomLoading && <p role="status">Đang tải hồ sơ lớp…</p>}
    {homeroomError && <p role="alert" className="p-3 rounded bg-red-50 text-red-700">{homeroomError}</p>}
    {message && <p role="status" className="p-3 bg-indigo-50 text-indigo-900 rounded">{message}</p>}
    {tab === 'overview' ? <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Liên hệ phụ huynh', 'contact'], ['Sinh hoạt lớp', 'meeting'], ['Công việc', 'task'], ['Hỗ trợ học sinh', 'support']].map(([label,kind]) => <div key={kind} className="rounded-xl border p-4"><p className="text-sm">{label}</p><p className="text-2xl font-bold">{records.filter(r => r.kind === kind).length}</p></div>)}</div>
      <h3 className="font-bold">Đến hạn và quá hạn</h3><p className="text-sm text-slate-500">Theo dõi khi mở ứng dụng; chưa gửi thông báo nền hoặc tự liên hệ phụ huynh.</p>
      {!alerts.length && !homeroomLoading && !homeroomError && <p>Không có việc đến hạn từ các hồ sơ đã nhập.</p>}
      {alerts.map(a => <button key={a.id} onClick={() => edit(a.record)} className="block w-full text-left border rounded-lg p-3"><span className={a.overdue ? 'text-red-600 font-semibold' : 'font-semibold'}>{a.overdue ? 'Quá hạn' : 'Hôm nay'} · {a.due}</span><p>{name(a.record.studentId)} — {a.title}</p></button>)}
      <button onClick={() => window.dispatchEvent(new CustomEvent('open-homeroom-book-modal'))} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Xuất Sổ chủ nhiệm Word</button>
    </div> : <div className="grid xl:grid-cols-2 gap-5 items-start">
      <form onSubmit={save} className="rounded-xl border p-4 space-y-3">
        <h3 className="font-bold">{id ? 'Sửa hồ sơ' : 'Thêm hồ sơ'}</h3>
        {tab !== 'meeting' && <label className="block text-sm">Học sinh<select value={studentId} disabled={!!id || busy} onChange={e => chooseStudent(e.target.value)} required={tab !== 'task'} className={inputClass}><option value="">{tab === 'task' ? 'Công việc cả lớp' : 'Chọn học sinh'}</option>{students.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select></label>}
        <label className="block text-sm">Ngày ghi nhận<input type="date" value={date} onChange={e => setDate(e.target.value)} required className={inputClass} /></label>
        {fields[tab].map(f => {
          const options = f.key === 'weekNumber' ? classConfig.weeks.map(w => String(w.weekNumber)) : f.options;
          return <label key={f.key} className="block text-sm">{f.label}
            {options ? <select className={inputClass} value={data[f.key] || ''} onChange={e => setData(v => ({ ...v, [f.key]: e.target.value }))}><option value="">Chọn…</option>{options.map(o => <option key={o}>{o}</option>)}</select>
              : f.type === 'textarea' ? <textarea rows={3} maxLength={10000} className={inputClass} value={data[f.key] || ''} onChange={e => setData(v => ({ ...v, [f.key]: e.target.value }))} />
                : <input type={f.type || 'text'} maxLength={10000} className={inputClass} value={data[f.key] || ''} onChange={e => setData(v => ({ ...v, [f.key]: e.target.value }))} />}
          </label>;
        })}
        <div className="flex gap-2"><button disabled={busy || homeroomLoading || !!homeroomError} className="bg-indigo-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">{busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button><button type="button" disabled={busy} onClick={reset} className="border rounded-lg px-4 py-2">Nhập mới</button></div>
      </form>
      <div className="space-y-3"><label className="block text-sm">Tìm hồ sơ<input className={inputClass} value={filter} onChange={e => setFilter(e.target.value)} placeholder="Tên học sinh hoặc nội dung" /></label>
        {!rows.length && !homeroomLoading && !homeroomError && <p>Chưa có hồ sơ phù hợp.</p>}
        {rows.map(r => <article key={r.id} className="border rounded-xl p-4 space-y-2"><div className="font-bold">{name(r.studentId)} · {r.date}</div>
          {fields[r.kind as AssistantKind].filter(f => r.data[f.key]).map(f => <p key={f.key} className="text-sm whitespace-pre-wrap break-words"><strong>{f.label}: </strong>{r.data[f.key]}</p>)}
          <div className="flex gap-3 text-sm"><button disabled={busy} onClick={() => edit(r)} className="text-indigo-600">Chỉnh sửa</button><button disabled={busy} onClick={() => remove(r)} className="text-red-600">Xóa</button></div>
        </article>)}
      </div>
    </div>}
  </section>;
}
