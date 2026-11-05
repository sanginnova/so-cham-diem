import { homeroomWordNotes } from '../lib/homeroom';
import { generateAutoHomeroomNotes } from '../lib/homeroomAutoFill';
import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  BookOpen,
  FileCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Settings,
  Users,
  Award,
  Sparkles,
  Loader2,
  ShieldCheck,
  Save,
  Check,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { HomeroomBookExportOptions, HomeroomBookNotes } from '../lib/homeroomBookWordExport';

export interface HomeroomBookExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HomeroomBookExportModal: React.FC<HomeroomBookExportModalProps> = ({ isOpen, onClose }) => {
  const {
    classConfig,
    students,
    disciplineLogs: logs,
    getWeeklySummary,
    getMonthlySummary,
    getSemesterSummary,
    userRole,
    homeroomRecords, homeroomLoading, homeroomError,
  } = useApp();

  const [scope, setScope] = useState<'all' | 'semester1' | 'semester2' | 'month'>('all');
  const [selectedMonth, setSelectedMonth] = useState<number>(classConfig.months?.[0] || 9);

  // Content Toggles
  const [includeCover, setIncludeCover] = useState(true);
  const [includeRegulations, setIncludeRegulations] = useState(true);
  const [includeStudentList, setIncludeStudentList] = useState(true);
  const [includeOrganization, setIncludeOrganization] = useState(true);
  const [includeWeeklySummaries, setIncludeWeeklySummaries] = useState(true);
  const [includeSemesterSummary, setIncludeSemesterSummary] = useState(true);
  const [includeStudentFollowUp, setIncludeStudentFollowUp] = useState(true);

  // Editable Administrative Fields (Cached in localStorage)
  const [teacherName, setTeacherName] = useState(classConfig.homeroomTeacher || '');
  const [approverName, setApproverName] = useState('');
  const [classPresident, setClassPresident] = useState(classConfig.classPresident || '');
  const [academicVicePresident, setAcademicVicePresident] = useState(classConfig.academicVicePresident || '');
  const [disciplineVicePresident, setDisciplineVicePresident] = useState(classConfig.disciplineVicePresident || '');
  const [parentHead, setParentHead] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  const [notes, setNotes] = useState<HomeroomBookNotes>({});
  const [department, setDepartment] = useState('');
  const [schoolName, setSchoolName] = useState(classConfig.schoolName || '');
  const [noteMonth, setNoteMonth] = useState(classConfig.months?.[0] || 9);
  const [noteWeek, setNoteWeek] = useState(classConfig.weeks?.[0]?.weekNumber || 1);
  const cacheKey = `homeroom-book:${classConfig.teacherId}:${classConfig.id}`;
  const [activeTab, setActiveTab] = useState<'scope' | 'sections' | 'admin' | 'notes'>('scope');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [autoFillToast, setAutoFillToast] = useState(false);

