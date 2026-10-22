import { getDB } from './db';
import type { SyncMutation, SyncStatus, User } from '../types';
import { TimeService } from '../utils/timeService';

export class SyncEngine {
  private static isSyncing = false;
  private static listeners: ((status: SyncStatus, pendingCount: number) => void)[] = [];
  private static isOnlineListenerAttached = false;

  public static subscribe(listener: (status: SyncStatus, pendingCount: number) => void): () => void {
    this.listeners.push(listener);
    this.ensureOnlineListener();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static ensureOnlineListener(): void {
    if (this.isOnlineListenerAttached || typeof window === 'undefined') return;
    this.isOnlineListenerAttached = true;
    window.addEventListener('online', () => {
      // Reconnected: trigger sync immediately
      this.triggerSync().catch(() => {});
    });
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
    const isConfirmed = TimeService.isServerTimeConfirmed();
    const mutation: SyncMutation = {
      id: `mut-${TimeService.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: TimeService.now(),
      entityType,
      action,
      entityId,
      data,
      isProvisionalTime: !isConfirmed,
      retryCount: 0,
    };
    await db.put('syncQueue', mutation);

    const pending = await db.count('syncQueue');
    this.notify('pending', pending);

    // Auto-trigger sync if online & configured
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.triggerSync().catch(() => {});
    }
  }

  public static async testConnection(url: string): Promise<{ success: boolean; message: string }> {
    if (!url || !url.startsWith('http')) {
      return { success: false, message: 'لطفاً یک آدرس معتبر Google Apps Script Web App وارد کنید.' };
    }
    try {
      const pingUrl = url.includes('?') ? `${url}&action=ping` : `${url}?action=ping`;
      const res = await fetch(pingUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        return { success: false, message: `پاسخ وب‌سرویس: HTTP ${res.status}` };
      }
      const data = await res.json();
      if (data && data.status === 'ok') {
        if (typeof data.timestamp === 'number') {
          TimeService.setServerAnchor(data.timestamp);
        }
        return { success: true, message: 'ارتباط با پایگاه‌داده ابری گوگل شیتس با موفقیت برقرار شد!' };
      }
      return { success: false, message: 'پاسخ نامعتبر از وب‌سرویس دریافت گردید.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: `خطای ارتباط: ${msg}. مطمئن شوید دسترسی Web App روی Anyone تنظیم شده باشد.`,
      };
    }
  }

  public static async triggerSync(): Promise<{ success: boolean; message: string; count?: number }> {
    if (this.isSyncing) {
      return { success: false, message: 'عملیات همگام‌سازی در حال انجام است.' };
    }

    const db = await getDB();
    const scriptUrlSetting = await db.get('settings', 'appsScriptUrl');
    const scriptUrl = typeof scriptUrlSetting?.value === 'string' ? scriptUrlSetting.value.trim() : '';

    const pendingCount = await db.count('syncQueue');

    if (!scriptUrl) {
      this.notify('offline', pendingCount);
      return {
        success: false,
        message: 'آدرس گوگل اپس اسکریپت پیکربندی نشده است. سیستم در وضعیت محلی آفلاین کار می‌کند.',
      };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.notify('offline', pendingCount);
      return {
        success: false,
        message: 'دستگاه آفلاین است. تغییرات در صف محلی با امنیت کامل نگهداری می‌شوند.',
      };
    }

    this.isSyncing = true;
    this.notify('syncing', pendingCount);

    try {
      const mutations = await db.getAll('syncQueue');
      const lastSyncSetting = await db.get('settings', 'lastSyncTimestamp');
      const lastSyncTimestamp = typeof lastSyncSetting?.value === 'number' ? lastSyncSetting.value : 0;
      const currentUserSetting = await db.get('settings', 'currentUser');
      const clientUser = (currentUserSetting?.value as User)?.fullName || 'تکنسین سیستم تیمار';

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
        throw new Error(`خطای سرور گوگل: HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }

      // Update authoritative server time anchor
      if (typeof result.serverTimestamp === 'number') {
        TimeService.setServerAnchor(result.serverTimestamp);
      }

      // 1. Remove only confirmed processed mutations from local queue
      const appliedIds: string[] = Array.isArray(result.push?.appliedIds)
        ? result.push.appliedIds
        : result.push?.success
        ? mutations.map((m) => m.id)
        : [];

      if (appliedIds.length > 0) {
        const tx = db.transaction('syncQueue', 'readwrite');
        for (const mutId of appliedIds) {
          await tx.store.delete(mutId);
        }
        await tx.done;
      }

      // 2. Merge delta entities from server (Last-Write-Wins based on authoritative updatedAt)
      const incoming = result.pull?.entities || {};
      const tables: (keyof typeof incoming)[] = [
        'users',
        'assets',
        'subassets',
        'events',
        'schedules',
        'inventory',
      ];

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

      const newTimestamp = result.serverTimestamp || TimeService.now();
      await db.put('settings', { key: 'lastSyncTimestamp', value: newTimestamp });

      const remaining = await db.count('syncQueue');
      this.isSyncing = false;
      this.notify('synced', remaining);

      return {
        success: true,
        message: `همگام‌سازی ابری با موفقیت انجام شد (${appliedIds.length} تغییر محلی ارسال گردید).`,
        count: appliedIds.length,
      };
    } catch (err: unknown) {
      this.isSyncing = false;
      const count = await db.count('syncQueue');
      this.notify('error', count);
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `خطای همگام‌سازی: ${msg}` };
    }
  }
}
