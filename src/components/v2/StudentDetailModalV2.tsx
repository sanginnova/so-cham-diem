import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  Calendar,
  Award,
  AlertTriangle,
  Key,
  Copy,
  Check,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Student, DisciplineLog } from '../../types';
import { formatVietnameseDate, formatVietnameseNumber, getRankBadgeClass } from '../../lib/utils';
import { studentService } from '../../services/studentService';
import { useApp } from '../../context/AppContext';

interface StudentDetailModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  logs: DisciplineLog[];
  currentScore: number;
  currentRank: string;
  onUpdateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
}

export const StudentDetailModalV2: React.FC<StudentDetailModalV2Props> = ({
  isOpen,
  onClose,
  student,
  logs,
  currentScore,
  currentRank,
  onUpdateStudent,
}) => {
  const { userRole } = useApp();
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  if (!isOpen || !student) return null;

  const violationsCount = logs.filter((l) => l.type === 'deduct').length;
  const bonusCount = logs.filter((l) => l.type === 'bonus').length;

  const currentToken = student.parentLookupToken || 'CHUA_CO_MA';

  const lookupUrl = `${window.location.origin}/?token=${currentToken}`;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(currentToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(lookupUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRegenerateToken = async () => {
    if (!confirm('Bạn có chắc chắn muốn cấp mã tra cứu mới? Mã cũ của phụ huynh sẽ hết hiệu lực.')) {
      return;
    }
    try {
      setIsRegenerating(true);
      const newToken = studentService.generateLookupToken();
      await onUpdateStudent(student.id, { parentLookupToken: newToken });
    } catch (err: any) {
      alert('Lỗi cập nhật mã: ' + err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const rankStyle = getRankBadgeClass(currentRank as any);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-blue-500/20">
              {student.firstName.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {student.fullName}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  {student.studentCode}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    student.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {student.status === 'active' ? 'Đang theo học' : 'Đã nghỉ/Chuyển'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {student.gender || 'Nam'} • Ngày sinh: {student.dateOfBirth ? formatVietnameseDate(student.dateOfBirth) : 'Chưa cập nhật'}
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-center">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-300 block mb-0.5">
                Điểm Rèn Luyện
              </span>
              <span className="text-2xl font-black font-mono text-blue-700 dark:text-blue-200">
                {formatVietnameseNumber(currentScore)}
              </span>
              <div className="mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rankStyle.bg} ${rankStyle.text} ${rankStyle.border}`}>
                  {currentRank}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-center">
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-300 block mb-0.5">
                Vi Phạm (Lỗi)
              </span>
              <span className="text-2xl font-black font-mono text-rose-600 flex items-center justify-center gap-1">
                <TrendingDown className="h-5 w-5" />
                {violationsCount}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">lần ghi nhận</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-center">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300 block mb-0.5">
                Khen Thưởng
              </span>
              <span className="text-2xl font-black font-mono text-emerald-600 flex items-center justify-center gap-1">
                <TrendingUp className="h-5 w-5" />
                {bonusCount}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">lần ghi nhận</span>
            </div>
          </div>

          {/* Parent Contact Card */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-850/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">Thông tin liên hệ phụ huynh</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {student.parentName || 'Chưa cập nhật tên'}
                </span>
                <span className="font-mono text-xs text-blue-600 dark:text-blue-400 block">
                  {student.parentPhone || 'Chưa có SĐT'}
                </span>
              </div>
            </div>

            {student.parentPhone && (
              <div className="flex gap-2">
                <a
                  href={`tel:${student.parentPhone}`}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Gọi</span>
                </a>
              </div>
            )}
          </div>

          {/* Parent Lookup Token V2 */}
          <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Mã Tra Cứu Phụ Huynh Bảo Mật (Parent Token)
                </span>
              </div>
              {userRole !== 'monitor' && (
                <button
                  type="button"
                  disabled={isRegenerating}
                  onClick={handleRegenerateToken}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCw className={`h-3 w-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                  <span>Cấp mã mới</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-900 font-mono font-black text-sm text-indigo-700 dark:text-indigo-300 tracking-wider">
                {currentToken}
              </div>
              <button
                type="button"
                onClick={handleCopyToken}
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-600 rounded-xl text-xs font-bold hover:bg-indigo-50 transition cursor-pointer flex items-center gap-1"
              >
                {copiedToken ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span>{copiedToken ? 'Đã chép' : 'Chép mã'}</span>
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
              >
                {copiedLink ? <Check className="h-4 w-4 text-white" /> : <ExternalLink className="h-4 w-4" />}
                <span>{copiedLink ? 'Đã chép' : 'Chép link tra cứu'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Phụ huynh chỉ cần nhập mã này hoặc bấm liên kết để tra cứu điểm nề nếp hàng tuần của con mình mà không xem được thông tin của các học sinh khác.
            </p>
          </div>

          {/* Recent Discipline Logs */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Nhật Ký Nề Nếp Gần Đây ({logs.length} bản ghi)
            </span>

            {logs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-2xl">
                Học sinh chưa có bản ghi vi phạm hay khen thưởng nào.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-900/50">
                {logs.slice(0, 10).map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.behaviorDescription}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Ngày {formatVietnameseDate(log.date)} • {log.periodOrTime} (Tuần {log.weekNumber}) • Ghi nhận: {log.reporter}
                      </div>
                    </div>
                    <span
                      className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                        log.type === 'deduct'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {log.type === 'deduct' ? '-' : '+'}
                      {log.totalScore}đ
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
