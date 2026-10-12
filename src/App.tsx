import React, { useState, useEffect } from 'react';
import { currentSchoolYear } from './lib/classScope';
import { AppProvider, useApp } from './context/AppContext';
import { TabType } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ClassWorkspaceSwitcher } from './components/ClassWorkspaceSwitcher';
import { DashboardView } from './components/DashboardView';
import { DailyLogView } from './components/DailyLogView';
import { WeeklySummaryView } from './components/WeeklySummaryView';
import { MonthlySummaryView } from './components/MonthlySummaryView';
import { SemesterView } from './components/SemesterView';
import { AttendanceReportView } from './components/AttendanceReportView';
import { StudentsView } from './components/StudentsView';
import { BehaviorCatalogView } from './components/BehaviorCatalogView';
import { ParentReportView } from './components/ParentReportView';
import { ZaloMessageComposerView } from './components/ZaloMessageComposerView';
import { SettingsBackupView } from './components/SettingsBackupView';
import { EditClassTeacherModal } from './components/EditClassTeacherModal';
import { PublicPortalView } from './components/PublicPortalView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { InspectorBanner } from './components/InspectorBanner';
import { LoginModal } from './components/LoginModal';
import { CommandPalette } from './components/CommandPalette';
import { MobileBottomNav } from './components/MobileBottomNav';

