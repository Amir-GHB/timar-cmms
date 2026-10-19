import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Wrench,
  CalendarClock,
  Package,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cloud,
} from 'lucide-react';
import type {
  Asset,
  MaintenanceEvent,
  MaintenanceSchedule,
  StoragePart,
  SyncStatus,
} from '../../types';
import { PersianCalendarWidget, type CalendarEventDot } from '../common/PersianCalendarWidget';
import { formatPersianDate, toPersianDigits } from '../../utils/persianDate';

interface DashboardViewProps {
  assets: Asset[];
  events: MaintenanceEvent[];
  schedules: MaintenanceSchedule[];
  inventory: StoragePart[];
  syncStatus: SyncStatus;
  pendingApprovalsCount: number;
  onSelectDateEvents?: (dateStr: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  assets,
  events,
  schedules,
  inventory,
  syncStatus,
  pendingApprovalsCount,
  onNavigateToTab,
}) => {
  const operationalCount = assets.filter((a) => a.status === 'operational').length;
  const degradedCount = assets.filter((a) => a.status === 'degraded').length;
  const maintenanceCount = assets.filter((a) => a.status === 'under_maintenance').length;

  const lowStockCount = inventory.filter((i) => i.quantityInStock <= i.minThreshold).length;

  // Build event calendar dots
  const calendarDots: CalendarEventDot[] = events.map((e) => ({
    date: e.date,
    color: e.type === 'emergency' ? '#ef4444' : e.status === 'completed' ? '#10b981' : '#f59e0b',
    title: e.title,
  }));

  // Recent 5 events
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#fafafa]" dir="rtl">
      {/* Dashboard Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-sky-600" />
            داشبورد مدیریت و نگهداری تصفیه‌خانه آب
          </h1>
          <p className="text-xs text-slate-500">
            خلاصه وضعیت بهره‌برداری، تقویم جلالی رویدادها، پایش انبار و وضعیت همگام‌سازی ابری
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-600">وضعیت ابری:</span>
          <span
            className={`px-2.5 py-1 rounded-full font-bold text-[11px] flex items-center gap-1.5 ${
              syncStatus === 'synced'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            {syncStatus === 'synced' ? 'متصل به گوگل شیتس' : 'آفلاین / ذخیره محلی'}
          </span>
        </div>
      </div>

      {/* KPI Tiles Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div
          onClick={() => onNavigateToTab('assets')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-sky-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">کل تجهیزات ثبت‌شده</span>
            <Layers className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
            {toPersianDigits(assets.length)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {toPersianDigits(operationalCount)} واحد آماده به کار
          </div>
        </div>

        {/* Pending Approvals */}
        <div
          onClick={() => onNavigateToTab('requests')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-sky-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">کارتابل تایید مدیر</span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
            {toPersianDigits(pendingApprovalsCount)}
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            درخواست اتمام رویداد در انتظار
          </div>
        </div>

        {/* Schedules */}
        <div
          onClick={() => onNavigateToTab('overall')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-sky-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">برنامه‌های نت فعال</span>
            <CalendarClock className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-2">
            {toPersianDigits(schedules.length)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            دوره سرویس‌های دوره‌ای
          </div>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => onNavigateToTab('storage')}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-sky-300 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-600">هشدار موجودی انبار</span>
            <Package className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 font-mono tabular-nums mt-2">
            {toPersianDigits(lowStockCount)}
          </div>
          <div className="text-[11px] text-rose-700 font-medium mt-1">
            قلم قطعه به حد نصاب رسیده
          </div>
        </div>
      </div>

      {/* Main Grid: Persian Calendar Widget + Recent Events Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Persian Calendar Component (Direct from C++ Qt design) */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            تقویم جلالی رویدادهای نت
          </h2>
          <PersianCalendarWidget eventDots={calendarDots} />

          <div className="bg-white rounded-xl border border-slate-200 p-3 text-xs space-y-2">
            <div className="font-semibold text-slate-800 text-[11px]">راهنمای نقاط رویداد:</div>
            <div className="flex items-center gap-4 text-[11px] text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> انجام شده
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> در دست اقدام
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> توقف اضطراری
              </span>
            </div>
          </div>
        </div>

        {/* Recent Events & Service Records */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            آخرین رویدادها و گزارش‌های تعمیرات
          </h2>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs">
            {recentEvents.map((evt) => (
              <div key={evt.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                      {evt.assetCode}
                    </span>
                    <span className="font-bold text-xs text-slate-900">{evt.title}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {formatPersianDate(evt.date, { showMonthName: true })}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{evt.description}</p>

                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 font-mono">
                  <span>تکنسین: {evt.technicianName}</span>
                  <span>·</span>
                  <span>مدت زمان: {toPersianDigits(evt.durationHours)} ساعت</span>
                  {evt.partsUsed.length > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-sky-700 font-semibold">
                        {toPersianDigits(evt.partsUsed.length)} قطعه مصرفی
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
