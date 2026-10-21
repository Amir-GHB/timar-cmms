import React, { useState } from 'react';
import {
  FileBarChart,
  Calendar,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Wrench,
  Eye,
  FileText,
  CheckSquare,
  Square,
  RotateCcw,
} from 'lucide-react';
import type { MaintenanceEvent, Asset, MaintenanceSchedule } from '../../types';
import {
  formatPersianDate,
  toPersianDigits,
  isoToJalali,
  jalaliToIso,
  getJalaliMonthDays,
} from '../../utils/persianDate';
import { TimeService } from '../../utils/timeService';
import { EventDetailsModal } from '../maintenance/EventDetailsModal';
import { PersianDatePicker } from '../common/PersianDatePicker';

interface ReportsSectionViewProps {
  events: MaintenanceEvent[];
  assets: Asset[];
  schedules?: MaintenanceSchedule[];
}

export const ReportsSectionView: React.FC<ReportsSectionViewProps> = ({
  events,
  assets,
  schedules = [],
}) => {
  // Checkbox selection for assets
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(
    assets.map((a) => a.id)
  );
  const [activeTab, setActiveTab] = useState<'all' | 'happened' | 'overdue'>('all');
  const [activeDatePreset, setActiveDatePreset] = useState<'all' | 'week' | 'month' | 'last_month' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [inspectEvent, setInspectEvent] = useState<MaintenanceEvent | null>(null);

  const isAllAssetsSelected = selectedAssetIds.length === assets.length;

  const toggleSelectAllAssets = () => {
    if (isAllAssetsSelected) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(assets.map((a) => a.id));
    }
  };

  const toggleAssetSelection = (assetId: string) => {
    if (selectedAssetIds.includes(assetId)) {
      setSelectedAssetIds(selectedAssetIds.filter((id) => id !== assetId));
    } else {
      setSelectedAssetIds([...selectedAssetIds, assetId]);
    }
  };

  const todayIso = TimeService.getTehranDateString();

  // Handle Preset Selection: Current Week, Current Month, Last Month, All Time
  const handleSelectPreset = (preset: 'all' | 'week' | 'month' | 'last_month') => {
    setActiveDatePreset(preset);
    const jToday = isoToJalali(todayIso);

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (preset === 'week') {
      // In Iranian calendar, week starts on Saturday (شنبه) and ends on Friday (جمعه)
      const now = new Date(todayIso + 'T00:00:00Z');
      const dayOfWeek = (now.getUTCDay() + 1) % 7; // 0 for Saturday, 6 for Friday
      const sat = new Date(now.getTime() - dayOfWeek * 86400000);
      const fri = new Date(sat.getTime() + 6 * 86400000);
      setStartDate(sat.toISOString().split('T')[0]);
      setEndDate(fri.toISOString().split('T')[0]);
      return;
    }

    if (preset === 'month') {
      if (!jToday) return;
      const [jy, jm] = jToday;
      const start = jalaliToIso(jy, jm, 1);
      const end = jalaliToIso(jy, jm, getJalaliMonthDays(jy, jm));
      setStartDate(start);
      setEndDate(end);
      return;
    }

    if (preset === 'last_month') {
      if (!jToday) return;
      let [jy, jm] = jToday;
      if (jm === 1) {
        jy -= 1;
        jm = 12;
      } else {
        jm -= 1;
      }
      const start = jalaliToIso(jy, jm, 1);
      const end = jalaliToIso(jy, jm, getJalaliMonthDays(jy, jm));
      setStartDate(start);
      setEndDate(end);
      return;
    }
  };

  // Reports show what happened (completed) or overdue / uncompleted within selected assets and date range
  const relevantEvents = events.filter((e) => {
    // 0. Exclude deleted events
    if (e.isDeleted) return false;

    // 1. Asset Filter
    if (!selectedAssetIds.includes(e.assetId)) return false;

    // 2. Date Range Filter
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;

    // 3. Happened: Completed
    const isHappened = e.status === 'completed';

    // 4. Supposed to happen and didn't happen / overdue:
    const isOverdue =
      e.status !== 'completed' &&
      e.status !== 'cancelled' &&
      ((e.deadlineDate && e.deadlineDate < todayIso) ||
        (e.date <= todayIso && e.status === 'scheduled') ||
        e.type === 'emergency');

    if (activeTab === 'happened') return isHappened;
    if (activeTab === 'overdue') return isOverdue;
    return isHappened || isOverdue;
  });

  const happenedCount = events.filter((e) => {
    if (e.isDeleted || e.status !== 'completed') return false;
    if (!selectedAssetIds.includes(e.assetId)) return false;
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;
    return true;
  }).length;

  const overdueCount = events.filter((e) => {
    if (e.isDeleted || e.status === 'completed' || e.status === 'cancelled') return false;
    if (!selectedAssetIds.includes(e.assetId)) return false;
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;
    return (
      (e.deadlineDate && e.deadlineDate < todayIso) ||
      (e.date <= todayIso && e.status === 'scheduled') ||
      e.type === 'emergency'
    );
  }).length;

  // Export CSV
  const handleExportCsv = () => {
    const headers = 'کد تجهیز,نام تجهیز,عنوان اقدام,نوع رویداد,وضعیت,تاریخ,تکنسین,ساعت کارکرد,توقف خط\n';
    const rows = relevantEvents
      .map(
        (e) =>
          `"${e.assetCode}","${e.assetName}","${e.title}","${e.type}","${e.status}","${e.date}","${e.technicianName}","${e.durationHours}","${e.downtimeHours}"`
      )
      .join('\n');
    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timar_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF / Print
  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#fafafa]" dir="rtl">
      {/* 
        Right Filter Sidebar:
        User Requirement: "instead of a dropdown menu for selecting asset to see reports of it, make a small scroll area whith checks to select or unselect assets, also an all assets check as well on top of the scroll area items"
      */}
      <div className="w-full md:w-72 lg:w-80 bg-white border-l border-slate-200 p-4 space-y-5 overflow-y-auto shrink-0">
        <div>
          <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-sky-600" />
            فیلتر و تنظیمات گزارش
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            گزارش رویدادهای انجام‌شده و اقدامات دارای تاخیر
          </p>
        </div>

        {/* Report Scope Tab Filter */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">
            دامنه گزارش
          </label>
          <div className="flex flex-col gap-1 text-xs">
            {[
              { id: 'all', label: 'همه سوابق (انجام‌شده و دارای تاخیر)' },
              { id: 'happened', label: 'تنها رویدادهای انجام‌شده (سوابق قطعی)' },
              { id: 'overdue', label: 'اقدامات انجام‌نشده و دارای تاخیر' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-2.5 rounded-lg font-medium text-right transition-colors cursor-pointer text-xs ${
                  activeTab === tab.id
                    ? 'bg-sky-50 text-sky-800 border border-sky-300 font-bold'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 
          Asset Checkbox Scroll Area:
          User Requirement: "small scroll area with checks to select or unselect assets, also an all assets check as well on top of the scroll area items"
        */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            انتخاب تجهیزات هدف ({toPersianDigits(selectedAssetIds.length)} از {toPersianDigits(assets.length)})
          </label>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            {/* Top 'All Assets' Checkbox */}
            <div
              onClick={toggleSelectAllAssets}
              className="p-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-200/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isAllAssetsSelected ? (
                  <CheckSquare className="w-4 h-4 text-sky-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span className="text-xs font-bold text-slate-800">
                  انتخاب همه تجهیزات تصفیه‌خانه
                </span>
              </div>

              <span className="text-[10px] font-mono text-slate-500 font-bold">
                {toPersianDigits(assets.length)}
              </span>
            </div>

            {/* Scroll Area of Individual Assets */}
            <div className="max-h-44 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100">
              {assets.map((ast) => {
                const isSelected = selectedAssetIds.includes(ast.id);
                return (
                  <div
                    key={ast.id}
                    onClick={() => toggleAssetSelection(ast.id)}
                    className="pt-1.5 first:pt-0 flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition-colors text-xs"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="font-mono text-[10px] font-bold text-sky-800 bg-sky-100 px-1 py-0.2 rounded shrink-0">
                      {ast.code}
                    </span>
                    <span className="text-slate-700 truncate">{ast.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 
          Date-Range Filter:
          User Requirement: "In the Reports section's right-hand side panel, add a date-range filter directly below the asset checklist. Include: Start date, End date, Four preset buttons: Current Week, Current Month, Last Month, All Time"
        */}
        <div className="space-y-2.5 pt-3 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>فیلتر بازه زمانی</span>
            </label>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => handleSelectPreset('all')}
                className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1 cursor-pointer"
                title="پاک‌کردن فیلتر تاریخ"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>حذف فیلتر</span>
              </button>
            )}
          </div>

          {/* 4 Preset Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'week', label: 'هفته جاری' },
              { id: 'month', label: 'ماه جاری' },
              { id: 'last_month', label: 'ماه گذشته' },
              { id: 'all', label: 'همه زمان‌ها' },
            ].map((p) => {
              const isSelected = activeDatePreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id as any)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors cursor-pointer border text-center ${
                    isSelected
                      ? 'bg-sky-600 text-white border-sky-600 font-bold shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Start and End Date Pickers */}
          <div className="space-y-2 pt-1">
            <div>
              <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                از تاریخ:
              </span>
              <PersianDatePicker
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  setActiveDatePreset('custom');
                }}
                placeholder="از تاریخ..."
              />
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-600 mb-1">
                تا تاریخ:
              </span>
              <PersianDatePicker
                value={endDate}
                onChange={(val) => {
                  setEndDate(val);
                  setActiveDatePreset('custom');
                }}
                placeholder="تا تاریخ..."
              />
            </div>
          </div>

          {/* Active Date Indicator */}
          {(startDate || endDate) && (
            <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-200/80 font-mono text-center">
              بازه: {startDate ? formatPersianDate(startDate) : 'ابتدا'} تا{' '}
              {endDate ? formatPersianDate(endDate) : 'اکنون'}
            </div>
          )}
        </div>

        {/* 
          Export Buttons:
          User Requirement: "in reports section add another export button for pdf"
        */}
        <div className="pt-3 border-t border-slate-200 space-y-2">
          <button
            onClick={handleExportPdf}
            className="w-full py-2.5 px-3 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>خروجی PDF / چاپ رسمی گزارش</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="w-full py-2 px-3 text-xs font-bold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-700" />
            <span>خروجی اکسل / CSV</span>
          </button>
        </div>
      </div>

      {/* Main Results Panel */}
      <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6 space-y-5">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileBarChart className="w-5 h-5 text-sky-600" />
            <span>گزارش عملکرد نگهداری و تعمیرات (فقط خواندنی)</span>
          </h1>
          <p className="text-xs text-slate-500">
            نمایش آنچه در تصفیه‌خانه انجام شده (سوابق) و اقداماتی که طبق برنامه باید انجام می‌شد اما صورت نگرفته یا معوق شده است
          </p>
        </div>

        {/* Summary Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium block">
              اقدامات انجام‌شده (سوابق)
            </span>
            <div className="text-2xl font-bold text-emerald-600 font-mono mt-0.5">
              {toPersianDigits(happenedCount)}
            </div>
            <span className="text-[10px] text-slate-400">سرویس‌ها و تعمیرات پایان‌یافته</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] text-slate-500 font-medium block">
              اقدامات معوق و دارای تاخیر
            </span>
            <div className="text-2xl font-bold text-rose-600 font-mono mt-0.5">
              {toPersianDigits(overdueCount)}
            </div>
            <span className="text-[10px] text-slate-400">انجام نشده یا مهلت سپری‌شده</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-500 font-medium block">
              تعداد تجهیزات تحت پوشش
            </span>
            <div className="text-2xl font-bold text-sky-600 font-mono mt-0.5">
              {toPersianDigits(selectedAssetIds.length)}
            </div>
            <span className="text-[10px] text-slate-400">از مجموع {toPersianDigits(assets.length)} دارایی</span>
          </div>
        </div>

        {/* 
          Events Result Minimal Cards List:
          User Requirement: "do the same for widgets in the report section"
          Minimal card with "مشاهده جزئیات" button opening pop up window!
        */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-y-auto divide-y divide-slate-100 shadow-xs p-2">
          {relevantEvents.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              هیچ رویدادی مطابق با فیلترهای انتخابی یافت نشد.
            </div>
          ) : (
            relevantEvents.map((evt) => {
              const isCompleted = evt.status === 'completed';
              const isOverdue = !isCompleted && ((evt.deadlineDate && evt.deadlineDate < todayIso) || evt.date <= todayIso);

              return (
                <div
                  key={evt.id}
                  className="p-3.5 sm:p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                        {evt.assetCode}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {evt.title}
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isOverdue
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isCompleted
                          ? 'انجام شده'
                          : isOverdue
                          ? 'دارای تاخیر / انجام نشده'
                          : 'برنامه‌ریزی شده'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{evt.assetName}</span>
                      <span>·</span>
                      <span className="font-mono">
                        تاریخ: {formatPersianDate(evt.date, { showMonthName: true })}
                      </span>
                      <span>·</span>
                      <span>تکنسین: {evt.technicianName}</span>
                    </div>
                  </div>

                  {/* Show Details Button */}
                  <div className="flex items-center justify-end shrink-0">
                    <button
                      onClick={() => setInspectEvent(evt)}
                      className="px-3 py-1.5 text-xs font-bold text-sky-700 hover:text-white bg-white hover:bg-sky-700 border border-sky-300 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>مشاهده جزئیات</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pop-up Details Modal */}
      <EventDetailsModal
        event={inspectEvent}
        isOpen={Boolean(inspectEvent)}
        onClose={() => setInspectEvent(null)}
      />
    </div>
  );
};
