import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  X,
  Layers,
  CheckCircle2,
  AlertCircle,
  School,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { readDeviceGradebook } from '../lib/subjectStatistics';
import { workspaceSubject } from '../lib/teachingWorkspaces';
import {
  exportAllClassesSubjectGradebooksToExcel,
  MultiClassGradebookItem,
} from '../lib/subjectGradebookExport';
import { Student } from '../types';
import { ClassGradebookData } from '../types/subjectGrade';

interface ExportAllGradebooksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportAllGradebooksModal({ isOpen, onClose }: ExportAllGradebooksModalProps) {
  const {
    activeAccount,
    classConfig,
    workspaceClasses,
    students: currentClassStudents,
  } = useApp();

  const [semesterTab, setSemesterTab] = useState<'sem1' | 'sem2' | 'year'>('sem1');
  const [isExporting, setIsExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const teacherName = activeAccount?.displayName || classConfig.homeroomTeacher || 'Nguyễn Văn Sang';
  const teacherId = activeAccount?.uid || classConfig.teacherId || 'guest';

  // Lọc tất cả các lớp bộ môn (hoặc toàn bộ lớp học của Thầy trong năm học)
  const targetClasses = useMemo(() => {
    const list = workspaceClasses.filter(
      (c) => c.classType === 'subject' || c.id === classConfig.id
    );
    // Ưu tiên năm học hiện tại
    const currentYear = classConfig.schoolYear;
    return list.filter((c) => !currentYear || c.schoolYear === currentYear);
  }, [workspaceClasses, classConfig.id, classConfig.schoolYear]);

  // Quét dữ liệu điểm và học sinh của từng lớp
  const classesPreview = useMemo(() => {
    return targetClasses.map((config) => {
      let book: ClassGradebookData | null = null;
      try {
        book = readDeviceGradebook(localStorage, teacherId, config);
        // Fallback đọc thẳng nếu readDeviceGradebook trả về null
        if (!book) {
          const keysToTry = [
            `subject_gradebook_v2_local_${teacherId}_${config.id}`,
            `subject_gradebook_v2_${teacherId}_${config.id}`,
            `subject_gradebook_v2_local_${config.teacherId}_${config.id}`,
            `subject_gradebook_v2_${config.teacherId}_${config.id}`,
            `subject_gradebook_v2_local_guest_${config.id}`,
            `subject_gradebook_${config.id}`,
          ];
          for (const k of keysToTry) {
            const raw = localStorage.getItem(k);
            if (raw) {
              try {
                book = JSON.parse(raw) as ClassGradebookData;
                if (book && book.grades) break;
              } catch {}
            }
          }
          // Quét mọi key localStorage có chứa subject_gradebook và config.id
          if (!book) {
            for (let i = 0; i < localStorage.length; i++) {
              const k = localStorage.key(i);
              if (k && k.includes('subject_gradebook') && k.endsWith(`_${config.id}`)) {
                try {
                  const val = localStorage.getItem(k);
                  if (val) {
                    book = JSON.parse(val) as ClassGradebookData;
                    if (book && book.grades) break;
                  }
                } catch {}
              }
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi đọc sổ điểm lớp', config.className, err);
      }

      // Lấy danh sách học sinh
      let classStudents: Student[] = [];
      if (config.id === classConfig.id && currentClassStudents.length > 0) {
        classStudents = currentClassStudents;
      } else if (config.rosterSourceClassId && config.rosterSourceClassId === classConfig.id && currentClassStudents.length > 0) {
        classStudents = currentClassStudents;
      } else if (book && book.grades && Object.keys(book.grades).length > 0) {
        classStudents = Object.entries(book.grades).map(([id, g], idx) => {
          const rawName = g.fullName || `Học sinh ${idx + 1}`;
          const parts = rawName.trim().split(/\s+/);
          const firstName = parts.pop() || '';
          const lastName = parts.join(' ');
          return {
            id: g.studentId || id,
            fullName: rawName,
            firstName,
            lastName,
            studentCode: g.studentCode || '',
            status: 'active' as const,
            classId: config.id,
            teacherId: config.teacherId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });
      }

      return {
        config,
        book,
        studentCount: classStudents.length,
        students: classStudents,
        hasData: !!book && Object.keys(book.grades || {}).length > 0,
      };
    });
  }, [targetClasses, teacherId, classConfig.id, classConfig.teacherId, currentClassStudents]);

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);
    setSuccessMsg(null);

    try {
      const itemsToExport: MultiClassGradebookItem[] = [];

      for (const item of classesPreview) {
        const gradebookData: ClassGradebookData = item.book || {
          classId: item.config.id,
          teacherId: item.config.teacherId || teacherId,
          teacherName,
          subjectName: workspaceSubject(item.config) || 'Bộ môn',
          schoolYear: item.config.schoolYear,
          txCountSemester1: 4,
          txCountSemester2: 4,
          grades: {},
          revision: 1,
          updatedAt: new Date().toISOString(),
        };

        itemsToExport.push({
          classConfig: item.config,
          gradebook: gradebookData,
          students: item.students,
        });
      }

      const result = exportAllClassesSubjectGradebooksToExcel({
        classesData: itemsToExport,
        teacherName,
        semesterTab,
      });

      setSuccessMsg(
        `Đã xuất thành công ${result.sheetCount} lớp thành các Sheet riêng trong file: ${result.fileName}`
      );
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      alert(`Lỗi khi xuất file Excel: ${err.message || err}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Sổ điểm tất cả các lớp (.xlsx)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Xuất 1 file Excel duy nhất — <strong className="text-purple-600 dark:text-purple-400">Mỗi lớp là 1 Sheet riêng</strong> chuẩn Thông tư 22
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chọn Học kỳ */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Chọn kỳ học cần xuất điểm:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSemesterTab('sem1')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                semesterTab === 'sem1'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Học kỳ I
            </button>
            <button
              type="button"
              onClick={() => setSemesterTab('sem2')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                semesterTab === 'sem2'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Học kỳ II
            </button>
            <button
              type="button"
              onClick={() => setSemesterTab('year')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                semesterTab === 'year'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Cả năm
            </button>
          </div>
        </div>

        {/* Danh sách các Sheet sẽ được tạo trong Excel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>Danh sách các Sheet lớp học ({classesPreview.length} lớp):</span>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-normal">
              Năm học {classConfig.schoolYear}
            </span>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
            {classesPreview.map((item, idx) => (
              <div
                key={item.config.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400 w-5">
                    #{idx + 1}
                  </span>
                  <span className="font-black text-slate-900 dark:text-white">
                    Sheet: &ldquo;{item.config.className}&rdquo;
                  </span>
                  <span className="text-[11px] text-slate-500">
                    ({workspaceSubject(item.config)})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
                    {item.studentCount} học sinh
                  </span>
                  {item.hasData ? (
                    <span className="text-emerald-500 text-[10px] font-bold">✓ Có điểm</span>
                  ) : (
                    <span className="text-slate-400 text-[10px]">Trống</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Thông báo thành công */}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || classesPreview.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>
              {isExporting ? 'Đang xuất Excel...' : `Xuất Excel ${classesPreview.length} lớp (Mỗi lớp 1 Sheet)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
