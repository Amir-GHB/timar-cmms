import React, { useState } from 'react';
import { X, CalendarClock, Save, HelpCircle } from 'lucide-react';
import type { MaintenanceSchedule, IntervalType, Role } from '../../types';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  assetName: string;
  assetCode: string;
  onSave: (schedule: Omit<MaintenanceSchedule, 'id' | 'updatedAt'>) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  assetId,
  assetName,
  assetCode,
  onSave,
}) => {
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [intervalType, setIntervalType] = useState<IntervalType>('months');
  const [intervalValue, setIntervalValue] = useState('1');
  const [lastPerformedDate, setLastPerformedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [assignedRole, setAssignedRole] = useState<Role>('technician');

  if (!isOpen) return null;

  // Calculate next due date
  const computeNextDue = (baseDateStr: string, type: IntervalType, val: number): string => {
    const d = new Date(baseDateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];

    if (type === 'days') d.setDate(d.getDate() + val);
    else if (type === 'weeks') d.setDate(d.getDate() + val * 7);
    else if (type === 'months') d.setMonth(d.getMonth() + val);
    else if (type === 'hours') d.setDate(d.getDate() + Math.ceil(val / 24)); // approx
    return d.toISOString().split('T')[0];
  };

  const nextDueDate = computeNextDue(lastPerformedDate, intervalType, parseInt(intervalValue, 10) || 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;

    onSave({
      assetId,
      assetName,
      assetCode,
      taskTitle,
      description,
      intervalType,
      intervalValue: parseInt(intervalValue, 10) || 1,
      lastPerformedDate,
      nextDueDate,
      status: 'active',
      assignedRole,
    });

    setTaskTitle('');
    setDescription('');
    setIntervalValue('1');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-sky-600" />
              تعریف برنامه نت پیشگیرانه دوره‌ای (PM)
            </h2>
            <p className="text-xs text-slate-500">
              تجهیز هدف: <strong>[{assetCode}] {assetName}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-vazir">
          <div>
            <label className="block font-bold text-slate-700 mb-1">عنوان دستورکار دوره‌ای (PM)*</label>
            <input
              type="text"
              required
              placeholder="مثال: روانکاری و گریس‌کاری یاتاقان‌ها و بازرسی لرزش"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">دوره تکرار برنامه</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  required
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(e.target.value)}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg font-mono text-center"
                />
                <select
                  value={intervalType}
                  onChange={(e) => setIntervalType(e.target.value as IntervalType)}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="days">روز</option>
                  <option value="weeks">هفته</option>
                  <option value="months">ماه</option>
                  <option value="hours">ساعت کارکرد</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">نقش مجری برنامه</label>
              <select
                value={assignedRole}
                onChange={(e) => setAssignedRole(e.target.value as Role)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="technician">تکنسین تعمیرات و نگهداری</option>
                <option value="manager">مدیر فنی / ناظر ارشد</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">تاریخ آخرین اجرا</label>
              <input
                type="date"
                required
                value={lastPerformedDate}
                onChange={(e) => setLastPerformedDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">موعد انجام بعدی (محاسبه خودکار)</label>
              <input
                type="date"
                readOnly
                value={nextDueDate}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-50 text-slate-700 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 flex items-start gap-2 text-sky-900 text-[11px] leading-relaxed">
            <HelpCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <span>
              <strong>مکانیزم تکرار خودکار (PM):</strong> با فرارسیدن تاریخ موعد، این برنامه در فهرست رویدادهای آماده به انجام نمایش داده می‌شود. با ثبت رویداد و تایید آن، تاریخ موعد بعدی به صورت خودکار بر مبنای فاصله تکرار جلو خواهد رفت.
            </span>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">شرح چک‌لیست و اقدامات الزامی</label>
            <textarea
              rows={2}
              placeholder="موارد چک‌لیست بازرسی، نوع گریس مجاز، مقادیر مجاز فشار و..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
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
              <Save className="w-3.5 h-3.5" />
              <span>ثبت برنامه PM</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
