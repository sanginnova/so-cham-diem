import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { filterTeachingWorkspaces, workspaceSubject } from '../lib/teachingWorkspaces';
import { readDeviceGradebook, summarizeSubjectBook, exportSubjectStatisticsToExcel } from '../lib/subjectStatistics';

export function SubjectStatisticsView({ onOpenGradebook }: { onOpenGradebook: () => void }) {
  const { activeAccount, workspaceClasses, selectWorkspaceClass } = useApp();
  const [year, setYear] = useState('');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<'semester1' | 'semester2' | 'year'>('semester1');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const update = () => setRefresh(value => value + 1);
    window.addEventListener('storage', update); window.addEventListener('focus', update);
    return () => { window.removeEventListener('storage', update); window.removeEventListener('focus', update); };
  }, []);
  const classes = workspaceClasses.filter(config => config.teacherId === activeAccount?.uid && config.classType === 'subject');
  const rows = useMemo(() => filterTeachingWorkspaces(workspaceClasses.filter(config => config.teacherId === activeAccount?.uid), year, subject, search).map(config => {
    try {
      const book = readDeviceGradebook(localStorage, activeAccount?.uid || '', config);
      return { config, book, stats: book ? summarizeSubjectBook(book, period) : null, error: '' };
    } catch { return { config, book: null, stats: null, error: 'Không đọc được sổ local hợp lệ' }; }
  }), [workspaceClasses, activeAccount?.uid, year, subject, search, period, refresh]);
  const field = 'rounded-lg border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2 text-sm';
  return <section className="space-y-4">
    <h1 className="text-xl font-bold">Thống kê GVBM trên máy</h1>
    <p className="text-sm text-slate-500">Tổng hợp các hồ sơ điểm trong sổ đã lưu trên trình duyệt này, gồm cả hồ sơ được giữ lại khi học sinh rời danh sách. Một học sinh học nhiều môn được tính riêng trong từng sổ. Sổ chưa có dữ liệu local được ghi rõ, không tính là điểm 0.</p>
    <div className="flex flex-wrap gap-2">
      <select aria-label="Năm học thống kê" className={field} value={year} onChange={event => setYear(event.target.value)}><option value="">Tất cả năm học</option>{[...new Set(classes.map(config => config.schoolYear))].sort().reverse().map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label="Môn thống kê" className={field} value={subject} onChange={event => setSubject(event.target.value)}><option value="">Tất cả môn</option>{[...new Set(classes.map(workspaceSubject))].sort().map(value => <option key={value}>{value}</option>)}</select>
      <select aria-label="Kỳ thống kê" className={field} value={period} onChange={event => setPeriod(event.target.value as typeof period)}><option value="semester1">Học kỳ I</option><option value="semester2">Học kỳ II</option><option value="year">Cả năm</option></select>
      <input aria-label="Tìm lớp thống kê" placeholder="Tìm lớp hoặc môn…" className={field} value={search} onChange={event => setSearch(event.target.value)} />
      <button className={field} onClick={() => setRefresh(value => value + 1)}>Làm mới</button>
      <button className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-700 transition" onClick={() => {
        const exportRows = rows.map(({ config, stats, book, error }) => ({
          className: config.className,
          subjectName: workspaceSubject(config),
          schoolYear: config.schoolYear,
          pupils: stats?.pupils ?? '—',
          scored: stats?.scored ?? '—',
          missing: stats?.missing ?? '—',
          makeup: stats?.makeup ?? '—',
          mean: stats?.mean ?? '—',
          bin0: stats?.bins[0] ?? '—',
          bin1: stats?.bins[1] ?? '—',
          bin2: stats?.bins[2] ?? '—',
          bin3: stats?.bins[3] ?? '—',
          status: error || (!book ? 'Chưa có dữ liệu local' : `${book.pendingSync ? 'Bản nháp · ' : ''}${period === 'year' ? (book.termLocks?.semester1?.locked && book.termLocks?.semester2?.locked ? 'Đã chốt hai kỳ' : 'Còn kỳ mở') : book.termLocks?.[period]?.locked ? 'Đã chốt' : 'Đang mở'}`),
        }));
        exportSubjectStatisticsToExcel(exportRows, period, activeAccount?.displayName || 'Giáo viên');
      }}>Xuất Excel Thống kê</button>
    </div>
    <p role="status" className="text-sm">{rows.filter(row => row.stats).length}/{rows.length} sổ có dữ liệu local · {rows.reduce((sum, row) => sum + (row.stats?.missing || 0), 0)} hồ sơ thiếu điểm · {rows.reduce((sum, row) => sum + (row.stats?.makeup || 0), 0)} hồ sơ vắng/cần kiểm tra bù</p>
    <div className="overflow-x-auto rounded-xl border border-slate-300"><table className="w-full text-sm text-left">
      <thead className="bg-purple-50 text-purple-900"><tr>{['Lớp / Môn', 'Hồ sơ / Có ĐTB', 'Thiếu điểm', 'Vắng / Bù', 'TB các ĐTB', '< 5', '5–<6,5', '6,5–<8', '≥ 8', 'Trạng thái', ''].map((label, index) => <th key={index} className="p-3 whitespace-nowrap">{label}</th>)}</tr></thead>
      <tbody>{rows.map(({ config, stats, book, error }) => <tr key={config.id} className="border-t border-slate-200">
        <td className="p-3 whitespace-nowrap"><strong>{config.className}</strong><br />{workspaceSubject(config)} · {config.schoolYear}</td>
        {[stats ? `${stats.pupils} / ${stats.scored}` : '—', stats?.missing ?? '—', stats?.makeup ?? '—', stats?.mean ?? '—', ...[0, 1, 2, 3].map(index => stats?.bins[index] ?? '—')].map((value, index) => <td className="p-3" key={index}>{value}</td>)}
        <td className="p-3 text-xs">{error || (!book ? 'Chưa có dữ liệu local' : `${book.pendingSync ? 'Bản nháp · ' : ''}${period === 'year' ? (book.termLocks?.semester1?.locked && book.termLocks?.semester2?.locked ? 'Đã chốt hai kỳ' : 'Còn kỳ mở') : book.termLocks?.[period]?.locked ? 'Đã chốt' : 'Đang mở'}`)}</td>
        <td className="p-3"><button className="rounded-lg bg-purple-600 text-white px-3 py-2 whitespace-nowrap" onClick={() => { selectWorkspaceClass(config.id); onOpenGradebook(); }}>Mở sổ</button></td>
      </tr>)}</tbody>
    </table></div>
    {!rows.length && <p className="text-slate-500">Chưa có lớp bộ môn phù hợp.</p>}
    <p className="text-xs text-slate-500">Các khoảng điểm chỉ mô tả phân bố ĐTB hiện có. Kết quả còn thiếu bài là tạm tính; ô miễn không tính là thiếu điểm. Chưa đối chiếu dữ liệu máy chủ.</p>
  </section>;
}
