import React, { useState, useMemo } from 'react';
import { FamilyManagement } from './FamilyManagement';
import {
  Search,
  Filter,
  Download,
  PlusCircle,
  Edit2,
  Trash2,
  History,
  AlertCircle,
  FileSpreadsheet,
  X,
  Check,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Upload,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DisciplineLog, BehaviorCategory, Student, BehaviorType } from '../types';
import { targetDateForMovedWeek } from '../lib/weeklyPeriod';
import { ImportDisciplineLogsModal } from './ImportDisciplineLogsModal';
import { DailyLogModalV2 } from './v2/DailyLogModalV2';
import {
  formatVietnameseDate,
  formatVietnameseNumber,
  removeVietnameseAccents,
  exportToExcel,
  exportToCsv,
  compareVietnameseNames,
  compareStudentCodes,
} from '../lib/utils';
import {
  MORNING_PERIODS,
  AFTERNOON_PERIODS,
  ALL_SCHOOL_PERIODS,
  getPeriodSession,
  getPeriodBadgeInfo,
} from '../lib/schoolPeriods';

interface DailyLogViewProps {
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
}

export const DailyLogView: React.FC<DailyLogViewProps> = ({
  isModalOpen,
  onCloseModal,
  onOpenModal,
}) => {
  const {
    students,
    behaviorCategories,
    disciplineLogs,
    classConfig,
    userRole,
    isPeriodLocked,
    addDisciplineLog,
    updateDisciplineLog,
    deleteDisciplineLog,
  } = useApp();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all');
  const [filterWeek, setFilterWeek] = useState<number | 'all'>('all');
  const [filterSession, setFilterSession] = useState<'all' | 'morning' | 'afternoon'>('all');
  const [filterType, setFilterType] = useState<'all' | BehaviorType>('all');
  const [filterStudentId, setFilterStudentId] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<'date' | 'studentName' | 'totalScore'>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Modals state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<DisciplineLog | null>(null);
  const [historyLog, setHistoryLog] = useState<DisciplineLog | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // Filtered & Sorted logs for the main table
  const filteredLogs = useMemo(() => {
    return disciplineLogs.filter((log) => {
      // Month filter
      if (filterMonth !== 'all' && log.month !== filterMonth) return false;
      // Week filter
      if (filterWeek !== 'all' && log.weekNumber !== filterWeek) return false;
      // Type filter
      if (filterType !== 'all' && log.type !== filterType) return false;
      // Student filter
      if (filterStudentId !== 'all' && log.studentId !== filterStudentId) return false;

      // Session filter (Sáng 5 tiết / Chiều 5 tiết)
      if (filterSession !== 'all') {
        const session = getPeriodSession(log.periodOrTime);
        if (session !== filterSession) return false;
      }

      // Text search
      if (searchTerm) {
        const q = removeVietnameseAccents(searchTerm);
        const matchName = removeVietnameseAccents(log.studentName).includes(q);
        const matchCode = log.studentCode.toLowerCase().includes(q);
        const matchBehavior = removeVietnameseAccents(log.behaviorDescription).includes(q);
        const matchCatCode = log.behaviorCode.toLowerCase().includes(q);
        const matchReporter = log.reporter ? removeVietnameseAccents(log.reporter).includes(q) : false;
        if (!matchName && !matchCode && !matchBehavior && !matchCatCode && !matchReporter) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sortAsc ? -diff : diff;
      }
      if (sortField === 'studentName') {
        return sortAsc ? a.studentName.localeCompare(b.studentName) : b.studentName.localeCompare(a.studentName);
      }
      if (sortField === 'totalScore') {
        return sortAsc ? a.totalScore - b.totalScore : b.totalScore - a.totalScore;
      }
      return 0;
    });
  }, [disciplineLogs, filterMonth, filterWeek, filterType, filterStudentId, searchTerm, sortField, sortAsc]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredLogs.map((l, idx) => ({
      STT: idx + 1,
      'Ngày ghi nhận': formatVietnameseDate(l.date),
      Tuần: l.weekNumber,
      Tháng: l.month,
      'Mã học sinh': l.studentCode,
      'Họ và tên': l.studentName,
      'Mã hành vi': l.behaviorCode,
      'Mô tả hành vi': l.behaviorDescription,
      Loại: l.type === 'deduct' ? 'Trừ điểm' : 'Điểm cộng',
      'Điểm mỗi lần': formatVietnameseNumber(l.scorePerUnit),
      'Số lần': l.count,
      'Tổng điểm': (l.type === 'deduct' ? '-' : '+') + formatVietnameseNumber(l.totalScore),
      'Tiết / Thời gian': l.periodOrTime || '',
      'Người ghi nhận': l.reporter || '',
      'Căn cứ quy định': l.basisOrRegulation || '',
      'Ghi chú': l.note || '',
    }));
    exportToExcel(exportData, `Nhat_ky_ne_nep_10A8_${new Date().toISOString().slice(0, 10)}`, 'NhatKy');
  };

  // Export to CSV
  const handleExportCsv = () => {
    const exportData = filteredLogs.map((l, idx) => ({
      STT: idx + 1,
      'Ngày ghi nhận': formatVietnameseDate(l.date),
      Tuần: l.weekNumber,
      Tháng: l.month,
      'Mã học sinh': l.studentCode,
      'Họ và tên': l.studentName,
      'Mã hành vi': l.behaviorCode,
      'Mô tả hành vi': l.behaviorDescription,
      Loại: l.type === 'deduct' ? 'Trừ điểm' : 'Điểm cộng',
      'Điểm mỗi lần': formatVietnameseNumber(l.scorePerUnit),
      'Số lần': l.count,
      'Tổng điểm': (l.type === 'deduct' ? '-' : '+') + formatVietnameseNumber(l.totalScore),
      'Tiết / Thời gian': l.periodOrTime || '',
      'Người ghi nhận': l.reporter || '',
      'Căn cứ quy định': l.basisOrRegulation || '',
      'Ghi chú': l.note || '',
    }));
    exportToCsv(exportData, `Nhat_ky_ne_nep_10A8_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-5">
      <FamilyManagement />
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <span>Nhật Ký Chấm Điểm Hằng Ngày</span>
          </h2>
          <p className="text-xs text-slate-500">
            Nguồn dữ liệu gốc duy nhất • Hiển thị {filteredLogs.length}/{disciplineLogs.length} bản ghi
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Thêm ghi nhận mới</span>
          </button>

          {userRole !== 'monitor' && (
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              title="Tải lên nhật ký vi phạm/lỗi nề nếp từ file Excel hoặc CSV"
            >
              <Upload className="h-4 w-4" />
              <span>Tải lên nhật ký lỗi</span>
            </button>
          )}

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium rounded-xl shadow-sm transition"
            title="Xuất bảng hiện tại sang Microsoft Excel"
          >
            <Download className="h-4 w-4" />
            <span>Xuất Excel</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-medium rounded-xl transition"
            title="Xuất CSV"
          >
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên học sinh, mã HS, lỗi vi phạm, người ghi nhận..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Month Filter */}
          <div>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả các tháng</option>
              {classConfig.months.map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>

          {/* Week Filter */}
          <div>
            <select
              value={filterWeek}
              onChange={(e) => setFilterWeek(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả các tuần</option>
              {classConfig.weeks.map((w) => (
                <option key={w.weekNumber} value={w.weekNumber}>
                  Tuần {w.weekNumber} (T{w.month})
                </option>
              ))}
            </select>
          </div>

          {/* Session Filter (Sáng 5 tiết • Chiều 5 tiết) */}
          <div>
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Cả 2 buổi (Sáng & Chiều)</option>
              <option value="morning">☀️ Buổi Sáng (5 tiết)</option>
              <option value="afternoon">🌤️ Buổi Chiều (5 tiết)</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả loại hành vi</option>
              <option value="deduct">Chỉ vi phạm (Điểm trừ)</option>
              <option value="bonus">Chỉ khen thưởng (Điểm cộng)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="mobile-table-scroll overflow-x-auto max-h-[620px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3 w-12 text-center">STT</th>
                <th
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={() => {
                    setSortField('date');
                    setSortAsc(!sortAsc);
                  }}
                >
                  Ngày & Tuần
                </th>
                <th
                  className="py-3 px-3 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={() => {
                    setSortField('studentName');
                    setSortAsc(!sortAsc);
                  }}
                >
                  Học sinh
                </th>
                <th className="py-3 px-3">Mã & Hành vi</th>
                <th className="py-3 px-3 text-center">Loại</th>
                <th className="py-3 px-3 text-right">Điểm x Lần</th>
                <th
                  className="py-3 px-3 text-right cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                  onClick={() => {
                    setSortField('totalScore');
                    setSortAsc(!sortAsc);
                  }}
                >
                  Tổng điểm
                </th>
                <th className="py-3 px-3">Tiết / Thời gian</th>
                <th className="py-3 px-3">Người ghi & Căn cứ</th>
                <th className="py-3 px-3">Ghi chú</th>
                <th className="py-3 px-3 text-center w-20">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="h-8 w-8 text-slate-300 dark:text-slate-650" />
                      <p className="text-xs sm:text-sm font-medium">Không có bản ghi nào phù hợp với bộ lọc hiện tại.</p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={onOpenModal}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 rounded-lg text-xs font-semibold transition"
                        >
                          + Thêm ghi nhận thủ công
                        </button>
                        <button
                          onClick={() => setIsImportModalOpen(true)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg text-xs font-semibold transition"
                        >
                          Tải lên nhật ký từ Excel
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const isDeduct = log.type === 'deduct';
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-750/50 transition-colors"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {formatVietnameseDate(log.date)}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Tuần {log.weekNumber} (T{log.month})
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {log.studentName}
                        </span>
                        <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                          {log.studentCode}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <span className="inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 mr-1.5">
                          {log.behaviorCode}
                        </span>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {log.behaviorDescription}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDeduct
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          }`}
                        >
                          {isDeduct ? 'Điểm trừ' : 'Điểm cộng'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                        {formatVietnameseNumber(log.scorePerUnit)}đ × {log.count}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span
                          className={`font-bold font-mono text-sm ${
                            isDeduct ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isDeduct ? '-' : '+'}
                          {formatVietnameseNumber(log.totalScore)}đ
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {(() => {
                          const badge = getPeriodBadgeInfo(log.periodOrTime);
                          if (!log.periodOrTime) return <span className="text-slate-400">—</span>;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-[11px] ${badge.badgeClass}`}>
                              {badge.sessionText === 'Sáng' && <span className="text-[10px]">☀️</span>}
                              {badge.sessionText === 'Chiều' && <span className="text-[10px]">🌤️</span>}
                              <span>{badge.label}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-[180px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {log.reporter || classConfig.homeroomTeacher}
                          </span>
                          {log.reporter && log.reporter.toLowerCase().includes('lớp trưởng') && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 shrink-0">
                              ⭐ Lớp trưởng
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 block truncate" title={log.basisOrRegulation}>
                          {log.basisOrRegulation || 'Nội quy lớp'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 max-w-[150px] truncate" title={log.note}>
                        {log.note || '—'}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {/* Sửa bản ghi: GVCN được sửa tất cả; Lớp trưởng chỉ được sửa lượt chấm do chính mình tạo */}
                          {(userRole !== 'monitor' || (log.reporter && log.reporter.toLowerCase().includes('lớp trưởng'))) && (
                            <button
                              onClick={() => setEditingLog(log)}
                              className="p-1 hover:bg-blue-50 text-blue-600 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                              title="Chỉnh sửa bản ghi"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {log.history && log.history.length > 0 && (
                            <button
                              onClick={() => setHistoryLog(log)}
                              className="p-1 hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                              title="Xem lịch sử thay đổi"
                            >
                              <History className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {/* Xóa bản ghi: Chỉ Thầy/Cô được quyền xóa, Lớp trưởng không được xóa */}
                          {userRole !== 'monitor' && (
                            <button
                              onClick={() => setDeletingLogId(log.id)}
                              className="p-1 hover:bg-rose-50 text-rose-600 dark:hover:bg-slate-700 rounded transition cursor-pointer"
                              title="Xóa bản ghi"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* V2 MODAL: SỔ CHẤM ĐIỂM HÔM NAY (Single & Bulk Logging, Search-First, Period Lock Guard) */}
      <DailyLogModalV2
        isOpen={isModalOpen}
        onClose={onCloseModal}
      />

      {/* MODAL: Chỉnh sửa bản ghi */}
      {editingLog && (() => {
        const targetWeek = classConfig.weeks.find((w) => w.startDate <= editingLog.date && editingLog.date <= w.endDate);
        const targetWeekNumber = targetWeek?.weekNumber ?? editingLog.weekNumber;
        const isEditLocked = isPeriodLocked('week', editingLog.weekNumber) || isPeriodLocked('week', targetWeekNumber);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
            <div className="mobile-dialog-panel bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-blue-600" />
                <span>Chỉnh Sửa Ghi Nhận Nhật Ký</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Học sinh: <strong className="text-slate-800 dark:text-slate-200">{editingLog.studentName}</strong> (
                {editingLog.studentCode}) • Ngày: {formatVietnameseDate(editingLog.date)} (Tuần {targetWeekNumber})
              </p>

              {isEditLocked && (
                <div className="p-3 mb-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>Tuần {targetWeekNumber} đã được Ban Giám Hiệu khóa thi đua. Không thể chỉnh sửa bản ghi này.</span>
                </div>
              )}

              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">
                      {editingLog.type === 'deduct' ? 'Ngày vi phạm' : 'Ngày ghi nhận'}
                    </label>
                    <input
                      type="date"
                      disabled={isEditLocked}
                      value={editingLog.date}
                      onChange={(e) => setEditingLog({ ...editingLog, date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">
                      Tuần áp dụng (Chuyển tuần)
                    </label>
                    <select
                      disabled={isEditLocked}
                      value={targetWeekNumber}
                      onChange={(e) => {
                        const newW = Number(e.target.value);
                        const targetW = classConfig.weeks.find((w) => w.weekNumber === newW);
                        if (targetW) {
                          const newDate = targetDateForMovedWeek(editingLog.date, targetW);
                          setEditingLog({ ...editingLog, date: newDate, weekNumber: newW });
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-60 font-medium"
                    >
                      {classConfig.weeks.map((w) => (
                        <option key={w.weekNumber} value={w.weekNumber} disabled={isPeriodLocked('week', w.weekNumber)}>
                          Tuần {w.weekNumber} (Tháng {w.month}){isPeriodLocked('week', w.weekNumber) ? ' [Đã khóa]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold">Tiết / Thời điểm</label>
                    <span className="text-[10px] text-slate-400">2 buổi • 5 tiết/buổi</span>
                  </div>
                  <input
                    type="text"
                    list="edit-school-periods-list"
                    disabled={isEditLocked}
                    value={editingLog.periodOrTime || ''}
                    onChange={(e) => setEditingLog({ ...editingLog, periodOrTime: e.target.value })}
                    placeholder="VD: Tiết 1, Tiết 6 (Tiết 1 Chiều)..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-60"
                  />
                  <datalist id="edit-school-periods-list">
                    {ALL_SCHOOL_PERIODS.map((p) => (
                      <option key={p.value} value={p.value} />
                    ))}
                  </datalist>

                  {/* Quick Select Buttons */}
                  <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px]">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">☀️ Sáng:</span>
                    {MORNING_PERIODS.slice(0, 5).map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setEditingLog({ ...editingLog, periodOrTime: p.value })}
                        className={`px-1.5 py-0.5 rounded border transition ${
                          editingLog.periodOrTime === p.value
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p.shortLabel}
                      </button>
                    ))}
                    <span className="font-semibold text-sky-600 dark:text-sky-400 ml-1">🌤️ Chiều:</span>
                    {AFTERNOON_PERIODS.slice(0, 5).map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setEditingLog({ ...editingLog, periodOrTime: p.value })}
                        className={`px-1.5 py-0.5 rounded border transition ${
                          editingLog.periodOrTime === p.value
                            ? 'bg-sky-500 text-white border-sky-500'
                            : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Mô tả hành vi</label>
                  <input
                    type="text"
                    disabled={isEditLocked}
                    value={editingLog.behaviorDescription}
                    onChange={(e) => setEditingLog({ ...editingLog, behaviorDescription: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Điểm mỗi lần</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      disabled={isEditLocked}
                      value={editingLog.scorePerUnit}
                      onChange={(e) => setEditingLog({ ...editingLog, scorePerUnit: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Số lần</label>
                    <input
                      type="number"
                      min="1"
                      disabled={isEditLocked}
                      value={editingLog.count}
                      onChange={(e) => setEditingLog({ ...editingLog, count: Math.max(1, Number(e.target.value)) })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Ghi chú</label>
                  <input
                    type="text"
                    disabled={isEditLocked}
                    value={editingLog.note || ''}
                    onChange={(e) => setEditingLog({ ...editingLog, note: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl disabled:opacity-60"
                  />
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-750 rounded-xl border flex justify-between items-center font-mono">
                  <span>Tổng điểm sau chỉnh sửa:</span>
                  <span className="font-bold text-base">
                    {editingLog.type === 'deduct' ? '-' : '+'}
                    {formatVietnameseNumber(editingLog.scorePerUnit * editingLog.count)}đ
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={isEditLocked}
                  onClick={async () => {
                    if (isEditLocked) return;
                    await updateDisciplineLog(
                      editingLog.id,
                      {
                        date: editingLog.date,
                        weekNumber: editingLog.weekNumber,
                        behaviorDescription: editingLog.behaviorDescription,
                        scorePerUnit: editingLog.scorePerUnit,
                        count: editingLog.count,
                        periodOrTime: editingLog.periodOrTime,
                        note: editingLog.note,
                      },
                      classConfig.homeroomTeacher
                    );
                    setEditingLog(null);
                  }}
                  className="px-4 py-2 bg-blue-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold hover:bg-blue-500 cursor-pointer"
                >
                  Cập nhật bản ghi
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Lịch sử chỉnh sửa */}
      {historyLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="mobile-dialog-panel bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="h-4 w-4 text-blue-600" />
                <span>Lịch Sử Thao Tác Bản Ghi</span>
              </h3>
              <button onClick={() => setHistoryLog(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
              {historyLog.history?.map((entry, i) => (
                <div key={i} className="p-3 bg-slate-50 dark:bg-slate-750 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                    <span>{formatVietnameseDate(entry.timestamp)} {entry.timestamp.slice(11, 16)}</span>
                    <span className="font-bold text-blue-600">{entry.editorName}</span>
                  </div>
                  {entry.previousValue && (
                    <p className="text-slate-500 line-through">Cũ: {entry.previousValue}</p>
                  )}
                  <p className="text-slate-800 dark:text-slate-200 font-medium">Mới: {entry.newValue}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setHistoryLog(null)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận xóa bản ghi */}
      {deletingLogId && (() => {
        const targetLog = disciplineLogs.find((l) => l.id === deletingLogId);
        const isDeleteLocked = targetLog ? isPeriodLocked('week', targetLog.weekNumber) : false;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
            <div className="mobile-dialog-panel bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 text-center">
              <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Xóa bản ghi nhật ký?</h3>

              {isDeleteLocked ? (
                <div className="p-3 my-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 text-left flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>Tuần {targetLog?.weekNumber} đã được Ban Giám Hiệu khóa thi đua. Không thể xóa bản ghi này.</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Điểm rèn luyện của học sinh và tổng kết tuần/tháng sẽ tự động được tính toán lại ngay sau khi xóa.
                </p>
              )}

              <div className="flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingLogId(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {isDeleteLocked ? 'Đóng' : 'Hủy'}
                </button>
                {!isDeleteLocked && (
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteDisciplineLog(deletingLogId, classConfig.homeroomTeacher);
                      setDeletingLogId(null);
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Đồng ý xóa
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL: Tải lên nhật ký lỗi từ Excel/CSV */}
      <ImportDisciplineLogsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />
    </div>
  );
};
