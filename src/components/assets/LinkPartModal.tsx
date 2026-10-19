import React, { useState } from 'react';
import { X, Package, Plus, Check } from 'lucide-react';
import type { StoragePart } from '../../types';
import { toPersianDigits } from '../../utils/persianDate';

interface LinkPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetCode: string;
  assetName: string;
  inventory: StoragePart[];
  onLinkPart: (assetCode: string, partId: string) => void;
}

export const LinkPartModal: React.FC<LinkPartModalProps> = ({
  isOpen,
  onClose,
  assetCode,
  assetName,
  inventory,
  onLinkPart,
}) => {
  const [selectedPartId, setSelectedPartId] = useState<string>('');

  if (!isOpen) return null;

  // Parts not yet linked
  const availableParts = inventory.filter(
    (p) => !p.compatibleAssets?.includes(assetCode)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartId) return;
    onLinkPart(assetCode, selectedPartId);
    setSelectedPartId('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-sky-600" />
              تخصیص قطعه یدکی از انبار
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
            <label className="block font-bold text-slate-700 mb-1">
              انتخاب قطعه یدکی از انبار ملزومات تصفیه‌خانه
            </label>
            {availableParts.length === 0 ? (
              <div className="p-4 bg-slate-50 text-slate-400 text-center rounded-lg border border-slate-100">
                همه قطعات موجود در انبار قبلاً به این تجهیز متصل شده‌اند یا قطعه‌ای در انبار وجود ندارد.
              </div>
            ) : (
              <select
                value={selectedPartId}
                onChange={(e) => setSelectedPartId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="">-- انتخاب قطعه --</option>
                {availableParts.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.partName} [{inv.partNumber}] - موجودی: {toPersianDigits(inv.quantityInStock)} {inv.unit} (محل: {inv.shelfLocation})
                  </option>
                ))}
              </select>
            )}
          </div>

          <p className="text-[11px] text-slate-500 bg-sky-50 p-3 rounded-lg border border-sky-100 leading-relaxed">
            با اتصال این قطعه به تجهیز، در زمان ثبت خرابی یا سرویس، تکنسین‌ها به سادگی به این قطعه به عنوان قطعه پیشنهادی و استاندارد دسترسی خواهند داشت.
          </p>

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
              disabled={!selectedPartId}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>اتصال قطعه به تجهیز</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
