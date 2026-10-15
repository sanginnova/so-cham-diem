import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { HomeroomRecord } from '../types/homeroom';
import { collectionRows, money } from '../lib/collections';
import { localDateString } from '../lib/logValidation';
const control = 'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2';
const button = 'rounded-lg border px-3 py-2 text-sm disabled:opacity-50';
export function CollectionsView() {
  const { students, classConfig, userRole, homeroomRecords: records, homeroomLoading, homeroomError, saveHomeroomRecord, isLocalMode } = useApp();
  const collections = records.filter(r => r.kind === 'collection').sort((a,b) => b.date.localeCompare(a.date));
  const [selectedId, setSelectedId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<HomeroomRecord>();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(localDateString());
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [entry, setEntry] = useState<{ studentId: string; kind: 'payment' | 'allowance' }>();
  const [entryAmount, setEntryAmount] = useState('');
  const [entryDate, setEntryDate] = useState(localDateString());
  const [method, setMethod] = useState('Tiền mặt');
  const [note, setNote] = useState('');
  const [allowanceMode, setAllowanceMode] = useState('Giảm');
  const selected = collections.find(c => c.id === selectedId) || collections[0];
  const calculation = useMemo(() => { try { return { rows: selected ? collectionRows(selected, records, students) : [], error: '' }; } catch (e) { return { rows: [], error: (e as Error).message }; } }, [selected, records, students]);
  const rows = calculation.rows;
  const totals = rows.reduce((t,r) => ({ due:t.due+r.due, paid:t.paid+r.paid, remaining:t.remaining+r.remaining, excess:t.excess+r.excess, discount:t.discount+r.discount }), { due:0, paid:0, remaining:0, excess:0, discount:0 });
  const visible = rows.filter(r => (!search || `${r.name} ${r.code}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))) && (!statusFilter || r.status === statusFilter));
  const blocked = busy || homeroomLoading || !!homeroomError;
  const run = async (action: () => Promise<void>, success?: string) => { setBusy(true); setMessage(''); try { await action(); setMessage(success || (isLocalMode ? 'Đã lưu trên thiết bị.' : 'Đã lưu lên đám mây.')); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } };
  if (!['teacher', 'admin', 'owner'].includes(userRole)) return <p>Chỉ giáo viên và quản trị viên được quản lý khoản thu.</p>;
  const openCreate = (record?: HomeroomRecord) => {
    setEditing(record); setTitle(record?.data.name || ''); setAmount(record?.data.amount || ''); setStartDate(record?.date || localDateString()); setDueDate(record?.data.dueDate || ''); setDescription(record?.data.description || '');
    setMemberIds(record ? JSON.parse(record.data.studentIds || '[]') : students.filter(s => s.status === 'active').map(s => s.id)); setCreateOpen(true); setMessage('');
  };
  const saveCollection = (e: React.FormEvent) => { e.preventDefault(); void run(async () => {
    if (dueDate && dueDate < startDate) throw new Error('Hạn nộp không được trước ngày bắt đầu.');
    await saveHomeroomRecord({ id:editing?.id, kind:'collection', studentId:'', date:startDate, data:{ name:title.trim(), amount, dueDate, description, status:editing?.data.status || 'Đang thu', studentIds:editing?.data.studentIds || JSON.stringify(memberIds), studentNames:editing?.data.studentNames || JSON.stringify(Object.fromEntries(students.filter(s => memberIds.includes(s.id)).map(s => [s.id,s.fullName]))) } });
    setCreateOpen(false);
  }); };
  const openEntry = (studentId: string, kind: 'payment' | 'allowance') => {
    const row = rows.find(r => r.studentId === studentId)!;
    setEntry({ studentId, kind }); setEntryAmount(kind === 'payment' ? (row.remaining ? String(row.remaining) : '') : row.allowance?.data.amount || '0');
    setAllowanceMode(row.allowance?.data.mode || 'Giảm'); setEntryDate(localDateString()); setMethod('Tiền mặt'); setNote(kind === 'allowance' ? row.allowance?.data.reason || '' : ''); setMessage('');
  };
  const saveEntry = (e: React.FormEvent) => { e.preventDefault(); if (!entry || !selected) return; void run(async () => {
    const old = entry.kind === 'allowance' ? rows.find(r => r.studentId === entry.studentId)?.allowance : undefined;
    await saveHomeroomRecord({ id:old?.id, kind:entry.kind, studentId:entry.studentId, date:entryDate,
      data:entry.kind === 'payment' ? { collectionId:selected.id, amount:entryAmount, method, note, state:'Đã ghi nhận' } : { collectionId:selected.id, amount:allowanceMode === 'Miễn' || allowanceMode === 'Không áp dụng' ? selected.data.amount : allowanceMode === 'Bình thường' ? '0' : entryAmount, mode:allowanceMode, reason:note } });
    setEntry(undefined);
  }); };
  const voidPayment = (payment: HomeroomRecord) => {
    const reason = window.prompt('Lý do hủy ghi nhận (phiếu gốc vẫn được giữ trong lịch sử):');
    if (!reason?.trim()) return;
    void run(() => saveHomeroomRecord({ id:payment.id, kind:'payment', studentId:payment.studentId, date:payment.date, data:{ ...payment.data, state:'Đã hủy', voidReason:reason.trim() } }));
  };
  const exportExcel = () => void run(async () => {
    if (!selected) return;
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const summary = rows.map((r,i) => ({ 'STT':i+1, 'Mã học sinh':r.code, 'Họ tên':r.name, 'Mức thu (đ)':r.base, 'Miễn/giảm (đ)':r.discount, 'Phải nộp (đ)':r.due, 'Đã nộp (đ)':r.paid, 'Còn thiếu (đ)':r.remaining, 'Nộp dư (đ)':r.excess, 'Trạng thái':r.status, 'Ghi chú':r.allowance?.data.reason || '' }));
    const sheet = XLSX.utils.json_to_sheet(summary); sheet['!cols'] = [{wch:6},{wch:18},{wch:30},...Array.from({length:6},()=>({wch:18})),{wch:20},{wch:35}];
    XLSX.utils.book_append_sheet(workbook, sheet, 'Theo doi thu');
    const history = records.filter(r => r.kind === 'payment' && r.data.collectionId === selected.id).sort((a,b) => a.date.localeCompare(b.date)).map(r => ({ 'Mã phiếu':r.id, 'Ngày':r.date, 'Học sinh':rows.find(s => s.studentId === r.studentId)?.name || r.studentId, 'Số tiền (đ)':Number(r.data.amount), 'Phương thức':r.data.method, 'Trạng thái':r.data.state, 'Nội dung':r.data.note || '', 'Lý do hủy':r.data.voidReason || '' }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(history), 'Lich su nop');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ 'Lớp':classConfig.className,'Niên khóa':classConfig.schoolYear,'Khoản thu':selected.data.name,'Ngày bắt đầu':selected.date,'Hạn nộp':selected.data.dueDate || '', 'Phải thu (đ)':totals.due,'Đã thu (đ)':totals.paid,'Còn thiếu (đ)':totals.remaining,'Nộp dư (đ)':totals.excess }]), 'Thong tin');
    XLSX.writeFile(workbook, `Khoan_thu_${classConfig.className}_${selected.data.name}.xlsx`.replace(/[\\/:*?"<>|]/g,'_'));
  }, 'Đã xuất tệp Excel.');
  const entryRow = rows.find(r => r.studentId === entry?.studentId);
  return <section className="space-y-5 text-slate-800 dark:text-slate-100">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Các khoản thu</h2><p className="text-sm text-slate-500">{classConfig.className} · {classConfig.schoolYear} · Theo dõi theo từng học sinh, giữ lịch sử các lần nộp.</p></div><button disabled={blocked} onClick={() => openCreate()} className="bg-indigo-600 text-white rounded-lg px-4 py-2 disabled:opacity-50">+ Tạo khoản thu</button></div>
    {homeroomLoading && <p role="status">Đang tải các khoản thu…</p>}{homeroomError && <p role="alert" className="text-red-600">{homeroomError}</p>}{message && <p role="status" className="rounded-lg bg-indigo-50 text-indigo-900 p-3">{message}</p>}
    {createOpen && <form onSubmit={saveCollection} className="border rounded-xl p-4 space-y-3"><h3 className="font-bold">{editing ? 'Sửa thông tin khoản thu' : 'Khoản thu mới'}</h3><div className="grid sm:grid-cols-2 gap-3">
      <label>Tên khoản thu<input className={control} value={title} onChange={e=>setTitle(e.target.value)} maxLength={200} required /></label><label>Mức thu mỗi học sinh (đồng)<input type="number" min="0" step="1" max="999999999999" disabled={!!editing} value={amount} onChange={e=>setAmount(e.target.value)} className={control} required /></label>
      <label>Ngày bắt đầu<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className={control} required /></label><label>Hạn nộp<input type="date" min={startDate} value={dueDate} onChange={e=>setDueDate(e.target.value)} className={control} /></label>
    </div><label className="block">Nội dung<textarea rows={2} value={description} onChange={e=>setDescription(e.target.value)} maxLength={10000} className={control} /></label>
      {!editing && <details><summary className="cursor-pointer">Áp dụng cho {memberIds.length}/{students.length} học sinh (mặc định chọn học sinh đang học)</summary><div className="flex gap-3 my-2"><button type="button" className={button} onClick={()=>setMemberIds(students.map(s=>s.id))}>Chọn tất cả</button><button type="button" className={button} onClick={()=>setMemberIds([])}>Bỏ chọn</button></div><div className="grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">{students.map(s=><label key={s.id} className="flex gap-2"><input type="checkbox" checked={memberIds.includes(s.id)} onChange={e=>setMemberIds(ids=>e.target.checked?[...ids,s.id]:ids.filter(id=>id!==s.id))} />{s.fullName}</label>)}</div></details>}
      {editing && <p className="text-sm text-slate-500">Mức thu và danh sách áp dụng được giữ từ khi tạo; điều chỉnh riêng bằng Miễn/giảm.</p>}<div className="flex gap-2"><button disabled={blocked} className={button}>Lưu khoản thu</button><button type="button" disabled={busy} onClick={()=>setCreateOpen(false)} className={button}>Đóng</button></div>
    </form>}
    {!!collections.length && <label className="block">Khoản thu đang xem<select disabled={busy} value={selected?.id || ''} className={control} onChange={e=>{setSelectedId(e.target.value);setEntry(undefined);setStatusFilter('');setSearch('');}}>{collections.map(c=><option key={c.id} value={c.id}>{c.data.name} · {money(Number(c.data.amount))} · {c.data.status}</option>)}</select></label>}
    {!collections.length && !homeroomLoading && !homeroomError && <p>Chưa có khoản thu. Bấm “Tạo khoản thu” để bắt đầu.</p>}
    {selected && <>
      <div className="flex flex-wrap gap-2 items-center"><span className="text-sm">Hạn nộp: {selected.data.dueDate || 'Chưa đặt'} · {selected.data.status}</span><button disabled={blocked} onClick={()=>openCreate(selected)} className={button}>Sửa thông tin</button><button disabled={blocked} onClick={()=>void run(()=>saveHomeroomRecord({id:selected.id,kind:'collection',studentId:'',date:selected.date,data:{...selected.data,status:selected.data.status==='Đang thu'?'Đã kết thúc':'Đang thu'}}))} className={button}>{selected.data.status==='Đang thu'?'Kết thúc đợt thu':'Mở lại đợt thu'}</button><button disabled={blocked || !!calculation.error} onClick={exportExcel} className={button}>Xuất Excel</button></div>
      {selected.data.dueDate && selected.data.dueDate < localDateString() && totals.remaining > 0 && <p className="text-amber-700 dark:text-amber-400">Đã quá hạn nộp: {rows.filter(r => r.remaining > 0).length} học sinh còn thiếu {money(totals.remaining)}.</p>}
      {selected.data.description && <p className="text-sm whitespace-pre-wrap">{selected.data.description}</p>}
      {calculation.error ? <p role="alert" className="text-red-600">{calculation.error}</p> : <>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[['Phải thu',totals.due],['Đã thu',totals.paid],['Còn thiếu',totals.remaining],['Miễn/giảm',totals.discount],['Nộp dư',totals.excess]].map(([label,value])=><div key={label} className="border rounded-xl p-3"><p className="text-sm">{label}</p><p className="font-bold text-lg">{money(Number(value))}</p></div>)}</div>
        {entry && entryRow && <form onSubmit={saveEntry} className="border border-indigo-300 rounded-xl p-4 space-y-3"><h3 className="font-bold">{entry.kind==='payment'?'Ghi nhận nộp tiền':'Miễn / Giảm / Không áp dụng'} — {entryRow.name}</h3><div className="grid sm:grid-cols-2 gap-3">
          <label>Ngày ghi nhận<input type="date" required value={entryDate} onChange={e=>setEntryDate(e.target.value)} className={control} /></label>
          {entry.kind==='allowance' && <label>Chế độ<select value={allowanceMode} onChange={e=>setAllowanceMode(e.target.value)} className={control}>{['Giảm','Miễn','Không áp dụng','Bình thường'].map(v=><option key={v}>{v}</option>)}</select></label>}
          {(entry.kind==='payment'||allowanceMode==='Giảm') && <label>{entry.kind==='payment'?'Số tiền nộp':'Số tiền giảm'} (đồng)<input type="number" min={entry.kind==='payment'?1:0} step="1" max="999999999999" required value={entryAmount} onChange={e=>setEntryAmount(e.target.value)} className={control} /></label>}
          {entry.kind==='payment'&&<label>Phương thức<select className={control} value={method} onChange={e=>setMethod(e.target.value)}>{['Tiền mặt','Chuyển khoản','Khác'].map(v=><option key={v}>{v}</option>)}</select></label>}
        </div><label className="block">{entry.kind==='allowance'?'Lý do':'Ghi chú'}<textarea rows={2} maxLength={10000} required={entry.kind==='allowance'&&allowanceMode!=='Bình thường'} value={note} onChange={e=>setNote(e.target.value)} className={control} /></label><div className="flex gap-2"><button disabled={blocked || selected.data.status!=='Đang thu'} className={button}>Lưu ghi nhận</button><button type="button" disabled={busy} onClick={()=>setEntry(undefined)} className={button}>Đóng</button></div>
          {!!entryRow.transactions.length && <div className="space-y-2"><h4 className="font-bold">Lịch sử các lần nộp</h4>{entryRow.transactions.map(t=><div key={t.id} className="text-sm border rounded p-2"><span className={t.data.state==='Đã hủy'?'line-through':''}>{t.date} · {money(Number(t.data.amount))} · {t.data.method}</span><p>{t.data.note}</p>{t.data.state==='Đã hủy'?<p className="text-red-600">Đã hủy: {t.data.voidReason}</p>:<button type="button" disabled={blocked||selected.data.status!=='Đang thu'} onClick={()=>voidPayment(t)} className="text-red-600">Hủy ghi nhận có lý do</button>}</div>)}</div>}
        </form>}
        <div className="flex flex-wrap gap-3"><label className="flex-1 min-w-48">Tìm học sinh<input className={control} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tên hoặc mã học sinh" /></label><label>Trạng thái<select className={control} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="">Tất cả</option>{['Chưa nộp','Nộp một phần','Đã nộp','Miễn','Không áp dụng','Nộp dư'].map(v=><option key={v}>{v}</option>)}</select></label></div>
        <div className="overflow-x-auto border rounded-xl"><table className="w-full text-sm text-left"><thead className="bg-slate-100 dark:bg-slate-800"><tr>{['Học sinh','Phải nộp','Đã nộp','Còn thiếu','Nộp dư','Trạng thái','Thao tác'].map(h=><th key={h} className="p-3 whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{visible.map(r=><tr key={r.studentId} className="border-t"><td className="p-3"><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.code}</p></td>{[r.due,r.paid,r.remaining,r.excess].map((v,i)=><td key={i} className="p-3 whitespace-nowrap">{money(v)}</td>)}<td className="p-3 whitespace-nowrap">{r.status}</td><td className="p-3"><div className="flex gap-2 whitespace-nowrap"><button disabled={blocked} onClick={()=>openEntry(r.studentId,'payment')} className={button}>{selected.data.status==='Đang thu'?'Ghi nộp / Lịch sử':'Xem lịch sử'}</button><button disabled={blocked||selected.data.status!=='Đang thu'} onClick={()=>openEntry(r.studentId,'allowance')} className={button}>Miễn/giảm</button></div></td></tr>)}</tbody></table>{!visible.length&&<p className="p-4">Không có học sinh phù hợp.</p>}</div>
        <p className="text-xs text-slate-500">Tổng hợp tính trên toàn bộ danh sách áp dụng. Học sinh mới thêm vào lớp không tự phát sinh khoản phải nộp của đợt cũ. Phiếu hủy được giữ trong lịch sử.</p>
      </>}
    </>}
  </section>;
}
