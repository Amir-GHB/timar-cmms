import React, { useState } from 'react';
import { History, Wrench, AlertTriangle, Clock, User, Eye, Calendar } from 'lucide-react';
import type { MaintenanceEvent } from '../../types';
import { formatPersianDate, toPersianDigits } from '../../utils/persianDate';
import { EventDetailsModal } from '../maintenance/EventDetailsModal';

interface TimelineSectionViewProps {
  events: MaintenanceEvent[];
}

export const TimelineSectionView: React.FC<TimelineSectionViewProps> = ({ events }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [inspectEvent, setInspectEvent] = useState<MaintenanceEvent | null>(null);

  const filteredEvents = [...events]
    .filter((e) => {
      if (filterType === 'all') return true;
      if (filterType === 'emergency') return e.type === 'emergency' || (!e.hasDeadline && e.type !== 'preventive');
      return e.type === filterType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafafa] p-4 md:p-6 space-y-4" dir="rtl">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-sky-600" />
            <span>تایم‌لاین رویدادهای نگهداری و تعمیرات</span>
          </h1>
          <p className="text-xs text-slate-500">
            جریان زمانی پیوسته از اقدامات، تعمیرات اضطراری (EM) و سرویس‌های پیشگیرانه (PM) تصفیه‌خانه
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg text-xs shrink-0">
          {[
            { id: 'all', label: 'همه رویدادها' },
            { id: 'preventive', label: 'پیشگیرانه (PM)' },
            { id: 'emergency', label: 'اضطراری (EM)' },
            { id: 'corrective', label: 'اصلاحی' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterType(item.id)}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                filterType === item.id
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Timeline Card */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 overflow-y-auto p-5 md:p-8 shadow-xs">
        {filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            هیچ رویدادی در این دسته‌بندی ثبت نشده است.
          </div>
        ) : (
          <div className="relative border-r-2 border-slate-200 mr-2 sm:mr-32 pr-6 sm:pr-8 space-y-6">
            {filteredEvents.map((evt) => {
              const isEmergency =
                evt.type === 'emergency' || (!evt.hasDeadline && evt.type !== 'preventive');
              const isCompleted = evt.status === 'completed';

              return (
                <div key={evt.id} className="relative">
                  {/* 
                    Date Out of Widget & Right beside the bullet points:
                    On md/sm screens, the Persian date sits in the right gutter beside the bullet point.
                  */}
                  <div className="sm:absolute sm:-right-36 sm:top-2 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded font-mono">
                      <Calendar className="w-3 h-3 text-sky-600" />
                      {formatPersianDate(evt.date, { showMonthName: true })}
                    </span>
                  </div>

                  {/* Bullet Point Node on the vertical line */}
                  <div
                    className={`absolute -right-[31px] sm:-right-[39px] top-2.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                      isEmergency
                        ? 'bg-rose-500 ring-4 ring-rose-100'
                        : isCompleted
                        ? 'bg-emerald-500 ring-4 ring-emerald-100'
                        : 'bg-amber-500 ring-4 ring-amber-100'
                    }`}
                  />

                  {/* 
                    Minimal Event Widget Card:
                    Only core identification info + 'Show Details' button!
                  */}
                  <div className="bg-slate-50 hover:bg-slate-100/80 transition-colors p-3.5 sm:p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                            isEmergency
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : evt.type === 'preventive'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {isEmergency
                            ? 'اضطراری (EM)'
                            : evt.type === 'preventive'
                            ? 'پیشگیرانه (PM)'
                            : 'اصلاحی'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{evt.assetName}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {evt.technicianName}
                        </span>
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
                </div>
              );
            })}
          </div>
        )}
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
