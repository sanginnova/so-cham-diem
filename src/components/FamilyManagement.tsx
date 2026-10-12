import React, { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, setDoc, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useApp } from '../context/AppContext';
import { StudentPointEditor } from './StudentPointEditor';
import { localDateString } from '../lib/logValidation';

export function FamilyManagement() {
  const { students, classConfig, disciplineLogs, userRole, getWeeklySummary, getMonthlySummary, restoreDisciplineLog, isPeriodLocked } = useApp();
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [email, setEmail] = useState('');
  const [days, setDays] = useState(14);
  const [shares, setShares] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [trash, setTrash] = useState<any[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<any>(null);
  const canManage = userRole === 'teacher' || userRole === 'admin' || userRole === 'owner';
  useEffect(() => {
    if (!canManage) return;
    const listen = (name: string, set: (rows: any[]) => void) => onSnapshot(query(collection(db, name), where('teacherId', '==', classConfig.teacherId), where('classId', '==', classConfig.id)), snap => set(snap.docs.map(d => ({ ...d.data(), id: d.id }))), e => setError(e.message));
    return (() => { const stops = [listen('familyReports', setShares), listen('correctionRequests', setRequests), listen('disciplineTrash', setTrash)]; return () => stops.forEach(stop => stop()); })();
  }, [classConfig.id, classConfig.teacherId, canManage]);
  if (!canManage) return null;
  const act = async (work: () => Promise<void>) => { setBusy(true); setError(''); setNotice(''); try { await work(); } catch (e: any) { setError(e.message || String(e)); } finally { setBusy(false); } };
  const publish = async (old?: any) => {
    const selectedId = old?.studentId || studentId;
    const student = students.find(s => s.id === selectedId);
    if (!student) throw new Error('Chọn học sinh.');
    const targetEmail = old?.viewerEmail || email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) throw new Error('Nhập email Google hợp lệ.');
    const ref = old ? doc(db, 'familyReports', old.id) : doc(collection(db, 'familyReports'));
    const logs = disciplineLogs.filter(l => l.studentId === student.id);
    const weeks = classConfig.weeks.filter(w => w.startDate <= localDateString()).map(w => { const s = getWeeklySummary(w.weekNumber).find(s => s.studentId === student.id)!; return { weekNumber: w.weekNumber, finalScore: s.finalScore, rank: s.rank, explanation: `${classConfig.baseScore} − ${s.totalDeduct} + ${s.totalBonus} = ${s.finalScore}đ (không giới hạn điểm tối đa). ${s.notes}` }; });
    const months = classConfig.months.filter(m => classConfig.weeks.some(w => w.month === m && w.startDate <= localDateString())).map(month => { const s = getMonthlySummary(month).find(s => s.studentId === student.id)!; return { month, finalScore: s.finalScore, rank: s.rank, explanation: s.notes }; });
    await setDoc(ref, { teacherId: classConfig.teacherId, classId: classConfig.id, studentId: student.id, studentName: student.fullName, className: classConfig.className, viewerEmail: targetEmail,
      expiresAt: Timestamp.fromMillis(Date.now() + days * 86400000), revoked: false, publishedAt: new Date().toISOString(),
      logIds: logs.map(l => l.id), logs: logs.map(l => ({ id: l.id, date: l.date, behaviorDescription: l.behaviorDescription, type: l.type, totalScore: l.totalScore })), weeks, months });
    setNotice(`Đã công bố báo cáo cho ${targetEmail}. Sao chép liên kết bên dưới để gửi.`);
  };
  const decide = async (r: any, approved: boolean) => {
    const answer = response[r.id]?.trim();
    if (!answer) throw new Error('Nhập kết quả kiểm tra / lý do từ chối.');
    const log = disciplineLogs.find(l => l.id === r.logId);
    if (approved && !log) throw new Error('Bản ghi đã bị xóa. Hãy kiểm tra thùng rác hoặc từ chối đề nghị.');
    if (approved && log && (isPeriodLocked('week', log.weekNumber) || isPeriodLocked('month', log.month) || isPeriodLocked('semester', classConfig.semester1Months.includes(log.month) ? 1 : 2))) throw new Error('Kỳ đã khóa. Không thể duyệt sửa.');
    const batch = writeBatch(db);
    if (approved && log) batch.update(doc(db, 'disciplineLogs', log.id), { behaviorDescription: r.requestedDescription, updatedAt: new Date().toISOString(), history: [...(log.history || []), { timestamp: new Date().toISOString(), editorName: auth.currentUser?.displayName || classConfig.homeroomTeacher, action: 'update', previousValue: log.behaviorDescription, newValue: r.requestedDescription }] });
    batch.update(doc(db, 'correctionRequests', r.id), { status: approved ? 'approved' : 'rejected', response: answer, reviewedAt: new Date().toISOString(), reviewedBy: auth.currentUser?.uid });
    await batch.commit(); setNotice(approved ? 'Đã duyệt và sửa nội dung bản ghi. Nếu cần sửa điểm/số lần, bấm Sửa bản ghi.' : 'Đã từ chối và lưu phản hồi.');
  };
  return <details className="bg-white dark:bg-slate-800 border rounded-2xl p-4 space-y-3"><summary className="font-bold cursor-pointer">Tra cứu phụ huynh • Đề nghị điều chỉnh • Thùng rác</summary>
    {error && <p role="alert" className="text-rose-600">{error}</p>}{notice && <p role="status" className="text-emerald-600 break-words">{notice}</p>}
    <form className="space-y-2 border rounded-xl p-3" onSubmit={e => { e.preventDefault(); void act(() => publish()); }}><h3 className="font-bold">Cấp liên kết báo cáo cá nhân</h3>
      <label className="block">Học sinh<select required value={studentId} onChange={e => setStudentId(e.target.value)} className="block w-full border rounded p-2 bg-transparent"><option value="">Chọn học sinh</option>{students.map(s => <option key={s.id} value={s.id}>{s.fullName} • {s.studentCode}</option>)}</select></label>
      <label className="block">Email Google của người được xem<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="block w-full border rounded p-2 bg-transparent" /></label><label className="block">Thời hạn<select value={days} onChange={e => setDays(Number(e.target.value))} className="border rounded p-2 bg-transparent">{[1, 7, 14, 30].map(d => <option key={d} value={d}>{d} ngày</option>)}</select></label><button disabled={busy} className="bg-blue-600 text-white rounded px-3 py-2">Công bố báo cáo và tạo link</button>
      <p className="text-xs">Báo cáo là bản công bố tại thời điểm tạo. Sau khi sửa điểm, bấm Cập nhật báo cáo để người nhận xem kết quả mới.</p>
    </form>
    {shares.map(s => <div key={s.id} className="border rounded p-2 text-sm space-y-1"><p>{s.studentName} • {s.viewerEmail} • {s.revoked ? 'Đã thu hồi' : s.expiresAt.toMillis() <= Date.now() ? 'Hết hạn' : 'Đang hiệu lực'}</p><div className="flex flex-wrap gap-2"><button disabled={busy || s.revoked} onClick={() => act(async () => { await navigator.clipboard.writeText(`${window.location.origin}/?report=${s.id}#tra-cuu`); setNotice('Đã sao chép liên kết.'); })} className="border rounded px-2 py-1">Sao chép link</button><button disabled={busy || s.revoked} onClick={() => act(() => publish(s))} className="border rounded px-2 py-1">Cập nhật báo cáo</button><button disabled={busy || s.revoked} onClick={() => act(() => updateDoc(doc(db, 'familyReports', s.id), { revoked: true }))} className="text-rose-600 border rounded px-2 py-1">Thu hồi</button></div></div>)}
    <h3 className="font-bold">Đề nghị điều chỉnh ({requests.filter(r => r.status === 'pending').length} chờ duyệt)</h3>
    {requests.map(r => <div key={r.id} className="border rounded p-3 space-y-2 text-sm"><p>{students.find(s => s.id === r.studentId)?.fullName} • {r.requesterEmail} • {r.status}</p><p>Lý do: {r.reason}</p><p>Đề xuất: {r.requestedDescription}</p>{r.status === 'pending' ? <><input aria-label="Kết quả kiểm tra" placeholder="Kết quả kiểm tra / lý do từ chối" value={response[r.id] || ''} onChange={e => setResponse({ ...response, [r.id]: e.target.value })} className="border rounded p-2 w-full bg-transparent" /><div className="flex gap-2"><button disabled={busy} onClick={() => act(() => decide(r, true))} className="border rounded px-2 py-1">Duyệt sửa nội dung</button><button disabled={busy} onClick={() => act(() => decide(r, false))} className="border rounded px-2 py-1 text-rose-600">Từ chối</button><button disabled={busy} onClick={() => { const log = disciplineLogs.find(l => l.id === r.logId); if (log) setEditing(log); }} className="border rounded px-2 py-1">Sửa bản ghi / điểm</button></div></> : <p>{r.response}</p>}</div>)}
    <h3 className="font-bold">Thùng rác bản ghi ({trash.length})</h3><p className="text-xs">Bản ghi trong thùng rác không tính điểm. Có thể khôi phục sau khi đăng nhập lại; kỳ đã khóa vẫn được bảo vệ.</p>
    {trash.map(t => <div key={t.id} className="border rounded p-3 flex flex-wrap justify-between gap-2 text-sm"><div>{t.log.studentName} • {t.log.behaviorDescription}<p className="text-xs">{t.log.date} • Xóa bởi {t.deletedBy} lúc {new Date(t.deletedAt).toLocaleString('vi-VN')}</p></div><button disabled={busy} onClick={() => act(async () => { await restoreDisciplineLog(t.log); setNotice('Đã khôi phục bản ghi và cập nhật điểm.'); })} className="border rounded px-3 py-1">Khôi phục</button></div>)}
    {editing && <StudentPointEditor studentId={editing.studentId} weekNumber={editing.weekNumber} onClose={() => setEditing(null)} />}
  </details>;
}
