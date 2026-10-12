import { monitorMatchesClass } from '../../lib/classScope';
import React, { useState } from 'react';
import {
  UserCheck,
  ShieldCheck,
  KeyRound,
  User,
  Phone,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  AlertTriangle,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  Power,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Clock,
  ListFilter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAccount, DisciplineLog } from '../../types';
import { CreateClassMonitorModal } from './CreateClassMonitorModal';
import { formatVietnameseDate, formatVietnameseNumber } from '../../lib/utils';

export const ClassMonitorManagementCard: React.FC = () => {
  const {
    classConfig,
    userAccounts,
    disciplineLogs,
    toggleUserAccountStatus,
    deleteUserAccount,
    switchAccount,
    toggleMonitorPermission,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedHandover, setCopiedHandover] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  // Find monitor account for current class
  const monitorAccount = userAccounts.find(
    (a) => monitorMatchesClass(a, classConfig)
  );

  // Find logs recorded by monitor
  const monitorLogs = disciplineLogs.filter((l) => {
    const isByMonitor =
      (l.reporter && l.reporter.toLowerCase().includes('lớp trưởng')) ||
      (l.history && l.history.some((h) => h.editorName.toLowerCase().includes('lớp trưởng')));
    return isByMonitor;
  });

  const handleCopyHandover = () => {
    if (!monitorAccount) return;
    const text = `KÍNH GỬI EM: ${monitorAccount.displayName.toUpperCase()} - LỚP TRƯỞNG LỚP ${classConfig.className}
Trường: ${classConfig.schoolName || 'Trường Cao đẳng nghề 01 - BQP'}
Thầy/Cô ${classConfig.homeroomTeacher || 'GVCN'} gửi em thông tin tài khoản để đăng nhập chấm điểm nề nếp thi đua của lớp:

1. ĐỊA CHỈ TRUY CẬP:
${window.location.origin}

2. THÔNG TIN ĐĂNG NHẬP:
• Tên đăng nhập: ${monitorAccount.email}
• Mật khẩu: Mật khẩu đã được cấp khi tạo tài khoản; không lưu trong ứng dụng.
• Vai trò: Lớp trưởng chấm điểm nề nếp
• Phạm vi: Lớp ${classConfig.className}

* LƯU Ý BẢO MẬT: Em giữ bí mật mật khẩu, thực hiện chấm điểm trung thực, khách quan và công bằng theo đúng quy chế thi đua của nhà trường.`;

    navigator.clipboard.writeText(text);
    setCopiedHandover(true);
    setCopiedNotice('Đã sao chép nội dung bàn giao vào bộ nhớ tạm để gửi Zalo cho Lớp trưởng!');
    setTimeout(() => {
      setCopiedHandover(false);
      setCopiedNotice(null);
    }, 4000);
  };

  const handleDelete = () => {
    if (!monitorAccount) return;
    if (confirm(`Bạn có chắc muốn xóa quyền chấm điểm của Lớp trưởng ${monitorAccount.displayName}?`)) {
      deleteUserAccount(monitorAccount.uid);
    }
  };

  const handleSwitchToMonitor = () => {
    if (!monitorAccount) return;
    switchAccount(monitorAccount.uid);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Tài Khoản Lớp Trưởng Chấm Điểm Nề Nếp</span>
              {monitorAccount && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  monitorAccount.isActive
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {monitorAccount.isActive ? 'ĐANG KÍCH HOẠT' : 'ĐANG TẠM KHÓA'}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cấp quyền cho Lớp trưởng chấm điểm vi phạm & điểm cộng trực tiếp trên điện thoại • Tiết kiệm 80% thời gian cho GVCN
            </p>
          </div>
        </div>

        {!monitorAccount && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <UserCheck className="h-4 w-4" />
            <span>+ Cấp tài khoản Lớp trưởng</span>
          </button>
        )}
      </div>

      {copiedNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* BRANCH 1: CHƯA CÓ TÀI KHOẢN LỚP TRƯỞNG */}
      {!monitorAccount ? (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-transparent border border-dashed border-blue-200 dark:border-blue-900/50 flex flex-col items-center justify-center text-center space-y-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-2xl">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="max-w-md space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Chưa có tài khoản Lớp trưởng cho Lớp {classConfig.className}
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Thầy/cô có thể tạo tài khoản cho Lớp trưởng (hoặc cán sự thi đua) để các em tự nhập điểm vi phạm giờ giấc, tác phong ngay trong giờ sinh hoạt hoặc sau mỗi tiết học.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <UserCheck className="h-4 w-4" />
            <span>Tạo tài khoản Lớp trưởng ngay</span>
          </button>
        </div>
      ) : (
        /* BRANCH 2: ĐÃ CÓ TÀI KHOẢN LỚP TRƯỞNG */
        <div className="space-y-4 text-xs">
          {/* Main Account Details Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-750/70 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-md">
                LT
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {monitorAccount.displayName}
                  </h4>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200 font-bold">
                    Lớp {classConfig.className}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 space-x-3">
                  <span>Username: <strong className="text-blue-600 dark:text-blue-400 font-mono">{monitorAccount.username}</strong></span>
                  <span>Mật khẩu: <strong className="text-rose-600 dark:text-rose-400 font-mono">{'Không hiển thị lại'}</strong></span>
                  {monitorAccount.phone && <span>SĐT: <strong>{monitorAccount.phone}</strong></span>}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyHandover}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Sao chép thông tin tài khoản để gửi Zalo cho Lớp trưởng"
              >
                {copiedHandover ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Gửi Zalo Lớp trưởng</span>
              </button>

              <button
                type="button"
                onClick={handleSwitchToMonitor}
                className="py-1.5 px-3 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Đăng nhập thử vai trò Lớp trưởng để xem giao diện"
              >
                <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                <span>Đăng nhập thử</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-medium transition cursor-pointer"
                title="Sửa thông tin hoặc đổi mật khẩu"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Sửa</span>
              </button>

              <button
                type="button"
                onClick={() => toggleUserAccountStatus(monitorAccount.uid)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  monitorAccount.isActive
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                }`}
                title={monitorAccount.isActive ? 'Tạm khóa quyền chấm điểm của Lớp trưởng' : 'Kích hoạt lại quyền chấm'}
              >
                <Power className="h-3.5 w-3.5" />
                <span>{monitorAccount.isActive ? 'Khóa quyền' : 'Mở quyền'}</span>
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                title="Xóa tài khoản này"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Granular Conduct Permissions */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
            <span className="font-bold text-slate-800 dark:text-slate-200 block">
              Quyền hạn chấm điểm nề nếp của Lớp trưởng:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-750/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={monitorAccount.permissions?.canAddViolations ?? true}
                  onChange={() => toggleMonitorPermission(monitorAccount.uid, 'canAddViolations')}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <div>
                  <span className="font-semibold block text-slate-900 dark:text-white">Chấm điểm trừ</span>
                  <span className="text-[10px] text-slate-500">Ghi nhận vi phạm</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-750/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={monitorAccount.permissions?.canAddBonuses ?? true}
                  onChange={() => toggleMonitorPermission(monitorAccount.uid, 'canAddBonuses')}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <div>
                  <span className="font-semibold block text-slate-900 dark:text-white">Chấm điểm cộng</span>
                  <span className="text-[10px] text-slate-500">Biểu dương việc tốt</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-750/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={monitorAccount.permissions?.canViewScores ?? true}
                  onChange={() => toggleMonitorPermission(monitorAccount.uid, 'canViewScores')}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
                <div>
                  <span className="font-semibold block text-slate-900 dark:text-white">Xem xếp loại tuần</span>
                  <span className="text-[10px] text-slate-500">Xem bảng điểm tuần</span>
                </div>
              </label>
            </div>
          </div>

          {/* Monitor Activity Audit Summary */}
          {monitorLogs.length > 0 && (
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Các lượt chấm điểm gần nhất của Lớp trưởng ({monitorLogs.length} lượt):</span>
                </div>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {monitorLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono">{formatVietnameseDate(log.date)}</span>
                      <strong className="text-slate-800 dark:text-slate-200">{log.studentName}</strong>
                      <span className="text-slate-500 line-clamp-1">{log.behaviorDescription}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono font-bold">
                      <span className={log.type === 'deduct' ? 'text-rose-600' : 'text-emerald-600'}>
                        {log.type === 'deduct' ? '-' : '+'}{formatVietnameseNumber(log.totalScore)}đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal create / edit */}
      {isModalOpen && (
        <CreateClassMonitorModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          existingMonitor={monitorAccount}
        />
      )}
    </div>
  );
};
