import React, { useState, useEffect } from 'react';
import { currentSchoolYear } from '../lib/classScope';
import {
  GraduationCap,
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  MessageSquareText,
  MessageSquareShare,
  CalendarCheck,
  CalendarRange,
  Award,
  Tag,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  UserCheck,
  User,
  LogOut,
  UserCog,
  SlidersHorizontal,
  LogIn,
  UserX,
} from 'lucide-react';
import { TabType } from './Navbar';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onOpenEditClassTeacherModal?: () => void;
  onOpenLoginModal?: () => void;
}

interface SubMenuItem {
  id: TabType;
  label: string;
  icon: React.FC<{ className?: string }>;
  shortLabel?: string;
}

interface MenuGroup {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  directTab?: TabType;
  subItems?: SubMenuItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  setIsOpenMobile,
  isCollapsed,
  setIsCollapsed,
  onOpenEditClassTeacherModal,
  onOpenLoginModal,
}) => {
  const {
    currentUser,
    userRole,
    activeAccount,
    classConfig,
    logout,
  } = useApp();

  // Define modules in sidebar
  const menuGroups: MenuGroup[] = [
    {
      id: 'dashboard',
      label: 'Tổng quan',
      icon: LayoutDashboard,
      directTab: 'dashboard',
    },
    {
      id: 'daily-log',
      label: 'Nhật ký chấm điểm',
      icon: FileSpreadsheet,
      directTab: 'daily-log',
    },
    {
      id: 'students-group',
      label: 'Học sinh',
      icon: Users,
      subItems: [
        {
          id: 'students',
          label: 'Danh sách học sinh',
          shortLabel: 'Danh sách',
          icon: Users,
        },
        ...(userRole !== 'monitor'
          ? [
              {
                id: 'zalo-composer' as TabType,
                label: 'Liên hệ phụ huynh (Zalo)',
                shortLabel: 'Gửi Zalo',
                icon: MessageSquareText,
              },
              {
                id: 'parent-report' as TabType,
                label: 'Phiếu báo phụ huynh',
                shortLabel: 'Phiếu báo PH',
                icon: MessageSquareShare,
              },
            ]
          : []),
      ],
    },
    {
      id: 'reports-group',
      label: 'Báo cáo',
      icon: CalendarCheck,
      subItems: [
        {
          id: 'weekly',
          label: 'Tổng kết tuần',
          shortLabel: 'Tuần',
          icon: CalendarCheck,
        },
        {
          id: 'monthly',
          label: 'Tổng kết tháng',
          shortLabel: 'Tháng',
          icon: CalendarRange,
        },
        {
          id: 'semester',
          label: 'Học kỳ & Cả năm',
          shortLabel: 'Học kỳ',
          icon: Award,
        },
        {
          id: 'attendance-report',
          label: 'Báo cáo HS nghỉ học',
          shortLabel: 'Nghỉ học',
          icon: UserX,
        },
      ],
    },
    {
      id: 'system-group',
      label: 'Hệ thống',
      icon: Settings,
      subItems: [
        {
          id: 'categories',
          label: 'Quy chế & Biểu điểm',
          shortLabel: 'Biểu điểm',
          icon: Tag,
        },
        ...(userRole !== 'monitor'
          ? [
              {
                id: 'settings' as TabType,
                label: 'Cài đặt & Sao lưu',
                shortLabel: 'Cài đặt',
                icon: Settings,
              },
            ]
          : []),
      ],
    },
    // RBAC: Khối Quản trị độc lập, chỉ Admin / Chủ hệ thống mới thấy (Teacher ẩn hoàn toàn)
    ...(userRole === 'admin' || userRole === 'owner'
      ? [
          {
            id: 'admin-group',
            label: 'Quản trị',
            icon: ShieldCheck,
            subItems: [
              {
                id: 'admin' as TabType,
                label: 'Toàn trường & Phân quyền',
                shortLabel: 'Quản trị',
                icon: ShieldCheck,
              },
            ],
          },
        ]
      : []),
  ];

  // Keep track of which accordion submenus are open
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'students-group': true,
    'reports-group': true,
    'system-group': false,
    'admin-group': true,
  });

  // Floating popover when collapsed on desktop
  const [hoveredGroup, setHoveredGroup] = useState<MenuGroup | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ top: number }>({ top: 0 });

  // Auto-expand group containing the activeTab
  useEffect(() => {
    menuGroups.forEach((group) => {
      if (group.subItems?.some((sub) => sub.id === activeTab)) {
        setExpandedGroups((prev) => ({ ...prev, [group.id]: true }));
      }
    });
  }, [activeTab]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleNavClick = (tab: TabType) => {
    setActiveTab(tab);
    setIsOpenMobile(false);
    setHoveredGroup(null);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 border-r border-slate-800 select-none">
      {/* ── Top Header / Brand ── */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          {(!isCollapsed || isOpenMobile) && (
            <div className="min-w-0 transition-opacity duration-200">
              <h1 className="text-sm font-black tracking-tight text-white uppercase truncate">
                SỔ CHẤM ĐIỂM
              </h1>
              <p className="text-[11px] text-blue-400 font-medium truncate">
                Năm học {classConfig.schoolYear || currentSchoolYear()}
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        {isOpenMobile && (
          <button
            type="button"
            onClick={() => setIsOpenMobile(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Đóng thanh điều hướng"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── Navigation Tree (Max 2 Levels) ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {menuGroups.map((group, idx) => {
          const Icon = group.icon;
          const isDirect = !!group.directTab;
          const isGroupActive = isDirect
            ? activeTab === group.directTab
            : group.subItems?.some((sub) => sub.id === activeTab);
          const isExpanded = !!expandedGroups[group.id];
          const isSystemDivider = group.id === 'system-group';

          return (
            <React.Fragment key={group.id}>
              {isSystemDivider && (
                <div className="my-3 border-t border-slate-800/80" />
              )}

              <div
                className="relative"
                onMouseEnter={(e) => {
                  if (isCollapsed && !isOpenMobile && group.subItems?.length) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoverPosition({ top: rect.top });
                    setHoveredGroup(group);
                  }
                }}
                onMouseLeave={() => {
                  if (isCollapsed && !isOpenMobile) {
                    setHoveredGroup(null);
                  }
                }}
              >
                {/* Level 1 item */}
                {isDirect ? (
                  <button
                    type="button"
                    onClick={() => handleNavClick(group.directTab!)}
                    title={isCollapsed && !isOpenMobile ? group.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isGroupActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${isGroupActive ? 'text-white' : 'text-slate-400'}`} />
                    {(!isCollapsed || isOpenMobile) && (
                      <span className="truncate">{group.label}</span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (isCollapsed && !isOpenMobile) {
                        setIsCollapsed(false);
                      }
                      toggleGroup(group.id);
                    }}
                    title={isCollapsed && !isOpenMobile ? group.label : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                      isGroupActive
                        ? 'text-blue-300 bg-blue-950/40 border border-blue-800/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`h-5 w-5 shrink-0 ${isGroupActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      {(!isCollapsed || isOpenMobile) && (
                        <span className="truncate">{group.label}</span>
                      )}
                    </div>
                    {(!isCollapsed || isOpenMobile) && (
                      <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </button>
                )}

                {/* Level 2 Submenu (Expanded view) */}
                {(!isCollapsed || isOpenMobile) && !isDirect && isExpanded && group.subItems && (
                  <div className="mt-1 ml-4 pl-3 border-l-2 border-slate-800 space-y-1">
                    {group.subItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = activeTab === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => handleNavClick(sub.id)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                            isSubActive
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                          }`}
                        >
                          <SubIcon className={`h-4 w-4 shrink-0 ${isSubActive ? 'text-white' : 'text-slate-500'}`} />
                          <span className="truncate">{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </nav>

      {/* ── Bottom Section: Profile Card & Collapse Toggle ── */}
      <div className="p-3 border-t border-slate-800 space-y-2 shrink-0">
        {/* User Card */}
        {activeAccount && userRole !== 'guest' ? (
          <div
            onClick={onOpenLoginModal}
            className={`flex items-center gap-3 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition ${
              isCollapsed && !isOpenMobile ? 'justify-center p-2' : ''
            }`}
            title="Bấm để xem thông tin tài khoản"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {activeAccount.displayName.charAt(0).toUpperCase()}
            </div>
            {(!isCollapsed || isOpenMobile) && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate leading-tight">
                  {activeAccount.displayName}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {userRole === 'owner' ? 'Chủ hệ thống' : userRole === 'admin' ? 'Ban Giám Hiệu' : userRole === 'monitor' ? '⭐ Lớp trưởng chấm điểm' : `Lớp ${classConfig.className}`}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={onOpenLoginModal}
            className={`flex items-center gap-3 p-2 rounded-xl bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 cursor-pointer transition ${
              isCollapsed && !isOpenMobile ? 'justify-center p-2' : ''
            }`}
            title="Bấm để đăng nhập hệ thống"
          >
            <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              <LogIn className="h-4 w-4" />
            </div>
            {(!isCollapsed || isOpenMobile) && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-blue-400 truncate leading-tight">
                  Đăng nhập
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  Giáo viên & Quản trị
                </p>
              </div>
            )}
          </div>
        )}

        {/* Desktop Collapse/Expand Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex w-full items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium transition cursor-pointer"
          title={isCollapsed ? 'Mở rộng menu (256px)' : 'Thu gọn menu (72px)'}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span>Thu gọn menu</span>
            </>
          )}
        </button>
      </div>

      {/* Floating flyout menu when hovering collapsed group on desktop */}
      {isCollapsed && !isOpenMobile && hoveredGroup?.subItems && (
        <div
          style={{ top: `${hoverPosition.top}px` }}
          className="fixed left-20 z-50 w-56 bg-slate-850 dark:bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-left-2 duration-150"
          onMouseEnter={() => setHoveredGroup(hoveredGroup)}
          onMouseLeave={() => setHoveredGroup(null)}
        >
          <div className="px-2.5 py-1.5 mb-1 border-b border-slate-800 font-bold text-xs text-white">
            {hoveredGroup.label}
          </div>
          <div className="space-y-1">
            {hoveredGroup.subItems.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = activeTab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleNavClick(sub.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-left transition cursor-pointer ${
                    isSubActive
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <SubIcon className="h-4 w-4 shrink-0" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Fixed/Sticky Sidebar */}
      <aside
        className={`hidden md:block shrink-0 sticky top-0 h-screen transition-all duration-300 ease-in-out z-30 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (☰ Slide-over overlay) */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpenMobile(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
