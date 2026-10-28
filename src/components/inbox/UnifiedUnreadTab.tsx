import React, { useState } from 'react';
import {
  Inbox,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Wrench,
  ChevronLeft,
  CheckCheck,
  Filter,
  CheckSquare,
  FileText,
  Calendar,
} from 'lucide-react';
import type { MaintenanceEvent, TechnicianReport, User as UserType } from '../../types';
import { formatPersianDate, toPersianDigits } from '../../utils/persianDate';

export interface UnifiedUnreadItem {
  id: string;
  type: 'request' | 'report';
  title: string;
  assetId?: string;
  assetName?: string;
  author: string;
  createdAt: number | string;
  description: string;
  severity?: string;
  statusText: string;
  statusColor: string;
  rawRequest?: MaintenanceEvent;
  rawReport?: TechnicianReport;
}

interface UnifiedUnreadTabProps {
  events: MaintenanceEvent[];
  reports: TechnicianReport[];
  currentUser: UserType | null;
  readItemIds: Set<string>;
  onMarkAsRead: (itemId: string, itemType: 'request' | 'report') => void;
  onMarkAllAsRead: () => void;
  onNavigateToItem: (type: 'request' | 'report', itemId: string) => void;
}

export const UnifiedUnreadTab: React.FC<UnifiedUnreadTabProps> = ({
  events,
  reports,
  currentUser,
  readItemIds,
  onMarkAsRead,
  onMarkAllAsRead,
  onNavigateToItem,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'request' | 'report'>('all');

  // Build unified unread items
  const unreadItems: UnifiedUnreadItem[] = [];

  // 1. Unread pending requests
  events.forEach((ev) => {
    // Only pending requests or approval events that are unread
    const isPending = ev.status === 'pending_request' || ev.status === 'pending_approval';
    const isUnread = !readItemIds.has(ev.id);

    if (isPending && isUnread) {
      unreadItems.push({
        id: ev.id,
        type: 'request',
        title: ev.title,
        assetId: ev.assetId,
        assetName: ev.assetName || ev.assetId,
        author: ev.technicianName || 'تکنسین',
        createdAt: ev.date || (ev.updatedAt ? new Date(ev.updatedAt).toISOString() : ''),
        description: ev.description || (ev.status === 'pending_request' ? 'درخواست صدور دستورکار تعمیراتی' : 'دستورکار در انتظار تایید نهایی'),
        statusText: ev.status === 'pending_request' ? 'در انتظار تایید درخواست' : 'در انتظار تایید اجرا',
        statusColor: ev.status === 'pending_request' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-sky-100 text-sky-800 border-sky-200',
        rawRequest: ev,
      });
    }
  });

  // 2. Unread technician reports
  reports.forEach((rep) => {
    const isUnread = !readItemIds.has(rep.id);
    if (isUnread) {
      let statusColor = 'bg-slate-100 text-slate-800 border-slate-200';
      let statusText = 'ثبت شده';
      if (rep.status === 'pending_review') {
        statusColor = 'bg-rose-100 text-rose-800 border-rose-200';
        statusText = 'نیازمند بررسی مدیر';
      } else if (rep.status === 'action_required') {
        statusColor = 'bg-amber-100 text-amber-800 border-amber-200';
        statusText = 'نیازمند اقدام فوری';
      } else if (rep.status === 'resolved' || rep.status === 'dismissed') {
        statusColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        statusText = 'بررسی و مختومه شده';
      }

      unreadItems.push({
        id: rep.id,
        type: 'report',
        title: rep.title,
        assetId: rep.assetId,
        assetName: rep.assetName,
        author: rep.reporterName,
        createdAt: rep.createdAt,
        description: rep.description,
        severity: rep.severity,
        statusText,
        statusColor,
        rawReport: rep,
      });
    }
  });

  // Sort descending by date
  unreadItems.sort((a, b) => {
    const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime();
    const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime();
    return timeB - timeA;
  });

  // Filter
  const filteredItems = unreadItems.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    switch (severity) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-rose-500 text-white">
            بحرانی
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-amber-500 text-white">
            اولویت بالا
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-sky-500 text-white">
            متوسط
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-500 text-white">
            عادی
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/60 p-4 md:p-6 space-y-4" dir="rtl">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-sky-600" />
            <span>پیام‌ها و موارد خوانده‌نشده</span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-sky-100 text-sky-800 border border-sky-200">
              {toPersianDigits(unreadItems.length)} مورد
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            مجموعه گزارش‌های فنی و درخواست‌های بررسی‌نشده که نیازمند توجه شما هستند.
          </p>
        </div>

        {unreadItems.length > 0 && (
          <button
            onClick={onMarkAllAsRead}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span>علامت‌گذاری همه به عنوان خوانده‌شده</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 shrink-0">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'all'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          همه موارد ({toPersianDigits(unreadItems.length)})
        </button>
        <button
          onClick={() => setFilterType('report')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'report'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          گزارش‌های فنی ({toPersianDigits(unreadItems.filter((i) => i.type === 'report').length)})
        </button>
        <button
          onClick={() => setFilterType('request')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filterType === 'request'
              ? 'bg-sky-600 text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          درخواست‌های دستورکار ({toPersianDigits(unreadItems.filter((i) => i.type === 'request').length)})
        </button>
      </div>

      {/* Content list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {filteredItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
            <h3 className="text-base font-bold text-slate-800">صندوق ورودی شما خالی است</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              تمام گزارش‌های خرابی و درخواست‌های تایید دستورکار مشاهده یا خوانده شده‌اند. موارد جدید به محض ثبت در اینجا نمایش داده خواهند شد.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group border-r-4 border-r-sky-500"
            >
              <div
                onClick={() => {
                  onMarkAsRead(item.id, item.type);
                  onNavigateToItem(item.type, item.id);
                }}
                className="flex-1 cursor-pointer w-full"
              >
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-md flex items-center gap-1 ${
                      item.type === 'report'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                    }`}
                  >
                    {item.type === 'report' ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-amber-700" />
                        <span>گزارش فنی</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="w-3 h-3 text-indigo-700" />
                        <span>درخواست تایید</span>
                      </>
                    )}
                  </span>

                  {item.severity && getSeverityBadge(item.severity)}

                  <span className={`px-2 py-0.5 text-[11px] font-medium rounded border ${item.statusColor}`}>
                    {item.statusText}
                  </span>

                  <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-auto">
                    <Calendar className="w-3 h-3" />
                    <span>{formatPersianDate(item.createdAt)}</span>
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                  {item.title}
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                  {item.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 mt-2">
                  {item.assetName && (
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <Wrench className="w-3.5 h-3.5 text-slate-400" />
                      <span>تجهیز: {item.assetName}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>ثبت‌کننده: {item.author}</span>
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex sm:flex-col items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <button
                  onClick={() => {
                    onMarkAsRead(item.id, item.type);
                    onNavigateToItem(item.type, item.id);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <span>مشاهده و اقدام</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(item.id, item.type);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="علامت‌گذاری به عنوان خوانده‌شده"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>خواندم</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
