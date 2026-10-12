import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  PlusCircle,
  Users,
  CalendarDays,
  FileSpreadsheet,
  CalendarCheck,
  MessageSquareShare,
  Settings,
  Smartphone,
  Sparkles,
  ArrowRight,
  User,
  X,
  RefreshCw,
  UserX,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TabType } from './Navbar';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: TabType) => void;
  onOpenNewLogModal: () => void;
  onSelectStudentForReport?: (studentId: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenNewLogModal,
  onSelectStudentForReport,
}) => {
  const { students, syncLocalToCloud, isCloudSyncing, classConfig } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keyboard shortcut: Ctrl+K or Cmd+K or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open
          const evt = new CustomEvent('open-command-palette');
          window.dispatchEvent(evt);
        }
      } else if (e.key === '/' && !isInput && !isOpen) {
        e.preventDefault();
        const evt = new CustomEvent('open-command-palette');
        window.dispatchEvent(evt);
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter students
  const filteredStudents = students
    .filter(
      (st) =>
        st.fullName.toLowerCase().includes(query.toLowerCase()) ||
        st.studentCode.toLowerCase().includes(query.toLowerCase()) ||
        (st.parentName && st.parentName.toLowerCase().includes(query.toLowerCase()))
    )
    .slice(0, 5);

  // Available Quick Actions
  const actions = [
    {
      id: 'new-log',
      title: 'Thêm ghi nhận nề nếp / vi phạm mới',
      subtitle: 'Phím tắt: N',
      icon: PlusCircle,
      color: 'text-blue-500',
      run: () => {
        onClose();
        onOpenNewLogModal();
      },
    },
    {
      id: 'daily',
      title: 'Nhật ký chấm điểm hàng ngày',
      subtitle: 'Xem & ghi chép vi phạm theo ngày',
      icon: CalendarDays,
      color: 'text-indigo-500',
      run: () => {
        onClose();
        onNavigateTab('daily-log');
      },
    },
    {
      id: 'weekly',
      title: 'Tổng hợp thi đua theo tuần',
      subtitle: 'Bảng xếp hạng & tính điểm tuần',
      icon: FileSpreadsheet,
      color: 'text-emerald-500',
      run: () => {
        onClose();
        onNavigateTab('weekly');
      },
    },
    {
      id: 'monthly',
      title: 'Bảng điểm rèn luyện theo tháng',
      subtitle: 'Tổng kết tháng & chuẩn hóa điểm',
      icon: CalendarCheck,
      color: 'text-purple-500',
      run: () => {
        onClose();
        onNavigateTab('monthly');
      },
    },
    {
      id: 'attendance-report',
      title: 'Báo cáo danh sách học sinh nghỉ học',
      subtitle: 'Chi tiết số buổi nghỉ có phép, không phép, trốn tiết',
      icon: UserX,
      color: 'text-rose-500',
      run: () => {
        onClose();
        onNavigateTab('attendance-report');
      },
    },
    {
      id: 'zalo',
      title: 'Soạn tin nhắn thông báo gửi phụ huynh qua Zalo',
      subtitle: 'Mẫu tin tự động cá nhân hóa cho từng em',
      icon: MessageSquareShare,
      color: 'text-sky-500',
      run: () => {
        onClose();
        onNavigateTab('zalo-composer');
      },
    },
    {
      id: 'sync',
      title: 'Đồng bộ tức thì với CSDL Cloud Firestore',
      subtitle: 'Lưu trữ an toàn trên đám mây',
      icon: RefreshCw,
      color: 'text-emerald-500',
      run: () => {
        syncLocalToCloud();
        onClose();
      },
    },
    {
      id: 'settings',
      title: 'Cài đặt quy chế & sao lưu dữ liệu',
      subtitle: 'Cấu hình tiêu chí, xuất/nhập tệp JSON',
      icon: Settings,
      color: 'text-slate-500',
      run: () => {
        onClose();
        onNavigateTab('settings');
      },
    },
  ].filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh] text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 dark:border-slate-800">
          <Search className="h-5 w-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm học sinh, chức năng, thao tác nhanh... (hoặc gõ tên)"
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-slate-400 text-slate-900 dark:text-white"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
              <span>ESC để đóng</span>
            </div>
          )}
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Quick Actions Group */}
          {actions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Thao tác nhanh
              </div>
              <div className="space-y-0.5">
                {actions.map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={act.run}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-left cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 transition">
                          <Icon className={`h-4 w-4 ${act.color}`} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {act.title}
                          </div>
                          <div className="text-[11px] text-slate-400">{act.subtitle}</div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition group-hover:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Students Group */}
          {filteredStudents.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>Học sinh ({students.length})</span>
                <span className="text-[10px] lowercase text-slate-400">chọn để xem hồ sơ / gửi Zalo</span>
              </div>
              <div className="space-y-0.5">
                {filteredStudents.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onSelectStudentForReport) {
                        onSelectStudentForReport(st.id);
                      } else {
                        onNavigateTab('students');
                      }
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                        {st.firstName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <span>{st.fullName}</span>
                          <span className="text-[10px] font-mono text-slate-400">[{st.studentCode}]</span>
                          {st.parentName && (
                            <span className="text-[10px] font-normal text-slate-500">
                              (PH: {st.parentName})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {st.gender} · {st.dateOfBirth} · PH: {st.parentPhone || 'Chưa có SĐT'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition">
                      Xem hồ sơ →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {actions.length === 0 && filteredStudents.length === 0 && (
            <div className="py-8 text-center text-slate-400">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Không tìm thấy kết quả phù hợp với "{query}"</p>
            </div>
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Lớp: <strong className="text-slate-700 dark:text-slate-300">{classConfig.className}</strong>
            </span>
            <span>·</span>
            <span>
              GVCN: <strong className="text-slate-700 dark:text-slate-300">{classConfig.homeroomTeacher}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Phím tắt:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
              Ctrl+K
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px]">
              /
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
