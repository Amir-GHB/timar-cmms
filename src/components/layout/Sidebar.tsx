import React from 'react';
import {
  Layers,
  CheckSquare,
  Wrench,
  CalendarClock,
  Package,
  History,
  BarChart3,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import type { Role } from '../../types';

export type ActiveTab =
  | 'assets'
  | 'approvals'
  | 'events'
  | 'schedules'
  | 'inventory'
  | 'timeline'
  | 'reports'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  pendingApprovalsCount: number;
  userRole?: Role;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingApprovalsCount,
  userRole,
}) => {
  const navItems = [
    {
      id: 'assets' as ActiveTab,
      label: 'Plant Assets',
      icon: Layers,
      description: 'Equipment hierarchy & specifications',
    },
    {
      id: 'approvals' as ActiveTab,
      label: 'Approval Queue',
      icon: CheckSquare,
      badge: pendingApprovalsCount,
      managerOnly: true,
      description: 'Technician completion requests',
    },
    {
      id: 'events' as ActiveTab,
      label: 'Maintenance Events',
      icon: Wrench,
      description: 'Preventive, repair & breakdown logs',
    },
    {
      id: 'schedules' as ActiveTab,
      label: 'Schedules',
      icon: CalendarClock,
      description: 'Recurring inspection routines',
    },
    {
      id: 'inventory' as ActiveTab,
      label: 'Spare Parts',
      icon: Package,
      description: 'Warehouse stock & consumption',
    },
    {
      id: 'timeline' as ActiveTab,
      label: 'Timeline',
      icon: History,
      description: 'Chronological activity stream',
    },
    {
      id: 'reports' as ActiveTab,
      label: 'Reports & KPIs',
      icon: BarChart3,
      description: 'MTBF, downtime & analytics',
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Cloud Sync & Settings',
      icon: Settings,
      description: 'Google Apps Script configuration',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      {/* Navigation section */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isManagerOnly = item.managerOnly;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {isManagerOnly && userRole === 'manager' && (
                  <span title="Manager Feature">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  </span>
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                      isActive ? 'bg-white text-sky-700' : 'bg-amber-500 text-slate-950'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Bottom Plant Facility Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
        <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 mb-1">
          <span>FACILITY</span>
          <span className="text-emerald-400 font-semibold">ONLINE</span>
        </div>
        <div className="text-slate-300 font-medium truncate">Caspian Regional WTP #4</div>
        <div className="text-[10px] text-slate-400">Capacity: 45,000 m³/day</div>
      </div>
    </aside>
  );
};
