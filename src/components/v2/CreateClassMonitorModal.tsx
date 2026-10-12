import React, { useState, useEffect } from 'react';
import {
  X,
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
  Eye,
  EyeOff,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAccount, Student } from '../../types';

interface CreateClassMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingMonitor?: UserAccount | null;
  onSuccess?: (account: UserAccount) => void;
}

export const CreateClassMonitorModal: React.FC<CreateClassMonitorModalProps> = ({
  isOpen,
  onClose,
  existingMonitor,
  onSuccess,
}) => {
  const {
    classConfig,
    students,
    createClassMonitorAccount,
    switchAccount,
  } = useApp();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    existingMonitor?.studentId || ''
  );
  const [fullName, setFullName] = useState<string>(
    existingMonitor?.displayName || classConfig.classPresident || ''
  );
  const [username, setUsername] = useState<string>(
    existingMonitor?.email || ''
  );
  const [password, setPassword] = useState<string>(
    ''
  );
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>(
    existingMonitor?.phone || ''
  );

  const [canAddViolations, setCanAddViolations] = useState<boolean>(
    existingMonitor?.permissions?.canAddViolations ?? true
  );
  const [canAddBonuses, setCanAddBonuses] = useState<boolean>(
    existingMonitor?.permissions?.canAddBonuses ?? true
  );
  const [canViewScores, setCanViewScores] = useState<boolean>(
    existingMonitor?.permissions?.canViewScores ?? true
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<UserAccount | null>(null);
  const [copiedHandover, setCopiedHandover] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setCreatedResult(null);
      setCopiedHandover(false);

      if (existingMonitor) {
        setSelectedStudentId(existingMonitor.studentId || '');
        setFullName(existingMonitor.displayName);
        setUsername(existingMonitor.email || '');
        setPassword('');
        setPhone(existingMonitor.phone || '');
        setCanAddViolations(existingMonitor.permissions?.canAddViolations ?? true);
        setCanAddBonuses(existingMonitor.permissions?.canAddBonuses ?? true);
        setCanViewScores(existingMonitor.permissions?.canViewScores ?? true);
      } else {
        // Pre-fill from classConfig.classPresident if available in student list
        const pres = classConfig.classPresident;
        if (pres) {
          const matched = students.find((s) => s.fullName.toLowerCase().includes(pres.toLowerCase()));
          if (matched) {
            setSelectedStudentId(matched.id);
            setFullName(matched.fullName);
            setPhone(matched.parentPhone || '');
          } else {
            setFullName(pres);
          }
        } else if (students.length > 0) {
          setSelectedStudentId(students[0].id);
          setFullName(students[0].fullName);
          setPhone(students[0].parentPhone || '');
        }
        const defaultUser = `lt_${classConfig.className.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        setUsername('');
        setPassword('');
      }
    }
  }, [isOpen, existingMonitor, classConfig, students]);

  if (!isOpen) return null;

  const handleStudentSelect = (stdId: string) => {
    setSelectedStudentId(stdId);
    const found = students.find((s) => s.id === stdId);
    if (found) {
      setFullName(found.fullName);
      if (found.parentPhone) setPhone(found.parentPhone);
    }
  };

  const generateRandomPassword = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của Lớp trưởng');
      return;
    }
    if (!username.trim().includes('@')) {
      setErrorMessage('Vui lòng nhập email thực của Lớp trưởng');
      return;
    }
    if (!existingMonitor && (!password.trim() || password.length < 6)) {
      setErrorMessage('Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const acc = await createClassMonitorAccount({
        studentId: selectedStudentId || undefined,
        fullName: fullName.trim(),
        username: username.trim(),
        password: password.trim(),
        phone: phone.trim(),
        permissions: {
          canAddViolations,
          canAddBonuses,
          canViewScores,
        },
      });

      setCreatedResult({ ...acc, password: existingMonitor ? 'Mật khẩu hiện tại được giữ nguyên' : password.trim() });
      if (onSuccess) onSuccess(acc);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi tạo tài khoản Lớp trưởng');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate Handover Text to copy and send via Zalo to monitor
  const handoverText = createdResult
    ? `KÍNH GỬI EM: ${createdResult.displayName.toUpperCase()} - LỚP TRƯỞNG LỚP ${classConfig.className}
Trường: ${classConfig.schoolName || 'Trường Cao đẳng nghề 01 - BQP'}
Thầy/Cô ${classConfig.homeroomTeacher || 'GVCN'} gửi em thông tin tài khoản để đăng nhập chấm điểm nề nếp thi đua của lớp:

1. ĐỊA CHỈ TRUY CẬP:
${window.location.origin}

2. THÔNG TIN ĐĂNG NHẬP:
• Tên đăng nhập: ${createdResult.email}
• Mật khẩu: ${createdResult.password}
• Vai trò: Lớp trưởng chấm điểm nề nếp
• Phạm vi: Lớp ${classConfig.className}

3. QUYỀN HẠN ĐƯỢC CẤP:
${canAddViolations ? '✓ Ghi nhận vi phạm nề nếp hàng ngày\n' : ''}${canAddBonuses ? '✓ Ghi nhận biểu dương việc tốt, điểm cộng\n' : ''}${canViewScores ? '✓ Xem bảng tổng kết thi đua tuần của lớp\n' : ''}
* LƯU Ý BẢO MẬT: Em giữ bí mật mật khẩu, thực hiện chấm điểm trung thực, khách quan và công bằng theo đúng quy định của nhà trường.`
    : '';

  const handleCopyHandover = () => {
    navigator.clipboard.writeText(handoverText);
    setCopiedHandover(true);
    setTimeout(() => setCopiedHandover(false), 3000);
  };

  const handleLoginAsMonitor = () => {
    if (createdResult) {
      switchAccount(createdResult.uid);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 via-indigo-600/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{existingMonitor ? 'Cập Nhật Tài Khoản Lớp Trưởng' : 'Cấp Tài Khoản Lớp Trưởng Chấm Điểm'}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lớp {classConfig.className} • Phân quyền chấm nề nếp hàng ngày
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {createdResult ? (
            /* SUCCESS & HANDOVER CARD */
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Check className="h-5 w-5 text-emerald-600" />
                  <span>ĐÃ {existingMonitor ? 'CẬP NHẬT' : 'TẠO'} TÀI KHOẢN LỚP TRƯỞNG THÀNH CÔNG!</span>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  Lớp trưởng <strong>{createdResult.displayName}</strong> hiện đã có thể đăng nhập trên máy tính hoặc điện thoại để chấm điểm nề nếp cho Lớp {classConfig.className}.
                </p>
              </div>

              {/* Handover summary */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between border-b pb-1.5 border-slate-200 dark:border-slate-700 font-sans font-bold text-slate-700 dark:text-slate-300">
                  <span>Thông tin bàn giao tài khoản:</span>
                  <span className="text-blue-600">Lớp {classConfig.className}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Lớp trưởng:</span>
                  <strong className="text-slate-800 dark:text-slate-100">{createdResult.displayName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Tên đăng nhập:</span>
                  <strong className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded font-bold">
                    {createdResult.username}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans">Mật khẩu:</span>
                  <strong className="text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded font-bold">
                    {createdResult.password}
                  </strong>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyHandover}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs ${
                    copiedHandover
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copiedHandover ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copiedHandover ? 'Đã sao chép nội dung bàn giao!' : 'Sao chép thông tin gửi Zalo cho Lớp trưởng'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleLoginAsMonitor}
                    className="py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-800 dark:text-slate-200 font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-blue-600" />
                    <span>Đăng nhập thử Lớp trưởng</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center transition cursor-pointer"
                  >
                    Hoàn tất & Đóng
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* CREATE / EDIT FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Informative banner */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 text-blue-900 dark:text-blue-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>Quyền hạn của Lớp trưởng trong hệ thống:</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                  Lớp trưởng chỉ được chấm điểm học sinh trong Lớp {classConfig.className}, không được sửa cấu hình lớp, không được can thiệp vào các lớp khác và mọi bản ghi đều có lưu vết tên người nhập.
                </p>
              </div>

              {/* 1. Chọn học sinh */}
              <div className="space-y-1">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  1. Chọn học sinh giữ chức vụ Lớp trưởng
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">-- Nhập tên tự do hoặc chọn từ danh sách lớp --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.studentCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Họ và tên hiển thị */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Họ và tên hiển thị <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="vd: Nguyễn Văn An"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800 dark:text-slate-200">
                    Số điện thoại Lớp trưởng
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="vd: 0988.123.456"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* 3. Tên đăng nhập & Mật khẩu */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>Thông tin đăng nhập của Lớp trưởng</span>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] text-blue-600 hover:underline cursor-pointer"
                  >
                    Tạo mật khẩu ngẫu nhiên
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Email đăng nhập <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="loptruong@gmail.com"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 outline-none text-blue-600 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                      Mật khẩu khởi tạo <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mật khẩu"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Phân quyền chi tiết */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-800 dark:text-slate-200">
                  Phân quyền thao tác nề nếp cho Lớp trưởng:
                </label>

                <div className="space-y-2 bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Chấm điểm trừ vi phạm nề nếp
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Cho phép Lớp trưởng ghi nhận học sinh đi muộn, không đồng phục, mất trật tự...
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={canAddViolations}
                      onChange={(e) => setCanAddViolations(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer border-t pt-2 border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Chấm điểm cộng thi đua & việc tốt
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Cho phép ghi nhận phát biểu xây dựng bài, gương mẫu, hỗ trợ trực nhật...
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={canAddBonuses}
                      onChange={(e) => setCanAddBonuses(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer border-t pt-2 border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        Xem bảng tổng kết tuần của lớp
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Lớp trưởng được xem bảng xếp loại thi đua tuần để sinh hoạt lớp cuối tuần.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={canViewScores}
                      onChange={(e) => setCanViewScores(e.target.checked)}
                      className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>{isSubmitting ? 'Đang tạo tài khoản...' : existingMonitor ? 'Cập Nhật Tài Khoản' : 'Tạo Tài Khoản & Bàn Giao'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
