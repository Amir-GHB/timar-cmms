import React, { useState } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  User,
  Wrench,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Link as LinkIcon,
  CheckSquare,
  ArrowRight,
  Info,
} from 'lucide-react';
import type {
  TechnicianReport,
  MaintenanceEvent,
  ReportSeverity,
  ReportStatus,
  ReportCategory,
  User as UserType,
  Role,
} from '../../types';
import { formatPersianDate, toPersianDigits } from '../../utils/persianDate';
import { ReportsService } from '../../services/reportsService';

interface ReportsInboxTabProps {
  reports: TechnicianReport[];
  events: MaintenanceEvent[];
  currentUser: UserType | null;
  userRole?: Role;
  readItemIds: Set<string>;
  onMarkAsRead: (itemId: string, itemType: 'request' | 'report') => void;
  onRefreshData: () => Promise<void>;
  onOpenCreateEventFromReport?: (report: TechnicianReport) => void;
  selectedReportId?: string;
}

export const ReportsInboxTab: React.FC<ReportsInboxTabProps> = ({
  reports,
  events,
  currentUser,
  userRole,
  readItemIds,
  onMarkAsRead,
  onRefreshData,
  onOpenCreateEventFromReport,
  selectedReportId: initialSelectedId,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string>(
    initialSelectedId || reports[0]?.id || ''
  );

  // Manager decision form state
  const [managerDecision, setManagerDecision] = useState('');
  const [managerRationale, setManagerRationale] = useState('');
  const [isLinkingEvent, setIsLinkingEvent] = useState(false);
  const [selectedEventIdToLink, setSelectedEventIdToLink] = useState('');

  const filteredReports = reports.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && r.severity !== filterSeverity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.assetName.toLowerCase().includes(q) ||
        r.assetCode.toLowerCase().includes(q) ||
        r.reporterName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedReport =
    filteredReports.find((r) => r.id === selectedReportId) || filteredReports[0];

  const handleSelectReport = (rep: TechnicianReport) => {
    setSelectedReportId(rep.id);
    onMarkAsRead(rep.id, 'report');
  };

  const handleManagerDecision = async (status: ReportStatus) => {
    if (!selectedReport || !currentUser || userRole !== 'manager') return;
    await ReportsService.updateReportStatus(
      selectedReport.id,
      status,
      currentUser,
      managerRationale,
      managerDecision || `تغییر وضعیت به ${status}`
    );
    setManagerRationale('');
    setManagerDecision('');
    await onRefreshData();
  };

  const handleLinkEvent = async () => {
    if (!selectedReport || !selectedEventIdToLink || !currentUser) return;
    await ReportsService.linkEventToReport(selectedReport.id, selectedEventIdToLink, currentUser);
    setIsLinkingEvent(false);
    setSelectedEventIdToLink('');
    await onRefreshData();
  };

  const getSeverityBadge = (severity: ReportSeverity) => {
    switch (severity) {
      case 'critical':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">بحرانی</span>;
      case 'high':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">فوری / بالا</span>;
      case 'medium':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-800 rounded">متوسط</span>;
      case 'low':
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded">پایین</span>;
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'pending_review':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">در انتظار بررسی مدیر</span>;
      case 'action_required':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-800 rounded">اقدام لازم</span>;
      case 'monitoring':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-800 rounded">تحت پایش</span>;
      case 'info_requested':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 text-orange-800 rounded">نیازمند اطلاعات</span>;
      case 'resolved':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">حل و فصل شده</span>;
      case 'dismissed':
        return <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-700 rounded">رد شده با دلیل</span>;
    }
  };

  const getCategoryLabel = (category: ReportCategory) => {
    const labels: Record<string, string> = {
      leak: 'نشتی سیال / گاز',
      vibration: 'ارتعاشات غیرعادی',
      noise: 'صدای سایش / زوزه',
      electrical: 'اشکال برقی / اتصالی',
      pressure: 'افت یا نوسان فشار',
      contamination: 'آلودگی شیمیایی / بستر',
      other: 'سایر عیوب فنی',
    };
    return labels[category] || category;
  };

  // Events on the same asset eligible for linking
  const assetEvents = selectedReport
    ? events.filter((e) => e.assetId === selectedReport.assetId && !e.isDeleted)
    : [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden space-y-4" dir="rtl">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="جستجو در گزارش‌های نقص فنی..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white cursor-pointer"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="pending_review">در انتظار بررسی ({toPersianDigits(reports.filter(r => r.status === 'pending_review').length)})</option>
            <option value="action_required">اقدام لازم</option>
            <option value="monitoring">تحت پایش</option>
            <option value="info_requested">اطلاعات بیشتر</option>
            <option value="resolved">حل و فصل شده</option>
            <option value="dismissed">رد شده</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white cursor-pointer"
          >
            <option value="all">همه شدت‌ها</option>
            <option value="critical">بحرانی</option>
            <option value="high">فوری / بالا</option>
            <option value="medium">متوسط</option>
            <option value="low">پایین</option>
          </select>
        </div>
      </div>

      {filteredReports.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
          <h3 className="text-sm font-bold text-slate-900">هیچ گزارش نقصی با این مشخصات یافت نشد</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            تمامی گزارش‌های ارسالی تکنسین‌ها بررسی شده‌اند یا گزارشی مطابق فیلترهای انتخابی ثبت نشده است.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
          {/* Reports List (Right Column in RTL) */}
          <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1 shrink-0 shadow-xs">
            {filteredReports.map((rep) => {
              const isSelected = selectedReport?.id === rep.id;
              const isUnread = !readItemIds.has(rep.id);

              return (
                <button
                  key={rep.id}
                  onClick={() => handleSelectReport(rep)}
                  className={`w-full text-right p-3 rounded-xl transition-colors cursor-pointer relative ${
                    isSelected
                      ? 'bg-amber-50/70 border border-amber-300 ring-1 ring-amber-200'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {isUnread && (
                    <span className="absolute top-3 left-3 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
                  )}

                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                      {rep.assetCode}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {formatPersianDate(rep.createdAt, { showMonthName: true })}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                    {rep.title}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60 text-[11px]">
                    <span className="flex items-center gap-1 text-slate-500">
                      <User className="w-3 h-3 text-slate-400" />
                      {rep.reporterName}
                    </span>

                    <div className="flex items-center gap-1">
                      {getSeverityBadge(rep.severity)}
                      {getStatusBadge(rep.status)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Report Detail View & Manager Review Panel (Left Column in RTL) */}
          {selectedReport && (
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 md:p-6 overflow-y-auto space-y-5 shadow-xs">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                      {selectedReport.assetCode}
                    </span>
                    <span className="text-xs font-medium text-slate-600">
                      {selectedReport.assetName}
                    </span>
                    {getSeverityBadge(selectedReport.severity)}
                    {getStatusBadge(selectedReport.status)}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    {selectedReport.title}
                  </h2>
                </div>

                <div className="text-left text-xs shrink-0">
                  <span className="text-slate-400 block text-[11px]">تاریخ ثبت گزارش</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {formatPersianDate(selectedReport.createdAt, { showMonthName: true })}
                  </span>
                </div>
              </div>

              {/* Summary metadata cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">تکنسین گزارش‌دهنده</span>
                  <span className="font-bold text-slate-800">{selectedReport.reporterName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">دسته‌بندی نقص</span>
                  <span className="font-bold text-slate-800">{getCategoryLabel(selectedReport.category)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">تاریخ وقوع عیب</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedReport.occurrenceDate ? formatPersianDate(selectedReport.occurrenceDate) : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5">دستورکارهای متصل</span>
                  <span className="font-mono font-bold text-sky-700">
                    {toPersianDigits(selectedReport.relatedEventIds?.length || 0)} مورد
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  شرح کامل نقص و مشاهدات تکنسین
                </h3>
                <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-800 leading-relaxed border border-slate-100 whitespace-pre-wrap">
                  {selectedReport.description}
                </div>
              </div>

              {selectedReport.evidenceNotes && (
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-sky-600" />
                    شواهد فنی و نتایج آزمایش
                  </h3>
                  <div className="p-3.5 bg-sky-50/50 rounded-xl text-xs text-sky-900 leading-relaxed border border-sky-100">
                    {selectedReport.evidenceNotes}
                  </div>
                </div>
              )}

              {/* Related Events Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-sky-600" />
                    دستورکارهای تعمیراتی مرتبط
                  </h3>

                  {userRole === 'manager' && (
                    <div className="flex items-center gap-2">
                      {onOpenCreateEventFromReport && (
                        <button
                          onClick={() => onOpenCreateEventFromReport(selectedReport)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>صدور دستورکار جدید</span>
                        </button>
                      )}

                      <button
                        onClick={() => setIsLinkingEvent(!isLinkingEvent)}
                        className="px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <LinkIcon className="w-3 h-3 text-slate-500" />
                        <span>اتصال به دستورکار موجود</span>
                      </button>
                    </div>
                  )}
                </div>

                {isLinkingEvent && (
                  <div className="p-3 mb-2 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="font-bold text-slate-700">اتصال این گزارش به یک دستورکار موجود در تجهیز:</div>
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedEventIdToLink}
                        onChange={(e) => setSelectedEventIdToLink(e.target.value)}
                        className="flex-1 p-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="">یک دستورکار انتخاب کنید...</option>
                        {assetEvents.map((evt) => (
                          <option key={evt.id} value={evt.id}>
                            {evt.title} ({evt.status})
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleLinkEvent}
                        disabled={!selectedEventIdToLink}
                        className="px-3 py-2 font-bold text-white bg-sky-700 hover:bg-sky-600 disabled:bg-slate-300 rounded-lg cursor-pointer"
                      >
                        اتصال
                      </button>
                    </div>
                  </div>
                )}

                {selectedReport.relatedEventIds && selectedReport.relatedEventIds.length > 0 ? (
                  <div className="space-y-1.5">
                    {selectedReport.relatedEventIds.map((evtId) => {
                      const matched = events.find((e) => e.id === evtId);
                      return (
                        <div
                          key={evtId}
                          className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                              {evtId}
                            </span>
                            <span className="font-bold text-slate-800">
                              {matched ? matched.title : 'دستورکار متصل'}
                            </span>
                          </div>
                          {matched && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800">
                              وضعیت: {matched.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    تاکنون هیچ دستورکاری به این گزارش متصل نشده است.
                  </div>
                )}
              </div>

              {/* Status Decision History */}
              {selectedReport.statusHistory && selectedReport.statusHistory.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    تاریخچه وضعیت و ارزیابی‌های پیشین
                  </h3>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs">
                    {selectedReport.statusHistory.map((h, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-1.5 last:border-none last:pb-0">
                        <div>
                          <div className="font-bold text-slate-800">
                            {h.changedByName}: <span className="text-sky-800">{h.status}</span>
                          </div>
                          {h.rationale && (
                            <div className="text-slate-600 text-[11px] mt-0.5">{h.rationale}</div>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {formatPersianDate(h.changedAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Manager Actions Box */}
              {userRole === 'manager' && (
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    ارزیابی و ثبت تصمیم نهایی مدیر فنی
                  </label>

                  <input
                    type="text"
                    placeholder="عنوان تصمیم (مثال: صدور کار، پایش دوره‌ای، رد گزارش...)"
                    value={managerDecision}
                    onChange={(e) => setManagerDecision(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                  />

                  <textarea
                    rows={2}
                    placeholder="دلایل تصمیم و دستورات فنی تکمیلی جهت درج در سوابق گزارش..."
                    value={managerRationale}
                    onChange={(e) => setManagerRationale(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white leading-relaxed"
                  />

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleManagerDecision('action_required')}
                      className="px-3.5 py-2 text-xs font-bold text-sky-800 bg-sky-100 hover:bg-sky-200 rounded-lg transition-colors cursor-pointer"
                    >
                      تایید اقدام لازم
                    </button>

                    <button
                      onClick={() => handleManagerDecision('monitoring')}
                      className="px-3.5 py-2 text-xs font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors cursor-pointer"
                    >
                      تعیین وضعیت پایش
                    </button>

                    <button
                      onClick={() => handleManagerDecision('dismissed')}
                      className="px-3.5 py-2 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors cursor-pointer"
                    >
                      رد گزارش با دلیل
                    </button>

                    <button
                      onClick={() => handleManagerDecision('resolved')}
                      className="px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer"
                    >
                      حل و فصل شده
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