  const handleAutoFillNotes = (overwrite: boolean = false) => {
    try {
      const generated = generateAutoHomeroomNotes({
        students,
        disciplineLogs: logs,
        classConfig,
        homeroomRecords,
        getWeeklySummary,
        getMonthlySummary,
        getSemesterSummary,
        existingNotes: overwrite ? {} : notes,
        overwrite,
      });
      setNotes(generated);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          teacherName,
          approverName,
          classPresident,
          academicVicePresident,
          disciplineVicePresident,
          parentHead,
          parentPhone,
          notes: generated,
          department,
          schoolName,
          updatedAt: new Date().toISOString()
        }));
      } catch { /* ignore */ }
      setAutoFillToast(true);
      setTimeout(() => setAutoFillToast(false), 3000);
    } catch (err: any) {
      alert('Không thể tạo dữ liệu tự động: ' + (err.message || String(err)));
    }
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        teacherName,
        approverName,
        classPresident,
        academicVicePresident,
        disciplineVicePresident,
        parentHead,
        parentPhone,
        notes,
        department,
        schoolName,
        updatedAt: new Date().toISOString()
      }));
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch (err: any) {
      alert('Không thể lưu vào bộ nhớ trình duyệt: ' + (err.message || String(err)));
    }
  };

  // Drafts are isolated by teacher and class, and reset on each open.
  useEffect(() => {
    if (!isOpen) return;
    let saved: Record<string, any> = {};
    try { const value = JSON.parse(localStorage.getItem(cacheKey) || '{}'); if (value && typeof value === 'object' && !Array.isArray(value)) saved = value; } catch { /* optional cache */ }
    setTeacherName(saved.teacherName ?? classConfig.homeroomTeacher ?? '');
    setApproverName(saved.approverName ?? '');
    setClassPresident(saved.classPresident ?? classConfig.classPresident ?? '');
    setAcademicVicePresident(saved.academicVicePresident ?? classConfig.academicVicePresident ?? '');
    setDisciplineVicePresident(saved.disciplineVicePresident ?? classConfig.disciplineVicePresident ?? '');
    setParentHead(saved.parentHead ?? ''); setParentPhone(saved.parentPhone ?? '');
    const initialNotes: HomeroomBookNotes = saved.notes ?? {};
    const hasAnyContent = Boolean(
      initialNotes.subjectTeachers?.trim() ||
      initialNotes.organization?.trim() ||
      initialNotes.studentFollowUp?.trim() ||
      initialNotes.classSituation?.trim() ||
      initialNotes.annualPlan?.trim()
    );
    if (!hasAnyContent) {
      const autoNotes = generateAutoHomeroomNotes({
        students,
        disciplineLogs: logs,
        classConfig,
        homeroomRecords,
        getWeeklySummary,
        getMonthlySummary,
        getSemesterSummary,
        existingNotes: initialNotes,
        overwrite: false,
      });
      setNotes(autoNotes);
    } else {
      setNotes(initialNotes);
    }
    setDepartment(saved.department ?? '');
    setSchoolName(saved.schoolName ?? classConfig.schoolName ?? '');
    setSelectedMonth(classConfig.months?.[0] || 9); setNoteMonth(classConfig.months?.[0] || 9);
    setNoteWeek(classConfig.weeks?.[0]?.weekNumber || 1); setExportSuccess(false);
  }, [cacheKey, isOpen]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ teacherName, approverName, classPresident,
          academicVicePresident, disciplineVicePresident, parentHead, parentPhone, notes, department, schoolName }));
      } catch { /* Saving a local draft must not prevent downloading. */ }

      if (homeroomLoading || homeroomError) throw new Error(homeroomError || 'Đang tải hồ sơ GVCN, vui lòng thử lại sau.');
      const months = scope === 'month' ? [selectedMonth] : scope === 'semester1' ? classConfig.semester1Months : scope === 'semester2' ? classConfig.semester2Months : classConfig.months;
      const stored = homeroomWordNotes(homeroomRecords, students, classConfig, months);
      const join = (...values: (string | undefined)[]) => values.filter(v => v?.trim()).join('\n\n');
      const weeklyLearning = { ...stored.weeklyLearning }, weeklyComments = { ...stored.weeklyComments };
      for (const w of classConfig.weeks) {
        weeklyLearning[w.weekNumber] = join(stored.weeklyLearning[w.weekNumber], notes.weeklyLearning?.[w.weekNumber]);
        weeklyComments[w.weekNumber] = join(stored.weeklyComments[w.weekNumber], notes.weeklyComments?.[w.weekNumber]);
      }
      const enrichedStudents = students.map(student => {
        const profile = homeroomRecords.filter(r => r.kind === 'profile' && r.studentId === student.id).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.data || {};
        return { ...student, address: profile.address || student.address, group: profile.group || student.group, duty: profile.duty || student.duty, parentOccupation: profile.parentOccupation || student.parentOccupation, disabilityOrOrphan: profile.disabilityOrOrphan || student.disabilityOrOrphan, martyrFamily: profile.martyrFamily || student.martyrFamily, policy: profile.policy || student.policy, parentName: profile.guardianName || student.parentName, parentPhone: profile.guardianPhone || student.parentPhone };
      });
      const options: HomeroomBookExportOptions = {
        className: classConfig.className,
        schoolYear: classConfig.schoolYear,
        homeroomTeacher: teacherName,
        schoolName,
        department,
        notes: { ...notes, parentCooperation: join(stored.parentCooperation, notes.parentCooperation), studentFollowUp: join(stored.studentFollowUp, notes.studentFollowUp), weeklyLearning, weeklyComments },
        approverName,
        students: enrichedStudents,
        classConfig,
        logs,
        getWeeklySummary,
        getMonthlySummary,
        getSemesterSummary,
        scope,
        selectedMonth,
        includeCover,
        includeRegulations,
        includeStudentList,
        includeOrganization,
        includeWeeklySummaries,
        includeSemesterSummary,
        includeStudentFollowUp,
        classPresident,
        academicVicePresident,
        disciplineVicePresident,
        parentRepresentativeHead: parentHead,
        parentRepresentativePhone: parentPhone,
        homeroomRecords,
      };

      const { downloadHomeroomBook } = await import('../lib/homeroomBookWordExport');
      await downloadHomeroomBook(options);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Lỗi khi xuất Sổ Chủ Nhiệm:', err);
      alert('Đã xảy ra lỗi khi tạo file Word: ' + String(err));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-md">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Xuất Sổ Chủ Nhiệm (.docx)</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                  Theo mẫu sổ GVCN
                </span>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                Lớp {classConfig.className} • Năm học {classConfig.schoolYear} • GVCN {teacherName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto shrink-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 px-6 pt-2">
          <button
            onClick={() => setActiveTab('scope')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'scope'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Phạm vi xuất
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'sections'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Nội dung chi tiết
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'admin'
                ? 'border-red-600 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Thông tin cán bộ & phê duyệt
          </button>
          <button onClick={() => setActiveTab('notes')} className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 shrink-0 ${activeTab === 'notes' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500'}`}>
            Nội dung sổ
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <p className="text-xs text-slate-500">Xuất theo các mục của mẫu bạn cung cấp. Dữ liệu lấy từ lớp đang chọn; thông tin còn thiếu để trống để bổ sung trong Word. Bản nháp nội dung lưu trên thiết bị theo từng lớp khi bấm tải.</p>
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Thanh công cụ Tự động điền từ báo cáo */}
              <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-3 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                      <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                      Tự động đọc & điền dữ liệu từ báo cáo hệ thống
                    </div>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                      Đã phân tích: <strong>{students.length} học sinh</strong>, <strong>{logs.length} bản ghi nề nếp & vi phạm</strong>, sơ đồ chỗ ngồi và 4 tổ.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAutoFillNotes(false)}
                      className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
                      title="Tự động đọc nhật ký nề nếp và điền vào các ô còn trống"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>⚡ Điền tự động từ báo cáo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Hệ thống sẽ phân tích lại toàn bộ nhật ký nề nếp, sơ đồ lớp và cập nhật lại nội dung sổ. Bạn có muốn tiếp tục?')) {
                          handleAutoFillNotes(true);
                        }
                      }}
                      className="px-3 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 hover:bg-amber-100/60 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition"
                      title="Làm mới và tính toán lại toàn bộ dữ liệu mới nhất từ báo cáo"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Làm mới</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition"
                      title="Lưu lại nội dung đã chỉnh sửa"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saveToast ? 'Đã lưu!' : 'Lưu'}</span>
                    </button>
                  </div>
                </div>

                {autoFillToast && (
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Đã tự động đọc dữ liệu từ báo cáo hệ thống và cập nhật vào nội dung sổ thành công!</span>
                  </div>
                )}
              </div>

              {([
                ['subjectTeachers', 'Giáo viên bộ môn (mỗi dòng: Môn — Họ tên — SĐT)', 4, 'Đã tổng hợp từ thời khóa biểu và danh sách GVBM'],
                ['organization', 'Phân tổ và nhiệm vụ học sinh', 6, 'Tự động tổng hợp từ Ban cán sự lớp và danh sách 4 tổ'],
                ['seatingPlan', 'Sơ đồ chỗ ngồi (mỗi dòng một bàn)', 5, 'Tự động trích xuất từ sơ đồ lớp học hiện tại'],
                ['classSituation', 'Đặc điểm lớp, thuận lợi và khó khăn', 5, 'Tự động tính toán theo quy mô sĩ số, nam/nữ, diện chính sách'],
                ['annualPlan', 'Kế hoạch công tác chủ nhiệm năm học', 5, 'Kế hoạch sư phạm trọng tâm bám sát năm học'],
                ['annualTargets', 'Chỉ tiêu toàn diện cuối năm và biện pháp', 5, 'Chỉ tiêu thi đua rèn luyện, học tập và danh hiệu tập thể'],
                ['semesterReview', 'Nhận xét học kỳ và phương hướng', 4, 'Tổng hợp đánh giá nề nếp thi đua và phương hướng'],
                ['studentFollowUp', 'Theo dõi học sinh: Nội dung — Biện pháp — Kết quả', 6, 'Tự động tổng hợp từ các bản ghi vi phạm nề nếp & trợ giúp học sinh'],
                ['parentCooperation', 'Phối hợp phụ huynh: Ngày — Nội dung — Kết quả', 5, 'Tự động tổng hợp từ các buổi họp CMHS & ngày có vi phạm chuyên cần'],
              ] as const).map(([key, label, rows, hint]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <label>{label}</label>
                    <span className="text-[11px] text-slate-400 font-normal italic">{hint}</span>
                  </div>
                  <textarea
                    rows={rows}
                    value={notes[key] || ''}
                    onChange={e => setNotes(n => ({ ...n, [key]: e.target.value }))}
                    className="block w-full border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder={`Nội dung ${label.toLowerCase()}...`}
                  />
                </div>
              ))}

              <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <label>Kế hoạch trọng tâm từng tháng:</label>
                    <select
                      value={noteMonth}
                      onChange={e => setNoteMonth(Number(e.target.value))}
                      className="border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-xs font-bold text-red-600 dark:text-red-400"
                    >
                      {classConfig.months.map(m => (
                        <option key={m} value={m}>Tháng {m}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal italic">Kế hoạch chi tiết theo chủ điểm từng tháng</span>
                </div>
                <textarea
                  rows={4}
                  value={notes.monthlyPlans?.[noteMonth] || ''}
                  onChange={e => setNotes(n => ({ ...n, monthlyPlans: { ...n.monthlyPlans, [noteMonth]: e.target.value } }))}
                  className="block w-full border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="Kế hoạch chi tiết của tháng..."
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <label>Nội dung sinh hoạt theo tuần:</label>
                    <select
                      value={noteWeek}
                      onChange={e => setNoteWeek(Number(e.target.value))}
                      className="border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-xs font-bold text-red-600 dark:text-red-400"
                    >
                      {classConfig.weeks.map(w => (
                        <option key={w.weekNumber} value={w.weekNumber}>Tuần {w.weekNumber}</option>
                      ))}
                    </select>
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal italic">Tự động tổng hợp từ nhật ký chấm điểm & sơ kết tuần</span>
                </div>
                {(['weeklyLearning', 'weeklyComments'] as const).map(key => (
                  <div key={key} className="space-y-1">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {key === 'weeklyLearning' ? 'b. Học tập trong tuần' : 'c. Nhận xét & đánh giá tuần'}
                    </span>
                    <textarea
                      rows={3}
                      value={notes[key]?.[noteWeek] || ''}
                      onChange={e => setNotes(n => ({ ...n, [key]: { ...n[key], [noteWeek]: e.target.value } }))}
                      className="block w-full border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:ring-2 focus:ring-red-500 focus:outline-none"
                      placeholder={`Nội dung ${key === 'weeklyLearning' ? 'học tập' : 'nhận xét'} tuần...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* TAB 1: PHẠM VI XUẤT */}
          {activeTab === 'scope' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                  Chọn thời lượng cần xuất
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                      scope === 'all'
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'all'}
                      onChange={() => setScope('all')}
                      className="mt-1 accent-red-600"
                    />
                    <div>
                      <div className="font-bold text-sm">Trọn gói cả năm học</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Các tuần trong lịch lớp, gồm học kỳ I và II
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                      scope === 'semester1'
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'semester1'}
                      onChange={() => setScope('semester1')}
                      className="mt-1 accent-red-600"
                    />
                    <div>
                      <div className="font-bold text-sm">Học kỳ I</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {classConfig.semester1Months.map(m => `Tháng ${m}`).join(', ')}
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                      scope === 'semester2'
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'semester2'}
                      onChange={() => setScope('semester2')}
                      className="mt-1 accent-red-600"
                    />
                    <div>
                      <div className="font-bold text-sm">Học kỳ II</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {classConfig.semester2Months.map(m => `Tháng ${m}`).join(', ')}
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-start gap-3 ${
                      scope === 'month'
                        ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      checked={scope === 'month'}
                      onChange={() => setScope('month')}
                      className="mt-1 accent-red-600"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-sm">Từng Tháng cụ thể</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Xuất nhanh để nộp kiểm tra chuyên môn định kỳ
                      </div>
                      {scope === 'month' && (
                        <select
                          value={selectedMonth}
                          onChange={e => setSelectedMonth(Number(e.target.value))}
                          className="mt-2 text-xs border border-red-300 dark:border-red-700 bg-white dark:bg-slate-800 rounded-lg p-1.5 w-full font-semibold"
                        >
                          {(classConfig.months || [9, 10, 11, 12, 1, 2, 3, 4, 5]).map(m => (
                            <option key={m} value={m}>
                              Tháng {m}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Thông tin nhanh lớp */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Dữ liệu tích hợp tự động từ hệ thống:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <div>• Sĩ số học sinh: <strong className="text-slate-800 dark:text-slate-200">{students.length} em</strong></div>
                  <div>• Số tuần học: <strong className="text-slate-800 dark:text-slate-200">{classConfig.weeks?.length || 0} tuần</strong></div>
                  <div>• Nhật ký nề nếp: <strong className="text-slate-800 dark:text-slate-200">{logs.length} bản ghi</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NỘI DUNG CHI TIẾT */}
          {activeTab === 'sections' && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                Chọn các phần đưa vào Sổ Chủ Nhiệm
              </label>

              {[
                { id: 'cover', label: 'Bìa Sổ công tác giáo viên chủ nhiệm', desc: 'Bộ Quốc phòng, tên trường, lớp, năm học và giáo viên chủ nhiệm', val: includeCover, setVal: setIncludeCover },
                { id: 'regs', label: 'Quy chế & Nhiệm vụ Học sinh - Giáo viên', desc: 'Trích Điều lệ trường: Điều 34-38 nhiệm vụ HS, Điều 27-32 quyền hạn GV', val: includeRegulations, setVal: setIncludeRegulations },
                { id: 'students', label: 'Phần I: Danh sách GVBM & Học sinh lớp', desc: 'Giáo viên bộ môn và bảng học sinh 13 cột; thông tin chưa có để trống', val: includeStudentList, setVal: setIncludeStudentList },
                { id: 'org', label: 'Phần II: Cơ cấu lớp & Ban cán sự', desc: 'Lớp trưởng, phó, bí thư, Ban đại diện CMHS, đặc điểm tình hình lớp', val: includeOrganization, setVal: setIncludeOrganization },
                { id: 'weekly', label: 'Phần III: Sinh hoạt tuần & Bảng điểm rèn luyện', desc: 'Nội dung nề nếp từng tuần, bảng sơ kết điểm rèn luyện hàng tuần trong tháng', val: includeWeeklySummaries, setVal: setIncludeWeeklySummaries },
                { id: 'sem', label: 'Phần III.2: Sơ kết Học kỳ I & II', desc: 'Điểm thi đua thực tế; để trống kết quả học tập và rèn luyện chính thức', val: includeSemesterSummary, setVal: setIncludeSemesterSummary },
                { id: 'followup', label: 'Phần IV: Hồ sơ theo dõi học sinh & Họp phụ huynh', desc: 'Nội dung theo dõi, biện pháp giáo dục, phối hợp phụ huynh và chữ ký', val: includeStudentFollowUp, setVal: setIncludeStudentFollowUp },
              ].map(sec => (
                <label
                  key={sec.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={sec.val}
                    onChange={e => sec.setVal(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{sec.label}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{sec.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* TAB 3: THÔNG TIN HÀNH CHÍNH & PHÊ DUYỆT */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              <label className="block text-sm">Tên trường<input value={schoolName} onChange={e => setSchoolName(e.target.value)} className="block w-full border rounded-lg p-2 bg-white dark:bg-slate-800" /></label>
              <label className="block text-sm">Khoa / Tổ chuyên môn<input value={department} onChange={e => setDepartment(e.target.value)} className="block w-full border rounded-lg p-2 bg-white dark:bg-slate-800" /></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Giáo viên chủ nhiệm
                  </label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={e => setTeacherName(e.target.value)}
                    className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Trưởng khoa / TTCM phê duyệt
                  </label>
                  <input
                    type="text"
                    value={approverName}
                    onChange={e => setApproverName(e.target.value)}
                    className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Ban cán sự lớp
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-0.5">Lớp trưởng</span>
                    <input
                      type="text"
                      value={classPresident}
                      onChange={e => setClassPresident(e.target.value)}
                      className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-0.5">Lớp phó học tập</span>
                    <input
                      type="text"
                      value={academicVicePresident}
                      onChange={e => setAcademicVicePresident(e.target.value)}
                      className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-0.5">Lớp phó nề nếp</span>
                    <input
                      type="text"
                      value={disciplineVicePresident}
                      onChange={e => setDisciplineVicePresident(e.target.value)}
                      className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Ban đại diện cha mẹ học sinh
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-0.5">Trưởng ban đại diện</span>
                    <input
                      type="text"
                      value={parentHead}
                      onChange={e => setParentHead(e.target.value)}
                      className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block mb-0.5">Số điện thoại liên hệ</span>
                    <input
                      type="text"
                      value={parentPhone}
                      onChange={e => setParentPhone(e.target.value)}
                      className="w-full text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {exportSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Đã tải Sổ Chủ Nhiệm thành công!
              </span>
            ) : saveToast ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4" /> Đã lưu nội dung sổ thành công!
              </span>
            ) : (
              <span>Định dạng Word (.docx) chuẩn OpenXML, chỉnh sửa trực tiếp 100%</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-md transition flex items-center gap-1.5 cursor-pointer"
              title="Lưu lại toàn bộ nội dung đã nhập vào thiết bị"
            >
              <Save className="w-4 h-4" />
              <span>{saveToast ? 'Đã lưu!' : 'Lưu nội dung'}</span>
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || (userRole !== 'teacher' && userRole !== 'admin' && userRole !== 'owner')}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-500/25 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang khởi tạo Word...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Tải Sổ Chủ Nhiệm (.docx)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


