import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  PlusCircle,
  Cloud,
  RefreshCw,
  ChevronDown,
  UserCog,
  UserCheck,
  Settings,
  LogOut,
  Sparkles,
  LogIn,
  Share2,
  BookOpen,
  Home,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { TabType } from './Navbar';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';
import { APP_VERSION } from '../version';

interface TopBarProps {
  academicMode: boolean;
  activeTab: TabType;
  onOpenNewLogModal: () => void;
  onOpenEditClassTeacherModal?: () => void;
  onOpenLoginModal?: () => void;
  onToggleMobileSidebar: () => void;
  onNavigateTab: (tab: TabType) => void;
  onOpenPublicScoreboardModal?: () => void;
}

// Map active tab to human readable breadcrumb label
const TAB_LABELS: Record<TabType, { section: string; title: string }> = {
  portal: { section: 'Trang chủ', title: 'Cổng tra cứu học sinh' },
  dashboard: { section: 'Tổng quan', title: 'Tổng quan nề nếp thi đua' },
  collections: { section: 'Chủ nhiệm', title: 'Các khoản thu của lớp' },
  homeroom: { section: 'Chủ nhiệm', title: 'Trợ lý GVCN' },
  'class-schedule': { section: 'Chủ nhiệm', title: 'Thời khóa biểu lớp' },
  'seating-chart': { section: 'Chủ nhiệm', title: 'Xếp tổ & Sơ đồ lớp' },
  'daily-log': { section: 'Nề nếp', title: 'Chấm nề nếp hằng ngày' },
  weekly: { section: 'Tổng kết', title: 'Tổng kết tuần' },
  monthly: { section: 'Tổng kết', title: 'Tổng kết tháng' },
  semester: { section: 'Đánh giá', title: 'Đánh giá rèn luyện học kỳ' },
  'attendance-report': { section: 'Chuyên cần', title: 'Báo cáo học sinh nghỉ học' },
  students: { section: 'Hồ sơ', title: 'Danh sách học sinh' },
  gradebook: { section: 'Bộ môn', title: 'Sổ điểm bộ môn (TT 22)' },
  'teaching-classes': { section: 'Bộ môn', title: 'Lớp tôi dạy' },
  'subject-statistics': { section: 'Bộ môn', title: 'Thống kê sổ điểm' },
  'subject-attendance': { section: 'Bộ môn', title: 'Điểm danh bộ môn' },
  'teaching-schedule': { section: 'Bộ môn', title: 'Thời khóa biểu giảng dạy' },
  'random-picker': { section: 'Tiện ích', title: 'Gọi tên ngẫu nhiên' },
  'zalo-composer': { section: 'Liên hệ', title: 'Soạn tin Zalo phụ huynh' },
  'parent-report': { section: 'Liên hệ', title: 'Phiếu báo phụ huynh' },
  categories: { section: 'Quy chế', title: 'Biểu điểm vi phạm & thưởng' },
  settings: { section: 'Hệ thống', title: 'Cài đặt & sao lưu' },
  admin: { section: 'Hệ thống', title: 'Quản trị phân quyền trường' },
};

