import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  Calendar,
  Clock,
  Package,
  Plus,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  Info,
  CalendarClock,
  Edit,
} from 'lucide-react';
import type {
  Asset,
  MaintenanceEvent,
  MaintenanceType,
  MaintenanceStatus,
  StoragePart,
  UsedPart,
  MaintenanceSchedule,
  User,
} from '../../types';
import { toPersianDigits } from '../../utils/persianDate';
import { TimeService } from '../../utils/timeService';
import { PersianDatePicker } from '../common/PersianDatePicker';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  schedules?: MaintenanceSchedule[];
  inventory: StoragePart[];
  currentUser: User | null;
  preselectedAssetId?: string;
  preselectedScheduleId?: string;
  initialEvent?: MaintenanceEvent | null;
  onSaveEvent: (
    event: Omit<MaintenanceEvent, 'id' | 'updatedAt'>,
    existingEventId?: string
  ) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  assets,
  schedules = [],
  inventory,
  currentUser,
  preselectedAssetId,
  preselectedScheduleId,
  initialEvent,
  onSaveEvent,
}) => {
  const todayTehran = TimeService.getTehranDateString();
  const [assetId, setAssetId] = useState(preselectedAssetId || assets[0]?.id || '');
  const [title, setTitle] = useState('');
  const [hasDeadline, setHasDeadline] = useState<boolean>(true);
  const [deadlineDate, setDeadlineDate] = useState(
    TimeService.calculateNextDueDate(todayTehran, 'days', 7)
  );
  const [affectedScheduleId, setAffectedScheduleId] = useState<string>(preselectedScheduleId || '');
  const [date, setDate] = useState(todayTehran);
  const [durationHours, setDurationHours] = useState('2.0');
  const [downtimeHours, setDowntimeHours] = useState('0.0');
  const [description, setDescription] = useState('');
  const [solution, setSolution] = useState('');
  const [status, setStatus] = useState<MaintenanceStatus>('pending_request');
  const [usedParts, setUsedParts] = useState<UsedPart[]>([]);

  // Part adder state
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');

  const isTech = currentUser?.role === 'technician';
  const isEditing = !!initialEvent;

  useEffect(() => {
    if (initialEvent) {
      setAssetId(initialEvent.assetId);
      setTitle(initialEvent.title);
      setHasDeadline(initialEvent.hasDeadline ?? true);
      setDeadlineDate(initialEvent.deadlineDate || todayTehran);
      setAffectedScheduleId(initialEvent.affectedScheduleId || initialEvent.originatingScheduleId || '');
      setDate(initialEvent.date || todayTehran);
      setDurationHours(String(initialEvent.durationHours || 2.0));
      setDowntimeHours(String(initialEvent.downtimeHours || 0.0));
      setDescription(initialEvent.description || '');
      setSolution(initialEvent.solution || '');
      setStatus(initialEvent.status);
      setUsedParts(initialEvent.partsUsed || []);
      return;
    }

    if (preselectedScheduleId) {
      const sch = schedules.find((s) => s.id === preselectedScheduleId);
      if (sch) {
        setAssetId(sch.assetId);
        setAffectedScheduleId(sch.id);
        setTitle(`اجرای سرویس PM: ${sch.taskTitle}`);
        setDescription(sch.description);
        setDate(sch.nextDueDate || todayTehran);
        setHasDeadline(true);
        setDeadlineDate(sch.nextDueDate || todayTehran);
        setStatus('scheduled');
        return;
      }
    }

    if (preselectedAssetId) {
      setAssetId(preselectedAssetId);
    } else if (assets.length > 0 && !assetId) {
      setAssetId(assets[0].id);
    }

    // Default status for new manual requests
    setStatus(isTech ? 'pending_request' : 'scheduled');
  }, [isOpen, initialEvent, preselectedAssetId, preselectedScheduleId, schedules, assets, isTech]);

  if (!isOpen) return null;

  const currentAssetSchedules = schedules.filter((s) => s.assetId === assetId);

  const handleAddPart = () => {
    if (!selectedPartId) return;
    const invItem = inventory.find((i) => i.id === selectedPartId);
    if (!invItem) return;

    const qty = parseInt(partQty, 10) || 1;
    setUsedParts([
      ...usedParts,
      {
        storagePartId: invItem.id,
        partName: invItem.partName,
        partNumber: invItem.partNumber,
        quantityUsed: qty,
        unitCost: invItem.unitCost,
      },
    ]);
    setSelectedPartId('');
    setPartQty('1');
  };

  const handleRemovePart = (index: number) => {
    setUsedParts(usedParts.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find((a) => a.id === assetId);
    if (!asset || !title) return;

    // Determine type
    const finalType: MaintenanceType = !hasDeadline
      ? 'emergency'
      : (affectedScheduleId || initialEvent?.isAutomatedPM)
      ? 'preventive'
      : 'corrective';

    // Status logic:
    // If technician creating fresh manual request -> 'pending_request' (awaiting manager authorization)
    // If technician executing schedule -> 'scheduled'
    // If editing -> preserve status or use selected status
    let finalStatus: MaintenanceStatus = status;
    if (!isEditing) {
      if (isTech) {
        finalStatus = preselectedScheduleId ? 'scheduled' : 'pending_request';
      } else {
        finalStatus = status;
      }
    }

    onSaveEvent(
      {
        assetId: asset.id,
        assetName: asset.name,
        assetCode: asset.code,
        title,
        type: finalType,
        status: finalStatus,
        date,
        hasDeadline,
        deadlineDate: hasDeadline ? deadlineDate : undefined,
        originatingScheduleId:
          initialEvent?.originatingScheduleId || affectedScheduleId || undefined,
        scheduleId:
          initialEvent?.scheduleId || affectedScheduleId || undefined,
        scheduleOccurrenceDate:
          initialEvent?.scheduleOccurrenceDate || (hasDeadline ? deadlineDate : undefined),
        affectedScheduleId:
          affectedScheduleId || initialEvent?.affectedScheduleId || undefined,
        isAutomatedPM: initialEvent?.isAutomatedPM || !!affectedScheduleId,
        sideEffectsApplied: initialEvent?.sideEffectsApplied ?? false,
        isProvisionalTime: !TimeService.isServerTimeConfirmed(),
        technicianId: initialEvent?.technicianId || currentUser?.id || 'usr-2',
        technicianName: initialEvent?.technicianName || currentUser?.fullName || 'تکنسین عملیات',
        durationHours: parseFloat(durationHours) || 0,
        downtimeHours: parseFloat(downtimeHours) || 0,
        description,
        solution,
        partsUsed: usedParts,
        approvedBy: initialEvent?.approvedBy,
        approvalNotes: initialEvent?.approvalNotes,
        approvalDate: initialEvent?.approvalDate,
      },
      initialEvent?.id
    );

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {isEditing ? (
                <>
                  <Edit className="w-4 h-4 text-sky-600" />
                  <span>ویرایش رویداد و دستورکار فنی</span>
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 text-sky-600" />
                  <span>
                    {isTech
                      ? preselectedScheduleId
                        ? 'ثبت دستورکار برگرفته از برنامه نت'
                        : 'ثبت درخواست جدید نگهداری و تعمیرات'
                      : 'صدور دستورکار و رویداد فنی'}
                  </span>
                </>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditing
                ? 'مشخصات دستورکار را ویرایش نمایید (ارتباط با برنامه نت حفظ می‌شود)'
                : isTech
                ? 'درخواست شما برای بررسی و صدور مجوز کار به کارتابل مدیر ارسال می‌شود'
                : 'تعریف دستورکار برنامه‌ریزی‌شده یا ثبت مستقیم کار انجام‌شده'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-vazir max-h-[75vh] overflow-y-auto">
          {/* Schedule link indicator */}
          {(initialEvent?.originatingScheduleId || affectedScheduleId) && (
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-950 text-[11px] leading-relaxed flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                این رویداد به <strong>برنامه نت پیشگیرانه (PM)</strong> متصل است. با تکمیل معتبر آن، دوره برنامه به‌روزرسانی خواهد شد.
              </span>
            </div>
          )}

          {/* PM / EM Explanation Banner */}
          <div className="p-3 bg-sky-50 rounded-xl border border-sky-200/80 text-sky-950 text-[11px] leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <strong>راهنمای گردش‌کار و انواع رویداد:</strong>
              <div className="mt-0.5 text-slate-600">
                • رویدادهای بدون مهلت به عنوان <strong>تعمیرات اضطراری (EM)</strong> و رویدادهای دارای مهلت به عنوان اقدامات برنامه‌ریزی‌شده تلقی می‌شوند.
                <br />
                {isTech && !isEditing && (
                  <span>• درخواست ثبت‌شده پس از تایید مدیر، به دستورکار فعال تبدیل شده و امکان ثبت پایان کار فعال می‌گردد.</span>
                )}
              </div>
            </div>
          </div>

          {/* Target Equipment & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">تجهیز هدف</label>
              <select
                value={assetId}
                onChange={(e) => {
                  setAssetId(e.target.value);
                  setAffectedScheduleId('');
                }}
                disabled={isEditing}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.code}] {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">عنوان رویداد / دستورکار*</label>
              <input
                type="text"
                required
                placeholder="مثال: تعویض بیرینگ و روانکاری پمپ آب خام"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Event Nature: Deadline vs No-Deadline (EM) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <label className="block font-bold text-slate-800">
              مهلت انجام و وضعیت اضطراری
            </label>

            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  name="deadlineType"
                  checked={hasDeadline}
                  onChange={() => setHasDeadline(true)}
                  className="text-sky-600 focus:ring-sky-500"
                />
                <span>دارای موعد مقرر (برنامه‌ریزی‌شده PM یا اصلاحی)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="radio"
                  name="deadlineType"
                  checked={!hasDeadline}
                  onChange={() => setHasDeadline(false)}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="text-rose-700 font-bold">بدون مهلت - تعمیرات اضطراری (EM)</span>
              </label>
            </div>

            {hasDeadline && (
              <div className="pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="text-xs font-semibold text-slate-600 shrink-0">
                  مهلت انجام کار (Deadline):
                </label>
                <div className="w-full sm:w-64">
                  <PersianDatePicker
                    value={deadlineDate}
                    onChange={setDeadlineDate}
                    placeholder="انتخاب مهلت انجام..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Affected Maintenance Schedule (Optional) */}
          {currentAssetSchedules.length > 0 && (
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                  اتصال به برنامه نگهداری پیشگیرانه تجهیز (PM)
                </label>
                <span className="text-[11px] text-indigo-600">اختیاری</span>
              </div>
              <p className="text-[11px] text-slate-600">
                در صورت انتخاب، با تایید نهایی این رویداد، تاریخ برنامه انتخاب‌شده به‌روزرسانی می‌شود.
              </p>
              <select
                value={affectedScheduleId}
                onChange={(e) => setAffectedScheduleId(e.target.value)}
                className="w-full px-3 py-2 border border-indigo-200 rounded-lg bg-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- بدون وابستگی به برنامه نت دوره‌ای --</option>
                {currentAssetSchedules.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    برنامه: {sch.taskTitle} (دوره: {toPersianDigits(sch.intervalValue)}{' '}
                    {sch.intervalType === 'months'
                      ? 'ماه'
                      : sch.intervalType === 'weeks'
                      ? 'هفته'
                      : sch.intervalType === 'days'
                      ? 'روز'
                      : 'ساعت'}
                    )
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Manager Direct Status Selection (Only for manager creating/editing) */}
          {!isTech && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block">وضعیت گردش‌کار دستورکار:</span>
                <span className="text-[11px] text-slate-500">
                  می‌توانید دستورکار را برای انجام برنامه‌ریزی کنید یا مستقیماً به عنوان کار تکمیل‌شده ثبت نمایید.
                </span>
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MaintenanceStatus)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-bold text-xs"
              >
                <option value="scheduled">برنامه‌ریزی‌شده - آماده اجرا (Scheduled)</option>
                <option value="in_progress">در حال انجام (In Progress)</option>
                <option value="pending_approval">در انتظار تایید اتمام کار</option>
                <option value="completed">تایید و تکمیل‌شده (Completed)</option>
                <option value="rejected">نیازمند اصلاح (Rejected)</option>
                <option value="cancelled">لغو شده (Cancelled)</option>
              </select>
            </div>
          )}

          {/* Date & Downtime (hour-technician removed as requested in Section 4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <PersianDatePicker
                label="تاریخ ثبت / اقدام"
                required
                value={date}
                onChange={setDate}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">مدت توقف خط تصفیه‌خانه (ساعت)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={downtimeHours}
                onChange={(e) => setDowntimeHours(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              شرح وضعیت، عیب یا دستورکار مورد نظر:
            </label>
            <textarea
              rows={3}
              placeholder="شرح شواهد فنی، نشانه‌های بروز عیب یا دستورالعمل اجرای کار..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Solution / Actions (if already performed) */}
          {(status === 'completed' || isEditing) && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                اقدامات انجام‌شده، تعمیر و راه‌اندازی:
              </label>
              <textarea
                rows={2}
                placeholder="شرح عملیات انجام شده در صورت اتمام کار..."
                value={solution}
                onChange={(e) => setSolution(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          )}

          {/* Consumed Spare Parts */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-sky-600" />
              تخصیص قطعات یدکی مصرف‌شده از انبار
            </label>

            <div className="flex items-center gap-2 mb-2">
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">-- انتخاب قطعه از انبار ملزومات --</option>
                {inventory.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.partName} [{inv.partNumber}] - موجودی: {toPersianDigits(inv.quantityInStock)} {inv.unit}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={partQty}
                onChange={(e) => setPartQty(e.target.value)}
                className="w-20 px-3 py-2 border border-slate-300 rounded-lg font-mono text-center"
                placeholder="تعداد"
              />

              <button
                type="button"
                onClick={handleAddPart}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن</span>
              </button>
            </div>

            {usedParts.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                {usedParts.map((p, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between bg-slate-50">
                    <div>
                      <span className="font-bold text-slate-800">{p.partName}</span>
                      <span className="text-[11px] text-slate-400 font-mono mr-2">
                        [{p.partNumber}]
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-slate-900">
                        {toPersianDigits(p.quantityUsed)} عدد
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePart(idx)}
                        className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isEditing
                  ? 'ذخیره تغییرات رویداد'
                  : isTech
                  ? 'ارسال درخواست به کارتابل مدیر'
                  : 'ثبت و صدور دستورکار'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
