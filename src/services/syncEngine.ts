import { getDB } from './db';
import type { SyncMutation, SyncStatus, User } from '../types';

export class SyncEngine {
  private static isSyncing = false;
  private static listeners: ((status: SyncStatus, pendingCount: number) => void)[] = [];

  public static subscribe(listener: (status: SyncStatus, pendingCount: number) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notify(status: SyncStatus, pendingCount: number): void {
    for (const l of this.listeners) {
      l(status, pendingCount);
    }
  }

  public static async getPendingCount(): Promise<number> {
    const db = await getDB();
    return db.count('syncQueue');
  }

  public static async queueMutation(
    entityType: 'users' | 'assets' | 'subassets' | 'events' | 'schedules' | 'inventory',
    action: 'create' | 'update' | 'delete',
    entityId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const db = await getDB();
    const mutation: SyncMutation = {
      id: `mut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      entityType,
      action,
      entityId,
      data,
    };
    await db.put('syncQueue', mutation);

    const pending = await db.count('syncQueue');
    this.notify('pending', pending);

    // Auto-trigger sync if online & configured
    if (navigator.onLine) {
      this.triggerSync().catch(() => {});
    }
  }

  public static async testConnection(url: string): Promise<{ success: boolean; message: string }> {
    if (!url || !url.startsWith('http')) {
      return { success: false, message: 'Please enter a valid Google Apps Script Web App URL.' };
    }
    try {
      const pingUrl = url.includes('?') ? `${url}&action=ping` : `${url}?action=ping`;
      const res = await fetch(pingUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        return { success: false, message: `Server returned HTTP ${res.status}: ${res.statusText}` };
      }
      const data = await res.json();
      if (data && data.status === 'ok') {
        return { success: true, message: 'Successfully connected to Google Apps Script cloud database!' };
      }
      return { success: false, message: 'Unexpected response from Apps Script endpoint.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `Connection failed: ${msg}. Make sure the Web App is deployed with "Anyone" access and CORS is permitted.`,
      };
    }
  }

  public static async triggerSync(): Promise<{ success: boolean; message: string; count?: number }> {
    if (this.isSyncing) {
      return { success: false, message: 'Sync already in progress' };
    }

    const db = await getDB();
    const scriptUrlSetting = await db.get('settings', 'appsScriptUrl');
    const scriptUrl = typeof scriptUrlSetting?.value === 'string' ? scriptUrlSetting.value.trim() : '';

    const pendingCount = await db.count('syncQueue');

    if (!scriptUrl) {
      this.notify('offline', pendingCount);
      return {
        success: false,
        message: 'No Google Apps Script URL configured. Operating in local offline mode.',
      };
    }

    if (!navigator.onLine) {
      this.notify('offline', pendingCount);
      return {
        success: false,
        message: 'Device is offline. Changes remain safely queued in local storage.',
      };
    }

    this.isSyncing = true;
    this.notify('syncing', pendingCount);

    try {
      const mutations = await db.getAll('syncQueue');
      const lastSyncSetting = await db.get('settings', 'lastSyncTimestamp');
      const lastSyncTimestamp = typeof lastSyncSetting?.value === 'number' ? lastSyncSetting.value : 0;
      const currentUserSetting = await db.get('settings', 'currentUser');
      const clientUser = (currentUserSetting?.value as User)?.fullName || 'Timar Client';

      const payload = {
        action: 'syncFull',
        mutations,
        sinceTimestamp: lastSyncTimestamp,
        clientUser,
      };

      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from Apps Script`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      // 1. Clear sent mutations
      const tx = db.transaction('syncQueue', 'readwrite');
      for (const m of mutations) {
        await tx.store.delete(m.id);
      }
      await tx.done;

      // 2. Merge delta entities from server (Last-Write-Wins based on updatedAt)
      const incoming = result.pull?.entities || {};
      const tables: (keyof typeof incoming)[] = ['users', 'assets', 'subassets', 'events', 'schedules', 'inventory'];

      for (const table of tables) {
        const rows = incoming[table];
        if (Array.isArray(rows) && rows.length > 0) {
          const tDb = db.transaction(table as any, 'readwrite');
          for (const item of rows) {
            if (item && item.id) {
              const existing = await tDb.store.get(item.id);
              if (!existing || (item.updatedAt || 0) >= (existing.updatedAt || 0)) {
                await tDb.store.put(item);
              }
            }
          }
          await tDb.done;
        }
      }

      const newTimestamp = result.serverTimestamp || Date.now();
      await db.put('settings', { key: 'lastSyncTimestamp', value: newTimestamp });

      const remaining = await db.count('syncQueue');
      this.isSyncing = false;
      this.notify('synced', remaining);

      return {
        success: true,
        message: `Synced ${mutations.length} local updates with Google Cloud Sheets.`,
        count: mutations.length,
      };
    } catch (err: unknown) {
      this.isSyncing = false;
      const count = await db.count('syncQueue');
      this.notify('error', count);
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Sync error: ${msg}` };
    }
  }
}
