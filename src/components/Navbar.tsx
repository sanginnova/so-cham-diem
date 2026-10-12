import React, { useState, useRef, useEffect } from 'react';
import {
  GraduationCap,
  CalendarDays,
  FileSpreadsheet,
  CalendarCheck,
  CalendarRange,
  Users,
  Tag,
  MessageSquareShare,
  Settings,
  PlusCircle,
  Cloud,
  LogOut,
  RefreshCw,
  Award,
  Edit2,
  UserCog,
  MessageSquareText,
  ShieldCheck,
  User,
  UserCheck,
  ChevronDown,
  Search,
  SlidersHorizontal,
  Check,
  UserX,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';

export type TabType =
  | 'portal'
  | 'dashboard'
  | 'daily-log'
  | 'weekly'
  | 'monthly'
  | 'semester'
  | 'attendance-report'
  | 'students'
  | 'categories'
  | 'parent-report'
  | 'zalo-composer'
  | 'settings'
  | 'admin';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenNewLogModal: () => void;
  onOpenEditClassTeacherModal?: () => void;
  onOpenLoginModal?: () => void;
}

interface NavSubItem {
  id: TabType;
  label: string;
  icon: React.FC<{ className?: string }>;
  shortLabel?: string;
  description?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  defaultTab: TabType;
  subItems?: NavSubItem[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewLogModal,
  onOpenEditClassTeacherModal,
  onOpenLoginModal,
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

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Logical groups for a compact, executive navigation experience
  const navGroups: NavGroup[] = [
    {
      id: 'dashboard',
      label: 'Tổng quan',
      icon: CalendarDays,
      defaultTab: 'dashboard',
    },
    {
      id: 'daily-log',
      label: 'Nhật ký ngày',
      icon: FileSpreadsheet,
      defaultTab: 'daily-log',
    },
    {
      id: 'reports',
      label: 'Tổng kết & Xếp loại',
      icon: CalendarCheck,
      defaultTab: 'weekly',
      subItems: [
        {
          id: 'weekly',
          label: 'Tổng kết tuần',
          shortLabel: 'Tuần',
          icon: CalendarCheck,
          description: 'Bảng điểm nề nếp & xếp hạng từng tuần',
        },
        {
          id: 'monthly',
          label: 'Tổng kết tháng',
          shortLabel: 'Tháng',
          icon: CalendarRange,
          description: 'Theo dõi tiến bộ & so sánh các tháng',
        },
        {
          id: 'semester',
          label: 'Đánh giá học kỳ',
          shortLabel: 'Học kỳ',
          icon: Award,
          description: 'Tổng kết rèn luyện HK1, HK2 & Cả năm',
        },
        {
          id: 'attendance-report',
          label: 'Báo cáo học sinh nghỉ học',
          shortLabel: 'Nghỉ học',
          icon: UserX,
          description: 'Chi tiết số buổi nghỉ có phép, không phép, trốn tiết',
        },
      ],
    },
    {
      id: 'students-comm',
      label: 'Học sinh & Phụ huynh',
      icon: Users,
      defaultTab: 'students',
      subItems: [
        {
          id: 'students',
          label: 'Hồ sơ học sinh',
          shortLabel: 'Hồ sơ',
          icon: Users,
          description: 'Danh sách, thông tin & lịch sử nề nếp',
        },
        {
          id: 'zalo-composer',
          label: 'Soạn tin Zalo',
          shortLabel: 'Tin Zalo',
          icon: MessageSquareText,
          description: 'Tự động gửi báo cáo cá nhân hóa qua Zalo',
        },
        {
          id: 'parent-report',
          label: 'Báo cáo phụ huynh',
          shortLabel: 'Báo cáo PH',
          icon: MessageSquareShare,
          description: 'Phiếu báo kết quả rèn luyện cho gia đình',
        },
      ],
    },
    {
      id: 'system',
      label: 'Hệ thống',
      icon: SlidersHorizontal,
      defaultTab: 'categories',
      subItems: [
        {
          id: 'categories',
          label: 'Quy chế lỗi & Thưởng',
          shortLabel: 'Biểu điểm',
          icon: Tag,
          description: 'Danh mục hành vi cộng/trừ điểm thi đua',
        },
        {
          id: 'settings',
          label: 'Cài đặt & Sao lưu',
          shortLabel: 'Cài đặt',
          icon: Settings,
          description: 'Tùy chỉnh lớp, sao lưu dữ liệu JSON & Excel',
        },
        ...(userRole === 'admin'
          ? [
              {
                id: 'admin' as TabType,
                label: 'Quản trị trường học',
                shortLabel: 'Quản trị',
                icon: ShieldCheck,
                description: 'Phân quyền giáo viên & toàn bộ các lớp',
              },
            ]
          : []),
      ],
    },
  ];

  // If in guest mode, show clean single-purpose portal
  if (userRole === 'guest') {
    return (
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30 print:hidden border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white uppercase">
                SỔ CHẤM ĐIỂM HÀNG NGÀY
              </h1>
              <p className="text-xs text-slate-400">
                {classConfig.schoolName || 'Cổng tra cứu kết quả rèn luyện học sinh'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton />
            {onOpenLoginModal && (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <User className="h-4 w-4" />
                <span>Đăng nhập Giáo viên</span>
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Find currently active group
  const currentActiveGroup = navGroups.find(
    (g) => g.defaultTab === activeTab || g.subItems?.some((sub) => sub.id === activeTab)
  );

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-30 print:hidden select-none">
      {/* ── TOP TIER: Brand, Class Identity & Quick Controls ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 border-b border-slate-800/80">
        {/* Brand & Class badge */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-white uppercase truncate">
                SỔ CHẤM ĐIỂM
              </span>
              <button
                type="button"
                onClick={onOpenEditClassTeacherModal}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-400/30 transition cursor-pointer"
                title="Bấm để thay đổi thông tin giáo viên và lớp học"
              >
                <span>Lớp {classConfig.className}</span>
                <Edit2 className="h-2.5 w-2.5 opacity-70" />
              </button>
            </div>

            <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
              <span>{classConfig.homeroomTeacher || 'GV Chủ nhiệm'}</span>
              <span className="text-slate-600">•</span>
              <span>Năm học {classConfig.schoolYear}</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Profile Menu */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Search Shortcut (Ctrl+K) */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 text-xs transition active:scale-95 cursor-pointer shadow-xs"
            title="Tìm kiếm nhanh học sinh & chức năng (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden md:inline text-[11px] text-slate-300">Tìm kiếm</span>
            <kbd className="hidden lg:inline-block px-1 py-0.2 bg-slate-750 text-slate-400 font-mono text-[9px] rounded border border-slate-700">
              ⌘K
            </kbd>
          </button>

          {/* Quick Add Log Button */}
          {!inspectorModeClass && (
            <button
              onClick={onOpenNewLogModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs shadow-blue-600/30 transition active:scale-95 cursor-pointer"
              title="Ghi nhận nề nếp hoặc điểm thưởng mới"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ghi nhận</span>
            </button>
          )}

          {/* Cloud Sync Status Indicator */}
          <div
            className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1.5 rounded-xl border border-slate-700/70 text-xs cursor-pointer hover:border-slate-600 transition"
            onClick={syncLocalToCloud}
            title="Trạng thái CSDL Cloud Firestore. Bấm để đồng bộ."
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <Cloud className="h-3.5 w-3.5 text-emerald-400" />
            <RefreshCw className={`h-3 w-3 text-slate-400 ${isCloudSyncing ? 'animate-spin text-blue-400' : ''}`} />
          </div>

          <PWAInstallButton />

          {/* Consolidated Profile Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700/80 transition active:scale-95 cursor-pointer text-xs"
              title="Tài khoản cá nhân & Cài đặt"
            >
              <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {(activeAccount?.displayName || currentUser?.displayName || 'GV').charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-semibold text-white truncate max-w-[110px] leading-tight">
                  {activeAccount?.displayName || 'Tài khoản'}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {userRole === 'admin' ? 'Quản trị' : (activeAccount?.assignedClassName || 'Giáo viên')}
                </span>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Menu Popover */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-850 dark:bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User info header */}
                <div className="px-3.5 py-2.5 border-b border-slate-800">
                  <p className="font-bold text-white text-sm">
                    {activeAccount?.displayName || 'Giáo viên'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {activeAccount?.email || activeAccount?.username || 'Tài khoản nội bộ'}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-900/50 text-blue-300 border border-blue-700/40">
                      {userRole === 'admin' ? 'Quản trị viên' : 'Giáo viên Chủ nhiệm'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      • {classConfig.className}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="py-1">
                  {onOpenEditClassTeacherModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenEditClassTeacherModal();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <UserCog className="h-4 w-4 text-blue-400" />
                      <span>Đổi thông tin GV & Lớp</span>
                    </button>
                  )}

                  {onOpenLoginModal && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onOpenLoginModal();
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2.5 transition cursor-pointer"
                    >
                      <UserCheck className="h-4 w-4 text-indigo-400" />
                      <span>Đăng nhập / Đổi tài khoản</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      setActiveTab('settings');
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    <span>Cài đặt & Sao lưu dữ liệu</span>
                  </button>
                </div>

                <div className="border-t border-slate-800 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 text-rose-400" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── LOWER TIER: Streamlined Primary Navigation Bar ── */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6" ref={navRef}>
        <div className="flex items-center justify-between border-b border-slate-800/60">
          <nav className="flex space-x-1 py-1.5 overflow-x-auto scrollbar-none" aria-label="Thanh điều hướng chính">
            {navGroups.map((group) => {
              const Icon = group.icon;
              const hasSubItems = !!group.subItems?.length;
              const isGroupActive =
                activeTab === group.defaultTab ||
                group.subItems?.some((sub) => sub.id === activeTab);
              const isDropdownOpen = activeDropdown === group.id;

              return (
                <div key={group.id} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasSubItems) {
                        // Toggle dropdown or switch directly to default
                        if (!isGroupActive) {
                          setActiveTab(group.defaultTab);
                        }
                        setActiveDropdown(isDropdownOpen ? null : group.id);
                      } else {
                        setActiveTab(group.defaultTab);
                        setActiveDropdown(null);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                      isGroupActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isGroupActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{group.label}</span>
                    {hasSubItems && (
                      <ChevronDown
                        className={`h-3.5 w-3.5 opacity-70 transition-transform ${
                          isDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>

                  {/* Dropdown for Sub-items */}
                  {hasSubItems && isDropdownOpen && (
                    <div className="absolute left-0 mt-1.5 w-60 bg-slate-850 dark:bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                      {group.subItems!.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = activeTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(sub.id);
                              setActiveDropdown(null);
                            }}
                            className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                              isSubActive
                                ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg shrink-0 ${isSubActive ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                              <SubIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-semibold text-xs ${isSubActive ? 'text-blue-300' : 'text-slate-200'}`}>
                                  {sub.label}
                                </span>
                                {isSubActive && <Check className="h-3.5 w-3.5 text-blue-400" />}
                              </div>
                              {sub.description && (
                                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                                  {sub.description}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* ── TIER 3: Contextual Sub-Nav Bar (Shows when in a multi-view category) ── */}
        {currentActiveGroup?.subItems && currentActiveGroup.subItems.length > 0 && (
          <div className="py-1.5 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs border-t border-slate-800/40">
            <span className="text-[11px] text-slate-400 font-medium px-1 shrink-0">
              {currentActiveGroup.label}:
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {currentActiveGroup.subItems.map((sub) => {
                const isSubActive = activeTab === sub.id;
                const SubIcon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setActiveTab(sub.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isSubActive
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <SubIcon className={`h-3 w-3 ${isSubActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span>{sub.shortLabel || sub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
