import React, { useState, useEffect } from 'react';
import type {
  User,
  Asset,
  SubAsset,
  MaintenanceEvent,
  MaintenanceSchedule,
  StoragePart,
  SyncStatus,
} from './types';
import { getDB, initializeDatabase } from './services/db';
import { SyncEngine } from './services/syncEngine';
import { Header } from './components/layout/Header';
import { NavigationPanel, type MainSection } from './components/layout/NavigationPanel';
import { DashboardView } from './components/views/DashboardView';
import { OverallView } from './components/views/OverallView';
import { AssetSectionView } from './components/views/AssetSectionView';
import { TimelineSectionView } from './components/views/TimelineSectionView';
import { ReportsSectionView } from './components/views/ReportsSectionView';
import { RequestsSectionView } from './components/views/RequestsSectionView';
import { StorageSectionView } from './components/views/StorageSectionView';
import { SettingsSectionView } from './components/views/SettingsSectionView';
import { EventModal } from './components/maintenance/EventModal';
import { AssetModal } from './components/assets/AssetModal';
import { SubAssetModal } from './components/assets/SubAssetModal';
import { ScheduleModal } from './components/schedules/ScheduleModal';
import { LoginModal } from './components/auth/LoginModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';

function calculateNextDueDate(
  baseDateStr: string,
  intervalType: 'days' | 'weeks' | 'months' | 'hours',
  intervalValue: number
): string {
  const d = new Date(baseDateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  if (intervalType === 'days') d.setDate(d.getDate() + intervalValue);
  else if (intervalType === 'weeks') d.setDate(d.getDate() + intervalValue * 7);
  else if (intervalType === 'months') d.setMonth(d.getMonth() + intervalValue);
  else if (intervalType === 'hours') d.setDate(d.getDate() + Math.ceil(intervalValue / 24));
  return d.toISOString().split('T')[0];
}

export default function App() {
  const [activeSection, setActiveSection] = useState<MainSection>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [subAssets, setSubAssets] = useState<SubAsset[]>([]);
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [inventory, setInventory] = useState<StoragePart[]>([]);

  const [appsScriptUrl, setAppsScriptUrl] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [preselectedAssetId, setPreselectedAssetId] = useState<string | undefined>(undefined);

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const [isSubAssetModalOpen, setIsSubAssetModalOpen] = useState(false);
  const [targetAssetForSubAsset, setTargetAssetForSubAsset] = useState<Asset | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [targetAssetForSchedule, setTargetAssetForSchedule] = useState<Asset | null>(null);

  // Load state on startup
  useEffect(() => {
    let unsubscribeSync: (() => void) | null = null;

    async function loadData() {
      await initializeDatabase();
      const db = await getDB();

      const [
        loadedUsers,
        loadedAssets,
        loadedSubAssets,
        loadedEvents,
        loadedSchedules,
        loadedInventory,
        activeUserSetting,
        urlSetting,
        queueCount,
      ] = await Promise.all([
        db.getAll('users'),
        db.getAll('assets'),
        db.getAll('subassets'),
        db.getAll('events'),
        db.getAll('schedules'),
        db.getAll('inventory'),
        db.get('settings', 'currentUser'),
        db.get('settings', 'appsScriptUrl'),
        db.count('syncQueue'),
      ]);

      setAvailableUsers(loadedUsers);
      setAssets(loadedAssets.filter((a) => !a.isDeleted));
      setSubAssets(loadedSubAssets.filter((s) => !s.isDeleted));
      setEvents(loadedEvents.filter((e) => !e.isDeleted));
      setSchedules(loadedSchedules.filter((s) => !s.isDeleted));
      setInventory(loadedInventory.filter((i) => !i.isDeleted));

      if (activeUserSetting?.value) {
        setCurrentUser(activeUserSetting.value as User);
      } else if (loadedUsers.length > 0) {
        setCurrentUser(loadedUsers[0]);
      }

      if (typeof urlSetting?.value === 'string') {
        setAppsScriptUrl(urlSetting.value);
      }

      setPendingCount(queueCount);

      // Subscribe to sync notifications
      unsubscribeSync = SyncEngine.subscribe((st, count) => {
        setSyncStatus(st);
        setPendingCount(count);
      });
    }

    loadData();

    return () => {
      if (unsubscribeSync) unsubscribeSync();
    };
  }, []);

  // Sync trigger
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    await SyncEngine.triggerSync();
    setIsSyncing(false);

    // Refresh memory
    const db = await getDB();
    const [
      updatedAssets,
      updatedSubAssets,
      updatedEvents,
      updatedSchedules,
      updatedInventory,
      newPending,
    ] = await Promise.all([
      db.getAll('assets'),
      db.getAll('subassets'),
      db.getAll('events'),
      db.getAll('schedules'),
      db.getAll('inventory'),
      db.count('syncQueue'),
    ]);

    setAssets(updatedAssets.filter((a) => !a.isDeleted));
    setSubAssets(updatedSubAssets.filter((s) => !s.isDeleted));
    setEvents(updatedEvents.filter((e) => !e.isDeleted));
    setSchedules(updatedSchedules.filter((s) => !s.isDeleted));
    setInventory(updatedInventory.filter((i) => !i.isDeleted));
    setPendingCount(newPending);
  };

  // User profile switch
  const handleSelectUser = async (user: User) => {
    setCurrentUser(user);
    const db = await getDB();
    await db.put('settings', { key: 'currentUser', value: user });
  };

  // Save Apps Script URL
  const handleSaveScriptUrl = async (url: string) => {
    setAppsScriptUrl(url);
    const db = await getDB();
    await db.put('settings', { key: 'appsScriptUrl', value: url });
  };

  // Deduct inventory parts helper
  const deductInventoryParts = async (parts: MaintenanceEvent['partsUsed']) => {
    const db = await getDB();
    const updatedInventoryList = [...inventory];

    for (const p of parts) {
      const idx = updatedInventoryList.findIndex((i) => i.id === p.storagePartId);
      if (idx !== -1) {
        const item = updatedInventoryList[idx];
        const newStock = Math.max(0, item.quantityInStock - p.quantityUsed);
        const updatedItem: StoragePart = {
          ...item,
          quantityInStock: newStock,
          updatedAt: Date.now(),
        };
        updatedInventoryList[idx] = updatedItem;
        await db.put('inventory', updatedItem);
        await SyncEngine.queueMutation('inventory', 'update', updatedItem.id, updatedItem as any);
      }
    }
    setInventory(updatedInventoryList);
  };

  // Reset Schedule helper
  const resetScheduleDueToEvent = async (scheduleId: string, eventDate: string) => {
    const db = await getDB();
    const sch = schedules.find((s) => s.id === scheduleId);
    if (!sch) return;

    const nextDate = calculateNextDueDate(eventDate, sch.intervalType, sch.intervalValue);
    const updatedSch: MaintenanceSchedule = {
      ...sch,
      lastPerformedDate: eventDate,
      nextDueDate: nextDate,
      status: 'active',
      updatedAt: Date.now(),
    };

    await db.put('schedules', updatedSch);
    setSchedules((prev) => prev.map((s) => (s.id === sch.id ? updatedSch : s)));
    await SyncEngine.queueMutation('schedules', 'update', updatedSch.id, updatedSch as any);
  };

  // Save Event
  const handleSaveEvent = async (eventData: Omit<MaintenanceEvent, 'id' | 'updatedAt'>) => {
    const newId = `evt-${Date.now()}`;
    const newEvent: MaintenanceEvent = {
      ...eventData,
      id: newId,
      updatedAt: Date.now(),
    };

    const db = await getDB();
    await db.put('events', newEvent);
    setEvents((prev) => [newEvent, ...prev]);

    if (newEvent.status === 'completed') {
      if (newEvent.partsUsed.length > 0) {
        await deductInventoryParts(newEvent.partsUsed);
      }
      if (newEvent.affectedScheduleId) {
        await resetScheduleDueToEvent(newEvent.affectedScheduleId, newEvent.date);
      }
    }

    await SyncEngine.queueMutation('events', 'create', newId, newEvent as any);
  };

  // Manager Approve Event
  const handleApproveEvent = async (eventId: string, approvalNotes: string) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;

    const updatedEvent: MaintenanceEvent = {
      ...target,
      status: 'completed',
      approvedBy: currentUser?.fullName || 'مدیر فنی',
      approvalNotes,
      approvalDate: new Date().toISOString(),
      updatedAt: Date.now(),
    };

    const db = await getDB();
    await db.put('events', updatedEvent);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));

    if (target.partsUsed.length > 0) {
      await deductInventoryParts(target.partsUsed);
    }

    if (target.affectedScheduleId) {
      await resetScheduleDueToEvent(target.affectedScheduleId, target.date);
    }

    await SyncEngine.queueMutation('events', 'update', updatedEvent.id, updatedEvent as any);
  };

  // Manager Reject Event
  const handleRejectEvent = async (eventId: string, revisionNotes: string) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;

    const updatedEvent: MaintenanceEvent = {
      ...target,
      status: 'rejected',
      approvalNotes: revisionNotes,
      updatedAt: Date.now(),
    };

    const db = await getDB();
    await db.put('events', updatedEvent);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));
    await SyncEngine.queueMutation('events', 'update', updatedEvent.id, updatedEvent as any);
  };

  // Save (Create or Update) Asset
  const handleSaveAsset = async (assetData: Partial<Asset>) => {
    const db = await getDB();
    if (assetData.id) {
      // Update
      const existing = assets.find((a) => a.id === assetData.id);
      if (!existing) return;
      const updated: Asset = {
        ...existing,
        ...assetData,
        updatedAt: Date.now(),
      } as Asset;
      await db.put('assets', updated);
      setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      await SyncEngine.queueMutation('assets', 'update', updated.id, updated as any);
    } else {
      // Create
      const newId = `ast-${Date.now()}`;
      const newAsset: Asset = {
        id: newId,
        name: assetData.name || 'تجهیز جدید',
        code: assetData.code || `AST-${Date.now().toString().slice(-4)}`,
        parentId: null,
        category: assetData.category || 'Pumps & Blowers',
        status: assetData.status || 'operational',
        serialNumber: assetData.serialNumber || '',
        model: assetData.model || '',
        manufacturer: assetData.manufacturer || '',
        location: assetData.location || '',
        capacitySpecs: assetData.capacitySpecs || '',
        installDate: assetData.installDate || new Date().toISOString().split('T')[0],
        operatingHours: assetData.operatingHours || 0,
        imageUrl: assetData.imageUrl,
        notes: assetData.notes || '',
        updatedAt: Date.now(),
      };
      await db.put('assets', newAsset);
      setAssets((prev) => [...prev, newAsset]);
      await SyncEngine.queueMutation('assets', 'create', newId, newAsset as any);
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (assetId: string) => {
    const db = await getDB();
    const target = assets.find((a) => a.id === assetId);
    if (!target) return;

    const updated: Asset = { ...target, isDeleted: true, updatedAt: Date.now() };
    await db.put('assets', updated);
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
    await SyncEngine.queueMutation('assets', 'delete', assetId, { isDeleted: true });
  };

  // Save SubAsset
  const handleSaveSubAsset = async (subData: Omit<SubAsset, 'id' | 'updatedAt'>) => {
    const db = await getDB();
    const newId = `sub-${Date.now()}`;
    const newSub: SubAsset = {
      ...subData,
      id: newId,
      updatedAt: Date.now(),
    };
    await db.put('subassets', newSub);
    setSubAssets((prev) => [...prev, newSub]);
    await SyncEngine.queueMutation('subassets', 'create', newId, newSub as any);
  };

  // Delete SubAsset
  const handleDeleteSubAsset = async (subAssetId: string) => {
    const db = await getDB();
    const target = subAssets.find((s) => s.id === subAssetId);
    if (!target) return;

    const updated: SubAsset = { ...target, isDeleted: true, updatedAt: Date.now() };
    await db.put('subassets', updated);
    setSubAssets((prev) => prev.filter((s) => s.id !== subAssetId));
    await SyncEngine.queueMutation('subassets', 'delete', subAssetId, { isDeleted: true });
  };

  // Save Schedule
  const handleSaveSchedule = async (scheduleData: Omit<MaintenanceSchedule, 'id' | 'updatedAt'>) => {
    const db = await getDB();
    const newId = `sch-${Date.now()}`;
    const newSch: MaintenanceSchedule = {
      ...scheduleData,
      id: newId,
      updatedAt: Date.now(),
    };
    await db.put('schedules', newSch);
    setSchedules((prev) => [...prev, newSch]);
    await SyncEngine.queueMutation('schedules', 'create', newId, newSch as any);
  };

  // Link Part to Asset
  const handleLinkPartToAsset = async (assetCode: string, partId: string) => {
    const db = await getDB();
    const target = inventory.find((i) => i.id === partId);
    if (!target) return;

    const currentLinks = target.compatibleAssets || [];
    if (!currentLinks.includes(assetCode)) {
      const updated: StoragePart = {
        ...target,
        compatibleAssets: [...currentLinks, assetCode],
        updatedAt: Date.now(),
      };
      await db.put('inventory', updated);
      setInventory((prev) => prev.map((i) => (i.id === partId ? updated : i)));
      await SyncEngine.queueMutation('inventory', 'update', updated.id, updated as any);
    }
  };

  // Save new Part
  const handleSavePart = async (partData: Partial<StoragePart>) => {
    const newId = `part-${Date.now()}`;
    const newPart: StoragePart = {
      id: newId,
      partName: partData.partName || 'قطعه جدید',
      partNumber: partData.partNumber || 'PN-000',
      category: partData.category || 'اقلام مصرفی',
      quantityInStock: partData.quantityInStock || 0,
      unit: partData.unit || 'عدد',
      minThreshold: partData.minThreshold || 2,
      unitCost: partData.unitCost || 0,
      shelfLocation: partData.shelfLocation || 'انبار A',
      compatibleAssets: partData.compatibleAssets || [],
      updatedAt: Date.now(),
    };

    const db = await getDB();
    await db.put('inventory', newPart);
    setInventory((prev) => [...prev, newPart]);
    await SyncEngine.queueMutation('inventory', 'create', newId, newPart as any);
  };

  // Restock Part
  const handleRestockPart = async (partId: string, addQty: number) => {
    const target = inventory.find((i) => i.id === partId);
    if (!target) return;

    const updated: StoragePart = {
      ...target,
      quantityInStock: target.quantityInStock + addQty,
      updatedAt: Date.now(),
    };

    const db = await getDB();
    await db.put('inventory', updated);
    setInventory((prev) => prev.map((i) => (i.id === partId ? updated : i)));
    await SyncEngine.queueMutation('inventory', 'update', updated.id, updated as any);
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      system: 'تیمار - مدیریت نگهداری و تعمیرات تصفیه‌خانه آب',
      version: '2.0-web-qt-compatible',
      assets,
      subAssets,
      events,
      schedules,
      inventory,
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timar_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup
  const handleImportBackup = async (jsonContent: string) => {
    try {
      const data = JSON.parse(jsonContent);
      const db = await getDB();

      if (Array.isArray(data.assets)) {
        for (const a of data.assets) await db.put('assets', a);
        setAssets(data.assets);
      }
      if (Array.isArray(data.subAssets)) {
        for (const s of data.subAssets) await db.put('subassets', s);
        setSubAssets(data.subAssets);
      }
      if (Array.isArray(data.events)) {
        for (const e of data.events) await db.put('events', e);
        setEvents(data.events);
      }
      if (Array.isArray(data.schedules)) {
        for (const sc of data.schedules) await db.put('schedules', sc);
        setSchedules(data.schedules);
      }
      if (Array.isArray(data.inventory)) {
        for (const i of data.inventory) await db.put('inventory', i);
        setInventory(data.inventory);
      }

      return { success: true, message: 'پایگاه‌داده با موفقیت از فایل پشتیبان بازیابی شد!' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `خطا در بارگذاری فایل: ${msg}` };
    }
  };

  const pendingApprovalsCount = events.filter((e) => e.status === 'pending_approval').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f3f3] text-slate-900 font-vazir" dir="rtl">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        syncStatus={syncStatus}
        pendingCount={pendingCount}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onTriggerSync={handleTriggerSync}
      />

      {/* Main Workspace: Collapsible NavigationPanel on Right (in RTL) + Viewport on Left */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Panel */}
        <NavigationPanel
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        {/* Viewport Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeSection === 'dashboard' && (
            <DashboardView
              assets={assets}
              events={events}
              schedules={schedules}
              inventory={inventory}
              syncStatus={syncStatus}
              pendingApprovalsCount={pendingApprovalsCount}
              onNavigateToTab={(sec) => setActiveSection(sec)}
            />
          )}

          {activeSection === 'overall' && (
            <OverallView
              assets={assets}
              subAssets={subAssets}
              events={events}
              schedules={schedules}
              inventory={inventory}
              userRole={currentUser?.role}
              onOpenCreateEvent={(assetId) => {
                setPreselectedAssetId(assetId);
                setIsEventModalOpen(true);
              }}
              onOpenCreateSchedule={(assetId) => {
                const target = assets.find((a) => a.id === assetId) || null;
                setTargetAssetForSchedule(target);
                setIsScheduleModalOpen(true);
              }}
              onOpenAddSubAsset={(assetId) => {
                const target = assets.find((a) => a.id === assetId) || null;
                setTargetAssetForSubAsset(target);
                setIsSubAssetModalOpen(true);
              }}
              onOpenAddAsset={() => {
                setEditingAsset(null);
                setIsAssetModalOpen(true);
              }}
              onEditAsset={(asset) => {
                setEditingAsset(asset);
                setIsAssetModalOpen(true);
              }}
              onDeleteAsset={handleDeleteAsset}
              onLinkPartToAsset={handleLinkPartToAsset}
            />
          )}

          {activeSection === 'assets' && (
            <AssetSectionView
              assets={assets}
              subAssets={subAssets}
              userRole={currentUser?.role}
              onOpenCreateEvent={(assetId) => {
                setPreselectedAssetId(assetId);
                setIsEventModalOpen(true);
              }}
              onOpenAddAsset={() => {
                setEditingAsset(null);
                setIsAssetModalOpen(true);
              }}
              onEditAsset={(asset) => {
                setEditingAsset(asset);
                setIsAssetModalOpen(true);
              }}
              onDeleteAsset={handleDeleteAsset}
              onOpenAddSubAsset={(assetId) => {
                const target = assets.find((a) => a.id === assetId) || null;
                setTargetAssetForSubAsset(target);
                setIsSubAssetModalOpen(true);
              }}
              onDeleteSubAsset={handleDeleteSubAsset}
            />
          )}

          {activeSection === 'timeline' && (
            <TimelineSectionView events={events} />
          )}

          {activeSection === 'reports' && (
            <ReportsSectionView
              events={events}
              assets={assets}
              schedules={schedules}
            />
          )}

          {activeSection === 'requests' && (
            <RequestsSectionView
              events={events}
              userRole={currentUser?.role}
              currentUser={currentUser}
              onApproveEvent={handleApproveEvent}
              onRejectEvent={handleRejectEvent}
            />
          )}

          {activeSection === 'storage' && (
            <StorageSectionView
              inventory={inventory}
              userRole={currentUser?.role}
              onSavePart={handleSavePart}
              onRestockPart={handleRestockPart}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsSectionView
              appsScriptUrl={appsScriptUrl}
              onSaveScriptUrl={handleSaveScriptUrl}
              onTestConnection={SyncEngine.testConnection}
              onTriggerSync={handleTriggerSync}
              isSyncing={isSyncing}
              currentUser={currentUser}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
            />
          )}
        </main>
      </div>

      {/* Offline Status Banner */}
      <OfflineIndicator pendingCount={pendingCount} />

      {/* Login & Profile Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={handleSelectUser}
        availableUsers={availableUsers}
      />

      {/* Event Creation & Work Order Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setPreselectedAssetId(undefined);
        }}
        assets={assets}
        schedules={schedules}
        inventory={inventory}
        currentUser={currentUser}
        preselectedAssetId={preselectedAssetId}
        onSaveEvent={handleSaveEvent}
      />

      {/* Add / Edit Asset Modal */}
      <AssetModal
        isOpen={isAssetModalOpen}
        onClose={() => {
          setIsAssetModalOpen(false);
          setEditingAsset(null);
        }}
        initialAsset={editingAsset}
        onSave={handleSaveAsset}
      />

      {/* Add SubAsset Modal */}
      {targetAssetForSubAsset && (
        <SubAssetModal
          isOpen={isSubAssetModalOpen}
          onClose={() => {
            setIsSubAssetModalOpen(false);
            setTargetAssetForSubAsset(null);
          }}
          assetId={targetAssetForSubAsset.id}
          assetName={targetAssetForSubAsset.name}
          assetCode={targetAssetForSubAsset.code}
          onSave={handleSaveSubAsset}
        />
      )}

      {/* Add PM Schedule Modal */}
      {targetAssetForSchedule && (
        <ScheduleModal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setTargetAssetForSchedule(null);
          }}
          assetId={targetAssetForSchedule.id}
          assetName={targetAssetForSchedule.name}
          assetCode={targetAssetForSchedule.code}
          onSave={handleSaveSchedule}
        />
      )}
    </div>
  );
}
