import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Plus,
  Users,
  MessageSquareShare,
  FileSpreadsheet,
} from 'lucide-react';
import { TabType } from './Navbar';
import { useApp } from '../context/AppContext';

interface MobileBottomNavProps {
  activeTab: TabType;
  onNavigateTab: (tab: TabType) => void;
  onOpenNewLogModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onNavigateTab,
  onOpenNewLogModal,
}) => {
  const { userRole, inspectorModeClass } = useApp();

  // Hide on public guest portal or inspector mode
  if (userRole === 'guest') return null;

  return (
    <nav
      aria-label="Điều hướng di động"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-2xl safe-bottom print:hidden"
    >
      <div className="flex items-center justify-around px-2 py-1.5 h-16">
        {/* Tab 1: Dashboard */}
        <button
          type="button"
          onClick={() => onNavigateTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <LayoutDashboard className={`h-5 w-5 ${activeTab === 'dashboard' ? 'scale-110' : ''} transition-transform`} />
          <span className="text-[10px] mt-1">Tổng quan</span>
        </button>

        {/* Tab 2: Daily Log */}
        <button
          type="button"
          onClick={() => onNavigateTab('daily-log')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            activeTab === 'daily-log'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <CalendarDays className={`h-5 w-5 ${activeTab === 'daily-log' ? 'scale-110' : ''} transition-transform`} />
          <span className="text-[10px] mt-1">Chấm điểm</span>
        </button>

        {/* Floating Center Action: Plus Button (New Log) */}
        {!inspectorModeClass && (
          <div className="flex-1 flex justify-center -mt-5">
            <button
              type="button"
              onClick={onOpenNewLogModal}
              className="h-12 w-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/35 border-2 border-white dark:border-slate-900 active:scale-95 transition-transform cursor-pointer"
              title="Ghi nhận nề nếp / vi phạm mới"
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Tab 3: Students */}
        <button
          type="button"
          onClick={() => onNavigateTab('students')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            activeTab === 'students'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <Users className={`h-5 w-5 ${activeTab === 'students' ? 'scale-110' : ''} transition-transform`} />
          <span className="text-[10px] mt-1">Học sinh</span>
        </button>

        {/* Tab 4: Zalo Composer / Weekly */}
        <button
          type="button"
          onClick={() => onNavigateTab('zalo-composer')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition cursor-pointer ${
            activeTab === 'zalo-composer'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 dark:text-slate-400 font-medium'
          }`}
        >
          <MessageSquareShare className={`h-5 w-5 ${activeTab === 'zalo-composer' ? 'scale-110' : ''} transition-transform`} />
          <span className="text-[10px] mt-1">Báo Zalo</span>
        </button>
      </div>
    </nav>
  );
};
