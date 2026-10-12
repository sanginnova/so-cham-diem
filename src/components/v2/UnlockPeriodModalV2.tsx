import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  AlertTriangle,
  X,
  CheckCircle2,
  FileText,
  ShieldAlert,
  UserCheck,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface UnlockPeriodModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  periodType: 'week' | 'month' | 'semester';
  periodValue: number;
  periodTitle?: string;
  lockedBy?: string;
  lockedAt?: string;
  lockReason?: string;
  onConfirmUnlock: (unlockReason: string) => Promise<void>;
}

const PRESET_REASONS = [
  'Bổ sung minh chứng y tế / giấy phép nghỉ học hợp lệ nộp muộn',
  'Đính chính sai sót nhập nhầm mã học sinh do GV bộ môn báo cáo lại',
  'Ban Giám Hiệu phê duyệt kết quả phúc khảo điểm thi đua',
  'Cập nhật thành tích khen thưởng đột xuất cấp trường/tỉnh',
  'Điều chỉnh điểm nề nếp sau cuộc họp giao ban đầu tuần',
];

export const UnlockPeriodModalV2: React.FC<UnlockPeriodModalV2Props> = ({
  isOpen,
  onClose,
  periodType,
  periodValue,
  periodTitle,
  lockedBy,
  lockedAt,
  lockReason,
  onConfirmUnlock,
}) => {
  const { activeAccount } = useApp();

  const [selectedPreset, setSelectedPreset] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const typeName =
    periodType === 'week' ? `Tuần ${periodValue}` : periodType === 'month' ? `Tháng ${periodValue}` : `Học kỳ ${periodValue}`;

  const finalReason = isCustom ? customReason.trim() : selectedPreset;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalReason || finalReason.length < 10) {
      setErrorMsg('Vui lòng nhập lý do giải trình chi tiết (tối thiểu 10 ký tự)');
      return;
    }
    setErrorMsg('');

    try {
      setIsSubmitting(true);
      await onConfirmUnlock(finalReason);
      onClose();
    } catch (err: any) {
      setErrorMsg('Lỗi khi mở khóa: ' + (err.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-amber-50/70 dark:bg-amber-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <Unlock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  XÁC NHẬN MỞ KHÓA SỔ THI ĐUA V2
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-bold">
                  {typeName}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {periodTitle || `Chu kỳ thi đua: ${typeName}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Audit Warning Callout */}
          <div className="p-3.5 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
              <span>CẢNH BÁO QUY TRÌNH KIỂM TOÁN THI ĐUA (AUDIT TRAIL):</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Mở khóa sẽ cho phép giáo viên chỉnh sửa, bổ sung hoặc hủy bỏ các bản ghi nề nếp của{' '}
              <strong>{typeName}</strong>. Thao tác này sẽ làm thay đổi kết quả xếp hạng thi đua và sẽ được{' '}
              <strong>lưu vết vĩnh viễn vào CSDL Kiểm Toán (Audit Logs)</strong> kèm chữ ký số và lý do giải trình của bạn.
            </p>
            {lockedBy && (
              <div className="text-[11px] text-slate-500 pt-1 border-t border-amber-200 dark:border-amber-900/50">
                • Đã khóa bởi: <strong className="text-slate-700 dark:text-slate-300">{lockedBy}</strong>
                {lockedAt ? ` vào lúc ${new Date(lockedAt).toLocaleString('vi-VN')}` : ''}
                {lockReason ? ` (Lý do: "${lockReason}")` : ''}
              </div>
            )}
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200">
              Lý do mở khóa giải trình <span className="text-rose-500">* (Bắt buộc)</span>
            </label>

            {/* Presets */}
            <div className="space-y-1.5">
              {PRESET_REASONS.map((reason, idx) => (
                <label
                  key={idx}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                    !isCustom && selectedPreset === reason
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-semibold'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="unlockReasonPreset"
                    checked={!isCustom && selectedPreset === reason}
                    onChange={() => {
                      setSelectedPreset(reason);
                      setIsCustom(false);
                    }}
                    className="mt-0.5 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="leading-snug">{reason}</span>
                </label>
              ))}

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                  isCustom
                    ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-100 text-slate-700 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="unlockReasonPreset"
                  checked={isCustom}
                  onChange={() => setIsCustom(true)}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <span className="leading-snug">Lý do khác (Nhập giải trình cụ thể...)</span>
              </label>
            </div>

            {/* Custom Input */}
            {isCustom && (
              <div className="pt-1">
                <textarea
                  rows={3}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Ghi rõ lý do mở khóa, số công văn / đơn phúc khảo / chỉ đạo của BGH..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 focus:ring-2 focus:ring-amber-500 outline-none text-xs leading-relaxed"
                />
              </div>
            )}
          </div>

          {/* Signer Confirmation Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-850 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <span>
                Cán bộ xác nhận mở khóa:{' '}
                <strong className="text-slate-900 dark:text-white">
                  {activeAccount?.displayName || 'Ban Giám Hiệu'}
                </strong>{' '}
                ({activeAccount?.email || 'admin@school.edu.vn'})
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-400">
              {new Date().toLocaleDateString('vi-VN')}
            </span>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!isCustom && !selectedPreset) || (isCustom && customReason.trim().length < 10)}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Unlock className="h-4 w-4" />
              <span>{isSubmitting ? 'Đang xác nhận...' : 'Xác Nhận Mở Khóa & Lưu Vết'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
