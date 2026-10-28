import React, { useState } from 'react';
import {
  CheckSquare,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Package,
  AlertTriangle,
  FileText,
  Wrench,
  RotateCcw,
} from 'lucide-react';
import type { MaintenanceEvent, Role, User as UserType } from '../../types';
import { formatPersianDate, toPersianDigits } from '../../utils/persianDate';

interface RequestsSectionViewProps {
  events: MaintenanceEvent[];
  userRole?: Role;
  currentUser: UserType | null;
  onApproveEvent: (eventId: string, approvalNotes: string) => void;
  onRejectEvent: (eventId: string, revisionNotes: string) => void;
  onAuthorizeRequest?: (eventId: string, managerNotes?: string) => void;
  initialSelectedEventId?: string;
  onItemViewed?: (eventId: string) => void;
}

export const RequestsSectionView: React.FC<RequestsSectionViewProps> = ({
  events,
  userRole,
  currentUser,
  onApproveEvent,
  onRejectEvent,
  onAuthorizeRequest,
  initialSelectedEventId,
  onItemViewed,
}) => {
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all' | 'completed' | 'rejected'>('pending');
  const [managerNotes, setManagerNotes] = useState('');

  // Requests submitted by technicians
  const requestEvents = events.filter((e) => {
    if (filterStatus === 'pending') {
      return e.status === 'pending_approval' || e.status === 'pending_request';
    }
    if (filterStatus === 'completed') return e.status === 'completed';
    if (filterStatus === 'rejected') return e.status === 'rejected';
    return true; // all
  });

  const [selectedEventId, setSelectedEventId] = useState<string>(
    initialSelectedEventId || requestEvents[0]?.id || ''
  );

  React.useEffect(() => {
    if (initialSelectedEventId) {
      setSelectedEventId(initialSelectedEventId);
      onItemViewed?.(initialSelectedEventId);
    }
  }, [initialSelectedEventId, onItemViewed]);

  React.useEffect(() => {
    if (selectedEventId) {
      onItemViewed?.(selectedEventId);
    }
  }, [selectedEventId, onItemViewed]);

  const selectedEvent =
    requestEvents.find((e) => e.id === selectedEventId) || requestEvents[0];

  const pendingCount = events.filter(
    (e) => e.status === 'pending_approval' || e.status === 'pending_request'
  ).length;

  const handleApprove = () => {
    if (!selectedEvent) return;
    if (selectedEvent.status === 'pending_request') {
      onAuthorizeRequest?.(selectedEvent.id, managerNotes || 'درخواست تایید و دستورکار صادر گردید.');
    } else {
      onApproveEvent(selectedEvent.id, managerNotes || 'تایید شد و در سوابق نهایی تجهیز ثبت گردید.');
    }
    setManagerNotes('');
  };

  const handleReject = () => {
    if (!selectedEvent) return;
    if (!managerNotes.trim()) {
      alert('لطفاً دلیل درخواست بازبینی یا رد درخواست را در کادر یادداشت مدیر وارد نمایید.');
      return;
    }
    onRejectEvent(selectedEvent.id, managerNotes);
    setManagerNotes('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafafa] p-4 md:p-6 space-y-4" dir="rtl">
      {/* Role Banner if Technician */}
      {userRole !== 'manager' && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900 shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>کارتابل تکنسین:</strong> شما می‌توانید وضعیت درخواست‌های ارسالی خود را در این بخش پیگیری نمایید. تایید نهایی و کسر از انبار منحصراً توسط مدیر فنی انجام می‌شود.
            </span>
          </div>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-sky-600" />
            <span>کارتابل درخواست‌ها و تاییدیه‌ها</span>
          </h1>
          <p className="text-xs text-slate-500">
            بررسی، تایید یا درخواست اصلاح گزارش‌های تکمیل کار ارسالی توسط تکنسین‌های فنی
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg text-xs shrink-0">
          {[
            { id: 'pending', label: `در انتظار بررسی (${toPersianDigits(pendingCount)})` },
            { id: 'all', label: 'همه درخواست‌ها' },
            { id: 'completed', label: 'تاییدشده' },
            { id: 'rejected', label: 'نیازمند اصلاح' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                filterStatus === tab.id
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {requestEvents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
          <h3 className="text-sm font-bold text-slate-900">هیچ درخواستی در این وضعیت وجود ندارد</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            در حال حاضر هیچ درخواست تکمیل کار در انتظار بررسی یافت نشد.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
          {/* Right list: Request Cards (in RTL) */}
          <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1 shrink-0 shadow-xs">
            {requestEvents.map((evt) => {
              const isSelected = selectedEvent?.id === evt.id;
              const isPending = evt.status === 'pending_approval';

              return (
                <button
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`w-full text-right p-3 rounded-xl transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 border border-sky-300 ring-1 ring-sky-200'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                      {evt.assetCode}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formatPersianDate(evt.date, { showMonthName: true })}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                    {evt.title}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {evt.technicianName}
                    </span>

                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        evt.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : evt.status === 'pending_request'
                          ? 'bg-sky-100 text-sky-800'
                          : evt.status === 'pending_approval'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {evt.status === 'completed'
                        ? 'تایید شده'
                        : evt.status === 'pending_request'
                        ? 'درخواست جدید'
                        : evt.status === 'pending_approval'
                        ? 'در انتظار تایید'
                        : 'نیازمند اصلاح'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Left inspection & sign-off card (in RTL) */}
          {selectedEvent && (
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 md:p-6 overflow-y-auto space-y-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                      {selectedEvent.assetCode}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {selectedEvent.assetName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        selectedEvent.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedEvent.status === 'pending_request'
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : selectedEvent.status === 'pending_approval'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {selectedEvent.status === 'completed'
                        ? 'تایید نهایی شده'
                        : selectedEvent.status === 'pending_request'
                        ? 'درخواست کار جدید - در انتظار بررسی و صدور دستورکار'
                        : selectedEvent.status === 'pending_approval'
                        ? 'در انتظار بررسی مدیر'
                        : 'نیازمند اصلاح توسط تکنسین'}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    {selectedEvent.title}
                  </h2>
                </div>

                <div className="text-left text-xs">
                  <span className="text-slate-400 block text-[11px]">تاریخ ثبت گزارش</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {formatPersianDate(selectedEvent.date, { showMonthName: true })}
                  </span>
                </div>
              </div>

              {/* Technician & Labor Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">تکنسین گزارش‌دهنده</span>
                  <span className="font-bold text-slate-800">{selectedEvent.technicianName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">نوع رویداد</span>
                  <span className="font-bold text-slate-800">
                    {selectedEvent.type === 'emergency'
                      ? 'تعمیر اضطراری (EM)'
                      : selectedEvent.type === 'preventive'
                      ? 'پیشگیرانه (PM)'
                      : 'اصلاحی'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">مدت کارکرد</span>
                  <span className="font-mono font-bold text-slate-800">
                    {toPersianDigits(selectedEvent.durationHours)} ساعت
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">توقف خط تصفیه‌خانه</span>
                  <span className="font-mono font-bold text-rose-700">
                    {selectedEvent.downtimeHours > 0
                      ? `${toPersianDigits(selectedEvent.downtimeHours)} ساعت`
                      : 'بدون توقف'}
                  </span>
                </div>
              </div>

              {/* Observations */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  مشاهدات تکنسین و شواهد فنی عیب
                </h3>
                <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-700 leading-relaxed border border-slate-100">
                  {selectedEvent.description || 'توضیحی ثبت نشده است.'}
                </div>
              </div>

              {/* Actions Taken */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                  اقدامات انجام‌شده، تعمیر و راه‌اندازی
                </h3>
                <div className="p-3.5 bg-emerald-50/50 rounded-xl text-xs text-slate-800 leading-relaxed border border-emerald-100">
                  {selectedEvent.solution || 'شرح اقدامی ثبت نشده است.'}
                </div>
              </div>

              {/* Consumed Spare Parts */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-sky-600" />
                  قطعات یدکی مصرف‌شده از انبار ({toPersianDigits(selectedEvent.partsUsed.length)} قلم)
                </h3>

                {selectedEvent.partsUsed.length === 0 ? (
                  <div className="text-xs text-slate-400 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    قطعه‌ای از انبار برای این دستورکار ثبت نشده است.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <tr>
                          <th className="px-3.5 py-2">نام قطعه</th>
                          <th className="px-3.5 py-2">شماره فنی (Part Number)</th>
                          <th className="px-3.5 py-2 text-center">تعداد مصرفی</th>
                          <th className="px-3.5 py-2 text-left">هزینه واحد (ریال)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedEvent.partsUsed.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3.5 py-2 font-medium text-slate-800">{p.partName}</td>
                            <td className="px-3.5 py-2 font-mono text-slate-500">{p.partNumber}</td>
                            <td className="px-3.5 py-2 text-center font-mono font-bold text-slate-900">
                              {toPersianDigits(p.quantityUsed)}
                            </td>
                            <td className="px-3.5 py-2 text-left font-mono text-slate-600">
                              {toPersianDigits(p.unitCost.toLocaleString())}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Manager Decision Box */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  یادداشت و دستورات مدیر فنی جهت تایید یا بازبینی
                </label>
                <textarea
                  rows={2}
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="توضیحات تایید، بازرسی نهایی هم‌راستاسازی، یا موارد نیازمند اصلاح توسط تکنسین..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                  disabled={userRole !== 'manager'}
                />

                {userRole === 'manager' ? (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={handleReject}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>
                        {selectedEvent.status === 'pending_request'
                          ? 'رد یا لغو درخواست'
                          : 'درخواست بازبینی و اصلاح'}
                      </span>
                    </button>
                    <button
                      onClick={handleApprove}
                      className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {selectedEvent.status === 'pending_request'
                          ? 'تایید و صدور دستورکار (آماده اجرا)'
                          : 'تایید و نهایی‌سازی دستورکار'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-right">
                    تنها کاربران با نقش «مدیر فنی» مجاز به تایید نهایی دستورکار و کسر اقلام از انبار هستند.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
