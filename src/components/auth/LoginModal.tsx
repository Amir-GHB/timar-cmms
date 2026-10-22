import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Wrench,
  X,
  KeyRound,
  User as UserIcon,
  Eye,
  EyeOff,
  LogOut,
  Loader2,
  Lock,
  AlertCircle,
  Settings,
  Sparkles,
  UserPlus,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import type { User } from '../../types';
import { AuthService } from '../../services/authService';
import { getUrlValidationError, isValidAppsScriptUrl } from '../../config/constants';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentUser: User | null;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void;
  scriptUrl?: string;
  isMandatory?: boolean;
  onOpenSettings?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  scriptUrl,
  isMandatory = false,
  onOpenSettings,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNetworkErr, setIsNetworkErr] = useState(false);

  // First-manager bootstrap state
  const [isBootstrapMode, setIsBootstrapMode] = useState(false);
  const [bootstrapFullName, setBootstrapFullName] = useState('');
  const [bootstrapUsername, setBootstrapUsername] = useState('');
  const [bootstrapPassword, setBootstrapPassword] = useState('');
  const [bootstrapConfirmPassword, setBootstrapConfirmPassword] = useState('');
  const [bootstrapSuccessMsg, setBootstrapSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsNetworkErr(false);

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError('لطفاً نام کاربری و رمز عبور را وارد نمایید.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await AuthService.login(cleanUser, password, scriptUrl);
      if (result.success && result.user) {
        setUsername('');
        setPassword('');
        onLoginSuccess(result.user);
        if (onClose) onClose();
      } else {
        setError(result.message || 'نام کاربری یا رمز عبور اشتباه است.');
        if (result.isNetworkError || result.isServerError) {
          setIsNetworkErr(true);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`خطا در احراز هویت: ${msg}`);
      setIsNetworkErr(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!bootstrapFullName.trim() || !bootstrapUsername.trim() || !bootstrapPassword) {
      setError('لطفاً کلیه فیلدهای الزامی را تکمیل فرمایید.');
      return;
    }

    if (bootstrapPassword !== bootstrapConfirmPassword) {
      setError('گذرواژه و تکرار آن یکسان نیستند.');
      return;
    }

    if (bootstrapPassword.length < 12) {
      setError('گذرواژه مدیر باید حداقل ۱۲ کاراکتر و دارای پیچیدگی کافی باشد.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await AuthService.bootstrapFirstManager(
        {
          fullName: bootstrapFullName.trim(),
          username: bootstrapUsername.trim(),
          password: bootstrapPassword,
          department: 'مدیریت فنی و نگهداری',
        },
        scriptUrl
      );

      if (res.success && res.user) {
        setBootstrapSuccessMsg('مدیر ارشد با موفقیت ثبت شد! در حال ورود به سامانه...');
        setTimeout(async () => {
          // Automatic login with newly created manager
          const loginRes = await AuthService.login(bootstrapUsername.trim(), bootstrapPassword, scriptUrl);
          if (loginRes.success && loginRes.user) {
            onLoginSuccess(loginRes.user);
            if (onClose) onClose();
          } else {
            setIsBootstrapMode(false);
            setUsername(bootstrapUsername.trim());
          }
        }, 1200);
      } else {
        setError(res.message || 'خطا در ثبت مدیر ارشد.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`خطا در ثبت مدیر: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      setIsLoading(true);
      await onLogout();
      setUsername('');
      setPassword('');
      setError('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-700 flex items-center justify-center text-white">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {currentUser
                  ? 'پروفایل کاربر فعال'
                  : isBootstrapMode
                  ? 'راه‌اندازی اولیه: ثبت مدیر ارشد'
                  : 'ورود به سامانه نگهداری و تعمیرات تیمار'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {currentUser
                  ? 'مدیریت نشست کاری و احراز هویت'
                  : isBootstrapMode
                  ? 'تعریف اولین حساب مدیر ارشد سیستم بدون دسترسی عمومی'
                  : 'احراز هویت استاندارد بر اساس نام کاربری و گذرواژه'}
              </p>
            </div>
          </div>

          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              title="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* If already authenticated, show logged in details & Logout button */}
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-xs ${
                      currentUser.role === 'manager' ? 'bg-emerald-600' : 'bg-sky-600'
                    }`}
                  >
                    {currentUser.role === 'manager' ? (
                      <ShieldCheck className="w-6 h-6" />
                    ) : (
                      <Wrench className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{currentUser.fullName}</div>
                    <div className="text-xs text-slate-500 font-mono" dir="ltr">
                      @{currentUser.username}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">سطح دسترسی:</span>
                    <span className="font-bold text-sky-800">
                      {currentUser.role === 'manager' ? 'مدیر فنی سیستم' : 'تکنسین عملیات'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">واحد سازمانی:</span>
                    <span className="font-bold text-slate-700">{currentUser.department || 'تصفیه‌خانه'}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                جهت تعویض کاربر یا ورود با نقشی دیگر، باید ابتدا از این حساب خارج شوید. احراز هویت با نام کاربری و رمز عبور الزامی است.
              </div>

              <button
                type="button"
                onClick={handleLogoutClick}
                disabled={isLoading}
                className="w-full py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>خروج از حساب کاربری</span>
                  </>
                )}
              </button>
            </div>
          ) : isBootstrapMode ? (
            /* First Manager Bootstrap Form */
            <form onSubmit={handleBootstrapSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {bootstrapSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{bootstrapSuccessMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام و نام خانوادگی مدیر ارشد
                </label>
                <input
                  type="text"
                  value={bootstrapFullName}
                  onChange={(e) => setBootstrapFullName(e.target.value)}
                  placeholder="مثال: مهندس علی احمدی"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام کاربری (حداقل ۳ کاراکتر انگلیسی)
                </label>
                <input
                  type="text"
                  value={bootstrapUsername}
                  onChange={(e) => setBootstrapUsername(e.target.value)}
                  placeholder="admin یا manager"
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-left"
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  گذرواژه قدرتمند (حداقل ۱۲ کاراکتر، حروف بزرگ و کوچک و نماد)
                </label>
                <input
                  type="password"
                  value={bootstrapPassword}
                  onChange={(e) => setBootstrapPassword(e.target.value)}
                  placeholder="حداقل ۱۲ کاراکتر"
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-left"
                  disabled={isLoading}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تکرار گذرواژه
                </label>
                <input
                  type="password"
                  value={bootstrapConfirmPassword}
                  onChange={(e) => setBootstrapConfirmPassword(e.target.value)}
                  placeholder="تکرار رمز عبور"
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-left"
                  disabled={isLoading}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 disabled:bg-emerald-400 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ثبت حساب مدیر...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>ثبت و راه‌اندازی اولین مدیر ارشد</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsBootstrapMode(false)}
                className="w-full py-2 text-xs text-slate-600 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>بازگشت به فرم ورود استاندارد</span>
              </button>
            </form>
          ) : (
            /* Standard Secure Login Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="leading-relaxed block">{error}</span>
                    {isNetworkErr && onOpenSettings && (
                      <button
                        type="button"
                        onClick={onOpenSettings}
                        className="text-sky-700 hover:underline font-bold text-[11px] inline-flex items-center gap-1 mt-1 cursor-pointer"
                      >
                        <Settings className="w-3 h-3" />
                        <span>بررسی و تغییر آدرس سرور ابری در بخش تنظیمات</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نام کاربری (Username)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: manager یا tech1"
                    dir="ltr"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    className="w-full pr-9 pl-3 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white placeholder:font-sans placeholder:text-slate-400 text-left"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Input with Visibility Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  گذرواژه (Password)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز عبور حساب کاربری"
                    dir="ltr"
                    autoComplete="current-password"
                    className="w-full pr-9 pl-10 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white placeholder:font-sans placeholder:text-slate-400 text-left"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showPassword ? 'مخفی‌سازی رمز' : 'نمایش رمز'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 disabled:bg-sky-400 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال بررسی اعتبار...</span>
                  </>
                ) : (
                  <span>ورود به سامانه</span>
                )}
              </button>

              {/* Pre-login Settings Button */}
              {onOpenSettings && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    className="w-full py-2 px-3 text-xs font-bold text-slate-700 hover:text-sky-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-sky-600" />
                    <span>پیکربندی آدرس سرور ابری (Google Apps Script)</span>
                  </button>
                </div>
              )}

              {/* Bootstrap First Manager Toggle */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsBootstrapMode(true)}
                  className="text-[11px] text-slate-500 hover:text-sky-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3 h-3 text-slate-400" />
                  <span>راه‌اندازی اولیه پایگاه‌داده جدید (ثبت اولین مدیر ارشد)</span>
                </button>
              </div>

              {/* Role Permissions Summary Note */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1.5 leading-relaxed">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  <span>راهنمای سطوح دسترسی کاربران:</span>
                </div>
                <div>
                  <strong className="text-slate-800">مدیر فنی:</strong> دسترسی کامل به تعریف تجهیزات، زمان‌بندی پیشگیرانه (PM)، انبار و تایید نهایی دستورکارها.
                </div>
                <div>
                  <strong className="text-slate-800">تکنسین عملیات:</strong> ثبت گزارش تعمیرات، پیگیری سفارش قطعه و ثبت پایان سرویس‌ها جهت تایید.
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
