import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  X,
  Copy,
  Download,
  Check,
  Share2,
  Sparkles,
  Award,
  Users,
  Eye,
  EyeOff,
  MessageSquare,
  FileText,
  AlertCircle,
  Trophy,
  ExternalLink,
  Smartphone,
  Columns2,
  List,
  Palette,
  MousePointerClick,
  RefreshCw,
} from 'lucide-react';
import { toBlob, toPng } from 'html-to-image';
import { formatVietnameseDate, formatVietnameseNumber } from '../lib/utils';
import { RankLevel } from '../types';
import {
  copyBlobToClipboard,
  downloadBlob,
  openZaloWeb,
  shareImageFile,
} from '../lib/zaloExportHelper';

export interface ZaloExportStudentRow {
  stt: number;
  studentCode: string;
  fullName: string;
  dateOfBirth?: string;
  violationCount?: number;
  totalDeduct?: number;
  totalBonus?: number;
  achievementBonus?: number;
  achievements?: string[];
  finalScore: number;
  rank: RankLevel;
  notes?: string;
  monthlyScores?: Record<number, number | null>;
}

export interface SummaryZaloExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodType: 'weekly' | 'monthly' | 'semester';
  periodTitle: string; // e.g., "Tuần 1", "Tháng 9", "Học kỳ 1"
  periodTimeInfo?: string; // e.g., "Từ 05/09/2025 đến 11/09/2025"
  className: string;
  schoolYear: string;
  homeroomTeacher: string;
  stats: {
    totalStudents: number;
    avgScore: number;
    excellentCount: number;
    goodCount: number;
    fairCount: number;
    mediumCount: number;
    weakCount: number;
    totalViolations?: number;
    totalDeduct?: number;
    totalBonus?: number;
    totalAchievementBonus?: number;
  };
  students: ZaloExportStudentRow[];
  semesterMonths?: number[];
}

