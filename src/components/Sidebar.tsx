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
  BookOpen,
  LayoutGrid,
  Wallet,
} from 'lucide-react';
import { TabType } from './Navbar';
import { useApp } from '../context/AppContext';
import { APP_VERSION } from '../version';

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
  badge?: string;
  badgeClass?: string;
}

interface MenuSection {
  id: string;
  title: string;
  badge?: string;
  badgeClass?: string;
  groups: MenuGroup[];
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

  // ── Phân chia rành mạch 2 Phân hệ lớn: ĐIỂM HỌC LỰC vs ĐIỂM RÈN LUYỆN ──
  const menuSections: MenuSection[] = [
    // ── PHÂN HỆ 1: CHẤM ĐIỂM HỌC LỰC (BỘ MÔN) ──
    ...(['teacher', 'admin', 'owner'].includes(userRole)
      ? [
          {
            id: 'academic',
            title: 'ĐIỂM HỌC LỰC (BỘ MÔN)',
            badge: "15' · 30' · 1 TIẾT · CK",
            badgeClass: 'bg-purple-900/60 text-purple-300 border-purple-700/60',
            groups: [
              {
                id: 'teaching-classes',
                label: 'Lớp tôi dạy',
                icon: BookOpen,
                directTab: 'teaching-classes' as TabType,
              },
              {
                id: 'gradebook',
                label: `Sổ điểm môn ${classConfig.subjectName || classConfig.teachingSubject || 'Toán'}`,
                icon: BookOpen,
                directTab: 'gradebook' as TabType,
                badge: 'TT 22',
                badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
              },
            ],
          },
        ]
      : []),

    // ── PHÂN HỆ 2: CHẤM ĐIỂM RÈN LUYỆN (NỀ NẾP & HẠNH KIỂM) ──
    {
      id: 'conduct',
      title: 'ĐIỂM RÈN LUYỆN (NỀ NẾP)',
      badge: 'THI ĐUA · HẠNH KIỂM',
      badgeClass: 'bg-blue-900/60 text-blue-300 border-blue-700/60',
      groups: [
        {
          id: 'daily-log',
          label: 'Chấm nề nếp hàng ngày',
          icon: FileSpreadsheet,
          directTab: 'daily-log',
        },
        {
          id: 'dashboard',
          label: 'Tổng quan nề nếp',
          icon: LayoutDashboard,
          directTab: 'dashboard',
        },
        {
          id: 'reports-group',
          label: 'Tổng kết & Báo cáo thi đua',
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
              label: 'Đánh giá rèn luyện học kỳ',
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
          id: 'students-group',
          label: 'Học sinh & Phụ huynh',
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
        ...(classConfig.classType !== 'subject' && ['teacher', 'admin', 'owner'].includes(userRole)
          ? [
              { id: 'homeroom', label: 'Trợ lý GVCN', icon: GraduationCap, directTab: 'homeroom' as TabType },
              { id: 'seating-chart', label: 'Xếp tổ & Sơ đồ lớp', icon: LayoutGrid, directTab: 'seating-chart' as TabType },
              { id: 'collections', label: 'Các khoản thu của lớp', icon: Wallet, directTab: 'collections' as TabType },
            ]
          : []),
      ],
    },

    // ── PHÂN HỆ 3: QUY CHẾ & CÀI ĐẶT HỆ THỐNG ──
    {
      id: 'system',
      title: 'QUY CHẾ & HỆ THỐNG',
      groups: [
        {
          id: 'system-group',
          label: 'Hệ thống',
          icon: Settings,
          subItems: [
            {
              id: 'categories',
              label: 'Quy chế & Biểu điểm lỗi',
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
      ],
    },
  ];

  const menuGroups: MenuGroup[] = menuSections.flatMap((s) => s.groups);

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

  // ── Mobile Left-Edge Swipe & Drawer Gestures ──
  const touchStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
        const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);

        // Vuốt từ mép trái màn hình (x <= 28px) sang phải để mở menu
        if (!isOpenMobile && touchStartRef.current.x <= 28 && deltaX > 45 && deltaY < 60) {
          setIsOpenMobile(true);
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isOpenMobile, setIsOpenMobile]);

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleDrawerTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
    // Vuốt từ phải sang trái trong drawer để đóng
    if (deltaX < -50 && deltaY < 80) {
      setIsOpenMobile(false);
    }
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
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black tracking-tight text-white uppercase truncate">
                  SỔ CHẤM ĐIỂM
                </h1>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/25 text-blue-300 border border-blue-400/30">
                  v{APP_VERSION}
                </span>
              </div>
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

      {/* ── BỘ CHUYỂN PHÂN HỆ: RÈN LUYỆN vs HỌC LỰC ── */}
      <div className="px-3 pt-3 pb-2 border-b border-slate-800 shrink-0">
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 gap-1 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => handleNavClick(activeTab === 'gradebook' ? 'daily-log' : activeTab)}
            className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab !== 'gradebook'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
            title="Phân hệ Chấm điểm rèn luyện (Nề nếp, chuyên cần, thi đua)"
          >
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            {(!isCollapsed || isOpenMobile) && <span>Rèn luyện</span>}
          </button>
          <button
            type="button"
            onClick={() => handleNavClick('gradebook')}
            className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'gradebook'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
            title="Phân hệ Chấm điểm học lực (15 phút, 30 phút, 1 tiết...)"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            {(!isCollapsed || isOpenMobile) && <span>Học lực</span>}
          </button>
        </div>
      </div>

      {/* ── Navigation Tree Theo Phân Hệ ── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {menuSections.map((section) => (
          <div key={section.id} className="space-y-1">
            {/* Tiêu đề Section Header phân biệt rõ ràng */}
            {(!isCollapsed || isOpenMobile) ? (
              <div className="px-2 pt-2 pb-1 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {section.title}
                </span>
                {section.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${section.badgeClass}`}>
                    {section.badge}
                  </span>
                )}
              </div>
            ) : (
              <div className="my-2 border-t border-slate-800/80" />
            )}

            {section.groups.map((group) => {
              const Icon = group.icon;
              const isDirect = !!group.directTab;
              const isGroupActive = isDirect
                ? activeTab === group.directTab
                : group.subItems?.some((sub) => sub.id === activeTab);
              const isExpanded = !!expandedGroups[group.id];

              return (
                <div
                  key={group.id}
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                        isGroupActive
                          ? group.id === 'gradebook'
                            ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                            : 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`h-5 w-5 shrink-0 ${isGroupActive ? 'text-white' : 'text-slate-400'}`} />
                        {(!isCollapsed || isOpenMobile) && (
                          <span className="truncate">{group.label}</span>
                        )}
                      </div>
                      {(!isCollapsed || isOpenMobile) && group.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${group.badgeClass || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                          {group.badge}
                        </span>
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
              );
            })}
          </div>
        ))}

        {/* ── Nút Xuất Sổ Chủ Nhiệm CĐN01 Nổi Bật ── */}
        {userRole !== 'monitor' && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-homeroom-book-modal'))}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-red-600/20 via-rose-600/20 to-amber-600/20 hover:from-red-600/30 hover:via-rose-600/30 hover:to-amber-600/30 text-rose-300 border border-red-500/30 text-xs font-bold transition shadow-xs cursor-pointer group active:scale-95 ${
                isCollapsed && !isOpenMobile ? 'justify-center p-2' : ''
              }`}
              title="Xuất Sổ công tác giáo viên chủ nhiệm (.docx)"
            >
              <BookOpen className="h-4 w-4 text-rose-400 group-hover:scale-110 transition shrink-0" />
              {(!isCollapsed || isOpenMobile) && (
                <div className="text-left flex-1 min-w-0">
                  <div className="text-white font-bold truncate">Sổ Chủ Nhiệm (.docx)</div>
                  <div className="text-[10px] text-rose-300/80 truncate">Theo mẫu sổ GVCN</div>
                </div>
              )}
            </button>
          </div>
        )}
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

        {(!isCollapsed || isOpenMobile) && (
          <div className="text-center pt-0.5 text-[10px] text-slate-500 font-mono tracking-tight select-text">
            Phiên bản v{APP_VERSION} • Online
          </div>
        )}
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

      {/* Floating Left-edge Pull Handle for Mobile (Nút ẩn/hiện cạnh trái) */}
      {!isOpenMobile && (
        <button
          type="button"
          onClick={() => setIsOpenMobile(true)}
          className="md:hidden fixed left-0 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center p-2 pl-1 rounded-r-2xl bg-slate-900/90 hover:bg-slate-850 text-slate-300 hover:text-white border-y border-r border-slate-700/80 shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer group"
          title="Mở menu danh mục bên trái (hoặc vuốt từ mép trái màn hình)"
          aria-label="Mở menu cạnh trái"
        >
          <ChevronRight className="h-4 w-4 text-blue-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Mobile Drawer (Ẩn/Hiện cạnh trái với hiệu ứng trượt mượt mà) */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-all duration-300 ${
          isOpenMobile ? 'visible opacity-100 pointer-events-auto' : 'invisible opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpenMobile}
      >
        {/* Backdrop (Nhấp để đóng) */}
        <div
          className={`fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity duration-300 ease-in-out ${
            isOpenMobile ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsOpenMobile(false)}
        />

        {/* Drawer Panel (Trượt mượt mà từ mép trái) */}
        <div
          onTouchStart={handleDrawerTouchStart}
          onTouchEnd={handleDrawerTouchEnd}
          className={`relative w-72 max-w-[85vw] h-full shadow-2xl z-10 transform transition-transform duration-300 ease-out ${
            isOpenMobile ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
};
