import React from 'react';
import {
  X,
  Wrench,
  Clock,
  User,
  Package,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';
import type { MaintenanceEvent } from '../../types';
import { formatPersianDate, toPersianDigits } from '../../utils/persianDate';

interface EventDetailsModalProps {
  event: MaintenanceEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !event) return null;

  const isCompleted = event.status === 'completed';
  const isEmergency = event.type === 'emergency' || (!event.hasDeadline && event.type !== 'preventive');
  const isPending = event.status === 'pending_approval';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 bg-gradient-to-l from-slate-50 to-white border-b border-slate-200">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                {event.assetCode}
              </span>
              <span className="text-xs font-semibold text-slate-600">
                {event.assetName}
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  isEmergency
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : event.type === 'preventive'
                    ? 'bg-sky-100 text-sky-800 border border-sky-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}
              >
                {isEmergency
                  ? 'تعمیر اضطراری (EM)'
                  : event.type === 'preventive'
                  ? 'نت پیشگیرانه (PM)'
                  : 'تعمیرات اصلاحی (CM)'}
              </span>

              {event.isAutomatedPM && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  تولید خودکار بر اساس برنامه
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-bold text-slate-900 pt-1">
              {event.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 text-xs font-vazir max-h-[75vh] overflow-y-auto">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">وضعیت اقدام</span>
              <div className="flex items-center gap-1 font-bold">
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">تایید نهایی شده</span>
                  </>
                ) : isPending ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-amber-700">در انتظار تایید مدیر</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span className="text-sky-700">برنامه‌ریزی شده</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">تاریخ ثبت / اجرا</span>
              <span className="font-semibold text-slate-800 font-mono">
                {formatPersianDate(event.date, { showMonthName: true })}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">کارکرد نیروی انسانی</span>
              <span className="font-mono font-semibold text-slate-800">
                {toPersianDigits(event.durationHours)} ساعت
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-0.5">توقف خط تصفیه‌خانه</span>
              <span className="font-mono font-semibold text-rose-700">
                {event.downtimeHours > 0 ? `${toPersianDigits(event.downtimeHours)} ساعت` : 'بدون توقف'}
              </span>
            </div>
          </div>

          {/* Technician & Deadline info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-4 h-4 text-slate-400" />
                تکنسین مجری / ثبت‌کننده:
              </span>
              <span className="font-bold text-slate-800">{event.technicianName}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                مهلت انجام:
              </span>
              <span className="font-bold text-slate-800 font-mono">
                {event.deadlineDate
                  ? formatPersianDate(event.deadlineDate, { showMonthName: true })
                  : 'تعمیر اضطراری بدون مهلت (EM)'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-600" />
              شرح وضعیت و شواهد فنی عیب:
            </h3>
            <div className="p-3.5 bg-slate-50 rounded-xl text-slate-700 leading-relaxed border border-slate-200/80 whitespace-pre-wrap">
              {event.description || 'توضیحی ثبت نشده است.'}
            </div>
          </div>

          {/* Solution / Actions Taken */}
          {event.solution && (
            <div>
              <h3 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                اقدامات انجام‌شده، تعمیر و راه‌اندازی:
              </h3>
              <div className="p-3.5 bg-emerald-50/50 rounded-xl text-slate-800 leading-relaxed border border-emerald-100 whitespace-pre-wrap">
                {event.solution}
              </div>
            </div>
          )}

          {/* Parts Used */}
          <div>
            <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-sky-600" />
              قطعات یدکی مصرف‌شده از انبار ({toPersianDigits(event.partsUsed.length)} قلم):
            </h3>

            {event.partsUsed.length === 0 ? (
              <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
                هیچ قطعه یدکی از انبار برای این رویداد مصرف نشده است.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="px-3 py-2">نام قطعه</th>
                      <th className="px-3 py-2">شماره فنی (Part Number)</th>
                      <th className="px-3 py-2 text-center">تعداد مصرفی</th>
                      <th className="px-3 py-2 text-left">هزینه واحد (ریال/واحد)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {event.partsUsed.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-800">{p.partName}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{p.partNumber}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-slate-900">
                          {toPersianDigits(p.quantityUsed)}
                        </td>
                        <td className="px-3 py-2 text-left font-mono text-slate-600">
                          {toPersianDigits(p.unitCost.toLocaleString())}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Manager Approval Box */}
          {event.approvedBy && (
            <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  تایید شده توسط {event.approvedBy}
                </span>
                {event.approvalDate && (
                  <span className="font-mono text-[11px] text-emerald-700">
                    {formatPersianDate(event.approvalDate, { showMonthName: true })}
                  </span>
                )}
              </div>
              {event.approvalNotes && (
                <p className="text-xs text-emerald-800 pt-1">
                  <strong>یادداشت مدیر:</strong> {event.approvalNotes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
