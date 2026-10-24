import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  Plus,
  X,
  BookOpen,
  Home,
  GraduationCap,
  ChevronDown,
  UserCheck,
  Settings,
  Calendar,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { currentSchoolYear, defaultWeekOneStart } from '../lib/classScope';
import { currentSchoolWeek } from '../lib/weeklyPeriod';
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

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openCreateForm, setOpenCreateForm] = useState(false);
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

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (userRole === 'guest') return null;

  const homeroomClasses = workspaceClasses.filter((c) => c.classType !== 'subject');
  const subjectClasses = workspaceClasses.filter((c) => c.classType === 'subject');
  const sources = rosterCandidates(workspaceClasses, { id: '', teacherId: classConfig.teacherId, className: name, schoolYear });

  const activeWeekInfo = currentSchoolWeek(classConfig.weeks);
  const activeWeekNum = activeWeekInfo?.weekNumber ?? 1;

  return (
    <section className="mx-3 sm:mx-6 mt-2.5">
      {/* ── COMPACT CLASS CONTEXT BAR ── */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs">
        {/* Left: Class Dropdown + Status Badges */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 flex-wrap sm:flex-nowrap">
          {/* Class Select dropdown */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 shrink-0">
              {classConfig.classType === 'subject' ? (
                <BookOpen className="h-4 w-4" />
              ) : (
                <Home className="h-4 w-4" />
              )}
            </span>

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
              className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-hidden cursor-pointer truncate max-w-[280px]"
            >
              {homeroomClasses.length > 0 && (
                <optgroup label="🏠 Lớp Chủ nhiệm">
                  {homeroomClasses.map((config) => (
                    <option key={config.id} value={config.id} className="dark:bg-slate-900">
                      Lớp {config.className} · {config.schoolYear} (Chủ nhiệm)
                    </option>
                  ))}
                </optgroup>
              )}

              {subjectClasses.length > 0 && (
                <optgroup label="📚 Lớp Bộ môn">
                  {subjectClasses.map((config) => (
                    <option key={config.id} value={config.id} className="dark:bg-slate-900">
                      Lớp {config.className} · Môn {config.subjectName || config.teachingSubject || 'Toán'} · {config.schoolYear}
                    </option>
                  ))}
                </optgroup>
              )}

              {homeroomClasses.length === 0 && subjectClasses.length === 0 && (
                workspaceClasses.map((config) => (
                  <option key={config.id} value={config.id} className="dark:bg-slate-900">
                    Lớp {config.className} · {config.schoolYear}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Divider */}
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

          {/* Role badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            {classConfig.classType === 'subject' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs sm:text-[11px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                <BookOpen className="h-3 w-3 text-purple-600" />
                <span>Lớp Bộ môn: {classConfig.subjectName || classConfig.teachingSubject || 'Toán'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs sm:text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <Home className="h-3 w-3 text-blue-600" />
                <span>Lớp Chủ nhiệm</span>
              </span>
            )}

            {/* Current week pill */}
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-3xs sm:text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <Calendar className="h-3 w-3 text-slate-500" />
              <span>Tuần {activeWeekNum}</span>
            </span>
          </div>
        </div>

        {/* Right: Secondary Management Dropdown */}
        {userRole !== 'monitor' && !inspectorModeClass && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition active:scale-95 shadow-2xs"
              title="Tùy chọn quản lý lớp"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Quản lý lớp</span>
              <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-40 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setOpenCreateForm(!openCreateForm);
                    setConfirmDelete(false);
                    setError('');
                    setNotice('');
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-blue-600 dark:text-blue-400 flex items-center gap-2.5 transition cursor-pointer font-bold"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Thêm lớp mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('open-edit-class-modal'));
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition cursor-pointer font-medium"
                >
                  <UserCheck className="h-4 w-4 text-slate-400" />
                  <span>Đổi GVCN / GVBM</span>
                </button>

                {workspaceClasses.length > 1 && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setIsMenuOpen(false);
                      setConfirmDelete(true);
                      setOpenCreateForm(false);
                      setError('');
                      setNotice('');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 transition cursor-pointer font-medium border-t border-slate-100 dark:border-slate-800 mt-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Xóa lớp học này...</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notice Message */}
      {notice && (
        <div className="mt-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Safe Confirmation Dialog to Delete Class */}
      {confirmDelete && (
        <div className="mt-2.5 p-4 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/95 dark:bg-rose-950/60 shadow-md space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 dark:text-rose-200">
              <p className="font-bold text-sm">
                Xác nhận xóa vĩnh viễn lớp “{classConfig.className} · {classConfig.schoolYear}”?
              </p>
              <p className="mt-1 text-rose-700 dark:text-rose-300 leading-relaxed">
                Toàn bộ danh sách học sinh, điểm rèn luyện và lịch sử của lớp này sẽ bị xóa khỏi tài khoản của bạn. Hành động này không thể hoàn tác.
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
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 cursor-pointer"
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
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {busy ? 'Đang xóa…' : 'Xác nhận xóa lớp'}
            </button>
          </div>
        </div>
      )}

      {/* Form Create New Class (Collapsible) */}
      {openCreateForm && (
        <form
          className="mt-2.5 p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 shadow-lg space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150"
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
              setOpenCreateForm(false);
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
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-blue-600" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Thêm lớp học mới vào không gian làm việc
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setOpenCreateForm(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
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
                    Chấm điểm học tập, kiểm tra và chuyên cần tiết dạy theo Thông tư 22.
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
                    Quản lý toàn diện nề nếp, điểm rèn luyện tuần/tháng, thu chi quỹ lớp và liên lạc phụ huynh.
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
                    className="px-1.5 py-0.5 rounded text-3xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
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
                onChange={(event) => setSchoolYear(event.target.value)}
                placeholder="Ví dụ: 2026-2027"
                className="block w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Ngày bắt đầu Tuần 1
              </label>
              <input
                type="date"
                required
                value={start}
                onChange={(event) => setStart(event.target.value)}
                className="block w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {classType === 'subject' && sources.length > 0 && (
            <div className="p-3 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/40 dark:bg-purple-950/20">
              <label className="block text-xs font-bold text-purple-950 dark:text-purple-200 mb-1">
                Kế thừa danh sách học sinh từ lớp khác (Tùy chọn)
              </label>
              <select
                value={rosterSourceClassId}
                onChange={(e) => setRosterSourceClassId(e.target.value)}
                className="w-full p-2 border border-purple-200 dark:border-purple-800 rounded-lg text-xs bg-white dark:bg-slate-900"
              >
                <option value="">Không kế thừa (tạo lớp trống để nhập Excel sau)</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.className} · {s.schoolYear}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p role="alert" className="text-xs text-rose-600 font-semibold">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpenCreateForm(false);
                setError('');
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              {busy ? 'Đang tạo…' : 'Xác nhận tạo lớp mới'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
