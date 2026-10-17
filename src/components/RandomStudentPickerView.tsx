import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Play,
  Award,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useSubjectRoster } from '../hooks/useSubjectRoster';
import { Student } from '../types';
import {
  filterEligibleStudents,
  calculateStudentWeights,
  pickRandomStudents,
  playTickSound,
  playWinnerFanfare,
  WHEEL_COLORS,
  PickerHistoryEntry,
  getSessionPickerHistory,
  saveSessionPickerHistory,
} from '../lib/randomPicker';
import { readDeviceSubjectAttendance } from '../lib/subjectAttendance';
import { loadClassGradebook, saveClassGradebook } from '../services/subjectGradeService';
import { ClassGradebookData } from '../types/subjectGrade';

type PickerDisplayMode = 'wheel' | 'slot' | 'cards';

export function RandomStudentPickerView() {
  const {
    students: ownStudents,
    classConfig,
    activeAccount,
    workspaceClasses,
    isLocalMode,
    addDisciplineLog,
  } = useApp();

  const { students, ready: rosterReady } = useSubjectRoster(classConfig, workspaceClasses, ownStudents);
  const subjectName = classConfig.subjectName || classConfig.teachingSubject || 'Toán';
  const teacherName = classConfig.homeroomTeacher || activeAccount?.displayName || 'Nguyễn Văn Sang';
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1. Cài đặt & Lọc
  const [displayMode, setDisplayMode] = useState<PickerDisplayMode>('wheel');
  const [pickCount, setPickCount] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [excludeCalled, setExcludeCalled] = useState<boolean>(true);
  const [excludeAbsent, setExcludeAbsent] = useState<boolean>(true);
  const [prioritizeMissing, setPrioritizeMissing] = useState<boolean>(false);

  // 2. Lịch sử đã gọi trong buổi
  const [history, setHistory] = useState<PickerHistoryEntry[]>(() => {
    return getSessionPickerHistory(classConfig.id, todayStr);
  });

  const calledIds = useMemo(() => new Set(history.map((h) => h.studentId)), [history]);

  // 3. Học sinh vắng hôm nay từ điểm danh bộ môn
  const absentIds = useMemo(() => {
    const book = readDeviceSubjectAttendance(localStorage, activeAccount?.uid || 'guest', classConfig.id);
    const absents = new Set<string>();
    Object.values(book.sessions).forEach((session) => {
      if (session.date === todayStr && session.records) {
        Object.entries(session.records).forEach(([sId, record]) => {
          if (record && typeof record === 'object' && 'status' in record) {
            const status = record.status;
            if (status === 'excused' || status === 'unexcused' || status === 'truant') {
              absents.add(sId);
            }
          }
        });
      }
    });
    return absents;
  }, [classConfig.id, todayStr, activeAccount?.uid]);

  // 4. Đếm số lượng điểm đã có từ sổ điểm (để phục vụ chế độ ưu tiên)
  const [gradebook, setGradebook] = useState<ClassGradebookData | null>(null);

  useEffect(() => {
    if (!rosterReady || students.length === 0) return;
    loadClassGradebook(
      classConfig.id,
      subjectName,
      classConfig.schoolYear,
      teacherName,
      students,
      isLocalMode,
      classConfig.teacherId
    )
      .then((gb) => setGradebook(gb))
      .catch(() => setGradebook(null));
  }, [classConfig.id, classConfig.teacherId, subjectName, classConfig.schoolYear, teacherName, students, isLocalMode, rosterReady]);

  const scoreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!gradebook) return counts;
    students.forEach((s) => {
      const g = gradebook.grades[s.id];
      const s1Count = g ? g.semester1.tx.filter((v) => v !== null).length + (g.semester1.gk !== null ? 1 : 0) : 0;
      counts[s.id] = s1Count;
    });
    return counts;
  }, [gradebook, students]);

  // Danh sách ứng viên đủ điều kiện
  const eligibleStudents = useMemo(() => {
    return filterEligibleStudents(students, calledIds, absentIds, {
      excludeCalled,
      excludeAbsent,
      prioritizeMissingScores: prioritizeMissing,
    });
  }, [students, calledIds, absentIds, excludeCalled, excludeAbsent, prioritizeMissing]);

  // Trọng số nếu ưu tiên
  const weights = useMemo(() => {
    return calculateStudentWeights(eligibleStudents, scoreCounts, prioritizeMissing);
  }, [eligibleStudents, scoreCounts, prioritizeMissing]);

  // 5. Trạng thái quay
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winners, setWinners] = useState<Student[]>([]);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string>('');
  const [customGradeInput, setCustomGradeInput] = useState<string>('9');
  const [individualScores, setIndividualScores] = useState<Record<string, string>>({});
  const [studentActions, setStudentActions] = useState<Record<string, string>>({});
  const [slotDisplayNames, setSlotDisplayNames] = useState<string[]>(['SẴN SÀNG QUAY']);

  // Canvas Vòng quay may mắn
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickSliceRef = useRef<number>(-1);

  // Vẽ vòng quay trên Canvas
  const drawWheel = useCallback(
    (angle: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const center = size / 2;
      const radius = center - 16;
      ctx.clearRect(0, 0, size, size);

      const items = eligibleStudents.length > 0 ? eligibleStudents : [{ id: '0', fullName: 'Không còn HS', studentCode: '' }];
      const totalSlices = items.length;
      const sliceAngle = (2 * Math.PI) / totalSlices;

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle);

      // Vẽ từng nan quạt
      for (let i = 0; i < totalSlices; i++) {
        const start = i * sliceAngle;
        const end = start + sliceAngle;
        const color = WHEEL_COLORS[i % WHEEL_COLORS.length];

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = totalSlices > 30 ? 1 : 2;
        ctx.stroke();

        // Vẽ tên học sinh
        ctx.save();
        ctx.rotate(start + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = totalSlices > 30 ? 'bold 10px sans-serif' : totalSlices > 20 ? 'bold 12px sans-serif' : 'bold 14px sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 4;

        const name = items[i].fullName;
        const truncated = name.length > 18 ? name.substring(0, 16) + '..' : name;
        ctx.fillText(truncated, radius - 20, 5);
        ctx.restore();
      }

      ctx.restore();

      // Vẽ vòng viền ngoài bóng bẩy
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      ctx.stroke();

      // Tâm vòng tròn kim loại
      ctx.beginPath();
      ctx.arc(center, center, 32, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e1b4b';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'black 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('QUAY', center, center);

      // Kim chỉ cố định ở đỉnh (12 giờ)
      ctx.beginPath();
      ctx.moveTo(center - 14, 2);
      ctx.lineTo(center + 14, 2);
      ctx.lineTo(center, 30);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    [eligibleStudents]
  );

  useEffect(() => {
    drawWheel(currentAngleRef.current);
  }, [drawWheel]);

  // Kích hoạt Quay
  const startSpin = () => {
    if (isSpinning || eligibleStudents.length === 0) return;
    setIsSpinning(true);
    setShowWinnerModal(false);
    setActionMessage('');

    // Chọn danh sách người thắng cuộc
    const selectedWinners = pickRandomStudents(eligibleStudents, pickCount, prioritizeMissing ? weights : undefined);
    setWinners(selectedWinners);

    if (displayMode === 'wheel') {
      spinWheelAnimation(selectedWinners[0]);
    } else if (displayMode === 'slot') {
      spinSlotAnimation(selectedWinners);
    } else {
      spinCardsAnimation(selectedWinners);
    }
  };

  // 1. Hiệu ứng Vòng quay Canvas
  const spinWheelAnimation = (winner: Student) => {
    const winnerIndex = eligibleStudents.findIndex((s) => s.id === winner.id);
    const totalSlices = eligibleStudents.length;
    const sliceAngle = (2 * Math.PI) / totalSlices;

    // Góc đích để kim chỉ 12h (tương đương 3*PI/2) trúng nan quạt của winner
    // Kim ở 3*PI/2, nan quạt winner ở [winnerIndex * sliceAngle, (winnerIndex+1)*sliceAngle]
    const targetSliceAngle = winnerIndex * sliceAngle + sliceAngle / 2;
    // Điểm kim chỉ là 3*PI/2 => góc xoay bánh xe: (3*PI/2 - targetSliceAngle)
    const targetAngleOffset = (3 * Math.PI) / 2 - targetSliceAngle;

    const fullSpins = 6 + Math.floor(Math.random() * 3); // 6 đến 8 vòng đầy đủ
    const finalAngle = currentAngleRef.current + fullSpins * 2 * Math.PI + (targetAngleOffset - (currentAngleRef.current % (2 * Math.PI)));

    const startTime = performance.now();
    const duration = 4500; // 4.5 giây
    const startAngle = currentAngleRef.current;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Cubic ease-out deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const angle = startAngle + (finalAngle - startAngle) * easeOut;
      currentAngleRef.current = angle;

      // Phát âm thanh tiếng kim tíc tắc
      const currentSlice = Math.floor((angle / sliceAngle) % totalSlices);
      if (currentSlice !== lastTickSliceRef.current) {
        lastTickSliceRef.current = currentSlice;
        playTickSound(soundEnabled);
      }

      drawWheel(angle);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        handlePickCompleted([winner]);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // 2. Hiệu ứng Hộp chữ lướt tốc độ cao (Slot Machine)
  const spinSlotAnimation = (selectedWinners: Student[]) => {
    const duration = 3000;
    const startTime = performance.now();

    const interval = setInterval(() => {
      const randomSub = pickRandomStudents(eligibleStudents, selectedWinners.length);
      setSlotDisplayNames(randomSub.map((s) => s.fullName));
      playTickSound(soundEnabled);

      if (performance.now() - startTime >= duration) {
        clearInterval(interval);
        setSlotDisplayNames(selectedWinners.map((s) => s.fullName));
        setIsSpinning(false);
        handlePickCompleted(selectedWinners);
      }
    }, 80);
  };

  // 3. Hiệu ứng Lật thẻ bài (Cards Flip)
  const spinCardsAnimation = (selectedWinners: Student[]) => {
    const duration = 2000;
    setTimeout(() => {
      setIsSpinning(false);
      handlePickCompleted(selectedWinners);
    }, duration);
  };

  // Xử lý khi hoàn tất quay / chọn
  const handlePickCompleted = (picked: Student[]) => {
    playWinnerFanfare(soundEnabled);
    setShowWinnerModal(true);

    const initialScores: Record<string, string> = {};
    picked.forEach((p) => {
      initialScores[p.id] = '9';
    });
    setIndividualScores(initialScores);
    setStudentActions({});

    // Lưu vào lịch sử phiên
    const newEntries: PickerHistoryEntry[] = picked.map((s) => ({
      studentId: s.id,
      studentCode: s.studentCode,
      fullName: s.fullName,
      calledAt: new Date().toISOString(),
      actionTaken: 'none',
    }));

    setHistory((prev) => {
      const updated = [...newEntries, ...prev];
      saveSessionPickerHistory(classConfig.id, todayStr, updated);
      return updated;
    });
  };

  // Tác vụ nhanh 1: Cộng điểm phát biểu (Rèn luyện / Nề nếp) cho 1 học sinh
  const handleAwardBonusPoint = async (student: Student, points = 2) => {
    try {
      const now = new Date();
      await addDisciplineLog({
        date: todayStr,
        month: now.getMonth() + 1,
        weekNumber: 1,
        studentId: student.id,
        studentCode: student.studentCode || '',
        studentName: student.fullName,
        behaviorCode: 'THUONG_PHAT_BIEU',
        behaviorDescription: 'Phát biểu xây dựng bài (Gọi tên ngẫu nhiên)',
        type: 'bonus',
        scorePerUnit: points,
        count: 1,
        reporter: teacherName,
        note: 'Gọi tên ngẫu nhiên phát biểu trả lời câu hỏi',
      });

      // Cập nhật lịch sử
      setHistory((prev) => {
        const updated = prev.map((item) =>
          item.studentId === student.id
            ? { ...item, actionTaken: 'bonus_point' as const, detail: `+${points} điểm rèn luyện` }
            : item
        );
        saveSessionPickerHistory(classConfig.id, todayStr, updated);
        return updated;
      });

      setStudentActions((prev) => ({
        ...prev,
        [student.id]: `+${points}đ phát biểu`,
      }));

      setActionMessage(`Đã cộng +${points} điểm nề nếp cho ${student.fullName}!`);
    } catch (err) {
      alert(`Lỗi cộng điểm: ${String(err)}`);
    }
  };

  // Tác vụ nhanh 2: Ghi thẳng vào Sổ điểm môn Toán (TX) cho 1 học sinh
  const handleSaveToSubjectGradebook = async (student: Student, overrideScore?: string) => {
    const rawScore = overrideScore !== undefined ? overrideScore : (individualScores[student.id] || customGradeInput);
    const score = parseFloat(rawScore.replace(',', '.'));
    if (isNaN(score) || score < 0 || score > 10) {
      alert(`Vui lòng nhập điểm từ 0 đến 10 cho ${student.fullName}.`);
      return;
    }

    try {
      const gb =
        gradebook ||
        (await loadClassGradebook(
          classConfig.id,
          subjectName,
          classConfig.schoolYear,
          teacherName,
          students,
          isLocalMode,
          classConfig.teacherId
        ));

      const studentGrade = gb.grades[student.id];
      if (!studentGrade) {
        alert(`Không tìm thấy ${student.fullName} trong sổ điểm!`);
        return;
      }

      // Tìm cột TX đầu tiên còn trống của HK1
      const emptyTxIdx = studentGrade.semester1.tx.findIndex((val) => val === null || val === undefined);
      const targetIdx = emptyTxIdx !== -1 ? emptyTxIdx : 0;

      const updatedStudentGrade = {
        ...studentGrade,
        semester1: {
          ...studentGrade.semester1,
          tx: [...studentGrade.semester1.tx],
        },
      };
      updatedStudentGrade.semester1.tx[targetIdx] = score;

      const updatedGb = {
        ...gb,
        grades: {
          ...gb.grades,
          [student.id]: updatedStudentGrade,
        },
        updatedAt: new Date().toISOString(),
      };

      setGradebook(updatedGb);
      await saveClassGradebook(updatedGb, isLocalMode);

      setHistory((prev) => {
        const updated = prev.map((item) =>
          item.studentId === student.id
            ? { ...item, actionTaken: 'grade_entered' as const, detail: `Điểm TX${targetIdx + 1}: ${score}` }
            : item
        );
        saveSessionPickerHistory(classConfig.id, todayStr, updated);
        return updated;
      });

      setStudentActions((prev) => ({
        ...prev,
        [student.id]: `Đã lưu TX${targetIdx + 1}: ${score}đ`,
      }));

      setActionMessage(`Đã ghi điểm ${score} vào cột TX${targetIdx + 1} môn ${subjectName} cho ${student.fullName}!`);
    } catch (err) {
      alert(`Lỗi ghi sổ điểm: ${String(err)}`);
    }
  };

  // Tác vụ hàng loạt cho cả nhóm
  const handleBatchAwardBonus = async (points = 2) => {
    for (const w of winners) {
      await handleAwardBonusPoint(w, points);
    }
    setActionMessage(`Đã cộng +${points} điểm phát biểu cho cả ${winners.length} em!`);
  };

  const handleBatchSaveGrades = async (scoreVal: string) => {
    for (const w of winners) {
      await handleSaveToSubjectGradebook(w, scoreVal);
    }
    setActionMessage(`Đã ghi điểm TX ${scoreVal} vào sổ điểm cho cả ${winners.length} em!`);
  };

  // Đặt lại lịch sử gọi trong buổi
  const handleResetHistory = () => {
    if (confirm('Xóa lịch sử gọi của buổi học hôm nay để bắt đầu vòng quay mới?')) {
      setHistory([]);
      saveSessionPickerHistory(classConfig.id, todayStr, []);
    }
  };

  // Bật / tắt toàn màn hình
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        void document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 text-white p-6 overflow-y-auto' : ''}`}>
      {/* ── Tiêu đề & Công cụ đầu trang ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-rose-500/25">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Gọi tên học sinh ngẫu nhiên
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 font-bold border border-amber-300">
                Lớp {classConfig.className} · {subjectName}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tạo không khí sôi nổi, công bằng khi kiểm tra bài cũ, phát biểu và làm bài tập trên lớp.
            </p>
          </div>
        </div>

        {/* Nút công cụ nhanh */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled((v) => !v)}
            className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              soundEnabled
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }`}
            title="Bật/Tắt âm thanh quay và chúc mừng"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Bật âm' : 'Tắt âm'}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Chiếu toàn màn hình lên máy chiếu / tivi lớp học"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
          </button>
        </div>
      </div>

      {/* ── Bộ điều khiển chế độ hiển thị & Tùy chọn ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Chọn chế độ quay */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Chế độ hiển thị
          </label>
          <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setDisplayMode('wheel')}
              className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                displayMode === 'wheel'
                  ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🎡 Vòng quay
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('slot')}
              className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                displayMode === 'slot'
                  ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🎰 Hộp số
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('cards')}
              className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                displayMode === 'cards'
                  ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🃏 Lật thẻ
            </button>
          </div>
        </div>

        {/* Số lượng học sinh chọn cùng lúc */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Số lượng em gọi cùng lúc
          </label>
          <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setPickCount(num)}
                className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  pickCount === num
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {num} em
              </button>
            ))}
          </div>
        </div>

        {/* Bộ lọc sư phạm thông minh */}
        <div className="p-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1.5 text-xs">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Bộ lọc sư phạm
          </label>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={excludeCalled}
                onChange={(e) => setExcludeCalled(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <span>Loại trừ em đã gọi ({calledIds.size} em)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={excludeAbsent}
                onChange={(e) => setExcludeAbsent(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <span>Loại trừ em vắng hôm nay ({absentIds.size} em)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={prioritizeMissing}
                onChange={(e) => setPrioritizeMissing(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <span>Ưu tiên em chưa có điểm / ít điểm</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── THANH THỐNG KÊ ỨNG VIÊN & NÚT QUAY CHÍNH ── */}
      <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-sm">
            {eligibleStudents.length}
          </div>
          <div>
            <div className="font-bold text-sm">
              Đủ điều kiện quay: <strong className="text-amber-300">{eligibleStudents.length}</strong> / {students.length} học sinh
            </div>
            <div className="text-xs text-purple-200 mt-0.5">
              Đã gọi trong buổi: <strong>{calledIds.size}</strong> em · Vắng: <strong>{absentIds.size}</strong> em
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {history.length > 0 && (
            <button
              type="button"
              onClick={handleResetHistory}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Làm mới lịch sử để quay lại từ đầu"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Làm mới lượt</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSpinning || eligibleStudents.length === 0}
            onClick={startSpin}
            className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer ${
              isSpinning || eligibleStudents.length === 0
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-amber-500/25 animate-pulse'
            }`}
          >
            <Play className="h-4 w-4 fill-current" />
            <span>{isSpinning ? 'ĐANG QUAY...' : 'BẮT ĐẦU QUAY'}</span>
          </button>
        </div>
      </div>

      {/* ── KHU VỰC HIỂN THỊ CHÍNH (CANVAS WHEEL / SLOT / CARDS) ── */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center min-h-[420px]">
        {eligibleStudents.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Đã gọi hết tất cả học sinh trong buổi!
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tất cả các em đủ điều kiện đã được gọi lên bảng. Thầy có thể bấm nút bên dưới để đặt lại và bắt đầu vòng mới.
            </p>
            <button
              type="button"
              onClick={handleResetHistory}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Bắt đầu lượt gọi mới</span>
            </button>
          </div>
        ) : displayMode === 'wheel' ? (
          /* Chế độ 1: Vòng quay Canvas */
          <div className="relative flex flex-col items-center justify-center">
            <canvas
              ref={canvasRef}
              width={380}
              height={380}
              className="max-w-full drop-shadow-2xl cursor-pointer"
              onClick={startSpin}
            />
            {!isSpinning && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 font-medium">
                Bấm nút BẮT ĐẦU hoặc chạm vào vòng quay để quay
              </p>
            )}
          </div>
        ) : displayMode === 'slot' ? (
          /* Chế độ 2: Hộp số Neon Cyber Slot Machine */
          <div className="w-full max-w-xl py-12 px-6 rounded-3xl bg-slate-950 border-4 border-purple-500/50 shadow-2xl text-center space-y-6">
            <div className="text-xs font-black uppercase tracking-widest text-purple-400">
              HỘP SỐ BÍ MẬT · LỚP {classConfig.className}
            </div>
            <div className="space-y-3">
              {slotDisplayNames.map((name, idx) => (
                <div
                  key={idx}
                  className="py-4 px-6 rounded-2xl bg-slate-900 border border-purple-500/30 text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-400 to-purple-400 tracking-tight shadow-inner"
                >
                  {name}
                </div>
              ))}
            </div>
            <button
              type="button"
              disabled={isSpinning}
              onClick={startSpin}
              className="px-8 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              {isSpinning ? 'Đang quay...' : 'Bắt đầu lướt số'}
            </button>
          </div>
        ) : (
          /* Chế độ 3: Lật thẻ bài (Cards Flip) */
          <div className="w-full max-w-3xl py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: pickCount }).map((_, idx) => {
                const pickedStudent = winners[idx];
                return (
                  <div
                    key={idx}
                    className={`h-48 rounded-2xl border-2 p-4 flex flex-col items-center justify-center text-center transition-all duration-500 ${
                      isSpinning
                        ? 'border-purple-500 bg-purple-950/20 animate-pulse scale-95'
                        : pickedStudent
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-lg scale-100'
                        : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850'
                    }`}
                  >
                    {isSpinning ? (
                      <div className="space-y-2">
                        <Sparkles className="h-8 w-8 text-purple-500 animate-spin mx-auto" />
                        <span className="text-xs font-bold text-purple-600">Đang chọn...</span>
                      </div>
                    ) : pickedStudent ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center mx-auto shadow-md">
                          {pickedStudent.studentCode || idx + 1}
                        </div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          {pickedStudent.fullName}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold">
                          Đã chọn
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-2 text-slate-400">
                        <HelpCircle className="h-8 w-8 mx-auto" />
                        <span className="text-xs font-bold">Thẻ #{idx + 1}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL CHÚC MỪNG VÀ TÁC VỤ CHẤM ĐIỂM TỪNG HỌC SINH ── */}
      {showWinnerModal && winners.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 text-center space-y-4">
            {/* Header Modal */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
                <Award className="h-6 w-6" />
              </div>
              <div className="text-left">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block">
                  HỌC SINH ĐƯỢC CHỌN ({winners.length} EM)
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Thầy có thể chấm điểm TX hoặc cộng điểm phát biểu riêng cho từng em.
                </p>
              </div>
            </div>

            {/* Thông báo kết quả tác vụ */}
            {actionMessage && (
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold animate-fadeIn">
                ✓ {actionMessage}
              </div>
            )}

            {/* Thanh tác vụ hàng loạt nếu gọi nhiều hơn 1 em */}
            {winners.length > 1 && (
              <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-purple-900 dark:text-purple-300">
                  ⚡ Chấm nhanh cả {winners.length} em:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleBatchAwardBonus(2)}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition cursor-pointer shadow-2xs"
                  >
                    +2đ tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const score = prompt('Nhập điểm TX chung cho cả nhóm (0 - 10):', '9');
                      if (score !== null && score.trim() !== '') {
                        void handleBatchSaveGrades(score.trim());
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition cursor-pointer shadow-2xs"
                  >
                    Lưu điểm TX tất cả
                  </button>
                </div>
              </div>
            )}

            {/* Danh sách thẻ từng học sinh để chấm điểm riêng biệt */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[50vh]">
              {winners.map((winner, idx) => {
                const actionDone = studentActions[winner.id];
                return (
                  <div
                    key={winner.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left space-y-2 transition shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {winner.fullName}
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            Mã: {winner.studentCode || '—'} · Lớp: {classConfig.className}
                          </span>
                        </div>
                      </div>

                      {actionDone ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[11px] border border-emerald-300 animate-fadeIn shrink-0">
                          ✓ {actionDone}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          Chưa chấm
                        </span>
                      )}
                    </div>

                    {/* Dòng thao tác riêng cho học sinh này */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                      {/* Nhập và lưu điểm TX */}
                      <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={individualScores[winner.id] ?? '9'}
                          onChange={(e) =>
                            setIndividualScores((prev) => ({
                              ...prev,
                              [winner.id]: e.target.value,
                            }))
                          }
                          placeholder="Điểm"
                          className="w-14 p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-black text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSaveToSubjectGradebook(winner)}
                          className="flex-1 py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                          title="Lưu điểm vào cột TX còn trống của học sinh này trong sổ điểm"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>Lưu điểm TX</span>
                        </button>
                      </div>

                      {/* Nút cộng điểm rèn luyện */}
                      <button
                        type="button"
                        onClick={() => void handleAwardBonusPoint(winner, 2)}
                        className="py-1.5 px-3 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
                        title="Cộng 2 điểm rèn luyện / nề nếp cho học sinh này"
                      >
                        <Award className="h-3.5 w-3.5" />
                        <span>+2 Điểm phát biểu</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Nút hành động chân trang */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowWinnerModal(false);
                  startSpin();
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-purple-500/20"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Quay lượt tiếp theo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWinnerModal(false)}
                className="w-full py-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium cursor-pointer"
              >
                Đóng hộp thoại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BẢNG LỊCH SỬ GỌI TÊN TRONG BUỔI HỌC ── */}
      {history.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-600" />
              Lịch sử các em đã gọi trong buổi hôm nay ({history.length} lượt)
            </h4>
            <button
              type="button"
              onClick={handleResetHistory}
              className="text-[11px] text-rose-600 hover:underline font-bold cursor-pointer"
            >
              Xóa lịch sử
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[11px]">
                <tr>
                  <th className="p-2 w-12 text-center">STT</th>
                  <th className="p-2 w-20">Thời gian</th>
                  <th className="p-2 w-20">Mã HS</th>
                  <th className="p-2">Họ và tên</th>
                  <th className="p-2">Tác vụ đã thực hiện</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map((entry, idx) => {
                  const timeStr = new Date(entry.calledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                      <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-2 font-mono text-slate-500">{timeStr}</td>
                      <td className="p-2 font-bold text-slate-600 dark:text-slate-400">{entry.studentCode}</td>
                      <td className="p-2 font-bold text-slate-900 dark:text-white">{entry.fullName}</td>
                      <td className="p-2">
                        {entry.actionTaken === 'bonus_point' ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold text-[10px]">
                            {entry.detail || 'Cộng điểm rèn luyện'}
                          </span>
                        ) : entry.actionTaken === 'grade_entered' ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold text-[10px]">
                            {entry.detail || 'Đã vào sổ điểm TX'}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Chưa ghi nhận</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
