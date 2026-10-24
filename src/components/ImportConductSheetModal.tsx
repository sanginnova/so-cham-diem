import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  Calendar,
  Sparkles,
  ClipboardPaste,
  Check,
  Trash2,
  Info,
  Layers,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import {
  parseConductWorkbook,
  parseConductPastedText,
  buildDisciplineLogsFromConductSheet,
  ParsedConductSheet,
} from '../lib/conductSheetImporter';
import { SAMPLE_12B4_CONDUCT_DATA } from '../data/sample12B4ConductData';
import { removeVietnameseAccents } from '../lib/utils';

// Mẫu dữ liệu chuẩn 100% từ ảnh chụp sổ chấm điểm rèn luyện
const USER_IMAGE_SAMPLE_TEXT = `STT\tHọ và tên\tĐiểm rèn luyện\tLỗi vi phạm\tĐiểm cộng
1\tNguyễn Quang Anh\t\t\t
2\tTrần Duy Anh\t9\tngủ trong giờ (-3đ)\tđi học đầy đủ (+2 đ)
3\tPhạm Quốc Bảo\t12\t\tđi học đầy đủ (+2 đ)
4\tNguyễn Duy Chính\t8\tĐi học muộn; không trực nhật; 0 điểm GDKT-PL;\t
5\tHà Nhất Chính\t8\thay ngủ trong giờ , nói chuyện riêng\t
6\tDương Đức Cường\t3\thay nghỉ học tự do , đi học muộn\t
7\tĐặng Việt Dũng\t12\t\tđi học đầy đủ (+2 đ)
8\tLê Trung Dũng\t11\tngủ trong giờ\tđi học đầy đủ (+2 đ)
9\tTrần Tiến Dũng\t5\tmtt(-1đ), nghỉ không phép(-3đ), không viết bài(-1đ)\t
10\tĐặng Ngọc Duy\t12\t\tđi học đầy đủ (+2 đ)
11\tPhạm Quốc Đại\t12\t\tđi học đầy đủ (+2 đ)
12\tKiều Duy Đạt\t12\t\t10đ hóa (+2đ)`;

interface ImportConductSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultWeekNumber?: number;
  initialMode?: 'paste' | 'file' | 'sample';
}

