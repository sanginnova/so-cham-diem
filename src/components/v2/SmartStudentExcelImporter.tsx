import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  RefreshCw,
  ArrowRight,
  Filter,
  Check,
  Info,
} from 'lucide-react';
import { Student } from '../../types';
import { downloadStudentTemplate, removeVietnameseAccents } from '../../lib/utils';

interface ParsedStudentRow {
  rowNum: number;
  studentCode: string;
  lastName: string;
  firstName: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: 'Nam' | 'Nữ';
  ethnicity?: string;
  parentName?: string;
  parentPhone?: string;
  status: 'new' | 'duplicate' | 'error';
  errorMsg?: string;
  existingStudent?: Student;
}

interface SmartStudentExcelImporterProps {
  isOpen: boolean;
  onClose: () => void;
  existingStudents: Student[];
  onImport: (
    studentsToImport: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt' | 'teacherId' | 'classId'>>,
    onDuplicate: 'update' | 'skip'
  ) => Promise<{ imported: number; updated: number }>;
}

export const SmartStudentExcelImporter: React.FC<SmartStudentExcelImporterProps> = ({
  isOpen,
  onClose,
  existingStudents,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'new' | 'duplicate' | 'error'>('all');
  const [onDuplicateAction, setOnDuplicateAction] = useState<'update' | 'skip'>('update');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number } | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Map of existing students by normalized code
  const existingMap = useMemo(() => {
    const map = new Map<string, Student>();
    existingStudents.forEach((st) => {
      map.set(st.studentCode.trim().toLowerCase(), st);
    });
    return map;
  }, [existingStudents]);

  // Statistics
  const stats = useMemo(() => {
    const total = parsedRows.length;
    const newCount = parsedRows.filter((r) => r.status === 'new').length;
    const duplicateCount = parsedRows.filter((r) => r.status === 'duplicate').length;
    const errorCount = parsedRows.filter((r) => r.status === 'error').length;
    return { total, newCount, duplicateCount, errorCount };
  }, [parsedRows]);

  // Filtered rows for preview table
  const displayedRows = useMemo(() => {
    if (filterType === 'all') return parsedRows;
    return parsedRows.filter((r) => r.status === filterType);
  }, [parsedRows, filterType]);

  // Helper to parse date
  const parseExcelDate = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'number') {
      // Excel serial date format
      const date = new Date((val - (25567 + 2)) * 86400 * 1000);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    const str = String(val).trim();
    // Try DD/MM/YYYY or DD-MM-YYYY
    const dmy = str.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/);
    if (dmy) {
      const dd = dmy[1].padStart(2, '0');
      const mm = dmy[2].padStart(2, '0');
      const yyyy = dmy[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    return str;
  };

  // Process file buffer
  const processFile = (file: File) => {
    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Parse to JSON array of objects
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });

        if (rawJson.length < 2) {
          alert('Tệp không có dữ liệu học sinh hoặc thiếu dòng tiêu đề.');
          return;
        }

        // Find header row (usually row 0, 1, or 2)
        let headerRowIndex = 0;
        let colMap: Record<string, number> = {};

        for (let i = 0; i < Math.min(5, rawJson.length); i++) {
          const row = rawJson[i];
          const tempMap: Record<string, number> = {};
          let matches = 0;

          row.forEach((cellVal: any, colIdx: number) => {
            const rawHeader = removeVietnameseAccents(String(cellVal).trim().toLowerCase());

            if (
              rawHeader.includes('ma hs') ||
              rawHeader.includes('ma hoc sinh') ||
              rawHeader.includes('sbd') ||
              rawHeader.includes('code') ||
              rawHeader === 'ma'
            ) {
              tempMap.code = colIdx;
              matches++;
            } else if (
              rawHeader.includes('ho va ten') ||
              rawHeader.includes('ho ten') ||
              rawHeader.includes('ho ten hoc sinh') ||
              rawHeader === 'ten hs'
            ) {
              tempMap.fullName = colIdx;
              matches++;
            } else if (rawHeader === 'ho' || rawHeader.includes('ho dem') || rawHeader.includes('ho lot')) {
              tempMap.lastName = colIdx;
              matches++;
            } else if (rawHeader === 'ten' || rawHeader === 'ten goi') {
              tempMap.firstName = colIdx;
              matches++;
            } else if (
              rawHeader.includes('ngay sinh') ||
              rawHeader.includes('sinh ngay') ||
              rawHeader.includes('dob') ||
              rawHeader.includes('nam sinh')
            ) {
              tempMap.dob = colIdx;
            } else if (rawHeader.includes('gioi tinh') || rawHeader.includes('phai') || rawHeader === 'gt') {
              tempMap.gender = colIdx;
            } else if (rawHeader.includes('dan toc')) {
              tempMap.ethnicity = colIdx;
            } else if (
              rawHeader.includes('sdt') || rawHeader.includes('dien thoai') ||
              rawHeader.includes('so dt') || rawHeader.includes('phone')
            ) {
              tempMap.parentPhone = colIdx;
            } else if (
              rawHeader.includes('phu huynh') ||
              rawHeader.includes('ten cha me') ||
              rawHeader.includes('ho ten ph')
            ) {
              tempMap.parentName = colIdx;
            } else if (
              rawHeader.includes('sdt') ||
              rawHeader.includes('dien thoai') ||
              rawHeader.includes('so dt') ||
              rawHeader.includes('phone')
            ) {
              tempMap.parentPhone = colIdx;
            }
          });

          if (matches >= 2) {
            headerRowIndex = i;
            colMap = tempMap;
            break;
          }
        }

        // If no smart header match found, fallback to standard column indices
        if (Object.keys(colMap).length === 0) {
          colMap = {
            code: 1,
            fullName: 2,
            dob: 3,
            gender: 4,
            parentName: 5,
            parentPhone: 6,
          };
        }

        const rows: ParsedStudentRow[] = [];

        for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
          const rowData = rawJson[r];
          // Skip completely empty rows
          if (!rowData || rowData.every((c: any) => String(c).trim() === '')) {
            continue;
          }

          const rawCode = colMap.code !== undefined ? String(rowData[colMap.code]).trim() : '';
          const rawFull = colMap.fullName !== undefined ? String(rowData[colMap.fullName]).trim() : '';
          const rawLast = colMap.lastName !== undefined ? String(rowData[colMap.lastName]).trim() : '';
          const rawFirst = colMap.firstName !== undefined ? String(rowData[colMap.firstName]).trim() : '';
          const rawDob = colMap.dob !== undefined ? parseExcelDate(rowData[colMap.dob]) : '';
          const rawGender = colMap.gender !== undefined ? String(rowData[colMap.gender]).trim() : '';
          const rawParentName = colMap.parentName !== undefined ? String(rowData[colMap.parentName]).trim() : '';
          const rawParentPhone = colMap.parentPhone !== undefined ? String(rowData[colMap.parentPhone]).trim() : '';

          let resolvedLastName = rawLast;
          let resolvedFirstName = rawFirst;
          let resolvedFullName = '';

          if (!resolvedFirstName && rawFull) {
            const parts = rawFull.split(' ').filter(Boolean);
            if (parts.length > 1) {
              resolvedFirstName = parts.pop() || '';
              resolvedLastName = parts.join(' ');
            } else {
              resolvedFirstName = rawFull;
              resolvedLastName = '';
            }
          }

          resolvedFullName = resolvedLastName
            ? `${resolvedLastName} ${resolvedFirstName}`.trim()
            : resolvedFirstName.trim();

          const normalizedGender: 'Nam' | 'Nữ' =
            rawGender.toLowerCase().includes('nữ') || rawGender.toLowerCase() === 'f'
              ? 'Nữ'
              : 'Nam';

          let status: 'new' | 'duplicate' | 'error' = 'new';
          let errorMsg = '';

          if (!rawCode) {
            status = 'error';
            errorMsg = 'Thiếu mã học sinh';
          } else if (!resolvedFirstName && !resolvedFullName) {
            status = 'error';
            errorMsg = 'Thiếu tên học sinh';
          } else {
            const existing = existingMap.get(rawCode.toLowerCase());
            if (existing) {
              status = 'duplicate';
              errorMsg = `Đã tồn tại: ${existing.fullName}`;
            }
          }

          rows.push({
            rowNum: r + 1,
            studentCode: rawCode.toUpperCase(),
            lastName: resolvedLastName,
            firstName: resolvedFirstName,
            fullName: resolvedFullName,
            dateOfBirth: rawDob,
            gender: normalizedGender,
            ethnicity: colMap.ethnicity !== undefined ? String(rowData[colMap.ethnicity]).trim() : '',
            parentName: rawParentName,
            parentPhone: rawParentPhone,
            status,
            errorMsg,
            existingStudent: existingMap.get(rawCode.toLowerCase()),
          });
        }

        setParsedRows(rows);
      } catch (err: any) {
        alert('Lỗi phân tích tệp Excel: ' + (err.message || String(err)));
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Perform Import
  const handleExecuteImport = async () => {
    const validRows = parsedRows.filter((r) => r.status !== 'error');
    if (validRows.length === 0) {
      alert('Không có học sinh hợp lệ nào để nhập.');
      return;
    }

    try {
      setIsProcessing(true);
      const payload = validRows.map((r) => ({
        studentCode: r.studentCode,
        lastName: r.lastName,
        firstName: r.firstName,
        fullName: r.fullName,
        dateOfBirth: r.dateOfBirth,
        gender: r.gender,
        ethnicity: r.ethnicity,
        status: 'active' as const,
        parentName: r.parentName,
        parentPhone: r.parentPhone,
      }));

      const res = await onImport(payload, onDuplicateAction);
      setImportResult(res);
    } catch (err: any) {
      alert('Lỗi khi lưu danh sách học sinh: ' + (err.message || String(err)));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  NHẬP DANH SÁCH HỌC SINH TỪ EXCEL V2
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Smart Importer
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Mẫu 8 cột: Mã học sinh, Họ đệm, Tên, Giới tính, Dân tộc, Ngày sinh, Điện thoại phụ huynh, Tên phụ huynh. Để mã và điện thoại ở dạng Văn bản để giữ số 0 đầu.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadStudentTemplate}
              className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-blue-600" />
              <span>Mẫu Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Upload Area when no file selected */}
          {parsedRows.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-10 border-2 border-dashed rounded-3xl text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-850/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-4 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shadow-inner">
                <Upload className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Kéo và thả tệp Excel (.xlsx, .xls) hoặc CSV vào đây
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Hệ thống tự động nhận diện các cột: Mã HS, Họ và tên, Ngày sinh, Giới tính, SĐT phụ huynh
                </p>
              </div>
              <button
                type="button"
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
              >
                Chọn tệp từ máy tính
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Banner & Duplicate Action Config */}
              <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1">
                    Tệp: <span className="text-emerald-600">{fileName}</span>
                  </div>
                  {/* Filter Pills */}
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterType === 'all'
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Tất cả ({stats.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('new')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterType === 'new'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    Mới ({stats.newCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('duplicate')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterType === 'duplicate'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    Trùng mã ({stats.duplicateCount})
                  </button>
                  {stats.errorCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterType('error')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                        filterType === 'error'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      Lỗi ({stats.errorCount})
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Chọn tệp khác</span>
                </button>
              </div>

              {/* Duplicate Strategy Option */}
              {stats.duplicateCount > 0 && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Phát hiện {stats.duplicateCount} học sinh đã có mã trong lớp. Chọn hướng xử lý:</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <label className="flex items-center gap-2 p-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="duplicateAction"
                        checked={onDuplicateAction === 'update'}
                        onChange={() => setOnDuplicateAction('update')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>
                        <strong>Cập nhật thông tin:</strong> Giữ nguyên điểm nề nếp đã chấm, cập nhật họ tên, SĐT, ngày sinh
                      </span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-800 cursor-pointer">
                      <input
                        type="radio"
                        name="duplicateAction"
                        checked={onDuplicateAction === 'skip'}
                        onChange={() => setOnDuplicateAction('skip')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>
                        <strong>Bỏ qua (Skip):</strong> Giữ nguyên học sinh cũ, không sửa đổi gì
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10 text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Dòng</th>
                        <th className="py-2.5 px-3">Mã HS</th>
                        <th className="py-2.5 px-3">Họ và Tên</th>
                        <th className="py-2.5 px-3">Ngày sinh</th>
                        <th className="py-2.5 px-3">Giới tính</th>
                        <th className="py-2.5 px-3">SĐT Phụ huynh</th>
                        <th className="py-2.5 px-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {displayedRows.map((r, i) => (
                        <tr
                          key={i}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-850/60 ${
                            r.status === 'error'
                              ? 'bg-rose-50/40 dark:bg-rose-950/20'
                              : r.status === 'duplicate'
                              ? 'bg-amber-50/40 dark:bg-amber-950/20'
                              : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{r.rowNum}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            {r.studentCode || <span className="text-rose-500">Thiếu</span>}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                            {r.fullName}
                          </td>
                          <td className="py-2 px-3 text-slate-500">{r.dateOfBirth || '-'}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                r.gender === 'Nữ'
                                  ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {r.gender}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-500 font-mono">{r.parentPhone || '-'}</td>
                          <td className="py-2 px-3 text-right">
                            {r.status === 'new' && (
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                <Check className="h-3 w-3" />
                                Mới
                              </span>
                            )}
                            {r.status === 'duplicate' && (
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                <AlertTriangle className="h-3 w-3" />
                                Trùng ({onDuplicateAction === 'update' ? 'Cập nhật' : 'Bỏ qua'})
                              </span>
                            )}
                            {r.status === 'error' && (
                              <span className="inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                                <XCircle className="h-3 w-3" />
                                {r.errorMsg}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Success Result Banner */}
              {importResult && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-200 font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>
                      Nhập thành công! Đã thêm mới <strong>{importResult.imported}</strong> học sinh, cập nhật{' '}
                      <strong>{importResult.updated}</strong> học sinh vào lớp.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer hover:bg-emerald-700"
                  >
                    Hoàn tất
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {parsedRows.length > 0 && (
              <span>
                Sẵn sàng xử lý: <strong>{stats.newCount}</strong> mới,{' '}
                <strong>{stats.duplicateCount}</strong> trùng lặp
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold rounded-xl cursor-pointer"
            >
              {importResult ? 'Đóng' : 'Hủy'}
            </button>
            {parsedRows.length > 0 && !importResult && (
              <button
                type="button"
                disabled={isProcessing || stats.newCount + stats.duplicateCount === 0}
                onClick={handleExecuteImport}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>Đang xử lý...</span>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Xác Nhận Nhập ({stats.newCount + (onDuplicateAction === 'update' ? stats.duplicateCount : 0)} HS)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
