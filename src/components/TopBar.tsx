import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Edit2,
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
  School,
} from 'lucide-react';
import { TabType } from './Navbar';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  activeTab: TabType;
  onOpenNewLogModal: () => void;
  onOpenEditClassTeacherModal?: () => void;
  onOpenLoginModal?: () => void;
  onToggleMobileSidebar: () => void;
  onNavigateTab: (tab: TabType) => void;
}

// Map active tab to human readable breadcrumb label
const TAB_LABELS: Record<TabType, { section: string; title: string }> = {
  portal: { section: 'Trang chủ', title: 'Cổng tra cứu học sinh' },
  dashboard: { section: 'Tổng quan', title: 'Bảng điều khiển lớp học' },
  'daily-log': { section: 'Nhật ký', title: 'Chấm điểm hằng ngày' },
  weekly: { section: 'Báo cáo', title: 'Tổng kết tuần' },
  monthly: { section: 'Báo cáo', title: 'Tổng kết tháng' },
  semester: { section: 'Báo cáo', title: 'Xếp loại học kỳ' },
  'attendance-report': { section: 'Báo cáo', title: 'Báo cáo học sinh nghỉ học' },
  students: { section: 'Học sinh', title: 'Danh sách hồ sơ học sinh' },
  'zalo-composer': { section: 'Học sinh', title: 'Soạn tin Zalo phụ huynh' },
  'parent-report': { section: 'Học sinh', title: 'Báo cáo phụ huynh định kỳ' },
  categories: { section: 'Hệ thống', title: 'Biểu điểm lỗi & thưởng' },
  settings: { section: 'Hệ thống', title: 'Cài đặt lớp & sao lưu' },
  admin: { section: 'Hệ thống', title: 'Quản trị phân quyền trường' },
};

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onOpenNewLogModal,
  onOpenEditClassTeacherModal,
  onOpenLoginModal,
  onToggleMobileSidebar,
  onNavigateTab,
}) => {
  const {
    currentUser,
    isCloudSyncing,
    classConfig,
    logout,
    syncLocalToCloud,
    userRole,
    activeAccount,
    inspectorModeClass,
  } = useApp();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentTabInfo = TAB_LABELS[activeTab] || { section: 'Hệ thống', title: 'Trang chính' };

  const isGuestOrPortal = userRole === 'guest' || activeTab === 'portal' || !activeAccount;

  return (
    <header className="mobile-topbar safe-top sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs print:hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Left: Mobile Drawer Trigger + Class Badge / School Institution & Breadcrumb */}
        <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Mobile hamburger button - Only for logged-in workspace */}
          {!isGuestOrPortal && (
            <button
              type="button"
              onClick={onToggleMobileSidebar}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              aria-label="Mở menu danh mục"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Badge: Show Class Pill when authenticated, School name when guest / public portal */}
          <div className="flex items-center gap-2 min-w-0">
            {!isGuestOrPortal ? (
              <button
                type="button"
                onClick={onOpenEditClassTeacherModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/80 transition cursor-pointer shrink-0"
                title="Nhấn để đổi thông tin giáo viên hoặc lớp chủ nhiệm"
              >
                <span>Lớp {classConfig.className}</span>
                <Edit2 className="h-3 w-3 opacity-60" />
              </button>
            ) : (
              <div className="inline-flex min-w-0 items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                <School className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="truncate">Trường CĐ Nghề 01 - BQP</span>
              </div>
            )}

            {/* Breadcrumb View Title */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
              <span className="opacity-70">{currentTabInfo.section}</span>
              <span>/</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                {currentTabInfo.title}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Search + CTA '+ GHI NHẬN' + Cloud + Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search Bar / Command Palette shortcut - Only for authenticated staff */}
          {!isGuestOrPortal && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 text-xs transition active:scale-95 cursor-pointer shadow-2xs"
              title="Tìm kiếm học sinh hoặc chức năng (⌘K hoặc Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
              <span className="hidden md:inline text-xs font-medium">Tìm kiếm...</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 font-mono text-[10px] rounded border border-slate-200 dark:border-slate-600 shadow-2xs">
                ⌘K
              </kbd>
            </button>
          )}

          {/* Prominent Primary CTA Button '+ GHI NHẬN' */}
          {!inspectorModeClass && userRole !== 'guest' && (
            <button
              type="button"
              onClick={onOpenNewLogModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 active:scale-95 transition-all cursor-pointer tracking-wide uppercase"
              title="Ghi nhận vi phạm hoặc điểm cộng nề nếp mới"
            >
              <PlusCircle className="h-4 w-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Ghi nhận</span>
            </button>
          )}

          {/* Cloud Firestore Sync Dot - Only for authenticated staff */}
          {!isGuestOrPortal && (
            <div
              onClick={syncLocalToCloud}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 transition cursor-pointer text-xs"
              title="Dữ liệu lưu trữ trên Firebase Firestore. Bấm để đồng bộ lại."
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <Cloud className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <RefreshCw
                className={`h-3 w-3 text-slate-400 ${
                  isCloudSyncing ? 'animate-spin text-blue-500' : ''
                }`}
              />
            </div>
          )}

          <PWAInstallButton />

          {/* User Profile Menu or Login Button */}
          {activeAccount && userRole !== 'guest' ? (
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 transition active:scale-95 cursor-pointer text-xs"
                title="Thông tin tài khoản & tùy chọn"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {activeAccount.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[120px] leading-tight">
                    {activeAccount.displayName}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                    {userRole === 'owner' ? 'Chủ hệ thống' : userRole === 'admin' ? 'Ban Giám Hiệu' : userRole === 'monitor' ? '⭐ Lớp trưởng' : 'GV Chủ nhiệm'}
                  </span>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                    isProfileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Profile Dropdown Popover */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 rounded-2xl shadow-xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Header */}
                  <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {activeAccount.displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {activeAccount.email || activeAccount.username}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {userRole === 'owner' ? '👑 Chủ hệ thống' : userRole === 'admin' ? '🛡 Ban Giám Hiệu' : userRole === 'monitor' ? '⭐ Lớp trưởng chấm điểm' : '👨‍🏫 Giáo viên'}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        • Lớp {classConfig.className}
                      </span>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    {userRole !== 'monitor' && onOpenEditClassTeacherModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onOpenEditClassTeacherModal();
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 flex items-center gap-2.5 transition cursor-pointer"
                      >
                        <UserCog className="h-4 w-4 text-blue-500" />
                        <span>Đổi thông tin GV & Lớp học</span>
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
                        <UserCheck className="h-4 w-4 text-indigo-500" />
                        <span>Tài khoản Lớp trưởng chấm điểm</span>
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