export const TopBar: React.FC<TopBarProps> = ({
  academicMode,
  activeTab,
  onOpenNewLogModal,
  onOpenEditClassTeacherModal,
  onOpenLoginModal,
  onToggleMobileSidebar,
  onNavigateTab,
  onOpenPublicScoreboardModal,
}) => {
  const {
    classConfig,
    logout,
    syncLocalToCloud,
    isCloudSyncing,
    userRole,
    activeAccount,
    inspectorModeClass,
  } = useApp();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUtilitiesOpen, setIsUtilitiesOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const utilitiesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (utilitiesRef.current && !utilitiesRef.current.contains(e.target as Node)) {
        setIsUtilitiesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTabInfo = TAB_LABELS[activeTab] || { section: 'Hệ thống', title: 'Trang chính' };
  const isGuestOrPortal = userRole === 'guest' || activeTab === 'portal' || !activeAccount;

  return (
    <header className="mobile-topbar safe-top sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-2xs print:hidden h-14">
      <div className="w-full h-full px-3 sm:px-6 flex items-center justify-between gap-3 min-w-0">
        {/* ── ZONE 1: LEFT (Branding, Breadcrumb, Global Search) ── */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile hamburger button */}
          {!isGuestOrPortal && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer shrink-0"
              aria-label="Mở menu danh mục"
              title="Mở menu danh mục"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          {/* Breadcrumb section info */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="min-w-0 truncate">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-extrabold text-slate-900 dark:text-white truncate">
                  Sổ Chấm Điểm
                </span>
                <span className="text-3xs px-1.5 py-0.2 font-bold rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  v3.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate hidden lg:block">
                {currentTabInfo.section} · <span className="text-slate-600 dark:text-slate-300 font-medium">{currentTabInfo.title}</span>
              </p>
            </div>
          </div>

          {/* Global Search Button */}
          {!isGuestOrPortal && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 text-xs transition active:scale-95 cursor-pointer shadow-2xs shrink-0"
              title="Tìm kiếm học sinh hoặc chức năng (⌘K hoặc Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-medium">Tìm kiếm...</span>
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono text-[10px] rounded border border-slate-200 dark:border-slate-600">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* ── ZONE 2: CENTER (Mode Switcher GVCN/GVBM + Class Context Pill) ── */}
        {!isGuestOrPortal && (
          <div className="hidden md:flex items-center gap-2 min-w-0 shrink">
            {/* Mode Switcher Pill */}
            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => onNavigateTab('daily-log')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  !academicMode
                    ? 'bg-blue-600 text-white shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Chế độ GVCN - Quản lý nề nếp thi đua & chấm điểm rèn luyện"
              >
                <Home className="h-3.5 w-3.5" />
                <span>GVCN</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('gradebook')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                  academicMode
                    ? 'bg-purple-600 text-white shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Chế độ GVBM - Sổ điểm bộ môn (Thông tư 22)"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>GVBM</span>
              </button>
            </div>

            {/* Class Context Pill */}
            <button
              type="button"
              onClick={onOpenEditClassTeacherModal}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer truncate max-w-[200px]"
              title="Nhấn để xem thông tin lớp học và phân công giảng dạy"
            >
              <span className="truncate">Lớp {classConfig.className || '10A8'}</span>
              <span className="text-[10px] text-slate-400 font-normal">·</span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {classConfig.classType === 'subject'
                  ? (classConfig.subjectName || classConfig.teachingSubject ? `Môn ${classConfig.subjectName || classConfig.teachingSubject}` : 'Bộ môn')
                  : (classConfig.homeroomTeacher || 'GVCN')}
              </span>
            </button>
          </div>
        )}

        {/* ── ZONE 3: RIGHT (Primary Action + Contextual Utilities + Sync + Profile) ── */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* PRIMARY ACTION: '+ Ghi nhận' */}
          {!academicMode && !inspectorModeClass && userRole !== 'guest' && (
            <button
              type="button"
              onClick={onOpenNewLogModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer tracking-wide"
              title="Ghi nhận vi phạm hoặc điểm cộng rèn luyện mới"
            >
              <PlusCircle className="h-4 w-4 stroke-[2.5]" />
              <span>Ghi nhận</span>
            </button>
          )}

          {/* SECONDARY UTILITIES DROPDOWN MENU */}
          {!isGuestOrPortal && (
            <div className="relative" ref={utilitiesRef}>
              <button
                type="button"
                onClick={() => setIsUtilitiesOpen(!isUtilitiesOpen)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 cursor-pointer shadow-2xs ${
                  isUtilitiesOpen
                    ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                title="Tiện ích mở rộng: Gọi tên ngẫu nhiên, Link xem điểm, Sổ chủ nhiệm, Cài đặt lớp"
              >
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden sm:inline">Tiện ích</span>
                <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${isUtilitiesOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Utilities Dropdown Menu */}
              {isUtilitiesOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3.5 py-1.5 text-3xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    Công cụ & Tiện ích
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUtilitiesOpen(false);
                      onNavigateTab('random-picker');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-amber-700 dark:text-amber-300 flex items-center gap-2.5 transition cursor-pointer font-medium"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>🎲 Gọi tên học sinh ngẫu nhiên</span>
                  </button>

                  {!academicMode && onOpenPublicScoreboardModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUtilitiesOpen(false);
                        onOpenPublicScoreboardModal();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-emerald-700 dark:text-emerald-400 flex items-center gap-2.5 transition cursor-pointer font-medium"
                    >
                      <Share2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span>🔗 Link xem điểm trực tiếp</span>
                    </button>
                  )}

                  {!academicMode && userRole !== 'monitor' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUtilitiesOpen(false);
                        window.dispatchEvent(new CustomEvent('open-homeroom-book-modal'));
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-rose-700 dark:text-rose-300 flex items-center gap-2.5 transition cursor-pointer font-medium"
                    >
                      <BookOpen className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      <span>📖 Xuất Sổ Chủ Nhiệm (.docx)</span>
                    </button>
                  )}

                  {onOpenEditClassTeacherModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsUtilitiesOpen(false);
                        onOpenEditClassTeacherModal();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition cursor-pointer font-medium border-t border-slate-100 dark:border-slate-800 mt-1"
                    >
                      <UserCog className="h-4 w-4 text-slate-400" />
                      <span>⚙️ Đổi GVCN/GVBM & Thông tin lớp</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Cloud Firestore Sync Dot */}
          {!isGuestOrPortal && (
            <button
              type="button"
              onClick={syncLocalToCloud}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 transition cursor-pointer text-xs"
              title="Dữ liệu đồng bộ Firebase Firestore. Nhấn để đồng bộ lại."
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <Cloud className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <RefreshCw
                className={`h-3 w-3 text-slate-400 ${isCloudSyncing ? 'animate-spin text-blue-500' : ''}`}
              />
            </button>
          )}

          <PWAInstallButton />

          {/* User Profile Menu */}
          {activeAccount && userRole !== 'guest' ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer text-xs"
                title="Thông tin tài khoản"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {activeAccount.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[120px] leading-tight">
                    {activeAccount.displayName}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                    {userRole === 'owner' ? 'Chủ hệ thống' : userRole === 'admin' ? 'BGH' : userRole === 'monitor' ? 'Lớp trưởng' : 'GV Chủ nhiệm'}
                  </span>
                </div>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Popover */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {activeAccount.displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {activeAccount.email || activeAccount.username}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {userRole === 'owner' ? '👑 Chủ hệ thống' : userRole === 'admin' ? '🛡 Ban Giám Hiệu' : userRole === 'monitor' ? '⭐ Lớp trưởng' : '👨‍🏫 Giáo viên'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        • Lớp {classConfig.className}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    {userRole !== 'monitor' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onNavigateTab('settings');
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <UserCheck className="h-4 w-4 text-indigo-500" />
                        <span>Tài khoản Lớp trưởng</span>
                      </button>
                    )}

                    {onOpenLoginModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onOpenLoginModal();
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                        <span>Đổi tài khoản / Đăng nhập</span>
                      </button>
                    )}

                    {userRole !== 'monitor' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onNavigateTab('settings');
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <Settings className="h-4 w-4 text-slate-400" />
                        <span>Cài đặt & Sao lưu dữ liệu</span>
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                    <div className="px-3.5 py-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center justify-between">
                      <span>Phiên bản:</span>
                      <span className="font-bold text-slate-600 dark:text-slate-300">v{APP_VERSION}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2.5 transition cursor-pointer font-bold uppercase tracking-wide"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>ĐĂNG XUẤT</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              title="Đăng nhập tài khoản giáo viên hoặc quản trị"
            >
              <LogIn className="h-4 w-4" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
