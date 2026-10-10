import React, { useState } from 'react';
import { 
  Zap, 
  Lock, 
  Mail, 
  KeyRound, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  HelpCircle,
  Sparkles,
  X
} from 'lucide-react';
import { 
  signInWithGoogle, 
  signInWithEmail, 
  registerWithEmail, 
  signInAsGuest, 
  sendResetPassword 
} from '../services/firebaseDbService';

interface LoginPageProps {
  onSuccess?: () => void;
  onEnterViewOnly?: () => void;
  onClose?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onEnterViewOnly, onClose }) => {
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMethod, setLoadingMethod] = useState<'google' | 'email' | 'guest' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Map Firebase Auth error codes to helpful Thai messages
  const formatAuthError = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/user-not-found':
        return 'ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาตรวจสอบอีเมลหรือสมัครสมาชิกใหม่';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
      case 'auth/email-already-in-use':
        return 'อีเมลนี้ถูกลงทะเบียนไว้แล้ว กรุณาเข้าสู่ระบบแทน';
      case 'auth/weak-password':
        return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      case 'auth/invalid-email':
        return 'รูปแบบอีเมลไม่ถูกต้อง กรุณากรอกอีเมลที่ถูกต้อง';
      case 'auth/popup-closed-by-user':
        return 'หน้าต่างเข้าสู่ระบบด้วย Google ถูกปิดก่อนทำรายการเสร็จสิ้น';
      case 'auth/cancelled-popup-request':
        return 'มีการเปิดหน้าต่างเข้าสู่ระบบซ้ำซ้อน กรุณาลองใหม่อีกครั้ง';
      case 'auth/network-request-failed':
        return 'ไม่สามารถเชื่อมต่อเครือข่ายได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      case 'auth/too-many-requests':
        return 'มีการพยายามเข้าสู่ระบบผิดหลายครั้งเกินไป ระบบถูกระงับชั่วคราวเพื่อความปลอดภัย';
      case 'auth/unauthorized-domain':
        return 'โดเมนของเว็บไซต์นี้ยังไม่ได้เพิ่มใน Authorized Domains ของ Google/Firebase แนะนำให้ใช้วิธีสมัคร/เข้าสู่ระบบด้วย "อีเมลและรหัสผ่าน" ด้านล่าง หรือกด "เข้าใช้งานแบบผู้เยี่ยมชม" หรือกด "เข้าดูผัง" ได้ทันทีครับ';
      default:
        return err?.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง';
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    setLoadingMethod('google');
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
      setLoadingMethod(null);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('กรุณาระบุอีเมล');
      return;
    }

    if (!password) {
      setError('กรุณาระบุรหัสผ่าน');
      return;
    }

    if (tab === 'register') {
      if (password.length < 6) {
        setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
        return;
      }
      if (password !== confirmPassword) {
        setError('รหัสผ่านยืนยันไม่ตรงกับรหัสผ่านที่ตั้ง');
        return;
      }
    }

    setLoading(true);
    setLoadingMethod('email');

    try {
      if (tab === 'signin') {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, displayName);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
      setLoadingMethod(null);
    }
  };

  const handleGuestSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setLoading(true);
    setLoadingMethod('guest');
    try {
      await signInAsGuest();
      onSuccess?.();
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
      setLoadingMethod(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setError('กรุณากรอกอีเมลที่ต้องการรีเซ็ตรหัสผ่าน');
      return;
    }
    setResetLoading(true);
    setError(null);
    try {
      await sendResetPassword(resetEmail);
      setSuccessMessage(`ส่งลิงก์รีเซ็ตรหัสผ่านไปยัง ${resetEmail} เรียบร้อยแล้ว กรุณาตรวจสอบกล่องข้อความในอีเมล`);
      setIsResetOpen(false);
      setResetEmail('');
    } catch (err: any) {
      setError(formatAuthError(err));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-4 text-slate-100 relative overflow-hidden font-sans select-none">
      {/* Background Blueprint Decorative Grid Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(99, 102, 241, 0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Subtle Glow Spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 mb-3.5 ring-4 ring-indigo-500/10">
            <Zap className="w-7 h-7 fill-white" />
          </div>
          
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
            ระบบผังหม้อแปลงและวงจรจำหน่าย
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
            PEA Single Line Diagram (กฟส.ฝาง)
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>เข้าสู่ระบบเพื่อแก้ไขและบันทึกข้อมูลผังวงจร</span>
          </div>
        </div>

        {/* View-Only Option (No Login Required) */}
        {onEnterViewOnly && (
          <div className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/90 dark:to-indigo-950/40 border border-blue-200/80 dark:border-indigo-800/60 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/30">
                <Eye className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  ต้องการเปิดดูผังวงจรอย่างเดียว?
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  ค้นหาหม้อแปลงและดูผังได้ทันที ไม่ต้อง Login
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onEnterViewOnly}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0 transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <span>เข้าดูผัง</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Status / Error Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-150">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
            <div className="flex-1 font-medium">{successMessage}</div>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-100 font-bold text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs flex items-center justify-center gap-3 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loadingMethod === 'google' ? (
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span>เข้าสู่ระบบด้วย Google</span>
        </button>

        {/* Divider */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <span className="relative px-3 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            หรือใช้อีเมลและรหัสผ่าน
          </span>
        </div>

        {/* Sign In vs Register Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl mb-4 border border-slate-200 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'signin'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            เข้าสู่ระบบ (Sign In)
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            สมัครสมาชิกใหม่ (Register)
          </button>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ชื่อผู้ใช้งาน / แผนก
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="เช่น สมชาย (ผบค. กฟส.ฝาง)"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              อีเมล (Email)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@pea.co.th หรือ email@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                รหัสผ่าน (Password)
              </label>
              {tab === 'signin' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsResetOpen(true);
                    setResetEmail(email);
                  }}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  ลืมรหัสผ่าน?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ยืนยันรหัสผ่าน (Confirm Password)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/90 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
          >
            {loadingMethod === 'email' ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
                <span>{tab === 'signin' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิกและเข้าสู่ระบบ'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Guest / Demo Option */}
        <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-2 font-medium">
            หรือทดลองเข้าใช้งานทันทีโดยไม่ต้องกรอกรหัสผ่าน
          </p>
          <button
            type="button"
            onClick={handleGuestSignIn}
            disabled={loading}
            className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {loadingMethod === 'guest' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>เข้าใช้งานแบบผู้เยี่ยมชมชั่วคราว (Guest Access)</span>
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 text-slate-900 dark:text-slate-100">
            <h3 className="font-bold text-base mb-1.5 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-500" />
              <span>รีเซ็ตรหัสผ่าน</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              กรอกอีเมลของคุณ ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณทันที
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="กรอกอีเมลของคุณ"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 py-2 px-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {resetLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'ส่งลิงก์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="relative z-10 mt-6 text-center text-[11px] text-slate-400/80">
        <p>การไฟฟ้าส่วนภูมิภาค แผนกบริการลูกค้าและปฏิบัติการระบบไฟฟ้า</p>
        <p className="mt-0.5">PEA Fang Single Line Diagram Management System</p>
      </footer>
    </div>
  );
};
