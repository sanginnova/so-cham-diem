import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Copy,
  Download,
  Check,
  Share2,
  Sparkles,
  Award,
  FileText,
  AlertCircle,
  ExternalLink,
  Smartphone,
  RefreshCw,
  MousePointerClick,
  User,
  Calendar,
  AlertTriangle,
  HeartHandshake,
} from 'lucide-react';
import { toBlob, toPng } from 'html-to-image';
import { formatVietnameseDate, formatVietnameseNumber } from '../lib/utils';
import { Student, DisciplineLog, StudentWeeklySummary, StudentMonthlySummary } from '../types';
import {
  copyBlobToClipboard,
  downloadBlob,
  openZaloWeb,
  shareImageFile,
} from '../lib/zaloExportHelper';

export interface StudentReportZaloModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  periodTitle: string; // e.g., "Tuần 3 (Tháng 9)" or "Tháng 9"
  periodSummary: StudentWeeklySummary | StudentMonthlySummary | null;
  periodLogs: DisciplineLog[];
  className: string;
  schoolYear: string;
  homeroomTeacher: string;
  schoolName?: string;
  teacherPhone?: string;
  teacherPersonalNote?: string;
  generatedTextMessage: string;
}

export const StudentReportZaloModal: React.FC<StudentReportZaloModalProps> = ({
  isOpen,
  onClose,
  student,
  periodTitle,
  periodSummary,
  periodLogs,
  className,
  schoolYear,
  homeroomTeacher,
  schoolName,
  teacherPhone,
  teacherPersonalNote,
  generatedTextMessage,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [clipboardBlocked, setClipboardBlocked] = useState<boolean>(false);
  const [textCopied, setTextCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const [renderedBlob, setRenderedBlob] = useState<Blob | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'result'>('preview');

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, student.id, periodTitle]);

  useEffect(() => {
    return () => {
      if (renderedImageUrl) URL.revokeObjectURL(renderedImageUrl);
    };
  }, [renderedImageUrl]);

  if (!isOpen || !periodSummary) return null;

  const violations = periodLogs.filter((l) => l.type === 'deduct');
  const bonuses = periodLogs.filter((l) => l.type === 'bonus');

  const fileName = `Phieu_ren_luyen_${student.fullName.replace(/\s+/g, '_')}_${periodTitle.replace(/\s+/g, '_')}`;

  const renderCardToImage = async (): Promise<{ blob: Blob; dataUrl: string } | null> => {
    if (!cardRef.current) return null;

    await new Promise((resolve) => setTimeout(resolve, 60));

    const pixelRatio = 2;
    const blob = await toBlob(cardRef.current, {
      pixelRatio,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
    });

    if (!blob) throw new Error('Không thể tạo file ảnh từ giao diện.');

    const dataUrl = await toPng(cardRef.current, {
      pixelRatio,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: true,
    });

    setRenderedBlob(blob);
    setRenderedImageUrl(dataUrl);

    return { blob, dataUrl };
  };

  const handleCopyImage = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);
      setErrorMessage(null);
      setClipboardBlocked(false);
      setCopySuccess(false);

      let currentBlob = renderedBlob;
      let currentDataUrl = renderedImageUrl;
      if (!currentBlob || !currentDataUrl) {
        const result = await renderCardToImage();
        if (!result) throw new Error('Không tìm thấy khung nội dung để tạo ảnh.');
        currentBlob = result.blob;
        currentDataUrl = result.dataUrl;
      }

      // Copy to clipboard with multi-layer fallback (direct ClipboardItem + DOM selection + copy event)
      const clipResult = await copyBlobToClipboard(currentBlob, currentDataUrl);

      if (clipResult.success) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 8000);
      } else {
        // Fallback: auto-download so the user already has the PNG in their hands
        downloadBlob(currentBlob, fileName);
        setClipboardBlocked(true);
        setActiveTab('result');
      }
    } catch (err: any) {
      console.error('Failed to copy image:', err);
      setErrorMessage('Có lỗi xảy ra: ' + (err?.message || 'Vui lòng thử lại.'));
    } finally {
      setIsCapturing(false);
    }
  };

  const handleDownload = async () => {
    if (isCapturing) return;

    try {
      setIsCapturing(true);
      let currentBlob = renderedBlob;
      if (!currentBlob) {
        const result = await renderCardToImage();
        if (!result) return;
        currentBlob = result.blob;
      }
      downloadBlob(currentBlob, fileName);
    } catch (err: any) {
      setErrorMessage('Không thể tải ảnh về: ' + (err?.message || 'Vui lòng thử lại.'));
    } finally {
      setIsCapturing(false);
    }
  };

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
        fileName,
        `Phiếu rèn luyện ${student.fullName} - ${periodTitle}`,
        `Phiếu kết quả rèn luyện nề nếp của em ${student.fullName} - Lớp ${className}`
      );

      if (!shared) {
        handleCopyImage();
      }
    } catch (err) {
      console.warn('Share error:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(generatedTextMessage);
    setTextCopied(true);
    setTimeout(() => setTextCopied(false), 3000);
  };

  const isExcellent = periodSummary.rank === 'Xuất sắc';
  const isGood = periodSummary.rank === 'Tốt';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/15 backdrop-blur-md rounded-xl">
              <Share2 className="h-5 w-5 text-white" />
            </span>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight flex items-center gap-2">
                <span>Xuất Phiếu Rèn Luyện Gửi Zalo Cho Phụ Huynh</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-white/20">
                  {student.fullName}
                </span>
              </h3>
              <p className="text-xs text-blue-100 opacity-90 mt-0.5">
                {periodTitle} • Lớp {className} • SĐT Phụ huynh: {student.parentPhone || 'Chưa cập nhật'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openZaloWeb}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold transition"
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

        {/* Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Bản thiết kế phiếu
            </button>
            <button
              onClick={async () => {
                if (!renderedImageUrl) await handleCopyImage();
                setActiveTab('result');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeTab === 'result'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <MousePointerClick className="h-3.5 w-3.5" />
              <span>Ảnh thực tế (Chuột phải / Kéo thả)</span>
              {renderedImageUrl && <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />}
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <button
              onClick={handleCopyText}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-semibold transition ${
                textCopied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
              }`}
            >
              {textCopied ? <Check className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              <span>{textCopied ? 'Đã copy tin nhắn' : 'Copy lời nhắn text'}</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isCapturing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Tải ảnh PNG</span>
            </button>

            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button
                onClick={handleShareMobile}
                disabled={isCapturing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold rounded-xl border border-indigo-200 dark:border-indigo-800 transition"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Gửi qua Zalo App</span>
              </button>
            )}

            <button
              onClick={handleCopyImage}
              disabled={isCapturing}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold shadow-md transition transform active:scale-95 ${
                copySuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
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
                <strong>THÀNH CÔNG!</strong> Ảnh phiếu rèn luyện đã lưu vào bộ nhớ tạm. Hãy mở khung chat Zalo phụ huynh và bấm <strong>Ctrl + V</strong> để gửi ngay!
              </span>
            </div>
            <button onClick={() => setCopySuccess(false)} className="text-white/80 hover:text-white p-1">
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
                  <strong>👉 Cách 1 (Nhanh nhất & luôn hoạt động 100%):</strong> Bấm chuột phải trực tiếp vào hình ảnh phiếu bên dưới ➔ Chọn <strong>"Sao chép hình ảnh" (Copy image)</strong> ➔ Mở Zalo bấm <strong>Ctrl + V</strong>.
                  <br />
                  <strong>👉 Cách 2:</strong> Bấm giữ chuột vào hình ảnh phiếu và <strong>kéo thả thẳng</strong> vào ô chat Zalo.
                  <br />
                  <strong>👉 Cách 3:</strong> Bấm nút <strong>"Tải ảnh PNG"</strong> ở trên để gửi file ảnh vào Zalo.
                </p>
              </div>
            </div>
            <button onClick={() => setClipboardBlocked(false)} className="text-slate-900/80 hover:text-slate-950 p-1">
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

        {/* MAIN BODY AREA */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-200/70 dark:bg-slate-950 flex flex-col items-center">
          {activeTab === 'result' && renderedImageUrl && (
            /* Rendered Image with direct right-click instructions */
            <div className="w-full max-w-xl flex flex-col items-center gap-4 animate-fadeIn mb-6">
              <div className="w-full p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200">
                <p className="font-bold text-sm">Bức ảnh phiếu rèn luyện đã sẵn sàng!</p>
                <p className="mt-1">
                  Nhấp chuột phải vào ảnh ➔ Chọn <strong>"Sao chép hình ảnh" (Copy image)</strong> rồi sang Zalo dán (Ctrl + V). Hoặc bạn có thể kéo thả ảnh này thẳng vào Zalo!
                </p>
              </div>
              <div className="p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border-2 border-emerald-500/50">
                <img
                  src={renderedImageUrl}
                  alt={`Phiếu rèn luyện ${student.fullName}`}
                  className="max-w-full h-auto rounded-xl shadow-inner cursor-pointer"
                  title="Nhấp chuột phải ➔ Chọn 'Sao chép hình ảnh' hoặc kéo thả vào Zalo"
                />
              </div>
            </div>
          )}

          {/* THE BEAUTIFULLY STYLED INDIVIDUAL STUDENT REPORT CARD */}
          <div
            ref={cardRef}
            className={`w-full max-w-[680px] bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 font-sans ${
              activeTab === 'result' ? 'hidden' : 'block'
            }`}
            style={{
              fontFamily:
                'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b-2 border-blue-600">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                    {schoolName || 'HỆ THỐNG QUẢN LÝ NỀ NẾP & RÈN LUYỆN'}
                  </span>
                  <h4 className="font-extrabold text-base text-slate-900 uppercase">
                    LỚP {className} • NĂM HỌC {schoolYear}
                  </h4>
                  <p className="text-xs text-slate-500">
                    GVCN: <strong className="text-slate-800">{homeroomTeacher || 'Giáo viên chủ nhiệm'}</strong>
                    {teacherPhone && <span className="text-slate-500"> • ĐT: {teacherPhone}</span>}
                  </p>
                </div>

                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-blue-50 text-blue-800 font-bold text-xs rounded-full border border-blue-200">
                    PHIẾU ĐÁNH GIÁ RÈN LUYỆN
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Ngày lập: {formatVietnameseDate(new Date().toISOString().slice(0, 10))}
                  </p>
                </div>
              </div>

              {/* Title & Student Name Box */}
              <div className="my-5 p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 rounded-2xl border border-blue-200 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                    Kết quả rèn luyện: {periodTitle}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <span>{student.fullName}</span>
                    {isExcellent && <Award className="h-6 w-6 text-amber-500 shrink-0 inline" />}
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span>Mã HS: <strong className="font-mono">{student.studentCode}</strong></span>
                    {student.dateOfBirth && <span>• NS: {formatVietnameseDate(student.dateOfBirth)}</span>}
                    {student.parentPhone && <span>• SĐT PH: {student.parentPhone}</span>}
                  </div>
                </div>

                {/* Score & Rank badge */}
                <div className="text-center bg-white px-4 py-3 rounded-xl border border-blue-200 shadow-sm shrink-0">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                    Điểm rèn luyện
                  </span>
                  <span className="text-2xl font-black text-blue-700 block">
                    {formatVietnameseNumber(periodSummary.finalScore)}
                    <span className="text-xs text-slate-400 font-normal"> / 10đ</span>
                  </span>
                  <span
                    className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-bold ${
                      isExcellent
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : isGood
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-blue-100 text-blue-900 border border-blue-300'
                    }`}
                  >
                    {periodSummary.rank}
                  </span>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-3 mb-5 text-center text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Điểm chuẩn</span>
                  <span className="text-base font-bold text-slate-700">10,0đ</span>
                </div>
                <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                  <span className="text-rose-600 block text-[11px]">Điểm trừ nề nếp</span>
                  <span className="text-base font-bold text-rose-700">
                    -{formatVietnameseNumber(periodSummary.totalDeduct)}đ
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <span className="text-emerald-600 block text-[11px]">Điểm cộng & thưởng</span>
                  <span className="text-base font-bold text-emerald-700">
                    +{formatVietnameseNumber(periodSummary.totalBonus)}đ
                  </span>
                </div>
              </div>

              {/* Specific Logs: Violations & Bonuses */}
              <div className="space-y-3 mb-5 text-xs">
                {violations.length > 0 ? (
                  <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200">
                    <span className="font-bold text-rose-900 flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <span>Các nội dung cần lưu ý rèn luyện thêm ({violations.length} lượt):</span>
                    </span>
                    <ul className="space-y-1 text-slate-700">
                      {violations.map((v, i) => (
                        <li key={i} className="flex items-start justify-between gap-2 border-b border-rose-100 last:border-0 pb-1 last:pb-0">
                          <span>
                            • <strong>{formatVietnameseDate(v.date)}:</strong> {v.behaviorDescription}
                          </span>
                          <span className="font-bold text-rose-600 shrink-0">
                            -{formatVietnameseNumber(v.totalScore)}đ
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Học sinh chấp hành rất tốt mọi nội quy, không có vi phạm nề nếp trong kỳ này!</span>
                  </div>
                )}

                {bonuses.length > 0 && (
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5 mb-2">
                      <Award className="h-4 w-4 text-emerald-600" />
                      <span>Biểu dương việc tốt & thành tích thi đua:</span>
                    </span>
                    <ul className="space-y-1 text-slate-700">
                      {bonuses.map((b, i) => (
                        <li key={i} className="flex items-start justify-between gap-2 border-b border-emerald-100 last:border-0 pb-1 last:pb-0">
                          <span>
                            + <strong>{formatVietnameseDate(b.date)}:</strong> {b.behaviorDescription}
                          </span>
                          <span className="font-bold text-emerald-600 shrink-0">
                            +{formatVietnameseNumber(b.totalScore)}đ
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Teacher's constructive feedback */}
              <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 text-xs mb-5">
                <span className="font-bold text-blue-900 flex items-center gap-1.5 mb-1">
                  <HeartHandshake className="h-4 w-4 text-blue-600" />
                  <span>Lời nhắn từ Giáo viên chủ nhiệm gửi Quý Phụ huynh:</span>
                </span>
                <p className="italic text-slate-700 leading-relaxed">
                  {teacherPersonalNote?.trim()
                    ? teacherPersonalNote
                    : periodSummary.totalDeduct === 0
                    ? `Trong ${periodTitle}, em ${student.firstName} có ý thức rèn luyện và chấp hành nề nếp rất tốt. Thầy biểu dương tinh thần tự giác của em và trân trọng cảm ơn sự phối hợp từ Quý gia đình!`
                    : `Kính mong Quý Phụ huynh cùng đồng hành, nhắc nhở và động viên em ${student.firstName} khắc phục kịp thời các lưu ý trên để con đạt thành tích tiến bộ hơn trong thời gian tới!`}
                </p>
              </div>

              {/* Signature */}
              <div className="flex items-end justify-between pt-4 border-t border-slate-200 text-xs text-slate-600">
                <div>
                  <p className="font-semibold text-slate-800">{schoolName || 'Trường THPT / THCS'}</p>
                  <p className="text-[11px] text-slate-500">Lớp {className} • Năm học {schoolYear}</p>
                </div>
                <div className="text-center min-w-[180px]">
                  <p className="text-[11px] italic text-slate-500">
                    Ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                  </p>
                  <p className="font-bold text-slate-800 mt-0.5 uppercase">GIÁO VIÊN CHỦ NHIỆM</p>
                  <div className="h-8 flex items-center justify-center">
                    <span className="font-serif italic text-blue-800 text-sm font-bold opacity-80">
                      {homeroomTeacher || 'Giáo viên chủ nhiệm'}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs">{homeroomTeacher || 'Giáo viên chủ nhiệm'}</p>
                </div>
              </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-500 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Mẹo: Chuột phải vào ảnh ➔ <strong>"Sao chép hình ảnh"</strong> hoặc kéo thả ảnh vào Zalo!</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
