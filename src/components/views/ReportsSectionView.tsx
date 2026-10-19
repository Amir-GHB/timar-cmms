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
} from 'lucide-react';
import type { MaintenanceEvent, Asset, MaintenanceSchedule } from '../../types';
import { formatPersianDate, toPersianDigits } from '../../utils/persianDate';
import { EventDetailsModal } from '../maintenance/EventDetailsModal';

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
  const [activeDatePreset, setActiveDatePreset] = useState<string>('all');
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

  const todayIso = new Date().toISOString().split('T')[0];

  // Reports only show what happened (completed) or what was supposed to happen and didn't happen / is overdue
  const relevantEvents = events.filter((e) => {
    // 1. Asset Filter
    if (!selectedAssetIds.includes(e.assetId)) return false;

    // 2. Happened: Completed
    const isHappened = e.status === 'completed';

    // 3. Supposed to happen and didn't happen / overdue:
    // Scheduled or pending or deadline passed without completion
    const isOverdue =
      e.status !== 'completed' &&
      ((e.deadlineDate && e.deadlineDate < todayIso) ||
        (e.date <= todayIso && e.status === 'scheduled') ||
        e.type === 'emergency');

    if (activeTab === 'happened') return isHappened;
    if (activeTab === 'overdue') return isOverdue;
    return isHappened || isOverdue;
  });

  const happenedCount = events.filter((e) => e.status === 'completed').length;
  const overdueCount = events.filter(
    (e) =>
      e.status !== 'completed' &&
      ((e.deadlineDate && e.deadlineDate < todayIso) || (e.date <= todayIso && e.status === 'scheduled'))
  ).length;

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
