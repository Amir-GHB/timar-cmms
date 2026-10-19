import React, { useState } from 'react';
import {
  Layers,
  Search,
  Plus,
  Wrench,
  Clock,
  Gauge,
  Calendar,
  AlertCircle,
  CheckCircle,
  FileText,
  ChevronRight,
  ChevronDown,
  Info,
  ShieldAlert,
} from 'lucide-react';
import type {
  Asset,
  SubAsset,
  MaintenanceEvent,
  MaintenanceSchedule,
  Role,
  CalendarType,
  Language,
} from '../../types';
import { formatDualDate } from '../../utils/persianDate';

interface AssetExplorerProps {
  assets: Asset[];
  subAssets: SubAsset[];
  events: MaintenanceEvent[];
  schedules: MaintenanceSchedule[];
  userRole?: Role;
  calendarType: CalendarType;
  language: Language;
  onOpenCreateEvent: (assetId: string) => void;
  onSaveAsset?: (asset: Partial<Asset>) => void;
  onSaveSubAsset?: (subAsset: Partial<SubAsset>) => void;
}

export const AssetExplorer: React.FC<AssetExplorerProps> = ({
  assets,
  subAssets,
  events,
  schedules,
  userRole,
  calendarType,
  language,
  onOpenCreateEvent,
  onSaveAsset,
  onSaveSubAsset,
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showAddSubAssetModal, setShowAddSubAssetModal] = useState(false);

  // New asset form state
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newAssetCategory, setNewAssetCategory] = useState<any>('Pumps & Blowers');
  const [newAssetLocation, setNewAssetLocation] = useState('');
  const [newAssetSpecs, setNewAssetSpecs] = useState('');
  const [newAssetManufacturer, setNewAssetManufacturer] = useState('');
  const [newAssetSerial, setNewAssetSerial] = useState('');

  // New subasset form state
  const [newSubName, setNewSubName] = useState('');
  const [newSubPartNo, setNewSubPartNo] = useState('');
  const [newSubSerial, setNewSubSerial] = useState('');

  const filteredAssets = assets.filter((ast) => {
    const matchQuery =
      ast.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ast.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ast.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || ast.status === statusFilter;
    return matchQuery && matchStatus;
  });

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || filteredAssets[0];
  const currentSubAssets = subAssets.filter((s) => s.assetId === selectedAsset?.id);
  const currentEvents = events.filter((e) => e.assetId === selectedAsset?.id);
  const currentSchedules = schedules.filter((s) => s.assetId === selectedAsset?.id);

  const handleCreateAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName || !newAssetCode) return;
    onSaveAsset?.({
      name: newAssetName,
      code: newAssetCode,
      category: newAssetCategory,
      location: newAssetLocation || 'Water Treatment Plant',
      capacitySpecs: newAssetSpecs || 'Standard industrial specifications',
      manufacturer: newAssetManufacturer || 'Industrial OEM',
      model: 'Model-' + newAssetCode,
      serialNumber: newAssetSerial || 'SN-' + Date.now(),
      status: 'operational',
      installDate: new Date().toISOString().split('T')[0],
      operatingHours: 0,
      parentId: null,
    });
    setShowAddAssetModal(false);
    setNewAssetName('');
    setNewAssetCode('');
  };

  const handleCreateSubAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName || !selectedAsset) return;
    onSaveSubAsset?.({
      assetId: selectedAsset.id,
      name: newSubName,
      partNumber: newSubPartNo || 'N/A',
      serialNumber: newSubSerial || 'SUB-' + Date.now(),
      status: 'normal',
    });
    setShowAddSubAssetModal(false);
    setNewSubName('');
    setNewSubPartNo('');
    setNewSubSerial('');
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-50">
      {/* Left Column: Asset Tree & Directory */}
      <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Search & Filter Header */}
        <div className="p-3 border-b border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-sky-600" />
              Plant Equipment Tree
            </h3>

            {userRole === 'manager' && (
              <button
                onClick={() => setShowAddAssetModal(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-md transition-colors"
                title="Add new equipment node (Manager Authority)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Node</span>
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter by code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-1">
            {['all', 'operational', 'degraded', 'under_maintenance'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors shrink-0 ${
                  statusFilter === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'all'
                  ? 'All'
                  : st === 'operational'
                  ? 'Operational'
                  : st === 'degraded'
                  ? 'Degraded'
                  : 'Maintenance'}
              </button>
            ))}
          </div>
        </div>

        {/* Tree List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {filteredAssets.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No equipment nodes match.</div>
          ) : (
            filteredAssets.map((ast) => {
              const isSelected = selectedAsset?.id === ast.id;
              const subCount = subAssets.filter((s) => s.assetId === ast.id).length;

              return (
                <button
                  key={ast.id}
                  onClick={() => setSelectedAssetId(ast.id)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-sky-50/80 border border-sky-300 ring-1 ring-sky-200'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-sky-800 bg-sky-100/70 px-1.5 py-0.5 rounded">
                        {ast.code}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 truncate">
                        {ast.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="truncate max-w-[140px]">{ast.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{ast.operatingHours.toLocaleString()}h</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0">
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
                    {subCount > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono mt-1">
                        {subCount} subs
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Selected Asset Detailed View */}
      {selectedAsset ? (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-md">
                    {selectedAsset.code}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                      selectedAsset.status === 'operational'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : selectedAsset.status === 'degraded'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {selectedAsset.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-slate-500">· {selectedAsset.location}</span>
                </div>
                <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight">
                  {selectedAsset.name}
                </h1>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl">{selectedAsset.notes}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onOpenCreateEvent(selectedAsset.id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Log Event / Repair</span>
                </button>
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Manufacturer & Model</span>
                <span className="font-medium text-slate-800">
                  {selectedAsset.manufacturer} ({selectedAsset.model})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Capacity / Rating</span>
                <span className="font-medium text-slate-800">{selectedAsset.capacitySpecs}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Total Operating Hours</span>
                <span className="font-mono font-medium text-slate-800 tabular-nums">
                  {selectedAsset.operatingHours.toLocaleString()} hrs
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Commissioning Date</span>
                <span className="font-medium text-slate-800">
                  {formatDualDate(selectedAsset.installDate, calendarType, language)}
                </span>
              </div>
            </div>
          </div>

          {/* Sub-Assets / Components Section */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Sub-Assets & Components</h2>
                <span className="text-xs text-slate-500">({currentSubAssets.length} tracked)</span>
              </div>

              {userRole === 'manager' && (
                <button
                  onClick={() => setShowAddSubAssetModal(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-800"
                >
                  <Plus className="w-3 h-3" />
                  <span>Attach Sub-Asset</span>
                </button>
              )}
            </div>

            {currentSubAssets.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No sub-components registered under this unit.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {currentSubAssets.map((sub) => (
                  <div key={sub.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                        <span>{sub.name}</span>
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          PN: {sub.partNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Serial: {sub.serialNumber} {sub.notes && `· ${sub.notes}`}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                        sub.status === 'normal'
                          ? 'bg-emerald-50 text-emerald-700'
                          : sub.status === 'worn'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {sub.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked Recurring Schedules */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Maintenance Schedules For This Unit</h2>
              <span className="text-xs text-slate-500">{currentSchedules.length} routines</span>
            </div>

            {currentSchedules.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No recurring maintenance schedules configured for this asset.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {currentSchedules.map((sch) => (
                  <div key={sch.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">{sch.taskTitle}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Interval: Every {sch.intervalValue} {sch.intervalType} · Last done:{' '}
                        {formatDualDate(sch.lastPerformedDate, calendarType, language)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-slate-600">
                        Due: {formatDualDate(sch.nextDueDate, calendarType, language)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          sch.status === 'overdue'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {sch.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historical Events on this Unit */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Recent Service History</h2>
              <span className="text-xs text-slate-500">{currentEvents.length} records</span>
            </div>

            {currentEvents.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No maintenance events recorded on this asset yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {currentEvents.map((evt) => (
                  <div key={evt.id} className="py-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{evt.title}</span>
                      <span className="text-[11px] text-slate-500">
                        {formatDualDate(evt.date, calendarType, language)}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] mt-1">{evt.description}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 font-mono">
                      <span>Technician: {evt.technicianName}</span>
                      <span>·</span>
                      <span>{evt.durationHours} hrs duration</span>
                      {evt.partsUsed.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-sky-700 font-medium">
                            {evt.partsUsed.length} parts used
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 text-xs">
          Select an equipment node to view details.
        </div>
      )}

      {/* Add Asset Modal (Manager Only) */}
      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Add Equipment Node to Plant Tree</h3>
            <p className="text-xs text-slate-500 mb-4">Manager administrative action</p>

            <form onSubmit={handleCreateAssetSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Asset Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sludge Filter Press"
                    value={newAssetName}
                    onChange={(e) => setNewAssetName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Equipment Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FP-301"
                    value={newAssetCode}
                    onChange={(e) => setNewAssetCode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Process Category</label>
                  <select
                    value={newAssetCategory}
                    onChange={(e) => setNewAssetCategory(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Intake & Screening">Intake & Screening</option>
                    <option value="Coagulation & Flocculation">Coagulation & Flocculation</option>
                    <option value="Clarification & Sedimentation">Clarification & Sedimentation</option>
                    <option value="Filtration (Sand & Carbon)">Filtration (Sand & Carbon)</option>
                    <option value="Membrane Separation (RO)">Membrane Separation (RO)</option>
                    <option value="Chemical Dosing & Chlorination">Chemical Dosing & Chlorination</option>
                    <option value="Pumps & Blowers">Pumps & Blowers</option>
                    <option value="Sludge Dewatering">Sludge Dewatering</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Plant Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Dewatering Building Bay 2"
                    value={newAssetLocation}
                    onChange={(e) => setNewAssetLocation(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Technical Specifications</label>
                <input
                  type="text"
                  placeholder="e.g. 50 m³/h capacity @ 15 bar hydraulic squeeze"
                  value={newAssetSpecs}
                  onChange={(e) => setNewAssetSpecs(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAssetModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-700 text-white font-semibold rounded-md hover:bg-sky-600"
                >
                  Save Equipment Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add SubAsset Modal */}
      {showAddSubAssetModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Attach Sub-Asset Component</h3>
            <p className="text-xs text-slate-500 mb-4">Adding to {selectedAsset.code} ({selectedAsset.name})</p>

            <form onSubmit={handleCreateSubAssetSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Component Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mechanical Seal Cartridge"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">OEM Part Number</label>
                <input
                  type="text"
                  placeholder="e.g. MS-45-SIC"
                  value={newSubPartNo}
                  onChange={(e) => setNewSubPartNo(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Component Serial Number</label>
                <input
                  type="text"
                  placeholder="e.g. SN-88319"
                  value={newSubSerial}
                  onChange={(e) => setNewSubSerial(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSubAssetModal(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-700 text-white font-semibold rounded-md hover:bg-sky-600"
                >
                  Save Sub-Asset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
