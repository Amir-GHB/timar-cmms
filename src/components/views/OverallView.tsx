import React, { useState } from 'react';
import {
  Layers,
  Search,
  Plus,
  Wrench,
  Clock,
  Package,
  CalendarClock,
  History as HistoryIcon,
  Info,
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Image as ImageIcon,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  AlertCircle,
} from 'lucide-react';
import type {
  Asset,
  SubAsset,
  MaintenanceEvent,
  MaintenanceSchedule,
  StoragePart,
  Role,
  UsedPart,
  AssetNote,
  TechnicianReport,
  User as UserType,
} from '../../types';
import { formatPersianDate, toPersianDigits } from '../../utils/persianDate';
import { LinkPartModal } from '../assets/LinkPartModal';
import { EventDetailsModal } from '../maintenance/EventDetailsModal';
import { CompleteEventModal } from '../maintenance/CompleteEventModal';
import { AssetNotesAndReportsTab } from '../assets/AssetNotesAndReportsTab';

interface OverallViewProps {
  assets: Asset[];
  subAssets: SubAsset[];
  events: MaintenanceEvent[];
  schedules: MaintenanceSchedule[];
  inventory: StoragePart[];
  userRole?: Role;
  onOpenCreateEvent: (assetId: string) => void;
  onOpenCreateEventFromSchedule?: (assetId: string, scheduleId: string) => void;
  onOpenCreateSchedule?: (assetId: string) => void;
  onOpenAddSubAsset?: (assetId: string) => void;
  onOpenAddAsset?: () => void;
  onEditAsset?: (asset: Asset) => void;
  onDeleteAsset?: (assetId: string) => void;
  onLinkPartToAsset?: (assetCode: string, partId: string) => void;
  onEditEvent?: (event: MaintenanceEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onCancelEvent?: (eventId: string) => void;
  onTogglePauseSchedule?: (scheduleId: string) => void;
  onDeleteSchedule?: (scheduleId: string) => void;
  onCompleteEvent?: (
    eventId: string,
    completionData: {
      solution: string;
      durationHours: number;
      downtimeHours: number;
      partsUsed: UsedPart[];
    }
  ) => void;
  onStartEvent?: (eventId: string) => void;
  onAuthorizeEvent?: (eventId: string) => void;
  currentUser?: UserType | null;
  notes?: AssetNote[];
  reports?: TechnicianReport[];
  onRefreshData?: () => Promise<void>;
  onOpenCreateEventFromReport?: (report: TechnicianReport) => void;
}

type AssetTab = 'overview' | 'notes_reports' | 'history' | 'subassets' | 'events' | 'schedules' | 'parts';

export const OverallView: React.FC<OverallViewProps> = ({
  assets,
  subAssets,
  events,
  schedules,
  inventory,
  userRole,
  onOpenCreateEvent,
  onOpenCreateEventFromSchedule,
  onOpenCreateSchedule,
  onOpenAddSubAsset,
  onOpenAddAsset,
  onEditAsset,
  onDeleteAsset,
  onLinkPartToAsset,
  onEditEvent,
  onDeleteEvent,
  onCancelEvent,
  onTogglePauseSchedule,
  onDeleteSchedule,
  onCompleteEvent,
  onStartEvent,
  onAuthorizeEvent,
  currentUser,
  notes = [],
  reports = [],
  onRefreshData,
  onOpenCreateEventFromReport,
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');
  const [activeTab, setActiveTab] = useState<AssetTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLinkPartModalOpen, setIsLinkPartModalOpen] = useState(false);
  const [inspectEvent, setInspectEvent] = useState<MaintenanceEvent | null>(null);
  const [completingEvent, setCompletingEvent] = useState<MaintenanceEvent | null>(null);
  const [prohibitedEditMessage, setProhibitedEditMessage] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [eventFilterStatus, setEventFilterStatus] = useState<'all' | 'active' | 'pending' | 'completed'>('active');

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];
  const currentSubAssets = subAssets.filter((s) => s.assetId === selectedAsset?.id);

