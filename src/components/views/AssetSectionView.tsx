import React, { useState } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Clock,
  Gauge,
  Trash2,
  Edit2,
  Image as ImageIcon,
  ChevronDown,
  ChevronLeft,
  Package,
} from 'lucide-react';
import type { Asset, SubAsset, Role } from '../../types';
import { formatPersianDate, toPersianDigits } from '../../utils/persianDate';

interface AssetSectionViewProps {
  assets: Asset[];
  subAssets: SubAsset[];
  userRole?: Role;
  onOpenCreateEvent?: (assetId: string) => void;
  onOpenAddAsset?: () => void;
  onEditAsset?: (asset: Asset) => void;
  onDeleteAsset?: (assetId: string) => void;
  onOpenAddSubAsset?: (assetId: string) => void;
  onDeleteSubAsset?: (subAssetId: string) => void;
}

export const AssetSectionView: React.FC<AssetSectionViewProps> = ({
  assets,
  subAssets,
  userRole,
  onOpenAddAsset,
  onEditAsset,
  onDeleteAsset,
  onOpenAddSubAsset,
  onDeleteSubAsset,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');
  const [expandedAssetIds, setExpandedAssetIds] = useState<Record<string, boolean>>({
    [assets[0]?.id || '']: true,
  });

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedAssetIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || filteredAssets[0];
  const currentSubAssets = subAssets.filter((s) => s.assetId === selectedAsset?.id);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafafa]" dir="rtl">
      {/* 
        Section Header:
        User Requirement: "on the header of this section add a header with the text 'assets list'(in persian) and a add new asset button"
      */}
      <div className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-sky-600" />
            <span>لیست دارایی‌ها</span>
          </h1>
          <p className="text-xs text-slate-500">
            شناسنامه، ساختار درختی دارایی‌ها، تجهیزات جزء و مشخصات مهندسی تصفیه‌خانه
          </p>
        </div>

        {userRole === 'manager' && onOpenAddAsset && (
          <button
            onClick={onOpenAddAsset}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن دارایی جدید</span>
          </button>
        )}
      </div>

      {/* Main Workspace: Tree View on Right + Detail Panel on Left (in RTL) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* 
          1. Actual Expandable Asset Tree (matching Qt QTreeView / QTreeWidget)
          User Requirement: "make the asset tree an actual tree which each asset could be expanded and show its subassets"
        */}
        <div className="w-full md:w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col shrink-0">
          {/* Tree Search & Summary */}
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-600" />
                ساختار درختی دارایی‌ها
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {toPersianDigits(assets.length)} دارایی · {toPersianDigits(subAssets.length)} جزء
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                placeholder="جستجوی کد، نام یا محل دارایی..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-vazir"
              />
            </div>
          </div>

          {/* Actual Tree Structure */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredAssets.map((ast) => {
              const isSelected = selectedAsset?.id === ast.id;
              const assetSubs = subAssets.filter((s) => s.assetId === ast.id);
              const isExpanded = Boolean(expandedAssetIds[ast.id]);

              return (
                <div key={ast.id} className="rounded-lg overflow-hidden">
                  {/* Asset Parent Tree Item */}
                  <div
                    onClick={() => setSelectedAssetId(ast.id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-50 border border-sky-300 ring-1 ring-sky-200 text-sky-950 font-bold'
                        : 'hover:bg-slate-50 text-slate-800 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {/* Tree Expand/Collapse Toggle */}
                      <button
                        type="button"
                        onClick={(e) => toggleExpand(ast.id, e)}
                        className="p-1 hover:bg-slate-200/60 rounded text-slate-500 cursor-pointer"
                        title={isExpanded ? 'بستن زیرمجموعه‌ها' : 'نمایش زیرمجموعه‌ها'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronLeft className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <span className="font-mono text-[11px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                        {ast.code}
                      </span>
                      <span className="text-xs truncate">{ast.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pr-1">
                      {assetSubs.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {toPersianDigits(assetSubs.length)}
                        </span>
                      )}
                      <span
                        className={`w-2 h-2 rounded-full ${
                          ast.status === 'operational'
                            ? 'bg-emerald-500'
                            : ast.status === 'degraded'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        title={ast.status}
                      />
                    </div>
                  </div>

                  {/* Subassets Tree Branch (Children) */}
                  {isExpanded && (
                    <div className="mr-6 border-r-2 border-sky-200/80 pr-2 my-1 space-y-1">
                      {assetSubs.length === 0 ? (
                        <div className="py-1 px-2 text-[11px] text-slate-400 italic">
                          بدون جزء زیرمجموعه
                        </div>
                      ) : (
                        assetSubs.map((sub) => (
                          <div
                            key={sub.id}
                            onClick={() => setSelectedAssetId(ast.id)}
                            className="flex items-center justify-between p-1.5 rounded-md hover:bg-slate-100/80 cursor-pointer text-xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                              <span className="text-slate-700 font-medium truncate">
                                {sub.name}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {sub.partNumber}
                              </span>
                            </div>

                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                sub.status === 'normal'
                                  ? 'text-emerald-700 bg-emerald-50'
                                  : 'text-amber-700 bg-amber-50'
                              }`}
                            >
                              {sub.status === 'normal' ? 'نرمال' : 'فرسوده'}
                            </span>
                          </div>
                        ))
                      )}

                      {/* Add subasset quick button inside tree */}
                      {userRole === 'manager' && onOpenAddSubAsset && (
                        <button
                          onClick={() => onOpenAddSubAsset(ast.id)}
                          className="flex items-center gap-1 text-[11px] text-sky-700 hover:text-sky-900 font-bold p-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>افزودن جزء برای این تجهیز</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 
          2. Asset Details Panel
          User Requirement: "then in the details panel of each asset, instead of register service/malfunction, add edit and remove button, and dont forget to add image to the details panel"
        */}
        {selectedAsset ? (
          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              {/* Header of Details Panel with Image, Titles, and Edit & Remove Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-start gap-4">
                  {/* Asset Image */}
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                    {selectedAsset.imageUrl ? (
                      <img
                        src={selectedAsset.imageUrl}
                        alt={selectedAsset.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        <ImageIcon className="w-8 h-8 text-slate-400 mb-1" />
                        <span className="text-[10px] font-medium">تصویر تجهیز</span>
                      </div>
                    )}
                  </div>

                  {/* Asset Title & Metadata */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded">
                        {selectedAsset.code}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {selectedAsset.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selectedAsset.status === 'operational'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : selectedAsset.status === 'degraded'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {selectedAsset.status === 'operational'
                          ? 'در مدار (آماده به کار)'
                          : selectedAsset.status === 'degraded'
                          ? 'نیاز به بازرسی فنی'
                          : 'در دست تعمیرات'}
                      </span>
                    </div>

                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 pt-1">
                      {selectedAsset.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      محل استقرار: <strong>{selectedAsset.location}</strong>
                    </p>
                  </div>
                </div>

                {/* Edit and Remove Buttons (Manager Only) */}
                <div className="flex items-center gap-2 self-start">
                  {userRole === 'manager' && onEditAsset && (
                    <button
                      onClick={() => onEditAsset(selectedAsset)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="ویرایش مشخصات شناسنامه‌ای تجهیز"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                      <span>ویرایش</span>
                    </button>
                  )}

                  {userRole === 'manager' && onDeleteAsset && (
                    <button
                      onClick={() => {
                        if (window.confirm(`آیا از حذف کامل تجهیز ${selectedAsset.name} اطمینان دارید؟`)) {
                          onDeleteAsset(selectedAsset.id);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="حذف این تجهیز از سیستم"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>حذف</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px] mb-1">سازنده و برند</span>
                  <span className="font-bold text-slate-800">{selectedAsset.manufacturer}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px] mb-1">مدل مهندسی</span>
                  <span className="font-bold text-slate-800">{selectedAsset.model}</span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px] mb-1">شماره سریال کارخانه</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedAsset.serialNumber}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px] mb-1">تاریخ نصب و راه‌اندازی</span>
                  <span className="font-bold text-slate-800">
                    {formatPersianDate(selectedAsset.installDate, { showMonthName: true })}
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px] mb-1">کارکرد تجمعی</span>
                  <span className="font-mono font-bold text-slate-800 tabular-nums">
                    {toPersianDigits(selectedAsset.operatingHours.toLocaleString())} ساعت
                  </span>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[11px] mb-1">ظرفیت کاری و هد/دبی اسمی</span>
                  <span className="font-bold text-slate-800">{selectedAsset.capacitySpecs}</span>
                </div>
              </div>

              {selectedAsset.notes && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                  <span className="font-bold text-slate-800 block mb-1">دستورالعمل‌ها و ملاحظات فنی:</span>
                  <p className="text-slate-700 leading-relaxed">{selectedAsset.notes}</p>
                </div>
              )}

              {/* Sub-assets Table */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-600" />
                    <span>تجهیزات جزء و قطعات یدکی اختصاصی ({toPersianDigits(currentSubAssets.length)} جزء)</span>
                  </h3>

                  {userRole === 'manager' && onOpenAddSubAsset && (
                    <button
                      onClick={() => onOpenAddSubAsset(selectedAsset.id)}
                      className="px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50 border border-sky-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن جزء جدید</span>
                    </button>
                  )}
                </div>

                {currentSubAssets.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-xl text-center text-xs text-slate-400 border border-slate-100">
                    هیچ جزء اختصاصی برای این تجهیز ثبت نشده است.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                        <tr>
                          <th className="px-4 py-2.5">نام جزء</th>
                          <th className="px-4 py-2.5">شماره فنی (Part Number)</th>
                          <th className="px-4 py-2.5">سریال</th>
                          <th className="px-4 py-2.5 text-center">وضعیت فیزیکی</th>
                          {userRole === 'manager' && <th className="px-4 py-2.5 text-center">عملیات</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentSubAssets.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 font-bold text-slate-800">{s.name}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-500">{s.partNumber}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-500">{s.serialNumber}</td>
                            <td className="px-4 py-2.5 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  s.status === 'normal'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {s.status === 'normal' ? 'نرمال' : 'فرسوده'}
                              </span>
                            </td>
                            {userRole === 'manager' && (
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  onClick={() => onDeleteSubAsset?.(s.id)}
                                  className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                                  title="حذف جزء"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
            تجهیزی انتخاب نشده است.
          </div>
        )}
      </div>
    </div>
  );
};