function MainApp() {
  const { classConfig, userRole, activeAccount, isAuthLoading } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return userRole === 'guest' || new URLSearchParams(window.location.search).has('report') ? 'portal' : 'dashboard';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('app_sidebar_collapsed') === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [isNewLogModalOpen, setIsNewLogModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [reportStudentId, setReportStudentId] = useState<string | null>(null);
  const [reportPeriodSelection, setReportPeriodSelection] = useState<import('./lib/weeklyPeriod').ReportPeriodSelection | undefined>();
  const [zaloNavParams, setZaloNavParams] = useState<{
    studentId?: string | null;
    week?: number;
    month?: number;
    mode?: 'week' | 'month';
    templateId?: string;
  } | undefined>();

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem('app_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  // Sync tab with role transitions
  useEffect(() => {
    if (userRole === 'guest') {
      setActiveTab('portal');
    } else if (activeTab === 'portal' && !new URLSearchParams(window.location.search).has('report')) {
      setActiveTab('dashboard');
    }
  }, [userRole]);

  // Prevent teacher from accessing admin panel
  useEffect(() => {
    if (userRole === 'teacher' && activeTab === 'admin') {
      setActiveTab('dashboard');
    }
    if (userRole === 'monitor') {
      if (
        activeTab === 'admin' ||
        activeTab === 'settings' ||
        activeTab === 'zalo-composer' ||
        activeTab === 'parent-report'
      ) {
        setActiveTab('daily-log');
      }
    }
  }, [userRole, activeTab]);

  // Command palette listener
  useEffect(() => {
    const handleOpenCommandPalette = () => setIsCommandPaletteOpen(true);
    window.addEventListener('open-command-palette', handleOpenCommandPalette);
    return () => window.removeEventListener('open-command-palette', handleOpenCommandPalette);
  }, []);

  // Pro-Max Keyboard Shortcuts: Press 'N' to open new log modal
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (isInput) return;

      if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey && userRole !== 'guest') {
        e.preventDefault();
        setIsNewLogModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [userRole]);

  const handleSelectStudentForReport = (studentId: string, period?: import('./lib/weeklyPeriod').ReportPeriodSelection) => {
    setReportPeriodSelection(period);
    setReportStudentId(studentId);
    setActiveTab('parent-report');
  };

  const handleNavigateToZalo = (params?: {
    studentId?: string | null;
    week?: number;
    month?: number;
    mode?: 'week' | 'month';
    templateId?: string;
  }) => {
    if (params) {
      if (params.studentId !== undefined) {
        setReportStudentId(params.studentId);
      }
      setZaloNavParams(params);
    }
    setActiveTab('zalo-composer');
  };

  const handleSelectStudentForZalo = (studentId: string) => {
    handleNavigateToZalo({ studentId });
  };

  if (isAuthLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6" aria-busy="true">
        <div role="status" className="text-center text-slate-600">
          <p className="font-semibold text-slate-800">Trường Cao đẳng nghề số 1 - BQP</p>
          <p className="mt-2">Đang khôi phục phiên đăng nhập…</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans selection:bg-blue-600 selection:text-white">
      {/* ── LEFT COLUMN: Professional Collapsible Sidebar ── */}
      {userRole !== 'guest' && (
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpenMobile={isMobileSidebarOpen}
          setIsOpenMobile={setIsMobileSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          onOpenEditClassTeacherModal={() => setIsEditClassModalOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />
      )}

      {/* ── RIGHT COLUMN: TopBar + Main Views + Footer ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Sticky Inspector Banner for Administrator */}
        <InspectorBanner onNavigateTab={setActiveTab} />

        {/* Top Header Bar */}
        <TopBar
          activeTab={activeTab}
          onOpenNewLogModal={() => setIsNewLogModalOpen(true)}
          onOpenEditClassTeacherModal={() => setIsEditClassModalOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onNavigateTab={setActiveTab}
        />

        {/* Main Content Area */}
        <ClassWorkspaceSwitcher />
        <main key={classConfig.id} className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-24 md:pb-8">
          {/* Level 1: Public Guest Portal */}
          {(userRole === 'guest' || activeTab === 'portal') && (
            <PublicPortalView onOpenLoginModal={() => setIsLoginModalOpen(true)} />
          )}

          {/* Level 2 & 3: Professional Views */}
          {userRole !== 'guest' && activeTab === 'dashboard' && (
            <DashboardView
              onNavigateTab={setActiveTab}
              onSelectStudentForReport={handleSelectStudentForReport}
              onOpenNewLogModal={() => setIsNewLogModalOpen(true)}
              onOpenEditClassTeacherModal={() => setIsEditClassModalOpen(true)}
            />
          )}

          {userRole !== 'guest' && activeTab === 'daily-log' && (
            <DailyLogView
              isModalOpen={isNewLogModalOpen}
              onCloseModal={() => setIsNewLogModalOpen(false)}
              onOpenModal={() => setIsNewLogModalOpen(true)}
            />
          )}

          {userRole !== 'guest' && activeTab === 'weekly' && (
            <WeeklySummaryView
              onNavigateTab={setActiveTab}
              onSelectStudentForReport={handleSelectStudentForReport}
              onNavigateToZalo={handleNavigateToZalo}
            />
          )}

          {userRole !== 'guest' && activeTab === 'monthly' && (
            <MonthlySummaryView
              onNavigateTab={setActiveTab}
              onSelectStudentForReport={handleSelectStudentForReport}
              onNavigateToZalo={handleNavigateToZalo}
            />
          )}

          {userRole !== 'guest' && activeTab === 'semester' && (
            <SemesterView
              onNavigateTab={setActiveTab}
              onSelectStudentForReport={handleSelectStudentForReport}
            />
          )}

          {userRole !== 'guest' && activeTab === 'attendance-report' && (
            <AttendanceReportView
              onNavigateTab={setActiveTab}
              onSelectStudentForReport={handleSelectStudentForReport}
              onNavigateToZalo={handleNavigateToZalo}
            />
          )}

          {userRole !== 'guest' && activeTab === 'students' && (
            <StudentsView
              onNavigateTab={setActiveTab}
              onSelectStudentForReport={handleSelectStudentForReport}
            />
          )}

          {userRole !== 'guest' && activeTab === 'categories' && <BehaviorCatalogView />}

          {userRole !== 'guest' && activeTab === 'parent-report' && (
            <ParentReportView initialSelectedStudentId={reportStudentId} initialPeriod={reportPeriodSelection} />
          )}

          {userRole !== 'guest' && activeTab === 'zalo-composer' && (
            <ZaloMessageComposerView
              initialStudentId={zaloNavParams?.studentId ?? reportStudentId}
              initialWeek={zaloNavParams?.week}
              initialMonth={zaloNavParams?.month}
              initialPeriodMode={zaloNavParams?.mode}
              initialTemplateId={zaloNavParams?.templateId}
              onNavigateTab={setActiveTab}
            />
          )}

          {userRole !== 'guest' && activeTab === 'settings' && <SettingsBackupView />}

          {/* Admin Dashboard */}
          {(userRole === 'admin' || userRole === 'owner') && activeTab === 'admin' && (
            <AdminDashboardView onNavigateTab={setActiveTab} />
          )}

          {/* Global modal for quick log if opened from other views */}
          {userRole !== 'guest' && activeTab !== 'daily-log' && isNewLogModalOpen && (
            <DailyLogView
              isModalOpen={isNewLogModalOpen}
              onCloseModal={() => setIsNewLogModalOpen(false)}
              onOpenModal={() => setIsNewLogModalOpen(true)}
            />
          )}

          {/* Global Modal for Teacher and Class Settings */}
          <EditClassTeacherModal
            isOpen={isEditClassModalOpen}
            onClose={() => setIsEditClassModalOpen(false)}
          />

          {/* Global RBAC Login & Role Switcher Modal */}
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
          />

          {/* Command Palette (Quick Search Ctrl+K) */}
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onNavigateTab={setActiveTab}
            onOpenNewLogModal={() => setIsNewLogModalOpen(true)}
            onSelectStudentForReport={handleSelectStudentForReport}
          />
        </main>

        {/* Ergonomic Mobile Bottom Nav Bar (Thumb-zone UX) - Only for authenticated staff in workspace */}
        {activeAccount && userRole !== 'guest' && activeTab !== 'portal' && (
          <MobileBottomNav
            activeTab={activeTab}
            onNavigateTab={setActiveTab}
            onOpenNewLogModal={() => setIsNewLogModalOpen(true)}
          />
        )}

        {/* Clean Footer with strict role-based information */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3.5 text-center text-xs text-slate-500 print:hidden mb-16 md:mb-0">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              {activeAccount && userRole !== 'guest' && activeTab !== 'portal'
                ? userRole === 'admin' || userRole === 'owner'
                  ? `Trường Cao Đẳng Nghề Số 1 - BQP • Bảng điều khiển quản trị • Năm học ${classConfig.schoolYear || currentSchoolYear()}`
                  : `Sổ Chấm Điểm Hàng Ngày • Lớp ${classConfig.className} • Năm học ${classConfig.schoolYear || currentSchoolYear()} • GVCN: ${classConfig.homeroomTeacher || activeAccount.displayName}`
                : 'Trường Cao Đẳng Nghề Số 1 - Bộ Quốc Phòng • Cổng Thông Tin & Tra Cứu Nề Nếp Học Viên'}
            </span>
            <span className="text-slate-400">
              Hệ thống quản lý nề nếp & thi đua học sinh chuyên nghiệp
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
