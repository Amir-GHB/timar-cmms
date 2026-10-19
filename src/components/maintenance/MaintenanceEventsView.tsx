import React, { useState } from 'react';
import {
  Wrench,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  User,
  Package,
  Calendar,
  CheckCircle2,
  Hourglass,
  Layers,
} from 'lucide-react';
import type {
  MaintenanceEvent,
  Role,
  CalendarType,
  Language,
} from '../../types';
import { formatDualDate } from '../../utils/persianDate';

interface MaintenanceEventsViewProps {
  events: MaintenanceEvent[];
  userRole?: Role;
  calendarType: CalendarType;
  language: Language;
  onOpenCreateEvent: (assetId?: string) => void;
  onSelectApprovalTab?: () => void;
}

export const MaintenanceEventsView: React.FC<MaintenanceEventsViewProps> = ({
  events,
  userRole,
  calendarType,
  language,
  onOpenCreateEvent,
  onSelectApprovalTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredEvents = events.filter((e) => {
    const matchSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.assetCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.technicianName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'all' || e.type === typeFilter;
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const pendingCount = events.filter((e) => e.status === 'pending_approval').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 p-4 md:p-6 space-y-4">
      {/* Top Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-5 h-5 text-sky-600" />
            Maintenance Events & Work Orders
          </h1>
          <p className="text-xs text-slate-500">
            Log and review equipment inspections, preventive servicing, and emergency repairs
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && onSelectApprovalTab && (
            <button
              onClick={onSelectApprovalTab}
              className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Hourglass className="w-3.5 h-3.5 text-amber-600" />
              <span>{pendingCount} Awaiting Sign-off</span>
            </button>
          )}

          <button
            onClick={() => onOpenCreateEvent()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{userRole === 'technician' ? 'Submit Completion Request' : 'Log Maintenance Event'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by work order, asset code, technician..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          {[
            { id: 'all', label: 'All Types' },
            { id: 'preventive', label: 'Preventive' },
            { id: 'corrective', label: 'Corrective' },
            { id: 'emergency', label: 'Breakdown' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === t.id
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none shrink-0"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed & Signed</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="scheduled">Scheduled</option>
        </select>
      </div>

      {/* Events List */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-y-auto divide-y divide-slate-100 shadow-xs">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No maintenance events found matching your criteria.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isCompleted = evt.status === 'completed';
            const isPending = evt.status === 'pending_approval';

            return (
              <div key={evt.id} className="p-4 md:p-5 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                      {evt.assetCode}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">{evt.assetName}</span>
                    <span aria-hidden="true" className="text-slate-300">·</span>
                    <span className="text-xs capitalize text-slate-500">{evt.type} Service</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isPending
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {evt.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDualDate(evt.date, calendarType, language)}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2">{evt.title}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{evt.description}</p>

                {evt.solution && (
                  <div className="mt-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-slate-900">Action:</span> {evt.solution}
                  </div>
                )}

                {/* Quiet unboxed metadata according to frontend-design skill */}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Tech: {evt.technicianName}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Duration: {evt.durationHours} hrs</span>
                  <span aria-hidden="true">·</span>
                  <span>Downtime: {evt.downtimeHours} hrs</span>

                  {evt.partsUsed.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-sky-700 font-medium">
                        {evt.partsUsed.reduce((acc, p) => acc + p.quantityUsed, 0)} parts used (
                        {evt.partsUsed.map((p) => p.partNumber).join(', ')})
                      </span>
                    </>
                  )}

                  {evt.approvedBy && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 font-medium">
                        Approved by {evt.approvedBy}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
