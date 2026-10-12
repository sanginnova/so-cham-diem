import React from 'react';
import { Eye, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TabType } from './Navbar';

interface InspectorBannerProps {
  onNavigateTab: (tab: TabType) => void;
}

export const InspectorBanner: React.FC<InspectorBannerProps> = ({ onNavigateTab }) => {
  const { inspectorModeClass, exitInspectorMode } = useApp();

  if (!inspectorModeClass) return null;

  const handleExit = () => {
    exitInspectorMode();
    onNavigateTab('admin');
  };

  return (
    <div className="bg-amber-500 text-slate-950 px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-semibold sticky top-0 z-40 animate-pulse-subtle">
      <div className="flex items-center gap-2 max-w-4xl truncate">
        <span className="p-1 bg-slate-950 text-amber-400 rounded-md">
          <Eye className="h-4 w-4" />
        </span>
        <span className="font-bold tracking-wide uppercase">
          CHẾ ĐỘ THANH TRA CHUYÊN MÔN:
        </span>
        <span className="truncate">
          Đang kiểm tra sổ lớp <strong>{inspectorModeClass.className}</strong> (GVCN: {inspectorModeClass.teacherName})
        </span>
        <span className="hidden md:inline px-2 py-0.5 rounded-full bg-slate-900/10 text-[11px] font-mono">
          Chỉ xem • Không ghi đè
        </span>
      </div>

      <button
        type="button"
        onClick={handleExit}
        className="px-3 py-1 bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 ml-2 cursor-pointer whitespace-nowrap active:scale-95"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Quay về Quản Trị Hệ Thống</span>
      </button>
    </div>
  );
};
