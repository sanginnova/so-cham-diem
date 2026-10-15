import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import type { Student } from '../types';
import type { SeatingChartConfig, StudentGroupInfo } from '../types/seatingChart';
import {
  DEFAULT_SEATING_CONFIG,
  loadSeatingConfig,
  loadGroupAssignments,
  autoAssignGroups,
  autoAssignSeatsByGroup,
  autoAssignSeatsBalanced,
  generateSeatingChartDocx,
  getSeatingStorageKey,
} from '../lib/seatingChart';
import {
  LayoutGrid,
  Users,
  Download,
  Save,
  RotateCcw,
  Sparkles,
  Crown,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Plus,
  ArrowRightLeft,
  ChevronDown,
  Monitor,
  Laptop,
  DoorOpen,
  Info,
} from 'lucide-react';

const GROUP_COLORS: Record<string, { bg: string; text: string; border: string; badgeBg: string }> = {
  'Tổ 1': {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-800',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200',
  },
  'Tổ 2': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-800',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200',
  },
  'Tổ 3': {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200',
  },
  'Tổ 4': {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-800',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200',
  },
};

export function SeatingChartView() {
  const {
    students,
    classConfig,
    userRole,
    homeroomRecords: records,
    saveHomeroomRecord,
    isLocalMode,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'seating' | 'groups'>('seating');
  const [config, setConfig] = useState<SeatingChartConfig>(() =>
    loadSeatingConfig(classConfig.teacherId, classConfig.id, records)
  );
  const [groupMap, setGroupMap] = useState<Record<string, StudentGroupInfo>>(() =>
    loadGroupAssignments(students, records)
  );

  const [selectedSeat, setSelectedSeat] = useState<{ col: number; row: number; seatIndex: number } | null>(
    null
  );
  const [selectedStudentForPlacement, setSelectedStudentForPlacement] = useState<string | null>(null);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Sync state when records/students change
  useEffect(() => {
    setConfig(loadSeatingConfig(classConfig.teacherId, classConfig.id, records));
    setGroupMap(loadGroupAssignments(students, records));
  }, [classConfig.id, records]);

  const activeStudents = useMemo(() => students.filter((s) => s.status === 'active'), [students]);
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  // Set of studentIds that are seated in the room
  const seatedStudentIds = useMemo(() => {
    const set = new Set<string>();
    Object.values(config.desks || {}).forEach((seats) => {
      seats.forEach((id) => {
        if (id) set.add(id);
      });
    });
    return set;
  }, [config.desks]);

  const unseatedStudents = useMemo(
    () => activeStudents.filter((s) => !seatedStudentIds.has(s.id)),
    [activeStudents, seatedStudentIds]
  );

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Lưu toàn bộ Sơ đồ lớp & Phân tổ lên Cloud Firestore và LocalStorage
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Lưu Seating Config vào localStorage
      localStorage.setItem(
        getSeatingStorageKey(classConfig.teacherId, classConfig.id),
        JSON.stringify(config)
      );

      // 2. Lưu Seating Config vào Cloud homeroomRecords
      const existingConfigRecord = records.find(
        (r) => r.kind === 'profile' && r.studentId === '__seating_chart__'
      );

      await saveHomeroomRecord({
        id: existingConfigRecord?.id,
        kind: 'profile',
        studentId: '__seating_chart__',
        date: new Date().toISOString().slice(0, 10),
        data: {
          configJson: JSON.stringify(config),
          updatedAt: new Date().toISOString(),
        },
      });

      // 3. Lưu Tổ và Chức vụ của từng học sinh vào profile record
      const promises = Object.values(groupMap).map(async (info) => {
        const existingProfile = records.find(
          (r) => r.kind === 'profile' && r.studentId === info.studentId
        );
        await saveHomeroomRecord({
          id: existingProfile?.id,
          kind: 'profile',
          studentId: info.studentId,
          date: existingProfile?.date || new Date().toISOString().slice(0, 10),
          data: {
            ...(existingProfile?.data || {}),
            group: info.group,
            duty: info.duty,
          },
        });
      });

      await Promise.all(promises);
      showToast(
        isLocalMode
          ? 'Đã lưu Sơ đồ lớp & Phân tổ trên thiết bị!'
          : 'Đã lưu Sơ đồ lớp & Phân tổ lên Đám mây (Cloud Firestore)!',
        'success'
      );
    } catch (e) {
      showToast('Lỗi khi lưu: ' + (e as Error).message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Xuất file Word DOCX
  const handleExportDocx = async () => {
    setIsExporting(true);
    try {
      const blob = await generateSeatingChartDocx({
        className: classConfig.className,
        schoolYear: classConfig.schoolYear,
        homeroomTeacher: classConfig.homeroomTeacher || '',
        schoolName: classConfig.schoolName || 'TRƯỜNG CAO ĐẲNG NGHỀ SỐ 1 - BQP',
        department: 'KHOA CƠ BẢN',
        students: activeStudents,
        classConfig,
        config,
        groupMap,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `So_do_lop_va_Phan_to_${classConfig.className}_${new Date().toISOString().slice(0, 10)}.docx`.replace(
        /[\\/:*?"<>|]/g,
        '_'
      );
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Đã tạo và tải file Word (.docx) thành công!', 'success');
    } catch (e) {
      showToast('Lỗi khi xuất Word: ' + (e as Error).message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Xử lý click chọn ghế trong sơ đồ
  const handleSeatClick = (col: number, row: number, seatIndex: number) => {
    const deskKey = `${col}_${row}`;
    const currentSeats = [...(config.desks[deskKey] || Array(config.seatsPerDesk).fill(null))];
    const currentStudentId = currentSeats[seatIndex];

    // Trường hợp 1: Đang có học sinh chưa xếp chỗ được chọn -> Đặt vào ghế này
    if (selectedStudentForPlacement) {
      const targetStudent = studentMap.get(selectedStudentForPlacement);
      // Xóa học sinh này khỏi ghế cũ nếu đã ngồi đâu đó
      const updatedDesks = { ...config.desks };
      Object.keys(updatedDesks).forEach((k) => {
        updatedDesks[k] = updatedDesks[k].map((id) => (id === selectedStudentForPlacement ? null : id));
      });

      // Gán vào ghế mới
      currentSeats[seatIndex] = selectedStudentForPlacement;
      updatedDesks[deskKey] = currentSeats;

      setConfig({ ...config, desks: updatedDesks });
      setSelectedStudentForPlacement(null);
      setSelectedSeat(null);
      showToast(`Đã xếp ${targetStudent?.fullName || 'học sinh'} vào Dãy ${col} - Bàn ${row}`);
      return;
    }

    // Trường hợp 2: Chưa chọn ghế nào -> Bấm chọn ghế này
    if (!selectedSeat) {
      if (currentStudentId) {
        setSelectedSeat({ col, row, seatIndex });
        showToast(
          `Đã chọn ${studentMap.get(currentStudentId)?.fullName}. Hãy bấm vào một ghế khác để đổi chỗ hoặc chuyển ghế.`,
          'info'
        );
      }
      return;
    }

    // Trường hợp 3: Đã chọn 1 ghế trước đó và bấm vào chính nó -> Hủy chọn
    if (
      selectedSeat.col === col &&
      selectedSeat.row === row &&
      selectedSeat.seatIndex === seatIndex
    ) {
      setSelectedSeat(null);
      return;
    }

    // Trường hợp 4: Đã chọn ghế A, bấm vào ghế B -> Hoán đổi hoặc Chuyển chỗ!
    const sourceDeskKey = `${selectedSeat.col}_${selectedSeat.row}`;
    const sourceSeats = [
      ...(config.desks[sourceDeskKey] || Array(config.seatsPerDesk).fill(null)),
    ];
    const sourceStudentId = sourceSeats[selectedSeat.seatIndex];

    // Swap
    sourceSeats[selectedSeat.seatIndex] = currentStudentId;
    currentSeats[seatIndex] = sourceStudentId;

    const nextDesks = {
      ...config.desks,
      [sourceDeskKey]: sourceSeats,
      [deskKey]: currentSeats,
    };

    setConfig({ ...config, desks: nextDesks });
    setSelectedSeat(null);

    const sName = studentMap.get(sourceStudentId || '')?.fullName || '';
    const tName = currentStudentId ? studentMap.get(currentStudentId)?.fullName : 'ghế trống';
    showToast(`Đã đổi chỗ giữa ${sName} và ${tName}!`);
  };

  // Nhấc học sinh ra khỏi ghế
  const handleRemoveFromSeat = (e: React.MouseEvent, col: number, row: number, seatIndex: number) => {
    e.stopPropagation();
    const deskKey = `${col}_${row}`;
    const seats = [...(config.desks[deskKey] || Array(config.seatsPerDesk).fill(null))];
    const removedId = seats[seatIndex];
    seats[seatIndex] = null;
    setConfig({
      ...config,
      desks: {
        ...config.desks,
        [deskKey]: seats,
      },
    });
    if (
      selectedSeat?.col === col &&
      selectedSeat?.row === row &&
      selectedSeat?.seatIndex === seatIndex
    ) {
      setSelectedSeat(null);
    }
    showToast(`Đã đưa ${studentMap.get(removedId || '')?.fullName} về danh sách chờ.`);
  };

  // Tự động phân chia 4 tổ
  const handleAutoAssignGroups = () => {
    if (
      window.confirm(
        'Tự động phân chia đều học sinh của lớp vào 4 tổ (cân bằng nam/nữ)? Cấu hình tổ cũ sẽ được cập nhật lại.'
      )
    ) {
      const newGroups = autoAssignGroups(activeStudents, 4);
      setGroupMap(newGroups);
      showToast('Đã phân đều học sinh vào 4 tổ thành công!');
    }
  };

  // Tự động xếp chỗ theo tổ
  const handleAutoAssignSeatsByGroup = () => {
    if (
      window.confirm(
        'Tự động xếp chỗ ngồi: Tổ 1 ngồi Dãy 1, Tổ 2 ngồi Dãy 2, Tổ 3 ngồi Dãy 3, Tổ 4 ngồi Dãy 4?'
      )
    ) {
      const next = autoAssignSeatsByGroup(config, activeStudents, groupMap);
      setConfig(next);
      showToast('Đã tự động xếp chỗ ngồi theo Tổ!');
    }
  };

  // Tự động xếp nam nữ xen kẽ
  const handleAutoAssignSeatsBalanced = () => {
    if (window.confirm('Tự động xếp chỗ ngồi nam - nữ xen kẽ ở từng bàn?')) {
      const next = autoAssignSeatsBalanced(config, activeStudents);
      setConfig(next);
      showToast('Đã xếp chỗ nam - nữ xen kẽ thành công!');
    }
  };

  // Xóa trắng sơ đồ chỗ ngồi
  const handleClearSeating = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ chỗ ngồi đã xếp trên sơ đồ?')) {
      setConfig({ ...config, desks: {} });
      setSelectedSeat(null);
      setSelectedStudentForPlacement(null);
      showToast('Đã xóa sơ đồ chỗ ngồi.');
    }
  };

  // Cập nhật tổ của 1 học sinh
  const handleUpdateStudentGroup = (studentId: string, group: string) => {
    setGroupMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { studentId, duty: 'Thành viên' }),
        group,
      },
    }));
  };

  // Cập nhật chức vụ của 1 học sinh
  const handleUpdateStudentDuty = (studentId: string, duty: string) => {
    setGroupMap((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { studentId, group: '' }),
        duty,
      },
    }));
  };

  return (
    <section className="space-y-5 text-slate-800 dark:text-slate-100">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Sơ đồ lớp & Phân chia tổ
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Lớp <strong>{classConfig.className}</strong> · Năm học {classConfig.schoolYear} · GVCN: {classConfig.homeroomTeacher || 'Chưa cập nhật'} · Sĩ số: {activeStudents.length} học sinh.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportDocx}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 active:scale-95 transition cursor-pointer disabled:opacity-50"
            title="Xuất tệp Word (.docx) khổ ngang in ấn chuẩn nộp Ban giám hiệu"
          >
            <Download className="h-4 w-4" />
            <span>{isExporting ? 'Đang tạo Word…' : 'Xuất Sơ đồ & Phân tổ (.docx)'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 active:scale-95 transition cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Đang lưu…' : 'Lưu thay đổi'}</span>
          </button>
        </div>
      </div>

      {/* ── Toast message ── */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 ${
            message.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
              : message.type === 'info'
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : message.type === 'info' ? (
            <Info className="h-4 w-4 shrink-0 text-blue-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Tab Selector ── */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-3">
        <button
          onClick={() => setActiveTab('seating')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'seating'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span>1. Sơ đồ chỗ ngồi lớp học</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {seatedStudentIds.size}/{activeStudents.length} đã ngồi
          </span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`pb-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === 'groups'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>2. Phân chia tổ & Cán sự lớp</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: SƠ ĐỒ CHỖ NGỒI (SEATING CHART)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'seating' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                <span>Số dãy bàn:</span>
                <select
                  value={config.columns}
                  onChange={(e) => setConfig({ ...config, columns: Number(e.target.value) })}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  {[2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} dãy
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                <span>Số bàn/dãy:</span>
                <select
                  value={config.rows}
                  onChange={(e) => setConfig({ ...config, rows: Number(e.target.value) })}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  {[4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} bàn
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                <span>Số chỗ/bàn:</span>
                <select
                  value={config.seatsPerDesk}
                  onChange={(e) => setConfig({ ...config, seatsPerDesk: Number(e.target.value) })}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={2}>2 học sinh / bàn</option>
                  <option value={3}>3 học sinh / bàn</option>
                </select>
              </label>

              <label className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                <span>Bàn giáo viên:</span>
                <select
                  value={config.teacherDesk}
                  onChange={(e) =>
                    setConfig({ ...config, teacherDesk: e.target.value as 'left' | 'right' })
                  }
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="left">Phía bên Trái</option>
                  <option value="right">Phía bên Phải</option>
                </select>
              </label>
            </div>

            {/* Smart Auto-Arrangement Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAutoAssignSeatsByGroup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition active:scale-95 cursor-pointer"
                title="Tổ 1 ngồi Dãy 1, Tổ 2 ngồi Dãy 2, Tổ 3 ngồi Dãy 3, Tổ 4 ngồi Dãy 4"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Xếp theo Tổ</span>
              </button>

              <button
                type="button"
                onClick={handleAutoAssignSeatsBalanced}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition active:scale-95 cursor-pointer"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Xếp Nam - Nữ xen kẽ</span>
              </button>

              <button
                type="button"
                onClick={handleClearSeating}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Xóa sơ đồ</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
            {/* ── Visual Classroom Board & Desks Area (3 cols) ── */}
            <div className="lg:col-span-3 bg-slate-100/70 dark:bg-slate-900/80 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-inner space-y-6">
              {/* Top: Blackboard & Teacher Desk */}
              <div className="space-y-3">
                {/* Visual Blackboard */}
                <div className="w-full max-w-2xl mx-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-900 text-white text-center font-black tracking-widest text-xs sm:text-sm uppercase shadow-lg border-2 border-emerald-700/60 flex items-center justify-center gap-2">
                  <Monitor className="h-4 w-4 text-emerald-400" />
                  <span>BẢNG LỚP HỌC</span>
                </div>

                {/* Sub row: Teacher Desk & Door */}
                <div className="flex items-center justify-between max-w-4xl mx-auto px-4 text-xs font-bold">
                  {config.teacherDesk === 'left' ? (
                    <>
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-xs">
                        <Laptop className="h-4 w-4 text-amber-600" />
                        <span>BÀN GIÁO VIÊN</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <DoorOpen className="h-4 w-4 text-slate-500" />
                        <span>CỬA LỚP</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <DoorOpen className="h-4 w-4 text-slate-500" />
                        <span>CỬA LỚP</span>
                      </div>
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 shadow-xs">
                        <Laptop className="h-4 w-4 text-amber-600" />
                        <span>BÀN GIÁO VIÊN</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Mobile Swipe Hint */}
              <div className="sm:hidden text-center text-[11px] text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/40 py-1.5 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800">
                💡 Vuốt ngang để xem đủ {config.columns} dãy bàn trên điện thoại
              </div>

              {/* Grid of Columns (Dãy bàn) with horizontal scroll support on small screens */}
              <div className="overflow-x-auto pb-3 -mx-2 sm:mx-0 px-2 sm:px-0 scrollbar-thin">
                <div
                  className="grid gap-3 sm:gap-4 min-w-[620px] max-w-5xl mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${config.columns}, minmax(0, 1fr))`,
                  }}
                >
                {Array.from({ length: config.columns }, (_, cIdx) => {
                  const col = cIdx + 1;
                  return (
                    <div key={col} className="space-y-3">
                      {/* Column Header */}
                      <div className="text-center py-1.5 px-2 rounded-xl bg-slate-200 dark:bg-slate-800 font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 shadow-2xs">
                        DÃY {col}
                      </div>

                      {/* Desks in this column */}
                      {Array.from({ length: config.rows }, (_, rIdx) => {
                        const row = rIdx + 1;
                        const deskKey = `${col}_${row}`;
                        const seatIds =
                          config.desks[deskKey] || Array(config.seatsPerDesk).fill(null);

                        return (
                          <div
                            key={deskKey}
                            className="bg-white dark:bg-slate-850 rounded-2xl border-2 border-slate-300 dark:border-slate-700 p-2 shadow-xs hover:border-indigo-400 transition"
                          >
                            <div className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider mb-1.5">
                              Bàn {row}
                            </div>

                            <div
                              className="grid gap-1.5"
                              style={{
                                gridTemplateColumns: `repeat(${config.seatsPerDesk}, minmax(0, 1fr))`,
                              }}
                            >
                              {Array.from({ length: config.seatsPerDesk }, (_, seatIdx) => {
                                const sid = seatIds[seatIdx];
                                const student = sid ? studentMap.get(sid) : null;
                                const groupInfo = sid ? groupMap[sid] : null;
                                const isSelected =
                                  selectedSeat?.col === col &&
                                  selectedSeat?.row === row &&
                                  selectedSeat?.seatIndex === seatIdx;

                                const groupColor =
                                  groupInfo?.group && GROUP_COLORS[groupInfo.group]
                                    ? GROUP_COLORS[groupInfo.group]
                                    : {
                                        bg: 'bg-slate-50 dark:bg-slate-800',
                                        text: 'text-slate-700 dark:text-slate-300',
                                        border: 'border-slate-200 dark:border-slate-700',
                                        badgeBg: 'bg-slate-200 text-slate-700',
                                      };

                                return (
                                  <div
                                    key={seatIdx}
                                    onClick={() => handleSeatClick(col, row, seatIdx)}
                                    className={`relative p-2 rounded-xl border text-center transition cursor-pointer select-none min-h-[64px] flex flex-col justify-center items-center ${
                                      isSelected
                                        ? 'ring-3 ring-amber-400 border-amber-500 bg-amber-50 dark:bg-amber-950/60 animate-pulse'
                                        : student
                                        ? `${groupColor.bg} ${groupColor.border} hover:shadow-md`
                                        : 'bg-slate-50/80 dark:bg-slate-900/50 border-dashed border-slate-300 dark:border-slate-700 hover:bg-indigo-50/50'
                                    }`}
                                    title={
                                      student
                                        ? `${student.fullName} (${groupInfo?.group || 'Chưa có tổ'}) - Bấm để đổi chỗ`
                                        : 'Ghế trống - Bấm để xếp học sinh'
                                    }
                                  >
                                    {student ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={(e) =>
                                            handleRemoveFromSeat(e, col, row, seatIdx)
                                          }
                                          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-slate-200 hover:bg-rose-600 hover:text-white text-slate-600 flex items-center justify-center text-[10px] shadow-xs cursor-pointer"
                                          title="Nhấc ra khỏi ghế"
                                        >
                                          ×
                                        </button>

                                        <p className="font-bold text-[11px] leading-tight line-clamp-2 text-slate-900 dark:text-white">
                                          {student.fullName}
                                        </p>

                                        <div className="flex items-center gap-1 mt-1">
                                          {groupInfo?.group && (
                                            <span
                                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${groupColor.badgeBg}`}
                                            >
                                              {groupInfo.group}
                                            </span>
                                          )}
                                          {groupInfo?.duty &&
                                            groupInfo.duty !== 'Thành viên' && (
                                              <span
                                                className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200"
                                                title={groupInfo.duty}
                                              >
                                                {groupInfo.duty === 'Tổ trưởng' ? 'TT' : groupInfo.duty === 'Tổ phó' ? 'TP' : groupInfo.duty.slice(0, 2)}
                                              </span>
                                            )}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-[10px] font-semibold text-slate-400 flex flex-col items-center">
                                        <Plus className="h-3.5 w-3.5 mb-0.5 opacity-60" />
                                        <span>Trống</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                </div>
              </div>
            </div>

            {/* ── Unseated Students Sidebar List (1 col) ── */}
            <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Chưa xếp chỗ ({unseatedStudents.length})
                </h3>
                {selectedStudentForPlacement && (
                  <button
                    onClick={() => setSelectedStudentForPlacement(null)}
                    className="text-[10px] text-rose-600 font-bold hover:underline"
                  >
                    Hủy chọn
                  </button>
                )}
              </div>

              {selectedStudentForPlacement && (
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 text-indigo-900 dark:text-indigo-200 text-xs font-semibold">
                  Đang chọn:{' '}
                  <strong>{studentMap.get(selectedStudentForPlacement)?.fullName}</strong>. Hãy bấm
                  vào một <strong>ghế trống</strong> trên sơ đồ để xếp vào!
                </div>
              )}

              <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
                {unseatedStudents.map((s) => {
                  const grp = groupMap[s.id]?.group;
                  const isPicking = selectedStudentForPlacement === s.id;
                  return (
                    <div
                      key={s.id}
                      onClick={() =>
                        setSelectedStudentForPlacement(isPicking ? null : s.id)
                      }
                      className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition select-none ${
                        isPicking
                          ? 'bg-indigo-600 text-white border-indigo-700 shadow-md font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{s.fullName}</p>
                        <p
                          className={`text-[10px] font-mono ${
                            isPicking ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          {s.studentCode} · {s.gender || 'Nam'}
                        </p>
                      </div>

                      {grp && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPicking
                              ? 'bg-white/20 text-white'
                              : GROUP_COLORS[grp]?.badgeBg || 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {grp}
                        </span>
                      )}
                    </div>
                  );
                })}

                {!unseatedStudents.length && (
                  <div className="p-6 text-center text-slate-400">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-1" />
                    <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                      Tất cả học sinh đã có chỗ ngồi!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: PHÂN CHIA TỔ & CÁN SỰ (STUDENT GROUPS)
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          {/* Action header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-850 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Quản lý 4 Tổ học sinh & Ban cán sự lớp
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chỉ định Tổ trưởng, Tổ phó, chuyển đổi tổ nhanh hoặc dùng thuật toán chia đều học sinh cân bằng Nam/Nữ.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoAssignGroups}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Chia đều 4 Tổ (Cân bằng Nam/Nữ)</span>
              </button>
            </div>
          </div>

          {/* 4 Group Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map((gName) => {
              const members = activeStudents.filter((s) => groupMap[s.id]?.group === gName);
              const males = members.filter((s) => s.gender !== 'Nữ').length;
              const females = members.filter((s) => s.gender === 'Nữ').length;
              const gColor = GROUP_COLORS[gName];

              return (
                <div
                  key={gName}
                  className={`rounded-2xl border-2 ${gColor.border} ${gColor.bg} p-4 shadow-sm space-y-3 flex flex-col`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${gColor.badgeBg}`} />
                      <h4 className={`font-black text-sm uppercase ${gColor.text}`}>
                        {gName}
                      </h4>
                    </div>

                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 font-mono">
                      {members.length} HS ({males}N / {females}Nu)
                    </span>
                  </div>

                  {/* Member List */}
                  <div className="space-y-2 flex-1 max-h-[500px] overflow-y-auto pr-1">
                    {members.map((m, idx) => {
                      const duty = groupMap[m.id]?.duty || 'Thành viên';
                      const isLeader = duty === 'Tổ trưởng';
                      const isDeputy = duty === 'Tổ phó';

                      return (
                        <div
                          key={m.id}
                          className="bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {idx + 1}. {m.fullName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {m.studentCode} · {m.gender || 'Nam'}
                              </p>
                            </div>

                            {/* Duty Badge */}
                            {isLeader ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300">
                                <Crown className="h-3 w-3 text-amber-600" />
                                <span>Tổ trưởng</span>
                              </span>
                            ) : isDeputy ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 border border-blue-300">
                                <Award className="h-3 w-3 text-blue-600" />
                                <span>Tổ phó</span>
                              </span>
                            ) : null}
                          </div>

                          {/* Controls: Duty & Change Group */}
                          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                            <select
                              value={duty}
                              onChange={(e) => handleUpdateStudentDuty(m.id, e.target.value)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-1.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              <option value="Thành viên">Thành viên</option>
                              <option value="Tổ trưởng">Tổ trưởng</option>
                              <option value="Tổ phó">Tổ phó</option>
                              <option value="Lớp trưởng">Lớp trưởng</option>
                              <option value="Lớp phó học tập">LP Học tập</option>
                              <option value="Lớp phó nề nếp">LP Nề nếp</option>
                              <option value="Bí thư chi đoàn">Bí thư</option>
                            </select>

                            <select
                              value={gName}
                              onChange={(e) => handleUpdateStudentGroup(m.id, e.target.value)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-1.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                            >
                              <option value="Tổ 1">Đổi sang Tổ 1</option>
                              <option value="Tổ 2">Đổi sang Tổ 2</option>
                              <option value="Tổ 3">Đổi sang Tổ 3</option>
                              <option value="Tổ 4">Đổi sang Tổ 4</option>
                              <option value="">Rời tổ</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}

                    {!members.length && (
                      <p className="text-xs text-slate-400 italic text-center py-6">
                        Chưa có học sinh nào trong tổ này.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unassigned Students Section */}
          {activeStudents.some((s) => !groupMap[s.id]?.group) && (
            <div className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>
                  Học sinh chưa xếp tổ (
                  {activeStudents.filter((s) => !groupMap[s.id]?.group).length})
                </span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {activeStudents
                  .filter((s) => !groupMap[s.id]?.group)
                  .map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-xs space-y-1.5"
                    >
                      <p className="font-bold truncate text-slate-900 dark:text-white">
                        {s.fullName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {s.studentCode} · {s.gender || 'Nam'}
                      </p>
                      <select
                        value=""
                        onChange={(e) => handleUpdateStudentGroup(s.id, e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-900 text-[11px] font-semibold p-1 cursor-pointer text-blue-600"
                      >
                        <option value="" disabled>
                          + Gán vào tổ
                        </option>
                        <option value="Tổ 1">Vào Tổ 1</option>
                        <option value="Tổ 2">Vào Tổ 2</option>
                        <option value="Tổ 3">Vào Tổ 3</option>
                        <option value="Tổ 4">Vào Tổ 4</option>
                      </select>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
