import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  Plus,
  Minus,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  TrendingUp,
  Award,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Zap,
} from 'lucide-react';
import { exportSubjectGradebookToExcel } from '../lib/subjectGradebookExport';
import {
  parseClipboardScores,
  parseSpeedNumpadInput,
  applyPasteScoresToColumn,
  applyFillColumnScore,
} from '../lib/gradebookFastInput';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import { useSubjectRoster } from '../hooks/useSubjectRoster';
import { recordGradebookEdit, changeTermLock } from '../lib/gradebookHistory';
import { previewGradebookRestore, applyGradebookRestore } from '../lib/gradebookRestore';
import { assessmentKey, assessmentValue, setAssessmentStatus, needsAssessmentFollowup, statusLabels, type AssessmentStatus } from '../lib/assessmentStatus';
import {
  ClassGradebookData,
  StudentSubjectGrade,
  calculateTermAverage,
  calculateYearAverage,
  calculateSubjectRank,
} from '../types/subjectGrade';
import {
  loadClassGradebook,
  saveClassGradebook,
  stageGradebookDraft,
  discardGradebookDraft,
} from '../services/subjectGradeService';

export function SubjectGradebookView() {
  const {
    students: ownStudents,
    classConfig,
    userRole,
    isLocalMode: appLocalMode,
    activeAccount,
    workspaceClasses,
  } = useApp();
  const devicePreferenceKey = `subject_device_mode_${activeAccount?.uid || 'guest'}`;
  const [deviceOnly, setDeviceOnly] = useState(() => localStorage.getItem(devicePreferenceKey) === 'true');
  useEffect(() => { setDeviceOnly(localStorage.getItem(devicePreferenceKey) === 'true'); }, [devicePreferenceKey]);
  const isLocalMode = appLocalMode || deviceOnly;
  const { students, ready: rosterReady, error: rosterError } = useSubjectRoster(classConfig, workspaceClasses, ownStudents);

  const [semesterTab, setSemesterTab] = useState<'sem1' | 'sem2' | 'year'>('sem1');
  const [gradebook, setGradebook] = useState<ClassGradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [followupFilter, setFollowupFilter] = useState<'all' | 'missing' | 'makeup'>('all');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [restorePreview, setRestorePreview] = useState<{ preview: ReturnType<typeof previewGradebookRestore>; baseline: ClassGradebookData; filename: string } | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [speedNumpadMode, setSpeedNumpadMode] = useState<boolean>(() => {
    return localStorage.getItem('gradebook_speed_numpad_mode') === 'true';
  });

  const toggleSpeedNumpadMode = () => {
    setSpeedNumpadMode((prev) => {
      const next = !prev;
      localStorage.setItem('gradebook_speed_numpad_mode', String(next));
      return next;
    });
  };

  const saveInFlight = useRef(false);
  const gradebookRef = useRef(gradebook);
  gradebookRef.current = gradebook;
  const currentTerm = semesterTab === 'sem1' ? 'semester1' : 'semester2';
  const termLocked = !!gradebook?.termLocks?.[currentTerm]?.locked;
  const actor = activeAccount?.displayName || activeAccount?.uid || 'Giáo viên';
  const updateGradebook = (edit: (previous: ClassGradebookData | null) => ClassGradebookData | null) => {
    setGradebook(previous => {
      const next = edit(previous);
      return previous && next && isLocalMode ? recordGradebookEdit(previous, next, actor) : next;
    });
  };

  // Focus navigation refs matrix: `${studentId}_${columnKey}`
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const subjectName = classConfig.subjectName || classConfig.teachingSubject || 'Toán';
  const teacherName = classConfig.homeroomTeacher || activeAccount?.displayName || 'Nguyễn Văn Sang';

  // 1. Tải sổ điểm khi đổi lớp
  useEffect(() => {
    if (!rosterReady) return;
    let isCancelled = false;
    setLoading(true);
    setGradebook(null);
    setHasUnsavedChanges(false);
    setMessage('');

    void loadClassGradebook(
      classConfig.id,
      subjectName,
      classConfig.schoolYear,
      teacherName,
      students,
      isLocalMode,
      classConfig.teacherId
    ).then((data) => {
      if (!isCancelled) {
        setGradebook(data);
        setHasUnsavedChanges(!!data.pendingSync);
        setSaveError(!!data.pendingSync);
        if (data.pendingSync) setMessage('Đã khôi phục bản nháp chưa đồng bộ. Bấm Lưu để thử lại; nếu có xung đột, hãy xuất Excel trước khi tải lại bản máy chủ.');
        setLoading(false);
      }
    }).catch((error: unknown) => {
      if (!isCancelled) {
        setMessage(`Không tải được sổ điểm từ máy chủ. Bản nháp trên máy vẫn được giữ. ${error instanceof Error ? error.message : String(error)}`);
        setSaveError(true);
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [classConfig.id, classConfig.teacherId, subjectName, classConfig.schoolYear, teacherName, students, isLocalMode, activeAccount?.uid, loadAttempt, rosterReady]);

  // Persist drafts before navigation can unmount this view. Never silently report cloud success.
  useLayoutEffect(() => {
    if (!hasUnsavedChanges || !gradebook) return;
    try { stageGradebookDraft(gradebook, isLocalMode); }
    catch (error) { setSaveError(true); setMessage(`Không lưu được bản nháp: ${String(error)}`); }
  }, [gradebook, hasUnsavedChanges, isLocalMode]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (hasUnsavedChanges) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  // 2. Tự động lưu sau 2 giây khi có thay đổi (Auto-save)
  useEffect(() => {
    if (!hasUnsavedChanges || !gradebook || saveError) return;

    const timer = setTimeout(() => {
      void handleSave(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [gradebook, hasUnsavedChanges, saveError]);

  // Danh sách học sinh hiển thị theo tìm kiếm & bộ lọc
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return students.filter(
      (s) =>
        (s.fullName.toLowerCase().includes(q) || s.studentCode.toLowerCase().includes(q))
        && (followupFilter === 'all' || !isLocalMode || (gradebook?.grades[s.id] && (semesterTab === 'year'
          ? needsAssessmentFollowup(gradebook.grades[s.id].semester1, followupFilter) || needsAssessmentFollowup(gradebook.grades[s.id].semester2, followupFilter)
          : needsAssessmentFollowup(gradebook.grades[s.id][currentTerm], followupFilter))))
    );
  }, [students, searchQuery, followupFilter, gradebook, currentTerm, semesterTab, isLocalMode]);

  // Dán trực tiếp mảng điểm từ Excel / Clipboard vào cột hiện tại
  const handlePasteScore = (
    e: React.ClipboardEvent<HTMLInputElement>,
    startStudentIndex: number,
    field: 'tx' | 'gk' | 'ck',
    txIndex: number
  ) => {
    if (!gradebook || termLocked) return;
    const clipboardText = e.clipboardData.getData('text');
    if (!clipboardText) return;

    const lines = clipboardText.trim().split(/\r\n|\r|\n/);
    if (lines.length <= 1 && !clipboardText.includes('\t')) {
      return; // Để dán 1 ô đơn lẻ bình thường
    }

    e.preventDefault();
    const parsedScores = parseClipboardScores(clipboardText);
    if (parsedScores.length === 0) return;

    const currentTermKey = semesterTab === 'sem1' ? 'semester1' : 'semester2';
    const studentIds = filteredStudents.map((s) => s.id);

    updateGradebook((prev) => {
      if (!prev) return prev;
      return applyPasteScoresToColumn(
        prev,
        studentIds,
        startStudentIndex,
        currentTermKey,
        field,
        txIndex,
        parsedScores
      );
    });
    setHasUnsavedChanges(true);
    setMessage(`Đã dán ${parsedScores.length} điểm từ bảng tính vào cột.`);
  };

  // Điền điểm đồng loạt cho cả cột (Bulk Fill Column)
  const handleFillColumn = (
    field: 'tx' | 'gk' | 'ck',
    txIndex: number,
    columnLabel: string
  ) => {
    if (!gradebook || termLocked) return;
    const input = prompt(
      `Điền điểm nhanh cho toàn bộ cột [${columnLabel}]:\nNhập điểm số (từ 0 đến 10, ví dụ 8.5 hoặc 10):`
    );
    if (input === null || input.trim() === '') return;

    const score = parseFloat(input.trim().replace(',', '.'));
    if (isNaN(score) || score < 0 || score > 10) {
      alert('Điểm số không hợp lệ! Vui lòng nhập số từ 0 đến 10.');
      return;
    }

    const roundedScore = Math.round(score * 10) / 10;
    const onlyEmpty = confirm(
      `Bạn có muốn CHỈ điền vào các ô CHƯA CÓ ĐIỂM không?\n- Bấm OK: Chỉ điền ô trống\n- Bấm Cancel: Ghi đè toàn bộ cột bằng điểm ${roundedScore}`
    );

    const currentTermKey = semesterTab === 'sem1' ? 'semester1' : 'semester2';
    const studentIds = filteredStudents.map((s) => s.id);

    updateGradebook((prev) => {
      if (!prev) return prev;
      return applyFillColumnScore(
        prev,
        studentIds,
        currentTermKey,
        field,
        txIndex,
        roundedScore,
        onlyEmpty
      );
    });
    setHasUnsavedChanges(true);
    setMessage(`Đã điền điểm ${roundedScore} cho cột [${columnLabel}] (${onlyEmpty ? 'chỉ ô trống' : 'toàn bộ'}).`);
  };

  // Hàm cập nhật điểm cho một học sinh (hỗ trợ Speed NumPad tự nhảy hàng)
  const handleScoreChange = (
    studentId: string,
    studentIndex: number,
    term: 'semester1' | 'semester2',
    field: 'tx' | 'gk' | 'ck',
    txIndex: number,
    rawValue: string
  ) => {
    if (!gradebook || termLocked) return;

    let scoreNum: number | null = null;
    let shouldAutoAdvance = false;

    if (rawValue.trim() !== '') {
      if (speedNumpadMode) {
        const parsedSpeed = parseSpeedNumpadInput(rawValue);
        if (parsedSpeed) {
          scoreNum = parsedSpeed.score;
          shouldAutoAdvance = parsedSpeed.autoAdvance;
        } else {
          const parsed = parseFloat(rawValue.replace(',', '.'));
          if (isNaN(parsed) || parsed < 0 || parsed > 10) return;
          scoreNum = Math.round(parsed * 10) / 10;
        }
      } else {
        const parsed = parseFloat(rawValue.replace(',', '.'));
        if (isNaN(parsed) || parsed < 0 || parsed > 10) {
          return; // Bỏ qua nếu nhập ngoài khoảng 0 - 10
        }
        scoreNum = Math.round(parsed * 10) / 10;
      }
    }

    updateGradebook((prev) => {
      if (!prev) return prev;
      const currentStudentGrade = prev.grades[studentId];
      if (!currentStudentGrade) return prev;

      const updatedStudentGrade: StudentSubjectGrade = {
        ...currentStudentGrade,
        semester1: { ...currentStudentGrade.semester1, tx: [...currentStudentGrade.semester1.tx] },
        semester2: { ...currentStudentGrade.semester2, tx: [...currentStudentGrade.semester2.tx] },
      };

      if (field === 'tx') {
        updatedStudentGrade[term].tx[txIndex] = scoreNum;
      } else {
        updatedStudentGrade[term][field] = scoreNum;
      }
      updatedStudentGrade[term].assessmentStatuses = { ...currentStudentGrade[term].assessmentStatuses };
      delete updatedStudentGrade[term].assessmentStatuses![assessmentKey(field, txIndex)];

      // Tự động tính toán lại ĐTB học kỳ và Cả năm
      if (!prev.termLocks?.semester1?.locked) updatedStudentGrade.semester1.average = calculateTermAverage(updatedStudentGrade.semester1);
      if (!prev.termLocks?.semester2?.locked) updatedStudentGrade.semester2.average = calculateTermAverage(updatedStudentGrade.semester2);
      updatedStudentGrade.yearAverage = calculateYearAverage(
        updatedStudentGrade.semester1.average,
        updatedStudentGrade.semester2.average
      );
      updatedStudentGrade.rank = calculateSubjectRank(updatedStudentGrade.yearAverage);

      return {
        ...prev,
        grades: {
          ...prev.grades,
          [studentId]: updatedStudentGrade,
        },
      };
    });

    setHasUnsavedChanges(true);

    // Tự động nhảy con trỏ xuống học sinh tiếp theo trong chế độ NumPad
    if (shouldAutoAdvance && studentIndex < filteredStudents.length - 1) {
      const fieldKey = field === 'tx' ? `tx_${txIndex}` : field;
      const nextStudent = filteredStudents[studentIndex + 1];
      const nextKey = `${nextStudent.id}_${fieldKey}`;
      setTimeout(() => {
        const nextInput = inputRefs.current[nextKey];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }, 10);
    }
  };

  // Thêm / Bớt cột kiểm tra thường xuyên
  const handleAddTxColumn = () => {
    if (!gradebook || termLocked) return;
    const isSem1 = semesterTab === 'sem1';
    const currentCount = isSem1 ? gradebook.txCountSemester1 : gradebook.txCountSemester2;
    if (currentCount >= 8) {
      alert('Tối đa 8 cột điểm thường xuyên theo quy định.');
      return;
    }

    updateGradebook((prev) => {
      if (!prev) return prev;
      const newGrades = { ...prev.grades };
      Object.keys(newGrades).forEach((sId) => {
        const item = { ...newGrades[sId] };
        if (isSem1) {
          item.semester1 = { ...item.semester1, tx: [...item.semester1.tx, null] };
        } else {
          item.semester2 = { ...item.semester2, tx: [...item.semester2.tx, null] };
        }
        newGrades[sId] = item;
      });

      return {
        ...prev,
        txCountSemester1: isSem1 ? currentCount + 1 : prev.txCountSemester1,
        txCountSemester2: !isSem1 ? currentCount + 1 : prev.txCountSemester2,
        grades: newGrades,
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleRemoveTxColumn = () => {
    if (!gradebook || termLocked) return;
    const isSem1 = semesterTab === 'sem1';
    const currentCount = isSem1 ? gradebook.txCountSemester1 : gradebook.txCountSemester2;
    if (currentCount <= 2) {
      alert('Tối thiểu 2 cột điểm thường xuyên theo Thông tư 22.');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn bớt cột TX${currentCount}? Điểm đã nhập ở cột này sẽ bị xóa.`)) {
      return;
    }

    updateGradebook((prev) => {
      if (!prev) return prev;
      const newGrades = { ...prev.grades };
      Object.keys(newGrades).forEach((sId) => {
        const item = { ...newGrades[sId] };
        if (isSem1) {
          item.semester1 = { ...item.semester1, tx: item.semester1.tx.slice(0, currentCount - 1) };
          item.semester1.assessmentStatuses = { ...item.semester1.assessmentStatuses };
          delete item.semester1.assessmentStatuses[assessmentKey('tx', currentCount - 1)];
          item.semester1.average = calculateTermAverage(item.semester1);
        } else {
          item.semester2 = { ...item.semester2, tx: item.semester2.tx.slice(0, currentCount - 1) };
          item.semester2.assessmentStatuses = { ...item.semester2.assessmentStatuses };
          delete item.semester2.assessmentStatuses[assessmentKey('tx', currentCount - 1)];
          item.semester2.average = calculateTermAverage(item.semester2);
        }
        item.yearAverage = calculateYearAverage(item.semester1.average, item.semester2.average);
        item.rank = calculateSubjectRank(item.yearAverage);
        newGrades[sId] = item;
      });

      return {
        ...prev,
        txCountSemester1: isSem1 ? currentCount - 1 : prev.txCountSemester1,
        txCountSemester2: !isSem1 ? currentCount - 1 : prev.txCountSemester2,
        grades: newGrades,
      };
    });
    setHasUnsavedChanges(true);
  };

  // Đổi loại bài kiểm tra thường xuyên (15 phút, 30 phút, Miệng...)
  const handleChangeTxLabel = (index: number) => {
    if (!gradebook || termLocked) return;
    const isSem1 = semesterTab === 'sem1';
    const currentLabels = isSem1
      ? [...(gradebook.txLabelsSemester1 || ['15 phút (Bài 1)', '15 phút (Bài 2)', '30 phút', '15 phút (Bài 3)'])]
      : [...(gradebook.txLabelsSemester2 || ['15 phút (Bài 1)', '15 phút (Bài 2)', '30 phút', '15 phút (Bài 3)'])];

    const current = currentLabels[index] || (index === 2 ? '30 phút' : '15 phút');
    const chosen = prompt(
      `Chọn loại bài kiểm tra cho cột TX${index + 1}:\n(Ví dụ: 15 phút, 30 phút, Miệng, 15 phút viết...)`,
      current
    );
    if (!chosen || !chosen.trim()) return;

    currentLabels[index] = chosen.trim();
    updateGradebook((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [isSem1 ? 'txLabelsSemester1' : 'txLabelsSemester2']: currentLabels,
      };
    });
    setHasUnsavedChanges(true);
  };

  // Lưu sổ điểm
  const handleSave = async (isAuto = false) => {
    if (!gradebook || saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    try {
      const saved = await saveClassGradebook(gradebook, isLocalMode);
      if (gradebookRef.current === gradebook) {
        setGradebook(saved);
        setHasUnsavedChanges(false);
        setSaveError(false);
        setMessage(isLocalMode ? 'Đã lưu trên máy.' : 'Đã đồng bộ sổ điểm lên máy chủ.');
      }
    } catch (e) {
      setSaveError(true);
      setMessage((e as Error).message);
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  // Điều hướng bằng bàn phím (Phím Enter, Mũi tên và Hotkeys V/M/B)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
    fieldKey: string,
    filteredList: Student[]
  ) => {
    // Phím tắt đặc biệt: V (Vắng), M (Miễn), B (Kiểm tra bù)
    if (!e.ctrlKey && !e.altKey && !e.metaKey) {
      const keyUpper = e.key.toUpperCase();
      if (keyUpper === 'V' || keyUpper === 'M' || keyUpper === 'B') {
        const statusMap: Record<string, AssessmentStatus> = {
          V: 'absent',
          M: 'exempt',
          B: 'makeup',
        };
        const targetStatus = statusMap[keyUpper];
        if (targetStatus && gradebook && !termLocked) {
          e.preventDefault();
          const field = fieldKey.startsWith('tx_') ? 'tx' : (fieldKey as 'gk' | 'ck');
          const txIdx = field === 'tx' ? parseInt(fieldKey.split('_')[1], 10) : 0;
          const currentTermKey = semesterTab === 'sem1' ? 'semester1' : 'semester2';
          const student = filteredList[studentIndex];
          updateGradebook((prev) => prev ? setAssessmentStatus(prev, student.id, currentTermKey, field, txIdx, targetStatus) : prev);
          setHasUnsavedChanges(true);

          if (studentIndex < filteredList.length - 1) {
            const nextStudent = filteredList[studentIndex + 1];
            const nextInputKey = `${nextStudent.id}_${fieldKey}`;
            setTimeout(() => {
              inputRefs.current[nextInputKey]?.focus();
              inputRefs.current[nextInputKey]?.select();
            }, 10);
          }
          return;
        }
      }
    }

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (studentIndex < filteredList.length - 1) {
        const nextStudent = filteredList[studentIndex + 1];
        const nextInputKey = `${nextStudent.id}_${fieldKey}`;
        inputRefs.current[nextInputKey]?.focus();
        inputRefs.current[nextInputKey]?.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (studentIndex > 0) {
        const prevStudent = filteredList[studentIndex - 1];
        const prevInputKey = `${prevStudent.id}_${fieldKey}`;
        inputRefs.current[prevInputKey]?.focus();
        inputRefs.current[prevInputKey]?.select();
      }
    }
  };

  // Thống kê nhanh điểm số
  const stats = useMemo(() => {
    if (!gradebook) return null;
    const activeStudentGrades = students
      .map((s) => gradebook.grades[s.id])
      .filter(Boolean);

    const isSem1 = semesterTab === 'sem1';
    const isSem2 = semesterTab === 'sem2';

    const averages = activeStudentGrades
      .map((g) => (isSem1 ? g.semester1.average : isSem2 ? g.semester2.average : g.yearAverage))
      .filter((avg): avg is number => avg !== null && !isNaN(avg));

    const gkScores = activeStudentGrades
      .map((g) => (isSem1 ? g.semester1.gk : g.semester2.gk))
      .filter((s): s is number => s !== null && !isNaN(s));

    const ckScores = activeStudentGrades
      .map((g) => (isSem1 ? g.semester1.ck : g.semester2.ck))
      .filter((s): s is number => s !== null && !isNaN(s));

    const classAverage =
      averages.length > 0
        ? Math.round((averages.reduce((sum, v) => sum + v, 0) / averages.length) * 10) / 10
        : null;

    const maxScore = averages.length > 0 ? Math.max(...averages) : null;
    const minScore = averages.length > 0 ? Math.min(...averages) : null;

    const gioCount = averages.filter((a) => a >= 8.0).length;
    const khaCount = averages.filter((a) => a >= 6.5 && a < 8.0).length;
    const datCount = averages.filter((a) => a >= 5.0 && a < 6.5).length;
    const chuaDatCount = averages.filter((a) => a < 5.0).length;

    return {
      total: students.length,
      hasAverage: averages.length,
      gkCount: gkScores.length,
      ckCount: ckScores.length,
      classAverage,
      maxScore,
      minScore,
      gioCount,
      khaCount,
      datCount,
      chuaDatCount,
    };
  }, [gradebook, students, semesterTab]);

  // Xuất file Excel bảng điểm chuẩn Sư phạm
  const handleExportExcel = () => {
    if (!gradebook || students.length === 0) {
      alert('Không có dữ liệu điểm để xuất Excel.');
      return;
    }

    try {
      exportSubjectGradebookToExcel({
        gradebook,
        students,
        classConfig: {
          className: classConfig.className,
          schoolYear: classConfig.schoolYear,
          id: classConfig.id,
        },
        teacherName,
        semesterTab,
      });
      setMessage('Đã xuất file Excel bảng điểm thành công.');
    } catch (err) {
      alert(`Lỗi xuất file Excel: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const renderAssessmentStatus = (student: Student, field: 'tx' | 'gk' | 'ck', index = 0) => {
    if (!isLocalMode) return null;
    const term = gradebook?.grades[student.id]?.[currentTerm];
    return <select aria-label={`Trạng thái ${student.fullName} ${field.toUpperCase()}${field === 'tx' ? index + 1 : ''}`} value={term?.assessmentStatuses?.[assessmentKey(field, index)] || ''}
      className="block mt-1 w-full max-w-24 mx-auto rounded border border-slate-300 bg-white dark:bg-slate-900 text-[10px]" onChange={event => {
        const status = event.target.value as AssessmentStatus | '';
        const oldValue = field === 'tx' ? term?.tx[index] : term?.[field];
        if (status && oldValue != null && !confirm('Đổi trạng thái sẽ thay điểm hiện tại bằng ô trống và ghi lịch sử. Tiếp tục?')) return;
        updateGradebook(previous => previous ? setAssessmentStatus(previous, student.id, currentTerm, field, index, status) : previous);
        setHasUnsavedChanges(true);
      }}>
      <option value="">Nhập điểm</option>
      {(Object.keys(statusLabels) as AssessmentStatus[]).map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
    </select>;
  };

  if (rosterError) return <div role="alert" className="p-6 text-rose-700">{rosterError}</div>;
  if (loading || !rosterReady) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
        <Clock className="h-6 w-6 animate-spin text-blue-600" />
        <p className="font-semibold text-sm">Đang tải sổ điểm môn {subjectName}...</p>
      </div>
    );
  }

  if (!gradebook) return <div role="alert" className="p-6 space-y-3 text-rose-700">
    <p>{message}</p>
    <button className="rounded border px-4 py-2" onClick={() => setLoadAttempt(value => value + 1)}>Thử tải lại</button>
    {!isLocalMode && <button className="ml-3 rounded-lg bg-purple-600 px-4 py-2 text-white" onClick={() => {
      localStorage.setItem(devicePreferenceKey, 'true');
      setDeviceOnly(true);
    }}>Dùng sổ điểm trên máy</button>}
  </div>;

  const txCount =
    semesterTab === 'sem1'
      ? gradebook?.txCountSemester1 || 4
      : gradebook?.txCountSemester2 || 4;

  return (
    <fieldset disabled={saving} className="min-w-0 space-y-4 text-slate-800 dark:text-slate-100">
      {isLocalMode && semesterTab !== 'year' && <div className="rounded-xl border border-purple-200 p-3 flex flex-wrap items-center gap-3 text-sm">
        <strong>{termLocked ? 'Đã chốt sổ — chỉ xem' : 'Học kỳ đang mở'}</strong>
        <button type="button" className="rounded-lg bg-purple-600 px-3 py-2 text-white" onClick={() => {
          const reason = termLocked ? prompt('Lý do mở lại sổ học kỳ:') : 'Chốt sổ học kỳ';
          if (reason === null || !reason.trim()) return;
          if (!termLocked && !confirm('Chốt sổ giữ nguyên các điểm hiện tại, kể cả ô chưa nhập. Tiếp tục?')) return;
          setGradebook(previous => previous ? changeTermLock(previous, currentTerm, actor, reason) : previous);
          setHasUnsavedChanges(true);
        }}>{termLocked ? 'Mở lại sổ' : 'Chốt học kỳ'}</button>
        <span className="text-xs text-slate-500">Khóa và lịch sử được lưu trên trình duyệt này.</span>
      </div>}
      {deviceOnly && <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <p>Sổ điểm đang lưu trên trình duyệt này, chưa đồng bộ Firebase. Hãy xuất Excel để giữ bản sao. Danh sách học sinh vẫn lấy từ lớp đã đăng nhập.</p>
        <button type="button" className="mt-2 underline" onClick={() => {
          if (hasUnsavedChanges && !confirm('Còn thay đổi chưa lưu. Hãy lưu hoặc xuất Excel trước. Vẫn chuyển sang máy chủ?')) return;
          localStorage.removeItem(devicePreferenceKey);
          setDeviceOnly(false);
        }}>Thử kết nối máy chủ</button>
      </div>}
      {classConfig.rosterSourceClassId && <p className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">Danh sách học sinh dùng chung từ lớp nguồn. Thêm, sửa học sinh tại lớp nguồn; điểm trong sổ này chỉ thuộc môn {subjectName}.</p>}
      {/* ── Page Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-purple-500/25">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Sổ điểm môn {subjectName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                Lớp {classConfig.className}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Năm học {classConfig.schoolYear} · Giáo viên: <strong>{teacherName}</strong> · Chuẩn Thông tư 22/2021/TT-BGDĐT
            </p>
          </div>
        </div>

        {/* Buttons Action */}
        <div className="flex items-center gap-2 flex-wrap">
          {!isLocalMode && <button type="button" className="rounded-xl border px-3 py-2 text-xs font-bold" onClick={() => {
            if (hasUnsavedChanges && !confirm('Tải lại sẽ bỏ bản nháp đang sửa. Hãy xuất Excel trước nếu cần giữ điểm. Tiếp tục?')) return;
            discardGradebookDraft(classConfig.id, isLocalMode);
            setLoadAttempt(value => value + 1);
          }}>Tải lại bản máy chủ</button>}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-random-picker'))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-sm transition active:scale-95 cursor-pointer"
            title="Mở Vòng quay may mắn gọi tên học sinh ngẫu nhiên"
          >
            <Sparkles className="h-4 w-4" />
            <span>🎲 Gọi tên</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Đang lưu…' : 'Lưu sổ điểm'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div role={saveError ? 'alert' : 'status'} className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${saveError ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {saveError ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          <span>{message}</span>
        </div>
      )}

      {/* ── Tabs Học kỳ & Thống kê ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-850 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xs">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => setSemesterTab('sem1')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              semesterTab === 'sem1'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Học kỳ 1
          </button>
          <button
            type="button"
            onClick={() => setSemesterTab('sem2')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              semesterTab === 'sem2'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Học kỳ 2
          </button>
          <button
            type="button"
            onClick={() => setSemesterTab('year')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              semesterTab === 'year'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Cả năm & Xếp loại
          </button>
        </div>

        {/* Nút Thêm / Bớt cột TX */}
        {semesterTab !== 'year' && !termLocked && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Cột điểm TX:</span>
            <button
              type="button"
              onClick={handleAddTxColumn}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
              title="Thêm một cột điểm kiểm tra thường xuyên (TX)"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm cột TX</span>
            </button>
            <button
              type="button"
              onClick={handleRemoveTxColumn}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
              title="Bớt cột điểm kiểm tra thường xuyên cuối cùng"
            >
              <Minus className="h-3.5 w-3.5" />
              <span>Bớt cột TX</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Cards Thống Kê Phổ Điểm ── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Sĩ số lớp</p>
            <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{stats.total} HS</p>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-slate-850 border border-blue-200 dark:border-blue-900/60 shadow-2xs">
            <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase">ĐTB Chung</p>
            <p className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">
              {stats.classAverage !== null ? stats.classAverage : '—'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-slate-850 border border-emerald-200 dark:border-emerald-900/60 shadow-2xs">
            <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase">Giỏi (≥ 8.0)</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.gioCount} HS
            </p>
          </div>

          <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-slate-850 border border-sky-200 dark:border-sky-900/60 shadow-2xs">
            <p className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase">Khá (6.5 - 7.9)</p>
            <p className="text-lg font-black text-sky-600 dark:text-sky-400 mt-0.5">
              {stats.khaCount} HS
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-slate-850 border border-amber-200 dark:border-amber-900/60 shadow-2xs">
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase">Đạt (5.0 - 6.4)</p>
            <p className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {stats.datCount} HS
            </p>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-slate-850 border border-rose-200 dark:border-rose-900/60 shadow-2xs">
            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 uppercase">Chưa đạt (&lt; 5.0)</p>
            <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {stats.chuaDatCount} HS
            </p>
          </div>
        </div>
      )}

      {/* ── Banner Phân biệt rõ ràng: Điểm Học Lực (Chuyên môn) vs Điểm Rèn Luyện (Nề nếp) ── */}
      <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-slate-900 border border-purple-200/90 dark:border-purple-800/50 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm shadow-purple-600/30">
            TT22
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-purple-950 dark:text-purple-200 uppercase tracking-tight">
                Chấm điểm học lực môn {subjectName}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-900 dark:bg-purple-900/60 dark:text-purple-300 font-bold border border-purple-300/50">
                Chuyên môn · Bài kiểm tra
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Phân hệ chuyên môn tính điểm học lực theo Thông tư 22 (tách biệt hoàn toàn với <em>Chấm điểm nề nếp / rèn luyện</em>).
            </p>
          </div>
        </div>

        {/* Thanh Badge Phân loại loại bài kiểm tra */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-100/90 text-blue-900 dark:bg-blue-950/70 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            15' · 30' (TX - Hệ số 1)
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100/90 text-indigo-900 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            1 tiết / 45' (GK - Hệ số 2)
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-100/90 text-purple-900 dark:bg-purple-950/70 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            Cuối kỳ (CK - Hệ số 3)
          </span>
        </div>
      </div>

      {/* ── Thanh tìm kiếm học sinh & NumPad Tốc độ cao ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          {isLocalMode && (
            <select
              aria-label="Lọc tình trạng kiểm tra"
              className="rounded-lg border p-2 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
              value={followupFilter}
              onChange={(event) => setFollowupFilter(event.target.value as typeof followupFilter)}
            >
              <option value="all">Tất cả học sinh</option>
              <option value="missing">Còn thiếu điểm</option>
              <option value="makeup">Vắng / Cần kiểm tra bù</option>
            </select>
          )}
          <div className="relative flex-1 max-w-xs">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo họ tên hoặc mã HS..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Hiển thị: <strong>{filteredStudents.length}</strong> / {students.length} HS
          </span>
        </div>

        {/* Nút bật/tắt chế độ NumPad Tốc độ cao */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSpeedNumpadMode}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition border shadow-xs cursor-pointer ${
              speedNumpadMode
                ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/25 ring-2 ring-amber-400/40'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
            title="Chế độ NumPad Tốc độ cao: Gõ 85 tự thành 8.5, 10 thành 10 và tự động nhảy xuống HS kế tiếp. Gõ V (Vắng), M (Miễn), B (Kiểm tra bù)."
          >
            <Zap className={`h-3.5 w-3.5 ${speedNumpadMode ? 'fill-current text-white animate-pulse' : 'text-amber-500'}`} />
            <span>NumPad Tốc độ cao: {speedNumpadMode ? 'BẬT' : 'TẮT'}</span>
          </button>
        </div>
      </div>

      {/* Banner hướng dẫn khi bật NumPad tốc độ cao */}
      {speedNumpadMode && (
        <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-300 text-xs flex items-center justify-between flex-wrap gap-2 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Đang bật NumPad tốc độ cao:</strong> Gõ <strong>85</strong> ➔ 8.5 · Gõ <strong>10</strong> ➔ 10 · Tự nhảy dòng. Phím tắt: <strong>V</strong> (Vắng), <strong>M</strong> (Miễn), <strong>B</strong> (Bù). Hỗ trợ dán cột từ Excel (<strong>Ctrl + V</strong>).
            </span>
          </div>
        </div>
      )}

      {/* ── BẢNG ĐIỂM (EXCEL-LIKE INTERACTIVE TABLE) ── */}
      {isLocalMode && <p className="text-xs text-slate-500">Chọn trạng thái dưới mỗi ô điểm. Nhập điểm mới để hoàn tất kiểm tra bù. Trạng thái không tính là điểm 0; điểm trung bình còn thiếu bài là tạm tính.</p>}
      <fieldset disabled={termLocked} className="min-w-0 overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200 dark:border-slate-700 select-none">
            <tr>
              <th className="p-3 w-10 text-center">STT</th>
              <th className="p-3 w-24">Mã HS</th>
              <th className="p-3 min-w-[160px]">Họ và tên</th>

              {semesterTab !== 'year' ? (
                <>
                  {Array.from({ length: txCount }).map((_, i) => {
                    const currentLabels = semesterTab === 'sem1' ? gradebook?.txLabelsSemester1 : gradebook?.txLabelsSemester2;
                    const label = currentLabels?.[i] || (i === 2 ? '30 phút' : '15 phút');
                    return (
                      <th key={i} className="p-2.5 w-24 text-center text-blue-700 dark:text-blue-400 bg-blue-50/40 dark:bg-blue-950/20">
                        <div className="font-black text-xs">TX{i + 1}</div>
                        <div className="flex items-center justify-center gap-1 mt-0.5">
                          <button
                            type="button"
                            onClick={() => handleChangeTxLabel(i)}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-200 transition cursor-pointer"
                            title="Bấm để đổi loại bài kiểm tra (15 phút, 30 phút, Miệng...)"
                          >
                            {label} ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFillColumn('tx', i, `TX${i + 1}`)}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 transition cursor-pointer"
                            title="Điền điểm đồng loạt cho cả cột TX này"
                          >
                            Điền
                          </button>
                        </div>
                        <span className="block text-[9px] font-normal text-slate-400 mt-0.5">Hệ số 1</span>
                      </th>
                    );
                  })}
                  <th className="p-3 w-28 text-center text-indigo-700 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40">
                    <div className="font-black text-xs">GK / 1 TIẾT</div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                        45 phút
                      </span>
                      <button
                        type="button"
                        onClick={() => handleFillColumn('gk', 0, 'Giữa kỳ (GK)')}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 transition cursor-pointer"
                        title="Điền điểm đồng loạt cho cả cột Giữa kỳ"
                      >
                        Điền
                      </button>
                    </div>
                    <span className="block text-[9px] font-normal text-slate-400 mt-0.5">Hệ số 2</span>
                  </th>
                  <th className="p-3 w-28 text-center text-purple-700 dark:text-purple-400 bg-purple-50/70 dark:bg-purple-950/40">
                    <div className="font-black text-xs">CUỐI KỲ (CK)</div>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200">
                        60' - 90'
                      </span>
                      <button
                        type="button"
                        onClick={() => handleFillColumn('ck', 0, 'Cuối kỳ (CK)')}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 transition cursor-pointer"
                        title="Điền điểm đồng loạt cho cả cột Cuối kỳ"
                      >
                        Điền
                      </button>
                    </div>
                    <span className="block text-[9px] font-normal text-slate-400 mt-0.5">Hệ số 3</span>
                  </th>
                  <th className="p-3 w-24 text-center text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30">
                    <div className="font-black text-xs">ĐTB {semesterTab === 'sem1' ? 'HK1' : 'HK2'}</div>
                    <span className="block text-[9px] font-normal text-slate-400 mt-0.5">Làm tròn 0.1</span>
                  </th>
                </>
              ) : (
                <>
                  <th className="p-3 w-24 text-center text-blue-700 dark:text-blue-400">ĐTB HK1</th>
                  <th className="p-3 w-24 text-center text-blue-700 dark:text-blue-400">ĐTB HK2</th>
                  <th className="p-3 w-28 text-center text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30">
                    ĐTB CẢ NĂM
                  </th>
                  <th className="p-3 w-28 text-center text-purple-700 dark:text-purple-400">Xếp loại</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
            {filteredStudents.map((s, studentIndex) => {
              const g = gradebook?.grades[s.id];
              const termData = semesterTab === 'sem1' ? g?.semester1 : g?.semester2;
              const termKey = semesterTab === 'sem1' ? 'semester1' : 'semester2';

              return (
                <tr
                  key={s.id}
                  className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors ${
                    studentIndex % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-850/40'
                  }`}
                >
                  <td className="p-2.5 text-center text-slate-400">{studentIndex + 1}</td>
                  <td className="p-2.5 font-bold text-slate-600 dark:text-slate-400">{s.studentCode}</td>
                  <td className="p-2.5 font-sans font-bold text-slate-900 dark:text-white">
                    {s.fullName}
                  </td>

                  {semesterTab !== 'year' ? (
                    <>
                      {/* Các cột điểm thường xuyên TX */}
                      {Array.from({ length: txCount }).map((_, txIdx) => {
                        const val = termData?.tx[txIdx];
                        const inputKey = `${s.id}_tx_${txIdx}`;
                        return (
                          <td key={txIdx} className="p-1.5 text-center">
                            <input
                              ref={(el) => {
                                inputRefs.current[inputKey] = el;
                              }}
                              type="text"
                              inputMode="decimal"
                              value={val !== null && val !== undefined ? val : ''}
                              onChange={(e) =>
                                handleScoreChange(s.id, studentIndex, termKey, 'tx', txIdx, e.target.value)
                              }
                              onPaste={(e) =>
                                handlePasteScore(e, studentIndex, 'tx', txIdx)
                              }
                              onKeyDown={(e) =>
                                handleKeyDown(e, studentIndex, `tx_${txIdx}`, filteredStudents)
                              }
                              placeholder="—"
                              className={`w-14 text-center py-1 rounded-lg border font-bold text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition ${
                                val !== null && val !== undefined
                                  ? val >= 8.0
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                    : val >= 6.5
                                    ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                    : val >= 5.0
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                    : 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            />
                            {renderAssessmentStatus(s, 'tx', txIdx)}
                          </td>
                        );
                      })}

                      {/* Điểm Giữa kỳ GK */}
                      <td className="p-1.5 text-center bg-indigo-50/30 dark:bg-indigo-950/10">
                        <input
                          ref={(el) => {
                            inputRefs.current[`${s.id}_gk`] = el;
                          }}
                          type="text"
                          inputMode="decimal"
                          value={termData?.gk !== null && termData?.gk !== undefined ? termData.gk : ''}
                          onChange={(e) =>
                            handleScoreChange(s.id, studentIndex, termKey, 'gk', 0, e.target.value)
                          }
                          onPaste={(e) =>
                            handlePasteScore(e, studentIndex, 'gk', 0)
                          }
                          onKeyDown={(e) =>
                            handleKeyDown(e, studentIndex, 'gk', filteredStudents)
                          }
                          placeholder="—"
                          className="w-16 text-center py-1 rounded-lg border border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-900 font-bold text-xs text-indigo-700 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        />
                        {renderAssessmentStatus(s, 'gk')}
                      </td>

                      {/* Điểm Cuối kỳ CK */}
                      <td className="p-1.5 text-center bg-purple-50/30 dark:bg-purple-950/10">
                        <input
                          ref={(el) => {
                            inputRefs.current[`${s.id}_ck`] = el;
                          }}
                          type="text"
                          inputMode="decimal"
                          value={termData?.ck !== null && termData?.ck !== undefined ? termData.ck : ''}
                          onChange={(e) =>
                            handleScoreChange(s.id, studentIndex, termKey, 'ck', 0, e.target.value)
                          }
                          onPaste={(e) =>
                            handlePasteScore(e, studentIndex, 'ck', 0)
                          }
                          onKeyDown={(e) =>
                            handleKeyDown(e, studentIndex, 'ck', filteredStudents)
                          }
                          placeholder="—"
                          className="w-16 text-center py-1 rounded-lg border border-purple-300 dark:border-purple-800 bg-white dark:bg-slate-900 font-bold text-xs text-purple-700 dark:text-purple-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                        />
                        {renderAssessmentStatus(s, 'ck')}
                      </td>

                      {/* Điểm TB Học kỳ */}
                      <td className="p-2.5 text-center font-black text-sm bg-emerald-50/40 dark:bg-emerald-950/20">
                        {termData?.average !== null && termData?.average !== undefined ? (
                          <span
                            className={`px-2 py-0.5 rounded-md inline-block font-mono ${
                              termData.average >= 8.0
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : termData.average >= 6.5
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : termData.average >= 5.0
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {termData.average}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Xem Cả năm */}
                      <td className="p-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                        {g?.semester1.average ?? '—'}
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                        {g?.semester2.average ?? '—'}
                      </td>
                      <td className="p-2.5 text-center font-black text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20">
                        {g?.yearAverage ?? '—'}
                      </td>
                      <td className="p-2.5 text-center font-sans font-bold">
                        {g?.rank ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              g.rank === 'Giỏi'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : g.rank === 'Khá'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                : g.rank === 'Đạt'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            {g.rank}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}

            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                  Không tìm thấy học sinh nào. Thầy có thể bấm vào mục “Học sinh” để dán nhanh danh sách lớp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </fieldset>

      {isLocalMode && <details className="rounded-xl border border-purple-200 p-3 text-sm space-y-2">
        <summary className="cursor-pointer font-semibold">Khôi phục sổ từ JSON</summary>
        <p className="text-xs text-slate-500">Chọn bản sao của đúng sổ đang mở. Khôi phục thay toàn bộ điểm bằng nội dung tệp; sổ trước khôi phục sẽ được tải xuống để giữ lại.</p>
        <input aria-label="Chọn bản sao JSON của sổ điểm" type="file" accept=".json,application/json" onChange={async event => {
          const file = event.target.files?.[0]; event.target.value = '';
          setRestorePreview(null); setRestoreError('');
          if (!file) return;
          try {
            if (file.size > 10 * 1024 * 1024) throw new Error('Tệp vượt quá 10 MB.');
            const preview = previewGradebookRestore(await file.text(), gradebook);
            setRestorePreview({ preview, baseline: gradebook, filename: file.name });
          } catch (error) { setRestoreError(error instanceof Error ? error.message : String(error)); }
        }} />
        {restoreError && <p role="alert" className="text-rose-700">{restoreError}</p>}
        {restorePreview && <div className="rounded border p-3 space-y-2">
          <p>{restorePreview.filename}: {restorePreview.preview.students} học sinh trong tệp · {restorePreview.preview.changed} hồ sơ điểm khác hiện tại · {restorePreview.preview.removed} hồ sơ không có trong tệp sẽ được để trống điểm.</p>
          <button type="button" className="rounded bg-purple-600 text-white px-3 py-2" onClick={() => {
            try {
              if (gradebook !== restorePreview.baseline) throw new Error('Sổ đã thay đổi sau khi xem trước. Hãy chọn lại tệp để kiểm tra.');
              const restored = applyGradebookRestore(gradebook, restorePreview.preview.book, actor);
              const url = URL.createObjectURL(new Blob([JSON.stringify(gradebook, null, 2)], { type: 'application/json' }));
              const link = document.createElement('a'); link.href = url; link.download = `Truoc-khoi-phuc-${classConfig.id}-${Date.now()}.json`; link.click(); URL.revokeObjectURL(url);
              setGradebook(restored); setHasUnsavedChanges(true); setSaveError(false); setRestorePreview(null);
              setMessage('Đã khôi phục bản nháp trên máy. Đang lưu; bản trước khôi phục đã được yêu cầu tải xuống.');
            } catch (error) { setRestoreError(error instanceof Error ? error.message : String(error)); }
          }}>Tải bản hiện tại và khôi phục từ tệp</button>
          <button type="button" className="ml-2 rounded border px-3 py-2" onClick={() => setRestorePreview(null)}>Hủy</button>
        </div>}
      </details>}

      {isLocalMode && <details className="rounded-xl border border-slate-300 p-3 text-sm">
        <summary className="cursor-pointer font-semibold">Lịch sử sửa điểm và chốt sổ ({gradebook.history?.length || 0})</summary>
        <p className="my-2 text-xs text-slate-500">Chỉ có thay đổi từ bản cập nhật này. Lịch sử local có thể thay đổi khi dữ liệu trình duyệt bị sửa hoặc xóa.</p>
        <button type="button" className="rounded border px-3 py-2 my-2" onClick={() => {
          const url = URL.createObjectURL(new Blob([JSON.stringify(gradebook, null, 2)], { type: 'application/json' }));
          const link = document.createElement('a'); link.href = url; link.download = `So-diem-${classConfig.id}.json`; link.click(); URL.revokeObjectURL(url);
        }}>Tải bản sao sổ và lịch sử (.json)</button>
        <div className="max-h-80 overflow-auto space-y-2">
          {[...(gradebook.history || [])].reverse().map(event => <article key={event.id} className="border-t py-2 text-xs">
            <p><strong>{event.actor}</strong> · {new Date(event.at).toLocaleString('vi-VN')} · {event.action === 'restore' ? 'Toàn sổ' : event.term === 'semester1' ? 'HK1' : 'HK2'}</p>
            <p>{event.action === 'lock' ? 'Chốt sổ' : event.action === 'unlock' ? 'Mở lại sổ' : event.action === 'restore' ? 'Khôi phục sổ' : 'Sửa điểm'} · {event.detail}</p>
            {event.action === 'edit' && <p className="break-words">{event.before} → {event.after}</p>}
          </article>)}
        </div>
      </details>}

      {/* Footer hướng dẫn phím tắt */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-mono font-bold text-slate-700 dark:text-slate-300">
            Enter
          </kbd>
          hoặc
          <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 font-mono font-bold text-slate-700 dark:text-slate-300">
            ↓
          </kbd>
          <span>để nhảy xuống học sinh tiếp theo của cùng cột điểm.</span>
        </div>
        <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
          ✓ Điểm trung bình tự động tính theo công thức Thông tư 22 (TX: H1, GK: H2, CK: H3)
        </div>
      </div>
    </fieldset>
  );
}