export const SummaryZaloExportModal: React.FC<SummaryZaloExportModalProps> = ({
  isOpen,
  onClose,
  periodType,
  periodTitle,
  periodTimeInfo,
  className,
  schoolYear,
  homeroomTeacher,
  stats,
  students,
  semesterMonths,
}) => {
  const exportCardRef = useRef<HTMLDivElement>(null);

  // Layout mode: 'two-column' (recommended for Zalo mobile), 'single-column' (full detail), 'honors' (top only)
  const [layoutMode, setLayoutMode] = useState<'two-column' | 'single-column' | 'honors'>('two-column');
  const [themeColor, setThemeColor] = useState<'blue' | 'emerald' | 'amber'>('blue');
  const [showScoreDetails, setShowScoreDetails] = useState<boolean>(true);
  const [showStatsCard, setShowStatsCard] = useState<boolean>(true);
  const [includeTeacherNote, setIncludeTeacherNote] = useState<boolean>(true);

  // Status & capture state
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [clipboardBlocked, setClipboardBlocked] = useState<boolean>(false);
  const [textCopied, setTextCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generated image data
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const [renderedBlob, setRenderedBlob] = useState<Blob | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'result'>('preview');

  // Teacher note
  const defaultTeacherNote = useMemo(() => {
    if (periodType === 'weekly') {
      return `Kính gửi Quý Phụ huynh lớp ${className}! Đây là bảng tổng kết điểm nề nếp rèn luyện tuần vừa qua của các em học sinh. Kính mong Quý Phụ huynh luôn phối hợp, đồng hành nhắc nhở và động viên các con giữ vững nề nếp, tích cực phát huy các ưu điểm trong tuần tới!`;
    }
    if (periodType === 'monthly') {
      return `Kính gửi Quý Phụ huynh lớp ${className}! Giáo viên chủ nhiệm trân trọng gửi tới Quý Phụ huynh kết quả rèn luyện trong ${periodTitle}. Chúc mừng các em học sinh có thành tích xuất sắc và mong các con tiếp tục nỗ lực rèn luyện tốt trong tháng tiếp theo!`;
    }
    return `Kính gửi Quý Phụ huynh lớp ${className}! Giáo viên chủ nhiệm trân trọng gửi tới Quý Phụ huynh bảng tổng kết đánh giá điểm rèn luyện ${periodTitle} - Năm học ${schoolYear}. Chân thành cảm ơn sự tin tưởng, đồng hành của Quý Phụ huynh suốt kỳ học qua!`;
  }, [periodType, className, periodTitle, schoolYear]);

  const [teacherNote, setTeacherNote] = useState<string>(defaultTeacherNote);
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);

  // Reset states when opened & pre-render in background
  useEffect(() => {
    if (isOpen) {
      setTeacherNote(defaultTeacherNote);
      setCopySuccess(false);
      setClipboardBlocked(false);
      setErrorMessage(null);
      setRenderedImageUrl(null);
      setRenderedBlob(null);
      setActiveTab('preview');

      // Pre-render image in background so blob is immediately available on click
      const timer = setTimeout(() => {
        renderCardToImage().catch((err) => console.warn('Pre-rendering failed:', err));
      }, 120);

      return () => clearTimeout(timer);
    }
  }, [isOpen, defaultTeacherNote, layoutMode, themeColor, showScoreDetails, showStatsCard, includeTeacherNote]);

  // Clean up URL object on unmount
  useEffect(() => {
    return () => {
      if (renderedImageUrl) {
        URL.revokeObjectURL(renderedImageUrl);
      }
    };
  }, [renderedImageUrl]);

  if (!isOpen) return null;

  // Filter students based on layoutMode
  const displayedStudents =
    layoutMode === 'honors'
      ? students.filter(
          (s) =>
            s.rank === 'Xuất sắc' ||
            s.rank === 'Tốt' ||
            (s.achievements && s.achievements.length > 0)
        )
      : students;

  const typeLabel =
    periodType === 'weekly' ? 'Tuần' : periodType === 'monthly' ? 'Tháng' : 'Học kỳ';

  const generateFileName = () => {
    const safeTitle = periodTitle.replace(/\s+/g, '_');
    return `Tong_ket_${typeLabel}_${safeTitle}_Lop_${className}_${schoolYear}`.replace(
      /[^a-zA-Z0-9_-]/g,
      ''
    );
  };

  // Helper to generate the image from DOM
  const renderCardToImage = async (): Promise<{ blob: Blob; dataUrl: string } | null> => {
    if (!exportCardRef.current) return null;

    // Small delay to ensure all DOM styles are painted
    await new Promise((resolve) => setTimeout(resolve, 60));

    const pixelRatio = 2; // Crisp high-DPI for Zalo mobile screens
    const blob = await toBlob(exportCardRef.current, {
      pixelRatio,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
    });

    if (!blob) throw new Error('Không thể tạo file ảnh từ giao diện.');

    const dataUrl = await toPng(exportCardRef.current, {
      pixelRatio,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
    });

    setRenderedBlob(blob);
    setRenderedImageUrl(dataUrl);

    return { blob, dataUrl };
  };

  // 1. Sao chép hình ảnh vào clipboard (để paste trực tiếp vào Zalo: Ctrl + V)
  const handleCopyImage = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);
      setErrorMessage(null);
      setClipboardBlocked(false);
      setCopySuccess(false);

      // Render image if not yet available
      let currentBlob = renderedBlob;
      let currentDataUrl = renderedImageUrl;
      if (!currentBlob || !currentDataUrl) {
        const result = await renderCardToImage();
        if (!result) throw new Error('Không tìm thấy khung nội dung để tạo ảnh.');
        currentBlob = result.blob;
        currentDataUrl = result.dataUrl;
      }

      // Copy to clipboard with multi-layer fallback (ClipboardItem + DOM Selection + Copy Event)
      const clipResult = await copyBlobToClipboard(currentBlob, currentDataUrl);

      if (clipResult.success) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 8000);
      } else {
        // Fallback: auto-download so the user already has the PNG in their hands
        downloadBlob(currentBlob, generateFileName());
        setClipboardBlocked(true);
        setActiveTab('result'); // Switch to result tab so user can right-click or drag
      }
    } catch (err: any) {
      console.error('Failed to copy image:', err);
      setErrorMessage('Có lỗi xảy ra khi tạo hình ảnh: ' + (err?.message || 'Vui lòng thử lại.'));
    } finally {
      setIsCapturing(false);
    }
  };

  // 2. Tải hình ảnh PNG về máy
  const handleDownload = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);
      setErrorMessage(null);

      let currentBlob = renderedBlob;
      if (!currentBlob) {
        const result = await renderCardToImage();
        if (!result) throw new Error('Không tìm thấy khung nội dung để tạo ảnh.');
        currentBlob = result.blob;
      }

      downloadBlob(currentBlob, generateFileName());
    } catch (err: any) {
      console.error('Failed to download image:', err);
      setErrorMessage('Không thể tải ảnh về máy: ' + (err?.message || 'Vui lòng thử lại.'));
    } finally {
      setIsCapturing(false);
    }
  };

  // 3. Chia sẻ qua Web Share API (đặc biệt hữu ích trên điện thoại để mở thẳng app Zalo)
  const handleShareMobile = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);
      let currentBlob = renderedBlob;
      if (!currentBlob) {
        const result = await renderCardToImage();
        if (!result) return;
        currentBlob = result.blob;
      }

      const shared = await shareImageFile(
        currentBlob,
        generateFileName(),
        `Tổng kết rèn luyện ${periodTitle} - Lớp ${className}`,
        `Bảng tổng kết thi đua nề nếp ${periodTitle} lớp ${className}`
      );

      if (!shared) {
        // Fallback to copy or download
        handleCopyImage();
      }
    } catch (err) {
      console.warn('Share error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // 4. Sao chép tin nhắn văn bản tóm tắt để gửi kèm ảnh vào Zalo
  const handleCopyTextCaption = () => {
    const text = [
      `📢 [BÁO CÁO TỔNG KẾT RÈN LUYỆN ${periodTitle.toUpperCase()} - LỚP ${className.toUpperCase()}]`,
      `🏫 Năm học: ${schoolYear} | GVCN: ${homeroomTeacher || 'GVCN'}`,
      periodTimeInfo ? `🗓️ Thời gian: ${periodTimeInfo}` : '',
      `---------------------------------`,
      `📊 KẾT QUẢ CHUNG:`,
      `• Sĩ số: ${stats.totalStudents} học sinh`,
      `• Điểm trung bình cả lớp: ${formatVietnameseNumber(stats.avgScore)} điểm`,
      `• Đạt Xuất sắc: ${stats.excellentCount} HS | Đạt Tốt: ${stats.goodCount} HS`,
      stats.fairCount > 0 ? `• Đạt Khá: ${stats.fairCount} HS` : '',
      stats.mediumCount > 0 ? `• Trung bình: ${stats.mediumCount} HS` : '',
      stats.weakCount > 0 ? `• Cần cố gắng: ${stats.weakCount} HS` : '',
      stats.totalBonus ? `• Tổng điểm thưởng thi đua: +${formatVietnameseNumber(stats.totalBonus)}đ` : '',
      stats.totalDeduct ? `• Tổng điểm trừ nề nếp: -${formatVietnameseNumber(stats.totalDeduct)}đ` : '',
      stats.totalAchievementBonus
        ? `• Thưởng thành tích: +${formatVietnameseNumber(stats.totalAchievementBonus)}đ`
        : '',
      `---------------------------------`,
      includeTeacherNote && teacherNote
        ? `💬 LỜI NHẮN GVCN:\n"${teacherNote}"\n---------------------------------`
        : '',
      `📌 (Kính mời Quý Phụ huynh xem chi tiết điểm và xếp loại từng học sinh trong hình ảnh đính kèm bên dưới).`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(text);
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 4000);
  };

  // Colors & theme styling variables
  const themeClasses = {
    blue: {
      headerBg: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800',
      badgeBg: 'bg-blue-600',
      bannerBg: 'bg-blue-50 border-blue-200 text-blue-900',
      borderMain: 'border-blue-600',
      accentText: 'text-blue-700',
      kpiBorder: 'border-blue-200',
    },
    emerald: {
      headerBg: 'bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800',
      badgeBg: 'bg-emerald-600',
      bannerBg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      borderMain: 'border-emerald-600',
      accentText: 'text-emerald-700',
      kpiBorder: 'border-emerald-200',
    },
    amber: {
      headerBg: 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700',
      badgeBg: 'bg-amber-600',
      bannerBg: 'bg-amber-50 border-amber-200 text-amber-900',
      borderMain: 'border-amber-600',
      accentText: 'text-amber-700',
      kpiBorder: 'border-amber-200',
    },
  }[themeColor];

  // Divide students for two-column layout
  const halfCount = Math.ceil(displayedStudents.length / 2);
  const leftColStudents = displayedStudents.slice(0, halfCount);
  const rightColStudents = displayedStudents.slice(halfCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className={`px-4 sm:px-6 py-3.5 ${themeClasses.headerBg} text-white flex items-center justify-between shrink-0 shadow-sm`}>
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/15 backdrop-blur-md rounded-xl">
              <Share2 className="h-5 w-5 text-white" />
            </span>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight flex items-center gap-2 flex-wrap">
                <span>Xuất & Sao Chép Ảnh Báo Cáo Gửi Zalo</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white/20">
                  {periodTitle}
                </span>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-400 text-emerald-950">
                  Lớp {className}
                </span>
              </h3>
              <p className="text-xs text-blue-100 opacity-90 mt-0.5 hidden sm:block">
                Hỗ trợ dán trực tiếp (Ctrl + V), kéo thả chuột vào Zalo hoặc tải ảnh siêu nét 2x
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openZaloWeb}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition"
              title="Mở Zalo Web trong tab mới"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Mở Zalo Web</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition"
              title="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Options Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
          {/* Layout & Mode Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px] hidden sm:inline">
              Bố cục ảnh:
            </span>

            <div className="inline-flex rounded-xl p-0.5 bg-slate-200 dark:bg-slate-700 font-medium">
              <button
                onClick={() => {
                  setLayoutMode('two-column');
                  setRenderedBlob(null);
                  setRenderedImageUrl(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  layoutMode === 'two-column'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
                title="Tối ưu cho màn hình Zalo điện thoại: bảng vuông vắn, chữ to, dễ đọc"
              >
                <Columns2 className="h-3.5 w-3.5 text-blue-600" />
                <span>📱 2 Cột (Tối ưu Zalo)</span>
              </button>

              <button
                onClick={() => {
                  setLayoutMode('single-column');
                  setRenderedBlob(null);
                  setRenderedImageUrl(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  layoutMode === 'single-column'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
                title="Bảng 1 cột truyền thống kèm đầy đủ chi tiết"
              >
                <List className="h-3.5 w-3.5" />
                <span>1 Cột chuẩn</span>
              </button>

              <button
                onClick={() => {
                  setLayoutMode('honors');
                  setRenderedBlob(null);
                  setRenderedImageUrl(null);
                }}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  layoutMode === 'honors'
                    ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
                title="Chỉ hiển thị học sinh Xuất sắc & Tốt"
              >
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span>Bảng Vinh Danh ({stats.excellentCount + stats.goodCount})</span>
              </button>
            </div>

            {/* Toggle score details for single column */}
            {layoutMode === 'single-column' && periodType !== 'semester' && (
              <button
                onClick={() => {
                  setShowScoreDetails(!showScoreDetails);
                  setRenderedBlob(null);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition ${
                  showScoreDetails
                    ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 font-semibold'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {showScoreDetails ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                <span>{showScoreDetails ? 'Cột Điểm +/-: BẬT' : 'Thu gọn: TẮT'}</span>
              </button>
            )}

            <button
              onClick={() => {
                setShowStatsCard(!showStatsCard);
                setRenderedBlob(null);
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition ${
                showStatsCard
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 font-semibold'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>Thống kê lớp: {showStatsCard ? 'HIỆN' : 'ẨN'}</span>
            </button>

            {/* Theme switcher */}
            <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-700">
              <span className="text-[11px] text-slate-400 hidden lg:inline">Màu:</span>
              <button
                onClick={() => {
                  setThemeColor('blue');
                  setRenderedBlob(null);
                }}
                className={`w-5 h-5 rounded-full bg-blue-600 transition ${
                  themeColor === 'blue' ? 'ring-2 ring-blue-400 ring-offset-1' : 'opacity-60'
                }`}
                title="Màu Xanh chuyên nghiệp"
              />
              <button
                onClick={() => {
                  setThemeColor('emerald');
                  setRenderedBlob(null);
                }}
                className={`w-5 h-5 rounded-full bg-emerald-600 transition ${
                  themeColor === 'emerald' ? 'ring-2 ring-emerald-400 ring-offset-1' : 'opacity-60'
                }`}
                title="Màu Xanh ngọc tích cực"
              />
              <button
                onClick={() => {
                  setThemeColor('amber');
                  setRenderedBlob(null);
                }}
                className={`w-5 h-5 rounded-full bg-amber-600 transition ${
                  themeColor === 'amber' ? 'ring-2 ring-amber-400 ring-offset-1' : 'opacity-60'
                }`}
                title="Màu Vàng thi đua"
              />
            </div>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button
              onClick={handleCopyTextCaption}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold transition ${
                textCopied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750'
              }`}
              title="Sao chép đoạn tin nhắn tóm tắt để dán kèm theo hình ảnh vào Zalo"
            >
              {textCopied ? <Check className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              <span>{textCopied ? 'Đã copy tin nhắn' : 'Copy lời nhắn text'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isCapturing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition"
              title="Tải ảnh PNG độ nét cao về máy để đính kèm Zalo"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Tải ảnh PNG</span>
            </button>

            {/* Mobile Web Share if supported */}
            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button
                onClick={handleShareMobile}
                disabled={isCapturing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 transition"
                title="Mở menu chia sẻ gửi thẳng vào App Zalo trên điện thoại"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Gửi qua Zalo App</span>
              </button>
            )}

            {/* MAIN COPY BUTTON */}
            <button
              onClick={handleCopyImage}
              disabled={isCapturing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold shadow-md transition transform active:scale-95 ${
                copySuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 ring-2 ring-emerald-300'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30'
              }`}
            >
              {isCapturing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Đang xử lý ảnh...</span>
                </>
              ) : copySuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Đã sao chép! Mở Zalo dán Ctrl+V</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Sao chép ảnh gửi Zalo (Ctrl+V)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNERS */}
        {copySuccess && (
          <div className="px-5 py-3 bg-emerald-600 text-white font-medium text-xs sm:text-sm flex items-center justify-between shadow-inner animate-fadeIn shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="p-1 bg-white/20 rounded-full">
                <Check className="h-4 w-4" />
              </span>
              <span>
                <strong>THÀNH CÔNG!</strong> Ảnh báo cáo đã được lưu vào bộ nhớ tạm. Hãy mở nhóm Zalo phụ huynh và bấm <strong>Ctrl + V</strong> (hoặc nhấn giữ chọn <strong>Dán</strong>) để gửi ngay!
              </span>
            </div>
            <button
              onClick={() => setCopySuccess(false)}
              className="text-white/80 hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {clipboardBlocked && (
          <div className="px-5 py-3 bg-amber-500 text-slate-950 font-medium text-xs sm:text-sm flex items-start justify-between shadow-inner animate-fadeIn shrink-0">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-amber-950 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">
                  Trình duyệt hạn chế tự động dán ảnh qua phím tắt trong khung xem hiện tại.
                </p>
                <p className="mt-1 text-slate-900 leading-relaxed">
                  <strong>👉 Cách 1 (Nhanh nhất & luôn hiệu quả 100%):</strong> Nhấp chuột phải trực tiếp vào hình ảnh bên dưới ➔ Chọn <strong>"Sao chép hình ảnh" (Copy image)</strong> ➔ Mở Zalo bấm <strong>Ctrl + V</strong>.
                  <br />
                  <strong>👉 Cách 2:</strong> Bấm giữ chuột vào hình ảnh bên dưới và <strong>kéo thả thẳng</strong> vào ô chat Zalo.
                  <br />
                  <strong>👉 Cách 3:</strong> Bấm nút <strong>"Tải ảnh PNG"</strong> ở trên để gửi file ảnh vào Zalo.
                </p>
              </div>
            </div>
            <button
              onClick={() => setClipboardBlocked(false)}
              className="text-slate-900/80 hover:text-slate-950 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="px-5 py-2.5 bg-rose-500 text-white font-medium text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-white/80 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Teacher Note edit section */}
        {includeTeacherNote && (
          <div className="px-5 py-2 bg-blue-50/70 dark:bg-slate-800/40 border-b border-blue-200/50 dark:border-slate-800 text-xs shrink-0 flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                  <span>Lời nhắn GVCN gửi phụ huynh hiển thị trong ảnh:</span>
                </span>
                <button
                  onClick={() => setIsEditingNote(!isEditingNote)}
                  className="text-blue-600 hover:text-blue-800 font-medium underline ml-2"
                >
                  {isEditingNote ? 'Thu gọn' : 'Chỉnh sửa lời nhắn'}
                </button>
              </div>

              {isEditingNote ? (
                <div className="space-y-1.5 mt-1">
                  <textarea
                    value={teacherNote}
                    onChange={(e) => {
                      setTeacherNote(e.target.value);
                      setRenderedBlob(null);
                    }}
                    rows={2}
                    className="w-full p-2 text-xs border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-blue-500"
                    placeholder="Nhập lời nhắn gửi phụ huynh..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setTeacherNote(defaultTeacherNote);
                        setRenderedBlob(null);
                      }}
                      className="px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700"
                    >
                      Khôi phục mẫu
                    </button>
                    <button
                      onClick={() => setIsEditingNote(false)}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md text-[11px] font-bold"
                    >
                      Lưu lời nhắn
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-600 dark:text-slate-400 italic line-clamp-1">
                  "{teacherNote}"
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab Switcher between Design View and Native Rendered Image */}
        <div className="px-5 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Xem trước thiết kế</span>
            </button>
            <button
              onClick={async () => {
                if (!renderedImageUrl) {
                  await handleCopyImage();
                }
                setActiveTab('result');
              }}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'result'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MousePointerClick className="h-3.5 w-3.5" />
              <span>Ảnh thực tế (Chuột phải / Kéo thả)</span>
              {renderedImageUrl && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              )}
            </button>
          </div>

          <div className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">
              Mẹo: Chuột phải vào ảnh ➔ <strong>"Sao chép hình ảnh"</strong> dán thẳng vào Zalo được 100% mọi lúc!
            </span>
          </div>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-200/70 dark:bg-slate-950 flex flex-col items-center">
          {activeTab === 'result' && renderedImageUrl && (
            /* Rendered Image Tab with Direct Right-Click Copy instructions */
            <div className="w-full max-w-4xl flex flex-col items-center gap-4 animate-fadeIn mb-6">
              <div className="w-full p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-600 text-white rounded-lg">
                    <Check className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-bold text-sm">Bức ảnh đã được tạo sẵn sàng gửi Zalo!</p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Bấm chuột phải vào bức ảnh bên dưới ➔ Chọn <strong>"Sao chép hình ảnh" (Copy image)</strong> hoặc <strong>kéo thả trực tiếp</strong> bức ảnh này vào cửa sổ Zalo.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyImage}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Thử sao chép lại</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Tải về</span>
                  </button>
                </div>
              </div>

              {/* Native Image Tag */}
              <div className="p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-2 border-emerald-500/50">
                <img
                  src={renderedImageUrl}
                  alt="Tổng kết Zalo"
                  className="max-w-full h-auto rounded-xl shadow-inner cursor-pointer"
                  title="Nhấp chuột phải ➔ Chọn 'Sao chép hình ảnh' hoặc kéo thả vào Zalo"
                />
              </div>
            </div>
          )}

          {/* PREVIEW / DESIGN TAB (The DOM node that gets captured) */}
          <div
            ref={exportCardRef}
            className={`w-full ${
              layoutMode === 'two-column' ? 'max-w-[1020px]' : 'max-w-[860px]'
            } bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 font-sans ${
              activeTab === 'result' ? 'hidden' : 'block'
            }`}
            style={{
              minWidth: layoutMode === 'two-column' ? '860px' : '720px',
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
              {/* TOP HEADER */}
              <div className={`flex items-start justify-between pb-4 border-b-2 ${themeClasses.borderMain}`}>
                <div className="flex items-center gap-3">
                  <span
                    className={`w-10 h-10 rounded-xl ${themeClasses.badgeBg} text-white flex items-center justify-center font-black text-base shadow-sm`}
                  >
                    {className.slice(0, 3)}
                  </span>
                  <div>
                    <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                      LỚP {className} • NĂM HỌC {schoolYear}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Giáo viên chủ nhiệm: <strong className="text-slate-800">{homeroomTeacher || 'GVCN'}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 font-bold text-xs rounded-full border ${themeClasses.bannerBg}`}
                  >
                    HỆ THỐNG NỀ NẾP & RÈN LUYỆN
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ngày lập: {formatVietnameseDate(new Date().toISOString().slice(0, 10))}
                  </p>
                </div>
              </div>

              {/* DOCUMENT TITLE BANNER */}
              <div className="text-center my-4">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                  BẢNG TỔNG KẾT ĐIỂM RÈN LUYỆN - {periodTitle.toUpperCase()}
                </h2>
                {periodTimeInfo && (
                  <p className={`text-xs font-semibold ${themeClasses.accentText} mt-1`}>
                    Thời gian: {periodTimeInfo}
                  </p>
                )}
                {layoutMode === 'honors' && (
                  <p className="inline-block mt-1.5 px-3 py-0.5 bg-amber-100 text-amber-900 text-xs font-bold rounded-full">
                    🏆 DANH SÁCH VINH DANH HỌC SINH TIÊU BIỂU & ĐẠT THÀNH TÍCH
                  </p>
                )}
                {layoutMode === 'two-column' && (
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    (Bảng tổng kết thi đua nề nếp toàn diện cả lớp)
                  </p>
                )}
              </div>

              {/* KPI SUMMARY CARDS */}
              {showStatsCard && (
                <div className="grid grid-cols-4 gap-3 mb-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-center p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[11px] text-slate-500 font-semibold block">Sĩ số theo dõi</span>
                    <span className="text-lg font-black text-slate-800">{stats.totalStudents} HS</span>
                  </div>
                  <div className={`text-center p-2 bg-white rounded-lg border ${themeClasses.kpiBorder} shadow-2xs`}>
                    <span className={`text-[11px] font-semibold block ${themeClasses.accentText}`}>
                      Điểm trung bình
                    </span>
                    <span className={`text-lg font-black ${themeClasses.accentText}`}>
                      {formatVietnameseNumber(stats.avgScore)}
                    </span>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg border border-emerald-200 shadow-2xs">
                    <span className="text-[11px] text-emerald-600 font-semibold block">Đạt Xuất sắc & Tốt</span>
                    <span className="text-lg font-black text-emerald-700">
                      {stats.excellentCount + stats.goodCount} HS (
                      {Math.round(
                        ((stats.excellentCount + stats.goodCount) / (stats.totalStudents || 1)) * 100
                      )}
                      %)
                    </span>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg border border-amber-200 shadow-2xs">
                    <span className="text-[11px] text-amber-600 font-semibold block">Khen thưởng thành tích</span>
                    <span className="text-lg font-black text-amber-700">
                      +{formatVietnameseNumber(stats.totalAchievementBonus || 0)}đ
                    </span>
                  </div>
                </div>
              )}

              {/* TABLES SECTION */}
              {layoutMode === 'two-column' ? (
                /* TWO-COLUMN SIDE-BY-SIDE LAYOUT (Optimized for Zalo Mobile Readers) */
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {/* Left Column Table */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                          <th className="py-2 px-2 text-center w-8">STT</th>
                          <th className="py-2 px-2">Họ và tên</th>
                          <th className="py-2 px-2 text-center w-14">Điểm</th>
                          <th className="py-2 px-2 text-center w-20">Xếp loại</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {leftColStudents.map((st, idx) => (
                          <MiniStudentRow key={st.studentCode + idx} student={st} index={idx + 1} />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Right Column Table */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                          <th className="py-2 px-2 text-center w-8">STT</th>
                          <th className="py-2 px-2">Họ và tên</th>
                          <th className="py-2 px-2 text-center w-14">Điểm</th>
                          <th className="py-2 px-2 text-center w-20">Xếp loại</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rightColStudents.map((st, idx) => (
                          <MiniStudentRow
                            key={st.studentCode + idx}
                            student={st}
                            index={halfCount + idx + 1}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* SINGLE-COLUMN FULL TABLE (Full details / Honors view) */
                <div className="overflow-hidden rounded-xl border border-slate-200 shadow-xs mb-5">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-10">STT</th>
                        <th className="py-2.5 px-3 w-20">Mã HS</th>
                        <th className="py-2.5 px-3">Họ và tên</th>

                        {/* Period specific columns */}
                        {periodType === 'semester' && semesterMonths ? (
                          semesterMonths.map((m) => (
                            <th key={m} className="py-2.5 px-2 text-center">
                              T{m}
                            </th>
                          ))
                        ) : (
                          showScoreDetails && (
                            <>
                              <th className="py-2.5 px-2 text-center text-rose-700">Điểm trừ (-)</th>
                              <th className="py-2.5 px-2 text-center text-emerald-700">Điểm cộng (+)</th>
                              <th className="py-2.5 px-2 text-center text-amber-700">Thưởng 🏆</th>
                            </>
                          )
                        )}

                        <th className="py-2.5 px-3 text-center">Điểm TK</th>
                        <th className="py-2.5 px-3 text-center">Xếp loại</th>
                        <th className="py-2.5 px-3">Khen thưởng / Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {displayedStudents.map((st, idx) => {
                        const isExcellent = st.rank === 'Xuất sắc';

                        return (
                          <tr
                            key={st.studentCode + idx}
                            className={
                              isExcellent
                                ? 'bg-amber-50/40 hover:bg-amber-50'
                                : idx % 2 === 0
                                ? 'bg-white'
                                : 'bg-slate-50/60'
                            }
                          >
                            <td className="py-2 px-3 text-center text-slate-500 font-semibold">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                              {st.studentCode}
                            </td>
                            <td className="py-2 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{st.fullName}</span>
                              {isExcellent && (
                                <Award className="h-3.5 w-3.5 text-amber-500 inline shrink-0" />
                              )}
                            </td>

                            {/* Semester monthly scores */}
                            {periodType === 'semester' && semesterMonths ? (
                              semesterMonths.map((m) => {
                                const sc = st.monthlyScores ? st.monthlyScores[m] : null;
                                return (
                                  <td
                                    key={m}
                                    className="py-2 px-2 text-center font-semibold text-slate-700"
                                  >
                                    {sc !== null && sc !== undefined
                                      ? formatVietnameseNumber(sc)
                                      : '—'}
                                  </td>
                                );
                              })
                            ) : (
                              showScoreDetails && (
                                <>
                                  <td className="py-2 px-2 text-center text-rose-600 font-semibold">
                                    {st.totalDeduct && st.totalDeduct > 0
                                      ? `-${formatVietnameseNumber(st.totalDeduct)}`
                                      : '0'}
                                  </td>
                                  <td className="py-2 px-2 text-center text-emerald-600 font-semibold">
                                    {st.totalBonus && st.totalBonus > 0
                                      ? `+${formatVietnameseNumber(
                                          st.totalBonus - (st.achievementBonus || 0)
                                        )}`
                                      : '0'}
                                  </td>
                                  <td className="py-2 px-2 text-center text-amber-600 font-bold">
                                    {st.achievementBonus && st.achievementBonus > 0
                                      ? `+${formatVietnameseNumber(st.achievementBonus)}`
                                      : '—'}
                                  </td>
                                </>
                              )
                            )}

                            {/* Final Score */}
                            <td className="py-2 px-3 text-center font-black text-sm text-slate-900">
                              {formatVietnameseNumber(st.finalScore)}
                            </td>

                            {/* Rank Badge */}
                            <td className="py-2 px-3 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs ${
                                  st.rank === 'Xuất sắc'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : st.rank === 'Tốt'
                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                    : st.rank === 'Khá'
                                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                    : st.rank === 'Trung bình' || st.rank === 'Đạt'
                                    ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                                }`}
                              >
                                {st.rank}
                              </span>
                            </td>

                            {/* Achievements / Note */}
                            <td className="py-2 px-3 text-[11px]">
                              {st.achievements && st.achievements.length > 0 ? (
                                <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                                  🏆 {st.achievements.join('; ')}
                                </span>
                              ) : st.notes ? (
                                <span className="text-slate-600 italic">{st.notes}</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TEACHER NOTE IN THE IMAGE */}
              {includeTeacherNote && teacherNote && (
                <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 text-xs text-blue-950 mb-5">
                  <span className="font-bold flex items-center gap-1.5 text-blue-900 mb-1">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    <span>Lời nhắn từ Giáo viên chủ nhiệm gửi Quý Phụ huynh:</span>
                  </span>
                  <p className="italic leading-relaxed">"{teacherNote}"</p>
                </div>
              )}

              {/* FOOTER SIGNATURE */}
              <div className="flex items-end justify-between pt-4 border-t border-slate-200 text-xs text-slate-600">
                <div>
                  <p className="font-semibold text-slate-800">Trường THPT / THCS</p>
                  <p className="text-[11px] text-slate-500">
                    Lớp: {className} • Năm học: {schoolYear}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    * Bảng tổng kết được xuất tự động từ Hệ thống Quản lý Nề nếp Lớp học.
                  </p>
                </div>

                <div className="text-center min-w-[200px]">
                  <p className="text-[11px] italic text-slate-500">
                    Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm{' '}
                    {new Date().getFullYear()}
                  </p>
                  <p className="font-bold text-slate-800 mt-0.5 uppercase tracking-wide">
                    GIÁO VIÊN CHỦ NHIỆM
                  </p>
                  <div className="h-10 flex items-center justify-center">
                    <span className="font-serif italic text-blue-800 text-sm font-bold opacity-80">
                      {homeroomTeacher || 'GVCN'}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs">{homeroomTeacher || 'GVCN'}</p>
                </div>
              </div>
            </div>
        </div>

        {/* BOTTOM HELPER BAR */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
              MẸO ZALO
            </span>
            <span>
              Bấm <strong>"Sao chép ảnh"</strong> ➔ mở nhóm Zalo bấm <strong>Ctrl + V</strong>. Hoặc nhấp chuột phải vào ảnh chọn <strong>"Sao chép hình ảnh"</strong>!
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition"
            >
              Đóng
            </button>
            <button
              onClick={handleCopyImage}
              disabled={isCapturing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Copy className="h-4 w-4" />
              <span>{copySuccess ? 'Đã sao chép ảnh' : 'Sao chép ảnh Zalo (Ctrl+V)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact student row used for the two-column mobile-optimized Zalo layout
 */
const MiniStudentRow: React.FC<{ student: ZaloExportStudentRow; index: number }> = ({
  student,
  index,
}) => {
  const isExcellent = student.rank === 'Xuất sắc';
  const isGood = student.rank === 'Tốt';

  return (
    <tr
      className={
        isExcellent
          ? 'bg-amber-50/50'
          : isGood
          ? 'bg-emerald-50/30'
          : index % 2 === 0
          ? 'bg-white'
          : 'bg-slate-50/50'
      }
    >
      <td className="py-1.5 px-2 text-center text-slate-500 font-semibold text-[11px]">
        {index}
      </td>
      <td className="py-1.5 px-2">
        <div className="flex items-center gap-1">
          <span className="font-bold text-slate-900 text-xs truncate max-w-[170px]">
            {student.fullName}
          </span>
          {isExcellent && <Award className="h-3 w-3 text-amber-500 shrink-0" />}
          {student.achievements && student.achievements.length > 0 && (
            <span className="text-[10px] text-amber-700 shrink-0" title={student.achievements.join('; ')}>
              🏆
            </span>
          )}
        </div>
      </td>
      <td className="py-1.5 px-2 text-center font-black text-xs text-slate-900">
        {formatVietnameseNumber(student.finalScore)}
      </td>
      <td className="py-1.5 px-2 text-center">
        <span
          className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold ${
            student.rank === 'Xuất sắc'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : student.rank === 'Tốt'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : student.rank === 'Khá'
              ? 'bg-blue-100 text-blue-900 border border-blue-200'
              : student.rank === 'Trung bình' || student.rank === 'Đạt'
              ? 'bg-slate-100 text-slate-800 border border-slate-300'
              : 'bg-rose-100 text-rose-900 border border-rose-300'
          }`}
        >
          {student.rank}
        </span>
      </td>
    </tr>
  );
};
