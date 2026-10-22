import React, { useState, useEffect } from 'react';
import type {
  User,
  Asset,
  SubAsset,
  MaintenanceEvent,
  MaintenanceSchedule,
  StoragePart,
  SyncStatus,
  UsedPart,
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
import { TimeService } from './utils/timeService';
import { AuthService } from './services/authService';
import { DEFAULT_APPS_SCRIPT_URL } from './config/constants';

export default function App() {
  const [activeSection, setActiveSection] = useState<MainSection>('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [subAssets, setSubAssets] = useState<SubAsset[]>([]);
  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [inventory, setInventory] = useState<StoragePart[]>([]);

  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(DEFAULT_APPS_SCRIPT_URL);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<MaintenanceEvent | null>(null);
  const [preselectedAssetId, setPreselectedAssetId] = useState<string | undefined>(undefined);
  const [preselectedScheduleId, setPreselectedScheduleId] = useState<string | undefined>(undefined);

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const [isSubAssetModalOpen, setIsSubAssetModalOpen] = useState(false);
  const [targetAssetForSubAsset, setTargetAssetForSubAsset] = useState<Asset | null>(null);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [targetAssetForSchedule, setTargetAssetForSchedule] = useState<Asset | null>(null);

  // Centralized evaluation of active schedules: generates due events without advancing nextDueDate
  const evaluateActiveSchedules = async () => {
    const db = await getDB();
    const [allSchedules, allEvents] = await Promise.all([
      db.getAll('schedules'),
      db.getAll('events'),
    ]);

    const { newEvents, updatedEvents, updatedSchedules } = TimeService.evaluateSchedules(
      allSchedules.filter((s) => !s.isDeleted),
      allEvents
    );

    if (updatedEvents.length > 0) {
      for (const evt of updatedEvents) {
        await db.put('events', evt);
        await SyncEngine.queueMutation('events', 'update', evt.id, evt as any);
      }
      setEvents((prev) =>
        prev.map((e) => {
          const matched = updatedEvents.find((u) => u.id === e.id);
          return matched || e;
        })
      );
    }

    if (newEvents.length > 0) {
      for (const evt of newEvents) {
        await db.put('events', evt);
        await SyncEngine.queueMutation('events', 'create', evt.id, evt as any);
      }
      setEvents((prev) => [...newEvents, ...prev]);
    }

    if (updatedSchedules.length > 0) {
      for (const sch of updatedSchedules) {
        await db.put('schedules', sch);
        await SyncEngine.queueMutation('schedules', 'update', sch.id, sch as any);
      }
      setSchedules((prev) =>
        prev.map((s) => {
          const matched = updatedSchedules.find((u) => u.id === s.id);
          return matched || s;
        })
      );
    }
  };

  // Refresh user accounts from local store
  const refreshUsers = async () => {
    const db = await getDB();
    const loadedUsers = await db.getAll('users');
    setAvailableUsers(loadedUsers);
  };

  // Load state on startup
  useEffect(() => {
    let unsubscribeSync: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;
    let evalInterval: any = null;

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
        urlSetting,
        queueCount,
      ] = await Promise.all([
        db.getAll('users'),
        db.getAll('assets'),
        db.getAll('subassets'),
        db.getAll('events'),
        db.getAll('schedules'),
        db.getAll('inventory'),
        db.get('settings', 'appsScriptUrl'),
        db.count('syncQueue'),
      ]);

      setAvailableUsers(loadedUsers);
      setAssets(loadedAssets.filter((a) => !a.isDeleted));
      setSubAssets(loadedSubAssets.filter((s) => !s.isDeleted));
      setEvents(loadedEvents.filter((e) => !e.isDeleted));
      setSchedules(loadedSchedules.filter((s) => !s.isDeleted));
      setInventory(loadedInventory.filter((i) => !i.isDeleted));

      const scriptUrl =
        typeof urlSetting?.value === 'string' && urlSetting.value.trim()
          ? urlSetting.value.trim()
          : DEFAULT_APPS_SCRIPT_URL;
      setAppsScriptUrl(scriptUrl);

      setPendingCount(queueCount);

      // Authenticate via secure session token
      const authUser = await AuthService.init(scriptUrl);
      if (authUser) {
        setCurrentUser(authUser);
      } else {
        setCurrentUser(null);
      }

      unsubscribeAuth = AuthService.subscribe((u) => {
        setCurrentUser(u);
        if (!u) {
          setIsLoginModalOpen(true);
        }
      });

      // Subscribe to sync notifications
      unsubscribeSync = SyncEngine.subscribe((st, count) => {
        setSyncStatus(st);
        setPendingCount(count);
      });

      // Run initial schedule check
      await evaluateActiveSchedules();

      // If online and URL is present, run initial sync
      if (scriptUrl && navigator.onLine) {
        SyncEngine.triggerSync().then(() => evaluateActiveSchedules()).catch(() => {});
      }

      // Check schedules periodically every 60 seconds
      evalInterval = setInterval(() => {
        evaluateActiveSchedules().catch(() => {});
      }, 60000);
    }

    loadData();

    return () => {
      if (unsubscribeSync) unsubscribeSync();
      if (unsubscribeAuth) unsubscribeAuth();
      if (evalInterval) clearInterval(evalInterval);
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

    await evaluateActiveSchedules();
  };

  // Secure session login / logout handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsLoginModalOpen(false);
  };

  const handleLogout = async () => {
    await AuthService.logout(appsScriptUrl);
    setCurrentUser(null);
    setIsLoginModalOpen(true);
  };

  const handleSelectSection = (section: MainSection) => {
    if (!currentUser && section !== 'settings') {
      setIsLoginModalOpen(true);
      return;
    }
    setActiveSection(section);
  };

  // Save Apps Script URL
  const handleSaveScriptUrl = async (url: string) => {
    setAppsScriptUrl(url);
    const db = await getDB();
    await db.put('settings', { key: 'appsScriptUrl', value: url });
  };

  // Deduct inventory parts helper (Idempotent)
  const deductInventoryParts = async (parts: MaintenanceEvent['partsUsed']) => {
    const db = await getDB();
    const updatedInventoryList = [...inventory];
    const nowMs = TimeService.now();

    for (const p of parts) {
      const idx = updatedInventoryList.findIndex((i) => i.id === p.storagePartId);
      if (idx !== -1) {
        const item = updatedInventoryList[idx];
        const newStock = Math.max(0, item.quantityInStock - p.quantityUsed);
        const updatedItem: StoragePart = {
          ...item,
          quantityInStock: newStock,
          updatedAt: nowMs,
        };
        updatedInventoryList[idx] = updatedItem;
        await db.put('inventory', updatedItem);
        await SyncEngine.queueMutation('inventory', 'update', updatedItem.id, updatedItem as any);
      }
    }
    setInventory(updatedInventoryList);
  };

  // Reset/Advance Schedule helper upon verified maintenance completion
  const resetScheduleDueToEvent = async (scheduleId: string, eventCompletionDate: string) => {
    const db = await getDB();
    const sch = schedules.find((s) => s.id === scheduleId);
    if (!sch) return;

    const nextDate = TimeService.calculateNextDueDate(
      eventCompletionDate,
      sch.intervalType,
      sch.intervalValue
    );
    const nowMs = TimeService.now();
    const updatedSch: MaintenanceSchedule = {
      ...sch,
      lastPerformedDate: eventCompletionDate,
      nextDueDate: nextDate,
      status: 'active',
      updatedAt: nowMs,
    };

    await db.put('schedules', updatedSch);
    setSchedules((prev) => prev.map((s) => (s.id === sch.id ? updatedSch : s)));
    await SyncEngine.queueMutation('schedules', 'update', updatedSch.id, updatedSch as any);
  };

  // Save or Update Event
  const handleSaveEvent = async (
    eventData: Omit<MaintenanceEvent, 'id' | 'updatedAt'>,
    existingEventId?: string
  ) => {
    const nowMs = TimeService.now();
    const todayTehran = TimeService.getTehranDateString(nowMs);
    const db = await getDB();

    if (existingEventId) {
      const existing = events.find((e) => e.id === existingEventId);
      if (!existing) return;

      let sideEffectsApplied = existing.sideEffectsApplied || false;
      if (eventData.status === 'completed' && !sideEffectsApplied) {
        if (eventData.partsUsed.length > 0) {
          await deductInventoryParts(eventData.partsUsed);
        }
        const schedId = eventData.affectedScheduleId || eventData.originatingScheduleId;
        if (schedId) {
          await resetScheduleDueToEvent(schedId, eventData.date || todayTehran);
        }
        sideEffectsApplied = true;
      }

      const updatedEvent: MaintenanceEvent = {
        ...existing,
        ...eventData,
        id: existingEventId,
        sideEffectsApplied,
        updatedAt: nowMs,
      };

      await db.put('events', updatedEvent);
      setEvents((prev) => prev.map((e) => (e.id === existingEventId ? updatedEvent : e)));
      await SyncEngine.queueMutation('events', 'update', existingEventId, updatedEvent as any);
      return;
    }

    const isAutomated = !!(eventData.isAutomatedPM && eventData.originatingScheduleId && eventData.scheduleOccurrenceDate);
    const newId = isAutomated
      ? TimeService.makeAutomatedEventId(eventData.originatingScheduleId!, eventData.scheduleOccurrenceDate!)
      : `evt-${nowMs}-${Math.random().toString(36).substring(2, 6)}`;

    let sideEffectsApplied = false;
    if (eventData.status === 'completed') {
      if (eventData.partsUsed.length > 0) {
        await deductInventoryParts(eventData.partsUsed);
      }
      const schedId = eventData.affectedScheduleId || eventData.originatingScheduleId;
      if (schedId) {
        await resetScheduleDueToEvent(schedId, eventData.date || todayTehran);
      }
      sideEffectsApplied = true;
    }

    const newEvent: MaintenanceEvent = {
      ...eventData,
      id: newId,
      sideEffectsApplied,
      updatedAt: nowMs,
    };

    await db.put('events', newEvent);
    setEvents((prev) => [newEvent, ...prev]);
    await SyncEngine.queueMutation('events', 'create', newId, newEvent as any);
  };

  // Complete Event (from CompleteEventModal)
  const handleCompleteEvent = async (
    eventId: string,
    completionData: {
      solution: string;
      durationHours: number;
      downtimeHours: number;
      partsUsed: UsedPart[];
    }
  ) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;

    const nowMs = TimeService.now();
    const todayTehran = TimeService.getTehranDateString(nowMs);
    const db = await getDB();

    if (currentUser?.role === 'manager') {
      let sideEffectsApplied = target.sideEffectsApplied || false;
      if (!sideEffectsApplied) {
        if (completionData.partsUsed.length > 0) {
          await deductInventoryParts(completionData.partsUsed);
        }
        const schedId = target.affectedScheduleId || target.originatingScheduleId;
        if (schedId) {
          await resetScheduleDueToEvent(schedId, target.date || todayTehran);
        }
        sideEffectsApplied = true;
      }

      const updatedEvent: MaintenanceEvent = {
        ...target,
        status: 'completed',
        solution: completionData.solution,
        durationHours: completionData.durationHours,
        downtimeHours: completionData.downtimeHours,
        partsUsed: completionData.partsUsed,
        sideEffectsApplied,
        approvedBy: currentUser?.fullName || 'مدیر فنی',
        approvalDate: todayTehran,
        approvalNotes: 'تکمیل مستقیم توسط مدیر فنی',
        updatedAt: nowMs,
      };

      await db.put('events', updatedEvent);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));
      await SyncEngine.queueMutation('events', 'update', eventId, updatedEvent as any);
    } else {
      const updatedEvent: MaintenanceEvent = {
        ...target,
        status: 'pending_approval',
        solution: completionData.solution,
        durationHours: completionData.durationHours,
        downtimeHours: completionData.downtimeHours,
        partsUsed: completionData.partsUsed,
        sideEffectsApplied: false,
        updatedAt: nowMs,
      };

      await db.put('events', updatedEvent);
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));
      await SyncEngine.queueMutation('events', 'update', eventId, updatedEvent as any);
    }
  };

  // Start Event (in progress)
  const handleStartEvent = async (eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;

    const nowMs = TimeService.now();
    const updatedEvent: MaintenanceEvent = {
      ...target,
      status: 'in_progress',
      updatedAt: nowMs,
    };

    const db = await getDB();
    await db.put('events', updatedEvent);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));
    await SyncEngine.queueMutation('events', 'update', eventId, updatedEvent as any);
  };

  // Authorize Event (Manager authorizes pending manual request -> scheduled)
  const handleAuthorizeEvent = async (eventId: string, managerNotes?: string) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;

    const nowMs = TimeService.now();
    const updatedEvent: MaintenanceEvent = {
      ...target,
      status: 'scheduled',
      approvalNotes: managerNotes || target.approvalNotes,
      updatedAt: nowMs,
    };

    const db = await getDB();
    await db.put('events', updatedEvent);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));
    await SyncEngine.queueMutation('events', 'update', eventId, updatedEvent as any);
  };

  // Cancel Event
  const handleCancelEvent = async (eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;

    const nowMs = TimeService.now();
    const updatedEvent: MaintenanceEvent = {
      ...target,
      status: 'cancelled',
      updatedAt: nowMs,
    };

    const db = await getDB();
    await db.put('events', updatedEvent);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));
    await SyncEngine.queueMutation('events', 'update', eventId, updatedEvent as any);
  };

  // Delete Event
  const handleDeleteEvent = async (eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;

    const nowMs = TimeService.now();
    const updatedEvent: MaintenanceEvent = {
      ...target,
      isDeleted: true,
      updatedAt: nowMs,
    };

    const db = await getDB();
    await db.put('events', updatedEvent);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    await SyncEngine.queueMutation('events', 'delete', eventId, { isDeleted: true });
  };

  // Manager Approve Event (Idempotent: advances schedule & deducts inventory exactly once)
  const handleApproveEvent = async (eventId: string, approvalNotes: string) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;

    // Idempotency: skip if already completed and side-effects applied
    if (target.status === 'completed' && target.sideEffectsApplied) return;

    const nowMs = TimeService.now();
    const todayTehran = TimeService.getTehranDateString(nowMs);

    if (!target.sideEffectsApplied) {
      if (target.partsUsed.length > 0) {
        await deductInventoryParts(target.partsUsed);
      }
      const schedId = target.affectedScheduleId || target.originatingScheduleId;
      if (schedId) {
        await resetScheduleDueToEvent(schedId, target.date || todayTehran);
      }
    }

    const updatedEvent: MaintenanceEvent = {
      ...target,
      status: 'completed',
      sideEffectsApplied: true,
      approvedBy: currentUser?.fullName || 'مدیر فنی',
      approvalNotes,
      approvalDate: todayTehran,
      updatedAt: nowMs,
    };

    const db = await getDB();
    await db.put('events', updatedEvent);
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));

    await SyncEngine.queueMutation('events', 'update', updatedEvent.id, updatedEvent as any);
  };

  // Manager Reject Event (Sent back for revisions; does NOT advance schedule or deduct inventory)
  const handleRejectEvent = async (eventId: string, revisionNotes: string) => {
    const target = events.find((e) => e.id === eventId);
    if (!target) return;

    const nowMs = TimeService.now();
    const updatedEvent: MaintenanceEvent = {
      ...target,
      status: 'rejected',
      sideEffectsApplied: false,
      approvalNotes: revisionNotes,
      updatedAt: nowMs,
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

  // Save Schedule (Manager only)
  const handleSaveSchedule = async (scheduleData: Omit<MaintenanceSchedule, 'id' | 'updatedAt'>) => {
    if (currentUser?.role !== 'manager') {
      alert('تنها مدیر فنی و مهندسی مجاز به تعریف برنامه نگهداری و تعمیرات دوره‌ای می‌باشد.');
      return;
    }

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

  // Toggle Pause / Resume Schedule (Manager only)
  const handleTogglePauseSchedule = async (scheduleId: string) => {
    if (currentUser?.role !== 'manager') {
      alert('تنها مدیر فنی مجاز به تغییر وضعیت برنامه نگهداری و تعمیرات می‌باشد.');
      return;
    }

    const db = await getDB();
    const target = schedules.find((s) => s.id === scheduleId);
    if (!target) return;

    const nowMs = TimeService.now();
    const isCurrentlyPaused = target.status === 'paused';
    const newStatus: 'active' | 'paused' = isCurrentlyPaused ? 'active' : 'paused';
    const updatedSch: MaintenanceSchedule = {
      ...target,
      status: newStatus,
      pausedAt: isCurrentlyPaused ? undefined : nowMs,
      updatedAt: nowMs,
    };

    await db.put('schedules', updatedSch);
    setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? updatedSch : s)));
    await SyncEngine.queueMutation('schedules', 'update', updatedSch.id, updatedSch as any);
  };

  // Delete / Remove Schedule (Manager only)
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (currentUser?.role !== 'manager') {
      alert('تنها مدیر فنی مجاز به حذف برنامه نگهداری و تعمیرات می‌باشد.');
      return;
    }

    const db = await getDB();
    const target = schedules.find((s) => s.id === scheduleId);
    if (!target) return;

    const nowMs = TimeService.now();
    const updatedSch: MaintenanceSchedule = {
      ...target,
      isDeleted: true,
      updatedAt: nowMs,
    };

    await db.put('schedules', updatedSch);
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
    await SyncEngine.queueMutation('schedules', 'delete', scheduleId, { isDeleted: true });
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

  const pendingApprovalsCount = events.filter(
    (e) => !e.isDeleted && (e.status === 'pending_approval' || e.status === 'pending_request')
  ).length;

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
          onSelectSection={handleSelectSection}
          pendingApprovalsCount={pendingApprovalsCount}
        />

        {/* Viewport Area */}
        <main className="flex-1 flex flex-col overflow-hidden pb-14 md:pb-0">
          {activeSection === 'dashboard' && (
            <DashboardView
              assets={assets}
              events={events}
              schedules={schedules}
              inventory={inventory}
              syncStatus={syncStatus}
              pendingApprovalsCount={pendingApprovalsCount}
              onNavigateToTab={handleSelectSection}
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
                setPreselectedScheduleId(undefined);
                setEditingEvent(null);
                setIsEventModalOpen(true);
              }}
              onOpenCreateEventFromSchedule={(assetId, scheduleId) => {
                setPreselectedAssetId(assetId);
                setPreselectedScheduleId(scheduleId);
                setEditingEvent(null);
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
              onEditEvent={(event) => {
                setEditingEvent(event);
                setPreselectedAssetId(event.assetId);
                setPreselectedScheduleId(event.affectedScheduleId || event.originatingScheduleId);
                setIsEventModalOpen(true);
              }}
              onDeleteEvent={handleDeleteEvent}
              onCancelEvent={handleCancelEvent}
              onTogglePauseSchedule={handleTogglePauseSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onCompleteEvent={handleCompleteEvent}
              onStartEvent={handleStartEvent}
              onAuthorizeEvent={handleAuthorizeEvent}
            />
          )}

          {activeSection === 'assets' && (
            <AssetSectionView
              assets={assets}
              subAssets={subAssets}
              userRole={currentUser?.role}
              onOpenCreateEvent={(assetId) => {
                setPreselectedAssetId(assetId);
                setPreselectedScheduleId(undefined);
                setEditingEvent(null);
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
              onAuthorizeRequest={handleAuthorizeEvent}
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
              users={availableUsers}
              onUsersUpdated={refreshUsers}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onOpenLogin={() => setIsLoginModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Offline Status Banner */}
      <OfflineIndicator pendingCount={pendingCount} />

      {/* Login & Profile Modal */}
      <LoginModal
        isOpen={isLoginModalOpen || (!currentUser && activeSection !== 'settings')}
        onClose={() => {
          setIsLoginModalOpen(false);
        }}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        scriptUrl={appsScriptUrl}
        isMandatory={!currentUser && activeSection !== 'settings'}
        onOpenSettings={() => {
          setActiveSection('settings');
          setIsLoginModalOpen(false);
        }}
      />

      {/* Event Creation & Work Order Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setPreselectedAssetId(undefined);
          setPreselectedScheduleId(undefined);
          setEditingEvent(null);
        }}
        assets={assets}
        schedules={schedules}
        inventory={inventory}
        currentUser={currentUser}
        preselectedAssetId={preselectedAssetId}
        preselectedScheduleId={preselectedScheduleId}
        initialEvent={editingEvent}
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
