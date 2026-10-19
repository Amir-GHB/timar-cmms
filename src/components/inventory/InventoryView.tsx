import React, { useState } from 'react';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import type { StoragePart, Role } from '../../types';

interface InventoryViewProps {
  inventory: StoragePart[];
  userRole?: Role;
  onSavePart?: (part: Partial<StoragePart>) => void;
  onRestockPart?: (partId: string, addQty: number) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  userRole,
  onSavePart,
  onRestockPart,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [restockModalPart, setRestockModalPart] = useState<StoragePart | null>(null);
  const [restockQty, setRestockQty] = useState('5');

  // New part form
  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [category, setCategory] = useState('Seals & Gaskets');
  const [quantityInStock, setQuantityInStock] = useState('10');
  const [unit, setUnit] = useState('pcs');
  const [minThreshold, setMinThreshold] = useState('3');
  const [unitCost, setUnitCost] = useState('50.0');
  const [shelfLocation, setShelfLocation] = useState('Warehouse A / Shelf 01');

  const filteredInventory = inventory.filter((item) => {
    const matchSearch =
      item.partName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.partNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.shelfLocation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const lowStockCount = inventory.filter((i) => i.quantityInStock <= i.minThreshold).length;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName || !partNumber) return;

    onSavePart?.({
      partName,
      partNumber,
      category,
      quantityInStock: parseInt(quantityInStock, 10) || 0,
      unit,
      minThreshold: parseInt(minThreshold, 10) || 0,
      unitCost: parseFloat(unitCost) || 0,
      shelfLocation,
    });

    setShowAddModal(false);
    setPartName('');
    setPartNumber('');
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalPart) return;
    const qty = parseInt(restockQty, 10) || 0;
    if (qty > 0) {
      onRestockPart?.(restockModalPart.id, qty);
    }
    setRestockModalPart(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-sky-600" />
            Spare Parts Warehouse Inventory
          </h1>
          <p className="text-xs text-slate-500">
            Monitor mechanical seals, RO membranes, bearings, and dosing consumables with stock alert thresholds
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lowStockCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {lowStockCount} Parts Low on Stock
            </span>
          )}

          {userRole === 'manager' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-600 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Catalog Part</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by part number, name, shelf location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none shrink-0"
        >
          <option value="all">All Categories</option>
          <option value="Seals & Gaskets">Seals & Gaskets</option>
          <option value="Membranes & Filtration">Membranes & Filtration</option>
          <option value="Bearings">Bearings</option>
          <option value="Consumables">Consumables</option>
          <option value="Lubricants & Chemicals">Lubricants & Chemicals</option>
          <option value="Instrumentation">Instrumentation</option>
        </select>
      </div>

      {/* Inventory Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-y-auto shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3">Part Details</th>
              <th className="px-4 py-3">Part Number</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">In Stock</th>
              <th className="px-4 py-3 text-right">Min Threshold</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Unit Value</th>
              {userRole === 'manager' && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredInventory.map((item) => {
              const isLow = item.quantityInStock <= item.minThreshold;

              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{item.partName}</div>
                    {item.supplier && (
                      <div className="text-[11px] text-slate-400">{item.supplier}</div>
                    )}
                  </td>

                  <td className="px-4 py-3 font-mono text-slate-700 font-semibold">
                    {item.partNumber}
                  </td>

                  <td className="px-4 py-3 text-slate-500">{item.category}</td>

                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-mono font-bold tabular-nums px-2 py-0.5 rounded ${
                        isLow
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'text-slate-900'
                      }`}
                    >
                      {item.quantityInStock} {item.unit}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-slate-500 tabular-nums">
                    {item.minThreshold} {item.unit}
                  </td>

                  <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                    {item.shelfLocation}
                  </td>

                  <td className="px-4 py-3 text-right font-mono text-slate-800 tabular-nums">
                    ${item.unitCost.toFixed(2)}
                  </td>

                  {userRole === 'manager' && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setRestockModalPart(item)}
                        className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Restock</span>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Restock Modal */}
      {restockModalPart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Restock Inventory</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add arriving stock for {restockModalPart.partName} ({restockModalPart.partNumber})
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Quantity Received</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold"
                  />
                  <span className="text-slate-500 font-medium">{restockModalPart.unit}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRestockModalPart(null)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-sky-700 text-white font-semibold rounded-md hover:bg-sky-600"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Catalog Part Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Add Catalog Spare Part</h3>
            <p className="text-xs text-slate-500 mb-4">Register new warehouse inventory item</p>

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Part Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mechanical Seal Cartridge 55mm"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Part Number (PN)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MS-55-SIC"
                    value={partNumber}
                    onChange={(e) => setPartNumber(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="Seals & Gaskets">Seals & Gaskets</option>
                    <option value="Membranes & Filtration">Membranes & Filtration</option>
                    <option value="Bearings">Bearings</option>
                    <option value="Consumables">Consumables</option>
                    <option value="Lubricants & Chemicals">Lubricants & Chemicals</option>
                    <option value="Instrumentation">Instrumentation</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={quantityInStock}
                    onChange={(e) => setQuantityInStock(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-center"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Min Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Shelf Bin Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Bay 3 / Drawer B"
                    value={shelfLocation}
                    onChange={(e) => setShelfLocation(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
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
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
