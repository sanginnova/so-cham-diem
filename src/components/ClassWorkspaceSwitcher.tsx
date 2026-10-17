import React, { useState } from 'react';
import { Trash2, AlertTriangle, Plus, X, BookOpen, Home, GraduationCap, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { currentSchoolYear, defaultWeekOneStart } from '../lib/classScope';
import { rosterCandidates } from '../lib/teachingWorkspaces';

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
  const [classType, setClassType] = useState<'homeroom' | 'subject'>('subject');
  const [subjectName, setSubjectName] = useState('Toán');
  const [rosterSourceClassId, setRosterSourceClassId] = useState('');
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear);
  const [start, setStart] = useState(() => defaultWeekOneStart(currentSchoolYear()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (userRole === 'guest') return null;

  const homeroomClasses = workspaceClasses.filter((c) => c.classType !== 'subject');
  const subjectClasses = workspaceClasses.filter((c) => c.classType === 'subject');
  const sources = rosterCandidates(workspaceClasses, { id: '', teacherId: classConfig.teacherId, className: name, schoolYear });

  return (
    <section className="mx-3 sm:mx-6 mt-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs">
      <div className="flex flex-wrap gap-2.5 items-center">
        <label className="text-xs font-semibold flex-1 min-w-[240px]">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5">
              <span>Lớp / Niên khóa đang làm việc</span>
              {classConfig.classType === 'subject' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                  <BookOpen className="h-3 w-3 text-purple-600" />
                  <span>Bộ môn: {classConfig.subjectName || classConfig.teachingSubject || 'Toán'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  <Home className="h-3 w-3 text-blue-600" />
                  <span>Lớp Chủ nhiệm</span>
                </span>
              )}
            </span>
          </div>

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
            className="block w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-900 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {homeroomClasses.length > 0 && (
              <optgroup label="🏠 Lớp Chủ nhiệm">
                {homeroomClasses.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.className} · {config.schoolYear} (Lớp Chủ nhiệm)
                  </option>
                ))}
              </optgroup>
            )}

            {subjectClasses.length > 0 && (
              <optgroup label="📚 Lớp Bộ môn giảng dạy">
                {subjectClasses.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.className} · Môn {config.subjectName || config.teachingSubject || 'Toán'} · {config.schoolYear}
                  </option>
                ))}
              </optgroup>
            )}

            {homeroomClasses.length === 0 && subjectClasses.length === 0 && (
              workspaceClasses.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.className} · {config.schoolYear}
                </option>
              ))
            )}
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
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              {open ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span>{open ? 'Đóng' : '+ Thêm lớp mới'}</span>
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
                className={`px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer flex items-center gap-1 transition active:scale-95 ${
                  confirmDelete
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 bg-white dark:bg-slate-800'
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
          className="mt-4 p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-slate-900/80 space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            try {
              await createWorkspaceClass(name, schoolYear, start, undefined, {
                classType,
                subjectName: classType === 'subject' ? subjectName.trim() || 'Toán' : undefined,
                rosterSourceClassId: classType === 'subject' ? rosterSourceClassId : undefined,
              });
              setOpen(false);
              setName('');
              setRosterSourceClassId('');
              setNotice(
                classType === 'subject'
                  ? `Đã tạo lớp bộ môn "${name} · Môn ${subjectName}" và chuyển sang lớp làm việc mới.`
                  : `Đã tạo lớp chủ nhiệm "${name}" và chuyển sang lớp làm việc mới.`
              );
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : String(failure));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="flex items-center gap-2 pb-2 border-b border-blue-100 dark:border-slate-800">
            <GraduationCap className="h-4 w-4 text-blue-600" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Tạo lớp học mới vào không gian làm việc
            </h4>
          </div>

          {/* Chọn loại lớp: Chủ nhiệm vs Bộ môn */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Loại lớp học *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <label
                onClick={() => setClassType('subject')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition select-none ${
                  classType === 'subject'
                    ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 shadow-xs ring-2 ring-purple-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="classType"
                  checked={classType === 'subject'}
                  onChange={() => setClassType('subject')}
                  className="mt-0.5 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-purple-600" />
                    <span>Lớp Bộ môn giảng dạy</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                    Dành cho các lớp thầy dạy bộ môn (Toán 10A11, 10A15...). Tập trung vào chấm điểm học tập, chuyên cần tiết dạy.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setClassType('homeroom')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border-2 cursor-pointer transition select-none ${
                  classType === 'homeroom'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="classType"
                  checked={classType === 'homeroom'}
                  onChange={() => setClassType('homeroom')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 text-blue-600" />
                    <span>Lớp Chủ nhiệm (GVCN)</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                    Quản lý toàn diện nề nếp cả tuần, thu chi quỹ lớp, sơ đồ chỗ ngồi và liên lạc phụ huynh.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Nếu là lớp bộ môn, chọn Tên môn học */}
          {classType === 'subject' && (
            <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 space-y-1.5">
              <label className="block text-xs font-bold text-purple-900 dark:text-purple-300">
                Môn học giảng dạy *
              </label>
              <div className="flex flex-wrap gap-1.5 items-center">
                <input
                  required
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Ví dụ: Toán, Toán 10..."
                  className="px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 text-xs font-bold text-purple-900 dark:text-purple-200 w-44 focus:ring-2 focus:ring-purple-500"
                />
                {['Toán', 'Toán 10', 'Toán 11', 'Toán 12', 'Tin học', 'Vật lý'].map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSubjectName(sub)}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition cursor-pointer"
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tên lớp học *
              </label>
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ví dụ: 10A11, 10A15..."
                className="block w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs font-bold focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {['10A8', '10A11', '10A15', '10A17', '11A3', '12A1'].map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => setName(cls)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-750 text-slate-700 dark:text-slate-300 hover:bg-blue-100 cursor-pointer"
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Niên khóa *
              </label>
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
                className="block w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ngày bắt đầu tuần 1 *
              </label>
              <input
                required
                type="date"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                className="block w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {classType === 'subject' && <label className="block text-xs font-semibold space-y-1">
            <span>Danh sách học sinh</span>
            <select aria-label="Nguồn danh sách học sinh" className="block w-full rounded-lg border p-2 bg-white dark:bg-slate-900" value={rosterSourceClassId} onChange={event => setRosterSourceClassId(event.target.value)}>
              <option value="">Danh sách riêng cho sổ mới</option>
              {sources.map(source => <option key={source.id} value={source.id}>Dùng chung từ {source.className} · {source.schoolYear} · {source.classType === 'subject' ? source.subjectName || source.teachingSubject : 'Chủ nhiệm'}</option>)}
            </select>
            <span className="block text-slate-500">Nhập tên lớp và năm học để tìm nguồn cùng lớp. Danh sách được quản lý tại lớp nguồn; điểm từng môn vẫn riêng. Sổ cũ không tự gộp.</span>
          </label>}

          <p className="text-[11px] text-slate-500 italic">
            * Sau khi tạo lớp, thầy có thể bấm vào mục “Học sinh” để <strong>dán nhanh danh sách tên học sinh</strong> hoặc tải lên file Excel lớp đó.
          </p>

          {error && (
            <p role="alert" className="text-xs text-rose-600 font-semibold">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              disabled={busy}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer active:scale-95 transition"
            >
              {busy ? 'Đang tạo…' : classType === 'subject' ? `Tạo lớp bộ môn "${name || '...'}"` : `Tạo lớp chủ nhiệm "${name || '...'}"`}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(false)}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