  const filteredAssets = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentEvents = events.filter(
    (e) =>
      !e.isDeleted &&
      (String(e.assetId) === String(selectedAsset?.id) ||
        (e.assetCode && e.assetCode === selectedAsset?.code))
  );
  const currentSchedules = schedules.filter((s) => s.assetId === selectedAsset?.id);
  const currentParts = inventory.filter((p) =>
    p.compatibleAssets?.includes(selectedAsset?.code || '')
  );

  const tabs = [
    { id: 'overview' as AssetTab, label: 'شرح کلی', icon: Info },
    { id: 'notes_reports' as AssetTab, label: 'یادداشت‌ها و گزارش‌ها', icon: FileText },
    { id: 'history' as AssetTab, label: 'تاریخچه', icon: HistoryIcon },
    { id: 'subassets' as AssetTab, label: 'تجهیزات جزء', icon: Layers },
    { id: 'events' as AssetTab, label: 'رویدادها', icon: Wrench },
    { id: 'schedules' as AssetTab, label: 'برنامه‌ها', icon: CalendarClock },
    { id: 'parts' as AssetTab, label: 'قطعات', icon: Package },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[#fafafa]" dir="rtl">
      {/* 
        User Requirement: "move the asset tree panel from the right side to the left"
        In RTL flexbox:
        Child 1 is positioned on the RIGHT.
        Child 2 is positioned on the LEFT.
        Therefore, we place the Main Asset Details Panel as Child 1 (RIGHT side),
        and the Asset Tree Panel as Child 2 (LEFT side)!
      */}

      {/* 1. Main Asset Detail View Stack (RIGHT SIDE in RTL) */}
      {selectedAsset ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden border-l border-slate-200">
          {/* 
            Asset Header: NO "register new event" button in header as requested 
          */}
          <div className="bg-white border-b border-slate-200 p-4 md:p-5 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-4">
              {/* Asset Image Box */}
              <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                {selectedAsset.imageUrl ? (
                  <img
                    src={selectedAsset.imageUrl}
                    alt={selectedAsset.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                    <span className="text-[9px] mt-0.5 font-medium">تصویر</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                    {selectedAsset.code}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {selectedAsset.location}
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
                      ? 'در مدار'
                      : selectedAsset.status === 'degraded'
                      ? 'نیاز به بازدید'
                      : 'در دست تعمیر'}
                  </span>
                </div>
                <h1 className="text-lg md:text-xl font-bold text-slate-900 mt-1">
                  {selectedAsset.name}
                </h1>
              </div>
            </div>
          </div>

          {/* Asset Tab Bar */}
          <div className="bg-white border-b border-slate-200 px-4 flex items-center gap-1 overflow-x-auto shrink-0 h-10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-full px-3.5 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
                    isActive
                      ? 'border-[#1890ff] text-[#1890ff] font-bold'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Asset Tab Content Stack */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
            {/* 
              Tab 1: شرح کلی (Overview)
              User Requirement: "under overall tab add edit and remove button to the header of its details panel"
            */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      مشخصات شناسنامه‌ای و فنی تجهیز
                    </h3>

                    {/* Edit and Remove Buttons in Details Panel Header */}
                    <div className="flex items-center gap-2">
                      {userRole === 'manager' && onEditAsset && (
                        <button
                          onClick={() => onEditAsset(selectedAsset)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                          <span>ویرایش</span>
                        </button>
                      )}

                      {userRole === 'manager' && onDeleteAsset && (
                        <button
                          onClick={() => {
                            if (window.confirm(`آیا از حذف تجهیز ${selectedAsset.name} اطمینان دارید؟`)) {
                              onDeleteAsset(selectedAsset.id);
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">نام سازنده</span>
                      <span className="font-semibold text-slate-800">{selectedAsset.manufacturer}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">مدل فنی</span>
                      <span className="font-semibold text-slate-800">{selectedAsset.model}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">شماره سریال</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedAsset.serialNumber}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">تاریخ نصب و راه‌اندازی</span>
                      <span className="font-semibold text-slate-800">
                        {formatPersianDate(selectedAsset.installDate, { showMonthName: true })}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">کارکرد تجمعی</span>
                      <span className="font-mono font-semibold text-slate-800 tabular-nums">
                        {toPersianDigits(selectedAsset.operatingHours.toLocaleString())} ساعت
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-0.5">ظرفیت و مشخصات کاری</span>
                      <span className="font-semibold text-slate-800">
                        {selectedAsset.capacitySpecs}
                      </span>
                    </div>
                  </div>

                  {selectedAsset.notes && (
                    <div className="pt-3 border-t border-slate-100">
                      <span className="text-slate-400 block text-[11px] mb-1">یادداشت‌ها و راهنما</span>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {selectedAsset.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Sub-assets Summary Preview on Overview Tab */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-800">
                      اجزاء تشکیل‌دهنده ({toPersianDigits(currentSubAssets.length)} جزء)
                    </h3>
                    <button
                      onClick={() => setActiveTab('subassets')}
                      className="text-xs text-sky-700 hover:text-sky-800 font-semibold cursor-pointer"
                    >
                      مشاهده همه
                    </button>
                  </div>

                  <div className="divide-y divide-slate-100 mt-2">
                    {currentSubAssets.map((s) => (
                      <div key={s.id} className="py-2.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{s.name}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{s.partNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: تاریخچه (History) */}
            {activeTab === 'history' && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-800 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <span>سوابق و تاریخچه تعمیرات تکمیل‌شده این تجهیز</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {toPersianDigits(currentEvents.filter((e) => e.status === 'completed').length)} سابقه ثبت‌شده
                  </span>
                </h3>

                {currentEvents.filter((e) => e.status === 'completed').length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    هیچ سابقه تکمیل‌شده‌ای برای این تجهیز یافت نشد.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {currentEvents
                      .filter((e) => e.status === 'completed')
                      .map((evt) => (
                        <div key={evt.id} className="py-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{evt.title}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  evt.type === 'emergency'
                                    ? 'bg-rose-100 text-rose-800'
                                    : evt.type === 'preventive'
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {evt.type === 'emergency'
                                  ? 'اضطراری (EM)'
                                  : evt.type === 'preventive'
                                  ? 'پیشگیرانه (PM)'
                                  : 'اصلاحی'}
                              </span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                تکمیل‌شده و مختومه
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {formatPersianDate(evt.date, { showMonthName: true })}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{evt.description}</p>
                          {evt.solution && (
                            <p className="text-[11px] text-emerald-800 bg-emerald-50/60 p-2 rounded-lg">
                              <strong>اقدامات انجام‌شده:</strong> {evt.solution}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-400 font-mono">
                              مجری: {evt.technicianName} · کارکرد: {toPersianDigits(evt.durationHours)} ساعت
                              {evt.partsUsed.length > 0 && ` · ${toPersianDigits(evt.partsUsed.length)} قلم قطعه`}
                            </span>
                            <button
                              onClick={() => setInspectEvent(evt)}
                              className="text-xs text-sky-700 hover:text-sky-800 font-semibold cursor-pointer"
                            >
                              مشاهده جزئیات
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* 
              Tab 3: تجهیزات جزء (Sub-Assets)
              User Requirement: "in subasset tabs aadd the add subasset button"
            */}
            {activeTab === 'subassets' && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800">
                    لیست تجهیزات جزء و قطعات اختصاصی
                  </h3>

                  {onOpenAddSubAsset && (
                    <button
                      onClick={() => onOpenAddSubAsset(selectedAsset.id)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن جزء جدید</span>
                    </button>
                  )}
                </div>

                {currentSubAssets.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    جزء اختصاصی برای این تجهیز ثبت نشده است. با دکمه «افزودن جزء جدید» اقدام کنید.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {currentSubAssets.map((sub) => (
                      <div key={sub.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{sub.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            شماره فنی: {sub.partNumber} · سریال: {sub.serialNumber}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            sub.status === 'normal'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {sub.status === 'normal' ? 'نرمال' : 'فرسوده'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: رویدادها و دستورکارها (Events & Work Orders) */}
            {activeTab === 'events' && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-sky-600" />
                      <span>دستورکارها و رویدادهای نت ({toPersianDigits(currentEvents.length)})</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      دستورکارهای برنامه‌ریزی‌شده، تولید خودکار PM و درخواست‌های تعمیرات تجهیز
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Status filter pills */}
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-[11px]">
                      {[
                        { id: 'active', label: 'جاری و فعال' },
                        { id: 'pending', label: 'در انتظار تایید' },
                        { id: 'all', label: 'همه' },
                        { id: 'completed', label: 'مختومه' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setEventFilterStatus(f.id as any)}
                          className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                            eventFilterStatus === f.id
                              ? 'bg-white text-slate-900 shadow-xs font-bold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => onOpenCreateEvent(selectedAsset.id)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-md transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ثبت رویداد جدید</span>
                    </button>
                  </div>
                </div>

                {/* Filtered Events List */}
                {(() => {
                  const displayEvents = currentEvents.filter((evt) => {
                    if (eventFilterStatus === 'active') {
                      return evt.status === 'scheduled' || evt.status === 'in_progress' || evt.status === 'rejected';
                    }
                    if (eventFilterStatus === 'pending') {
                      return evt.status === 'pending_request' || evt.status === 'pending_approval';
                    }
                    if (eventFilterStatus === 'completed') {
                      return evt.status === 'completed';
                    }
                    return true;
                  });

                  if (displayEvents.length === 0) {
                    return (
                      <div className="py-12 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        هیچ رویدادی در این وضعیت فیلتر یافت نشد.
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y divide-slate-100">
                      {displayEvents.map((evt) => {
                        const isScheduled = evt.status === 'scheduled';
                        const isInProgress = evt.status === 'in_progress';
                        const isPendingReq = evt.status === 'pending_request';
                        const isPendingApp = evt.status === 'pending_approval';
                        const isDone = evt.status === 'completed';
                        const isRej = evt.status === 'rejected';
                        const isCanc = evt.status === 'cancelled';

                        return (
                          <div key={evt.id} className="py-4 text-xs space-y-2">
                            {/* Row 1: Badges & Title */}
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-900 text-sm">{evt.title}</span>

                                {/* Type Badge */}
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    evt.type === 'emergency'
                                      ? 'bg-rose-100 text-rose-800'
                                      : evt.type === 'preventive'
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {evt.type === 'emergency'
                                    ? 'اضطراری (EM)'
                                    : evt.type === 'preventive'
                                    ? 'پیشگیرانه (PM)'
                                    : 'اصلاحی'}
                                </span>

                                {/* Automated PM origin badge */}
                                {evt.isAutomatedPM && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    تولید خودکار از برنامه نت
                                  </span>
                                )}
                              </div>

                              {/* Status Badge */}
                              <div>
                                {isPendingReq && (
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                    در انتظار تایید و صدور دستورکار
                                  </span>
                                )}
                                {isScheduled && (
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                                    برنامه‌ریزی‌شده - آماده اجرا
                                  </span>
                                )}
                                {isInProgress && (
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                                    در حال انجام کار توسط تکنسین
                                  </span>
                                )}
                                {isPendingApp && (
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                                    انجام شده - در انتظار تایید مدیر
                                  </span>
                                )}
                                {isDone && (
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    تکمیل‌شده و مختومه
                                  </span>
                                )}
                                {isRej && (
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                                    نیازمند بازبینی و اصلاح
                                  </span>
                                )}
                                {isCanc && (
                                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">
                                    لغو شده
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Description */}
                            {evt.description && (
                              <p className="text-slate-600 leading-relaxed text-xs">{evt.description}</p>
                            )}

                            {/* Metadata & Actions row */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-50">
                              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono">
                                <span>
                                  تاریخ: {formatPersianDate(evt.date, { showMonthName: true })}
                                </span>
                                {evt.deadlineDate && (
                                  <span>
                                    مهلت: {formatPersianDate(evt.deadlineDate, { showMonthName: true })}
                                  </span>
                                )}
                                <span>تکنسین: {evt.technicianName}</span>
                              </div>

                              {/* Action Buttons Group */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* Details Modal Button */}
                                <button
                                  type="button"
                                  onClick={() => setInspectEvent(evt)}
                                  className="px-2.5 py-1 text-xs text-sky-700 hover:text-sky-800 hover:bg-sky-50 rounded font-semibold cursor-pointer transition-colors"
                                >
                                  مشاهده جزئیات
                                </button>

                                {/* Start Work Button */}
                                {(isScheduled || isRej) && (
                                  <button
                                    type="button"
                                    onClick={() => onStartEvent?.(evt.id)}
                                    className="px-2.5 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded font-bold cursor-pointer transition-colors"
                                  >
                                    شروع کار
                                  </button>
                                )}

                                {/* Complete Task Button */}
                                {(isScheduled || isInProgress || isRej) && (
                                  <button
                                    type="button"
                                    onClick={() => setCompletingEvent(evt)}
                                    className="px-2.5 py-1 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded font-bold cursor-pointer transition-colors shadow-xs"
                                  >
                                    ثبت اتمام کار
                                  </button>
                                )}

                                {/* Manager Authorize pending request */}
                                {isPendingReq && userRole === 'manager' && (
                                  <button
                                    type="button"
                                    onClick={() => onAuthorizeEvent?.(evt.id)}
                                    className="px-2.5 py-1 text-xs text-white bg-sky-700 hover:bg-sky-600 rounded font-bold cursor-pointer transition-colors"
                                  >
                                    تایید و صدور دستورکار
                                  </button>
                                )}

                                {/* Edit Button */}
                                {!isDone && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // 1. Prohibit editing schedule-generated events
                                      if (evt.isAutomatedPM || evt.originatingScheduleId || evt.scheduleId) {
                                        setProhibitedEditMessage({
                                          title: 'عدم امکان ویرایش مستقیم رویدادهای برنامه‌ریزی‌شده PM',
                                          description:
                                            'این رویداد به طور خودکار بر اساس برنامه نگهداری و تعمیرات دوره‌ای (PM) ایجاد شده است و امکان تغییر مشخصات آن در این بخش وجود ندارد. در صورتی که نیاز به تغییر شرایط، شرح یا دوره‌های آتی دارید، لطفاً برنامه نت مربوطه را در تب «برنامه‌ها» ویرایش یا بازتعریف فرمایید.',
                                        });
                                        return;
                                      }

                                      // 2. Prohibit editing completed, missed, or cancelled events
                                      if (evt.status === 'completed' || evt.status === 'missed' || evt.status === 'cancelled') {
                                        setProhibitedEditMessage({
                                          title: 'عدم امکان ویرایش رویدادهای مختومه یا تاریخچه',
                                          description:
                                            'این دستورکار در وضعیت مختومه، لغو شده یا منقضی قرار دارد. سوابق تاریخی ثبت‌شده در سیستم جهت حفظ اصالت داده‌ها و ردگیری غیرقابل ویرایش می‌باشند.',
                                        });
                                        return;
                                      }

                                      // 3. Technician role restrictions
                                      if (userRole === 'technician' && evt.status !== 'pending_request') {
                                        setProhibitedEditMessage({
                                          title: 'عدم دسترسی تکنسین به ویرایش دستورکار صادرشده',
                                          description:
                                            'دستورکارهای فعال صادرشده توسط مدیر سیستم قابل ویرایش نیستند. شما می‌توانید نسبت به اجرای کار و ثبت پایان اقدام نمایید.',
                                        });
                                        return;
                                      }

                                      onEditEvent?.(evt);
                                    }}
                                    className="px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-100 border border-slate-200 rounded font-medium cursor-pointer transition-colors"
                                  >
                                    ویرایش
                                  </button>
                                )}

                                {/* Cancel Button */}
                                {!isDone && !isCanc && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm('آیا از لغو این دستورکار اطمینان دارید؟')) {
                                        onCancelEvent?.(evt.id);
                                      }
                                    }}
                                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                                  >
                                    لغو
                                  </button>
                                )}

                                {/* Delete Button (Manager only, or unapproved request) */}
                                {(userRole === 'manager' || isPendingReq) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm('آیا از حذف این رویداد اطمینان دارید؟')) {
                                        onDeleteEvent?.(evt.id);
                                      }
                                    }}
                                    className="px-2 py-1 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                                    title="حذف رویداد"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 
              Tab 5: برنامه‌ها (Schedules)
              Section 1 & 3 Requirements:
              1. Remove schedule completion/action button (completion exclusively through Events tab).
              2. Add Pause/Resume and Remove actions with confirmation.
              3. Technicians must not be able to create schedules (Manager only).
            */}
            {activeTab === 'schedules' && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      برنامه‌های نت پیشگیرانه دوره‌ای (PM)
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      با رسیدن موعد، به صورت خودکار به لیست اقدامات اضافه شده و پس از تکمیل دوره تکرار می‌شوند
                    </p>
                  </div>
                  {/* Schedule creation is Manager only */}
                  {userRole === 'manager' && onOpenCreateSchedule && (
                    <button
                      onClick={() => onOpenCreateSchedule(selectedAsset.id)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>افزودن برنامه جدید</span>
                    </button>
                  )}
                </div>

                {currentSchedules.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    برنامه PM دوره‌ای برای این تجهیز ثبت نشده است.{userRole === 'manager' ? ' روی «افزودن برنامه جدید» کلیک کنید.' : ''}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {currentSchedules.map((sch) => (
                      <div key={sch.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{sch.taskTitle}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            دوره تکرار: هر {toPersianDigits(sch.intervalValue)}{' '}
                            {sch.intervalType === 'months'
                              ? 'ماه'
                              : sch.intervalType === 'weeks'
                              ? 'هفته'
                              : sch.intervalType === 'hours'
                              ? 'ساعت کارکرد'
                              : 'روز'}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500 font-mono">
                              موعد بعد: {formatPersianDate(sch.nextDueDate, { showMonthName: true })}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                sch.status === 'paused'
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : sch.status === 'overdue'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {sch.status === 'paused'
                                ? 'متوقف‌شده'
                                : sch.status === 'overdue'
                                ? 'دارای تاخیر'
                                : 'فعال'}
                            </span>
                          </div>

                          {/* Pause/Resume and Remove Actions (Manager only) */}
                          {userRole === 'manager' && (
                            <div className="flex items-center gap-1.5">
                              {onTogglePauseSchedule && (
                                <button
                                  type="button"
                                  onClick={() => onTogglePauseSchedule(sch.id)}
                                  className={`px-2 py-1 text-[11px] font-bold rounded-md transition-colors flex items-center gap-1 cursor-pointer border ${
                                    sch.status === 'paused'
                                      ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                      : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                  }`}
                                  title={sch.status === 'paused' ? 'فعال‌سازی مجدد برنامه نت' : 'توقف موقت تولید خودکار رویداد'}
                                >
                                  {sch.status === 'paused' ? (
                                    <>
                                      <Play className="w-3 h-3" />
                                      <span>فعال‌سازی</span>
                                    </>
                                  ) : (
                                    <>
                                      <Pause className="w-3 h-3" />
                                      <span>توقف موقت</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {onDeleteSchedule && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (
                                      confirm(
                                        'آیا از حذف این برنامه نت اطمینان دارید؟\nاین عملیات برنامه را غیرفعال می‌کند اما رویدادها و سوابق ثبت‌شده قبلی آن در سیستم باقی خواهند ماند.'
                                      )
                                    ) {
                                      onDeleteSchedule(sch.id);
                                    }
                                  }}
                                  className="px-2 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                  title="حذف برنامه نگهداری و تعمیرات"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>حذف برنامه</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 
              Tab 6: قطعات (Parts)
              User Requirement: "do the same add button under parts tab, whcih opens a menue to select parts from storage to be added to the asset"
            */}
            {activeTab === 'parts' && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800">
                      قطعات یدکی مرتبط با این تجهیز
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      قطعات مصرفی متصل‌شده از انبار تجهیزات تصفیه‌خانه
                    </p>
                  </div>

                  <button
                    onClick={() => setIsLinkPartModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن قطعه از انبار</span>
                  </button>
                </div>

                {currentParts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    قطعه‌ای به این تجهیز متصل نشده است. روی «افزودن قطعه از انبار» کلیک کنید.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {currentParts.map((inv) => (
                      <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{inv.partName}</div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            شماره قطعه: {inv.partNumber} · موقعیت قفسه: {inv.shelfLocation}
                          </div>
                        </div>

                        <div className="text-left">
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {toPersianDigits(inv.quantityInStock)} {inv.unit} موجود
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 7: یادداشت‌ها و گزارش‌ها (Notes & Reports) */}
            {activeTab === 'notes_reports' && (
              <AssetNotesAndReportsTab
                asset={selectedAsset}
                subAssets={currentSubAssets}
                notes={notes}
                reports={reports}
                currentUser={currentUser || null}
                userRole={userRole}
                onRefreshData={onRefreshData || (async () => {})}
                onOpenCreateEventFromReport={onOpenCreateEventFromReport}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
          تجهیزی انتخاب نشده است.
        </div>
      )}

      {/* 2. Asset Tree Panel (LEFT SIDE in RTL) */}
      <div className="w-full md:w-72 lg:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Tree Search Header */}
        <div className="p-3 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-600" />
              درخت تجهیزات تصفیه‌خانه
            </span>

            {userRole === 'manager' && onOpenAddAsset && (
              <button
                onClick={onOpenAddAsset}
                className="px-2 py-1 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                title="افزودن تجهیز جدید"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن</span>
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
            <input
              type="text"
              placeholder="جستجو در تجهیزات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 font-vazir"
            />
          </div>
        </div>

        {/* Tree Nodes List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-100">
          {filteredAssets.map((ast) => {
            const isSelected = selectedAsset?.id === ast.id;
            const subCount = subAssets.filter((s) => s.assetId === ast.id).length;

            return (
              <button
                key={ast.id}
                onClick={() => setSelectedAssetId(ast.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-right transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-sky-50 border border-sky-300 ring-1 ring-sky-200 font-semibold'
                    : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="min-w-0 pl-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                      {ast.code}
                    </span>
                    <span className="text-xs text-slate-900 truncate">{ast.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 truncate">
                    {ast.category} · {toPersianDigits(ast.operatingHours.toLocaleString())} ساعت
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {subCount > 0 && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {toPersianDigits(subCount)} جزء
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
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Link Part from storage modal */}
      {selectedAsset && (
        <LinkPartModal
          isOpen={isLinkPartModalOpen}
          onClose={() => setIsLinkPartModalOpen(false)}
          assetCode={selectedAsset.code}
          assetName={selectedAsset.name}
          inventory={inventory}
          onLinkPart={(code, partId) => {
            onLinkPartToAsset?.(code, partId);
          }}
        />
      )}

      {/* Inspect Event Modal */}
      <EventDetailsModal
        event={inspectEvent}
        isOpen={Boolean(inspectEvent)}
        onClose={() => setInspectEvent(null)}
      />

      {/* Complete Event Modal */}
      <CompleteEventModal
        isOpen={Boolean(completingEvent)}
        onClose={() => setCompletingEvent(null)}
        event={completingEvent}
        inventory={inventory}
        userRole={userRole}
        onComplete={(evtId, completionData) => {
          onCompleteEvent?.(evtId, completionData);
          setCompletingEvent(null);
        }}
      />

      {/* Prohibited Edit Policy Explanation Modal */}
      {prohibitedEditMessage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          dir="rtl"
          onClick={() => setProhibitedEditMessage(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {prohibitedEditMessage.title}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {prohibitedEditMessage.description}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProhibitedEditMessage(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