export const ImportConductSheetModal: React.FC<ImportConductSheetModalProps> = ({
  isOpen,
  onClose,
  defaultWeekNumber,
  initialMode = 'paste',
}) => {
  const {
    students,
    classConfig,
    behaviorCategories,
    addStudent,
    importDisciplineLogsBatch,
    updateClassConfig,
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Tab: 'paste' (Dán từ Excel), 'file' (Tải file .xlsx), 'sample' (Nạp mẫu 12B4)
  const [activeTab, setActiveTab] = useState<'paste' | 'file' | 'sample'>(initialMode);
  const [targetWeek, setTargetWeek] = useState<number>(defaultWeekNumber || 1);
  const [targetMonth, setTargetMonth] = useState<number>(10);
  const [pastedText, setPastedText] = useState<string>('');

  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [parsedSheets, setParsedSheets] = useState<ParsedConductSheet[]>([]);
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const [autoAddMissingStudents, setAutoAddMissingStudents] = useState<boolean>(true);
  const [syncClassInfo, setSyncClassInfo] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<{
    addedStudents: number;
    importedLogs: number;
    sheetsProcessed: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Map students by normalized name
  const studentMap = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((s) => {
      map.set(removeVietnameseAccents(s.fullName.trim().toLowerCase()), s);
    });
    return map;
  }, [students]);

  // Sync default week number when opened
  useEffect(() => {
    if (defaultWeekNumber) {
      setTargetWeek(defaultWeekNumber);
      // Tìm tháng tương ứng từ config nếu có
      const foundWeek = classConfig.weeks.find((w) => w.weekNumber === defaultWeekNumber);
      if (foundWeek) {
        setTargetMonth(foundWeek.month);
      }
    }
  }, [defaultWeekNumber, classConfig.weeks]);

  // Tự động phân tích khi thay đổi pastedText hoặc targetWeek/targetMonth
  const handleParseText = (text: string, week: number, month: number) => {
    setErrorMessage('');
    setImportResult(null);

    if (!text.trim()) {
      setParsedSheets([]);
      return;
    }

    try {
      const parsed = parseConductPastedText(text, students, {
        weekNumber: week,
        month,
        className: classConfig.className,
        homeroomTeacher: classConfig.homeroomTeacher,
      });

      if (parsed.students.length === 0) {
        setErrorMessage('Không tìm thấy dữ liệu học sinh hợp lệ. Vui lòng kiểm tra lại nội dung dán từ Excel.');
        setParsedSheets([]);
        return;
      }

      setParsedSheets([parsed]);
      setSelectedSheetIndex(0);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi phân tích dữ liệu dán');
      setParsedSheets([]);
    }
  };

  // Dán từ clipboard hệ thống
  const handlePasteFromClipboard = async () => {
    setErrorMessage('');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setPastedText(text);
          handleParseText(text, targetWeek, targetMonth);
        } else {
          setErrorMessage('Bộ nhớ tạm (Clipboard) hiện đang trống. Hãy vào Excel nhấn Ctrl+C trước.');
        }
      } else {
        setErrorMessage('Trình duyệt không cho phép truy cập clipboard tự động. Hãy nhấn vào ô văn bản và bấm phím Ctrl + V.');
      }
    } catch {
      setErrorMessage('Không thể đọc trực tiếp từ clipboard do phân quyền. Hãy nhấn vào ô bên dưới và bấm phím Ctrl + V.');
    }
  };

  // Nạp dữ liệu mẫu từ ảnh chụp của người dùng
  const handleLoadImageSample = () => {
    setPastedText(USER_IMAGE_SAMPLE_TEXT);
    handleParseText(USER_IMAGE_SAMPLE_TEXT, targetWeek, targetMonth);
  };

  // Xóa nội dung dán
  const handleClearPaste = () => {
    setPastedText('');
    setParsedSheets([]);
    setErrorMessage('');
    setImportResult(null);
  };

  // Xử lý đọc file Excel tải lên
  const handleProcessFile = (file: File) => {
    setErrorMessage('');
    setSelectedFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: false });
        const sheets = parseConductWorkbook(workbook, students);

        if (sheets.length === 0) {
          throw new Error(
            'Không tìm thấy bảng điểm rèn luyện hợp lệ trong file. Vui lòng kiểm tra lại cấu trúc tiêu đề (STT, Họ và tên, Điểm rèn luyện, Lỗi vi phạm, Điểm cộng).'
          );
        }

        setParsedSheets(sheets);
        setSelectedSheetIndex(0);
      } catch (err: any) {
        setErrorMessage(err.message || 'Lỗi khi xử lý file Excel');
        setParsedSheets([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Nạp nhanh dữ liệu mẫu Lớp 12B4 Tháng 10
  const handleLoadSample12B4 = () => {
    setErrorMessage('');
    setSelectedFileName('12B4- Chấm điểm rèn luyện tháng 10.xlsx (Mẫu có sẵn)');
    setImportResult(null);

    const sheets: ParsedConductSheet[] = SAMPLE_12B4_CONDUCT_DATA.map((sw) => {
      let matchedCount = 0;
      let newCount = 0;

      const studentRows = sw.students.map((st) => {
        const norm = removeVietnameseAccents(st.name.trim().toLowerCase());
        const matched = studentMap.get(norm);
        if (matched) matchedCount++;
        else newCount++;

        return {
          stt: typeof st.stt === 'number' ? st.stt : parseInt(String(st.stt), 10) || 1,
          rawName: st.name,
          score: typeof st.score === 'number' ? st.score : parseFloat(String(st.score)) || null,
          violationsRaw: st.violations,
          bonusesRaw: st.bonuses,
          matchedStudent: matched,
          status: (matched ? 'matched' : 'new_student') as 'matched' | 'new_student',
          parsedViolations: st.violations
            ? st.violations.split(/[;\n]+/).filter(Boolean).map((v) => ({
                rawText: v.trim(),
                cleanName: v.replace(/\([^)]*\)/g, '').trim(),
                score: 1,
                count: 1,
              }))
            : [],
          parsedBonuses: st.bonuses
            ? st.bonuses.split(/[;\n]+/).filter(Boolean).map((b) => ({
                rawText: b.trim(),
                cleanName: b.replace(/\([^)]*\)/g, '').trim(),
                score: 1,
                count: 1,
              }))
            : [],
        };
      });

      return {
        sheetName: sw.sheetName,
        weekNumber: sw.weekNumber,
        month: sw.month,
        title: 'KẾT QUẢ RÈN LUYỆN LỚP 12B4',
        homeroomTeacher: 'Ngô Thị Hải Yến',
        className: '12B4',
        students: studentRows,
        totalStudents: studentRows.length,
        matchedCount,
        newStudentCount: newCount,
      };
    });

    setParsedSheets(sheets);
    setSelectedSheetIndex(0);
  };

  // Tải file mẫu chuẩn Excel về máy
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    SAMPLE_12B4_CONDUCT_DATA.forEach((sw) => {
      const ws: XLSX.WorkSheet = {};
      const sheetName = sw.sheetName;

      ws['!rows'] = [
        { hpt: 16 },
        { hpt: 28 },
        { hpt: 20 },
        { hpt: 22 },
        { hpt: 24 },
      ];

      ws['!cols'] = [
        { wch: 6 },
        { wch: 26 },
        { wch: 14 },
        { wch: 45 },
        { wch: 45 },
      ];

      const setCell = (r: number, c: number, v: string | number) => {
        const ref = XLSX.utils.encode_cell({ r, c });
        ws[ref] = { t: typeof v === 'number' ? 'n' : 's', v };
      };

      setCell(1, 0, 'KẾT QUẢ RÈN LUYỆN LỚP 12B4');
      setCell(2, 1, 'GVCN: Ngô Thị Hải Yến');
      setCell(3, 2, `Tuần ${sw.weekNumber}/ Tháng ${sw.month}`);

      setCell(4, 0, 'STT');
      setCell(4, 1, 'Họ và tên');
      setCell(4, 2, 'Điểm rèn luyện');
      setCell(4, 3, 'Lỗi vi phạm');
      setCell(4, 4, 'Điểm cộng');

      sw.students.forEach((st, idx) => {
        const r = 5 + idx;
        setCell(r, 0, idx + 1);
        setCell(r, 1, st.name);
        if (st.score !== null) setCell(r, 2, st.score);
        if (st.violations) setCell(r, 3, st.violations);
        if (st.bonuses) setCell(r, 4, st.bonuses);
      });

      ws['!merges'] = [
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
        { s: { r: 2, c: 1 }, e: { r: 2, c: 4 } },
        { s: { r: 3, c: 2 }, e: { r: 3, c: 4 } },
      ];

      ws['!ref'] = `A1:E${5 + sw.students.length}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, '12B4- Chấm điểm rèn luyện tháng 10.xlsx');
  };

  // Thực hiện nhập dữ liệu vào hệ thống
  const handleConfirmImport = async (applyAllSheets: boolean) => {
    if (parsedSheets.length === 0) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      const sheetsToImport = applyAllSheets ? parsedSheets : [parsedSheets[selectedSheetIndex]!];
      let addedStudentsCount = 0;
      let totalLogsImported = 0;

      // 1. Tự động thêm học sinh mới nếu bật
      const currentStudentMap = new Map(studentMap);

      if (autoAddMissingStudents) {
        const uniqueNames = new Set<string>();
        sheetsToImport.forEach((s) => {
          s.students.forEach((st) => uniqueNames.add(st.rawName.trim()));
        });

        for (const fullName of uniqueNames) {
          const norm = removeVietnameseAccents(fullName.toLowerCase());
          if (!currentStudentMap.has(norm)) {
            const parts = fullName.split(' ');
            const firstName = parts.pop() || fullName;
            const lastName = parts.join(' ');
            const sttIndex = currentStudentMap.size + 1;
            const studentCode = `HS${classConfig.className}${String(sttIndex).padStart(2, '0')}`;

            const created = await addStudent({
              studentCode,
              fullName,
              lastName,
              firstName,
              gender: 'Nam',
              status: 'active',
            });

            currentStudentMap.set(norm, created);
            addedStudentsCount++;
          }
        }
      }

      // 2. Cập nhật thông tin lớp học nếu được bật
      if (syncClassInfo && parsedSheets[selectedSheetIndex]) {
        const sheet = parsedSheets[selectedSheetIndex];
        if (sheet.className && sheet.className !== classConfig.className) {
          await updateClassConfig({
            className: sheet.className,
            homeroomTeacher: sheet.homeroomTeacher || classConfig.homeroomTeacher,
          });
        }
      }

      // 3. Tạo các bản ghi nhật ký nề nếp và thành tích
      for (const sheet of sheetsToImport) {
        const finalTargetWeek = activeTab === 'paste' ? targetWeek : (defaultWeekNumber || sheet.weekNumber);
        const logsToImport = buildDisciplineLogsFromConductSheet({
          parsedSheet: sheet,
          studentsMap: currentStudentMap,
          targetWeekNumber: finalTargetWeek,
          classConfig,
          behaviorCategories,
        });

        if (logsToImport.length > 0) {
          const res = await importDisciplineLogsBatch(logsToImport);
          totalLogsImported += res.imported;
        }
      }

      setImportResult({
        addedStudents: addedStudentsCount,
        importedLogs: totalLogsImported,
        sheetsProcessed: sheetsToImport.length,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi nhập dữ liệu');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Active sheet
  const activeSheet: ParsedConductSheet | undefined = parsedSheets[selectedSheetIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ClipboardPaste className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                Nhập & Chấm Điểm Rèn Luyện từ Excel
              </h3>
              <p className="text-xs text-slate-500">
                Hỗ trợ sao chép (Ctrl+C) trong Excel và dán (Ctrl+V) trực tiếp vào hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ClipboardPaste className="h-4 w-4" />
              <span>📋 Dán từ Excel (Ctrl+V)</span>
              <span className="text-3xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-extrabold uppercase">
                Mới
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'file'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>📁 Tải file Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sample')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'sample'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>⚡ Mẫu 12B4 tháng 10</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-4">
          {/* TAB 1: PASTE DIRECTLY FROM EXCEL */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              {/* Controls: Target Week & Action Buttons */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                    <span>Áp dụng vào:</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1">
                      <span className="text-slate-500">Tuần:</span>
                      <select
                        value={targetWeek}
                        onChange={(e) => {
                          const w = parseInt(e.target.value, 10);
                          setTargetWeek(w);
                          if (pastedText) handleParseText(pastedText, w, targetMonth);
                        }}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-emerald-700 dark:text-emerald-400 focus:ring-1 focus:ring-emerald-500"
                      >
                        {Array.from({ length: 35 }, (_, i) => i + 1).map((w) => (
                          <option key={w} value={w}>
                            Tuần {w}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center gap-1">
                      <span className="text-slate-500">Tháng:</span>
                      <select
                        value={targetMonth}
                        onChange={(e) => {
                          const m = parseInt(e.target.value, 10);
                          setTargetMonth(m);
                          if (pastedText) handleParseText(pastedText, targetWeek, m);
                        }}
                        className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-emerald-500"
                      >
                        {[9, 10, 11, 12, 1, 2, 3, 4, 5].map((m) => (
                          <option key={m} value={m}>
                            Tháng {m}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Đọc trực tiếp bảng đã sao chép từ bộ nhớ tạm"
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                    <span>Dán từ Clipboard</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadImageSample}
                    className="px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold transition flex items-center gap-1 cursor-pointer"
                    title="Thử nhanh với 12 học sinh mẫu giống trong ảnh bạn chụp"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Thử mẫu ảnh (12 HS)</span>
                  </button>

                  {pastedText && (
                    <button
                      type="button"
                      onClick={handleClearPaste}
                      className="px-2 py-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                      title="Xóa nội dung đã dán"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Textarea for pasting */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={pastedText}
                  onChange={(e) => {
                    const text = e.target.value;
                    setPastedText(text);
                    handleParseText(text, targetWeek, targetMonth);
                  }}
                  onPaste={(e) => {
                    // Tự động phân tích ngay khi dán
                    const pasted = e.clipboardData.getData('text');
                    if (pasted) {
                      setTimeout(() => {
                        handleParseText(pasted, targetWeek, targetMonth);
                      }, 50);
                    }
                  }}
                  rows={4}
                  placeholder={`Mở Excel > Bôi đen các dòng cần chấm điểm > Nhấn Ctrl + C > Bấm vào đây và ấn Ctrl + V\n\nVí dụ cấu trúc 5 cột chuẩn:\nSTT\tHọ và tên\tĐiểm rèn luyện\tLỗi vi phạm\tĐiểm cộng\n1\tNguyễn Quang Anh\t\t\t\n2\tTrần Duy Anh\t9\tngủ trong giờ (-3đ)\tđi học đầy đủ (+2 đ)\n3\tPhạm Quốc Bảo\t12\t\tđi học đầy đủ (+2 đ)\n4\tNguyễn Duy Chính\t8\tĐi học muộn; không trực nhật; 0 điểm GDKT-PL;\t\n5\tHà Nhất Chính\t8\thay ngủ trong giờ , nói chuyện riêng\t\n6\tDương Đức Cường\t3\thay nghỉ học tự do , đi học muộn\t\n7\tĐặng Việt Dũng\t12\t\tđi học đầy đủ (+2 đ)\n8\tLê Trung Dũng\t11\tngủ trong giờ\tđi học đầy đủ (+2 đ)\n9\tTrần Tiến Dũng\t5\tmtt(-1đ), nghỉ không phép(-3đ), không viết bài(-1đ)\t\n10\tĐặng Ngọc Duy\t12\t\tđi học đầy đủ (+2 đ)\n11\tPhạm Quốc Đại\t12\t\tđi học đầy đủ (+2 đ)\n12\tKiều Duy Đạt\t12\t\t10đ hóa (+2đ)`}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 leading-relaxed shadow-inner"
                />
                {!pastedText && (
                  <div className="absolute bottom-3 right-3 text-2xs text-slate-400 pointer-events-none flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    <span>Hỗ trợ cả bảng có hoặc không có tiêu đề, tự động khớp danh sách lớp</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD EXCEL FILE */}
          {activeTab === 'file' && (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleProcessFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                    : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessFile(file);
                  }}
                />
                <Upload className="h-9 w-9 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {selectedFileName ? selectedFileName : 'Kéo thả file Excel hoặc nhấn để chọn file từ máy'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Hỗ trợ tự động các sheet <code className="text-emerald-600 font-bold">T1-T10</code>,{' '}
                  <code className="text-emerald-600 font-bold">T2-T10</code>,{' '}
                  <code className="text-emerald-600 font-bold">T3-T10</code>...
                </p>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Tải file Excel mẫu chuẩn (.xlsx)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SAMPLE 12B4 DATA */}
          {activeTab === 'sample' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleLoadSample12B4}
                className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/70 dark:bg-emerald-950/40 dark:border-emerald-800 text-left transition flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2.5 rounded-lg bg-emerald-600 text-white shrink-0 group-hover:scale-105 transition">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                    ⚡ Nạp nhanh toàn bộ mẫu 12B4 Tháng 10
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Nạp đầy đủ 40 học sinh lớp 12B4 kèm điểm rèn luyện & vi phạm cả 3 tuần (T1-T10, T2-T10, T3-T10)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 dark:bg-blue-950/40 dark:border-blue-800 text-left transition flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2.5 rounded-lg bg-blue-600 text-white shrink-0 group-hover:scale-105 transition">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-blue-800 dark:text-blue-300">
                    📥 Tải file Excel mẫu chuẩn (.xlsx)
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    File mẫu chuẩn đầy đủ sheet T1-T10, T2-T10, T3-T10 để điền chấm điểm offline
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {importResult && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  Cập nhật dữ liệu thành công!
                </h4>
                <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 space-y-0.5">
                  <p>• Số tuần đã cập nhật: <strong>{importResult.sheetsProcessed}</strong> tuần</p>
                  <p>• Học sinh mới tự động bổ sung vào lớp: <strong>{importResult.addedStudents}</strong> em</p>
                  <p>• Số lượt ghi nhận vi phạm & cộng điểm: <strong>{importResult.importedLogs}</strong> bản ghi</p>
                </div>
              </div>
            </div>
          )}

          {/* Sheets List & Preview */}
          {parsedSheets.length > 0 && (
            <div className="space-y-3 pt-1">
              {/* Tabs list (when multiple sheets from file) */}
              {parsedSheets.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-semibold text-slate-500 shrink-0">Các Sheet tìm thấy:</span>
                  {parsedSheets.map((s, idx) => (
                    <button
                      key={s.sheetName}
                      type="button"
                      onClick={() => setSelectedSheetIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
                        selectedSheetIndex === idx
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <span>{s.sheetName}</span>
                      <span className="ml-1.5 opacity-80 text-2xs">({s.totalStudents} HS)</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Active Sheet Meta & Stats */}
              {activeSheet && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <span className="text-slate-400">Thời gian:</span>{' '}
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        Tuần {activeTab === 'paste' ? targetWeek : activeSheet.weekNumber} (Tháng {activeTab === 'paste' ? targetMonth : activeSheet.month})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Lớp:</span>{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-100">
                        {activeSheet.className || classConfig.className}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Sĩ số bảng dán:</span>{' '}
                      <span className="font-bold text-slate-800 dark:text-slate-100">{activeSheet.totalStudents} HS</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-2xs">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                      ✓ Đã khớp: {activeSheet.matchedCount} HS
                    </span>
                    {activeSheet.newStudentCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                        + Chưa có trong lớp: {activeSheet.newStudentCount} HS
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="flex items-center gap-4 flex-wrap text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAddMissingStudents}
                    onChange={(e) => setAutoAddMissingStudents(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    Tự động thêm học sinh mới vào lớp (nếu chưa có trong danh sách)
                  </span>
                </label>

                {activeTab !== 'paste' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncClassInfo}
                      onChange={(e) => setSyncClassInfo(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Đồng bộ Tên lớp & GVCN từ file vào Cài đặt
                    </span>
                  </label>
                )}
              </div>

              {/* Table Preview (5 columns matching user image) */}
              {activeSheet && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2 text-center w-12">STT</th>
                        <th className="p-2 w-48">Họ và tên</th>
                        <th className="p-2 text-center w-24">Điểm rèn luyện</th>
                        <th className="p-2">Lỗi vi phạm</th>
                        <th className="p-2">Điểm cộng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeSheet.students.map((st) => (
                        <tr key={st.stt} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2 text-center text-slate-500 font-medium">{st.stt}</td>
                          <td className="p-2 font-medium text-slate-800 dark:text-slate-200">
                            <div>{st.rawName}</div>
                            {st.status === 'new_student' ? (
                              <span className="text-3xs px-1.5 py-0.2 rounded bg-amber-50 text-amber-600 border border-amber-200 font-semibold">
                                + Học sinh mới
                              </span>
                            ) : (
                              st.matchedStudent && (
                                <span className="text-3xs text-emerald-600 dark:text-emerald-400">
                                  {st.matchedStudent.studentCode}
                                </span>
                              )
                            )}
                          </td>
                          <td className="p-2 text-center font-bold text-red-600 text-sm">
                            {st.score !== null ? st.score : <span className="text-slate-300 font-normal">—</span>}
                          </td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">
                            {st.parsedViolations.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {st.parsedViolations.map((v, vIdx) => (
                                  <span
                                    key={vIdx}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 text-3xs border border-red-200 dark:border-red-800/80"
                                  >
                                    <span>{v.cleanName}</span>
                                    <span className="font-bold text-red-600">(-{v.score}đ)</span>
                                  </span>
                                ))}
                              </div>
                            ) : st.violationsRaw ? (
                              <span className="whitespace-pre-line text-slate-600 dark:text-slate-400">
                                {st.violationsRaw}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">
                            {st.parsedBonuses.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {st.parsedBonuses.map((b, bIdx) => (
                                  <span
                                    key={bIdx}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-3xs border border-emerald-200 dark:border-emerald-800/80"
                                  >
                                    <span>{b.cleanName}</span>
                                    <span className="font-bold text-emerald-600">(+{b.score}đ)</span>
                                  </span>
                                ))}
                              </div>
                            ) : st.bonusesRaw ? (
                              <span className="whitespace-pre-line text-slate-600 dark:text-slate-400">
                                {st.bonusesRaw}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            Đóng
          </button>

          {parsedSheets.length > 0 && (
            <div className="flex items-center gap-2">
              {parsedSheets.length > 1 && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleConfirmImport(false)}
                  className="px-4 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Chỉ cập nhật Sheet này ({activeSheet?.sheetName})
                </button>
              )}

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleConfirmImport(activeTab !== 'paste' && parsedSheets.length > 1)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs hover:shadow cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                <Check className="h-4 w-4" />
                <span>
                  {activeTab === 'paste'
                    ? `🚀 Cập nhật ${activeSheet?.students.length || 0} HS vào Sổ Rèn Luyện (Tuần ${targetWeek})`
                    : parsedSheets.length > 1
                    ? `Cập nhật Tất cả ${parsedSheets.length} Tuần vào Sổ`
                    : `Cập nhật vào Sổ Rèn Luyện`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
