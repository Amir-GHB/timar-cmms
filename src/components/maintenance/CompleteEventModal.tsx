import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Package,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Wrench,
  ShieldCheck,
} from 'lucide-react';
import type { MaintenanceEvent, StoragePart, UsedPart, Role } from '../../types';
import { toPersianDigits } from '../../utils/persianDate';

interface CompleteEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: MaintenanceEvent | null;
  inventory: StoragePart[];
  userRole?: Role;
  onComplete: (
    eventId: string,
    completionData: {
      solution: string;
      durationHours: number;
      downtimeHours: number;
      partsUsed: UsedPart[];
    }
  ) => void;
}

export const CompleteEventModal: React.FC<CompleteEventModalProps> = ({
  isOpen,
  onClose,
  event,
  inventory,
  userRole = 'technician',
  onComplete,
}) => {
  const [solution, setSolution] = useState('');
  const [durationHours, setDurationHours] = useState('1.5');
  const [downtimeHours, setDowntimeHours] = useState('0');
  const [partsUsed, setPartsUsed] = useState<UsedPart[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('');
  const [partQty, setPartQty] = useState('1');

  if (!isOpen || !event) return null;

  const isManager = userRole === 'manager';

  const handleAddPart = () => {
    if (!selectedPartId) return;
    const invItem = inventory.find((i) => i.id === selectedPartId);
    if (!invItem) return;

    const qty = parseInt(partQty, 10) || 1;
    setPartsUsed([
      ...partsUsed,
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
    setPartsUsed(partsUsed.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!solution.trim()) return;

    onComplete(event.id, {
      solution,
      durationHours: parseFloat(durationHours) || 1,
      downtimeHours: parseFloat(downtimeHours) || 0,
      partsUsed,
    });

    setSolution('');
    setPartsUsed([]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isManager ? 'تایید نهایی و تکمیل دستورکار' : 'ثبت اتمام عملیات نگهداری و تعمیرات'}
              </h2>
              <p className="text-[11px] text-slate-500">
                تجهیز: {event.assetName} ({event.assetCode})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-vazir">
          {/* Work Order Info Card */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-400 block mb-0.5">عنوان اقدام:</span>
            <span className="text-xs font-bold text-slate-800">{event.title}</span>
            {event.description && (
              <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{event.description}</p>
            )}
          </div>

          {/* Solution / Actions Taken */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              شرح اقدامات انجام‌شده و نتایج آزمون راه‌اندازی: <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="شرح کامل عملیات انجام شده، تعویض یا روانکاری قطعات، اندازه‌گیری‌های ارتعاش، جریان یا دما..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 leading-relaxed"
            />
          </div>

          {/* Duration & Downtime */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                ساعت کارکرد نیروی انسانی (نفر-ساعت):
              </label>
              <input
                type="number"
                step="0.5"
                min="0.1"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                میزان توقف تجهیز/خط (ساعت):
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={downtimeHours}
                onChange={(e) => setDowntimeHours(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              />
            </div>
          </div>

          {/* Spare Parts Selection */}
          <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-sky-600" />
                قطعات یدکی مصرفی از انبار:
              </span>
              <span className="text-[11px] text-slate-400">
                {partsUsed.length > 0 ? `${toPersianDigits(partsUsed.length)} قلم انتخاب شده` : 'بدون قطعه'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs"
              >
                <option value="">-- انتخاب قطعه از انبار --</option>
                {inventory.map((part) => (
                  <option key={part.id} value={part.id}>
                    {part.partName} ({part.partNumber}) - موجودی: {toPersianDigits(part.quantityInStock)}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                value={partQty}
                onChange={(e) => setPartQty(e.target.value)}
                className="w-16 px-2 py-2 bg-white border border-slate-200 rounded-lg text-center font-mono focus:outline-none"
                placeholder="تعداد"
              />

              <button
                type="button"
                onClick={handleAddPart}
                className="px-3 py-2 bg-sky-700 text-white rounded-lg hover:bg-sky-600 transition-colors font-bold cursor-pointer shrink-0"
              >
                افزودن
              </button>
            </div>

            {partsUsed.length > 0 && (
              <div className="divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
                {partsUsed.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{p.partName}</span>
                      <span className="text-slate-400 font-mono text-[11px] mr-2">
                        {p.partNumber} · {toPersianDigits(p.quantityUsed)} عدد
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePart(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workflow hint banner */}
          <div
            className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-center gap-2 ${
              isManager
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {isManager ? (
              <>
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>
                  با ثبت مدیر، این دستورکار بلافاصله مختومه شده، قطعات از انبار کسر و در صورت وابستگی به برنامه نت، تاریخ موعد بعدی محاسبه می‌شود.
                </span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  پس از ثبت توسط تکنسین، گزارش به کارتابل مدیر ارسال می‌شود. قطعات پس از تایید نهایی مدیر از انبار کسر خواهند شد.
                </span>
              </>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className={`px-5 py-2 rounded-lg text-white font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                isManager
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-sky-700 hover:bg-sky-600'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isManager ? 'تایید نهایی و بستن دستورکار' : 'ثبت اتمام کار و ارسال به مدیر'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
