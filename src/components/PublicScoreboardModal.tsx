import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Radio,
  Shield,
  Eye,
  EyeOff,
  Search,
  Lock,
  Unlock,
  Sparkles,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  PublicScoreboardSettings,
  PublicViewMode,
} from '../types/publicScoreboard';
import {
  DEFAULT_PUBLIC_SETTINGS,
  generatePublicScoreboardUrl,
  publishPublicScoreboard,
  fetchPublicScoreboard,
} from '../services/publicScoreboardService';

interface PublicScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PublicScoreboardModal: React.FC<PublicScoreboardModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    classConfig,
    students,
    disciplineLogs,
    getWeeklySummary,
    getMonthlySummary,
    getSemesterSummary,
    activeAccount,
  } = useApp();

  const [settings, setSettings] = useState<PublicScoreboardSettings>(DEFAULT_PUBLIC_SETTINGS);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const shareUrl = generatePublicScoreboardUrl(classConfig.id);

  // Tải cấu hình hiện có khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function loadCurrent() {
      try {
        const remote = await fetchPublicScoreboard(classConfig.id);
        if (remote && isMounted) {
          setSettings({
            isPublic: remote.isPublic ?? true,
            viewMode: remote.viewMode || 'full',
            allowDetails: remote.allowDetails ?? true,
            requirePin: remote.requirePin ?? false,
            pinCode: remote.pinCode || '',
            customNotice: remote.customNotice || DEFAULT_PUBLIC_SETTINGS.customNotice,
            showTrophyTop3: remote.showTrophyTop3 ?? true,
            allowSearch: remote.allowSearch ?? true,
          });
          setLastSyncTime(remote.updatedAt ? new Date(remote.updatedAt).toLocaleTimeString('vi-VN') : null);
        }
      } catch (err) {
        console.warn('Chưa có cấu hình bảng điểm trực tuyến cũ, dùng mặc định:', err);
      }
    }

    loadCurrent();
    return () => {
      isMounted = false;
    };
  }, [isOpen, classConfig.id]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePublish = async (overrideSettings?: Partial<PublicScoreboardSettings>) => {
    setIsSaving(true);
    setNotice(null);
    const newSettings = { ...settings, ...(overrideSettings || {}) };
    setSettings(newSettings);

    try {
      const payload = await publishPublicScoreboard(
        classConfig,
        students,
        disciplineLogs,
        newSettings,
        getWeeklySummary,
        getMonthlySummary,
        getSemesterSummary,
        activeAccount?.displayName || classConfig.homeroomTeacher
      );
      setLastSyncTime(new Date(payload.updatedAt).toLocaleTimeString('vi-VN'));
      setNotice('✅ Đã lưu cấu hình và cập nhật bảng điểm thời gian thực thành công!');
      setTimeout(() => setNotice(null), 3500);
    } catch (err: any) {
      setNotice(`❌ Lỗi đồng bộ: ${err.message || String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(
    shareUrl
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header với Live Stream Indicator */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-inner">
              <Radio className="h-6 w-6 animate-pulse text-emerald-300" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Xuất Link Xem Điểm Công Khai</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  REAL-TIME LIVE
                </span>
              </div>
              <p className="text-xs text-blue-100/80 mt-0.5">
                Lớp {classConfig.className} • Điểm số cập nhật tức thời khi giáo viên chấm điểm
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status Alert / Feedback */}
          {notice && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 transition ${
                notice.startsWith('✅')
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {notice}
            </div>
          )}

          {/* Master Toggle: Bật / Tắt chia sẻ công khai */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="space-y-0.5 pr-4">
              <label htmlFor="toggle-public" className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {settings.isPublic ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    Đang kích hoạt liên kết công khai
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    Đã tắt liên kết công khai
                  </span>
                )}
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {settings.isPublic
                  ? 'Bất kỳ ai có đường liên kết bên dưới đều có thể mở xem bảng điểm nề nếp thi đua trực tuyến.'
                  : 'Người có liên kết sẽ nhận thông báo bảng điểm hiện đang tạm khóa hoặc chưa công bố.'}
              </p>
            </div>
            <button
              id="toggle-public"
              type="button"
              onClick={() => handlePublish({ isPublic: !settings.isPublic })}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                settings.isPublic ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  settings.isPublic ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* URL Box & Action Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Đường dẫn truy cập trực tuyến (Real-time Link)</span>
              {lastSyncTime && (
                <span className="text-[11px] font-normal text-slate-400 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Cập nhật lần cuối: {lastSyncTime}
                </span>
              )}
            </label>

            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-200 select-all overflow-hidden truncate shadow-inner">
                {shareUrl}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs shrink-0 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title="Sao chép link vào bộ nhớ tạm"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Đã chép!' : 'Sao chép'}</span>
              </button>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 transition border border-slate-200 dark:border-slate-700"
              >
                <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                <span>Mở xem thử giao diện học sinh</span>
              </a>

              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 transition border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5 text-indigo-500" />
                <span>{showQr ? 'Ẩn mã QR' : 'Hiện mã QR quét điện thoại'}</span>
              </button>

              <button
                type="button"
                disabled={isSaving}
                onClick={() => handlePublish()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 transition border border-emerald-200 dark:border-emerald-800 cursor-pointer disabled:opacity-50 ml-auto"
                title="Đẩy toàn bộ điểm số mới nhất của các học sinh lên đám mây"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                <span>{isSaving ? 'Đang đồng bộ…' : 'Đồng bộ điểm ngay'}</span>
              </button>
            </div>

            {/* QR Code Card Dropdown */}
            {showQr && (
              <div className="mt-3 p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-850 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-150">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Quét mã QR bằng Camera điện thoại hoặc Zalo để mở bảng điểm Lớp {classConfig.className}
                </p>
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                  <img
                    src={qrImageUrl}
                    alt="Mã QR xem điểm số lớp học"
                    className="w-48 h-48 rounded-xl object-contain"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Thầy cô có thể chiếu mã QR này lên máy chiếu trong giờ sinh hoạt hoặc in dán ở bảng tin lớp.
                </p>
              </div>
            )}
          </div>

          {/* Cài đặt chế độ hiển thị & Quyền riêng tư */}
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-blue-600" />
              <span>Chế độ hiển thị & Bảo vệ quyền riêng tư</span>
            </h4>

            {/* View Mode Radio Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: Full */}
              <div
                onClick={() => setSettings({ ...settings, viewMode: 'full' })}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  settings.viewMode === 'full'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Công khai đầy đủ</span>
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Hiển thị đầy đủ Họ tên, Điểm số, Xếp loại và Bảng thi đua cả lớp. (Khuyên dùng)
                  </p>
                </div>
              </div>

              {/* Option 2: Ranked Anonymous */}
              <div
                onClick={() => setSettings({ ...settings, viewMode: 'ranked_anonymous' })}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  settings.viewMode === 'ranked_anonymous'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Ẩn danh họ tên</span>
                    <EyeOff className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Mã hóa tên học sinh (ví dụ: &quot;Nguyễn V. S.&quot;), vẫn giữ nguyên thứ hạng thi đua.
                  </p>
                </div>
              </div>

              {/* Option 3: Lookup Only */}
              <div
                onClick={() => setSettings({ ...settings, viewMode: 'lookup_only' })}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  settings.viewMode === 'lookup_only'
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Chỉ cho tra cứu</span>
                    <Search className="h-4 w-4 text-indigo-500" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Học sinh/phụ huynh phải nhập đúng Tên hoặc Mã HS mới xem được điểm cá nhân.
                  </p>
                </div>
              </div>
            </div>

            {/* Switch & Sub-options */}
            <div className="space-y-3 pt-2">
              {/* Option: Allow details */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 cursor-pointer">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Cho phép xem chi tiết từng vi phạm & thành tích (ngày, nội dung, điểm số)
                </span>
                <input
                  type="checkbox"
                  checked={settings.allowDetails}
                  onChange={(e) => setSettings({ ...settings, allowDetails: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
              </label>

              {/* Option: Trophy Top 3 */}
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 cursor-pointer">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Hiển thị Bảng vinh danh Top 3 học sinh xuất sắc nhất tuần (Podium vinh danh)
                </span>
                <input
                  type="checkbox"
                  checked={settings.showTrophyTop3}
                  onChange={(e) => setSettings({ ...settings, showTrophyTop3: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
              </label>

              {/* Option: Mã PIN bảo vệ (Tùy chọn) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {settings.requirePin ? <Lock className="h-3.5 w-3.5 text-amber-500" /> : <Unlock className="h-3.5 w-3.5 text-slate-400" />}
                    Cài đặt Mã PIN bảo vệ (Tùy chọn)
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.requirePin}
                    onChange={(e) => setSettings({ ...settings, requirePin: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                </div>
                {settings.requirePin && (
                  <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
                    <input
                      type="text"
                      maxLength={10}
                      placeholder="Nhập mã PIN lớp (vd: 123456)"
                      value={settings.pinCode || ''}
                      onChange={(e) => setSettings({ ...settings, pinCode: e.target.value.trim() })}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs bg-white dark:bg-slate-900 w-48 font-mono"
                    />
                    <span className="text-[11px] text-slate-500">Người xem cần nhập mã này trước khi thấy bảng điểm.</span>
                  </div>
                )}
              </div>

              {/* Thông báo / Lời nhắn của GVCN */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                  <span>Lời nhắn / Ghi chú của GVCN hiển thị trên bảng điểm</span>
                </label>
                <textarea
                  rows={2}
                  value={settings.customNotice || ''}
                  onChange={(e) => setSettings({ ...settings, customNotice: e.target.value })}
                  placeholder="Ghi chú dặn dò phụ huynh và học sinh..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Mỗi khi thầy cô chấm điểm, hệ thống sẽ tự động cập nhật đến người xem.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handlePublish()}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" />
              <span>{isSaving ? 'Đang lưu…' : 'Lưu & Phát trực tiếp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
