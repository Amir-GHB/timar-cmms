import React, { useState } from 'react';
import {
  CalendarClock,
  Plus,
  Play,
  Pause,
  Trash2,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  X,
  Gauge,
} from 'lucide-react';
import type {
  MaintenanceSchedule,
  Asset,
  Role,
  CalendarType,
  Language,
} from '../../types';
import { formatDualDate } from '../../utils/persianDate';

interface SchedulesViewProps {
  schedules: MaintenanceSchedule[];
  assets: Asset[];
  userRole?: Role;
  calendarType: CalendarType;
  language: Language;
  onExecuteSchedule?: (schedule: MaintenanceSchedule) => void;
  onSaveSchedule?: (schedule: Partial<MaintenanceSchedule>) => void;
  onTogglePauseSchedule?: (scheduleId: string) => void;
  onDeleteSchedule?: (scheduleId: string) => void;
}

export const SchedulesView: React.FC<SchedulesViewProps> = ({
  schedules,
  assets,
  userRole,
  calendarType,
  language,
  onExecuteSchedule,
  onSaveSchedule,
  onTogglePauseSchedule,
  onDeleteSchedule,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [assetId, setAssetId] = useState(assets[0]?.id || '');
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [intervalType, setIntervalType] = useState<'days' | 'weeks' | 'months' | 'hours'>('months');
  const [intervalValue, setIntervalValue] = useState('1');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find((a) => a.id === assetId);
    if (!asset || !taskTitle) return;

    const val = parseInt(intervalValue, 10) || 1;
    const now = new Date();
    // Approximate next due date
    const nextDate = new Date(now);
    if (intervalType === 'days') nextDate.setDate(nextDate.getDate() + val);
    else if (intervalType === 'weeks') nextDate.setDate(nextDate.getDate() + val * 7);
    else if (intervalType === 'months') nextDate.setMonth(nextDate.getMonth() + val);
    else nextDate.setDate(nextDate.getDate() + 30);

    onSaveSchedule?.({
      assetId: asset.id,
      assetName: asset.name,
      assetCode: asset.code,
      taskTitle,
      description,
      intervalType,
      intervalValue: val,
      lastPerformedDate: now.toISOString().split('T')[0],
      nextDueDate: nextDate.toISOString().split('T')[0],
      status: 'active',
      assignedRole: 'technician',
    });

    setShowAddModal(false);
    setTaskTitle('');
    setDescription('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 p-4 md:p-6 space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-sky-600" />
            Preventive Maintenance Schedules
          </h1>
          <p className="text-xs text-slate-500">
            Automated recurring inspection and overhaul cycles triggered by time or runtime hours
          </p>
        </div>

        {userRole === 'manager' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Schedule</span>
          </button>
        )}
      </div>

      {/* Schedules Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-y-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3">Equipment</th>
              <th className="px-4 py-3">Task Routine</th>
              <th className="px-4 py-3">Recurrence Interval</th>
              <th className="px-4 py-3">Last Performed</th>
              <th className="px-4 py-3">Next Due Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schedules.map((sch) => {
              const isOverdue = sch.status === 'overdue';

              return (
                <tr key={sch.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded w-max">
                      {sch.assetCode}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">
                      {sch.assetName}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{sch.taskTitle}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{sch.description}</div>
                  </td>

                  <td className="px-4 py-3 font-mono text-slate-600">
                    Every {sch.intervalValue} {sch.intervalType}
                    {sch.dueOperatingHours && (
                      <span className="block text-[11px] text-slate-400">
                        @ {sch.dueOperatingHours.toLocaleString()} hrs
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-600">
                    {formatDualDate(sch.lastPerformedDate, calendarType, language)}
                  </td>

                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {formatDualDate(sch.nextDueDate, calendarType, language)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        sch.status === 'paused'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : isOverdue
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {sch.status === 'paused' ? 'Paused' : sch.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right">
                    {userRole === 'manager' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        {onTogglePauseSchedule && (
                          <button
                            type="button"
                            onClick={() => onTogglePauseSchedule(sch.id)}
                            className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer border ${
                              sch.status === 'paused'
                                ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                                : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                            }`}
                            title={sch.status === 'paused' ? 'Resume Schedule' : 'Pause Schedule'}
                          >
                            {sch.status === 'paused' ? (
                              <>
                                <Play className="w-3 h-3" />
                                <span>Resume</span>
                              </>
                            ) : (
                              <>
                                <Pause className="w-3 h-3" />
                                <span>Pause</span>
                              </>
                            )}
                          </button>
                        )}

                        {onDeleteSchedule && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Are you sure you want to remove this recurring schedule? Historical events will be preserved.')) {
                                onDeleteSchedule(sch.id);
                              }
                            }}
                            className="px-2 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Remove Schedule"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[11px]">View only</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Schedule Modal (Manager) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-bold text-slate-900">Define Preventive Schedule</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Target Asset</label>
                <select
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.code}] {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Routine Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quarterly Cartridge Replacement & Sanitization"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Interval Cycle Type</label>
                  <select
                    value={intervalType}
                    onChange={(e) => setIntervalType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="hours">Operating Hours</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Interval Value</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={intervalValue}
                    onChange={(e) => setIntervalValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Task Procedure Checklist</label>
                <textarea
                  rows={2}
                  placeholder="Step-by-step standard operating procedure for the technician..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-700 text-white font-semibold rounded-md hover:bg-sky-600"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
