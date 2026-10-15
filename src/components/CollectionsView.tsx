import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { HomeroomRecord } from '../types/homeroom';
import { collectionRows, money } from '../lib/collections';
import { localDateString } from '../lib/logValidation';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  BadgePercent,
  PlusCircle,
  Calendar,
  Clock,
  Check,
  FileSpreadsheet,
  Edit3,
  Search,
  Filter,
  RotateCcw,
  Receipt,
  ShieldCheck,
  Plus,
  Trash2,
  X,
  CreditCard,
  Layers,
} from 'lucide-react';

const control =
  'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition';
const button =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer active:scale-95';

export function CollectionsView() {
  const {
    students,
    classConfig,
    userRole,
    homeroomRecords: records,
    homeroomLoading,
    homeroomError,
    saveHomeroomRecord,
    isLocalMode,
  } = useApp();

  const collections = records
    .filter((r) => r.kind === 'collection')
    .sort((a, b) => b.date.localeCompare(a.date));

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

  const selected = collections.find((c) => c.id === selectedId) || collections[0];

  const calculation = useMemo(() => {
    try {
      return { rows: selected ? collectionRows(selected, records, students) : [], error: '' };
    } catch (e) {
      return { rows: [], error: (e as Error).message };
    }
  }, [selected, records, students]);

  const rows = calculation.rows;
  const totals = rows.reduce(
    (t, r) => ({
      due: t.due + r.due,
      paid: t.paid + r.paid,
      remaining: t.remaining + r.remaining,
      excess: t.excess + r.excess,
      discount: t.discount + r.discount,
    }),
    { due: 0, paid: 0, remaining: 0, excess: 0, discount: 0 }
  );

  const visible = rows.filter(
    (r) =>
      (!search ||
        `${r.name} ${r.code}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))) &&
      (!statusFilter || r.status === statusFilter)
  );

  const blocked = busy || homeroomLoading || !!homeroomError;

  const run = async (action: () => Promise<void>, success?: string) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage(success || (isLocalMode ? 'Đã lưu trên thiết bị.' : 'Đã lưu lên đám mây.'));
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!['teacher', 'admin', 'owner'].includes(userRole)) {
    return (
      <div className="p-6 text-center text-slate-500">
        Chỉ giáo viên và quản trị viên được quản lý khoản thu.
      </div>
    );
  }

  const openCreate = (record?: HomeroomRecord) => {
    setEditing(record);
    setTitle(record?.data.name || '');
    setAmount(record?.data.amount || '');
    setStartDate(record?.date || localDateString());
    setDueDate(record?.data.dueDate || '');
    setDescription(record?.data.description || '');
    setMemberIds(
      record
        ? JSON.parse(record.data.studentIds || '[]')
        : students.filter((s) => s.status === 'active').map((s) => s.id)
    );
    setCreateOpen(true);
    setMessage('');
  };

  const saveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (dueDate && dueDate < startDate) {
        throw new Error('Hạn nộp không được trước ngày bắt đầu.');
      }
      await saveHomeroomRecord({
        id: editing?.id,
        kind: 'collection',
        studentId: '',
        date: startDate,
        data: {
          name: title.trim(),
          amount,
          dueDate,
          description,
          status: editing?.data.status || 'Đang thu',
          studentIds: editing?.data.studentIds || JSON.stringify(memberIds),
          studentNames:
            editing?.data.studentNames ||
            JSON.stringify(
              Object.fromEntries(
                students.filter((s) => memberIds.includes(s.id)).map((s) => [s.id, s.fullName])
              )
            ),
        },
      });
      setCreateOpen(false);
    });
  };

  const openEntry = (studentId: string, kind: 'payment' | 'allowance') => {
    const row = rows.find((r) => r.studentId === studentId)!;
    setEntry({ studentId, kind });
    setEntryAmount(
      kind === 'payment'
        ? row.remaining
          ? String(row.remaining)
          : ''
        : row.allowance?.data.amount || '0'
    );
    setAllowanceMode(row.allowance?.data.mode || 'Giảm');
    setEntryDate(localDateString());
    setMethod('Tiền mặt');
    setNote(kind === 'allowance' ? row.allowance?.data.reason || '' : '');
    setMessage('');
  };

  const saveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry || !selected) return;
    void run(async () => {
      const old =
        entry.kind === 'allowance'
          ? rows.find((r) => r.studentId === entry.studentId)?.allowance
          : undefined;
      await saveHomeroomRecord({
        id: old?.id,
        kind: entry.kind,
        studentId: entry.studentId,
        date: entryDate,
        data:
          entry.kind === 'payment'
            ? {
                collectionId: selected.id,
                amount: entryAmount,
                method,
                note,
                state: 'Đã ghi nhận',
              }
            : {
                collectionId: selected.id,
                amount:
                  allowanceMode === 'Miễn' || allowanceMode === 'Không áp dụng'
                    ? selected.data.amount
                    : allowanceMode === 'Bình thường'
                    ? '0'
                    : entryAmount,
                mode: allowanceMode,
                reason: note,
              },
      });
      setEntry(undefined);
    });
  };

  const voidPayment = (paymentRecord: HomeroomRecord) => {
    const reason = window.prompt(
      'Lý do hủy ghi nhận (phiếu gốc vẫn được giữ trong lịch sử):'
    );
    if (!reason?.trim()) return;
    void run(() =>
      saveHomeroomRecord({
        id: paymentRecord.id,
        kind: 'payment',
        studentId: paymentRecord.studentId,
        date: paymentRecord.date,
        data: { ...paymentRecord.data, state: 'Đã hủy', voidReason: reason.trim() },
      })
    );
  };

  const exportExcel = () =>
    void run(async () => {
      if (!selected) return;
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const summary = rows.map((r, i) => ({
        STT: i + 1,
        'Mã học sinh': r.code,
        'Họ tên': r.name,
        'Mức thu (đ)': r.base,
        'Miễn/giảm (đ)': r.discount,
        'Phải nộp (đ)': r.due,
        'Đã nộp (đ)': r.paid,
        'Còn thiếu (đ)': r.remaining,
        'Nộp dư (đ)': r.excess,
        'Trạng thái': r.status,
        'Ghi chú': r.allowance?.data.reason || '',
      }));
      const sheet = XLSX.utils.json_to_sheet(summary);
      sheet['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 30 },
        ...Array.from({ length: 6 }, () => ({ wch: 18 })),
        { wch: 20 },
        { wch: 35 },
      ];
      XLSX.utils.book_append_sheet(workbook, sheet, 'Theo doi thu');
      const history = records
        .filter((r) => r.kind === 'payment' && r.data.collectionId === selected.id)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({
          'Mã phiếu': r.id,
          Ngày: r.date,
          'Học sinh': rows.find((s) => s.studentId === r.studentId)?.name || r.studentId,
          'Số tiền (đ)': Number(r.data.amount),
          'Phương thức': r.data.method,
          'Trạng thái': r.data.state,
          'Nội dung': r.data.note || '',
          'Lý do hủy': r.data.voidReason || '',
        }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(history), 'Lich su nop');
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet([
          {
            Lớp: classConfig.className,
            'Niên khóa': classConfig.schoolYear,
            'Khoản thu': selected.data.name,
            'Ngày bắt đầu': selected.date,
            'Hạn nộp': selected.data.dueDate || '',
            'Phải thu (đ)': totals.due,
            'Đã thu (đ)': totals.paid,
            'Còn thiếu (đ)': totals.remaining,
            'Nộp dư (đ)': totals.excess,
          },
        ]),
        'Thong tin'
      );
      XLSX.writeFile(
        workbook,
        `Khoan_thu_${classConfig.className}_${selected.data.name}.xlsx`.replace(
          /[\\/:*?"<>|]/g,
          '_'
        )
      );
    }, 'Đã xuất tệp Excel.');

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Đã nộp':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-2xs">
            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Đã nộp</span>
          </span>
        );
      case 'Chưa nộp':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 shadow-2xs">
            <Clock className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Chưa nộp</span>
          </span>
        );
      case 'Nộp một phần':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shadow-2xs">
            <AlertCircle className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Nộp một phần</span>
          </span>
        );
      case 'Miễn':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800 shadow-2xs">
            <ShieldCheck className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Miễn</span>
          </span>
        );
      case 'Không áp dụng':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-2xs">
            <span>Không áp dụng</span>
          </span>
        );
      case 'Nộp dư':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 shadow-2xs">
            <PlusCircle className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Nộp dư</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const entryRow = rows.find((r) => r.studentId === entry?.studentId);

  return (
    <section className="space-y-5 text-slate-800 dark:text-slate-100">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Wallet className="h-5 w-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Các khoản thu của lớp</h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Lớp <strong>{classConfig.className}</strong> · Năm học {classConfig.schoolYear} · Theo dõi thu nộp theo từng học sinh, quản lý miễn giảm và lưu lịch sử phiếu thu.
          </p>
        </div>

        <button
          disabled={blocked}
          onClick={() => openCreate()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/25 active:scale-95 transition cursor-pointer disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo khoản thu mới</span>
        </button>
      </div>

      {homeroomLoading && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs sm:text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 animate-spin" />
          <span>Đang đồng bộ dữ liệu các khoản thu…</span>
        </div>
      )}

      {homeroomError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{homeroomError}</span>
        </div>
      )}

      {message && (
        <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs sm:text-sm font-medium flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* ── Form Tạo / Sửa Khoản Thu ── */}
      {createOpen && (
        <form
          onSubmit={saveCollection}
          className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-b from-blue-50/50 to-white dark:from-slate-850 dark:to-slate-900 p-5 shadow-lg space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-slate-800">
            <h3 className="font-bold text-sm sm:text-base text-blue-950 dark:text-blue-100 flex items-center gap-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>{editing ? 'Sửa thông tin khoản thu' : 'Tạo khoản thu mới'}</span>
            </h3>
            <button
              type="button"
              disabled={busy}
              onClick={() => setCreateOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tên khoản thu *
              </label>
              <input
                className={control}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Quỹ lớp Học kỳ 1, Tiền may đồng phục"
                maxLength={200}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mức thu mỗi học sinh (đồng) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                max="999999999999"
                disabled={!!editing}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ví dụ: 100000"
                className={control}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ngày bắt đầu thu *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={control}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hạn nộp
              </label>
              <input
                type="date"
                min={startDate}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={control}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú / Mục đích sử dụng khoản thu
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nêu rõ mục đích chi, dự toán hoặc yêu cầu kèm theo..."
              maxLength={10000}
              className={control}
            />
          </div>

          {!editing && (
            <details className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 text-xs">
              <summary className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                Danh sách áp dụng ({memberIds.length}/{students.length} học sinh)
              </summary>
              <div className="flex gap-2 my-2.5">
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-200 hover:bg-blue-100"
                  onClick={() => setMemberIds(students.map((s) => s.id))}
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-300 hover:bg-slate-200"
                  onClick={() => setMemberIds([])}
                >
                  Bỏ chọn tất cả
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pt-1">
                {students.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={memberIds.includes(s.id)}
                      onChange={(e) =>
                        setMemberIds((ids) =>
                          e.target.checked ? [...ids, s.id] : ids.filter((id) => id !== s.id)
                        )
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="truncate">{s.fullName}</span>
                  </label>
                ))}
              </div>
            </details>
          )}

          {editing && (
            <p className="text-xs text-slate-500 italic">
              * Mức thu và danh sách học sinh áp dụng được giữ nguyên theo ban đầu; điều chỉnh riêng theo từng cá nhân bằng chức năng Miễn/giảm.
            </p>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <button
              disabled={blocked}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              Lưu khoản thu
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* ── Bộ chọn khoản thu đang xem ── */}
      {!!collections.length && (
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 shrink-0">
            Khoản thu đang chọn:
          </label>
          <div className="flex-1 min-w-56">
            <select
              disabled={busy}
              value={selected?.id || ''}
              className="w-full rounded-xl border border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-bold text-blue-950 dark:text-blue-100 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              onChange={(e) => {
                setSelectedId(e.target.value);
                setEntry(undefined);
                setStatusFilter('');
                setSearch('');
              }}
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.data.name} · {money(Number(c.data.amount))} · {c.data.status}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!collections.length && !homeroomLoading && !homeroomError && (
        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500">
          <Wallet className="h-10 w-10 mx-auto text-slate-400 mb-2 opacity-50" />
          <p className="font-semibold text-sm">Chưa có khoản thu nào được tạo.</p>
          <p className="text-xs text-slate-400 mt-1">Bấm “Tạo khoản thu mới” để bắt đầu theo dõi thu nộp.</p>
        </div>
      )}

      {selected && (
        <>
          {/* ── Action bar: Hạn nộp, trạng thái & thao tác ── */}
          <div className="flex flex-wrap gap-2.5 items-center justify-between bg-slate-50 dark:bg-slate-850/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  Hạn nộp: <strong className="font-mono">{selected.data.dueDate || 'Chưa đặt'}</strong>
                </span>
              </span>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs ${
                  selected.data.status === 'Đang thu'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    selected.data.status === 'Đang thu' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span>{selected.data.status}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                disabled={blocked}
                onClick={() => openCreate(selected)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-650 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                <span>Sửa thông tin</span>
              </button>

              <button
                disabled={blocked}
                onClick={() =>
                  void run(() =>
                    saveHomeroomRecord({
                      id: selected.id,
                      kind: 'collection',
                      studentId: '',
                      date: selected.date,
                      data: {
                        ...selected.data,
                        status: selected.data.status === 'Đang thu' ? 'Đã kết thúc' : 'Đang thu',
                      },
                    })
                  )
                }
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                  selected.data.status === 'Đang thu'
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                }`}
              >
                {selected.data.status === 'Đang thu' ? (
                  <Clock className="h-3.5 w-3.5 text-amber-600" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
                )}
                <span>{selected.data.status === 'Đang thu' ? 'Kết thúc đợt thu' : 'Mở lại đợt thu'}</span>
              </button>

              <button
                disabled={blocked || !!calculation.error}
                onClick={exportExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>

          {selected.data.dueDate &&
            selected.data.dueDate < localDateString() &&
            totals.remaining > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs sm:text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Đã quá hạn nộp: còn <strong>{rows.filter((r) => r.remaining > 0).length}</strong> học sinh chưa hoàn thành ({money(totals.remaining)}).
                </span>
              </div>
            )}

          {selected.data.description && (
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-850/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700 whitespace-pre-wrap">
              {selected.data.description}
            </p>
          )}

          {calculation.error ? (
            <p role="alert" className="text-red-600 font-bold p-4 bg-red-50 rounded-xl">
              {calculation.error}
            </p>
          ) : (
            <>
              {/* ── 5 THẺ CHỈ SỐ TỔNG HỢP (MÀU SẮC RỰC RỠ, TRỰC QUAN) ── */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Phải thu */}
                <div className="relative overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/90 via-white to-blue-50/40 dark:from-slate-850 dark:via-slate-900 dark:to-blue-950/30 p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      Phải thu
                    </span>
                    <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-blue-950 dark:text-blue-100 tracking-tight font-mono">
                    {money(totals.due)}
                  </p>
                </div>

                {/* 2. Đã thu */}
                <div className="relative overflow-hidden rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 dark:from-slate-850 dark:via-slate-900 dark:to-emerald-950/30 p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Đã thu
                    </span>
                    <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
                    {money(totals.paid)}
                  </p>
                </div>

                {/* 3. Còn thiếu */}
                <div className="relative overflow-hidden rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-br from-rose-50/90 via-white to-rose-50/40 dark:from-slate-850 dark:via-slate-900 dark:to-rose-950/30 p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                      Còn thiếu
                    </span>
                    <div className="h-8 w-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight font-mono">
                    {money(totals.remaining)}
                  </p>
                </div>

                {/* 4. Miễn/giảm */}
                <div className="relative overflow-hidden rounded-2xl border border-purple-200 dark:border-purple-900/60 bg-gradient-to-br from-purple-50/90 via-white to-purple-50/40 dark:from-slate-850 dark:via-slate-900 dark:to-purple-950/30 p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                      Miễn / Giảm
                    </span>
                    <div className="h-8 w-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                      <BadgePercent className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-300 tracking-tight font-mono">
                    {money(totals.discount)}
                  </p>
                </div>

                {/* 5. Nộp dư */}
                <div className="relative overflow-hidden rounded-2xl border border-cyan-200 dark:border-cyan-900/60 bg-gradient-to-br from-cyan-50/90 via-white to-cyan-50/40 dark:from-slate-850 dark:via-slate-900 dark:to-cyan-950/30 p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
                      Nộp dư
                    </span>
                    <div className="h-8 w-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-xs">
                      <PlusCircle className="h-4 w-4" />
                    </div>
                  </div>
                  <p className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight font-mono">
                    {money(totals.excess)}
                  </p>
                </div>
              </div>

              {/* ── Form ghi nộp tiền / miễn giảm ── */}
              {entry && entryRow && (
                <form
                  onSubmit={saveEntry}
                  className="rounded-2xl border-2 border-indigo-400 dark:border-indigo-600 bg-gradient-to-b from-indigo-50/60 to-white dark:from-slate-850 dark:to-slate-900 p-5 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-slate-800">
                    <h3 className="font-bold text-sm sm:text-base text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-indigo-600" />
                      <span>
                        {entry.kind === 'payment' ? 'Ghi nhận nộp tiền' : 'Miễn / Giảm nghĩa vụ thu'} —{' '}
                        <strong className="text-blue-700 dark:text-blue-400">{entryRow.name}</strong> ({entryRow.code})
                      </span>
                    </h3>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEntry(undefined)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Ngày ghi nhận *
                      </label>
                      <input
                        type="date"
                        required
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        className={control}
                      />
                    </div>

                    {entry.kind === 'allowance' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Chế độ miễn giảm *
                        </label>
                        <select
                          value={allowanceMode}
                          onChange={(e) => setAllowanceMode(e.target.value)}
                          className={control}
                        >
                          {['Giảm', 'Miễn', 'Không áp dụng', 'Bình thường'].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {(entry.kind === 'payment' || allowanceMode === 'Giảm') && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {entry.kind === 'payment' ? 'Số tiền nộp' : 'Số tiền giảm'} (đồng) *
                        </label>
                        <input
                          type="number"
                          min={entry.kind === 'payment' ? 1 : 0}
                          step="1"
                          max="999999999999"
                          required
                          value={entryAmount}
                          onChange={(e) => setEntryAmount(e.target.value)}
                          placeholder="Ví dụ: 50000"
                          className={control}
                        />
                      </div>
                    )}

                    {entry.kind === 'payment' && (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Hình thức thanh toán *
                        </label>
                        <select
                          className={control}
                          value={method}
                          onChange={(e) => setMethod(e.target.value)}
                        >
                          {['Tiền mặt', 'Chuyển khoản', 'Khác'].map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {entry.kind === 'allowance' ? 'Lý do miễn / giảm *' : 'Ghi chú phiếu thu'}
                    </label>
                    <textarea
                      rows={2}
                      maxLength={10000}
                      required={entry.kind === 'allowance' && allowanceMode !== 'Bình thường'}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={
                        entry.kind === 'allowance'
                          ? 'Ghi rõ căn cứ (Ví dụ: Con hộ nghèo, đạt giải cấp tỉnh...)'
                          : 'Số biên lai, mã giao dịch hoặc người nộp hộ...'
                      }
                      className={control}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-indigo-100 dark:border-slate-800">
                    <button
                      disabled={blocked || selected.data.status !== 'Đang thu'}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      Lưu phiếu ghi nhận
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEntry(undefined)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                  </div>

                  {!!entryRow.transactions.length && (
                    <div className="space-y-2 pt-3 border-t border-indigo-100 dark:border-slate-800">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Lịch sử các lần nộp của học sinh ({entryRow.transactions.length} phiếu):
                      </h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {entryRow.transactions.map((t) => (
                          <div
                            key={t.id}
                            className={`p-2.5 rounded-xl text-xs border ${
                              t.data.state === 'Đã hủy'
                                ? 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 text-slate-400'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span
                                className={`font-mono ${
                                  t.data.state === 'Đã hủy' ? 'line-through text-slate-400' : 'text-emerald-700 dark:text-emerald-400'
                                }`}
                              >
                                {t.date} · {money(Number(t.data.amount))} · {t.data.method}
                              </span>
                              {t.data.state === 'Đã hủy' ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold">
                                  ĐÃ HỦY
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={blocked || selected.data.status !== 'Đang thu'}
                                  onClick={() => voidPayment(t)}
                                  className="text-rose-600 hover:text-rose-700 dark:text-rose-400 font-semibold hover:underline cursor-pointer"
                                >
                                  Hủy phiếu này
                                </button>
                              )}
                            </div>
                            {t.data.note && <p className="mt-1 text-slate-600 dark:text-slate-400">{t.data.note}</p>}
                            {t.data.state === 'Đã hủy' && (
                              <p className="mt-1 text-rose-600 dark:text-rose-400 italic">
                                Lý do hủy: {t.data.voidReason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </form>
              )}

              {/* ── Bộ lọc & Tìm kiếm ── */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80">
                <div className="relative flex-1 min-w-56">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên hoặc mã học sinh..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                  <select
                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Tất cả trạng thái ({rows.length})</option>
                    {['Chưa nộp', 'Nộp một phần', 'Đã nộp', 'Miễn', 'Không áp dụng', 'Nộp dư'].map(
                      (v) => (
                        <option key={v} value={v}>
                          {v} ({rows.filter((r) => r.status === v).length})
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="text-xs text-slate-500 font-medium ml-auto">
                  Hiển thị <strong className="text-slate-800 dark:text-slate-200">{visible.length}</strong> / {rows.length} học sinh
                </div>
              </div>

              {/* ── BẢNG DANH SÁCH HỌC SINH & THU NỘP (DỄ NHẬN DIỆN MÀU SẮC) ── */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs bg-white dark:bg-slate-900">
                <table className="w-full text-xs sm:text-sm text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3.5 pl-4 whitespace-nowrap">Học sinh</th>
                      <th className="p-3.5 whitespace-nowrap text-right">Phải nộp</th>
                      <th className="p-3.5 whitespace-nowrap text-right">Đã nộp</th>
                      <th className="p-3.5 whitespace-nowrap text-right">Còn thiếu</th>
                      <th className="p-3.5 whitespace-nowrap text-right">Nộp dư</th>
                      <th className="p-3.5 text-center whitespace-nowrap">Trạng thái</th>
                      <th className="p-3.5 pr-4 text-right whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visible.map((r, i) => (
                      <tr
                        key={r.studentId}
                        className={`transition-colors ${
                          i % 2 === 0
                            ? 'bg-white dark:bg-slate-900'
                            : 'bg-slate-50/50 dark:bg-slate-850/40'
                        } hover:bg-blue-50/40 dark:hover:bg-slate-800/60`}
                      >
                        {/* Học sinh */}
                        <td className="p-3.5 pl-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800">
                              {r.name.trim().split(' ').pop()?.charAt(0) || 'H'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white leading-tight">
                                {r.name}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                {r.code}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Phải nộp */}
                        <td className="p-3.5 whitespace-nowrap font-mono text-right font-medium text-slate-700 dark:text-slate-300">
                          {money(r.due)}
                        </td>

                        {/* Đã nộp (Màu xanh lá dễ nhận diện) */}
                        <td className="p-3.5 whitespace-nowrap font-mono text-right font-bold">
                          {r.paid > 0 ? (
                            <span className="text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md inline-block">
                              {money(r.paid)}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">0 đ</span>
                          )}
                        </td>

                        {/* Còn thiếu (Màu đỏ/hồng dễ nhận diện) */}
                        <td className="p-3.5 whitespace-nowrap font-mono text-right font-bold">
                          {r.remaining > 0 ? (
                            <span className="text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md inline-block">
                              {money(r.remaining)}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">0 đ</span>
                          )}
                        </td>

                        {/* Nộp dư (Màu lam/cyan) */}
                        <td className="p-3.5 whitespace-nowrap font-mono text-right font-bold">
                          {r.excess > 0 ? (
                            <span className="text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-md inline-block">
                              {money(r.excess)}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">0 đ</span>
                          )}
                        </td>

                        {/* Trạng thái (Huy hiệu màu sắc có icon) */}
                        <td className="p-3.5 whitespace-nowrap text-center">
                          {renderStatusBadge(r.status)}
                        </td>

                        {/* Thao tác */}
                        <td className="p-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <button
                              disabled={blocked}
                              onClick={() => openEntry(r.studentId, 'payment')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-600 dark:hover:text-white border border-blue-200 dark:border-blue-800 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              <Receipt className="h-3.5 w-3.5" />
                              <span>
                                {selected.data.status === 'Đang thu' ? 'Ghi nộp / Lịch sử' : 'Xem lịch sử'}
                              </span>
                            </button>

                            <button
                              disabled={blocked || selected.data.status !== 'Đang thu'}
                              onClick={() => openEntry(r.studentId, 'allowance')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-600 dark:hover:text-white border border-purple-200 dark:border-purple-800 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                              <BadgePercent className="h-3.5 w-3.5" />
                              <span>Miễn/giảm</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!visible.length && (
                  <div className="p-8 text-center text-slate-400">
                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium text-sm">Không tìm thấy học sinh phù hợp với bộ lọc hiện tại.</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 italic">
                * Tổng hợp được tính trên toàn bộ danh sách áp dụng. Học sinh mới thêm vào lớp không tự phát sinh nghĩa vụ nộp của đợt cũ. Mọi phiếu hủy đều được lưu vết trong lịch sử.
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}
