import React, { useState } from 'react';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { StoragePart, Role } from '../../types';
import { toPersianDigits } from '../../utils/persianDate';

interface StorageSectionViewProps {
  inventory: StoragePart[];
  userRole?: Role;
  onSavePart?: (part: Partial<StoragePart>) => void;
  onRestockPart?: (partId: string, addQty: number) => void;
}

export const StorageSectionView: React.FC<StorageSectionViewProps> = ({
  inventory,
  userRole,
  onSavePart,
  onRestockPart,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [restockItem, setRestockItem] = useState<StoragePart | null>(null);
  const [restockQty, setRestockQty] = useState('5');

  // Form state
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [category, setCategory] = useState('آب‌بند و کاسه‌نمد');
  const [quantityInStock, setQuantityInStock] = useState('10');
  const [unit, setUnit] = useState('عدد');
  const [minThreshold, setMinThreshold] = useState('3');
  const [unitCost, setUnitCost] = useState('50.0');
  const [shelfLocation, setShelfLocation] = useState('انبار A / قفسه ۰۱');

  const filteredInventory = inventory.filter(
    (i) =>
      i.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.shelfLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockCount = inventory.filter((i) => i.quantityInStock <= i.minThreshold).length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName || !partNumber) return;

    onSavePart?.({
      partName,
      partNumber,
      category,
      quantityInStock: parseInt(quantityInStock, 10) || 0,
      unit,
      minThreshold: parseInt(minThreshold, 10) || 0,
      unitCost: parseFloat(unitCost) || 0,
      shelfLocation,
    });

    setShowAddModal(false);
    setPartName('');
    setPartNumber('');
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;
    const qty = parseInt(restockQty, 10) || 0;
    if (qty > 0) {
      onRestockPart?.(restockItem.id, qty);
    }
    setRestockItem(null);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-[#fafafa]" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-600" />
            انبار قطعات یدکی و اقلام مصرفی
          </h1>
          <p className="text-xs text-slate-500">
            مدیریت موجودی قطعات، پایش نقطه سفارش و ثبت ورود قطعات جدید
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{toPersianDigits(lowStockCount)} قلم کالا زیر حد نصاب</span>
            </span>
          )}

          {userRole === 'manager' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ثبت قطعه جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجو بر اساس نام، پارت نامبر یا قفسه انبار..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-vazir"
          />
        </div>
      </div>

      {/* Inventory Table matching storagesection.cpp createPartRow */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
            <tr>
              <th className="px-4 py-3">نام قطعه و مشخصات</th>
              <th className="px-4 py-3">شماره فنی (Part Number)</th>
              <th className="px-4 py-3">دسته‌بندی</th>
              <th className="px-4 py-3 text-center">موجودی فعلی</th>
              <th className="px-4 py-3 text-center">حداقل موجودی</th>
              <th className="px-4 py-3">محل استقرار در انبار</th>
              {userRole === 'manager' && <th className="px-4 py-3 text-left">عملیات</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInventory.map((item) => {
              const isLow = item.quantityInStock <= item.minThreshold;

              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{item.partName}</div>
                    {item.supplier && (
                      <div className="text-[11px] text-slate-400">{item.supplier}</div>
                    )}
                  </td>

                  <td className="px-4 py-3 font-mono font-bold text-slate-700">
                    {item.partNumber}
                  </td>

                  <td className="px-4 py-3 text-slate-500">{item.category}</td>

                  <td className="px-4 py-3 text-center">
                    <span
                      className={`font-mono font-bold tabular-nums px-2.5 py-0.5 rounded ${
                        isLow
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      {toPersianDigits(item.quantityInStock)} {item.unit}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center font-mono text-slate-500 tabular-nums">
                    {toPersianDigits(item.minThreshold)} {item.unit}
                  </td>

                  <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                    {item.shelfLocation}
                  </td>

                  {userRole === 'manager' && (
                    <td className="px-4 py-3 text-left">
                      <button
                        onClick={() => setRestockItem(item)}
                        className="px-2.5 py-1 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>ورود کالا</span>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Restock Modal */}
      {restockItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">رسید ورود قطعه به انبار</h3>
            <p className="text-xs text-slate-500 mb-4">
              افزایش موجودی {restockItem.partName} ({restockItem.partNumber})
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">تعداد وارده</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold font-mono"
                  />
                  <span className="text-slate-500 font-medium">{restockItem.unit}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestockItem(null)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-700 text-white font-bold rounded-md hover:bg-sky-600"
                >
                  تایید ورود کالا
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">ثبت قطعه یدکی جدید در کاتالوگ</h3>
            <p className="text-xs text-slate-500 mb-4">ایجاد ردیف کالا در انبار قطعات</p>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">نام قطعه</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: سیل مکانیکی ۴۵ میلی‌متر"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-vazir"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">شماره فنی (Part No)</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: MS-45-SIC"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">دسته‌بندی</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white font-vazir"
                  >
                    <option value="آب‌بند و کاسه‌نمد">آب‌بند و کاسه‌نمد</option>
                    <option value="ممبران و فیلتراسیون">ممبران و فیلتراسیون</option>
                    <option value="بلبرینگ و یاتاقان">بلبرینگ و یاتاقان</option>
                    <option value="اقلام مصرفی">اقلام مصرفی</option>
                    <option value="روانکار و مواد شیمیایی">روانکار و مواد شیمیایی</option>
                    <option value="تجهیزات ابزار دقیق">تجهیزات ابزار دقیق</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">موجودی اولیه</label>
                  <input
                    type="number"
                    min="0"
                    value={quantityInStock}
                    onChange={(e) => setQuantityInStock(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">واحد سنجش</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-center font-vazir"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">حداقل مجاز</label>
                  <input
                    type="number"
                    min="1"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">موقعیت قفسه در انبار</label>
                <input
                  type="text"
                  placeholder="مثال: انبار مرکزی / قفسه ۰۳"
                  value={shelfLocation}
                  onChange={(e) => setShelfLocation(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-vazir"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-700 text-white font-bold rounded-md hover:bg-sky-600"
                >
                  ثبت قطعه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
