import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { familyAuth, familyDb, signInFamily, signOutFamily, readFamilyReport, requestCorrection, type FamilyReport } from '../lib/familyPortal';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';

export function FamilyPortal() {
  const initialId = new URLSearchParams(window.location.search).get('report') || '';
  const [id, setId] = useState(initialId);
  const [email, setEmail] = useState(familyAuth.currentUser?.email || '');
  const [report, setReport] = useState<FamilyReport | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [logId, setLogId] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  useEffect(() => onAuthStateChanged(familyAuth, user => { setEmail(user?.email || ''); setReport(null); setRequests([]); }), []);
  useEffect(() => {
    if (!familyAuth.currentUser) return;
    return onSnapshot(query(collection(familyDb, 'correctionRequests'), where('requesterId', '==', familyAuth.currentUser.uid)), snap => setRequests(snap.docs.map(d => ({ ...d.data(), id: d.id }))), () => setError('Không tải được trạng thái đề nghị.'));
  }, [email]);
  const load = async () => {
    setBusy(true); setReport(null); setError(''); setNotice('');
    try { const snap = await readFamilyReport(id.trim()); if (!snap.exists()) throw new Error(); setReport({ ...snap.data(), id: snap.id } as FamilyReport); }
    catch { setError('Không thể mở báo cáo: cần đúng email được cấp quyền; liên kết có thể đã hết hạn hoặc bị thu hồi.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { if (email && initialId) void load(); }, [email]);
  useEffect(() => {
    if (!report) return;
    const stop = onSnapshot(doc(familyDb, 'familyReports', report.id), snap => { if (snap.exists()) setReport({ ...snap.data(), id: snap.id } as FamilyReport); }, () => { setReport(null); setError('Báo cáo đã hết hạn hoặc quyền xem đã bị thu hồi.'); });
    const timer = window.setInterval(() => { if (report.expiresAt.toMillis() <= Date.now()) { setReport(null); setError('Liên kết báo cáo đã hết hạn.'); } }, 1000);
    return () => { stop(); window.clearInterval(timer); };
  }, [report?.id, report?.expiresAt?.seconds]);
  return <section id="tra-cuu" className="bg-white dark:bg-slate-800 border rounded-2xl p-5 space-y-4">
    <h2 className="text-xl font-bold">Tra cứu riêng cho học sinh / phụ huynh</h2>
    <p className="text-sm">Mở liên kết giáo viên cung cấp và đăng nhập đúng email Google được cấp quyền. Mỗi liên kết chỉ dành cho một học sinh và có ngày hết hạn.</p>
    <div className="flex flex-wrap gap-2 items-center">{email ? <><span>{email}</span><button className="border rounded-lg px-3 py-2" onClick={() => signOutFamily().catch(e => setError(e.message))}>Đổi tài khoản</button></> : <button className="bg-blue-600 text-white rounded-lg px-3 py-2" onClick={() => signInFamily().catch(e => setError(e.message))}>Đăng nhập Google để tra cứu</button>}</div>
    <label className="block text-sm">Mã báo cáo trong liên kết<input value={id} onChange={e => { setId(e.target.value); setReport(null); }} className="block w-full border rounded-lg p-2 bg-transparent" /></label>
    <button disabled={busy || !email || !id.trim()} onClick={load} className="border rounded-lg px-3 py-2 disabled:opacity-40">{busy ? 'Đang tải…' : 'Mở báo cáo'}</button>
    {error && <p role="alert" className="text-rose-600">{error}</p>}{notice && <p role="status" className="text-emerald-600">{notice}</p>}
    {report && <><h3 className="font-bold">{report.studentName} • {report.className}</h3><p className="text-xs">Báo cáo được giáo viên công bố lúc {new Date(report.publishedAt).toLocaleString('vi-VN')}. Có giá trị đến {report.expiresAt.toDate().toLocaleString('vi-VN')}. Đây là kết quả tại thời điểm công bố.</p>
      <div className="grid sm:grid-cols-2 gap-3"><div><h4 className="font-bold">Điểm tuần</h4>{report.weeks.map(w => <details key={w.weekNumber} className="border rounded p-2"><summary>Tuần {w.weekNumber}: {w.finalScore}đ • {w.rank}</summary><p className="text-sm">{w.explanation}</p></details>)}</div><div><h4 className="font-bold">Điểm tháng</h4>{report.months.map(m => <details key={m.month} className="border rounded p-2"><summary>Tháng {m.month}: {m.finalScore}đ • {m.rank}</summary><p className="text-sm">{m.explanation}</p></details>)}</div></div>
      <h4 className="font-bold">Lỗi và thành tích</h4>{report.logs.map(l => <p key={l.id} className="border rounded p-2 text-sm">{l.date} • {l.behaviorDescription} • {l.type === 'deduct' ? '−' : '+'}{l.totalScore}đ</p>)}
      {report.logs.length > 0 && <form className="space-y-2 border rounded-xl p-3" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await requestCorrection(report, logId, reason, description); setReason(''); setDescription(''); setNotice('Đã gửi đề nghị. Giáo viên sẽ kiểm tra trước khi sửa điểm.'); } catch (f: any) { setError(f.message); } finally { setBusy(false); } }}>
        <h4 className="font-bold">Đề nghị điều chỉnh bản ghi</h4><label className="block">Bản ghi<select required value={logId} onChange={e => setLogId(e.target.value)} className="block w-full border rounded p-2 bg-transparent"><option value="">Chọn bản ghi</option>{report.logs.map(l => <option key={l.id} value={l.id}>{l.date} • {l.behaviorDescription}</option>)}</select></label>
        <label className="block">Lý do đề nghị<textarea required maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} className="block w-full border rounded p-2 bg-transparent" /></label><label className="block">Nội dung đúng đề xuất<input required maxLength={500} value={description} onChange={e => setDescription(e.target.value)} className="block w-full border rounded p-2 bg-transparent" /></label><button disabled={busy} className="bg-blue-600 text-white rounded px-3 py-2">Gửi đề nghị</button>
      </form>}
      <h4 className="font-bold">Trạng thái đề nghị</h4>{requests.filter(r => r.reportId === report.id).map(r => <p key={r.id} className="border rounded p-2 text-sm">{r.reason} • {r.status === 'pending' ? 'Chờ duyệt' : r.status === 'approved' ? 'Đã duyệt' : 'Từ chối'} {r.response && `• ${r.response}`}</p>)}
    </>}
  </section>;
}
