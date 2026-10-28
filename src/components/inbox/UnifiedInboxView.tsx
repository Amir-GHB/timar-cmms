import React, { useState } from 'react';
import {
  Inbox,
  CheckSquare,
  AlertTriangle,
  Mail,
  Clock,
  Sparkles,
} from 'lucide-react';
import type {
  MaintenanceEvent,
  TechnicianReport,
  User as UserType,
  Role,
} from '../../types';
import { toPersianDigits } from '../../utils/persianDate';
import { UnifiedUnreadTab } from './UnifiedUnreadTab';
import { ReportsInboxTab } from './ReportsInboxTab';
import { RequestsSectionView } from '../views/RequestsSectionView';
import { InboxReadService } from '../../services/inboxReadService';

export type InboxSubTab = 'unread' | 'requests' | 'reports';

interface UnifiedInboxViewProps {
  events: MaintenanceEvent[];
  reports: TechnicianReport[];
  currentUser: UserType | null;
  userRole?: Role;
  readItemIds: Set<string>;
  onApproveEvent: (eventId: string, approvalNotes: string) => void;
  onRejectEvent: (eventId: string, revisionNotes: string) => void;
  onAuthorizeRequest?: (eventId: string, managerNotes?: string) => void;
  onRefreshData: () => Promise<void>;
  onOpenCreateEventFromReport?: (report: TechnicianReport) => void;
  onMarkAsRead: (itemId: string, itemType: 'request' | 'report') => void;
  onMarkAllAsRead: () => void;
  initialSubTab?: InboxSubTab;
}

export const UnifiedInboxView: React.FC<UnifiedInboxViewProps> = ({
  events,
  reports,
  currentUser,
  userRole,
  readItemIds,
  onApproveEvent,
  onRejectEvent,
  onAuthorizeRequest,
  onRefreshData,
  onOpenCreateEventFromReport,
  onMarkAsRead,
  onMarkAllAsRead,
  initialSubTab = 'unread',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<InboxSubTab>(initialSubTab);
  const [focusedEventId, setFocusedEventId] = useState<string | undefined>(undefined);
  const [focusedReportId, setFocusedReportId] = useState<string | undefined>(undefined);

  // Compute unread counts
  const unreadPendingRequestsCount = events.filter(
    (e) => (e.status === 'pending_request' || e.status === 'pending_approval') && !readItemIds.has(e.id)
  ).length;

  const unreadReportsCount = reports.filter((r) => !readItemIds.has(r.id)).length;
  const totalUnreadCount = unreadPendingRequestsCount + unreadReportsCount;

  // Requests requiring manager review/approval
  const pendingRequestsCount = events.filter(
    (e) => e.status === 'pending_approval' || e.status === 'pending_request'
  ).length;

  // Reports pending review
  const pendingReportsCount = reports.filter(
    (r) => r.status === 'pending_review' || r.status === 'action_required'
  ).length;

  const handleNavigateFromUnread = (type: 'request' | 'report', itemId: string) => {
    if (type === 'request') {
      setFocusedEventId(itemId);
      setActiveSubTab('requests');
    } else if (type === 'report') {
      setFocusedReportId(itemId);
      setActiveSubTab('reports');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50" dir="rtl">
      {/* Top Tab Bar for Unified Inbox */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 pt-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Unread Tab */}
          <button
            onClick={() => setActiveSubTab('unread')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'unread'
                ? 'border-sky-600 text-sky-600 bg-sky-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>خوانده‌نشده‌ها</span>
            {totalUnreadCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                {toPersianDigits(totalUnreadCount)}
              </span>
            )}
          </button>

          {/* Requests Tab */}
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'requests'
                ? 'border-sky-600 text-sky-600 bg-sky-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>درخواست‌های کار</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                {toPersianDigits(pendingRequestsCount)}
              </span>
            )}
          </button>

          {/* Reports Tab */}
          <button
            onClick={() => setActiveSubTab('reports')}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeSubTab === 'reports'
                ? 'border-sky-600 text-sky-600 bg-sky-50/40 rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>گزارش‌های فنی</span>
            {pendingReportsCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                {toPersianDigits(pendingReportsCount)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeSubTab === 'unread' && (
          <UnifiedUnreadTab
            events={events}
            reports={reports}
            currentUser={currentUser}
            readItemIds={readItemIds}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onNavigateToItem={handleNavigateFromUnread}
          />
        )}

        {activeSubTab === 'requests' && (
          <RequestsSectionView
            events={events}
            userRole={userRole}
            currentUser={currentUser}
            onApproveEvent={onApproveEvent}
            onRejectEvent={onRejectEvent}
            onAuthorizeRequest={onAuthorizeRequest}
            initialSelectedEventId={focusedEventId}
            onItemViewed={(id) => onMarkAsRead(id, 'request')}
          />
        )}

        {activeSubTab === 'reports' && (
          <ReportsInboxTab
            reports={reports}
            events={events}
            currentUser={currentUser}
            userRole={userRole}
            readItemIds={readItemIds}
            onMarkAsRead={onMarkAsRead}
            onRefreshData={onRefreshData}
            onOpenCreateEventFromReport={onOpenCreateEventFromReport}
            selectedReportId={focusedReportId}
          />
        )}
      </div>
    </div>
  );
};
