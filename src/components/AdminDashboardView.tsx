import React, { useState } from 'react';
import { currentSchoolYear } from '../lib/classScope';
import { defaultWeekOneStart } from '../lib/classScope';
import {
  ShieldCheck,
  Users,
  Award,
  AlertTriangle,
  Lock,
  Unlock,
  KeyRound,
  UserPlus,
  Building2,
  Calendar,
  CheckCircle2,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  HardDrive,
  Download,
  Check,
  UserCheck,
  UserX,
  FileSpreadsheet,
  X,
  PlusCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserAccount, SchoolClass, UserRole } from '../types';
import { TabType } from './Navbar';
import { PeriodLockManagerV2 } from './v2/PeriodLockManagerV2';

interface AdminDashboardViewProps {
  onNavigateTab: (tab: TabType) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigateTab }) => {
  const {
    activeAccount,
    userAccounts,
    schoolClasses,
    lockedPeriods,
    toggleLockPeriod,
    isPeriodLocked,
    enterInspectorMode,
    updateUserAccount,
    resetUserPassword,
    toggleUserAccountStatus,
    deleteUserAccount,
    addUserAccount,
    exportFullBackupJson,
    deleteSchoolClass,
    purgeOrphanedClasses,
    createWorkspaceClass,
  } = useApp();

  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'ranking' | 'teachers' | 'locking' | 'system'>('ranking');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);
  const [classFeedback, setClassFeedback] = useState<string | null>(null);

  // Add class modal state
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassForm, setNewClassForm] = useState({
    className: '',
    department: 'Khoa Điện - Điện tử',
    schoolYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    teacherId: '',
  });

  // Password reset modal state
  const [resetModalInfo, setResetModalInfo] = useState<{ open: boolean; userName: string; tempPass: string }>({
    open: false,
    userName: '',
    tempPass: '',
  });

  // Add new teacher modal state
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [newTeacherForm, setNewTeacherForm] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'teacher' as UserRole,
    assignedClassId: '10A8',
    assignedClassName: 'Lớp 10A8 (Điện CN)',
    department: 'Khoa Điện - Điện tử',
    phone: '',
    isActive: true,
  });

  // Filtered teachers
  const filteredTeachers = userAccounts.filter((acc) => {
    const q = teacherSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      acc.displayName.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      acc.assignedClassName.toLowerCase().includes(q) ||
      (acc.department && acc.department.toLowerCase().includes(q))
    );
  });

  // Aggregate stats across all school classes
  const totalStudents = schoolClasses.reduce((acc, c) => acc + c.studentCount, 0);
  const totalViolations = schoolClasses.reduce((acc, c) => acc + c.violationCount, 0);
  const totalTopRank = schoolClasses.reduce((acc, c) => acc + c.topRankCount, 0);
  const overallAvgScore =
    schoolClasses.length > 0
      ? (schoolClasses.reduce((acc, c) => acc + c.averageScore, 0) / schoolClasses.length).toFixed(1)
      : '9.2';
  const topRate = totalStudents > 0 ? Math.round((totalTopRank / totalStudents) * 100) : 85;

  const handleResetPassword = async (acc: UserAccount) => {
    let res;
    try { res = await resetUserPassword(acc.uid); } catch (error: any) { alert(error.message); return; }
    setResetModalInfo({
      open: true,
      userName: acc.displayName,
      tempPass: res.tempPass,
    });
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacherForm.displayName || !newTeacherForm.email) {
      alert('Vui lòng nhập đầy đủ họ tên và email giáo viên');
      return;
    }
    try { await addUserAccount(newTeacherForm); } catch (error: any) { alert(error.message); return; }
    setIsAddTeacherModalOpen(false);
    setNewTeacherForm({
      displayName: '',
      email: '',
      password: '',
      role: 'teacher',
      assignedClassId: '10A8',
      assignedClassName: 'Lớp 10A8 (Điện CN)',
      department: 'Khoa Điện - Điện tử',
      phone: '',
      isActive: true,
    });
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassForm.className.trim()) return;

    const assignedTeacher = userAccounts.find(user => user.uid === newClassForm.teacherId);
    try {
      await createWorkspaceClass(newClassForm.className, newClassForm.schoolYear, defaultWeekOneStart(newClassForm.schoolYear), assignedTeacher?.uid);
    } catch (error) { setClassFeedback('Không tạo được lớp: ' + String(error)); return; }
    const createdName = newClassForm.className;
    setIsAddClassModalOpen(false);
    setNewClassForm({
      className: '',
      department: 'Khoa Điện - Điện tử',
      schoolYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      teacherId: '',
    });
    setClassFeedback(
      `Đã tạo thành công lớp "${createdName}"${
        assignedTeacher ? ` và phân công cho ${assignedTeacher.displayName}` : ''
      }!`
    );
    setTimeout(() => setClassFeedback(null), 4000);
  };

  const handleInspectClass = (cls: SchoolClass) => {
    enterInspectorMode(cls);
    onNavigateTab('daily-log');
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportFullBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sao_luu_toan_truong_CDNghe01_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Bảng Điều Hành Quản Trị Hệ Thống (Admin Panel)
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Cấp độ 3: Quản Trị Viên
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ban Giám Hiệu & Phòng Đào tạo - Quản lý HSSV • Trường Cao đẳng Nghề 01 - BQP
              </p>
            </div>
          </div>

          {/* Sub tabs selector */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 p-1.5 rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveAdminSubTab('ranking')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeAdminSubTab === 'ranking'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🏫 Lớp học ({schoolClasses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminSubTab('teachers')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeAdminSubTab === 'teachers'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              👥 Người dùng & Phân công ({userAccounts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminSubTab('locking')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeAdminSubTab === 'locking'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🔒 Khóa sổ thi đua
            </button>
            <button
              type="button"
              onClick={() => setActiveAdminSubTab('system')}
              className={`px-3 py-1.5 rounded-xl transition ${
                activeAdminSubTab === 'system'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              ⚙️ Hệ thống & Sao lưu
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tổng HSSV toàn trường</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {totalStudents} <span className="text-xs font-normal text-slate-400 font-sans">học viên</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Đang quản lý trên {schoolClasses.length} lớp chuyên ngành
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Điểm TB rèn luyện</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {overallAvgScore} <span className="text-xs font-normal text-slate-400 font-sans">/ 10đ</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Đạt chuẩn kỷ luật quân sự
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Tỷ lệ rèn luyện Tốt</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            {topRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalTopRank}/{totalStudents} học sinh xếp loại Tốt & Xuất sắc
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Số vụ vi phạm nề nếp</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1 font-mono">
            {totalViolations} <span className="text-xs font-normal text-slate-400 font-sans">lượt</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Chủ yếu: Tác phong xưởng & đi muộn
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: THI ĐUA TOÀN TRƯỜNG & BẢNG XẾP HẠNG */}
      {activeAdminSubTab === 'ranking' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  <span>Bảng Xếp Hạng Thi Đua Nề Nếp Các Lớp (Toàn Trường)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Được tổng hợp tự động từ kết quả chấm điểm rèn luyện hàng ngày của từng giáo viên chủ nhiệm
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Tạo lớp học mới trong trường và phân công giáo viên chủ nhiệm"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>+ Tạo Lớp Mới</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    let count: number;
                    try { count = await purgeOrphanedClasses(); }
                    catch (error) { setClassFeedback('Không dọn được lớp: ' + String(error)); return; }
                    if (count > 0) {
                      setClassFeedback(`Đã dọn dẹp và xóa bỏ ${count} lớp học không có giáo viên chủ nhiệm!`);
                    } else {
                      setClassFeedback('Tất cả các lớp hiện tại đều đã gắn liền hợp lệ với GVCN.');
                    }
                    setTimeout(() => setClassFeedback(null), 4000);
                  }}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Tự động kiểm tra và xóa bỏ các lớp không có GVCN trong mục Tài khoản & Phân quyền"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                  <span className="hidden sm:inline">Dọn dẹp lớp không có GVCN</span>
                  <span className="sm:hidden">Dọn dẹp</span>
                </button>

                <div className="text-xs font-semibold text-slate-500 hidden md:block">
                  Năm học: {currentSchoolYear()}
                </div>
              </div>
            </div>

            {/* Notification feedback banner for classes */}
            {classFeedback && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold">{classFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setClassFeedback(null)}
                  className="text-emerald-500 hover:text-emerald-700 text-xs font-bold px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-600 dark:text-slate-400 font-bold uppercase">
                    <th className="py-3 px-3">Hạng</th>
                    <th className="py-3 px-3">Lớp Chuyên Ngành</th>
                    <th className="py-3 px-3">Khoa / Bộ Môn</th>
                    <th className="py-3 px-3">Giáo Viên Chủ Nhiệm</th>
                    <th className="py-3 px-3 text-center">Quân Số</th>
                    <th className="py-3 px-3 text-center">Điểm TB</th>
                    <th className="py-3 px-3 text-center">Lỗi Vi Phạm</th>
                    <th className="py-3 px-3 text-center">Tỷ Lệ Tốt</th>
                    <th className="py-3 px-3 text-right">Thao Tác Quản Lý & Thanh Tra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {schoolClasses
                    .slice()
                    .sort((a, b) => b.averageScore - a.averageScore)
                    .map((cls, idx) => (
                      <tr key={cls.id} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                        <td className="py-3 px-3 font-bold font-mono">
                          {idx === 0 && <span className="text-amber-500 font-black">🥇 #1</span>}
                          {idx === 1 && <span className="text-slate-400 font-black">🥈 #2</span>}
                          {idx === 2 && <span className="text-amber-700 font-black">🥉 #3</span>}
                          {idx > 2 && <span className="text-slate-500">#{idx + 1}</span>}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {cls.className}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {cls.department}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {cls.teacherName}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-semibold">
                          {cls.studentCount}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                          {cls.averageScore}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-rose-600 font-semibold">
                          {cls.violationCount}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-emerald-600 font-bold">
                          {cls.studentCount > 0
                            ? `${Math.round((cls.topRankCount / cls.studentCount) * 100)}%`
                            : '—'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {confirmDeleteClassId === cls.id ? (
                            <div className="flex items-center justify-end gap-1.5 animate-in fade-in duration-150">
                              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap mr-0.5">
                                Xóa lớp này?
                              </span>
                              <button
                                type="button"
                                onClick={async () => {
                                  try { await deleteSchoolClass(cls.id); }
                                  catch (error) { setClassFeedback('Không xóa được lớp: ' + String(error)); return; }
                                  setConfirmDeleteClassId(null);
                                  setClassFeedback(`Đã xóa thành công lớp "${cls.className}" khỏi hệ thống.`);
                                  setTimeout(() => setClassFeedback(null), 4000);
                                }}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                                title="Xác nhận xóa vĩnh viễn lớp này"
                              >
                                <Trash2 className="h-3 w-3" />
                                <span>Xóa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteClassId(null)}
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-lg transition active:scale-95 cursor-pointer"
                                title="Hủy thao tác"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleInspectClass(cls)}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-semibold rounded-lg border border-purple-200 dark:border-purple-800 transition flex items-center gap-1 cursor-pointer"
                                title="Vào xem chi tiết sổ chấm điểm của lớp này ở Chế độ Thanh tra"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Kiểm tra</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setConfirmDeleteClassId(cls.id)}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title={`Xóa lớp ${cls.className}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key discipline insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span>Top Vi Phạm Kỷ Luật Phổ Biến Toàn Trường</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>1. Không mang đầy đủ trang phục bảo hộ xưởng thực hành</span>
                    <span className="text-rose-600 font-mono">9 lượt (45%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>2. Đi học muộn sau giờ hiệu lệnh báo thức / tập trung</span>
                    <span className="text-amber-600 font-mono">6 lượt (30%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '30%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>3. Không đeo thẻ học sinh / sai quy cách tác phong quân sự</span>
                    <span className="text-blue-600 font-mono">5 lượt (25%)</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Biện Pháp Chấn Chỉnh Nề Nếp Của Ban Giám Hiệu</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5" />
                  <span><strong>Đội Sao đỏ & Trực tuần:</strong> Tăng cường kiểm tra tại cổng trường và trước giờ vào xưởng lúc 07h00 và 13h15.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5" />
                  <span><strong>An toàn lao động xưởng:</strong> Giáo viên hướng dẫn thực hành cương quyết không cho học viên vào xưởng nếu thiếu bảo hộ.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5" />
                  <span><strong>Liên lạc gia đình:</strong> Yêu cầu GVCN dùng công cụ soạn tin Zalo tự động để thông báo ngay các lỗi đi muộn trong ngày.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: QUẢN LÝ TÀI KHOẢN GIÁO VIÊN & PHÂN QUYỀN */}
      {activeAdminSubTab === 'teachers' && (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span>Danh Sách Tài Khoản Giáo Viên & Quản Trị Viên ({userAccounts.length})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cấp quyền Quản trị / Giáo viên, phân công lớp chủ nhiệm, cấp lại mật khẩu và khóa tài khoản
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm giáo viên..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsAddTeacherModalOpen(true)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Thêm Giáo Viên</span>
              </button>
            </div>
          </div>

          {/* Inline feedback banner when an account is deleted */}
          {deleteFeedback && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="font-semibold">{deleteFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setDeleteFeedback(null)}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-600 dark:text-slate-400 font-bold uppercase">
                  <th className="py-2.5 px-3">Họ và Tên</th>
                  <th className="py-2.5 px-3">Email / Tài khoản</th>
                  <th className="py-2.5 px-3">Khoa / Bộ Môn</th>
                  <th className="py-2.5 px-3">Lớp Phụ Trách</th>
                  <th className="py-2.5 px-3 text-center">Vai Trò (Role)</th>
                  <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                  <th className="py-2.5 px-3 text-center">Đăng Nhập Cuối</th>
                  <th className="py-2.5 px-3 text-right">Thao Tác Quản Trị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredTeachers.map((acc) => (
                  <tr key={acc.uid} className="hover:bg-slate-50 dark:hover:bg-slate-750/50 transition">
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                      {acc.displayName}
                    </td>
                    <td className="py-3 px-3 font-mono text-xs">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{acc.email}</div>
                      <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                        Mật khẩu: <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">{'Được quản lý bởi Firebase Authentication'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {acc.department || 'Chưa cập nhật'}
                    </td>
                    <td className="py-3 px-3 font-semibold text-blue-600 dark:text-blue-400">
                      {acc.assignedClassName}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          updateUserAccount(acc.uid, {
                            role: acc.role === 'admin' ? 'teacher' : 'admin',
                          })
                        }
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] transition ${
                          acc.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}
                        title="Bấm để chuyển đổi vai trò Admin <-> Giáo viên"
                      >
                        {acc.role === 'admin' ? 'Quản Trị Viên' : 'Giáo Viên'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          acc.isActive
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {acc.isActive ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {acc.lastLoginAt || 'Chưa đăng nhập'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {confirmDeleteId === acc.uid ? (
                        <div className="flex items-center justify-end gap-1.5 animate-in fade-in duration-150">
                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap mr-0.5">
                            Xóa vĩnh viễn?
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              deleteUserAccount(acc.uid);
                              setConfirmDeleteId(null);
                              setDeleteFeedback(`Đã xóa thành công tài khoản "${acc.displayName}" (${acc.assignedClassName})`);
                              setTimeout(() => setDeleteFeedback(null), 4000);
                            }}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                            title="Xác nhận xóa tài khoản"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Xóa</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-[11px] font-medium rounded-lg transition active:scale-95 cursor-pointer"
                            title="Hủy thao tác"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleResetPassword(acc)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-amber-600 transition cursor-pointer"
                            title="Cấp lại mật khẩu tạm thời cho giáo viên"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleUserAccountStatus(acc.uid)}
                            className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition cursor-pointer ${
                              acc.isActive
                                ? 'text-slate-500 hover:text-rose-600'
                                : 'text-slate-500 hover:text-emerald-600'
                            }`}
                            title={acc.isActive ? 'Khóa tài khoản này' : 'Mở khóa tài khoản'}
                          >
                            {acc.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(acc.uid)}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Xóa tài khoản này"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: KHÓA SỔ THI ĐUA ĐỊNH KỲ V2 & BÁO CÁO LƯU VẾT KIỂM TOÁN */}
      {activeAdminSubTab === 'locking' && (
        <PeriodLockManagerV2 />
      )}

      {/* SUB-TAB 4: HẠ TẦNG CSDL & SAO LƯU TOÀN TRƯỜNG */}
      {activeAdminSubTab === 'system' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-blue-600" />
              <span>Hạ Tầng CSDL Đám Mây & Sao Lưu Toàn Trường</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300">Thông tin Cloud Firestore:</span>
                <div className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                  <div>• Database ID: <strong className="text-purple-600 dark:text-purple-400">ai-studio-0e7af025-7ec9-4c49-b559-221e9a34f8ff</strong></div>
                  <div>• Project ID: <strong className="text-slate-800 dark:text-slate-200">core-grid-bsmzh</strong></div>
                  <div>• Bảo Mật: Firestore Rules RBAC per-teacher isolation</div>
                  <div>• Trạng thái: <span className="text-emerald-600 font-bold">Đã kích hoạt & sẵn sàng</span></div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-3">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">Sao lưu dữ liệu dự phòng toàn trường:</span>
                  <p className="text-slate-500 mt-1">
                    Xuất file JSON chứa toàn bộ danh sách HSSV, nhật ký chấm điểm và tiêu chí thi đua của các lớp để lưu trữ cục bộ an toàn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Tải Bản Sao Lưu JSON Toàn Trường</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET PASSWORD SUCCESS */}
      {resetModalInfo.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center mx-auto">
              <KeyRound className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Cấp Lại Mật Khẩu Thành Công!
              </h4>
              <p className="text-xs text-slate-500">
                Đặt lại mật khẩu cho thầy/cô <strong>{resetModalInfo.userName}</strong>:
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center">
              <span className="font-mono text-xl font-bold text-purple-600 dark:text-purple-400 tracking-wider">
                {resetModalInfo.tempPass}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Giáo viên mở email và làm theo hướng dẫn để đặt mật khẩu mới.
            </p>

            <button
              type="button"
              onClick={() => setResetModalInfo({ open: false, userName: '', tempPass: '' })}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD TEACHER */}
      {isAddTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-purple-600" />
              <span>Thêm Tài Khoản Giáo Viên / Quản Trị</span>
            </h4>

            <form onSubmit={handleCreateTeacher} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Họ và tên giáo viên:
                </label>
                <input
                  type="text"
                  placeholder="vd: Thầy Phạm Quang Hùng"
                  value={newTeacherForm.displayName}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email / Tên đăng nhập:
                </label>
                <input
                  type="email"
                  placeholder="vd: hung.pham@cdnghe01bqp.edu.vn"
                  value={newTeacherForm.email}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mật khẩu đăng nhập ban đầu:
                </label>
                <input
                  type="text"
                  placeholder="Nhập mật khẩu ít nhất 6 ký tự"
                  value={newTeacherForm.password}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Giáo viên sẽ sử dụng Email và mật khẩu này để đăng nhập vào hệ thống.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Khoa / Bộ môn:
                  </label>
                  <input
                    type="text"
                    value={newTeacherForm.department}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Lớp phụ trách:
                  </label>
                  <select
                    value={newTeacherForm.assignedClassId}
                    onChange={(e) => {
                      const selectedClass = schoolClasses.find((c) => c.id === e.target.value);
                      setNewTeacherForm({
                        ...newTeacherForm,
                        assignedClassId: e.target.value,
                        assignedClassName: selectedClass ? selectedClass.className : e.target.value,
                        department: selectedClass ? selectedClass.department : newTeacherForm.department,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    {schoolClasses.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.className} ({cls.department})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vai trò & Quyền hạn:
                </label>
                <select
                  value={newTeacherForm.role}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="teacher">👨‍🏫 Giáo viên chủ nhiệm (Teacher)</option>
                  <option value="admin">🛡 Ban Giám Hiệu & QLHSSV (Admin)</option>
                  <option value="owner">👑 Chủ hệ thống (Owner)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition cursor-pointer"
                >
                  Tạo tài khoản & Phân công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CLASS */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-600" />
                <span>Tạo Lớp Học Mới</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên lớp chuyên ngành:
                </label>
                <input
                  type="text"
                  placeholder="vd: Lớp 10A1, May K46, Hàn K46"
                  value={newClassForm.className}
                  onChange={(e) => setNewClassForm({ ...newClassForm, className: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Khoa / Bộ môn:
                  </label>
                  <input
                    type="text"
                    value={newClassForm.department}
                    onChange={(e) => setNewClassForm({ ...newClassForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Niên khóa:
                  </label>
                  <input
                    type="text"
                    value={newClassForm.schoolYear}
                    onChange={(e) => setNewClassForm({ ...newClassForm, schoolYear: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phân công GVCN phụ trách:
                </label>
                <select
                  value={newClassForm.teacherId}
                  onChange={(e) => setNewClassForm({ ...newClassForm, teacherId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <option value="">-- Chọn giáo viên từ danh sách tài khoản --</option>
                  {userAccounts.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName} ({u.email || u.username})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Lớp sẽ được gắn liền với tài khoản của GVCN này. Khi GVCN đăng nhập, hệ thống tự động mở lớp.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
                >
                  Tạo Lớp & Phân Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
