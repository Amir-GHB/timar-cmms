import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { toPersianDigits } from '../../utils/persianDate';

interface OfflineIndicatorProps {
  pendingCount?: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ pendingCount = 0 }) => {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <div
        className="fixed bottom-[68px] md:bottom-4 left-4 z-40 flex items-center gap-2.5 rounded-xl bg-slate-900/95 backdrop-blur-xs text-white px-3.5 py-2 text-xs shadow-xl border border-slate-700/80 pointer-events-auto"
        dir="rtl"
      >
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex flex-col text-right">
          <span className="font-bold text-white text-[12px]">حالت بدون اتصال (آفلاین)</span>
          <span className="text-[11px] text-slate-300">
            {pendingCount > 0
              ? `${toPersianDigits(pendingCount)} تغییر محلی پس از اتصال مجدد ارسال خواهند شد.`
              : 'کلیه داده‌ها در پایگاه‌داده محلی مرورگر در دسترس است.'}
          </span>
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div
        className="fixed bottom-[68px] md:bottom-4 left-4 z-40 flex items-center gap-2.5 rounded-xl bg-sky-950/95 backdrop-blur-xs text-white px-3.5 py-2 text-xs shadow-xl border border-sky-800 pointer-events-auto"
        dir="rtl"
      >
        <Database className="w-4 h-4 text-sky-400 shrink-0 animate-pulse" />
        <span className="text-xs text-sky-100 text-right">
          <strong className="text-white font-mono px-1">{toPersianDigits(pendingCount)}</strong>
          تغییر محلی در صف همگام‌سازی با سرور ابری
        </span>
      </div>
    );
  }

  return null;
};
