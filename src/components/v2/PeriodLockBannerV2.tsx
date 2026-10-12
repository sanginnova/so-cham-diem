import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UnlockPeriodModalV2 } from './UnlockPeriodModalV2';
import { auditService } from '../../services/auditService';

interface PeriodLockBannerV2Props {
  periodType: 'week' | 'month' | 'semester';
  periodValue: number;
  periodTitle?: string;
}

export const PeriodLockBannerV2: React.FC<PeriodLockBannerV2Props> = ({
  periodType,
  periodValue,
  periodTitle,
}) => {
  const { isPeriodLocked, lockedPeriods, toggleLockPeriod, userRole, activeAccount } = useApp();
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  const locked = isPeriodLocked(periodType, periodValue);
  if (!locked) return null;

  const lockDetail = lockedPeriods.find(
    (p) => p.periodType === periodType && p.periodValue === periodValue
  );

  const typeName =
    periodType === 'week' ? `Tuần ${periodValue}` : periodType === 'month' ? `Tháng ${periodValue}` : `Học kỳ ${periodValue}`;

  const canUnlock = userRole === 'admin' || userRole === 'owner';

  const handleConfirmUnlock = async (unlockReason: string) => {
    if (!await toggleLockPeriod(periodType, periodValue, unlockReason)) return;
    // Audit log
    await auditService.log({
      schoolId: 'school_cdnghe01_bqp',
      actorId: activeAccount?.uid || 'admin',
      actorName: activeAccount?.displayName || 'Ban Giám Hiệu',
      actorRole: userRole,
      action: 'PERIOD_UNLOCKED',
      entityType: 'PeriodLock',
      entityId: `lock_${periodType}_${periodValue}`,
      after: { periodType, periodValue, isLocked: false, unlockReason },
      reason: unlockReason,
    });
    setIsUnlockModalOpen(false);
  };

  return (
    <>
      <div className="p-4 bg-amber-500/10 dark:bg-amber-950/40 border border-amber-400/80 dark:border-amber-700/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 shadow-sm shadow-amber-500/30">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                BẢN GHI ĐÃ ĐƯỢC BAN GIÁM HIỆU KHÓA SỔ THI ĐUA (CHỈ ĐỌC)
              </span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.2 rounded bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                LOCKED
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              Điểm rèn luyện và xếp loại của <strong>{typeName}</strong> đã được chốt chính thức. Thao tác thêm, sửa hoặc xóa nhật ký nề nếp đã bị vô hiệu hóa.
            </p>
            {lockDetail && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                {lockDetail.lockedBy && (
                  <span>
                    • Khóa bởi: <strong className="text-slate-700 dark:text-slate-200">{lockDetail.lockedBy}</strong>
                  </span>
                )}
                {lockDetail.lockedAt && (
                  <span>
                    • Thời gian: {new Date(lockDetail.lockedAt).toLocaleDateString('vi-VN')}
                  </span>
                )}
                {lockDetail.reason && (
                  <span className="italic">
                    • Lý do: "{lockDetail.reason}"
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
          {canUnlock ? (
            <button
              type="button"
              onClick={() => setIsUnlockModalOpen(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Unlock className="h-3.5 w-3.5" />
              <span>Mở khóa tuần này (Giải trình)</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 italic bg-white/60 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900/40">
              Liên hệ BGH nếu cần phúc khảo
            </span>
          )}
        </div>
      </div>

      {isUnlockModalOpen && (
        <UnlockPeriodModalV2
          isOpen={isUnlockModalOpen}
          onClose={() => setIsUnlockModalOpen(false)}
          periodType={periodType}
          periodValue={periodValue}
          periodTitle={periodTitle || typeName}
          lockedBy={lockDetail?.lockedBy}
          lockedAt={lockDetail?.lockedAt}
          lockReason={lockDetail?.reason}
          onConfirmUnlock={handleConfirmUnlock}
        />
      )}
    </>
  );
};
