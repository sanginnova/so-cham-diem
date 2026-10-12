import React, { useState } from 'react';
import { currentSchoolYear } from '../lib/classScope';
import {
  LogIn,
  X,
  Lock,
  User,
  School,
  LogOut,
  UserCheck,
  ShieldCheck,
  ArrowRightLeft,
  Settings,
  ChevronRight,
  HelpCircle,
  UserPlus,
  GraduationCap,
  Building,
  Phone,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onNavigateTab }) => {
  const {
    userRole,
    activeAccount,
    isGoogleAuth,
    classConfig,
    schoolClasses,
    logout,
    login,
    loginUserWithEmailPassword,
    registerWithEmailPassword,
    registerWithGoogle,
    switchWorkingClass,
  } = useApp();

  // Mode: login or register
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showForgotPassTip, setShowForgotPassTip] = useState(false);
  const [isSwitchingClass, setIsSwitchingClass] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regClassName, setRegClassName] = useState('');
  const [regDepartment, setRegDepartment] = useState('Khoa Đào tạo nghề');
  const [regPhone, setRegPhone] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      await login();
      onClose();
    } catch (err: any) {
      console.warn('Google login error:', err);
      setLoginError(
        err?.message ||
          'Không thể hoàn tất đăng nhập Google OAuth. Thầy cô vui lòng kiểm tra lại quyền truy cập hoặc đăng nhập bằng Tên đăng nhập & Mật khẩu bên dưới.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Vui lòng nhập đầy đủ Tên đăng nhập/Email và Mật khẩu');
      return;
    }

    setLoginLoading(true);
    setLoginError(null);
    try {
      await loginUserWithEmailPassword(loginEmail.trim(), loginPassword);
      onClose();
    } catch (err: any) {
      console.warn('Email login error:', err);
      setLoginError(
        err?.message ||
          'Tên đăng nhập hoặc mật khẩu không chính xác. Thầy cô vui lòng liên hệ Ban Giám Hiệu để được cấp lại mật khẩu.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regClassName.trim()) {
      setRegError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Mật khẩu cần có ít nhất 6 ký tự để đảm bảo an toàn.');
      return;
    }

    setRegLoading(true);
    setRegError(null);
    try {
      await registerWithEmailPassword({
        name: regName.trim(),
        email: regEmail.trim(),
        pass: regPassword,
        className: regClassName.trim().replace(/^lớp\s+/i, '').trim(),
        department: regDepartment.trim() || 'Khoa Đào tạo nghề',
        phone: regPhone.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      console.warn('Registration error:', err);
      setRegError(err?.message || 'Đăng ký không thành công. Thầy cô vui lòng kiểm tra lại thông tin.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setRegLoading(true);
    setRegError(null);
    try {
      await registerWithGoogle(
        regClassName.trim() ? regClassName.trim().replace(/^lớp\s+/i, '').trim() : undefined,
        regDepartment.trim() || 'Khoa Đào tạo nghề'
      );
      onClose();
    } catch (err: any) {
      console.warn('Google register error:', err);
      setRegError(err?.message || 'Không thể đăng ký nhanh qua Google. Thầy cô vui lòng điền biểu mẫu bên dưới.');
    } finally {
      setRegLoading(false);
    }
  };

  const isUserAuthenticated = activeAccount !== null && userRole !== 'guest';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className={`bg-white dark:bg-slate-850 rounded-3xl w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 animate-scaleUp my-8 max-h-[92vh] overflow-y-auto ${
        authMode === 'register' && !isUserAuthenticated ? 'max-w-md' : 'max-w-sm'
      }`}>
        
        {/* ========================================================= */}
        {/* BRANCH 1: KHI ĐÃ ĐĂNG NHẬP -> THẺ TÀI KHOẢN CHUẨN          */}
        {/* ========================================================= */}
        {isUserAuthenticated ? (
          <div className="space-y-4 text-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                <span>Tài khoản</span>
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Block 1: User Profile */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                  {activeAccount?.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {activeAccount?.displayName}
                    </h4>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                    {userRole === 'owner'
                      ? 'Chủ hệ thống'
                      : userRole === 'admin'
                      ? 'Ban Giám Hiệu'
                      : userRole === 'monitor'
                      ? '⭐ Lớp trưởng chấm điểm'
                      : 'Giáo viên chủ nhiệm'}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {isGoogleAuth ? '● Google' : '● Tài khoản nội bộ'}
                  </p>
                </div>
              </div>
            </div>

            {/* Block 2: Lớp đang làm việc */}
            <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-200/80 dark:border-blue-900/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5 uppercase tracking-wide">
                  <School className="h-3.5 w-3.5 text-blue-600" />
                  Lớp đang làm việc
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {classConfig.schoolYear || currentSchoolYear()}
                </span>
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                Lớp {classConfig.className}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                GVCN: {classConfig.homeroomTeacher || activeAccount?.displayName}
              </p>
            </div>

            {/* Block 3: Action Links (⚙ Quản lý tài khoản, 🔄 Chuyển lớp) */}
            <div className="space-y-1.5 pt-1">
              {(userRole === 'owner' || userRole === 'admin') && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onNavigateTab) {
                      onNavigateTab('admin');
                    } else {
                      window.dispatchEvent(new CustomEvent('navigate-to-admin'));
                    }
                  }}
                  className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-3.5 w-3.5 text-slate-500" />
                    <span>⚙ Quản lý tài khoản & Phân quyền</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                </button>
              )}

              {/* Chuyển lớp - Chỉ dành cho Chủ hệ thống & Ban Giám Hiệu */}
              {(userRole === 'owner' || userRole === 'admin') && schoolClasses.length > 1 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setIsSwitchingClass(!isSwitchingClass)}
                    className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500" />
                      <span>🔄 Chuyển lớp làm việc</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-normal">
                      {isSwitchingClass ? 'Thu gọn' : 'Chọn lớp'}
                    </span>
                  </button>

                  {isSwitchingClass && (
                    <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-1 animate-in fade-in">
                      {schoolClasses.map((cls) => (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => {
                            switchWorkingClass(cls);
                            setIsSwitchingClass(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center justify-between ${
                            classConfig.className.toLowerCase() === cls.className.toLowerCase()
                              ? 'bg-blue-600 text-white font-bold'
                              : 'hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <span>{cls.className}</span>
                          <span className="text-[10px] opacity-75">GV: {cls.teacherName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Thông báo phân quyền bảo mật dành riêng cho Giáo viên */}
              {userRole === 'teacher' && (
                <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/40 rounded-xl border border-blue-200/80 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Phân quyền Giáo viên Chủ nhiệm:</p>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                      Thầy/cô quản lý và cập nhật điểm rèn luyện của riêng <strong>Lớp {classConfig.className}</strong>. Không được phép xem hoặc chỉnh sửa lớp của giáo viên khác.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Block 4: ĐĂNG XUẤT */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98 uppercase tracking-wider"
              >
                <LogOut className="h-4 w-4" />
                <span>ĐĂNG XUẤT</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================= */
          /* BRANCH 2: KHI CHƯA ĐĂNG NHẬP -> TAB ĐĂNG NHẬP & ĐĂNG KÝ   */
          /* ========================================================= */
          <div className="space-y-3.5 text-xs">
            {/* Header with Close Button */}
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-xl">
                  {authMode === 'login' ? <Lock className="h-4 w-4" /> : <UserPlus className="h-4 w-4 text-emerald-600" />}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Trường CĐ Nghề 01 - BQP
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setLoginError(null);
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'login'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>ĐĂNG NHẬP</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setRegError(null);
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  authMode === 'register'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>ĐĂNG KÝ GV</span>
              </button>
            </div>

            {/* TAB 1: FORM ĐĂNG NHẬP */}
            {authMode === 'login' && (
              <div className="space-y-3.5 animate-in fade-in">
                {/* Google OAuth Login Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loginLoading}
                    className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-650 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.14z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.12 0-5.77-2.1-6.72-4.93H1.2v3.15C3.25 21.45 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.2C.44 8.1 0 9.99 0 12s.44 3.9 1.2 5.42l4.08-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.55 1.2 6.58l4.08 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Tiếp tục với Google</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center my-2 text-slate-400">
                  <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                  <span className="px-3 text-[11px] font-medium">hoặc tài khoản</span>
                  <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                </div>

                {/* Email / Username & Password Form */}
                <form onSubmit={handleEmailLogin} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tên đăng nhập / Email
                    </label>
                    <input
                      type="text"
                      placeholder="Nhập tên đăng nhập hoặc email..."
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mật khẩu
                    </label>
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu..."
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {loginError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-2xl leading-relaxed space-y-2.5">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                        <div>{loginError}</div>
                      </div>

                      {loginError.includes('unauthorized-domain') && (
                        <div className="pt-2 border-t border-rose-200/80 dark:border-rose-800/80 space-y-2">
                          <div className="flex items-center justify-between gap-2 p-2 bg-white/80 dark:bg-slate-900/60 rounded-xl border border-rose-200 dark:border-rose-800 text-[11px] font-mono">
                            <span className="truncate">{window.location.hostname}</span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(window.location.hostname);
                                alert(`Đã sao chép: ${window.location.hostname}`);
                              }}
                              className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 rounded-lg font-sans font-bold text-[10px] shrink-0 cursor-pointer"
                            >
                              Sao chép tên miền
                            </button>
                          </div>

                          <div className="flex flex-col gap-1.5 pt-1">
                            <a
                              href="https://console.firebase.google.com/project/qsangtnl-4226a/authentication/settings"
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold shadow-xs transition"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>Mở Firebase Console để thêm tên miền (1 phút)</span>
                            </a>

                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider active:scale-98"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>{loginLoading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}</span>
                  </button>

                  {/* Switch to Register or Forgot Password */}
                  <div className="pt-2 text-center space-y-1.5">
                    <p className="text-[11px] text-slate-500">
                      Chưa có tài khoản?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('register');
                          setRegError(null);
                        }}
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                      >
                        Đăng ký tài khoản GV ngay
                      </button>
                    </p>

                    <div>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassTip(!showForgotPassTip)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>

                    {showForgotPassTip && (
                      <div className="mt-2 p-2.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-[11px] rounded-xl text-left leading-relaxed animate-in fade-in">
                        <p className="font-bold flex items-center gap-1 mb-1">
                          <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
                          Cấp lại mật khẩu:
                        </p>
                        Nếu quên mật khẩu, thầy cô vui lòng báo Ban Giám Hiệu để được cấp lại mật khẩu ngay trong mục <strong>Quản trị → Người dùng & Phân công</strong>.
                      </div>
                    )}

                    {/* Class Monitor Quick Login Tip */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-left">
                      <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[11px] text-indigo-900 dark:text-indigo-300">
                          <UserCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>Em là Lớp trưởng chấm điểm nề nếp?</span>
                        </div>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Đăng nhập bằng email và mật khẩu do Thầy/Cô chủ nhiệm cấp.
                        </p>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: FORM ĐĂNG KÝ GIÁO VIÊN */}
            {authMode === 'register' && (
              <div className="space-y-3.5 animate-in fade-in">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300">
                  <p className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Khởi tạo không gian làm việc của thầy/cô:
                  </p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Hệ thống sẽ tự động tạo tài khoản giảng dạy, phân quyền GVCN và khởi tạo lớp học mới cho thầy cô.
                  </p>
                </div>

                {/* Google Quick Register Button */}
                <button
                  type="button"
                  onClick={handleGoogleRegister}
                  disabled={regLoading}
                  className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-300 dark:border-slate-650 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.14z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.12 0-5.77-2.1-6.72-4.93H1.2v3.15C3.25 21.45 7.31 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.2C.44 8.1 0 9.99 0 12s.44 3.9 1.2 5.42l4.08-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.55 1.2 6.58l4.08 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Đăng ký nhanh với Google</span>
                </button>

                {/* Divider */}
                <div className="flex items-center my-2 text-slate-400">
                  <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                  <span className="px-3 text-[11px] font-medium">hoặc điền thông tin</span>
                  <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
                </div>

                {/* Registration Form */}
                <form onSubmit={handleRegister} className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Họ và tên Giáo viên *
                    </label>
                    <input
                      type="text"
                      placeholder="vd: Thầy Nguyễn Văn An hoặc Cô Lê Thị Hoa"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Tên đăng nhập / Email *
                      </label>
                      <input
                        type="text"
                        placeholder="vd: sanginnova hoặc email@gmail.com"
                        autoComplete="username"
                        autoCapitalize="none"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Mật khẩu * (≥ 6 ký tự)
                      </label>
                      <input
                        type="password"
                        placeholder="Nhập mật khẩu..."
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">Có thể đăng ký bằng email hoặc tên tài khoản như sanginnova. Sau đó đăng nhập bằng đúng thông tin đã đăng ký. Tên tài khoản không có email thật sẽ không nhận được thư đặt lại mật khẩu.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Lớp chủ nhiệm *
                      </label>
                      <input
                        type="text"
                        placeholder="vd: 10A2, 11C1..."
                        value={regClassName}
                        onChange={(e) => setRegClassName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Khoa / Bộ môn
                      </label>
                      <select
                        value={regDepartment}
                        onChange={(e) => setRegDepartment(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="Khoa Đào tạo nghề">Khoa Đào tạo nghề</option>
                        <option value="Khoa Điện - Điện tử">Khoa Điện - Điện tử</option>
                        <option value="Khoa Cơ khí">Khoa Cơ khí</option>
                        <option value="Khoa Công nghệ thông tin">Khoa Công nghệ thông tin</option>
                        <option value="Khoa Động lực">Khoa Động lực</option>
                        <option value="Khối THPT / Văn hóa">Khối THPT / Văn hóa</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Số điện thoại liên hệ (Tùy chọn)
                    </label>
                    <input
                      type="tel"
                      placeholder="vd: 0988.123.456"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {regError && (
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl leading-relaxed">
                      {regError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider active:scale-98"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{regLoading ? 'ĐANG KHỞI TẠO TÀI KHOẢN...' : 'ĐĂNG KÝ VÀ BẮT ĐẦU NGAY'}</span>
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-[11px] text-slate-500">
                      Thầy cô đã có tài khoản?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setLoginError(null);
                        }}
                        className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                      >
                        Đăng nhập ngay
                      </button>
                    </p>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
