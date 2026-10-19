import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  Printer,
  Download,
} from 'lucide-react';
import type {
  Asset,
  MaintenanceEvent,
  StoragePart,
  CalendarType,
  Language,
} from '../../types';

interface ReportsViewProps {
  assets: Asset[];
  events: MaintenanceEvent[];
  inventory: StoragePart[];
  calendarType: CalendarType;
  language: Language;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  assets,
  events,
  inventory,
}) => {
  const totalEvents = events.length;
  const preventiveCount = events.filter((e) => e.type === 'preventive').length;
  const emergencyCount = events.filter((e) => e.type === 'emergency').length;
  const correctiveCount = events.filter((e) => e.type === 'corrective').length;

  const preventiveRatio = totalEvents > 0 ? Math.round((preventiveCount / totalEvents) * 100) : 0;
  const totalDowntime = events.reduce((acc, e) => acc + (e.downtimeHours || 0), 0);
  const totalLaborHours = events.reduce((acc, e) => acc + (e.durationHours || 0), 0);

  // Calculate consumed parts value
  let totalPartsValue = 0;
  const partsUsageSummary: Record<string, { name: string; pn: string; qty: number; cost: number }> = {};

  for (const evt of events) {
    for (const part of evt.partsUsed) {
      const lineCost = part.quantityUsed * part.unitCost;
      totalPartsValue += lineCost;

      if (!partsUsageSummary[part.partNumber]) {
        partsUsageSummary[part.partNumber] = {
          name: part.partName,
          pn: part.partNumber,
          qty: 0,
          cost: 0,
        };
      }
      partsUsageSummary[part.partNumber].qty += part.quantityUsed;
      partsUsageSummary[part.partNumber].cost += lineCost;
    }
  }

  // Plant Health
  const operationalAssets = assets.filter((a) => a.status === 'operational').length;
  const degradedAssets = assets.filter((a) => a.status === 'degraded').length;
  const maintenanceAssets = assets.filter((a) => a.status === 'under_maintenance' || a.status === 'offline').length;
  const plantAvailabilityPct = assets.length > 0 ? Math.round((operationalAssets / assets.length) * 100) : 100;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            Plant Reliability & Maintenance Analytics
          </h1>
          <p className="text-xs text-slate-500">
            Water Treatment Plant operations performance, preventive maintenance ratio & inventory cost
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Summary</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* KPI Strip (Natural editorial math with tabular figures) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Plant Availability
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {plantAvailabilityPct}%
            </div>
            <div className="text-[11px] text-emerald-700 font-medium mt-1">
              {operationalAssets} of {assets.length} Units Nominal
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Preventive Ratio (PM)
            </span>
            <div className="text-2xl font-bold text-sky-700 font-mono tabular-nums mt-1">
              {preventiveRatio}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Target: &gt;80% Preventive Work
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Logged Downtime
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {totalDowntime.toFixed(1)} hrs
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Across {emergencyCount} Unplanned Breakdowns
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Spare Parts Cost Value
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              ${totalPartsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Warehouse Inventory Depletions
            </div>
          </div>
        </div>

        {/* 2-Column Split: Equipment Distribution & Work Orders Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Equipment Status Distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
              Equipment Operating Status
            </h2>
            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-medium text-slate-800 mb-1">
                  <span>Operational & In Service</span>
                  <span className="font-mono">{operationalAssets} units ({plantAvailabilityPct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${plantAvailabilityPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-800 mb-1">
                  <span>Degraded Performance (Needs Inspection)</span>
                  <span className="font-mono">
                    {degradedAssets} units (
                    {assets.length > 0 ? Math.round((degradedAssets / assets.length) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{
                      width: `${assets.length > 0 ? (degradedAssets / assets.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-medium text-slate-800 mb-1">
                  <span>Under Active Maintenance</span>
                  <span className="font-mono">
                    {maintenanceAssets} units (
                    {assets.length > 0 ? Math.round((maintenanceAssets / assets.length) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-rose-500 h-2 rounded-full"
                    style={{
                      width: `${assets.length > 0 ? (maintenanceAssets / assets.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Work Orders Breakdown by Type */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
              Maintenance Service Event Breakdown
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 bg-sky-50 rounded-lg border border-sky-100">
                <span className="text-[11px] text-sky-800 font-medium">Preventive</span>
                <div className="text-xl font-bold text-sky-900 font-mono mt-1">
                  {preventiveCount}
                </div>
                <span className="text-[10px] text-sky-600">Scheduled SOPs</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-700 font-medium">Corrective</span>
                <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                  {correctiveCount}
                </div>
                <span className="text-[10px] text-slate-500">Repairs & Adjustments</span>
              </div>

              <div className="p-3 bg-rose-50 rounded-lg border border-rose-100">
                <span className="text-[11px] text-rose-800 font-medium">Breakdowns</span>
                <div className="text-xl font-bold text-rose-900 font-mono mt-1">
                  {emergencyCount}
                </div>
                <span className="text-[10px] text-rose-600">Unscheduled Outages</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
              <span>Total Labor Recorded:</span>
              <span className="font-mono font-bold text-slate-900">{totalLaborHours} Man-Hours</span>
            </div>
          </div>
        </div>

        {/* Consumed Warehouse Spare Parts Ledger */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
            Spare Parts Consumption Ledger
          </h2>

          {Object.keys(partsUsageSummary).length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              No spare parts consumption logged yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3 py-2">Part Name</th>
                  <th className="px-3 py-2">Part Number</th>
                  <th className="px-3 py-2 text-right">Total Units Consumed</th>
                  <th className="px-3 py-2 text-right">Aggregate Cost ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.values(partsUsageSummary).map((p, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-medium text-slate-800">{p.name}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">{p.pn}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                      {p.qty}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-800">
                      ${p.cost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
