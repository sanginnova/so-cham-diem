import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  Send,
  ExternalLink,
  Download,
  RotateCcw,
  Sparkles,
  Calendar,
  Users,
  User,
  AlertTriangle,
  Award,
  Plus,
  Trash2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Search,
  Eye,
  ShieldCheck,
  Settings2,
  Smartphone,
  PhoneCall,
  Smile,
  FileText,
  ListFilter,
  CheckCircle2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import {
  ZaloMessageTemplate,
  DEFAULT_ZALO_TEMPLATES,
  SMART_TAGS,
  TemplateOptions,
  TemplateTarget,
  TemplatePeriod,
  resolveTemplateTags,
  getStoredCustomTemplates,
  saveStoredCustomTemplates,
} from '../lib/zaloMessageTemplates';
import { formatVietnameseDate, formatVietnameseNumber } from '../lib/utils';
import { currentSchoolWeek } from '../lib/weeklyPeriod';
import { TabType } from './Navbar';

interface ZaloMessageComposerViewProps {
  initialStudentId?: string | null;
  initialWeek?: number;
  initialMonth?: number;
  initialPeriodMode?: 'week' | 'month';
  initialTemplateId?: string;
  onNavigateTab?: (tab: TabType) => void;
}

export const ZaloMessageComposerView: React.FC<ZaloMessageComposerViewProps> = ({
  initialStudentId,
  initialWeek,
  initialMonth,
  initialPeriodMode,
  initialTemplateId,
  onNavigateTab,
}) => {
  const {
    classConfig,
    students,
    disciplineLogs,
    getWeeklySummary,
    getMonthlySummary,
  } = useApp();

  const currentSchoolWk = useMemo(() => currentSchoolWeek(classConfig.weeks), [classConfig.weeks]);

  // Period state
  const [periodMode, setPeriodMode] = useState<'week' | 'month'>(() => {
    if (initialPeriodMode) return initialPeriodMode;
    if (initialMonth && !initialWeek) return 'month';
    return 'week';
  });
  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    return initialMonth || currentSchoolWk?.month || 9;
  });
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    return initialWeek || currentSchoolWk?.weekNumber || 1;
  });

  // Target mode: class_group or individual_parent
  const [targetMode, setTargetMode] = useState<TemplateTarget>(
    initialStudentId ? 'individual_parent' : 'class_group'
  );

  // Templates
  const [customTemplates, setCustomTemplates] = useState<ZaloMessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplateId || (periodMode === 'month' ? 'monthly_class_group' : 'weekly_class_group')
  );

  // Load custom templates from localStorage
  useEffect(() => {
    setCustomTemplates(getStoredCustomTemplates());
  }, []);

  // All available templates
  const allTemplates = useMemo(() => {
    return [...DEFAULT_ZALO_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Filter templates matching current target mode
  const targetTemplates = useMemo(() => {
    return allTemplates.filter((t) => t.target === targetMode);
  }, [allTemplates, targetMode]);

  const filteredTemplates = useMemo(() => {
    if (categoryFilter === 'all') return targetTemplates;
    return targetTemplates.filter((t) => t.category === categoryFilter);
  }, [targetTemplates, categoryFilter]);

  // Current template
  const currentTemplate = useMemo(() => {
    const found = allTemplates.find((t) => t.id === selectedTemplateId);
    if (found) return found;
    return targetTemplates[0] || DEFAULT_ZALO_TEMPLATES[0];
  }, [allTemplates, selectedTemplateId, targetTemplates]);

  // Template options
  const [options, setOptions] = useState<TemplateOptions>(() => currentTemplate.defaultOptions);

  // Raw editor content (editable by teacher)
  const [rawContent, setRawContent] = useState<string>(() => currentTemplate.contentTemplate);

  // Sync when initial navigation parameters change
  useEffect(() => {
    if (initialMonth !== undefined) setSelectedMonth(initialMonth);
    if (initialWeek !== undefined) setSelectedWeek(initialWeek);
    if (initialPeriodMode !== undefined) setPeriodMode(initialPeriodMode);
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
      setTargetMode('individual_parent');
    }
    if (initialTemplateId) {
      setSelectedTemplateId(initialTemplateId);
      const match = allTemplates.find((t) => t.id === initialTemplateId);
      if (match) {
        setOptions(match.defaultOptions);
        setRawContent(match.contentTemplate);
        if (match.period === 'week' || match.period === 'month') {
          setPeriodMode(match.period);
        }
      }
    }
  }, [initialMonth, initialWeek, initialPeriodMode, initialStudentId, initialTemplateId, allTemplates]);

  // When switching target mode
  useEffect(() => {
    setCategoryFilter('all');
    if (currentTemplate.target !== targetMode) {
      const match = targetTemplates.find((t) => t.period === periodMode) || targetTemplates[0];
      if (match) {
        setSelectedTemplateId(match.id);
        setOptions(match.defaultOptions);
        setRawContent(match.contentTemplate);
      }
    }
  }, [targetMode]);

  // Select a template: automatically sync periodMode to template.period!
  const handleSelectTemplate = (template: ZaloMessageTemplate) => {
    setSelectedTemplateId(template.id);
    setOptions(template.defaultOptions);
    setRawContent(template.contentTemplate);
    if (template.period === 'week' || template.period === 'month') {
      setPeriodMode(template.period);
    }
  };

  // Switch periodMode: automatically select matching template if needed
  const handleSwitchPeriodMode = (mode: 'week' | 'month') => {
    setPeriodMode(mode);
    if (currentTemplate.period !== mode) {
      const matching = targetTemplates.find((t) => t.period === mode) || targetTemplates[0];
      if (matching) {
        setSelectedTemplateId(matching.id);
        setOptions(matching.defaultOptions);
        setRawContent(matching.contentTemplate);
      }
    }
  };

  // Select month: automatically sync week to a week in that month
  const handleSelectMonth = (newMonth: number) => {
    setSelectedMonth(newMonth);
    const weeksInMonth = classConfig.weeks.filter((w) => w.month === newMonth);
    if (weeksInMonth.length > 0) {
      const currentInMonth = weeksInMonth.some((w) => w.weekNumber === selectedWeek);
      if (!currentInMonth) {
        setSelectedWeek(weeksInMonth[0].weekNumber);
      }
    }
  };

  // Select week: automatically sync month
  const handleSelectWeek = (newWeek: number) => {
    setSelectedWeek(newWeek);
    const weekObj = classConfig.weeks.find((w) => w.weekNumber === newWeek);
    if (weekObj && weekObj.month !== selectedMonth) {
      setSelectedMonth(weekObj.month);
    }
  };

  // Student selection for 1-on-1 mode
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || (students[0]?.id ?? '')
  );
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [studentFilter, setStudentFilter] = useState<'all' | 'deducted' | 'bonus' | 'under8'>('all');

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  // Summaries strictly reactive to disciplineLogs
  const weeklySummaries = useMemo(() => {
    return getWeeklySummary(selectedWeek, selectedMonth);
  }, [getWeeklySummary, selectedWeek, selectedMonth, disciplineLogs]);

  const monthlySummaries = useMemo(() => {
    return getMonthlySummary(selectedMonth);
  }, [getMonthlySummary, selectedMonth, disciplineLogs]);

  // Current summaries based on periodMode
  const currentSummaries = periodMode === 'week' ? weeklySummaries : monthlySummaries;

  const filteredStudentList = useMemo(() => {
    return students.filter((s) => {
      // Search
      const q = studentSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.studentCode.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Filter by condition
      const summary = currentSummaries.find((sum) => sum.studentId === s.id);
      if (studentFilter === 'deducted') {
        return summary && summary.totalDeduct > 0;
      }
      if (studentFilter === 'bonus') {
        return summary && summary.totalBonus > 0;
      }
      if (studentFilter === 'under8') {
        return summary && summary.finalScore < 8.0;
      }
      return true;
    });
  }, [students, studentSearch, studentFilter, currentSummaries]);

  // Student Index Navigation
  const studentIndex = useMemo(() => {
    return students.findIndex((s) => s.id === selectedStudent?.id);
  }, [students, selectedStudent]);

  const handlePrevStudent = () => {
    if (studentIndex > 0) {
      setSelectedStudentId(students[studentIndex - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (studentIndex < students.length - 1) {
      setSelectedStudentId(students[studentIndex + 1].id);
    }
  };

  // Resolved Message Text (live generated with current raw content & options)
  const resolvedMessage = useMemo(() => {
    return resolveTemplateTags({
      templateText: rawContent,
      options,
      classConfig,
      students,
      disciplineLogs,
      weeklySummaries,
      monthlySummaries,
      selectedWeek,
      selectedMonth,
      periodMode,
      selectedStudent: targetMode === 'individual_parent' ? selectedStudent : null,
    });
  }, [
    rawContent,
    options,
    classConfig,
    students,
    disciplineLogs,
    weeklySummaries,
    monthlySummaries,
    selectedWeek,
    selectedMonth,
    periodMode,
    selectedStudent,
    targetMode,
  ]);

  // Copy status
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resolvedMessage);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (e) {
      // Fallback
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      }
    }
  };

  // Open Zalo Web
  const handleOpenZaloWeb = () => {
    window.open('https://chat.zalo.me', '_blank', 'noopener,noreferrer');
  };

  // Download as .txt
  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([resolvedMessage], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    const fileName =
      targetMode === 'class_group'
        ? `Tin_Zalo_Lop_${classConfig.className}_Tuan_${selectedWeek}.txt`
        : `Tin_Zalo_${selectedStudent?.fullName.replace(/\s+/g, '_')}_Tuan_${selectedWeek}.txt`;
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Reset to original template
  const handleResetToTemplate = () => {
    setRawContent(currentTemplate.contentTemplate);
    setOptions(currentTemplate.defaultOptions);
  };

  // Insert Smart Tag at cursor
  const handleInsertTag = (tag: string) => {
    if (!textareaRef.current) {
      setRawContent((prev) => prev + '\n' + tag);
      return;
    }
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = rawContent;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newContent = before + tag + after;
    setRawContent(newContent);

    // Set cursor position after inserted tag
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = start + tag.length;
        textareaRef.current.selectionEnd = start + tag.length;
      }
    }, 50);
  };

  // Insert quick emojis for Zalo
  const handleInsertEmoji = (emoji: string) => {
    handleInsertTag(emoji + ' ');
  };

  // Modal: Save as new custom template
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');

  const handleSaveAsCustomTemplate = () => {
    if (!newTemplateTitle.trim()) return;
    const newCustom: ZaloMessageTemplate = {
      id: `custom_${Date.now()}`,
      title: newTemplateTitle.trim(),
      description: newTemplateDesc.trim() || 'Mẫu tin nhắn tùy chỉnh của giáo viên',
      target: targetMode,
      period: periodMode,
      category: 'custom',
      contentTemplate: rawContent,
      defaultOptions: { ...options },
      isCustom: true,
    };
    const updated = [...customTemplates, newCustom];
    setCustomTemplates(updated);
    saveStoredCustomTemplates(updated);
    setSelectedTemplateId(newCustom.id);
    setIsSaveModalOpen(false);
    setNewTemplateTitle('');
    setNewTemplateDesc('');
  };

  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa mẫu tin nhắn này?')) {
      const updated = customTemplates.filter((t) => t.id !== id);
      setCustomTemplates(updated);
      saveStoredCustomTemplates(updated);
      if (selectedTemplateId === id) {
        setSelectedTemplateId(DEFAULT_ZALO_TEMPLATES[0].id);
        setRawContent(DEFAULT_ZALO_TEMPLATES[0].contentTemplate);
        setOptions(DEFAULT_ZALO_TEMPLATES[0].defaultOptions);
      }
    }
  };

  // Weeks available for selected month
  const availableWeeks = useMemo(() => {
    return classConfig.weeks.filter((w) => w.month === selectedMonth);
  }, [classConfig.weeks, selectedMonth]);

  // Statistics of message
  const messageStats = useMemo(() => {
    const chars = resolvedMessage.length;
    const lines = resolvedMessage.split('\n').length;
    const words = resolvedMessage.trim() ? resolvedMessage.trim().split(/\s+/).length : 0;
    return { chars, lines, words };
  }, [resolvedMessage]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Công Cụ Soạn Tin Nhắn Zalo Tự Động Theo Mẫu</span>
                  <span className="text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                    Kèm số liệu điểm số
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tự động trích xuất điểm rèn luyện, chuyên cần, khen thưởng, nhắc nhở vi phạm • Tùy chỉnh nhanh trước khi sao chép và gửi vào Zalo
                </p>
              </div>
            </div>
          </div>

          {/* Quick Selectors: Target Mode & Period Mode */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Target Mode: Class Group vs Individual */}
            <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTargetMode('class_group')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  targetMode === 'class_group'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Nhóm Zalo lớp</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetMode('individual_parent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  targetMode === 'individual_parent'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                <span>Gửi riêng từng PH</span>
              </button>
            </div>

            {/* Period Mode: Week vs Month */}
            <div className="flex bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleSwitchPeriodMode('week')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  periodMode === 'week'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Tuần
              </button>
              <button
                type="button"
                onClick={() => handleSwitchPeriodMode('month')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  periodMode === 'month'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Tháng
              </button>
            </div>

            {/* Month & Week Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-500 font-medium">Tháng:</span>
              <select
                value={selectedMonth}
                onChange={(e) => handleSelectMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                {classConfig.months.map((m) => (
                  <option key={m} value={m} className="dark:bg-slate-800">
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>

            {periodMode === 'week' && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 font-medium">Tuần:</span>
                <select
                  value={selectedWeek}
                  onChange={(e) => handleSelectWeek(Number(e.target.value))}
                  className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  {availableWeeks.map((w) => (
                    <option key={w.weekNumber} value={w.weekNumber} className="dark:bg-slate-800">
                      Tuần {w.weekNumber}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Template Picker, Editor & Smart Tags (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Template Selection Tabs / Cards */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Bookmark className="h-3.5 w-3.5 text-blue-600" />
                <span>Chọn Mẫu Tin Nhắn ({filteredTemplates.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(true)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                title="Lưu nội dung soạn thảo hiện tại thành mẫu tin nhắn mới"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Lưu làm mẫu riêng</span>
              </button>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {(targetMode === 'class_group'
                ? [
                    { id: 'all', label: 'Tất cả' },
                    { id: 'weekly', label: '📅 Tuần' },
                    { id: 'monthly', label: '📊 Tháng' },
                    { id: 'discipline', label: '🛡️ Kỷ luật' },
                    { id: 'honors', label: '🏆 Tuyên dương' },
                    { id: 'notice', label: '📢 Thông báo' },
                  ]
                : [
                    { id: 'all', label: 'Tất cả' },
                    { id: 'individual', label: '📋 Báo cáo HS' },
                    { id: 'discipline', label: '⚠️ Nhắc nhở' },
                    { id: 'honors', label: '🌟 Thư khen' },
                    { id: 'notice', label: '🤝 Mời trao đổi' },
                  ]
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition text-[11px] ${
                    categoryFilter === cat.id
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredTemplates.map((template) => {
                const isSelected = template.id === currentTemplate.id;
                const getBadge = (cat: string) => {
                  switch (cat) {
                    case 'weekly':
                      return { label: 'Tuần', style: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' };
                    case 'monthly':
                      return { label: 'Tháng', style: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' };
                    case 'discipline':
                      return { label: 'Kỷ luật', style: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300' };
                    case 'honors':
                      return { label: 'Tuyên dương', style: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' };
                    case 'notice':
                      return { label: 'Thông báo', style: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300' };
                    case 'individual':
                      return { label: 'Gửi riêng', style: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' };
                    default:
                      return { label: 'Tự tạo', style: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
                  }
                };
                const badge = getBadge(template.category);

                return (
                  <div
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-blue-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.style}`}>
                          {badge.label}
                        </span>
                        {template.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomTemplate(template.id, e)}
                            className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition"
                            title="Xóa mẫu tự tạo này"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {template.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student Picker (When in Individual Parent Mode) */}
          {targetMode === 'individual_parent' && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  <span>Chọn Học Sinh Để Gửi Riêng ({filteredStudentList.length}/{students.length})</span>
                </span>

                {/* Quick Prev / Next Navigator */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevStudent}
                    disabled={studentIndex <= 0}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-700 dark:text-slate-300"
                    title="Học sinh trước"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md font-mono">
                    {studentIndex + 1}/{students.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextStudent}
                    disabled={studentIndex >= students.length - 1}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 disabled:opacity-30 rounded-lg text-slate-700 dark:text-slate-300"
                    title="Học sinh kế tiếp"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Search & Condition Filter */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc mã học sinh..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setStudentFilter('all')}
                    className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                      studentFilter === 'all'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFilter('deducted')}
                    className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                      studentFilter === 'deducted'
                        ? 'bg-rose-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    title="Chỉ hiện học sinh bị trừ điểm / có lỗi"
                  >
                    Có lỗi vi phạm
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFilter('bonus')}
                    className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                      studentFilter === 'bonus'
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    title="Chỉ hiện học sinh có điểm cộng khen thưởng"
                  >
                    Có điểm cộng
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentFilter('under8')}
                    className={`px-2 py-1 rounded-lg font-medium whitespace-nowrap transition ${
                      studentFilter === 'under8'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    title="Điểm dưới 8.0 cần gia đình đôn đốc"
                  >
                    Điểm &lt; 8.0
                  </button>
                </div>
              </div>

              {/* Student Scrollable List */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {filteredStudentList.map((s) => {
                  const isCur = s.id === selectedStudent?.id;
                  const sum = currentSummaries.find((sum) => sum.studentId === s.id);
                  const score = sum ? formatVietnameseNumber(sum.finalScore) : '10.0';
                  const hasDeduct = sum && sum.totalDeduct > 0;
                  const hasBonus = sum && sum.totalBonus > 0;

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`p-2 rounded-xl text-left transition text-xs border flex flex-col justify-between ${
                        isCur
                          ? 'border-blue-600 bg-blue-600 text-white font-bold shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="truncate w-full font-medium">{s.fullName}</div>
                      <div className="flex items-center justify-between text-[10px] mt-1 opacity-90 font-mono">
                        <span>{score}đ</span>
                        <div className="flex items-center gap-1">
                          {hasBonus && <span className={isCur ? 'text-white' : 'text-emerald-500'}>+</span>}
                          {hasDeduct && <span className={isCur ? 'text-white' : 'text-rose-500'}>-</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Current Student Selected Highlight Card */}
              {selectedStudent && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedStudent.fullName}
                    </span>
                    <span className="text-slate-400 font-mono">({selectedStudent.studentCode})</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <PhoneCall className="h-3 w-3 text-emerald-500" />
                      <span>PH: {selectedStudent.parentPhone || 'Chưa cập nhật'}</span>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Option Checkboxes */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5 text-blue-600" />
              <span>Tùy Chọn Hiển Thị Số Liệu Nhanh</span>
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includeHonors}
                  onChange={(e) => setOptions({ ...options, includeHonors: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>Kèm khen thưởng</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includeViolations}
                  onChange={(e) => setOptions({ ...options, includeViolations: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>Kèm nhắc nhở vi phạm</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none" title="Chỉ hiện mã HS hoặc viết tắt họ tên để giữ tế nhị khi gửi nhóm Zalo lớp đông phụ huynh">
                <input
                  type="checkbox"
                  checked={options.maskViolationNames}
                  onChange={(e) => setOptions({ ...options, maskViolationNames: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-amber-700 dark:text-amber-400 font-medium">Ẩn tên HS vi phạm</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includeNextWeekPlan}
                  onChange={(e) => setOptions({ ...options, includeNextWeekPlan: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>Kế hoạch tuần tới</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={options.includeTeacherContact}
                  onChange={(e) => setOptions({ ...options, includeTeacherContact: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>Thông tin & SĐT GVCN</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none" title="Chèn thêm bảng điểm tóm tắt của cả lớp ở cuối tin nhắn">
                <input
                  type="checkbox"
                  checked={options.includeMiniScoreTable}
                  onChange={(e) => setOptions({ ...options, includeMiniScoreTable: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-blue-700 dark:text-blue-400 font-medium">Bảng điểm cả lớp</span>
              </label>
            </div>

            {/* Custom Next Week Plan / Extra Note Input */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Kế hoạch trọng tâm / Dặn dò bổ sung từ GVCN (thay thế cho thẻ &#123;ke_hoach_tuan_toi&#125;):
              </label>
              <input
                type="text"
                placeholder="vd: Chú ý nề nếp tác phong quân sự, mang đúng đồng phục bảo hộ xưởng thực hành, đúng giờ..."
                value={options.customNextWeekPlan || ''}
                onChange={(e) => setOptions({ ...options, customNextWeekPlan: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Smart Tags Toolbar: Insert Variables into Cursor */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Thanh Chèn Số Liệu Thông Minh (Bấm để chèn vào vị trí con trỏ)</span>
              </span>
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {['📊', '⭐', '🏆', '📌', '⚠️', '🎖️', '🔔', '💬', '👏', '👨‍🏫', '📢', '✅'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleInsertEmoji(emoji)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-xs transition"
                    title={`Chèn biểu tượng ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {SMART_TAGS.map((tagItem) => {
                // If in class_group mode, hide individual student specific tags to avoid clutter
                if (targetMode === 'class_group' && tagItem.category === 'student') {
                  return null;
                }
                // If in individual mode, hide whole class list tags
                if (targetMode === 'individual_parent' && (tagItem.tag === '{bang_diem_rut_gon}' || tagItem.tag === '{bang_diem_top_10}')) {
                  return null;
                }

                return (
                  <button
                    key={tagItem.tag}
                    type="button"
                    onClick={() => handleInsertTag(tagItem.tag)}
                    className="px-2 py-1 bg-slate-100 hover:bg-blue-50 dark:bg-slate-700 dark:hover:bg-blue-950/60 text-slate-700 hover:text-blue-700 dark:text-slate-300 dark:hover:text-blue-300 rounded-lg text-[11px] font-mono border border-slate-200 dark:border-slate-600 transition flex items-center gap-1 group active:scale-95"
                    title={`${tagItem.description} (${tagItem.tag})`}
                  >
                    <span>{tagItem.label}</span>
                    <span className="text-slate-400 group-hover:text-blue-500 text-[9px]">{tagItem.tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Editor Area */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                <span>Nội Dung Mẫu Tin Nhắn (Có Thể Chỉnh Sửa Trực Tiếp)</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToTemplate}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                  title="Khôi phục lại nội dung mẫu ban đầu"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Khôi phục mẫu</span>
                </button>
              </div>
            </div>

            <textarea
              ref={textareaRef}
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
              rows={12}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-sans leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Nhập nội dung tin nhắn hoặc chèn các thẻ biến số {ten_lop}, {diem_tb_lop}..."
            />

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Mẹo: Bạn có thể sửa đổi bất kỳ câu chữ nào ở ô trên, bản xem trước bên phải sẽ cập nhật tức thì.</span>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(true)}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                Lưu làm mẫu của tôi
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Realistic Zalo Live Preview & Quick Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          {/* Action Header Card with Big Copy Button */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                <span>Xem Trước Tin Nhắn Zalo</span>
              </span>

              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>{messageStats.chars} ký tự</span>
                <span>•</span>
                <span>{messageStats.lines} dòng</span>
              </div>
            </div>

            {/* Primary Action Button: COPY TO CLIPBOARD */}
            <button
              type="button"
              onClick={handleCopy}
              className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 ${
                copySuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  : 'bg-[#0068FF] hover:bg-[#0052cc] text-white shadow-blue-500/25'
              }`}
            >
              {copySuccess ? (
                <>
                  <Check className="h-5 w-5 animate-scale" />
                  <span>ĐÃ SAO CHÉP VÀO BỘ NHỚ TẠM!</span>
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  <span>SAO CHÉP TIN NHẮN ĐỂ GỬI ZALO</span>
                </>
              )}
            </button>

            {/* 1-Touch Zalo Direct Open for Individual Parent */}
            {targetMode === 'individual_parent' && selectedStudent?.parentPhone && (
              <button
                type="button"
                onClick={() => {
                  handleCopy();
                  const cleanPhone = (selectedStudent.parentPhone || '').replace(/\D/g, '');
                  if (cleanPhone) window.open(`https://zalo.me/${cleanPhone}`, '_blank');
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white active:scale-98 cursor-pointer"
                title="Tự động sao chép tin nhắn và mở thẳng Zalo cá nhân của phụ huynh học sinh này"
              >
                <ExternalLink className="h-4 w-4" />
                <span>1-Chạm: Mở Chat Zalo Với PH ({selectedStudent.parentPhone})</span>
              </button>
            )}

            {/* Secondary Action Buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={handleOpenZaloWeb}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                title="Mở Zalo Web (chat.zalo.me) để dán tin nhắn vào nhóm lớp"
              >
                <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                <span>Mở Zalo Web</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTxt}
                className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                title="Tải file text (.txt) về máy để lưu trữ hoặc nộp báo cáo"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>Tải file .txt</span>
              </button>
            </div>
          </div>

          {/* Realistic Zalo Phone / Chat Bubble Preview Container */}
          <div className="rounded-2xl border border-slate-300 dark:border-slate-700 overflow-hidden shadow-lg bg-[#EBF0F5] dark:bg-slate-900">
            {/* Zalo Blue Navigation Bar */}
            <div className="bg-[#0068FF] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs uppercase border border-white/30">
                  {targetMode === 'class_group' ? 'L' : 'PH'}
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                    <span>
                      {targetMode === 'class_group'
                        ? `Nhóm Zalo: Lớp ${classConfig.className}`
                        : `PH em ${selectedStudent?.fullName || 'Học sinh'}`}
                    </span>
                  </h4>
                  <p className="text-[10px] text-blue-100 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Hoạt động vừa xong • Zalo Chat</span>
                  </p>
                </div>
              </div>

              <div className="text-[11px] font-semibold bg-white/10 px-2 py-0.5 rounded-md border border-white/20">
                Lớp {classConfig.className}
              </div>
            </div>

            {/* Chat Body & Bubble */}
            <div className="p-4 space-y-3 max-h-[580px] overflow-y-auto">
              {/* Date stamp */}
              <div className="flex justify-center">
                <span className="text-[10px] bg-slate-300/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-medium">
                  {periodMode === 'week' ? `Tổng kết Tuần ${selectedWeek}` : `Tổng kết Tháng ${selectedMonth}`}
                </span>
              </div>

              {/* Message Bubble */}
              <div className="flex items-start gap-2 max-w-full">
                <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center text-[10px] font-bold shadow-xs">
                  GV
                </div>

                <div className="flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 p-3.5 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200/80 dark:border-slate-700/80 text-xs sm:text-[13px] leading-relaxed select-text whitespace-pre-wrap font-sans break-words">
                  {resolvedMessage}

                  {/* Timestamp in bubble */}
                  <div className="flex justify-end items-center gap-1 text-[10px] text-slate-400 mt-2 select-none">
                    <span>Vừa xong</span>
                    <CheckCircle2 className="h-2.5 w-2.5 text-blue-500 inline" />
                  </div>
                </div>
              </div>
            </div>

            {/* Zalo Input Box Mock Footer */}
            <div className="bg-white dark:bg-slate-850 px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate">Nhập tin nhắn tới nhóm Zalo...</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="p-1 hover:text-blue-600 transition"
                  title="Sao chép nội dung"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Guidance Card */}
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 text-xs text-blue-900 dark:text-blue-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
              <span>Quy trình gửi tin Zalo 3 bước cực nhanh:</span>
            </div>
            <ol className="list-decimal list-inside space-y-0.5 text-[11px] opacity-90 pl-1">
              <li>Chọn tuần/tháng và xem nội dung số liệu tự sinh.</li>
              <li>Bấm nút <strong>"SAO CHÉP TIN NHẮN ĐỂ GỬI ZALO"</strong>.</li>
              <li>Mở Zalo trên máy tính/điện thoại và nhấn <strong>Ctrl + V</strong> (Dán) để gửi ngay!</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Modal: Save Custom Template */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-blue-600" />
              <span>Lưu Nội Dung Thành Mẫu Riêng Của Bạn</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên mẫu tin nhắn:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Mẫu báo cáo thi đua tuần riêng của cô Lan"
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả ngắn gọn (tùy chọn):
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Dùng gửi vào chiều thứ Sáu hàng tuần"
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAsCustomTemplate}
                disabled={!newTemplateTitle.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition shadow-sm"
              >
                Lưu mẫu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
