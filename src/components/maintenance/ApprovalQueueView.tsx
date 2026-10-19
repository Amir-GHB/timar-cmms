import React, { useState } from 'react';
import {
  CheckSquare,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Package,
  AlertTriangle,
  FileText,
  Wrench,
} from 'lucide-react';
import type {
  MaintenanceEvent,
  Role,
  CalendarType,
  Language,
} from '../../types';
import { formatDualDate } from '../../utils/persianDate';

interface ApprovalQueueViewProps {
  events: MaintenanceEvent[];
  userRole?: Role;
  calendarType: CalendarType;
  language: Language;
  onApproveEvent: (eventId: string, approvalNotes: string) => void;
  onRejectEvent: (eventId: string, revisionNotes: string) => void;
  onSwitchToManager?: () => void;
}

export const ApprovalQueueView: React.FC<ApprovalQueueViewProps> = ({
  events,
  userRole,
  calendarType,
  language,
  onApproveEvent,
  onRejectEvent,
  onSwitchToManager,
}) => {
  const pendingEvents = events.filter((e) => e.status === 'pending_approval');
  const [selectedEventId, setSelectedEventId] = useState<string>(pendingEvents[0]?.id || '');
  const [managerNotes, setManagerNotes] = useState('');

  const selectedEvent = pendingEvents.find((e) => e.id === selectedEventId) || pendingEvents[0];

  const handleApprove = () => {
    if (!selectedEvent) return;
    onApproveEvent(selectedEvent.id, managerNotes || 'Approved by Plant Technical Manager.');
    setManagerNotes('');
  };

  const handleReject = () => {
    if (!selectedEvent) return;
    if (!managerNotes.trim()) {
      alert('Please provide notes explaining what the technician should revise.');
      return;
    }
    onRejectEvent(selectedEvent.id, managerNotes);
    setManagerNotes('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 p-4 md:p-6 space-y-4">
      {/* Role Banner if Technician */}
      {userRole !== 'manager' && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Technician View:</strong> You have read-only access to this queue. Only
              Technical Managers can approve or finalize work order completion requests.
            </span>
          </div>
          {onSwitchToManager && (
            <button
              onClick={onSwitchToManager}
              className="px-2.5 py-1 bg-amber-600 text-white font-semibold rounded-md hover:bg-amber-700 transition-colors shrink-0 cursor-pointer"
            >
              Switch to Manager Profile
            </button>
          )}
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-sky-600" />
            Manager Approval Queue
          </h1>
          <p className="text-xs text-slate-500">
            Review and sign off on completed maintenance events submitted by field technicians
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            {pendingEvents.length} Pending Sign-offs
          </span>
        </div>
      </div>

      {pendingEvents.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
          <h3 className="text-sm font-bold text-slate-900">All Work Orders Approved</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            There are no pending technician completion requests awaiting manager approval at this time.
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">
          {/* Left list: Pending events */}
          <div className="w-full lg:w-96 bg-white rounded-xl border border-slate-200 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {pendingEvents.map((evt) => {
              const isSelected = selectedEvent?.id === evt.id;
              return (
                <button
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50 border border-sky-300 ring-1 ring-sky-200'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded">
                      {evt.assetCode}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDualDate(evt.date, calendarType, language)}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                    {evt.title}
                  </div>

                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {evt.technicianName}
                    </span>
                    <span>·</span>
                    <span>{evt.durationHours} hrs</span>
                    {evt.partsUsed.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-sky-700 font-medium">
                          {evt.partsUsed.length} parts
                        </span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right inspection card */}
          {selectedEvent && (
            <div className="flex-1 bg-white rounded-xl border border-slate-200 p-5 md:p-6 overflow-y-auto space-y-5 shadow-xs">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded">
                      {selectedEvent.assetCode}
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {selectedEvent.assetName}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Awaiting Manager Sign-off
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">{selectedEvent.title}</h2>
                </div>

                <div className="text-right text-xs">
                  <span className="text-slate-400 block text-[11px]">Submitted on</span>
                  <span className="font-semibold text-slate-800">
                    {formatDualDate(selectedEvent.date, calendarType, language)}
                  </span>
                </div>
              </div>

              {/* Technician & Work Duration Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Submitting Technician</span>
                  <span className="font-medium text-slate-800">{selectedEvent.technicianName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Type of Work</span>
                  <span className="font-medium text-slate-800 capitalize">
                    {selectedEvent.type} Maintenance
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Labor Duration</span>
                  <span className="font-mono font-medium text-slate-800">
                    {selectedEvent.durationHours} hours
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Equipment Downtime</span>
                  <span className="font-mono font-medium text-slate-800">
                    {selectedEvent.downtimeHours} hours
                  </span>
                </div>
              </div>

              {/* Technician's Detailed Observations */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Technician Observations & Diagnosis
                </h3>
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 leading-relaxed border border-slate-100">
                  {selectedEvent.description || 'No description entered.'}
                </div>
              </div>

              {/* Resolution / Action Taken */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Actions Taken & Commissioning Notes
                </h3>
                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 leading-relaxed border border-slate-100">
                  {selectedEvent.solution || 'No solution notes entered.'}
                </div>
              </div>

              {/* Consumed Spare Parts */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-sky-600" />
                  Spare Parts Consumed From Warehouse
                </h3>

                {selectedEvent.partsUsed.length === 0 ? (
                  <div className="text-xs text-slate-400 italic">
                    No warehouse parts claimed for this work order.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Part Name</th>
                          <th className="px-3 py-2">Part Number</th>
                          <th className="px-3 py-2 text-right">Quantity</th>
                          <th className="px-3 py-2 text-right">Est. Unit Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedEvent.partsUsed.map((p, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium text-slate-800">{p.partName}</td>
                            <td className="px-3 py-2 font-mono text-slate-500">{p.partNumber}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                              {p.quantityUsed}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600">
                              ${p.unitCost.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Manager Decision Box */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Manager Sign-off / Revision Remarks
                </label>
                <textarea
                  rows={2}
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                  placeholder="Enter sign-off comments, laser alignment verification, or revision instructions for the technician..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                  disabled={userRole !== 'manager'}
                />

                {userRole === 'manager' ? (
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={handleReject}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Request Revision</span>
                    </button>
                    <button
                      onClick={handleApprove}
                      className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve & Complete Work Order</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-right">
                    Only managers can approve or reject events.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
