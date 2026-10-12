import React, { useState } from 'react';
import { Trash2, AlertTriangle, Plus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { currentSchoolYear, defaultWeekOneStart } from '../lib/classScope';

export function ClassWorkspaceSwitcher() {
  const {
    userRole,
    classConfig,
    workspaceClasses,
    selectWorkspaceClass,
    createWorkspaceClass,
    deleteWorkspaceClass,
    inspectorModeClass,
  } = useApp();

  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear);
  const [start, setStart] = useState(() => defaultWeekOneStart(currentSchoolYear()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (userRole === 'guest') return null;

  return (
    <section className="mx-3 sm:mx-6 mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="flex flex-wrap gap-2 items-center">
        <label className="text-xs font-semibold flex-1 min-w-[200px]">
          Lớp / Niên khóa đang làm việc
          <select
            aria-label="Chọn lớp và niên khóa"
            value={classConfig.id}
            disabled={busy}
            onChange={(event) => {
              selectWorkspaceClass(event.target.value);
              setConfirmDelete(false);
              setError('');
              setNotice('');
            }}
            className="block w-full mt-1 p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
          >
            {workspaceClasses.map((config) => (
              <option key={config.id} value={config.id}>
                {config.className} · {config.schoolYear}
              </option>
            ))}
          </select>
        </label>

        {userRole !== 'monitor' && !inspectorModeClass && (
          <div className="flex gap-2 items-end pt-5 sm:pt-0">
            <button
              type="button"
              onClick={() => {
                setOpen(!open);
                setConfirmDelete(false);
                setError('');
                setNotice('');
              }}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer flex items-center gap-1"
            >
              {open ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{open ? 'Đóng' : 'Thêm lớp mới'}</span>
            </button>

            {workspaceClasses.length > 1 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setConfirmDelete(!confirmDelete);
                  setOpen(false);
                  setError('');
                  setNotice('');
                }}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer flex items-center gap-1 transition ${
                  confirmDelete
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
                title="Xóa lớp học này"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa lớp này</span>
              </button>
            )}
          </div>
        )}
      </div>

      {notice && (
        <p role="status" className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          {notice}
        </p>
      )}

      {/* Confirmation to delete current class */}
      {confirmDelete && (
        <div className="mt-3 p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/50 space-y-2.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 dark:text-rose-200">
              <p className="font-bold">
                Xác nhận xóa vĩnh viễn lớp “{classConfig.className} · {classConfig.schoolYear}”?
              </p>
              <p className="mt-0.5 text-rose-700 dark:text-rose-300">
                Toàn bộ danh sách học sinh, điểm nề nếp và lịch sử của lớp này sẽ bị xóa khỏi hệ thống. Thao tác này không thể hoàn tác!
              </p>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-xs text-rose-600 font-semibold">
              {error}
            </p>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirmDelete(false);
                setError('');
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  const targetName = classConfig.className;
                  await deleteWorkspaceClass(classConfig.id);
                  setConfirmDelete(false);
                  setNotice(`Đã xóa thành công lớp "${targetName}". Hệ thống đã tự động chuyển sang lớp tiếp theo.`);
                } catch (failure) {
                  setError(failure instanceof Error ? failure.message : String(failure));
                } finally {
                  setBusy(false);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              {busy ? 'Đang xóa…' : 'Xác nhận xóa lớp'}
            </button>
          </div>
        </div>
      )}

      {/* Form create new class */}
      {open && (
        <form
          className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            try {
              await createWorkspaceClass(name, schoolYear, start);
              setOpen(false);
              setName('');
              setNotice(`Đã tạo và chuyển sang lớp "${name}".`);
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : String(failure));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="text-xs">
            Tên lớp
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: 10A8"
              className="block w-full mt-1 border rounded-lg p-2 bg-transparent"
            />
          </label>
          <label className="text-xs">
            Niên khóa
            <input
              required
              value={schoolYear}
              onChange={(event) => {
                setSchoolYear(event.target.value);
                try {
                  setStart(defaultWeekOneStart(event.target.value));
                } catch {
                  /* Wait for a complete school year. */
                }
              }}
              placeholder="2026-2027"
              className="block w-full mt-1 border rounded-lg p-2 bg-transparent"
            />
          </label>
          <label className="text-xs">
            Ngày bắt đầu tuần 1
            <input
              required
              type="date"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              className="block w-full mt-1 border rounded-lg p-2 bg-transparent"
            />
          </label>
          <p className="sm:col-span-3 text-xs text-slate-500">
            Lớp mới bắt đầu với danh sách học sinh và nhật ký trống, sao chép biểu điểm hiện tại. Lớp cũ vẫn được giữ để tra cứu. Có thể chỉnh lịch tuần trong Cài đặt.
          </p>
          {error && (
            <p role="alert" className="sm:col-span-3 text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Đang tạo…' : 'Tạo và chuyển sang lớp mới'}
          </button>
        </form>
      )}
    </section>
  );
}
