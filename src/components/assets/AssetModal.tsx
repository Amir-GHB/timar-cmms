import React, { useState, useEffect } from 'react';
import { X, Wrench, Image as ImageIcon, Save, Check } from 'lucide-react';
import type { Asset, AssetCategory, AssetStatus } from '../../types';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assetData: Partial<Asset>) => void;
  initialAsset?: Asset | null;
}

const CATEGORIES: AssetCategory[] = [
  'Intake & Screening',
  'Coagulation & Flocculation',
  'Clarification & Sedimentation',
  'Filtration (Sand & Carbon)',
  'Membrane Separation (RO)',
  'Chemical Dosing & Chlorination',
  'Pumps & Blowers',
  'Sludge Dewatering',
  'Instrumentation & SCADA',
];

const PRESET_IMAGES = [
  { label: 'پمپ گریز از مرکز', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80' },
  { label: 'فیلتر شنی تحت فشار', url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=400&q=80' },
  { label: 'ماژول ممبران RO', url: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=400&q=80' },
  { label: 'بلوئر هوادهی', url: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=400&q=80' },
];

export const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAsset,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<AssetCategory>('Pumps & Blowers');
  const [status, setStatus] = useState<AssetStatus>('operational');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [capacitySpecs, setCapacitySpecs] = useState('');
  const [installDate, setInstallDate] = useState(new Date().toISOString().split('T')[0]);
  const [operatingHours, setOperatingHours] = useState('0');
  const [imageUrl, setImageUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialAsset) {
      setName(initialAsset.name || '');
      setCode(initialAsset.code || '');
      setCategory(initialAsset.category || 'Pumps & Blowers');
      setStatus(initialAsset.status || 'operational');
      setManufacturer(initialAsset.manufacturer || '');
      setModel(initialAsset.model || '');
      setSerialNumber(initialAsset.serialNumber || '');
      setLocation(initialAsset.location || '');
      setCapacitySpecs(initialAsset.capacitySpecs || '');
      setInstallDate(initialAsset.installDate || new Date().toISOString().split('T')[0]);
      setOperatingHours(String(initialAsset.operatingHours || 0));
      setImageUrl(initialAsset.imageUrl || '');
      setNotes(initialAsset.notes || '');
    } else {
      setName('');
      setCode('');
      setCategory('Pumps & Blowers');
      setStatus('operational');
      setManufacturer('');
      setModel('');
      setSerialNumber('');
      setLocation('');
      setCapacitySpecs('');
      setInstallDate(new Date().toISOString().split('T')[0]);
      setOperatingHours('0');
      setImageUrl(PRESET_IMAGES[0].url);
      setNotes('');
    }
  }, [initialAsset, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    onSave({
      id: initialAsset?.id,
      name,
      code,
      category,
      status,
      manufacturer,
      model,
      serialNumber,
      location,
      capacitySpecs,
      installDate,
      operatingHours: parseFloat(operatingHours) || 0,
      imageUrl,
      notes,
    });
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
              <Wrench className="w-4 h-4 text-sky-600" />
              {initialAsset ? 'ویرایش مشخصات تجهیز' : 'افزودن دارایی / تجهیز جدید'}
            </h2>
            <p className="text-xs text-slate-500">
              ثبت اطلاعات شناسنامه‌ای، کارکرد و مشخصات فنی تجهیزات تصفیه‌خانه
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
          {/* Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">کد شناسایی تجهیز (TAG)*</label>
              <input
                type="text"
                required
                placeholder="مثال: P-101 یا RO-SKID-2"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono text-left"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">نام و عنوان رسمی تجهیز*</label>
              <input
                type="text"
                required
                placeholder="مثال: پمپ سانتریفیوژ تغذیه اسمز معکوس شماره ۱"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">دسته‌بندی فرآیندی تصفیه‌خانه</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">وضعیت بهره‌برداری</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AssetStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              >
                <option value="operational">در مدار و آماده به کار (Operational)</option>
                <option value="degraded">نیازمند پایش / کارکرد با راندمان کاهش‌یافته</option>
                <option value="under_maintenance">در دست تعمیرات یا سرویس (Under Maintenance)</option>
                <option value="offline">خارج از مدار (Offline)</option>
              </select>
            </div>
          </div>

          {/* Manufacturer, Model, Serial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">سازنده / برند</label>
              <input
                type="text"
                placeholder="مثال: پمپیران، گراندفوس، زولزر"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">مدل مهندسی</label>
              <input
                type="text"
                placeholder="مثال: WKL 65/4"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">شماره سریال</label>
              <input
                type="text"
                placeholder="SN-XXXXX"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-left"
              />
            </div>
          </div>

          {/* Location & Specs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">محل استقرار در تصفیه‌خانه</label>
              <input
                type="text"
                placeholder="مثال: ایستگاه پمپاژ آب خام، واحد اسمز معکوس"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">ظرفیت و مشخصات کاری اسمی</label>
              <input
                type="text"
                placeholder="مثال: 350 m³/h @ 4.2 bar, 45 kW"
                value={capacitySpecs}
                onChange={(e) => setCapacitySpecs(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Install Date & Operating Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">تاریخ نصب و راه‌اندازی</label>
              <input
                type="date"
                value={installDate}
                onChange={(e) => setInstallDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">کارکرد تجمعی تا کنون (ساعت)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={operatingHours}
                onChange={(e) => setOperatingHours(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          {/* Image Selection / URL */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <label className="block font-bold text-slate-800 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
              تصویر تجهیز (نمایش در پنل جزئیات)
            </label>

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                {imageUrl ? (
                  <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-300" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <input
                  type="url"
                  placeholder="آدرس اینترنتی تصویر (URL)..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-left"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_IMAGES.map((p, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => setImageUrl(p.url)}
                      className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-200 text-slate-600 hover:text-sky-700 hover:border-sky-300 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">یادداشت‌ها و توضیحات راهنما</label>
            <textarea
              rows={2}
              placeholder="نکات مربوط به نگهداری، روغن‌کاری، قطعات مصرفی یا هشدارها..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg"
            />
          </div>

          {/* Submit */}
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
              <span>{initialAsset ? 'ذخیره تغییرات' : 'افزودن تجهیز'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
