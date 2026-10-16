import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { HomeroomRecord } from '../types/homeroom';
import { collectionRows, money } from '../lib/collections';
import { exportCollectionToExcel } from '../lib/collectionExcelExport';
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
  Users,
  CheckSquare,
  Square,
  Sparkles,
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
    saveHomeroomRecordsBatch,
    deleteCollection,
    isLocalMode,
    currentUser,
    activeAccount,
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
  const [targetScope, setTargetScope] = useState<'all' | 'custom'>('all');
  const [memberSearch, setMemberSearch] = useState('');
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
  const [correctModal, setCorrectModal] = useState<{
    studentId: string;
    studentName: string;
    studentCode: string;
    payments: HomeroomRecord[];
    selectedPaymentId: string;
    actionType: 'void_only' | 'correct_amount';
    reason: string;
    customReason: string;
    newAmount: string;
    newMethod: string;
  } | null>(null);

  // Chọn cùng lúc nhiều học sinh nộp tiền
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState(localDateString());
  const [bulkMethod, setBulkMethod] = useState('Tiền mặt');
  const [bulkNote, setBulkNote] = useState('');
  const [bulkMode, setBulkMode] = useState<'remaining' | 'fixed'>('remaining');
  const [bulkFixedAmount, setBulkFixedAmount] = useState('');
  const [bulkCustomAmounts, setBulkCustomAmounts] = useState<Record<string, string>>({});

  const activeStudents = useMemo(() => students.filter((s) => s.status === 'active'), [students]);

  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    activeStudents.forEach((s) => {
      if (s.group && s.group.trim()) groups.add(s.group.trim());
    });
    return Array.from(groups).sort();
  }, [activeStudents]);

  const filteredCandidateStudents = useMemo(() => {
    if (!memberSearch.trim()) return activeStudents;
    const q = memberSearch.trim().toLowerCase();
    return activeStudents.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q) ||
        (s.group && s.group.toLowerCase().includes(q))
    );
  }, [activeStudents, memberSearch]);

  const handleScopeChange = (scope: 'all' | 'custom') => {
    setTargetScope(scope);
    const activeIds = activeStudents.map((s) => s.id);
    if (scope === 'all') {
      setMemberIds(activeIds);
    } else {
      if (memberIds.length === activeIds.length) {
        setMemberIds([]);
      }
    }
  };

  const selectByGroup = (groupName: string) => {
    const groupStudentIds = activeStudents
      .filter((s) => s.group?.trim() === groupName)
      .map((s) => s.id);
    const allInGroupSelected = groupStudentIds.every((id) => memberIds.includes(id));
    if (allInGroupSelected) {
      setMemberIds((ids) => ids.filter((id) => !groupStudentIds.includes(id)));
    } else {
      setMemberIds((ids) => Array.from(new Set([...ids, ...groupStudentIds])));
    }
  };

  const applyTemplate = (tmpl: {
    title: string;
    defaultAmount?: string;
    scope: 'all' | 'custom';
    desc?: string;
  }) => {
    setTitle(tmpl.title);
    if (tmpl.defaultAmount) setAmount(tmpl.defaultAmount);
    if (tmpl.desc) setDescription(tmpl.desc);
    handleScopeChange(tmpl.scope);
  };

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
    setMemberSearch('');

    const activeIds = students.filter((s) => s.status === 'active').map((s) => s.id);
    if (record) {
      try {
        const ids = JSON.parse(record.data.studentIds || '[]');
        setMemberIds(ids);
        setTargetScope(ids.length === activeIds.length ? 'all' : 'custom');
      } catch {
        setMemberIds(activeIds);
        setTargetScope('all');
      }
    } else {
      setMemberIds(activeIds);
      setTargetScope('all');
    }
    setCreateOpen(true);
    setMessage('');
  };

  const saveCollection = (e: React.FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (!title.trim()) {
        throw new Error('Vui lòng nhập tên khoản thu.');
      }
      if (!amount || isNaN(Number(amount)) || Number(amount) < 0) {
        throw new Error('Mức thu phải là số nguyên không âm.');
      }
      if (dueDate && dueDate < startDate) {
        throw new Error('Hạn nộp không được trước ngày bắt đầu.');
      }

      const activeIds = students.filter((s) => s.status === 'active').map((s) => s.id);
      const chosenIds = editing
        ? JSON.parse(editing.data.studentIds || '[]')
        : targetScope === 'all'
        ? activeIds
        : memberIds;

      if (!chosenIds || chosenIds.length === 0) {
        throw new Error('Vui lòng chọn ít nhất một học sinh áp dụng khoản thu này.');
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
          studentIds: editing?.data.studentIds || JSON.stringify(chosenIds),
          studentNames:
            editing?.data.studentNames ||
            JSON.stringify(
              Object.fromEntries(
                students.filter((s) => chosenIds.includes(s.id)).map((s) => [s.id, s.fullName])
              )
            ),
        },
      });
      setCreateOpen(false);
    });
  };

  const handleDeleteCollection = (col?: HomeroomRecord) => {
    const target = col || selected;
    if (!target) return;

    const txCount = records.filter(
      (r) => r.kind === 'payment' && r.data.collectionId === target.id
    ).length;
    const allowanceCount = records.filter(
      (r) => r.kind === 'allowance' && r.data.collectionId === target.id
    ).length;

    let confirmMsg = `Bạn có chắc chắn muốn xóa vĩnh viễn khoản thu "${target.data.name}" không?`;
    if (txCount > 0 || allowanceCount > 0) {
      confirmMsg = `⚠️ CẢNH BÁO NGUY HIỂM:\nKhoản thu "${target.data.name}" đang có ${txCount} phiếu nộp tiền và ${allowanceCount} bản ghi miễn/giảm.\n\nNếu xóa, toàn bộ dữ liệu và lịch sử thu nộp liên quan đến khoản thu này sẽ bị XÓA VĨNH VIỄN khỏi hệ thống!\n\nBạn có thực sự chắc chắn muốn xóa không?`;
    }

    if (!window.confirm(confirmMsg)) {
      return;
    }

    void run(async () => {
      await deleteCollection(target.id);
      if (createOpen && editing?.id === target.id) {
        setCreateOpen(false);
      }
      const remainingCols = collections.filter((c) => c.id !== target.id);
      setSelectedId(remainingCols[0]?.id || '');
    }, `Đã xóa vĩnh viễn khoản thu "${target.data.name}" thành công.`);
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

  const openCorrectModal = (studentId: string, specificPaymentId?: string) => {
    const row = rows.find((r) => r.studentId === studentId);
    if (!row) return;
    const activePayments = row.transactions.filter((t) => t.data.state !== 'Đã hủy');
    if (!activePayments.length) {
      alert('Học sinh này hiện chưa có phiếu nộp tiền nào để sửa/hủy.');
      return;
    }
    const defaultPayment =
      (specificPaymentId ? activePayments.find((p) => p.id === specificPaymentId) : null) ||
      activePayments[0];

    setCorrectModal({
      studentId,
      studentName: row.name,
      studentCode: row.code,
      payments: activePayments,
      selectedPaymentId: defaultPayment.id,
      actionType: 'void_only',
      reason: 'Học sinh thực tế chưa nộp tiền (Ghi nhận nhầm)',
      customReason: '',
      newAmount: defaultPayment.data.amount,
      newMethod: defaultPayment.data.method || 'Tiền mặt',
    });
  };

  const handleConfirmCorrection = async () => {
    if (!correctModal || !selected) return;
    const paymentToVoid = correctModal.payments.find((p) => p.id === correctModal.selectedPaymentId);
    if (!paymentToVoid) return;

    const finalReason =
      correctModal.reason === 'Khác'
        ? correctModal.customReason.trim() || 'Ghi nhận nhầm khi học sinh chưa nộp'
        : correctModal.reason;

    await run(async () => {
      // 1. Hủy phiếu nộp cũ với lý do
      await saveHomeroomRecord({
        id: paymentToVoid.id,
        kind: 'payment',
        studentId: paymentToVoid.studentId,
        date: paymentToVoid.date,
        data: {
          ...paymentToVoid.data,
          state: 'Đã hủy',
          voidReason: finalReason,
        },
      });

      // 2. Nếu chọn sửa lại số tiền nộp đúng
      if (correctModal.actionType === 'correct_amount' && Number(correctModal.newAmount) > 0) {
        await saveHomeroomRecord({
          kind: 'payment',
          studentId: paymentToVoid.studentId,
          date: localDateString(),
          data: {
            collectionId: selected.id,
            amount: correctModal.newAmount,
            method: correctModal.newMethod || 'Tiền mặt',
            note: `Ghi nhận lại sau khi điều chỉnh phiếu nhầm (${finalReason})`,
            state: 'Đã ghi nhận',
          },
        });
      }

      setCorrectModal(null);
      if (entry?.studentId === correctModal.studentId) {
        setEntry(undefined);
      }
    }, correctModal.actionType === 'void_only'
      ? `Đã hủy phiếu nộp nhầm của ${correctModal.studentName}. Trạng thái đã chuyển về Chưa nộp!`
      : `Đã cập nhật lại số tiền nộp đúng của ${correctModal.studentName} thành công!`);
  };

  const voidPayment = (paymentRecord: HomeroomRecord) => {
    openCorrectModal(paymentRecord.studentId, paymentRecord.id);
  };

  const exportExcel = () =>
    void run(async () => {
      if (!selected) return;
      exportCollectionToExcel({
        collection: selected,
        rows,
        records,
        classConfig,
        totals,
        teacherName: activeAccount?.displayName || currentUser?.displayName || 'Nguyễn Văn Sang',
      });
    }, 'Đã xuất tệp Excel thành công.');

  // Các hàm tiện ích chọn nhiều học sinh & nộp tiền hàng loạt
  const selectedSelectedRemainingTotal = useMemo(() => {
    return rows
      .filter((r) => selectedStudentIds.includes(r.studentId))
      .reduce((sum, r) => sum + r.remaining, 0);
  }, [rows, selectedStudentIds]);

  const toggleSelectAllVisible = () => {
    const visibleIds = visible.map((r) => r.studentId);
    if (visibleIds.length === 0) return;
    const allSelected = visibleIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const selectAllUnpaid = () => {
    const unpaidIds = rows.filter((r) => r.remaining > 0).map((r) => r.studentId);
    setSelectedStudentIds(unpaidIds);
  };

  const clearSelection = () => {
    setSelectedStudentIds([]);
  };

  const toggleSelectStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const openBulkModal = (initialIds?: string[]) => {
    if (!selected) return;
    const baseAmount = selected.data.amount || '0';
    let targetIds = initialIds && initialIds.length > 0 ? initialIds : selectedStudentIds;
    // Nếu chưa chọn ai, tự động chọn tất cả học sinh còn thiếu tiền
    if (targetIds.length === 0) {
      targetIds = rows.filter((r) => r.remaining > 0).map((r) => r.studentId);
    }
    if (targetIds.length === 0) {
      alert('Tất cả học sinh đã hoàn thành hoặc không có học sinh nào còn thiếu tiền để nộp.');
      return;
    }

    setSelectedStudentIds(targetIds);
    setBulkDate(localDateString());
    setBulkMethod('Tiền mặt');
    setBulkNote('');
    setBulkMode('remaining');
    setBulkFixedAmount(baseAmount);

    const amounts: Record<string, string> = {};
    targetIds.forEach((id) => {
      const row = rows.find((r) => r.studentId === id);
      const rem = row ? row.remaining : Number(baseAmount);
      amounts[id] = String(rem > 0 ? rem : Number(baseAmount));
    });
    setBulkCustomAmounts(amounts);
    setBulkModalOpen(true);
  };

  const handleBulkModeChange = (newMode: 'remaining' | 'fixed') => {
    setBulkMode(newMode);
    if (!selected) return;
    const baseAmount = selected.data.amount || '0';
    const updated = { ...bulkCustomAmounts };
    selectedStudentIds.forEach((id) => {
      if (newMode === 'remaining') {
        const row = rows.find((r) => r.studentId === id);
        const rem = row ? row.remaining : Number(baseAmount);
        updated[id] = String(rem > 0 ? rem : Number(baseAmount));
      } else {
        updated[id] = bulkFixedAmount || baseAmount;
      }
    });
    setBulkCustomAmounts(updated);
  };

  const handleBulkFixedAmountChange = (val: string) => {
    setBulkFixedAmount(val);
    if (bulkMode === 'fixed') {
      const updated = { ...bulkCustomAmounts };
      selectedStudentIds.forEach((id) => {
        updated[id] = val;
      });
      setBulkCustomAmounts(updated);
    }
  };

  const removeStudentFromBulk = (studentId: string) => {
    const nextIds = selectedStudentIds.filter((id) => id !== studentId);
    setSelectedStudentIds(nextIds);
    if (nextIds.length === 0) {
      setBulkModalOpen(false);
    }
  };

  const bulkTotalAmount = useMemo(() => {
    return selectedStudentIds.reduce((sum, id) => {
      const val = Number(bulkCustomAmounts[id]) || 0;
      return sum + (val > 0 ? val : 0);
    }, 0);
  }, [selectedStudentIds, bulkCustomAmounts]);

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || selectedStudentIds.length === 0) return;

    const validInputs: any[] = [];
    for (const studentId of selectedStudentIds) {
      const amountStr = (bulkCustomAmounts[studentId] || '0').trim();
      const amountNum = Number(amountStr);
      if (isNaN(amountNum) || amountNum <= 0) {
        continue;
      }
      validInputs.push({
        kind: 'payment',
        studentId,
        date: bulkDate,
        data: {
          collectionId: selected.id,
          amount: String(amountNum),
          method: bulkMethod,
          note: bulkNote.trim() ? `${bulkNote.trim()} (Thu hàng loạt)` : 'Thu hàng loạt',
          state: 'Đã ghi nhận',
        },
      });
    }

    if (validInputs.length === 0) {
      alert('Vui lòng nhập số tiền nộp hợp lệ (lớn hơn 0) cho ít nhất một học sinh.');
      return;
    }

    void run(async () => {
      await saveHomeroomRecordsBatch(validInputs);
      setBulkModalOpen(false);
      setSelectedStudentIds([]);
    }, `Đã ghi nhận nộp tiền thành công cho ${validInputs.length} học sinh! (Tổng: ${money(bulkTotalAmount)})`);
  };

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
          className="rounded-2xl border-2 border-blue-300 dark:border-blue-850 bg-gradient-to-b from-blue-50/70 via-white to-white dark:from-slate-850 dark:via-slate-900 dark:to-slate-900 p-5 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between pb-3 border-b border-blue-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-blue-950 dark:text-blue-100 leading-tight">
                  {editing ? 'Sửa thông tin khoản thu' : 'Tạo khoản thu mới'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {editing
                    ? 'Chỉnh sửa hạn nộp, trạng thái và ghi chú mục đích thu'
                    : 'Thiết lập khoản thu cho cả lớp hoặc nhóm học sinh chỉ định (Vé xe, BHYT, Đồng phục...)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setCreateOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Gợi ý mẫu khoản thu nhanh */}
          {!editing && (
            <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Gợi ý mẫu khoản thu phổ biến (Bấm 1 chạm để áp dụng nhanh):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    title: 'Tiền vé xe',
                    defaultAmount: '100000',
                    scope: 'custom' as const,
                    desc: 'Tiền vé gửi xe tháng theo danh sách học sinh đăng ký đi xe đạp / xe máy điện',
                    badge: 'Chỉ định riêng',
                    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
                  },
                  {
                    title: 'Quỹ lớp học kỳ',
                    defaultAmount: '200000',
                    scope: 'all' as const,
                    desc: 'Quỹ lớp phục vụ học tập, báo tường, văn nghệ, liên hoan và phong trào thi đua',
                    badge: 'Cả lớp',
                    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
                  },
                  {
                    title: 'Bảo hiểm y tế tự nguyện',
                    defaultAmount: '680400',
                    scope: 'custom' as const,
                    desc: 'BHYT học sinh tham gia đợt bổ sung tự nguyện theo quy định',
                    badge: 'Chỉ định riêng',
                    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
                  },
                  {
                    title: 'Tiền đồng phục may thêm',
                    defaultAmount: '150000',
                    scope: 'custom' as const,
                    desc: 'May thêm đồng phục áo khoác / áo sơ mi theo số lượng đăng ký',
                    badge: 'Chỉ định riêng',
                    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
                  },
                  {
                    title: 'Tiền vở & tài liệu học tập',
                    defaultAmount: '100000',
                    scope: 'all' as const,
                    desc: 'Vở ghi bài và tài liệu đề cương ôn tập môn học',
                    badge: 'Cả lớp',
                    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
                  },
                ].map((tmpl) => (
                  <button
                    key={tmpl.title}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer shadow-2xs active:scale-95"
                  >
                    <span>{tmpl.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold border ${tmpl.badgeColor}`}
                    >
                      {tmpl.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tên khoản thu *
              </label>
              <input
                className={control}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Tiền vé xe, Quỹ lớp Học kỳ 1, May đồng phục..."
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

          {/* Lựa chọn phạm vi đối tượng áp dụng */}
          {!editing ? (
            <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Phạm vi áp dụng khoản thu *
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Lựa chọn 1: Cả lớp */}
                <div
                  onClick={() => handleScopeChange('all')}
                  className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 select-none ${
                    targetScope === 'all'
                      ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-sm ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="targetScope"
                    checked={targetScope === 'all'}
                    onChange={() => handleScopeChange('all')}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span>Toàn bộ lớp ({activeStudents.length} học sinh)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Áp dụng thu đều cho tất cả học sinh trong lớp (Quỹ lớp, Tiền vở, Phí sinh hoạt...).
                    </p>
                  </div>
                </div>

                {/* Lựa chọn 2: Chỉ một số học sinh */}
                <div
                  onClick={() => handleScopeChange('custom')}
                  className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 select-none ${
                    targetScope === 'custom'
                      ? 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 shadow-sm ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="targetScope"
                    checked={targetScope === 'custom'}
                    onChange={() => handleScopeChange('custom')}
                    className="mt-1 h-4 w-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      <CheckSquare className="h-4 w-4 text-amber-600" />
                      <span>
                        Chỉ một số học sinh
                        {targetScope === 'custom' && (
                          <span className="ml-1.5 px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 text-[11px] font-bold">
                            {memberIds.length} HS được chọn
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Chỉ thu những học sinh có nhu cầu (Ví dụ: <strong>Vé xe</strong>, <strong>BHYT tự nguyện</strong>, <strong>Đồng phục</strong>...).
                    </p>
                  </div>
                </div>
              </div>

              {/* Panel Chọn danh sách học sinh cụ thể */}
              {targetScope === 'custom' && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/40 dark:bg-slate-900/80 p-3.5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-amber-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Danh sách học sinh áp dụng ({memberIds.length}/{activeStudents.length})
                      </span>
                      {Number(amount) > 0 && memberIds.length > 0 && (
                        <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold font-mono bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900">
                          Tổng dự kiến: {money(memberIds.length * Number(amount))}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMemberIds(activeStudents.map((s) => s.id))}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 transition shadow-2xs cursor-pointer"
                      >
                        Chọn tất cả ({activeStudents.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemberIds([])}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
                      >
                        Bỏ chọn hết
                      </button>
                    </div>
                  </div>

                  {/* Thanh tìm kiếm & chọn nhanh theo Tổ */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-48">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Tìm nhanh học sinh theo tên, mã HS..."
                        className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      {memberSearch && (
                        <button
                          type="button"
                          onClick={() => setMemberSearch('')}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {availableGroups.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-500 shrink-0">Chọn theo tổ:</span>
                        {availableGroups.map((grp) => {
                          const grpIds = activeStudents.filter((s) => s.group?.trim() === grp).map((s) => s.id);
                          const isAllInGrp = grpIds.length > 0 && grpIds.every((id) => memberIds.includes(id));
                          return (
                            <button
                              key={grp}
                              type="button"
                              onClick={() => selectByGroup(grp)}
                              className={`px-2 py-1 rounded-md text-[11px] font-bold border transition cursor-pointer ${
                                isAllInGrp
                                  ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-amber-50'
                              }`}
                            >
                              {grp}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Danh sách học sinh dạng lưới thẻ chọn */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
                    {filteredCandidateStudents.map((s) => {
                      const isChecked = memberIds.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() =>
                            setMemberIds((ids) =>
                              isChecked ? ids.filter((id) => id !== s.id) : [...ids, s.id]
                            )
                          }
                          className={`flex items-center gap-2.5 p-2 rounded-lg border transition cursor-pointer select-none ${
                            isChecked
                              ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 dark:border-amber-700 shadow-2xs'
                              : 'bg-slate-50/50 dark:bg-slate-850/40 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer pointer-events-none"
                          />
                          <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {s.fullName.trim().split(' ').pop()?.charAt(0) || 'H'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-bold truncate leading-tight ${isChecked ? 'text-amber-950 dark:text-amber-100' : 'text-slate-800 dark:text-slate-200'}`}>
                              {s.fullName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {s.studentCode} {s.group ? `· ${s.group}` : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}

                    {filteredCandidateStudents.length === 0 && (
                      <div className="col-span-full py-4 text-center text-xs text-slate-400">
                        Không tìm thấy học sinh nào khớp với từ khóa "{memberSearch}".
                      </div>
                    )}
                  </div>

                  {memberIds.length === 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Vui lòng tích chọn ít nhất 1 học sinh áp dụng khoản thu (ví dụ học sinh đăng ký vé xe).</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Phạm vi áp dụng: <strong>{memberIds.length} học sinh</strong>
              </p>
              <p className="italic mt-0.5">
                * Mức thu và danh sách học sinh áp dụng được giữ nguyên theo ban đầu để đảm bảo tính toàn vẹn của sổ sách kế toán. Nếu học sinh không tiếp tục thu, vui lòng dùng chức năng “Miễn/giảm” hoặc “Không áp dụng” cho từng em.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                disabled={blocked || (!editing && targetScope === 'custom' && memberIds.length === 0)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
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

            {editing && (
              <button
                type="button"
                disabled={blocked}
                onClick={() => handleDeleteCollection(editing)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="Xóa vĩnh viễn khoản thu này"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa khoản thu này</span>
              </button>
            )}
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
                setSelectedStudentIds([]);
              }}
            >
              {collections.map((c) => {
                let memberCount = 0;
                try {
                  memberCount = JSON.parse(c.data.studentIds || '[]').length;
                } catch {
                  memberCount = students.length;
                }
                const isCustom = memberCount > 0 && memberCount < students.length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.data.name} · {money(Number(c.data.amount))} · {isCustom ? `[Riêng: ${memberCount} HS]` : '[Cả lớp]'} · {c.data.status}
                  </option>
                );
              })}
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

              {(() => {
                let memberCount = 0;
                try {
                  memberCount = JSON.parse(selected.data.studentIds || '[]').length;
                } catch {
                  memberCount = rows.length;
                }
                const isCustom = memberCount > 0 && memberCount < students.length;
                return (
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-2xs ${
                      isCustom
                        ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                    }`}
                    title={isCustom ? 'Khoản thu áp dụng cho nhóm học sinh cụ thể (vd: Vé xe, BHYT tự nguyện)' : 'Khoản thu áp dụng cho cả lớp'}
                  >
                    <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>
                      Phạm vi: <strong>{isCustom ? `Chỉ định riêng (${memberCount} HS)` : `Toàn bộ lớp (${memberCount} HS)`}</strong>
                    </span>
                  </span>
                );
              })()}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selected.data.status === 'Đang thu' && (
                <button
                  disabled={blocked}
                  onClick={() => openBulkModal()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
                  title="Ghi nhận nộp tiền cùng lúc cho nhiều học sinh"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>
                    Thu tiền nhiều HS{selectedStudentIds.length > 0 ? ` (${selectedStudentIds.length})` : ''}
                  </span>
                </button>
              )}

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

              <button
                disabled={blocked}
                onClick={() => handleDeleteCollection(selected)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                title="Xóa vĩnh viễn khoản thu này"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>Xóa khoản thu</span>
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

                  {entry.kind === 'payment' && entryRow.paid > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-900 dark:text-amber-200">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>
                          Đã ghi nhận nộp: <strong className="font-mono text-emerald-700 dark:text-emerald-300 text-sm">{money(entryRow.paid)}</strong>
                          {entryRow.remaining === 0 ? ' (Đã nộp đủ)' : ` (Còn thiếu: ${money(entryRow.remaining)})`}.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openCorrectModal(entryRow.studentId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs active:scale-95 cursor-pointer shrink-0 self-start sm:self-auto"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Sửa nộp nhầm (Chuyển về Chưa nộp)</span>
                      </button>
                    </div>
                  )}

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
                                  onClick={() => openCorrectModal(entryRow.studentId, t.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold transition cursor-pointer"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  <span>Sửa / Hủy phiếu này</span>
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

              {/* ── Banner Thao Tác Nộp Tiền Hàng Loạt Khi Có Học Sinh Được Chọn ── */}
              {selectedStudentIds.length > 0 && selected.data.status === 'Đang thu' && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 dark:from-indigo-950/50 dark:via-purple-950/40 dark:to-blue-950/50 border-2 border-indigo-300 dark:border-indigo-700 shadow-md animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs font-bold text-sm shrink-0">
                      {selectedStudentIds.length}
                    </span>
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">
                        Đang chọn <strong>{selectedStudentIds.length}</strong> học sinh
                        <span className="text-slate-600 dark:text-slate-300 font-normal">
                          {' '}· Tổng số tiền còn thiếu: <strong className="font-mono text-rose-600 dark:text-rose-400 font-bold">{money(selectedSelectedRemainingTotal)}</strong>
                        </span>
                      </p>
                      <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                        Bấm “Ghi nộp tiền ngay” để ghi nhận đồng thời phiếu thu cho tất cả học sinh đã chọn.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={blocked}
                      onClick={() => openBulkModal()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md shadow-indigo-500/25 transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <Receipt className="h-4 w-4" />
                      <span>Ghi nộp tiền ngay ({selectedStudentIds.length} HS)</span>
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Bỏ chọn</span>
                    </button>
                  </div>
                </div>
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

                {/* Nút chọn nhanh tiện lợi */}
                {selected.data.status === 'Đang thu' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={selectAllUnpaid}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition cursor-pointer active:scale-95"
                      title="Chọn tất cả học sinh chưa hoàn thành nộp tiền"
                    >
                      <CheckSquare className="h-3.5 w-3.5 text-amber-600" />
                      <span>Chọn tất cả chưa nộp ({rows.filter((r) => r.remaining > 0).length})</span>
                    </button>

                    {selectedStudentIds.length > 0 && (
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Hủy bỏ việc chọn học sinh"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Bỏ chọn</span>
                      </button>
                    )}
                  </div>
                )}

                <div className="text-xs text-slate-500 font-medium ml-auto flex items-center gap-1.5 flex-wrap justify-end">
                  <span>
                    Hiển thị <strong className="text-slate-800 dark:text-slate-200">{visible.length}</strong> / {rows.length} học sinh
                  </span>
                  {rows.length < students.length && (
                    <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                      (Áp dụng riêng {rows.length}/{students.length} HS)
                    </span>
                  )}
                </div>
              </div>

              {/* ── BẢNG DANH SÁCH HỌC SINH & THU NỘP (DỄ NHẬN DIỆN MÀU SẮC) ── */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs bg-white dark:bg-slate-900">
                <table className="w-full text-xs sm:text-sm text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      {selected.data.status === 'Đang thu' && (
                        <th className="p-3.5 pl-4 w-11 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={visible.length > 0 && visible.every((r) => selectedStudentIds.includes(r.studentId))}
                            onChange={toggleSelectAllVisible}
                            className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            title="Chọn / Bỏ chọn tất cả học sinh đang hiển thị"
                          />
                        </th>
                      )}
                      <th className={`p-3.5 ${selected.data.status === 'Đang thu' ? 'pl-2' : 'pl-4'} whitespace-nowrap`}>Học sinh</th>
                      <th className="p-3.5 whitespace-nowrap text-right">Phải nộp</th>
                      <th className="p-3.5 whitespace-nowrap text-right">Đã nộp</th>
                      <th className="p-3.5 whitespace-nowrap text-right">Còn thiếu</th>
                      <th className="p-3.5 whitespace-nowrap text-right">Nộp dư</th>
                      <th className="p-3.5 text-center whitespace-nowrap">Trạng thái</th>
                      <th className="p-3.5 pr-4 text-right whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visible.map((r, i) => {
                      const isSelected = selectedStudentIds.includes(r.studentId);
                      return (
                        <tr
                          key={r.studentId}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                              : i % 2 === 0
                              ? 'bg-white dark:bg-slate-900'
                              : 'bg-slate-50/50 dark:bg-slate-850/40'
                          } hover:bg-blue-50/40 dark:hover:bg-slate-800/60`}
                        >
                          {/* Checkbox chọn nộp hàng loạt */}
                          {selected.data.status === 'Đang thu' && (
                            <td className="p-3.5 pl-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectStudent(r.studentId)}
                                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                          )}

                          {/* Học sinh */}
                          <td className={`p-3.5 ${selected.data.status === 'Đang thu' ? 'pl-2' : 'pl-4'}`}>
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

                            {/* Nút sửa nộp nhầm hiển thị trực tiếp khi học sinh đã có tiền nộp */}
                            {r.paid > 0 && selected.data.status === 'Đang thu' && (
                              <button
                                disabled={blocked}
                                onClick={() => openCorrectModal(r.studentId)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white border border-rose-200 dark:border-rose-800 shadow-2xs transition active:scale-95 cursor-pointer"
                                title="Nhấn để sửa khoản thu nếu ghi nhận nhầm là đã nộp"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Sửa nộp nhầm</span>
                              </button>
                            )}

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
                    );
                    })}
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

      {/* ── MODAL SỬA KHOẢN THU NỘP NHẦM / HỦY PHIẾU ── */}
      {correctModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    Sửa khoản thu đã nộp nhầm
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Học sinh: <strong className="text-blue-600 dark:text-blue-400">{correctModal.studentName}</strong> ({correctModal.studentCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCorrectModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* If student has multiple payments, let teacher pick which one */}
            {correctModal.payments.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Chọn phiếu nộp cần xử lý:
                </label>
                <select
                  value={correctModal.selectedPaymentId}
                  onChange={(e) => {
                    const p = correctModal.payments.find((x) => x.id === e.target.value);
                    setCorrectModal({
                      ...correctModal,
                      selectedPaymentId: e.target.value,
                      newAmount: p ? p.data.amount : correctModal.newAmount,
                      newMethod: p?.data.method || 'Tiền mặt',
                    });
                  }}
                  className={control}
                >
                  {correctModal.payments.map((p) => (
                    <option key={p.id} value={p.id}>
                      Ngày {p.date} · {money(Number(p.data.amount))} · {p.data.method} {p.data.note ? `(${p.data.note})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Chosen Payment Card Summary */}
            {(() => {
              const currentPayment = correctModal.payments.find((p) => p.id === correctModal.selectedPaymentId) || correctModal.payments[0];
              if (!currentPayment) return null;
              return (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                  <div>
                    <span className="font-semibold">Phiếu đã ghi nhận: </span>
                    <strong className="font-mono text-sm text-rose-700 dark:text-rose-300">
                      {money(Number(currentPayment.data.amount))}
                    </strong>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Ngày nộp: {currentPayment.date} · Hình thức: {currentPayment.data.method}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full font-bold bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200 text-[10px]">
                    Đang tính là Đã nộp
                  </span>
                </div>
              );
            })()}

            {/* Action Type Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Thầy/Cô muốn thực hiện thao tác nào?
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCorrectModal({ ...correctModal, actionType: 'void_only' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    correctModal.actionType === 'void_only'
                      ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 ring-2 ring-rose-400'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Chưa nộp (Hủy ghi nhận)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCorrectModal({ ...correctModal, actionType: 'correct_amount' })}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    correctModal.actionType === 'correct_amount'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 ring-2 ring-blue-400'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Sửa lại số tiền đúng</span>
                </button>
              </div>
            </div>

            {/* If correcting amount */}
            {correctModal.actionType === 'correct_amount' && (
              <div className="grid sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số tiền thực nộp đúng (đồng) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={correctModal.newAmount}
                    onChange={(e) => setCorrectModal({ ...correctModal, newAmount: e.target.value })}
                    className={control}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Hình thức *
                  </label>
                  <select
                    value={correctModal.newMethod}
                    onChange={(e) => setCorrectModal({ ...correctModal, newMethod: e.target.value })}
                    className={control}
                  >
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Chuyển khoản">Chuyển khoản</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>
            )}

            {/* Quick Reason Radio Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Lý do điều chỉnh / hủy phiếu:
              </label>
              <div className="space-y-1.5">
                {[
                  'Học sinh thực tế chưa nộp tiền (Ghi nhận nhầm)',
                  'Ghi nhầm sang tên học sinh khác',
                  'Nhầm số tiền / Cần điều chỉnh lại',
                  'Khác',
                ].map((reasonOption) => (
                  <label
                    key={reasonOption}
                    className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs"
                  >
                    <input
                      type="radio"
                      name="voidReasonOption"
                      checked={correctModal.reason === reasonOption}
                      onChange={() => setCorrectModal({ ...correctModal, reason: reasonOption })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {reasonOption}
                    </span>
                  </label>
                ))}
              </div>

              {correctModal.reason === 'Khác' && (
                <input
                  type="text"
                  placeholder="Nhập lý do cụ thể..."
                  value={correctModal.customReason}
                  onChange={(e) => setCorrectModal({ ...correctModal, customReason: e.target.value })}
                  className={`${control} mt-2 text-xs`}
                />
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCorrectModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleConfirmCorrection}
                className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                  correctModal.actionType === 'void_only'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
                }`}
              >
                {correctModal.actionType === 'void_only'
                  ? '✓ Xác nhận chuyển về Chưa nộp'
                  : '✓ Lưu số tiền đã sửa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL GHI NHẬN NỘP TIỀN HÀNG LOẠT (CÙNG LÚC NHIỀU HỌC SINH) ── */}
      {bulkModalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Ghi nhận nộp tiền hàng loạt</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {selectedStudentIds.length} học sinh
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Khoản thu: <strong className="text-blue-600 dark:text-blue-400">{selected.data.name}</strong> · Định mức: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{money(Number(selected.data.amount))}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setBulkModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleBulkSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Thiết lập chung */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Ngày nộp *
                    </label>
                    <input
                      type="date"
                      required
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                      className={control}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Hình thức thanh toán *
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['Tiền mặt', 'Chuyển khoản', 'Khác'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setBulkMethod(m)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                            bulkMethod === m
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ghi chú chung (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={bulkNote}
                    onChange={(e) => setBulkNote(e.target.value)}
                    placeholder="VD: Nộp tiền đợt 1, Thu đầu buổi học..."
                    className={control}
                  />
                </div>

                {/* Chế độ áp dụng số tiền */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Quy tắc tính số tiền nộp cho từng học sinh:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label
                      onClick={() => handleBulkModeChange('remaining')}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                        bulkMode === 'remaining'
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-400 text-indigo-950 dark:text-indigo-200 font-semibold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bulkMode"
                        checked={bulkMode === 'remaining'}
                        onChange={() => handleBulkModeChange('remaining')}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <p className="font-bold">Nộp đủ số tiền còn thiếu</p>
                        <p className="text-[11px] opacity-80 mt-0.5">Tự động nộp đúng số tiền còn nợ của từng bạn</p>
                      </div>
                    </label>

                    <label
                      onClick={() => handleBulkModeChange('fixed')}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition text-xs ${
                        bulkMode === 'fixed'
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-400 text-indigo-950 dark:text-indigo-200 font-semibold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="bulkMode"
                        checked={bulkMode === 'fixed'}
                        onChange={() => handleBulkModeChange('fixed')}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <p className="font-bold">Áp dụng cùng một mức thu</p>
                        <input
                          type="number"
                          min={0}
                          value={bulkFixedAmount}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleBulkFixedAmountChange(e.target.value)}
                          placeholder="Nhập số tiền..."
                          disabled={bulkMode !== 'fixed'}
                          className="w-full mt-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                        />
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Danh sách học sinh được chọn */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Danh sách học sinh được nộp ({selectedStudentIds.length} em) — có thể sửa số tiền riêng từng bạn:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const unpaidIds = rows.filter((r) => r.remaining > 0).map((r) => r.studentId);
                      setSelectedStudentIds(unpaidIds);
                      const amounts: Record<string, string> = {};
                      unpaidIds.forEach((id) => {
                        const row = rows.find((r) => r.studentId === id);
                        amounts[id] = String(row ? row.remaining : Number(selected.data.amount));
                      });
                      setBulkCustomAmounts(amounts);
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                  >
                    + Thêm tất cả HS chưa nộp
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {selectedStudentIds.map((id, index) => {
                    const row = rows.find((r) => r.studentId === id);
                    if (!row) return null;
                    return (
                      <div
                        key={id}
                        className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-44 flex-1">
                          <span className="text-[11px] font-mono text-slate-400 w-5 text-right shrink-0">
                            {index + 1}.
                          </span>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                              {row.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              {row.code} · Còn thiếu:{' '}
                              <strong className={row.remaining > 0 ? 'text-rose-600 font-mono' : 'text-emerald-600 font-mono'}>
                                {money(row.remaining)}
                              </strong>
                            </p>
                          </div>
                        </div>

                        {/* Ô nhập số tiền cho bạn này */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              value={bulkCustomAmounts[id] ?? ''}
                              onChange={(e) =>
                                setBulkCustomAmounts({
                                  ...bulkCustomAmounts,
                                  [id]: e.target.value,
                                })
                              }
                              className="w-28 sm:w-32 py-1 pl-2.5 pr-6 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-right text-indigo-950 dark:text-indigo-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 pointer-events-none">
                              đ
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeStudentFromBulk(id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title="Loại học sinh này khỏi đợt nộp"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tóm tắt thanh toán */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 via-purple-50 to-emerald-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-emerald-950/30 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs text-indigo-900 dark:text-indigo-300 font-medium">
                    Tổng số học sinh nộp tiền đợt này:
                  </p>
                  <p className="text-sm sm:text-base font-bold text-indigo-950 dark:text-white">
                    {selectedStudentIds.length} học sinh
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-800 dark:text-emerald-400 font-medium">
                    Tổng số tiền thực thu:
                  </p>
                  <p className="text-lg sm:text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    {money(bulkTotalAmount)}
                  </p>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-xs transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={busy || selectedStudentIds.length === 0 || bulkTotalAmount <= 0}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-700 hover:to-emerald-700 text-white shadow-lg shadow-indigo-500/25 active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      <span>Đang ghi nhận...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>
                        Xác nhận ghi nộp ({selectedStudentIds.length} HS · {money(bulkTotalAmount)})
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
