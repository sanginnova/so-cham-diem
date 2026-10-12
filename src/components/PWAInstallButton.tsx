import React, { useState } from 'react';
import { Smartphone, Download, Share2, PlusSquare, CheckCircle, X, ShieldCheck, Zap, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running in standalone mode (already installed as PWA)
  if (isInstalled) {
    return (
      <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold">
        <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
        <span>Đã cài Mobile App</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const success = await install();
        if (success) {
          setShowModal(false);
        }
      } finally {
        setIsInstalling(false);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border border-indigo-400/40 rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer animate-pulse"
        title="Cài đặt ứng dụng lên màn hình điện thoại (Android & iOS)"
      >
        <Smartphone className="h-4 w-4" />
        <span className="hidden sm:inline">Cài App Mobile</span>
        <span className="sm:hidden">App</span>
      </button>

      {/* Modal Guide & Direct Install */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-800 dark:text-slate-100">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-500 p-0.5 shadow-lg shadow-purple-600/30 flex items-center justify-center text-white">
                  <Smartphone className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Cài đặt Sổ Nề Nếp Mobile
                    <Sparkles className="h-4 w-4 text-amber-500" />
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ứng dụng di động dành riêng cho Giáo viên chủ nhiệm
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* App Features badge */}
            <div className="grid grid-cols-3 gap-2 py-1 text-center">
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <Zap className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                <span className="text-[11px] font-bold block text-slate-700 dark:text-slate-300">Khởi động 1s</span>
                <span className="text-[9px] text-slate-400">Không cần gõ link</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <ShieldCheck className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                <span className="text-[11px] font-bold block text-slate-700 dark:text-slate-300">Đồng bộ Cloud</span>
                <span className="text-[9px] text-slate-400">Dữ liệu an toàn</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <Smartphone className="h-4 w-4 text-indigo-500 mx-auto mb-1" />
                <span className="text-[11px] font-bold block text-slate-700 dark:text-slate-300">Toàn màn hình</span>
                <span className="text-[9px] text-slate-400">Như app gốc</span>
              </div>
            </div>

            {/* Direct Install Button if supported by browser */}
            {isInstallable && (
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-2xl space-y-2">
                <button
                  type="button"
                  disabled={isInstalling}
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition active:scale-98 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  <span>{isInstalling ? 'Đang cài đặt...' : 'Cài đặt ngay lên màn hình chính'}</span>
                </button>
                <p className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                  Hỗ trợ Chrome, Edge, Cốc Cốc, Samsung Internet
                </p>
              </div>
            )}

            {/* Detailed Instructions for iOS (iPhone/iPad) & Android manual install */}
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isIOS ? '🍎 Hướng dẫn cho iPhone / iPad (Safari):' : '📱 Hướng dẫn thêm vào màn hình chính:'}
              </h4>

              {isIOS ? (
                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                      1
                    </span>
                    <p>
                      Mở trang web bằng trình duyệt <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">Safari</strong> trên iPhone.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                      2
                    </span>
                    <p className="flex items-center gap-1.5 flex-wrap">
                      Nhấn vào biểu tượng <strong>Chia sẻ</strong> <Share2 className="inline h-3.5 w-3.5 text-blue-500" /> ở thanh công cụ dưới đáy màn hình.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                      3
                    </span>
                    <p className="flex items-center gap-1.5 flex-wrap">
                      Cuộn xuống chọn <strong className="text-purple-600 dark:text-purple-400 flex items-center gap-1 font-semibold"><PlusSquare className="h-3.5 w-3.5" /> Thêm vào MH chính</strong> (Add to Home Screen).
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
                      1
                    </span>
                    <p>
                      Mở liên kết trên trình duyệt <strong className="text-purple-600 dark:text-purple-400 font-semibold">Chrome / Cốc Cốc</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
                      2
                    </span>
                    <p>
                      Bấm vào dấu <strong>3 chấm (⋮)</strong> ở góc trên bên phải trình duyệt.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
                      3
                    </span>
                    <p>
                      Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition cursor-pointer"
              >
                Đã hiểu, đóng hướng dẫn
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
