import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  pendingCount?: number;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ pendingCount = 0 }) => {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg bg-slate-900 text-white px-3.5 py-2 text-xs shadow-lg border border-slate-700">
        <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex flex-col">
          <span className="font-semibold text-white">Offline Mode</span>
          <span className="text-[11px] text-slate-300">
            Working locally. {pendingCount > 0 ? `${pendingCount} changes will auto-sync when reconnected.` : 'All cached data available.'}
          </span>
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-lg bg-sky-950 text-white px-3.5 py-2 text-xs shadow-lg border border-sky-800">
        <Database className="w-4 h-4 text-sky-400 shrink-0 animate-pulse" />
        <span className="text-xs text-sky-100">
          <strong>{pendingCount}</strong> local updates pending cloud sync
        </span>
      </div>
    );
  }

  return null;
};
