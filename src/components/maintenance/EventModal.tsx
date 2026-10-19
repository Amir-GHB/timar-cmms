import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Package,
  Wrench,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Clock,
  Info,
  CalendarClock,
  RotateCcw,
} from 'lucide-react';
import type {
  Asset,
  StoragePart,
  MaintenanceEvent,
  MaintenanceType,
  MaintenanceStatus,
  MaintenanceSchedule,
  UsedPart,
  User,
} from '../../types';
import { toPersianDigits } from '../../utils/persianDate';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  schedules?: MaintenanceSchedule[];
  inventory: StoragePart[];
  currentUser: User | null;
  preselectedAssetId?: string;
  onSaveEvent: (event: Omit<MaintenanceEvent, 'id' | 'updatedAt'>) => void;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  assets,
  schedules = [],
  inventory,
  currentUser,
  preselectedAssetId,
  onSaveEvent,
}) => {
  const [assetId, setAssetId] = useState(preselectedAssetId || assets[0]?.id || '');
  const [title, setTitle] = useState('');
  const [hasDeadline, setHasDeadline] = useState<boolean>(true);
  const [deadlineDate, setDeadlineDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [affectedScheduleId, setAffectedScheduleId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [durationHours, setDurationHours] = useState('2.0');
  const [downtimeHours, setDowntimeHours] = useState('0.0');
  const [description, setDescription] = useState('');
  const [solution, setSolution] = useState('');
  const [usedParts, setUsedParts] = useState<UsedPart[]>([]);

  // Part adder state
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');

  useEffect(() => {
    if (preselectedAssetId) {
      setAssetId(preselectedAssetId);
    } else if (assets.length > 0 && !assetId) {
      setAssetId(assets[0].id);
    }
  }, [preselectedAssetId, assets]);

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

    const isTech = currentUser?.role === 'technician';
    const finalStatus: MaintenanceStatus = isTech ? 'pending_approval' : 'completed';

    // If no deadline, unofficially considered EM (Emergency Maintenance)
    const finalType: MaintenanceType = !hasDeadline
      ? 'emergency'
      : affectedScheduleId
      ? 'preventive'
      : 'corrective';

    onSaveEvent({
      assetId: asset.id,
      assetName: asset.name,
      assetCode: asset.code,
      title,
      type: finalType,
      status: finalStatus,
      date,
      hasDeadline,
      deadlineDate: hasDeadline ? deadlineDate : undefined,
      affectedScheduleId: affectedScheduleId || undefined,
      technicianId: currentUser?.id || 'usr-2',
      technicianName: currentUser?.fullName || 'تکنسین عملیات',
      durationHours: parseFloat(durationHours) || 0,
      downtimeHours: parseFloat(downtimeHours) || 0,
      description,
      solution,
      partsUsed: usedParts,
      approvedBy: currentUser?.role === 'manager' ? currentUser.fullName : undefined,
      approvalDate: currentUser?.role === 'manager' ? new Date().toISOString() : undefined,
    });

    onClose();
  };

  const isTech = currentUser?.role === 'technician';

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
              <Wrench className="w-4 h-4 text-sky-600" />
              {isTech ? 'ثبت و ارسال درخواست گزارش کار' : 'ثبت رویداد و دستورکار فنی'}
            </h2>
            <p className="text-xs text-slate-500">
              {isTech
                ? 'گزارش شما پس از ثبت، برای بررسی به کارتابل مدیر ارسال می‌شود'
                : 'ثبت مستقیم با اختیار تایید نهایی و به‌روزرسانی برنامه‌های PM'}
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
          {/* PM / EM Explanation Banner */}
          <div className="p-3 bg-sky-50 rounded-xl border border-sky-200/80 text-sky-950 text-[11px] leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <strong>راهنمای انواع رویدادها (PM و EM):</strong>
              <div className="mt-0.5 text-slate-600">
                • رویدادهای سفارشی دارای مهلت به عنوان اقدامات برنامه‌ریزی‌شده و رویدادهای بدون مهلت به عنوان <strong>تعمیرات اضطراری و رفع خرابی (EM)</strong> تلقی می‌شوند.
                <br />
                • در صورت انتخاب برنامه PM مرتبط، با تکمیل رویداد، موعد برنامه به تاریخ اجرا ریست می‌شود.
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="deadlineType"
                  checked={hasDeadline}
                  onChange={() => setHasDeadline(true)}
                  className="text-sky-600"
                />
                <div>
                  <span className="font-bold text-slate-800 block text-xs">دارای مهلت انجام مشخص</span>
                  <span className="text-[10px] text-slate-500">اقدام زمان‌بندی‌شده دوره‌ای یا اصلاحی</span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="deadlineType"
                  checked={!hasDeadline}
                  onChange={() => setHasDeadline(false)}
                  className="text-rose-600"
                />
                <div>
                  <span className="font-bold text-rose-700 block text-xs">بدون مهلت (تعمیر اضطراری - EM)</span>
                  <span className="text-[10px] text-slate-500">خرابی غیرمترقبه نیازمند رفع عیب فوری</span>
                </div>
              </label>
            </div>

            {hasDeadline && (
              <div className="pt-2 flex items-center gap-3">
                <span className="text-slate-600 text-xs font-medium">تاریخ سررسید مهلت:</span>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg font-mono text-xs bg-white"
                />
              </div>
            )}
          </div>

          {/* Affected Schedule Selection (Reset upon completion) */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-sky-600" />
                برنامه نت پیشگیرانه (PM) مرتبط جهت تمدید و ریست دوره:
              </label>
              {affectedScheduleId && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  دوره تکرار ریست خواهد شد
                </span>
              )}
            </div>

            {currentAssetSchedules.length === 0 ? (
              <div className="text-[11px] text-slate-400">
                برنامه PM ثبت‌شده‌ای برای این تجهیز تعریف نشده است.
              </div>
            ) : (
              <select
                value={affectedScheduleId}
                onChange={(e) => setAffectedScheduleId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-vazir text-xs"
              >
                <option value="">-- بدون انتساب به برنامه دوره‌ای (رویداد مستقل) --</option>
                {currentAssetSchedules.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.taskTitle} (هر {toPersianDigits(sch.intervalValue)}{' '}
                    {sch.intervalType === 'months'
                      ? 'ماه'
                      : sch.intervalType === 'weeks'
                      ? 'هفته'
                      : sch.intervalType === 'hours'
                      ? 'ساعت'
                      : 'روز'})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Metrics & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">تاریخ انجام اقدام</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">مدت کارکرد تکنسین (ساعت)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">توقف خط تصفیه‌خانه (ساعت)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={downtimeHours}
                onChange={(e) => setDowntimeHours(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              شرح وضعیت، شواهد عیب و مشاهدات تکنسین
            </label>
            <textarea
              rows={2}
              required
              placeholder="توضیح در مورد لرزش، دبی، نشتی یا چک‌لیست سرویس..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Solution */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              اقدامات انجام‌شده و راه‌حل نهایی
            </label>
            <textarea
              rows={2}
              placeholder="شرح قطعات تعویض‌شده، نتایج روانکاری یا تست راه‌اندازی..."
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

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
              <span>{isTech ? 'ارسال درخواست تایید به مدیر' : 'ثبت و تایید دستورکار'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
