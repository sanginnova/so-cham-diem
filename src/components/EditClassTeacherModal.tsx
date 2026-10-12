import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  CheckCircle2,
  User,
  GraduationCap,
  School,
  Calendar,
  Phone,
  Mail,
  BookOpen,
  MessageSquare,
  ShieldAlert,
  Users,
  Award,
  Sparkles,
  MapPin,
  Sliders,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEFAULT_RANK_THRESHOLDS } from '../lib/utils';

export interface EditClassTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'teacher' | 'class' | 'cadres' | 'scoring';
}

export const EditClassTeacherModal: React.FC<EditClassTeacherModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'teacher',
}) => {
  const { classConfig, updateClassConfig, students, userRole, activeAccount, schoolClasses, workspaceClasses, deleteWorkspaceClass } = useApp();

  const [activeTab, setActiveTab] = useState<'teacher' | 'class' | 'cadres' | 'scoring'>(defaultTab);
  const [confirmDeleteClass, setConfirmDeleteClass] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  // Form states
  const [homeroomTeacher, setHomeroomTeacher] = useState(classConfig.homeroomTeacher || '');
  const [teacherPhone, setTeacherPhone] = useState(classConfig.teacherPhone || '');
  const [teacherEmail, setTeacherEmail] = useState(classConfig.teacherEmail || '');
  const [teachingSubject, setTeachingSubject] = useState(classConfig.teachingSubject || '');
  const [defaultTeacherNote, setDefaultTeacherNote] = useState(classConfig.defaultTeacherNote || '');

  const [className, setClassName] = useState(classConfig.className || '');
  const [schoolYear, setSchoolYear] = useState(classConfig.schoolYear || '');
  const [schoolName, setSchoolName] = useState(classConfig.schoolName || '');
  const [grade, setGrade] = useState(classConfig.grade || '');
  const [roomNumber, setRoomNumber] = useState(classConfig.roomNumber || '');

  const [classPresident, setClassPresident] = useState(classConfig.classPresident || '');
  const [academicVicePresident, setAcademicVicePresident] = useState(classConfig.academicVicePresident || '');
  const [disciplineVicePresident, setDisciplineVicePresident] = useState(classConfig.disciplineVicePresident || '');
  const [youthUnionSecretary, setYouthUnionSecretary] = useState(classConfig.youthUnionSecretary || '');

  const [baseScore, setBaseScore] = useState<number>(classConfig.baseScore ?? 10);
  const [minScore, setMinScore] = useState<number>(classConfig.minScore ?? 0);
  const [maxScore, setMaxScore] = useState<number>(classConfig.maxScore && classConfig.maxScore > 10 ? classConfig.maxScore : 100);

  // Customizable Rank Thresholds
  const [rankXuatSac, setRankXuatSac] = useState<number>(classConfig.rankThresholds?.xuatSac ?? DEFAULT_RANK_THRESHOLDS.xuatSac);
  const [rankTot, setRankTot] = useState<number>(classConfig.rankThresholds?.tot ?? DEFAULT_RANK_THRESHOLDS.tot);
  const [rankKha, setRankKha] = useState<number>(classConfig.rankThresholds?.kha ?? DEFAULT_RANK_THRESHOLDS.kha);
  const [rankDat, setRankDat] = useState<number>(classConfig.rankThresholds?.dat ?? DEFAULT_RANK_THRESHOLDS.dat);
  const [rankXuatSacNote, setRankXuatSacNote] = useState<string>(classConfig.rankThresholds?.xuatSacNote || DEFAULT_RANK_THRESHOLDS.xuatSacNote || 'Bốc thăm phần thưởng');
  const [rankKhongDatNote, setRankKhongDatNote] = useState<string>(classConfig.rankThresholds?.khongDatNote || DEFAULT_RANK_THRESHOLDS.khongDatNote || 'Bốc thăm hình phạt');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync inputs whenever modal opens or classConfig updates
  useEffect(() => {
    if (isOpen) {
      setHomeroomTeacher(classConfig.homeroomTeacher || '');
      setTeacherPhone(classConfig.teacherPhone || '');
      setTeacherEmail(classConfig.teacherEmail || '');
      setTeachingSubject(classConfig.teachingSubject || '');
      setDefaultTeacherNote(classConfig.defaultTeacherNote || '');

      setClassName(classConfig.className || '');
      setSchoolYear(classConfig.schoolYear || '');
      setSchoolName(classConfig.schoolName || '');
      setGrade(classConfig.grade || '');
      setRoomNumber(classConfig.roomNumber || '');

      setClassPresident(classConfig.classPresident || '');
      setAcademicVicePresident(classConfig.academicVicePresident || '');
      setDisciplineVicePresident(classConfig.disciplineVicePresident || '');
      setYouthUnionSecretary(classConfig.youthUnionSecretary || '');

      setBaseScore(classConfig.baseScore ?? 10);
      setMinScore(classConfig.minScore ?? 0);
      setMaxScore(classConfig.maxScore && classConfig.maxScore > 10 ? classConfig.maxScore : 100);

      setRankXuatSac(classConfig.rankThresholds?.xuatSac ?? DEFAULT_RANK_THRESHOLDS.xuatSac);
      setRankTot(classConfig.rankThresholds?.tot ?? DEFAULT_RANK_THRESHOLDS.tot);
      setRankKha(classConfig.rankThresholds?.kha ?? DEFAULT_RANK_THRESHOLDS.kha);
      setRankDat(classConfig.rankThresholds?.dat ?? DEFAULT_RANK_THRESHOLDS.dat);
      setRankXuatSacNote(classConfig.rankThresholds?.xuatSacNote || DEFAULT_RANK_THRESHOLDS.xuatSacNote || 'Bốc thăm phần thưởng');
      setRankKhongDatNote(classConfig.rankThresholds?.khongDatNote || DEFAULT_RANK_THRESHOLDS.khongDatNote || 'Bốc thăm hình phạt');

      setSaveSuccess(false);
      setConfirmDeleteClass(false);
      setActiveTab(defaultTab);
    }
  }, [isOpen, classConfig, defaultTab]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!className.trim()) {
      alert('Vui lòng nhập tên lớp học (ví dụ: 10A8).');
      return;
    }
    if (!homeroomTeacher.trim()) {
      alert('Vui lòng nhập họ tên Giáo viên chủ nhiệm.');
      return;
    }

    const cleanClassName = className.trim().replace(/^lớp\s+/i, '');
    const isConflict = schoolClasses.some(
      (c) =>
        c.className.toLowerCase() === cleanClassName.toLowerCase() &&
        c.teacherId !== (activeAccount?.uid || '')
    );
    if (userRole === 'teacher' && isConflict) {
      alert(`Tên lớp "${cleanClassName}" đã thuộc về một giáo viên khác trong trường. Thầy/cô chỉ có quyền quản lý và chỉnh sửa lớp được phân công.`);
      return;
    }

    // Validate rank thresholds
    if (rankXuatSac <= rankTot || rankTot <= rankKha || rankKha <= rankDat) {
      alert('Điểm tiêu chuẩn xếp loại phải giảm dần: Xuất sắc > Tốt > Khá > Đạt. Vui lòng kiểm tra lại!');
      return;
    }
    if (rankDat < minScore) {
      alert(`Điểm xếp loại Đạt (${rankDat}đ) không được thấp hơn điểm sàn (${minScore}đ).`);
      return;
    }

    try {
      setIsSaving(true);
      await updateClassConfig({
        homeroomTeacher: homeroomTeacher.trim(),
        teacherPhone: teacherPhone.trim(),
        teacherEmail: teacherEmail.trim(),
        teachingSubject: teachingSubject.trim(),
        defaultTeacherNote: defaultTeacherNote.trim(),

        className: className.trim(),
        schoolYear: schoolYear.trim(),
        schoolName: schoolName.trim(),
        grade: grade.trim(),
        roomNumber: roomNumber.trim(),

        classPresident: classPresident.trim(),
        academicVicePresident: academicVicePresident.trim(),
        disciplineVicePresident: disciplineVicePresident.trim(),
        youthUnionSecretary: youthUnionSecretary.trim(),

        baseScore: Number(baseScore),
        minScore: Number(minScore),
        maxScore: Number(maxScore),

        rankThresholds: {
          xuatSac: Number(rankXuatSac),
          tot: Number(rankTot),
          kha: Number(rankKha),
          dat: Number(rankDat),
          xuatSacNote: rankXuatSacNote.trim() || 'Bốc thăm phần thưởng',
          khongDatNote: rankKhongDatNote.trim() || 'Bốc thăm hình phạt',
        },
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      alert('Lỗi lưu cấu hình: ' + (err?.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const activeStudentsCount = students.filter((s) => s.status === 'active').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-sm">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Thay Đổi Thông Tin Giáo Viên & Lớp Học
              </h3>
              <p className="text-xs text-blue-100">
                Cập nhật hồ sơ GVCN, lớp phụ trách, ban cán sự và thang điểm thi đua
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 px-4 pt-2 gap-2 overflow-x-auto text-xs sm:text-sm font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('teacher')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl border-b-2 transition ${
              activeTab === 'teacher'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Thông Tin Giáo Viên</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('class')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl border-b-2 transition ${
              activeTab === 'class'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent'
            }`}
          >
            <School className="h-4 w-4" />
            <span>Thông Tin Lớp & Trường</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cadres')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl border-b-2 transition ${
              activeTab === 'cadres'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Ban Cán Sự Lớp</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('scoring')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl border-b-2 transition ${
              activeTab === 'scoring'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-600'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border-transparent'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Thang Điểm Thi Đua</span>
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs sm:text-sm">
          {/* TAB 1: TEACHER INFO */}
          {activeTab === 'teacher' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-300 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  Thông tin Giáo viên chủ nhiệm sẽ xuất hiện trang trọng trong tất cả các báo cáo nề nếp, phiếu rèn luyện Zalo gửi phụ huynh và xuất file Excel.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Họ và tên Giáo viên chủ nhiệm <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={homeroomTeacher}
                      onChange={(e) => setHomeroomTeacher(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn Sang"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Môn giảng dạy chính
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={teachingSubject}
                      onChange={(e) => setTeachingSubject(e.target.value)}
                      placeholder="Ví dụ: Toán học, Ngữ văn, Tiếng Anh..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Số điện thoại liên hệ (GVCN)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      placeholder="Ví dụ: 0912 345 678"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Hiển thị ở chân chữ ký tin nhắn gửi phụ huynh học sinh
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email liên hệ của GVCN
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={teacherEmail}
                      onChange={(e) => setTeacherEmail(e.target.value)}
                      placeholder="Ví dụ: giaovien@gmail.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Lời dặn dò / Lời nhắn mặc định gửi Phụ huynh
                </label>
                <div className="relative">
                  <textarea
                    rows={3}
                    value={defaultTeacherNote}
                    onChange={(e) => setDefaultTeacherNote(e.target.value)}
                    placeholder="Ví dụ: Kính mong Quý Phụ huynh tiếp tục đồng hành, nhắc nhở và phối hợp cùng GVCN để động viên các con rèn luyện nề nếp thật tốt!"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-normal focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Đoạn tin này sẽ tự động xuất hiện làm lời dặn dò mẫu trong phiếu Zalo và màn hình báo cáo cá nhân.
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: CLASS & SCHOOL INFO */}
          {activeTab === 'class' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên lớp học <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="Ví dụ: 10A8, 12 Tin, 9A..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Khối lớp
                  </label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Ví dụ: Khối 10, Khối 11, Khối 12"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Năm học <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={schoolYear}
                      onChange={(e) => setSchoolYear(e.target.value)}
                      placeholder="Ví dụ: 2026–2027"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tên trường / Đơn vị trường học
                  </label>
                  <div className="relative">
                    <School className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="Ví dụ: Trường THPT Chuyên, THPT Lê Quý Đôn"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phòng học / Vị trí lớp
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="Ví dụ: Phòng 204 - Dãy nhà A"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sĩ số lớp hiện tại
                  </label>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-700 dark:text-slate-200">
                    {activeStudentsCount} học sinh đang học (Tổng số: {students.length})
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    (Tự động đồng bộ từ danh sách Học sinh)
                  </span>
                </div>

                {/* Quy chuẩn Thời khóa biểu 2 buổi / ngày, mỗi buổi 5 tiết */}
                <div className="sm:col-span-2 p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-slate-800 dark:to-slate-800/80 rounded-xl border border-blue-200/80 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                      <span>⏰ Chế độ học tập:</span>
                      <span className="text-blue-600 dark:text-blue-400">2 Buổi / Ngày (Mỗi buổi 5 tiết)</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-bold">
                      10 tiết / ngày
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-750">
                      <div className="font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
                        <span>☀️ Buổi Sáng (5 tiết):</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 space-y-0.5">
                        <div>• Tiết 1, Tiết 2, Tiết 3, Tiết 4, Tiết 5</div>
                        <div className="text-[10px] text-slate-400">Kèm: Đầu giờ sáng truy bài, Ra chơi sáng</div>
                      </div>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-750">
                      <div className="font-bold text-sky-600 dark:text-sky-400 mb-1 flex items-center gap-1">
                        <span>🌤️ Buổi Chiều (5 tiết):</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-400 space-y-0.5">
                        <div>• Tiết 6 (T1C), Tiết 7 (T2C), Tiết 8, Tiết 9, Tiết 10</div>
                        <div className="text-[10px] text-slate-400">Kèm: Đầu giờ chiều truy bài, Ra chơi chiều</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {workspaceClasses.length > 1 && userRole !== 'monitor' && (
                <div className="mt-4 p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                        <Trash2 className="h-4 w-4" />
                        <span>Xóa lớp học này</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Xóa vĩnh viễn lớp “{className} · {schoolYear}” cùng học sinh và điểm nề nếp tương ứng.
                      </p>
                    </div>
                    {!confirmDeleteClass && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteClass(true)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Xóa lớp này
                      </button>
                    )}
                  </div>

                  {confirmDeleteClass && (
                    <div className="pt-2 border-t border-rose-200 dark:border-rose-900/60 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        ⚠️ Xác nhận xóa? Thao tác không thể hoàn tác!
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isDeletingClass}
                          onClick={() => setConfirmDeleteClass(false)}
                          className="px-3 py-1 bg-white dark:bg-slate-800 border rounded-lg text-xs font-medium cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={isDeletingClass}
                          onClick={async () => {
                            try {
                              setIsDeletingClass(true);
                              await deleteWorkspaceClass(classConfig.id);
                              onClose();
                            } catch (err: any) {
                              alert(err.message || String(err));
                            } finally {
                              setIsDeletingClass(false);
                            }
                          }}
                          className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 cursor-pointer disabled:opacity-50"
                        >
                          {isDeletingClass ? 'Đang xóa…' : 'Xác nhận xóa vĩnh viễn'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CADRES */}
          {activeTab === 'cadres' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  Danh sách Ban cán sự lớp hỗ trợ GVCN theo dõi sổ chấm điểm, điểm danh và ghi nhận vi phạm / khen thưởng hàng ngày.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lớp trưởng
                  </label>
                  <input
                    type="text"
                    value={classPresident}
                    onChange={(e) => setClassPresident(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lớp phó học tập
                  </label>
                  <input
                    type="text"
                    value={academicVicePresident}
                    onChange={(e) => setAcademicVicePresident(e.target.value)}
                    placeholder="Ví dụ: Trần Thị Bích"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lớp phó phụ trách nề nếp / Kỷ luật
                  </label>
                  <input
                    type="text"
                    value={disciplineVicePresident}
                    onChange={(e) => setDisciplineVicePresident(e.target.value)}
                    placeholder="Ví dụ: Lê Hoàng Cường"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bí thư chi đoàn
                  </label>
                  <input
                    type="text"
                    value={youthUnionSecretary}
                    onChange={(e) => setYouthUnionSecretary(e.target.value)}
                    placeholder="Ví dụ: Phạm Thu Dung"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SCORING & THRESHOLDS */}
          {activeTab === 'scoring' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Điểm nền ban đầu
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={baseScore}
                    onChange={(e) => setBaseScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Chuẩn thi đua đầu tuần/tháng: 10,0đ
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Điểm thấp nhất (Điểm sàn)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Mặc định giới hạn: 0,0đ
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Điểm cao nhất (Điểm trần)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Mặc định trần: 100đ (cho phép cộng điểm vượt mức 10)
                  </span>
                </div>
              </div>

              {/* Tiêu chuẩn xếp loại rèn luyện thi đua (Cho phép chỉnh sửa linh hoạt) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                      <span>🏆 Tiêu chuẩn xếp loại rèn luyện thi đua:</span>
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                      Thầy/cô có thể sửa trực tiếp điểm ngưỡng hoặc chọn mẫu nhanh:
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setRankXuatSac(12);
                        setRankTot(8);
                        setRankKha(7);
                        setRankDat(5);
                        setRankXuatSacNote('Bốc thăm phần thưởng');
                        setRankKhongDatNote('Bốc thăm hình phạt');
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-400 hover:text-blue-600 transition-colors shadow-2xs"
                    >
                      🎯 Chuẩn 10A8 (12-8-7-5)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRankXuatSac(9);
                        setRankTot(8);
                        setRankKha(6.5);
                        setRankDat(5);
                        setRankXuatSacNote('Khen thưởng xuất sắc');
                        setRankKhongDatNote('Nhắc nhở rèn luyện');
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-2xs"
                    >
                      📋 Chuẩn thang 10 (9-8-6.5-5)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {/* Xuất sắc */}
                  <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-amber-900 dark:text-amber-300 text-xs mb-1">
                        Xuất sắc 🎁
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">≥</span>
                        <input
                          type="number"
                          step="0.5"
                          value={rankXuatSac}
                          onChange={(e) => setRankXuatSac(Number(e.target.value))}
                          className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg font-mono font-black text-amber-800 dark:text-amber-300 text-center text-sm focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">đ</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40">
                      <input
                        type="text"
                        value={rankXuatSacNote}
                        onChange={(e) => setRankXuatSacNote(e.target.value)}
                        placeholder="Ghi chú thưởng..."
                        title="Ghi chú thưởng cho loại Xuất sắc"
                        className="w-full px-1 py-0.5 text-[10px] bg-white/80 dark:bg-slate-900/70 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300 text-center focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Tốt */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-emerald-900 dark:text-emerald-300 text-xs mb-1">
                        Tốt ⭐
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">Từ</span>
                        <input
                          type="number"
                          step="0.5"
                          value={rankTot}
                          onChange={(e) => setRankTot(Number(e.target.value))}
                          className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg font-mono font-black text-emerald-800 dark:text-emerald-300 text-center text-sm focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">đ</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-emerald-200/60 dark:border-emerald-800/40 text-center">
                      <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        đến &lt; {rankXuatSac}đ
                      </span>
                    </div>
                  </div>

                  {/* Khá */}
                  <div className="p-2.5 rounded-xl bg-blue-50/90 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-blue-900 dark:text-blue-300 text-xs mb-1">
                        Khá 👍
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">Từ</span>
                        <input
                          type="number"
                          step="0.5"
                          value={rankKha}
                          onChange={(e) => setRankKha(Number(e.target.value))}
                          className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg font-mono font-black text-blue-800 dark:text-blue-300 text-center text-sm focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">đ</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-blue-200/60 dark:border-blue-800/40 text-center">
                      <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400">
                        đến &lt; {rankTot}đ
                      </span>
                    </div>
                  </div>

                  {/* Đạt */}
                  <div className="p-2.5 rounded-xl bg-orange-50/90 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-orange-900 dark:text-orange-300 text-xs mb-1">
                        Đạt ✔️
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">Từ</span>
                        <input
                          type="number"
                          step="0.5"
                          value={rankDat}
                          onChange={(e) => setRankDat(Number(e.target.value))}
                          className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-orange-300 dark:border-orange-700 rounded-lg font-mono font-black text-orange-800 dark:text-orange-300 text-center text-sm focus:ring-2 focus:ring-orange-500"
                        />
                        <span className="font-bold text-slate-600 dark:text-slate-300 text-xs">đ</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-orange-200/60 dark:border-orange-800/40 text-center">
                      <span className="text-[10px] font-semibold text-orange-700 dark:text-orange-400">
                        đến &lt; {rankKha}đ
                      </span>
                    </div>
                  </div>

                  {/* Không đạt */}
                  <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-rose-900 dark:text-rose-300 text-xs mb-1">
                        Không đạt ⚠️
                      </div>
                      <div className="flex items-center justify-center gap-1 mt-1 py-1 bg-white/80 dark:bg-slate-900/70 rounded-lg border border-rose-200 dark:border-rose-800/40">
                        <span className="font-black text-rose-700 dark:text-rose-400 font-mono text-sm">&lt; {rankDat}đ</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-rose-200/60 dark:border-rose-800/40">
                      <input
                        type="text"
                        value={rankKhongDatNote}
                        onChange={(e) => setRankKhongDatNote(e.target.value)}
                        placeholder="Ghi chú phạt..."
                        title="Ghi chú hình phạt cho loại Không đạt"
                        className="w-full px-1 py-0.5 text-[10px] bg-white/80 dark:bg-slate-900/70 border border-rose-200 dark:border-rose-800 rounded text-rose-800 dark:text-rose-300 text-center focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Cảnh báo nếu số liệu không hợp lệ */}
                {(rankXuatSac <= rankTot || rankTot <= rankKha || rankKha <= rankDat) && (
                  <div className="p-2 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded-lg text-amber-800 dark:text-amber-200 text-[11px] font-medium flex items-center gap-1.5">
                    <span>⚠️ <strong>Lưu ý:</strong> Ngưỡng điểm phải giảm dần theo thứ tự: Xuất sắc ({rankXuatSac}) &gt; Tốt ({rankTot}) &gt; Khá ({rankKha}) &gt; Đạt ({rankDat}).</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REALTIME PREVIEW CARD */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Xem trước hiển thị thực tế:
            </span>
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white font-bold rounded-lg text-xs">
                    Lớp {className || '---'}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {schoolName || 'Trường THPT'}
                  </span>
                  {grade && <span className="text-slate-400">({grade})</span>}
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Năm học: <strong>{schoolYear || '2026–2027'}</strong>
                  {roomNumber && <span> • Phòng: <strong>{roomNumber}</strong></span>}
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  GVCN: <strong className="text-blue-600 dark:text-blue-400">{homeroomTeacher || 'Chưa đặt tên'}</strong>
                  {teachingSubject && <span> (Môn {teachingSubject})</span>}
                  {teacherPhone && <span> • SĐT: {teacherPhone}</span>}
                </p>
              </div>

              {(classPresident || disciplineVicePresident) && (
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 shrink-0">
                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">Ban cán sự:</p>
                  {classPresident && <p>• Lớp trưởng: {classPresident}</p>}
                  {disciplineVicePresident && <p>• Lớp phó nề nếp: {disciplineVicePresident}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            {saveSuccess ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 text-xs sm:text-sm animate-fadeIn">
                <CheckCircle2 className="h-5 w-5" />
                <span>Đã lưu thành công thông tin GV và Lớp!</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400 hidden sm:inline">
                * Dữ liệu sẽ lập tức được lưu vào máy và đồng bộ Cloud nếu đã đăng nhập.
              </span>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
