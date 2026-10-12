import React, { useState } from 'react';
import {
  Printer,
  Download,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  Eye,
  Camera,
} from 'lucide-react';
import { formatVietnameseNumber } from '../lib/utils';
import { ConductSheetPrintModal } from './ConductSheetPrintModal';
import {
  exportConductSheetToExcel,
  exportConductSheetToWord,
  copyConductSheetToClipboard,
} from '../lib/conductReportExport';

export interface ConductSheetRow {
  stt: number;
  studentId: string;
  studentCode: string;
  fullName: string;
  finalScore: number;
  violationsLines: string[];
  bonusesList: string[];
}

export interface ConductSheetTableProps {
  className: string;
  periodLabel: string; // e.g. "Tuần 5" hoặc "Tháng 10"
  schoolYear?: string;
  homeroomTeacher?: string;
  rows: ConductSheetRow[];
  sortField?: 'stt' | 'name' | 'score';
  sortDirection?: 'asc' | 'desc';
  stats?: {
    totalStudents: number;
    avgScore: number;
    excellentCount?: number;
    goodCount?: number;
    fairCount?: number;
    mediumCount?: number;
    weakCount?: number;
    totalViolations?: number;
    totalBonuses?: number;
  };
  onSortChange?: (field: 'stt' | 'name' | 'score') => void;
  onPrint?: () => void;
  onExportExcel?: () => void;
}

