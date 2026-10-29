import React, { useState, useRef, useEffect } from 'react';
import {
  Settings,
  HardDrive,
  Cloud,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Save,
  RotateCcw,
  LogIn,
  LogOut,
  ShieldCheck,
  Tag,
  Award,
  Zap,
  PlusCircle,
  Edit2,
  Trash2,
  Power,
  User,
  UserCheck,
  School,
  Phone,
  Mail,
  BookOpen,
  MessageSquare,
  MapPin,
  Users,
  Sliders,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';
import { formatVietnameseDate, formatVietnameseNumber, getRankRangeDescription, DEFAULT_RANK_THRESHOLDS } from '../lib/utils';
import { BehaviorCategory, AchievementBonusRule } from '../types';
import { ClassMonitorManagementCard } from './v2/ClassMonitorManagementCard';
import { defaultWeekOneStart, schoolWeeksFrom } from '../lib/classScope';
import { APP_VERSION, APP_RELEASE_DATE, APP_CODENAME } from '../version';

export const SettingsBackupView: React.FC = () => {
  const {
    currentUser,
    isLocalMode,
    isCloudSyncing,
    cloudSyncError,
    login,
    logout,
    syncLocalToCloud,
    classConfig,
    updateClassConfig,
    students,
    disciplineLogs,
    behaviorCategories,
    updateBehaviorCategory,
    addBehaviorCategory,
    deleteBehaviorCategory,
    toggleBehaviorCategoryActive,
    resetBehaviorCategoriesToDefault,
    updateAchievementRule,
    addAchievementRule,
    deleteAchievementRule,
    resetAchievementRulesToDefault,
    exportFullBackupJson,
    restoreFromJson,
    resetToSampleData,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'class' | 'monitor' | 'violations' | 'achievements' | 'cloud' | 'backup'>('class');

  // Teacher & Class Config Form state
  const [homeroomTeacher, setHomeroomTeacher] = useState(classConfig.homeroomTeacher || '');
  const [teacherPhone, setTeacherPhone] = useState(classConfig.teacherPhone || '');
  const [teacherEmail, setTeacherEmail] = useState(classConfig.teacherEmail || '');
  const [teachingSubject, setTeachingSubject] = useState(classConfig.teachingSubject || '');
  const [defaultTeacherNote, setDefaultTeacherNote] = useState(classConfig.defaultTeacherNote || '');

  const [className, setClassName] = useState(classConfig.className || '');
  const [schoolYear, setSchoolYear] = useState(classConfig.schoolYear || '');
  const [weekOneStart, setWeekOneStart] = useState(classConfig.weeks[0]?.startDate || defaultWeekOneStart(classConfig.schoolYear));
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

  // Ngưỡng điểm xếp loại rèn luyện thi đua (Xuất sắc, Tốt, Khá, Đạt, Chưa đạt)
  const [rankXuatSac, setRankXuatSac] = useState<number>(classConfig.rankThresholds?.xuatSac ?? DEFAULT_RANK_THRESHOLDS.xuatSac);
  const [rankTot, setRankTot] = useState<number>(classConfig.rankThresholds?.tot ?? DEFAULT_RANK_THRESHOLDS.tot);
  const [rankKha, setRankKha] = useState<number>(classConfig.rankThresholds?.kha ?? DEFAULT_RANK_THRESHOLDS.kha);
  const [rankDat, setRankDat] = useState<number>(classConfig.rankThresholds?.dat ?? DEFAULT_RANK_THRESHOLDS.dat);
  const [rankXuatSacNote, setRankXuatSacNote] = useState<string>(classConfig.rankThresholds?.xuatSacNote || DEFAULT_RANK_THRESHOLDS.xuatSacNote || 'Bốc thăm phần thưởng');
  const [rankKhongDatNote, setRankKhongDatNote] = useState<string>(classConfig.rankThresholds?.khongDatNote || DEFAULT_RANK_THRESHOLDS.khongDatNote || 'Bốc thăm hình phạt');

  const [configSaved, setConfigSaved] = useState(false);

  // Sync inputs whenever classConfig changes (e.g. from cloud or backup restore)
  useEffect(() => {
    setHomeroomTeacher(classConfig.homeroomTeacher || '');
    setTeacherPhone(classConfig.teacherPhone || '');
    setTeacherEmail(classConfig.teacherEmail || '');
    setTeachingSubject(classConfig.teachingSubject || '');
    setDefaultTeacherNote(classConfig.defaultTeacherNote || '');

    setClassName(classConfig.className || '');
    setSchoolYear(classConfig.schoolYear || '');
    setWeekOneStart(classConfig.weeks[0]?.startDate || defaultWeekOneStart(classConfig.schoolYear));
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
  }, [classConfig]);

  // Restore file input
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [restoreJsonString, setRestoreJsonString] = useState<string>('');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Quick edit modal for category & achievement rule
  const [editingCat, setEditingCat] = useState<BehaviorCategory | null>(null);
  const [editingAchieve, setEditingAchieve] = useState<AchievementBonusRule | null>(null);

  // Category management & filtering state (Lỗi vi phạm & Thưởng điểm)
  const [catFilterType, setCatFilterType] = useState<'all' | 'deduct' | 'bonus'>('all');
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'deduct' | 'bonus'>('deduct');
  const [newCatDefaultScore, setNewCatDefaultScore] = useState<number>(1);
  const [newCatBasis, setNewCatBasis] = useState('');
  const [newCatKeywords, setNewCatKeywords] = useState('');
  const [catErrors, setCatErrors] = useState<Record<string, string>>({});

  // Achievement Rule management state
  const [isAddAchieveModalOpen, setIsAddAchieveModalOpen] = useState(false);
  const [newAchieveCode, setNewAchieveCode] = useState('');
  const [newAchieveTitle, setNewAchieveTitle] = useState('');
  const [newAchievePeriod, setNewAchievePeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [newAchieveBonusScore, setNewAchieveBonusScore] = useState<number>(2.0);
  const [newAchieveDescription, setNewAchieveDescription] = useState('');
  const [newAchieveIsAuto, setNewAchieveIsAuto] = useState(false);
  const [achieveErrors, setAchieveErrors] = useState<Record<string, string>>({});

  const handleSaveNewCategory = async () => {
    const errors: Record<string, string> = {};
    const trimmedCode = newCatCode.trim().toUpperCase();
    if (!trimmedCode) errors.code = 'Vui lòng nhập mã danh mục (ví dụ: L16, T11)';
    if (!newCatName.trim()) errors.name = 'Vui lòng nhập tên hành vi / quy định';
    if (newCatDefaultScore < 0) errors.score = 'Mức điểm không được âm';

    if (behaviorCategories.some((c) => c.code.toUpperCase() === trimmedCode)) {
      errors.code = `Mã danh mục "${trimmedCode}" đã tồn tại.`;
    }

    if (Object.keys(errors).length > 0) {
      setCatErrors(errors);
      return;
    }

    setCatErrors({});
    const keywords = newCatKeywords
      ? newCatKeywords.split(',').map((k) => k.trim().toLowerCase()).filter(Boolean)
      : [];

    await addBehaviorCategory({
      code: trimmedCode,
      name: newCatName.trim(),
      type: newCatType,
      defaultScore: Number(newCatDefaultScore),
      basisOrRegulation: newCatBasis.trim() || 'Nội quy lớp học & nhà trường',
      keywords,
      isActive: true,
      isCustom: true,
    });

    setNewCatCode('');
    setNewCatName('');
    setNewCatType('deduct');
    setNewCatDefaultScore(1);
    setNewCatBasis('');
    setNewCatKeywords('');
    setIsAddCatModalOpen(false);
  };

  const handleDeleteCategory = async (cat: BehaviorCategory) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục [${cat.code}] "${cat.name}"?`)) return;
    const res = await deleteBehaviorCategory(cat.id);
    if (!res.success) {
      alert(res.message || 'Không thể xóa danh mục này.');
    }
  };

  const handleSaveNewAchievementRule = async () => {
    const errors: Record<string, string> = {};
    const trimmedCode = newAchieveCode.trim().toUpperCase();
    if (!trimmedCode) errors.code = 'Vui lòng nhập mã quy chế (ví dụ: TT_W05, TT_M05)';
    if (!newAchieveTitle.trim()) errors.title = 'Vui lòng nhập tên quy chế khen thưởng';
    if (newAchieveBonusScore <= 0) errors.score = 'Mức điểm thưởng phải lớn hơn 0';

    if (achievementRules.some((r) => r.code.toUpperCase() === trimmedCode)) {
      errors.code = `Mã quy chế "${trimmedCode}" đã tồn tại.`;
    }

    if (Object.keys(errors).length > 0) {
      setAchieveErrors(errors);
      return;
    }

    setAchieveErrors({});
    await addAchievementRule({
      code: trimmedCode,
      title: newAchieveTitle.trim(),
      period: newAchievePeriod,
      bonusScore: Number(newAchieveBonusScore),
      description: newAchieveDescription.trim(),
      isAutoEligible: newAchieveIsAuto,
      isActive: true,
      isCustom: true,
    });

    setNewAchieveCode('');
    setNewAchieveTitle('');
    setNewAchievePeriod('weekly');
    setNewAchieveBonusScore(2.0);
    setNewAchieveDescription('');
    setNewAchieveIsAuto(false);
    setIsAddAchieveModalOpen(false);
  };

  const handleDeleteAchievementRule = async (rule: AchievementBonusRule) => {
    if (!confirm(`Bạn có chắc muốn xóa quy chế thưởng [${rule.code}] "${rule.title}"?`)) return;
    await deleteAchievementRule(rule.id);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) {
      alert('Vui lòng nhập tên lớp học.');
      return;
    }
    if (!homeroomTeacher.trim()) {
      alert('Vui lòng nhập họ tên Giáo viên chủ nhiệm.');
      return;
    }
    if (rankXuatSac <= rankTot || rankTot <= rankKha || rankKha <= rankDat) {
      alert('Ngưỡng điểm xếp loại không hợp lệ! Ngưỡng điểm phải giảm dần theo thứ tự: Xuất sắc (' + rankXuatSac + ') > Tốt (' + rankTot + ') > Khá (' + rankKha + ') > Đạt (' + rankDat + ').');
      return;
    }

    try {
    const weeks = schoolWeeksFrom(weekOneStart, classConfig.weeks.length || 35).map((week, index) => ({ ...week, semester: classConfig.weeks[index]?.semester ?? week.semester }));
    await updateClassConfig({
      ...(weekOneStart !== classConfig.weeks[0]?.startDate ? { weeks } : {}),
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
        xuatSacNote: rankXuatSacNote.trim(),
        khongDatNote: rankKhongDatNote.trim(),
      },
    });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Không thể lưu cài đặt.');
    }
  };

  const handleExportJson = () => {
    let json: string;
    try { json = exportFullBackupJson(); } catch (error) { alert((error as Error).message); return; }
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sao_luu_SoChamDiem_${classConfig.className}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleJsonFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.students || !parsed.disciplineLogs) {
          alert('Tệp sao lưu không đúng định dạng của ứng dụng Sổ Chấm Điểm Hàng Ngày.');
          return;
        }

        setRestoreJsonString(text);
        setRestorePreview({
          exportedAt: parsed.exportedAt,
          className: parsed.classConfig?.className || classConfig.className,
          schoolYear: parsed.classConfig?.schoolYear || classConfig.schoolYear,
          teacher: parsed.classConfig?.homeroomTeacher || classConfig.homeroomTeacher,
          studentCount: parsed.students?.length || 0,
          logCount: parsed.disciplineLogs?.length || 0,
          categoryCount: parsed.behaviorCategories?.length || 0,
        });
      } catch (err: any) {
        alert('Lỗi định dạng tệp JSON: ' + (err.message || String(err)));
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!restoreJsonString) return;
    const res = await restoreFromJson(restoreJsonString);
    if (res.success) {
      alert(`Khôi phục thành công! Đã nạp ${res.studentCount} học sinh và ${res.logCount} bản ghi nhật ký.`);
      setRestorePreview(null);
      setRestoreJsonString('');
    } else {
      alert(res.message);
    }
  };

  const handleConfirmReset = async () => {
    await resetToSampleData();
    setIsResetConfirmOpen(false);
    alert('Đã khôi phục về dữ liệu mẫu chuẩn của lớp 10A8!');
  };

  const achievementRules = classConfig.achievementBonusRules || [];
  const deductCategories = behaviorCategories.filter((c) => c.type === 'deduct');
  const bonusCategories = behaviorCategories.filter((c) => c.type === 'bonus');
  const displayedCategories = behaviorCategories.filter((c) => {
    if (catFilterType === 'deduct') return c.type === 'deduct';
    if (catFilterType === 'bonus') return c.type === 'bonus';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <span>Cài Đặt Hệ Thống & Sao Lưu Dữ Liệu</span>
        </h2>
        <p className="text-xs text-slate-500">
          Cấu hình thông tin lớp học, cài đặt danh mục lỗi, quy chế điểm thưởng tuần/tháng khi có thành tích, đồng bộ Cloud Firestore
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('class')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'class'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Thông Tin GV & Lớp Học</span>
        </button>

        <button
          onClick={() => setActiveTab('monitor')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'monitor'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <UserCheck className="h-4 w-4 text-emerald-500" />
          <span>Tài Khoản Lớp Trưởng</span>
        </button>

        <button
          onClick={() => setActiveTab('violations')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'violations'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Tag className="h-4 w-4" />
          <span>Cài Đặt Danh Mục Lỗi ({deductCategories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('achievements')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'achievements'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Award className="h-4 w-4" />
          <span>Cài Đặt Điểm Thưởng Thành Tích ({achievementRules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'cloud'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <Cloud className="h-4 w-4" />
          <span>Đồng Bộ Cloud Firestore</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'backup'
              ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          <span>Sao Lưu & Khôi Phục</span>
        </button>
      </div>

      {/* TAB 1: THÔNG TIN GV, LỚP HỌC & THANG ĐIỂM */}
      {activeTab === 'class' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 max-w-4xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span>Hồ Sơ Giáo Viên Chủ Nhiệm & Cấu Hình Lớp Học</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các thông tin này sẽ được đồng bộ và thể hiện trên tất cả các phiếu rèn luyện Zalo, báo cáo phụ huynh và sổ điểm.
              </p>
            </div>
            {configSaved && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 animate-fadeIn">
                <CheckCircle2 className="h-4 w-4" /> Đã lưu cài đặt thành công!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-6 text-xs sm:text-sm">
            {/* SECTION 1: TEACHER INFORMATION */}
            <div className="p-4 bg-slate-50 dark:bg-slate-750/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <User className="h-4 w-4" />
                <span>1. Thông Tin Giáo Viên Chủ Nhiệm (GVCN)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Họ và tên GVCN <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={homeroomTeacher}
                      onChange={(e) => setHomeroomTeacher(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn Sang"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Môn giảng dạy chính
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={teachingSubject}
                      onChange={(e) => setTeachingSubject(e.target.value)}
                      placeholder="Ví dụ: Toán học, Ngữ văn..."
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Số điện thoại liên hệ (GVCN)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={teacherPhone}
                      onChange={(e) => setTeacherPhone(e.target.value)}
                      placeholder="Ví dụ: 0912 345 678"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">
                    (Hiển thị ở chân chữ ký tin nhắn gửi phụ huynh học sinh)
                  </span>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Email liên hệ GVCN
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      value={teacherEmail}
                      onChange={(e) => setTeacherEmail(e.target.value)}
                      placeholder="Ví dụ: giaovien@gmail.com"
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Lời dặn dò / Lời nhắn mặc định gửi Phụ huynh
                </label>
                <textarea
                  rows={2}
                  value={defaultTeacherNote}
                  onChange={(e) => setDefaultTeacherNote(e.target.value)}
                  placeholder="Ví dụ: Kính mong Quý Phụ huynh tiếp tục theo dõi, phối hợp cùng nhà trường để động viên các con rèn luyện tốt nhất!"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-normal focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-750/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="block font-semibold" htmlFor="week-one-start">Ngày bắt đầu Tuần 1</label>
              <div className="flex flex-wrap gap-2">
                <input id="week-one-start" required type="date" value={weekOneStart} onChange={event => { setWeekOneStart(event.target.value); setConfigSaved(false); }} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800" />
                <button type="button" onClick={() => { try { setWeekOneStart(defaultWeekOneStart(schoolYear)); setConfigSaved(false); } catch (error) { alert(error instanceof Error ? error.message : String(error)); } }} className="px-3 py-2 rounded-xl border border-blue-300 text-blue-600">Dùng mặc định theo ngày 5/9</button>
              </div>
              <p className="text-xs text-slate-500">Mặc định bắt đầu vào thứ Hai của tuần chứa 5/9. Nếu 5/9 là thứ Sáu, thứ Bảy hoặc Chủ nhật, dùng thứ Hai tuần tiếp theo. Các tuần sau kéo dài 7 ngày.</p>
              <p className="text-xs text-slate-500">Nhấn Lưu cài đặt để áp dụng cho lớp hiện tại. Các điểm đã ghi nhận giữ nguyên số tuần.</p>
            </div>
            {/* SECTION 2: CLASS & SCHOOL INFORMATION */}
            <div className="p-4 bg-slate-50 dark:bg-slate-750/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <School className="h-4 w-4" />
                <span>2. Thông Tin Lớp Học & Nhà Trường</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Tên lớp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Ví dụ: 10A8"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Khối lớp
                  </label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Ví dụ: Khối 10, Khối 11, Khối 12"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Năm học <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolYear}
                    onChange={(e) => setSchoolYear(e.target.value)}
                    placeholder="Ví dụ: 2026–2027"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Tên trường học
                  </label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Ví dụ: Trường THPT Chuyên, THPT Lê Quý Đôn"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Phòng học / Địa điểm
                  </label>
                  <input
                    type="text"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Ví dụ: Phòng 204 (Dãy A)"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Sĩ số học sinh
                  </label>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl font-bold text-slate-800 dark:text-slate-200">
                    {students.filter((s) => s.status === 'active').length} học sinh đang học (Tổng số: {students.length})
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: CLASS CADRES */}
            <div className="p-4 bg-slate-50 dark:bg-slate-750/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Users className="h-4 w-4" />
                <span>3. Ban Cán Sự Lớp</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Lớp trưởng
                  </label>
                  <input
                    type="text"
                    value={classPresident}
                    onChange={(e) => setClassPresident(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Lớp phó học tập
                  </label>
                  <input
                    type="text"
                    value={academicVicePresident}
                    onChange={(e) => setAcademicVicePresident(e.target.value)}
                    placeholder="Ví dụ: Trần Thị Bích"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Lớp phó phụ trách nề nếp / Kỷ luật
                  </label>
                  <input
                    type="text"
                    value={disciplineVicePresident}
                    onChange={(e) => setDisciplineVicePresident(e.target.value)}
                    placeholder="Ví dụ: Lê Hoàng Cường"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Bí thư chi đoàn
                  </label>
                  <input
                    type="text"
                    value={youthUnionSecretary}
                    onChange={(e) => setYouthUnionSecretary(e.target.value)}
                    placeholder="Ví dụ: Phạm Thu Dung"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: SCORING SETTINGS */}
            <div className="p-4 bg-slate-50 dark:bg-slate-750/70 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <Sliders className="h-4 w-4" />
                <span>4. Thang Điểm Thi Đua & Quy Chuẩn Rèn Luyện</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Điểm nền ban đầu</label>
                  <input
                    type="number"
                    step="0.5"
                    value={baseScore}
                    onChange={(e) => setBaseScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Điểm sàn (Thấp nhất)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Điểm trần (Cao nhất)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={maxScore}
                    onChange={(e) => setMaxScore(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {/* KHỐI CÀI ĐẶT 5 MỨC XẾP LOẠI RÈN LUYỆN */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                      Tiêu chuẩn mức điểm Xếp loại Rèn luyện Thi đua (GVCN tùy chỉnh)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRankXuatSac(DEFAULT_RANK_THRESHOLDS.xuatSac);
                      setRankTot(DEFAULT_RANK_THRESHOLDS.tot);
                      setRankKha(DEFAULT_RANK_THRESHOLDS.kha);
                      setRankDat(DEFAULT_RANK_THRESHOLDS.dat);
                      setRankXuatSacNote(DEFAULT_RANK_THRESHOLDS.xuatSacNote || 'Bốc thăm phần thưởng');
                      setRankKhongDatNote(DEFAULT_RANK_THRESHOLDS.khongDatNote || 'Bốc thăm hình phạt');
                    }}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    title="Đặt lại các mức xếp loại về chuẩn 12đ - 8đ - 7đ - 5đ"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Chuẩn mặc định (12 - 8 - 7 - 5)</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                  {/* Xuất sắc */}
                  <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-amber-900 dark:text-amber-300 text-xs mb-1 flex items-center justify-between">
                        <span>Xuất sắc</span>
                        <span>🎁</span>
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
                        title="Ghi chú phần thưởng cho loại Xuất sắc"
                        className="w-full px-1 py-0.5 text-[10px] bg-white/80 dark:bg-slate-900/70 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300 text-center focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Tốt */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-emerald-900 dark:text-emerald-300 text-xs mb-1 flex items-center justify-between">
                        <span>Tốt</span>
                        <span>⭐</span>
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
                      <div className="font-bold text-blue-900 dark:text-blue-300 text-xs mb-1 flex items-center justify-between">
                        <span>Khá</span>
                        <span>👍</span>
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
                      <div className="font-bold text-orange-900 dark:text-orange-300 text-xs mb-1 flex items-center justify-between">
                        <span>Đạt</span>
                        <span>✔️</span>
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

                  {/* Chưa đạt / Không đạt */}
                  <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 flex flex-col justify-between">
                    <div>
                      <div className="font-bold text-rose-900 dark:text-rose-300 text-xs mb-1 flex items-center justify-between">
                        <span>Chưa đạt</span>
                        <span>⚠️</span>
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
                        title="Ghi chú hình phạt cho loại Chưa đạt"
                        className="w-full px-1 py-0.5 text-[10px] bg-white/80 dark:bg-slate-900/70 border border-rose-200 dark:border-rose-800 rounded text-rose-800 dark:text-rose-300 text-center focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Cảnh báo logic */}
                {(rankXuatSac <= rankTot || rankTot <= rankKha || rankKha <= rankDat) && (
                  <div className="p-2.5 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded-xl text-amber-800 dark:text-amber-200 text-xs font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                    <span><strong>Lưu ý:</strong> Ngưỡng điểm phải giảm dần theo thứ tự: Xuất sắc ({rankXuatSac}) &gt; Tốt ({rankTot}) &gt; Khá ({rankKha}) &gt; Đạt ({rankDat}).</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-slate-500 text-xs space-y-1 border border-slate-200 dark:border-slate-700">
                <p>• Điểm rèn luyện = Điểm nền − Điểm trừ + Điểm thưởng (tối thiểu {classConfig.minScore}đ, không giới hạn trần; Xuất sắc {getRankRangeDescription('Xuất sắc', classConfig.rankThresholds)}, Tốt {getRankRangeDescription('Tốt', classConfig.rankThresholds)}, Khá {getRankRangeDescription('Khá', classConfig.rankThresholds)}, Đạt {getRankRangeDescription('Đạt', classConfig.rankThresholds)}, Chưa đạt {getRankRangeDescription('Không đạt', classConfig.rankThresholds)}).</p>
                <p>• Năm học gồm các tháng: Tháng 9 đến Tháng 5 (35 tuần học tiêu chuẩn Bộ GD&ĐT).</p>
              </div>
            </div>

            {/* REALTIME PREVIEW CARD */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 border border-blue-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide block">
                  Xem trước tiêu đề báo cáo:
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white font-bold rounded-lg text-xs">
                    Lớp {className || '---'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {schoolName || 'Trường THPT'}
                  </span>
                  {grade && <span className="text-slate-500">({grade})</span>}
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Năm học: <strong>{schoolYear || '2026–2027'}</strong>
                  {roomNumber && <span> • Phòng: <strong>{roomNumber}</strong></span>}
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  GVCN: <strong className="text-blue-700 dark:text-blue-300">{homeroomTeacher || 'Chưa đặt tên'}</strong>
                  {teachingSubject && <span> (Môn {teachingSubject})</span>}
                  {teacherPhone && <span> • SĐT: {teacherPhone}</span>}
                </p>
              </div>

              {(classPresident || disciplineVicePresident) && (
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-blue-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 shrink-0">
                  <p className="font-bold text-slate-800 dark:text-slate-200 mb-0.5">Ban cán sự:</p>
                  {classPresident && <p>• Lớp trưởng: {classPresident}</p>}
                  {disciplineVicePresident && <p>• Lớp phó nề nếp: {disciplineVicePresident}</p>}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 transition active:scale-95 text-xs sm:text-sm"
              >
                <Save className="h-4 w-4" />
                <span>Lưu thông tin GV & Lớp học</span>
              </button>
            </div>
          </form>

          {/* Cấp Quyền & Quản Lý Tài Khoản Lớp Trưởng Chấm Điểm */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <ClassMonitorManagementCard />
          </div>
        </div>
      )}

      {/* TAB RIÊNG: TÀI KHOẢN LỚP TRƯỞNG CHẤM ĐIỂM */}
      {activeTab === 'monitor' && (
        <div className="max-w-4xl space-y-4">
          <ClassMonitorManagementCard />
        </div>
      )}

      {/* TAB 2: CÀI ĐẶT DANH MỤC LỖI & THƯỞNG ĐIỂM */}
      {activeTab === 'violations' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Tag className="h-4 w-4 text-rose-600" />
                <span>Cài Đặt Danh Mục Lỗi & Thưởng Điểm ({behaviorCategories.length} mục)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Tùy chỉnh mức điểm trừ/thưởng, thêm quy định mới hoặc xóa bớt danh mục không áp dụng
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewCatCode('');
                  setNewCatName('');
                  setNewCatType(catFilterType === 'bonus' ? 'bonus' : 'deduct');
                  setNewCatDefaultScore(catFilterType === 'bonus' ? 2 : 1);
                  setNewCatBasis('');
                  setNewCatKeywords('');
                  setCatErrors({});
                  setIsAddCatModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>+ Thêm danh mục mới</span>
              </button>

              <button
                onClick={async () => {
                  if (confirm('Khôi phục toàn bộ danh mục lỗi và điểm thưởng về mức chuẩn ban đầu?')) {
                    await resetBehaviorCategoriesToDefault();
                    alert('Đã khôi phục danh mục chuẩn thành công!');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-xl border border-amber-200 dark:border-amber-800 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Khôi phục biểu điểm chuẩn</span>
              </button>
            </div>
          </div>

          {/* Sub-filter tabs */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <button
              type="button"
              onClick={() => setCatFilterType('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                catFilterType === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
              }`}
            >
              Tất cả ({behaviorCategories.length})
            </button>
            <button
              type="button"
              onClick={() => setCatFilterType('deduct')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                catFilterType === 'deduct'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
            >
              Lỗi trừ điểm ({deductCategories.length})
            </button>
            <button
              type="button"
              onClick={() => setCatFilterType('bonus')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                catFilterType === 'bonus'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
            >
              Điểm thưởng ({bonusCategories.length})
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {displayedCategories.map((cat) => {
              const isDeduct = cat.type === 'deduct';
              return (
                <div
                  key={cat.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg shrink-0 border ${
                        isDeduct
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60'
                          : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/60'
                      }`}
                    >
                      {cat.code}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white leading-snug">
                          {cat.name}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isDeduct
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {isDeduct ? 'Trừ điểm' : 'Điểm cộng'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Căn cứ: {cat.basisOrRegulation || 'Nội quy trường/lớp'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">{isDeduct ? 'Mức phạt:' : 'Thưởng:'}</span>
                      <span
                        className={`font-mono font-bold text-sm ${
                          isDeduct
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isDeduct ? '-' : '+'}{formatVietnameseNumber(cat.defaultScore)}đ
                      </span>
                    </div>

                    <button
                      onClick={() => toggleBehaviorCategoryActive(cat.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        cat.isActive
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                      title="Bật / Tắt áp dụng mục này"
                    >
                      {cat.isActive ? 'Đang dùng' : 'Tắt'}
                    </button>

                    <button
                      onClick={() => setEditingCat(cat)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition"
                      title="Chỉnh sửa mức điểm hoặc nội dung"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition"
                      title="Xóa danh mục này"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CÀI ĐẶT ĐIỂM THƯỞNG THÀNH TÍCH TUẦN/THÁNG */}
      {activeTab === 'achievements' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-600" />
                <span>Cài Đặt Điểm Thưởng Tuần / Tháng Khi Có Thành Tích ({achievementRules.length} quy chế)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Quy định mức điểm thưởng cộng khi học sinh đi học đầy đủ, nề nếp gương mẫu (0 vi phạm), học sinh tiêu biểu, hoa điểm 10...
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewAchieveCode('');
                  setNewAchieveTitle('');
                  setNewAchievePeriod('weekly');
                  setNewAchieveBonusScore(2.0);
                  setNewAchieveDescription('');
                  setNewAchieveIsAuto(false);
                  setAchieveErrors({});
                  setIsAddAchieveModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>+ Thêm quy chế thưởng mới</span>
              </button>

              <button
                onClick={async () => {
                  if (confirm('Khôi phục quy chế điểm thưởng thành tích về mức mặc định chuẩn?')) {
                    await resetAchievementRulesToDefault();
                    alert('Đã khôi phục quy chế thành tích thành công!');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-xl border border-amber-200 dark:border-amber-800 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Khôi phục quy chế chuẩn</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievementRules.map((rule) => {
              const isWeekly = rule.period === 'weekly';
              return (
                <div
                  key={rule.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-750/50 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {rule.code}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isWeekly
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400'
                          }`}
                        >
                          {isWeekly ? 'Thành tích tuần' : 'Thành tích tháng'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                          +{formatVietnameseNumber(rule.bonusScore)}đ
                        </span>
                      </div>
                    </div>

                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                      {rule.title}
                    </h4>

                    {rule.description && (
                      <p className="text-[11px] text-slate-500">{rule.description}</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400">
                      {rule.isAutoEligible ? '⚡ Xét thưởng tự động' : '🎖️ Bình chọn'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() =>
                          updateAchievementRule(rule.id, { isActive: !rule.isActive })
                        }
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          rule.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {rule.isActive ? 'Áp dụng' : 'Tắt'}
                      </button>

                      <button
                        onClick={() => setEditingAchieve(rule)}
                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded transition"
                        title="Sửa quy chế"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteAchievementRule(rule)}
                        className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 rounded transition"
                        title="Xóa quy chế thưởng này"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: ĐỒNG BỘ CLOUD FIRESTORE */}
      {activeTab === 'cloud' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 max-w-3xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Cloud className="h-4 w-4 text-blue-600" />
              <span>Đồng Bộ Dữ Liệu & Tài Khoản Google</span>
            </h3>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-750 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                  Trạng thái cơ sở dữ liệu:
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Đã kết nối trực tuyến với CSDL Cloud Firestore (ai-studio-0e7af025-7ec9-4c49-b559-221e9a34f8ff)
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>CSDL Cloud Trực Tuyến</span>
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  <Cloud className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {currentUser?.displayName || 'Cơ sở dữ liệu trường học trực tuyến'}
                  </p>
                  <p className="text-slate-400 text-[10px]">
                    {currentUser?.email || 'Mọi thao tác chấm điểm & quản lý học sinh đều lưu trực tiếp lên Cloud'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={syncLocalToCloud}
                  disabled={isCloudSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-xs transition cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                  <span>{isCloudSyncing ? 'Đang đồng bộ...' : 'Đồng bộ CSDL ngay'}</span>
                </button>
                {currentUser ? (
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                ) : (
                  <button
                    onClick={() => login()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition cursor-pointer"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Đăng nhập Google</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SAO LƯU & KHÔI PHỤC */}
      {activeTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Download className="h-4 w-4 text-emerald-600" />
              <span>Xuất Tệp Sao Lưu (.JSON)</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tải toàn bộ danh sách {students.length} học sinh, {disciplineLogs.length} bản ghi nhật ký, danh mục lỗi và quy chế điểm thưởng thành tích về máy tính an toàn.
            </p>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Tải tệp sao lưu toàn bộ dữ liệu</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-600" />
              <span>Khôi Phục Từ Tệp Sao Lưu (.JSON)</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Phục hồi dữ liệu từ bản sao lưu trước đó. Dữ liệu nạp vào sẽ đồng bộ lên đám mây nếu bạn đang đăng nhập.
            </p>
            <input
              type="file"
              accept=".json"
              ref={jsonFileInputRef}
              onChange={handleJsonFileSelected}
              className="hidden"
            />
            <button
              onClick={() => jsonFileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Upload className="h-4 w-4" />
              <span>Chọn tệp sao lưu JSON để nạp</span>
            </button>
          </div>

          {/* Mobile App Installation Card */}
          <div className="md:col-span-2 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 dark:from-slate-800 dark:via-purple-950/30 dark:to-slate-800 p-5 rounded-2xl border border-purple-200 dark:border-purple-800/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/30">
                <Smartphone className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Cài Đặt Sổ Nề Nếp Thành Mobile App (iOS / Android)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-200 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                    PWA Chuẩn
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                  Ứng dụng đã hỗ trợ công nghệ Progressive Web App (PWA). Giáo viên có thể cài trực tiếp lên màn hình điện thoại iPhone (Safari) hoặc Android (Chrome/Cốc Cốc) để mở nhanh như ứng dụng gốc, lưu ngoại tuyến và đồng bộ tự động với CSDL Cloud.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <PWAInstallButton />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SỬA MỨC ĐIỂM LỖI HOẶC THƯỞNG */}
      {editingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-600" />
              <span>
                {editingCat.type === 'deduct' ? `Sửa Mức Phạt Lỗi: [${editingCat.code}]` : `Sửa Mức Điểm Thưởng: [${editingCat.code}]`}
              </span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Nội dung hành vi / quy định</label>
                <textarea
                  rows={2}
                  value={editingCat.name}
                  onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  {editingCat.type === 'deduct' ? 'Mức điểm trừ mỗi lần *' : 'Mức điểm thưởng cộng mỗi lần *'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={editingCat.defaultScore}
                  onChange={(e) => setEditingCat({ ...editingCat, defaultScore: Number(e.target.value) })}
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-base ${
                    editingCat.type === 'deduct' ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Căn cứ quy định / Nội quy</label>
                <input
                  type="text"
                  value={editingCat.basisOrRegulation || ''}
                  onChange={(e) => setEditingCat({ ...editingCat, basisOrRegulation: e.target.value })}
                  placeholder="Ví dụ: Nội quy lớp học, Quy định chuyên cần..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setEditingCat(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await updateBehaviorCategory(editingCat.id, {
                    name: editingCat.name,
                    defaultScore: editingCat.defaultScore,
                    basisOrRegulation: editingCat.basisOrRegulation,
                  });
                  setEditingCat(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SỬA ĐIỂM THƯỞNG THÀNH TÍCH */}
      {editingAchieve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              <span>Sửa Điểm Thưởng: [{editingAchieve.code}]</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Tên thành tích</label>
                <input
                  type="text"
                  value={editingAchieve.title}
                  onChange={(e) => setEditingAchieve({ ...editingAchieve, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Mức điểm thưởng cộng *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={editingAchieve.bonusScore}
                  onChange={(e) => setEditingAchieve({ ...editingAchieve, bonusScore: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-emerald-600 text-base"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Mô tả tiêu chí</label>
                <textarea
                  rows={2}
                  value={editingAchieve.description || ''}
                  onChange={(e) => setEditingAchieve({ ...editingAchieve, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setEditingAchieve(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  await updateAchievementRule(editingAchieve.id, {
                    title: editingAchieve.title,
                    bonusScore: editingAchieve.bonusScore,
                    description: editingAchieve.description,
                  });
                  setEditingAchieve(null);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM DANH MỤC LỖI / THƯỞNG MỚI */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-emerald-600" />
              <span>Thêm Danh Mục {newCatType === 'deduct' ? 'Lỗi Trừ Điểm' : 'Điểm Thưởng'} Mới</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Loại danh mục *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewCatType('deduct');
                      if (!newCatCode || newCatCode.startsWith('T')) {
                        const maxDeduct = behaviorCategories
                          .filter((c) => c.code.startsWith('L'))
                          .map((c) => parseInt(c.code.slice(1), 10))
                          .filter((n) => !isNaN(n));
                        const nextNum = maxDeduct.length > 0 ? Math.max(...maxDeduct) + 1 : 16;
                        setNewCatCode(`L${nextNum < 10 ? '0' + nextNum : nextNum}`);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition ${
                      newCatType === 'deduct'
                        ? 'bg-rose-50 border-rose-400 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-750 dark:border-slate-700'
                    }`}
                  >
                    🔴 Lỗi trừ điểm
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewCatType('bonus');
                      if (!newCatCode || newCatCode.startsWith('L')) {
                        const maxBonus = behaviorCategories
                          .filter((c) => c.code.startsWith('T'))
                          .map((c) => parseInt(c.code.slice(1), 10))
                          .filter((n) => !isNaN(n));
                        const nextNum = maxBonus.length > 0 ? Math.max(...maxBonus) + 1 : 11;
                        setNewCatCode(`T${nextNum < 10 ? '0' + nextNum : nextNum}`);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition ${
                      newCatType === 'bonus'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-750 dark:border-slate-700'
                    }`}
                  >
                    🟢 Điểm thưởng / Việc tốt
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Mã danh mục * (ví dụ: L16, T11)</label>
                <input
                  type="text"
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: L16, T11"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
                {catErrors.code && <p className="text-rose-500 text-[11px] mt-0.5">{catErrors.code}</p>}
              </div>

              <div>
                <label className="block font-semibold mb-1">Tên hành vi / Quy định *</label>
                <textarea
                  rows={2}
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ví dụ: Không tham gia sinh hoạt dưới cờ, Giúp đỡ bạn vượt khó..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
                {catErrors.name && <p className="text-rose-500 text-[11px] mt-0.5">{catErrors.name}</p>}
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  {newCatType === 'deduct' ? 'Mức điểm trừ mỗi lần *' : 'Mức điểm thưởng mỗi lần *'}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={newCatDefaultScore}
                  onChange={(e) => setNewCatDefaultScore(Number(e.target.value))}
                  className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-base ${
                    newCatType === 'deduct' ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                />
                {catErrors.score && <p className="text-rose-500 text-[11px] mt-0.5">{catErrors.score}</p>}
              </div>

              <div>
                <label className="block font-semibold mb-1">Căn cứ quy định / Nội quy</label>
                <input
                  type="text"
                  value={newCatBasis}
                  onChange={(e) => setNewCatBasis(e.target.value)}
                  placeholder="Ví dụ: Nội quy lớp học 10A8, Quy chế Đoàn trường..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Từ khóa tìm kiếm nhanh (phân tách dấu phẩy)</label>
                <input
                  type="text"
                  value={newCatKeywords}
                  onChange={(e) => setNewCatKeywords(e.target.value)}
                  placeholder="Ví dụ: sinh hoat, khong tap trung, giup do..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddCatModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveNewCategory}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                + Tạo danh mục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM QUY CHẾ THƯỞNG THÀNH TÍCH MỚI */}
      {isAddAchieveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-600" />
              <span>Thêm Quy Chế Khen Thưởng Thành Tích Mới</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Kỳ khen thưởng *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewAchievePeriod('weekly');
                      if (!newAchieveCode || newAchieveCode.includes('M')) {
                        const count = achievementRules.filter((r) => r.period === 'weekly').length + 1;
                        setNewAchieveCode(`TT_W0${count}`);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition ${
                      newAchievePeriod === 'weekly'
                        ? 'bg-blue-50 border-blue-400 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-750 dark:border-slate-700'
                    }`}
                  >
                    Thành tích tuần
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewAchievePeriod('monthly');
                      if (!newAchieveCode || newAchieveCode.includes('W')) {
                        const count = achievementRules.filter((r) => r.period === 'monthly').length + 1;
                        setNewAchieveCode(`TT_M0${count}`);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border text-center transition ${
                      newAchievePeriod === 'monthly'
                        ? 'bg-purple-50 border-purple-400 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-750 dark:border-slate-700'
                    }`}
                  >
                    Thành tích tháng
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Mã quy chế * (ví dụ: TT_W05, TT_M05)</label>
                <input
                  type="text"
                  value={newAchieveCode}
                  onChange={(e) => setNewAchieveCode(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: TT_W05"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                />
                {achieveErrors.code && <p className="text-rose-500 text-[11px] mt-0.5">{achieveErrors.code}</p>}
              </div>

              <div>
                <label className="block font-semibold mb-1">Tên quy chế khen thưởng *</label>
                <input
                  type="text"
                  value={newAchieveTitle}
                  onChange={(e) => setNewAchieveTitle(e.target.value)}
                  placeholder="Ví dụ: Học sinh tiến bộ vượt bậc tuần, Đoạt giải năng khiếu..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
                {achieveErrors.title && <p className="text-rose-500 text-[11px] mt-0.5">{achieveErrors.title}</p>}
              </div>

              <div>
                <label className="block font-semibold mb-1">Mức điểm thưởng cộng (mặc định: 2đ) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={newAchieveBonusScore}
                  onChange={(e) => setNewAchieveBonusScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono text-emerald-600 text-base"
                />
                {achieveErrors.score && <p className="text-rose-500 text-[11px] mt-0.5">{achieveErrors.score}</p>}
              </div>

              <div>
                <label className="block font-semibold mb-1">Mô tả tiêu chí</label>
                <textarea
                  rows={2}
                  value={newAchieveDescription}
                  onChange={(e) => setNewAchieveDescription(e.target.value)}
                  placeholder="Tiêu chí để học sinh được nhận mức thưởng này..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAchieveIsAuto}
                    onChange={(e) => setNewAchieveIsAuto(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    ⚡ Tự động xét thưởng khi học sinh đủ điều kiện
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddAchieveModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveNewAchievementRule}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                + Tạo quy chế thưởng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thông tin phiên bản hệ thống */}
      <div className="max-w-4xl p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Hệ thống Sổ chấm điểm & Trợ lý GVCN
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold font-mono">
            v{APP_VERSION}
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Phát hành: <strong className="text-slate-700 dark:text-slate-300">{APP_RELEASE_DATE}</strong></span>
          <span>•</span>
          <span>Bản dựng: <strong className="text-slate-700 dark:text-slate-300">{APP_CODENAME}</strong></span>
          <span>•</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Trực tuyến (Online)</span>
        </div>
      </div>
    </div>
  );
};
