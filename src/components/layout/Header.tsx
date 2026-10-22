import React from 'react';
import {
  Activity,
  RefreshCw,
  ShieldCheck,
  Wrench,
  Calendar,
  Cloud,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { User, SyncStatus } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { formatPersianDate } from '../../utils/persianDate';

interface HeaderProps {
  currentUser: User | null;
  syncStatus: SyncStatus;
  pendingCount: number;
  onOpenLogin: () => void;
  onTriggerSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  syncStatus,
  pendingCount,
  onOpenLogin,
  onTriggerSync,
}) => {
  const todayPersianStr = formatPersianDate(new Date(), { showMonthName: true });

  return (
    <header
      className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-4 sticky top-0 z-30"
      dir="rtl"
    >
      {/* Right Zone in RTL: Wordmark & Brand Badge */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sky-700 flex items-center justify-center text-white shadow-xs font-bold text-sm">
          ت
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-slate-900 tracking-tight">تیمار (Timar)</span>
            <span className="hidden sm:inline-block text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
              سیستم نگهداری و تعمیرات تصفیه‌خانه آب
            </span>
          </div>
        </div>
      </div>

      {/* Center Zone: Today's Persian Date & Sync Status */}
      <div className="hidden md:flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 text-slate-600 font-bold bg-slate-50 border border-slate-200/80 px-3 py-1 rounded-md">
          <Calendar className="w-3.5 h-3.5 text-sky-600" />
          <span>امروز: {todayPersianStr}</span>
        </div>

        <button
          onClick={onTriggerSync}
          disabled={syncStatus === 'syncing'}
          className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200 text-slate-700"
          title="همگام‌سازی تغییرات با گوگل کلود و گوگل شیتس"
        >
          {syncStatus === 'syncing' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
              <span className="font-semibold text-sky-700">در حال همگام‌سازی...</span>
            </>
          ) : syncStatus === 'synced' ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">همگام با گوگل شیتس</span>
            </>
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-amber-700 font-semibold">
                {pendingCount > 0 ? `${pendingCount} مورد در صف ارسال` : 'آفلاین / محلی'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Left Zone in RTL: User Badge & PWA Install */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* PWA Install */}
        <PWAInstallButton />

        {/* User Account / Sign In */}
        <button
          onClick={onOpenLogin}
          className="flex items-center gap-2 px-2.5 py-1 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          title={currentUser ? 'مشاهده مشخصات یا خروج از حساب' : 'ورود به سامانه'}
        >
          {currentUser ? (
            currentUser.role === 'manager' ? (
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center">
                <Wrench className="w-3.5 h-3.5" />
              </div>
            )
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          )}

          <div className="flex flex-col text-right">
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {currentUser?.fullName || 'ورود به سامانه'}
            </span>
            <span className="text-[10px] font-bold text-slate-500">
              {currentUser
                ? currentUser.role === 'manager'
                  ? 'مدیر فنی'
                  : 'تکنسین عملیات'
                : 'احراز هویت'}
            </span>
          </div>
        </button>
      </div>
    </header>
  );
};
