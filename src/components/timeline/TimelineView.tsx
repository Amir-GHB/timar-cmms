import React from 'react';
import { History, Wrench, AlertTriangle, CheckCircle2, User, Clock, Package } from 'lucide-react';
import type { MaintenanceEvent, CalendarType, Language } from '../../types';
import { formatDualDate } from '../../utils/persianDate';

interface TimelineViewProps {
  events: MaintenanceEvent[];
  calendarType: CalendarType;
  language: Language;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  events,
  calendarType,
  language,
}) => {
  // Sort descending by date
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-sky-600" />
          Plant Maintenance Timeline
        </h1>
        <p className="text-xs text-slate-500">
          Chronological historical activity stream of water treatment plant interventions and repairs
        </p>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-y-auto p-6 shadow-xs">
        {sortedEvents.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No chronological service records available.
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-200 ml-4 md:ml-8 pl-6 space-y-8">
            {sortedEvents.map((evt) => {
              const isEmergency = evt.type === 'emergency';
              const isCompleted = evt.status === 'completed';

              return (
                <div key={evt.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                      isEmergency
                        ? 'bg-rose-500 ring-4 ring-rose-100'
                        : isCompleted
                        ? 'bg-emerald-500 ring-4 ring-emerald-100'
                        : 'bg-amber-500 ring-4 ring-amber-100'
                    }`}
                  />

                  {/* Event Content Card */}
                  <div className="bg-slate-50 hover:bg-slate-100/80 transition-colors p-4 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                          {evt.assetCode}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{evt.title}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 font-mono">
                        {formatDualDate(evt.date, calendarType, language)}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-medium">{evt.assetName}</div>

                    <p className="text-xs text-slate-700 leading-relaxed">{evt.description}</p>

                    {evt.solution && (
                      <div className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200">
                        <span className="font-bold text-slate-900">Resolution:</span> {evt.solution}
                      </div>
                    )}

                    {/* Footer Details */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-500 font-mono border-t border-slate-200/60">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {evt.technicianName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Labor: {evt.durationHours}h</span>
                      {evt.downtimeHours > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-rose-600 font-bold">Downtime: {evt.downtimeHours}h</span>
                        </>
                      )}
                      {evt.partsUsed.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-700 font-medium">
                            {evt.partsUsed.length} parts used
                          </span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="capitalize font-semibold text-slate-700">
                        Status: {evt.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
