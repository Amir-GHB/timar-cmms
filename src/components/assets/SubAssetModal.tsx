import React, { useState } from 'react';
import { X, Layers, Save } from 'lucide-react';
import type { SubAsset } from '../../types';

interface SubAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  assetName: string;
  assetCode: string;
  onSave: (subAsset: Omit<SubAsset, 'id' | 'updatedAt'>) => void;
}

export const SubAssetModal: React.FC<SubAssetModalProps> = ({
  isOpen,
  onClose,
  assetId,
  assetName,
  assetCode,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [status, setStatus] = useState<'normal' | 'worn' | 'needs_replacement'>('normal');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    onSave({
      assetId,
      name,
      partNumber: partNumber || 'PN-SUB',
      serialNumber: serialNumber || 'SN-SUB',
      status,
      notes,
    });
    setName('');
    setPartNumber('');
    setSerialNumber('');
    setStatus('normal');
    setNotes('');
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
              <Layers className="w-4 h-4 text-sky-600" />
              افزودن جزء و زیرمجموعه جدید
            </h2>
            <p className="text-xs text-slate-500">
              تجهیز والد: <strong>[{assetCode}] {assetName}</strong>
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
            <label className="block font-bold text-slate-700 mb-1">نام جزء / قطعه زیرمجموعه*</label>
            <input
              type="text"
              required
              placeholder="مثال: پروانه استیل، سیل مکانیکی، بلبرینگ جلو، الکتروموتور"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">شماره فنی (Part Number)</label>
              <input
                type="text"
                placeholder="PN-12345"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-left"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">شماره سریال</label>
              <input
                type="text"
                placeholder="SN-6789"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-left"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">وضعیت سلامت فیزیکی</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="normal">سالم و در حال کار (Normal)</option>
              <option value="worn">دارای سایش یا فرسودگی جزئی (Worn)</option>
              <option value="needs_replacement">نیازمند تعویض فوری (Needs Replacement)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">توضیحات و مشخصات فنی جزء</label>
            <textarea
              rows={2}
              placeholder="ابعاد، متریال ساخت، تاریخ آخرین تعویض و..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              <span>ثبت جزء</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
