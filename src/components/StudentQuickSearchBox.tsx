import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Users, ArrowRight, CornerDownLeft } from 'lucide-react';
import { removeVietnameseAccents, getRankBadgeClass } from '../lib/utils';
import type { RankLevel } from '../types';

export interface StudentQuickSearchItem {
  studentId: string;
  studentCode: string;
  fullName: string;
  finalScore?: number;
  rank?: string;
  violationCount?: number;
  unexcusedAbsenceCount?: number;
  excusedAbsenceCount?: number;
}

interface StudentQuickSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  students: StudentQuickSearchItem[];
  placeholder?: string;
  totalCount: number;
  matchedCount: number;
  hasActiveFilters?: boolean;
  onClearAllFilters?: () => void;
  onSelectStudent?: (studentId: string) => void;
  className?: string;
}

/**
 * Tách và làm nổi bật phần chữ khớp với từ khóa tìm kiếm (hỗ trợ tiếng Việt có dấu và không dấu)
 */
function highlightMatch(fullName: string, query: string): React.ReactNode {
  if (!query.trim()) return fullName;
  const normName = removeVietnameseAccents(fullName.toLowerCase());
  const normQ = removeVietnameseAccents(query.trim().toLowerCase());
  const idx = normName.indexOf(normQ);
  if (idx === -1) return fullName;

  const matchLen = normQ.length;
  const before = fullName.slice(0, idx);
  const match = fullName.slice(idx, idx + matchLen);
  const after = fullName.slice(idx + matchLen);

  return (
    <span>
      {before}
      <span className="bg-amber-200 dark:bg-amber-900/80 text-amber-950 dark:text-amber-100 font-black px-0.5 rounded">
        {match}
      </span>
      {after}
    </span>
  );
}

export const StudentQuickSearchBox: React.FC<StudentQuickSearchBoxProps> = ({
  value,
  onChange,
  students,
  placeholder = 'Tìm nhanh học sinh (nhập họ, tên, mã HS)...',
  totalCount,
  matchedCount,
  hasActiveFilters = false,
  onClearAllFilters,
  onSelectStudent,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Đóng gợi ý khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Danh sách gợi ý các học sinh khớp với từ khóa (tối đa 8 học sinh)
  const suggestions = useMemo(() => {
    const q = value.trim();
    if (!q) return [];
    const normQ = removeVietnameseAccents(q.toLowerCase());
    const rawQ = q.toLowerCase();

    return students
      .filter((s) => {
        const normName = removeVietnameseAccents(s.fullName.toLowerCase());
        const rawName = s.fullName.toLowerCase();
        const code = (s.studentCode || '').toLowerCase();
        return normName.includes(normQ) || rawName.includes(rawQ) || code.includes(rawQ);
      })
      .slice(0, 8);
  }, [students, value]);

  // Reset highlightedIndex khi danh sách gợi ý thay đổi
  useEffect(() => {
    setHighlightedIndex(suggestions.length > 0 ? 0 : -1);
  }, [suggestions]);

  const handleSelect = (student: StudentQuickSearchItem) => {
    onChange(student.fullName);
    setIsOpen(false);
    if (onSelectStudent) {
      onSelectStudent(student.studentId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && value.trim()) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isSearching = Boolean(value.trim());

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 ${className}`}>
      {/* Box tìm kiếm nhanh & Gợi ý dropdown */}
      <div ref={containerRef} className="relative flex-1 min-w-[260px] max-w-xl">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => {
              if (value.trim()) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-9 pr-9 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-650 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition shadow-2xs"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Xóa ô tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Floating Autocomplete Suggestions Dropdown */}
        {isOpen && isSearching && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-98 duration-100">
            <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/60 dark:bg-slate-900/40">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-600" />
                <span>Gợi ý học sinh ({suggestions.length})</span>
              </span>
              <span className="text-[10px] lowercase font-normal opacity-70">
                nhập họ, tên hoặc mã HS
              </span>
            </div>

            {suggestions.length > 0 ? (
              <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {suggestions.map((s, index) => {
                  const isHighlighted = highlightedIndex === index;
                  const rankBadge = s.rank ? getRankBadgeClass(s.rank as RankLevel) : null;

                  return (
                    <div
                      key={s.studentId}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => handleSelect(s)}
                      className={`px-3 py-2 flex items-center justify-between gap-3 cursor-pointer transition select-none ${
                        isHighlighted
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-950 dark:text-blue-100'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-750 flex items-center justify-center text-[10px] font-bold font-mono text-slate-600 dark:text-slate-300 shrink-0">
                          {s.studentCode ? s.studentCode.split('-').pop() : index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs sm:text-sm truncate">
                            {highlightMatch(s.fullName, value)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {s.studentCode}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Violations or absences if any */}
                        {(s.unexcusedAbsenceCount || 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200">
                            {s.unexcusedAbsenceCount} KP
                          </span>
                        )}
                        {(s.excusedAbsenceCount || 0) > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            {s.excusedAbsenceCount} P
                          </span>
                        )}

                        {/* Final Score */}
                        {s.finalScore !== undefined && (
                          <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white font-mono">
                            {s.finalScore.toFixed(1).replace('.0', '')}đ
                          </span>
                        )}

                        {/* Rank Badge */}
                        {s.rank && rankBadge && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${rankBadge.bg} ${rankBadge.text} ${rankBadge.border}`}
                          >
                            {s.rank}
                          </span>
                        )}

                        <ArrowRight
                          className={`h-3.5 w-3.5 transition-transform ${
                            isHighlighted ? 'text-blue-600 translate-x-0.5' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                Không tìm thấy học sinh nào khớp với từ khóa &ldquo;<strong>{value}</strong>&rdquo;
              </div>
            )}

            {/* Bottom Keyboard Hint */}
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between bg-slate-50/40 dark:bg-slate-900/40">
              <span className="flex items-center gap-1">
                <span>Dùng phím</span>
                <kbd className="px-1 py-0.2 bg-slate-200 dark:bg-slate-700 rounded text-[9px] font-mono">↑</kbd>
                <kbd className="px-1 py-0.2 bg-slate-200 dark:bg-slate-700 rounded text-[9px] font-mono">↓</kbd>
                <span>để chọn</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.2 bg-slate-200 dark:bg-slate-700 rounded text-[9px] font-mono flex items-center gap-0.5">
                  <CornerDownLeft className="h-2.5 w-2.5" /> Enter
                </kbd>
                <span>chọn nhanh</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Thông tin kết quả & Nút xóa toàn bộ bộ lọc */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        {isSearching && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">
            <span>Tìm thấy:</span>
            <span className="font-mono text-blue-800 dark:text-blue-200">
              {matchedCount}/{totalCount} HS
            </span>
          </span>
        )}

        {(hasActiveFilters || isSearching) && onClearAllFilters && (
          <button
            type="button"
            onClick={onClearAllFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold border border-rose-200 dark:border-rose-800 transition cursor-pointer"
            title="Xóa tìm kiếm và đặt lại tất cả bộ lọc về mặc định"
          >
            <X className="h-3.5 w-3.5" />
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>
    </div>
  );
};