export const ConductSheetTable: React.FC<ConductSheetTableProps> = ({
  className,
  periodLabel,
  schoolYear = '2024 - 2025',
  homeroomTeacher = 'Nguyễn Văn Sang',
  rows,
  sortField = 'stt',
  sortDirection = 'asc',
  stats,
  onSortChange,
  onPrint,
  onExportExcel,
}) => {
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const exportOptions = {
    className,
    schoolYear,
    periodLabel,
    homeroomTeacher,
    rows,
    stats,
  };

  const handleExportExcelClick = () => {
    if (onExportExcel) {
      onExportExcel();
    } else {
      exportConductSheetToExcel(exportOptions);
    }
  };

  const handleExportWordClick = () => {
    exportConductSheetToWord(exportOptions);
  };

  const handleCopyClick = async () => {
    const ok = await copyConductSheetToClipboard(exportOptions);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenPrint = () => {
    setIsPrintModalOpen(true);
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-4 sm:p-6 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* TOOLBAR FOR SCREEN VIEW */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-100 dark:border-slate-750 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                Mẫu Sổ Rèn Luyện (Chuẩn truyền thống 5 cột)
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium">
                Sĩ số: {rows.length} HS
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Điểm rèn luyện nổi bật, chi tiết các lỗi vi phạm và cộng điểm theo chuẩn mẫu sổ lớp 12B6.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcelClick}
              className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              title="Xuất file Excel (.xlsx) chuẩn 2 tầng tiêu đề và chữ ký"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Xuất Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleExportWordClick}
              className="px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
              title="Xuất file Word (.doc) mở bằng Microsoft Word"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Xuất Word (.doc)</span>
            </button>

            <button
              onClick={handleCopyClick}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1 cursor-pointer transition shadow-2xs"
              title="Sao chép bảng rèn luyện"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
            </button>

            <button
              onClick={handleOpenPrint}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-xs hover:shadow active:scale-95"
              title="Xem mẫu sổ rèn luyện A4 chuẩn 10A8 - Cho phép sao chép ảnh (Ctrl+V) dán Zalo/Word hoặc In PDF"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>📷 Mẫu sổ A4 (Copy ảnh / In)</span>
            </button>
          </div>
        </div>

        {/* PRINT TITLE (MATCHING PHOTO) */}
        <div className="hidden print:block mb-4 text-center">
          <h1 className="text-xl font-black uppercase text-black tracking-wider">
            KẾT QUẢ RÈN LUYỆN LỚP {className}
          </h1>
        </div>

        {/* SCREEN TITLE */}
        <div className="py-4 text-center print:hidden">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
            KẾT QUẢ RÈN LUYỆN LỚP {className}
          </h2>
        </div>

        {/* TRADITIONAL CONDUCT TABLE */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left text-xs sm:text-sm border-collapse border border-slate-300 dark:border-slate-600 print:border-black print:text-black">
            <thead>
              {/* ROW 1: TT, Họ và tên, Cột gộp Tuần/Tháng */}
              <tr className="bg-slate-100 dark:bg-slate-800 print:bg-slate-100 text-slate-900 dark:text-slate-100 print:text-black">
                <th
                  rowSpan={2}
                  onClick={() => onSortChange && onSortChange('stt')}
                  className="py-2.5 px-2 w-12 text-center font-bold border border-slate-300 dark:border-slate-600 print:border-black select-none cursor-pointer hover:bg-slate-200/80 transition"
                  title="Sắp xếp theo STT"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>TT</span>
                    {onSortChange && sortField === 'stt' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600 print:hidden" /> : <ArrowDown className="h-3 w-3 text-blue-600 print:hidden" />
                    )}
                  </div>
                </th>

                <th
                  rowSpan={2}
                  onClick={() => onSortChange && onSortChange('name')}
                  className="py-2.5 px-3 min-w-[170px] sm:min-w-[200px] text-center font-bold border border-slate-300 dark:border-slate-600 print:border-black select-none cursor-pointer hover:bg-slate-200/80 transition"
                  title="Sắp xếp theo Họ và tên A-Z"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Họ và tên</span>
                    {onSortChange && sortField === 'name' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600 print:hidden" /> : <ArrowDown className="h-3 w-3 text-blue-600 print:hidden" />
                    )}
                  </div>
                </th>

                <th
                  colSpan={3}
                  className="py-2 px-3 text-center font-black text-sm uppercase bg-slate-200 dark:bg-slate-750 print:bg-slate-200 text-slate-900 dark:text-white print:text-black border border-slate-300 dark:border-slate-600 print:border-black tracking-wide"
                >
                  {periodLabel}
                </th>
              </tr>

              {/* ROW 2: Điểm rèn luyện, Lỗi vi phạm, Cộng điểm */}
              <tr className="bg-slate-50 dark:bg-slate-800/90 print:bg-slate-50 text-slate-900 dark:text-slate-200 print:text-black font-bold">
                <th
                  onClick={() => onSortChange && onSortChange('score')}
                  className="py-2 px-2 w-28 text-center font-bold border border-slate-300 dark:border-slate-600 print:border-black select-none cursor-pointer hover:bg-slate-200/80 transition"
                  title="Sắp xếp theo Điểm rèn luyện"
                >
                  <div className="flex items-center justify-center gap-1">
                    <div className="flex flex-col items-center leading-tight">
                      <span>Điểm</span>
                      <span>rèn luyện</span>
                    </div>
                    {onSortChange && sortField === 'score' && (
                      sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600 print:hidden" /> : <ArrowDown className="h-3 w-3 text-blue-600 print:hidden" />
                    )}
                  </div>
                </th>

                <th className="py-2 px-3 min-w-[240px] text-center font-bold border border-slate-300 dark:border-slate-600 print:border-black">
                  Lỗi vi phạm
                </th>

                <th className="py-2 px-3 min-w-[240px] text-center font-bold border border-slate-300 dark:border-slate-600 print:border-black">
                  Cộng điểm
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-300 dark:divide-slate-700 print:divide-black bg-white dark:bg-slate-850 print:bg-white text-slate-800 dark:text-slate-200 print:text-black">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 font-medium border border-slate-300 print:border-black">
                    Không có dữ liệu học sinh trong kỳ này.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const hasViolations = r.violationsLines.length > 0;
                  const hasBonuses = r.bonusesList.length > 0;

                  return (
                    <tr
                      key={r.studentId}
                      className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors break-inside-avoid print:hover:bg-transparent"
                    >
                      {/* 1. TT */}
                      <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 print:text-black font-medium border border-slate-300 dark:border-slate-600 print:border-black align-top">
                        {idx + 1}
                      </td>

                      {/* 2. Họ và tên */}
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white print:text-black border border-slate-300 dark:border-slate-600 print:border-black align-top whitespace-nowrap">
                        {r.fullName}
                      </td>

                      {/* 3. Điểm rèn luyện (In màu đỏ đậm nổi bật như ảnh mẫu) */}
                      <td className="py-2.5 px-2 text-center border border-slate-300 dark:border-slate-600 print:border-black align-top">
                        <span className="font-black text-sm sm:text-base text-red-600 dark:text-red-400 print:text-red-700 tabular-nums">
                          {formatVietnameseNumber(r.finalScore)}
                        </span>
                      </td>

                      {/* 4. Lỗi vi phạm (Xuống dòng từng lỗi kèm số lần) */}
                      <td className="py-2.5 px-3 border border-slate-300 dark:border-slate-600 print:border-black align-top text-xs leading-relaxed text-slate-800 dark:text-slate-200 print:text-black">
                        {hasViolations ? (
                          <div className="space-y-1">
                            {r.violationsLines.map((vLine, vIdx) => (
                              <div key={vIdx} className="leading-snug">
                                {vLine}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 print:hidden select-none"></span>
                        )}
                      </td>

                      {/* 5. Cộng điểm (Cách nhau dấu phẩy hoặc xuống dòng) */}
                      <td className="py-2.5 px-3 border border-slate-300 dark:border-slate-600 print:border-black align-top text-xs leading-relaxed text-slate-800 dark:text-slate-200 print:text-black">
                        {hasBonuses ? (
                          <div className="leading-snug">
                            {r.bonusesList.join(', ')}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 print:hidden select-none"></span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PRINT STATISTICAL SUMMARY */}
        {stats && (
          <div className="hidden print:block mt-3 text-[11px] italic text-black border-b border-black pb-2">
            * <strong>Thống kê tổng hợp:</strong> Sĩ số: <strong>{stats.totalStudents}</strong> HS |
            Điểm trung bình: <strong>{formatVietnameseNumber(stats.avgScore)}</strong>
            {stats.goodCount !== undefined && ` | Tốt: ${stats.goodCount}`}
            {stats.fairCount !== undefined && ` | Khá: ${stats.fairCount}`}
            {stats.mediumCount !== undefined && ` | Đạt: ${stats.mediumCount}`}
            {stats.weakCount !== undefined && ` | Yếu: ${stats.weakCount}`}
          </div>
        )}
      </div>

      {/* PRINT & EXPORT MODAL */}
      <ConductSheetPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        className={className}
        schoolYear={schoolYear}
        periodLabel={periodLabel}
        homeroomTeacher={homeroomTeacher}
        rows={rows}
        stats={stats}
      />
    </>
  );
};
