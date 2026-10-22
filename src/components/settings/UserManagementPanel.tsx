import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  XCircle,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  Lock,
  UserCheck,
  UserX,
} from 'lucide-react';
import type { User, Role } from '../../types';
import { AuthService } from '../../services/authService';
import { validatePasswordStrength, validateUsernameFormat } from '../../utils/crypto';

interface UserManagementPanelProps {
  currentUser: User | null;
  users: User[];
  onUsersUpdated: () => Promise<void>;
  scriptUrl?: string;
}

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({
  currentUser,
  users,
  onUsersUpdated,
  scriptUrl,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);

  // New user form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<Role>('technician');
  const [department, setDepartment] = useState('تصفیه‌خانه آب');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Reset password form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Feedback & loading state
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (currentUser?.role !== 'manager') {
    return null;
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('گذرواژه و تکرار آن یکسان نیستند.');
      return;
    }

    const uCheck = validateUsernameFormat(username);
    if (!uCheck.isValid) {
      setErrorMsg(uCheck.message || 'نام کاربری نامعتبر است.');
      return;
    }

    const pCheck = validatePasswordStrength(password);
    if (!pCheck.isValid) {
      setErrorMsg(pCheck.message || 'گذرواژه باید حداقل ۱۲ کاراکتر و دارای پیچیدگی لازم باشد.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await AuthService.createUser(
        {
          fullName,
          username,
          role,
          department,
          password,
          isActive: true,
        },
        scriptUrl
      );

      if (res.success) {
        setSuccessMsg(res.message);
        setIsCreateModalOpen(false);
        setFullName('');
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        await onUsersUpdated();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`خطا: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('رمز عبور جدید و تکرار آن یکسان نیستند.');
      return;
    }

    const pCheck = validatePasswordStrength(newPassword);
    if (!pCheck.isValid) {
      setErrorMsg(pCheck.message || 'رمز عبور باید حداقل ۱۲ کاراکتر و دارای پیچیدگی باشد.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await AuthService.resetPassword(resetTargetUser.id, newPassword, scriptUrl);
      if (res.success) {
        setSuccessMsg(res.message);
        setResetTargetUser(null);
        setNewPassword('');
        setConfirmNewPassword('');
        await onUsersUpdated();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`خطا: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleUserActive = async (targetUser: User) => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      setActionLoading(true);
      const res = await AuthService.updateUserStatus(
        targetUser.id,
        { isActive: !targetUser.isActive },
        users,
        scriptUrl
      );

      if (res.success) {
        setSuccessMsg(res.message);
        await onUsersUpdated();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`خطا: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">مدیریت کاربران و دسترسی‌ها</h2>
            <p className="text-[11px] text-slate-500">
              تعریف کاربر جدید، بازنشانی گذرواژه امن و تعیین سطح دسترسی مدیر و تکنسین
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setErrorMsg('');
            setSuccessMsg('');
            setIsCreateModalOpen(true);
          }}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>افزودن کاربر جدید</span>
        </button>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-2.5 px-3">نام و نام خانوادگی</th>
                <th className="py-2.5 px-3">نام کاربری</th>
                <th className="py-2.5 px-3">سطح دسترسی</th>
                <th className="py-2.5 px-3">واحد سازمانی</th>
                <th className="py-2.5 px-3">وضعیت حساب</th>
                <th className="py-2.5 px-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const isMgr = u.role === 'manager';
                const isActive = u.isActive !== false;
                const isSelf = currentUser?.id === u.id;

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900 flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${
                          isMgr ? 'bg-emerald-600' : 'bg-sky-600'
                        }`}
                      >
                        {isMgr ? <ShieldCheck className="w-4 h-4" /> : <Wrench className="w-3.5 h-3.5" />}
                      </div>
                      <span>{u.fullName}</span>
                      {isSelf && (
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-normal">
                          شما
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600" dir="ltr">
                      @{u.username}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                          isMgr
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-sky-50 text-sky-800 border border-sky-200'
                        }`}
                      >
                        {isMgr ? 'مدیر فنی' : 'تکنسین عملیات'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{u.department || '-'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          isActive ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>فعال</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5 text-slate-400" />
                            <span>غیرفعال</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setErrorMsg('');
                            setSuccessMsg('');
                            setResetTargetUser(u);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:text-sky-800 bg-slate-100 hover:bg-sky-50 border border-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                          title="تغییر رمز عبور"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>تغییر رمز</span>
                        </button>

                        <button
                          onClick={() => handleToggleUserActive(u)}
                          disabled={actionLoading}
                          className={`px-2 py-1 text-[11px] font-semibold rounded-md border transition-colors cursor-pointer ${
                            isActive
                              ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                          }`}
                          title={isActive ? 'غیرفعال‌سازی کاربر' : 'فعال‌سازی مجدد کاربر'}
                        >
                          {isActive ? 'غیرفعال' : 'فعال‌سازی'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-700" />
                <h3 className="text-sm font-bold text-slate-900">تعریف کاربر جدید در سیستم</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">نام و نام خانوادگی</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: مهندس احسان رضایی"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نام کاربری (لاتین)</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: erezaei"
                    dir="ltr"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-left"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سطح دسترسی (نقش)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  >
                    <option value="technician">تکنسین عملیات نت</option>
                    <option value="manager">مدیر فنی سیستم (دسترسی کامل)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">واحد سازمانی / بخش</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="مثال: تصفیه‌خانه، برق و ابزار دقیق"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    گذرواژه (حداقل ۱۲ کاراکتر)
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="رمز عبور قوی"
                      dir="ltr"
                      className="w-full pr-3 pl-8 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-left"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">تکرار گذرواژه</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="تکرار رمز عبور"
                    dir="ltr"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-left"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 leading-relaxed">
                گذرواژه با الگوریتم رمزنگاری PBKDF2 و سالت تصادفی هش شده و به صورت متنی در هیچ کجای سیستم ذخیره نخواهد شد.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 disabled:bg-sky-400 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>ثبت کاربر</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-sky-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  بازنشانی گذرواژه کاربر {resetTargetUser.fullName}
                </h3>
              </div>
              <button
                onClick={() => setResetTargetUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                با تغییر گذرواژه، تمام نشست‌ها و توکن‌های فعال این کاربر بلافاصله باطل شده و کاربر باید مجدداً وارد شود.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  گذرواژه جدید (حداقل ۱۲ کاراکتر)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="رمز عبور قوی جدید"
                    dir="ltr"
                    className="w-full pr-3 pl-8 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-left"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute left-2 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تکرار گذرواژه جدید</label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="تکرار رمز عبور جدید"
                  dir="ltr"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white text-left"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 disabled:bg-sky-400 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>ثبت رمز جدید</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
