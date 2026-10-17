import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { filterTeachingWorkspaces, workspaceSubject } from '../lib/teachingWorkspaces';

export function TeachingClassesView({ onOpenGradebook }: { onOpenGradebook: () => void }) {
  const { workspaceClasses, classConfig, selectWorkspaceClass } = useApp();
  const [year, setYear] = useState('');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const classes = workspaceClasses.filter(config => config.classType === 'subject');
  const years = [...new Set(classes.map(config => config.schoolYear))].sort().reverse();
  const subjects = [...new Set(classes.map(workspaceSubject))].sort((a, b) => a.localeCompare(b, 'vi'));
  const visible = useMemo(() => filterTeachingWorkspaces(workspaceClasses, year, subject, search), [workspaceClasses, year, subject, search]);
  const fieldStyle = 'rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2 text-sm';

  return <section className="p-4 sm:p-6 space-y-4">
    <div>
      <h1 className="text-xl font-bold">Lớp tôi dạy</h1>
      <p className="text-sm text-slate-500">{classes.length} sổ lớp/môn · Chọn sổ để nhập điểm. Thêm lớp bằng nút “Thêm lớp mới” phía trên và chọn loại Bộ môn.</p>
    </div>
    <div className="flex flex-wrap gap-3">
      <select aria-label="Lọc năm học" value={year} onChange={e => setYear(e.target.value)} className={fieldStyle}>
        <option value="">Tất cả năm học</option>{years.map(value => <option key={value}>{value}</option>)}
      </select>
      <select aria-label="Lọc môn học" value={subject} onChange={e => setSubject(e.target.value)} className={fieldStyle}>
        <option value="">Tất cả môn học</option>{subjects.map(value => <option key={value}>{value}</option>)}
      </select>
      <input aria-label="Tìm lớp hoặc môn" placeholder="Tìm lớp hoặc môn…" value={search} onChange={e => setSearch(e.target.value)} className={`${fieldStyle} flex-1 min-w-40`} />
    </div>
    <p role="status" className="text-sm text-slate-500">Hiển thị {visible.length} sổ lớp/môn</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map(config => <article key={config.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-2">
        <h2 className="font-bold text-lg">{config.className}</h2>
        <p>{workspaceSubject(config)} · {config.schoolYear}</p>
        {config.rosterSourceClassId && <p className="text-xs text-purple-600 dark:text-purple-300">Dùng chung danh sách học sinh</p>}
        {config.id === classConfig.id && <p className="text-xs text-purple-600 dark:text-purple-300">Lớp đang chọn</p>}
        <button className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700" onClick={() => {
          if (config.id !== classConfig.id) selectWorkspaceClass(config.id);
          onOpenGradebook();
        }}>Mở sổ điểm</button>
      </article>)}
    </div>
    {!visible.length && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
      {classes.length ? 'Không có lớp phù hợp với bộ lọc.' : 'Chưa có lớp bộ môn. Hãy thêm lớp đầu tiên để bắt đầu.'}
    </p>}
  </section>;
}
